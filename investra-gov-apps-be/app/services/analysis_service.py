"""
Analysis Service – PCA dimensionality reduction + K-Means clustering
using scikit-learn on the provinces dataset.
"""

from __future__ import annotations

import itertools

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.metrics import (
    calinski_harabasz_score,
    davies_bouldin_score,
    silhouette_score,
)
from sklearn.preprocessing import StandardScaler

from app.extensions import db
from app.models.analysis_result import AnalysisResult
from app.models.dataset import Dataset
from app.models.province import Province

# ─── Constants ────────────────────────────────────────────────────────

SKEWED_COLUMNS = ["pmdn_rp", "fdi_rp", "pdrb_per_kapita"]
DATA_MODE_AGGREGATED = "aggregated"
DATA_MODE_PANEL = "panel"
VALID_DATA_MODES = {DATA_MODE_PANEL}
DEFAULT_PANEL_YEAR_START = 2022
DEFAULT_PANEL_YEAR_END = 2024
DEFAULT_KMEANS_N_INIT = 50
DEFAULT_CONSENSUS_RUNS = 25


def _safe_float(value: float | int | np.floating | np.integer | None) -> float:
    """Return JSON-safe float; convert NaN/inf to 0.0."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    return v if np.isfinite(v) else 0.0


def _sanitize_json_value(value):
    """Recursively sanitize structures before persisting into JSON columns."""
    if isinstance(value, dict):
        return {k: _sanitize_json_value(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitize_json_value(v) for v in value]
    if isinstance(value, tuple):
        return [_sanitize_json_value(v) for v in value]
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, bool):
        return value
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, (np.floating, float)):
        return _safe_float(value)
    return value


def _normalise_data_mode(data_mode: str | None) -> str:
    mode = str(data_mode or DATA_MODE_PANEL).strip().lower()
    if mode == DATA_MODE_AGGREGATED:
        raise ValueError(
            "Mode analisis 'aggregated' dinonaktifkan. Gunakan mode 'panel'"
        )
    if mode not in VALID_DATA_MODES:
        raise ValueError("Mode analisis tidak valid. Gunakan mode 'panel'")
    return DATA_MODE_PANEL


# ─── Helpers ──────────────────────────────────────────────────────────


def _get_active_dataset() -> Dataset:
    """Return the active dataset or raise ValueError."""
    ds = Dataset.get_active()
    if ds is None:
        raise ValueError("Tidak ada dataset aktif")
    return ds


def _load_raw_dataframe(dataset_id: str | None = None) -> tuple[pd.DataFrame, str]:
    """Load province rows for a specific dataset (or active) into a DataFrame."""
    if dataset_id is None:
        ds = _get_active_dataset()
        dataset_id = ds.id
    provinces = (
        Province.query
        .filter_by(dataset_id=dataset_id)
        .order_by(Province.year.desc(), Province.provinsi)
        .all()
    )
    if not provinces:
        raise ValueError(f"Dataset {dataset_id} tidak memiliki data provinsi")
    rows = [p.to_dict() for p in provinces]
    return pd.DataFrame(rows), dataset_id


def _filter_dataframe_by_year_range(
    df: pd.DataFrame,
    year_start: int | None = None,
    year_end: int | None = None,
) -> tuple[pd.DataFrame, dict]:
    """Filter dataframe by inclusive year range."""
    if year_start is None and year_end is None:
        return df, {}
    if "year" not in df.columns:
        raise ValueError("Dataset tidak memiliki kolom year")

    years = pd.to_numeric(df["year"], errors="coerce")
    valid_years = years.dropna()
    if valid_years.empty:
        raise ValueError("Dataset tidak memiliki nilai year yang valid")

    start = int(year_start) if year_start is not None else int(valid_years.min())
    end = int(year_end) if year_end is not None else int(valid_years.max())
    if start > end:
        raise ValueError("Rentang tahun tidak valid: yearStart harus <= yearEnd")

    mask = (years >= start) & (years <= end)
    filtered = df.loc[mask].copy().reset_index(drop=True)
    if filtered.empty:
        raise ValueError(f"Tidak ada data pada rentang tahun {start}-{end}")

    return filtered, {
        "filter_year_min": start,
        "filter_year_max": end,
        "available_year_min": int(valid_years.min()),
        "available_year_max": int(valid_years.max()),
        "filtered_rows": len(filtered),
    }


def _aggregate_dataframe_by_province(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Aggregate multi-year panel rows into one row per province
    using mean for each numeric indicator.
    """
    numeric_cols = Province.NUMERIC_COLUMNS
    grouped = (
        df.groupby("provinsi", as_index=False)[numeric_cols]
        .mean()
        .sort_values("provinsi")
        .reset_index(drop=True)
    )

    info: dict[str, int] = {
        "source_rows": len(df),
        "province_rows": len(grouped),
    }
    if "year" in df.columns:
        years = pd.to_numeric(df["year"], errors="coerce").dropna()
        if not years.empty:
            info["year_min"] = int(years.min())
            info["year_max"] = int(years.max())
    return grouped, info


def _load_dataframe_with_meta(
    dataset_id: str | None = None,
    data_mode: str = DATA_MODE_PANEL,
    year_start: int | None = None,
    year_end: int | None = None,
) -> tuple[pd.DataFrame, str, dict]:
    """Load dataset rows into analysis-ready rows based on selected mode."""
    mode = _normalise_data_mode(data_mode)
    raw_df, dataset_id = _load_raw_dataframe(dataset_id)
    scoped_df, year_info = _filter_dataframe_by_year_range(
        raw_df,
        year_start=year_start,
        year_end=year_end,
    )
    if mode == DATA_MODE_PANEL:
        panel_df = (
            scoped_df
            .sort_values(["provinsi", "year"])
            .reset_index(drop=True)
        )
        info: dict[str, int | str] = {
            "data_mode": mode,
            "source_rows": len(raw_df),
            "scoped_rows": len(scoped_df),
            "observation_rows": len(panel_df),
            "province_rows": int(panel_df["provinsi"].nunique()),
        }
        info.update(year_info)
        if "year" in panel_df.columns:
            years = pd.to_numeric(panel_df["year"], errors="coerce").dropna()
            if not years.empty:
                info["year_min"] = int(years.min())
                info["year_max"] = int(years.max())
        return panel_df, dataset_id, info

    aggregated_df, info = _aggregate_dataframe_by_province(scoped_df)
    info["source_rows"] = len(raw_df)
    info["scoped_rows"] = len(scoped_df)
    info.update(year_info)
    info["data_mode"] = mode
    return aggregated_df, dataset_id, info


def _load_dataframe(
    dataset_id: str | None = None,
    data_mode: str = DATA_MODE_PANEL,
    year_start: int | None = None,
    year_end: int | None = None,
) -> tuple[pd.DataFrame, str]:
    """Load analysis-ready dataframe based on selected data mode."""
    df, dataset_id, _info = _load_dataframe_with_meta(
        dataset_id,
        data_mode=data_mode,
        year_start=year_start,
        year_end=year_end,
    )
    return df, dataset_id


def _prepare_matrix(
    df: pd.DataFrame,
    log_transform: bool = True,
    normalise_by_year: bool = False,
) -> tuple[np.ndarray, StandardScaler, list[str]]:
    """Extract numeric columns, optionally log-transform skewed features,
    and return standardised matrix + scaler + column names used."""
    numeric_cols = Province.NUMERIC_COLUMNS
    values_df = df[numeric_cols].astype(float).copy()

    transform_info = []
    if log_transform:
        for col in SKEWED_COLUMNS:
            if col in numeric_cols:
                values_df[col] = np.log1p(values_df[col].to_numpy())
                transform_info.append(col)

    X = values_df.to_numpy(dtype=float)
    scaler = StandardScaler()

    if normalise_by_year and "year" in df.columns:
        year_series = pd.to_numeric(df["year"], errors="coerce")
        X_scaled = np.zeros_like(X, dtype=float)
        assigned_mask = np.zeros(len(df), dtype=bool)

        for year in sorted(year_series.dropna().unique()):
            mask_series = (year_series == year)
            mask = mask_series.to_numpy()
            if not mask.any():
                continue
            year_scaler = StandardScaler()
            X_scaled[mask] = year_scaler.fit_transform(X[mask])
            assigned_mask = assigned_mask | mask

        if not assigned_mask.all():
            fallback_scaler = StandardScaler()
            X_scaled[~assigned_mask] = fallback_scaler.fit_transform(X[~assigned_mask])

        scaler.fit(X)
        transform_info.append("normalise_within_year")
        return X_scaled, scaler, transform_info

    X_scaled = scaler.fit_transform(X)
    transform_info.append("normalise_global")
    return X_scaled, scaler, transform_info


def _build_observation_key(row: pd.Series, data_mode: str) -> str:
    provinsi = str(row.get("provinsi", "")).strip()
    if data_mode == DATA_MODE_PANEL:
        year_raw = row.get("year")
        year = "NA"
        if pd.notna(year_raw):
            try:
                year = str(int(year_raw))
            except (TypeError, ValueError):
                year = str(year_raw)
        return f"{provinsi} ({year})"
    return provinsi


# ─── PCA ──────────────────────────────────────────────────────────────


def run_pca(X_scaled: np.ndarray, n_components: int | None = None) -> PCA:
    """Fit PCA. Default keeps all components (min of n_samples, n_features)."""
    if n_components is None:
        n_components = min(X_scaled.shape)
    pca = PCA(n_components=n_components)
    pca.fit(X_scaled)
    return pca


# ─── K-Means ─────────────────────────────────────────────────────────


def run_kmeans(
    X_scaled: np.ndarray,
    k: int = 3,
    random_state: int = 42,
    n_init: int = DEFAULT_KMEANS_N_INIT,
) -> KMeans:
    """Fit K-Means with *k* clusters."""
    km = KMeans(n_clusters=k, random_state=random_state, n_init=n_init)
    km.fit(X_scaled)
    return km


def _cluster_counts(labels: np.ndarray, k: int) -> np.ndarray:
    return np.bincount(labels.astype(int), minlength=k)


def _min_cluster_count(labels: np.ndarray, k: int) -> int:
    counts = _cluster_counts(labels, k)
    return int(counts.min()) if len(counts) else 0


def _calculate_inertia_from_labels(
    X_scaled: np.ndarray,
    labels: np.ndarray,
    centers: np.ndarray,
) -> float:
    diffs = X_scaled - centers[labels]
    return float(np.sum(diffs * diffs))


def _build_center_mapping(
    reference_centers: np.ndarray,
    candidate_centers: np.ndarray,
) -> dict[int, int]:
    """
    Build mapping candidate cluster id -> reference cluster id
    by minimizing centroid distance.
    """
    k = int(reference_centers.shape[0])
    distance_matrix = np.zeros((k, k), dtype=float)
    for src in range(k):
        for dst in range(k):
            diff = candidate_centers[src] - reference_centers[dst]
            distance_matrix[src, dst] = float(np.dot(diff, diff))

    if k <= 7:
        best_perm = None
        best_cost = float("inf")
        for perm in itertools.permutations(range(k)):
            cost = 0.0
            for src, dst in enumerate(perm):
                cost += distance_matrix[src, dst]
            if cost < best_cost:
                best_cost = cost
                best_perm = perm
        assert best_perm is not None
        return {src: int(dst) for src, dst in enumerate(best_perm)}

    remaining_dest = set(range(k))
    mapping: dict[int, int] = {}
    for src in range(k):
        best_dst = min(remaining_dest, key=lambda dst: distance_matrix[src, dst])
        mapping[src] = int(best_dst)
        remaining_dest.remove(best_dst)
    return mapping


def _align_labels_to_reference(
    reference_centers: np.ndarray,
    candidate_centers: np.ndarray,
    candidate_labels: np.ndarray,
) -> np.ndarray:
    mapping = _build_center_mapping(reference_centers, candidate_centers)
    return np.array([mapping[int(lbl)] for lbl in candidate_labels], dtype=int)


def _run_stable_kmeans(
    X_scaled: np.ndarray,
    k: int,
    *,
    random_state: int = 42,
    n_init: int = DEFAULT_KMEANS_N_INIT,
    consensus_runs: int = DEFAULT_CONSENSUS_RUNS,
    min_cluster_size: int = 2,
) -> dict:
    """
    Run K-Means multiple times and build a consensus labeling.
    Falls back to the best individual run if consensus collapses clusters.
    """
    if consensus_runs < 1:
        consensus_runs = 1

    runs: list[dict] = []
    for run_idx in range(consensus_runs):
        seed = random_state + run_idx
        km = run_kmeans(X_scaled, k=k, random_state=seed, n_init=n_init)
        labels = km.labels_.astype(int)
        unique_count = len(np.unique(labels))
        if unique_count < 2:
            sil = -1.0
            db_idx = float("inf")
            ch_idx = 0.0
        else:
            sil = float(silhouette_score(X_scaled, labels))
            db_idx = float(davies_bouldin_score(X_scaled, labels))
            ch_idx = float(calinski_harabasz_score(X_scaled, labels))
        min_count = _min_cluster_count(labels, k)
        runs.append(
            {
                "labels": labels,
                "centers": km.cluster_centers_.copy(),
                "inertia": float(km.inertia_),
                "silhouette": sil,
                "davies_bouldin": db_idx,
                "calinski_harabasz": ch_idx,
                "min_cluster_count": min_count,
                "valid_min_cluster": bool(min_count >= min_cluster_size),
            }
        )

    valid_runs = [r for r in runs if r["valid_min_cluster"]]
    candidate_runs = valid_runs if valid_runs else runs
    best_run = max(
        candidate_runs,
        key=lambda r: (
            float(r["silhouette"]),
            -float(r["davies_bouldin"]),
            -float(r["inertia"]),
        ),
    )

    if consensus_runs == 1:
        labels = best_run["labels"].copy()
        centers = best_run["centers"].copy()
        counts = _cluster_counts(labels, k)
        return {
            "labels": labels,
            "centers": centers,
            "cluster_counts": counts.tolist(),
            "min_cluster_count": int(counts.min()) if len(counts) else 0,
            "silhouette_score": float(best_run["silhouette"]),
            "davies_bouldin": float(best_run["davies_bouldin"]),
            "calinski_harabasz": float(best_run["calinski_harabasz"]),
            "inertia": float(best_run["inertia"]),
            "consensus_strength": 1.0,
            "consensus_runs": 1,
            "n_init": n_init,
            "used_consensus": False,
        }

    vote_counts = np.zeros((X_scaled.shape[0], k), dtype=int)
    for run in runs:
        aligned = _align_labels_to_reference(
            best_run["centers"],
            run["centers"],
            run["labels"],
        )
        vote_counts[np.arange(X_scaled.shape[0]), aligned] += 1

    voted_labels = np.argmax(vote_counts, axis=1).astype(int)
    voted_counts = _cluster_counts(voted_labels, k)

    use_consensus = bool(np.all(voted_counts > 0))
    if use_consensus:
        labels = voted_labels
        centers = np.zeros((k, X_scaled.shape[1]), dtype=float)
        for cluster_id in range(k):
            cluster_mask = labels == cluster_id
            centers[cluster_id] = X_scaled[cluster_mask].mean(axis=0)
    else:
        labels = best_run["labels"].copy()
        centers = best_run["centers"].copy()

    unique_count = len(np.unique(labels))
    if unique_count < 2:
        sil = -1.0
        db_idx = float("inf")
        ch_idx = 0.0
    else:
        sil = float(silhouette_score(X_scaled, labels))
        db_idx = float(davies_bouldin_score(X_scaled, labels))
        ch_idx = float(calinski_harabasz_score(X_scaled, labels))

    counts = _cluster_counts(labels, k)
    inertia = _calculate_inertia_from_labels(X_scaled, labels, centers)
    vote_max = np.max(vote_counts, axis=1) if vote_counts.size else np.array([consensus_runs])
    consensus_strength = float(np.mean(vote_max / max(consensus_runs, 1)))

    return {
        "labels": labels,
        "centers": centers,
        "cluster_counts": counts.tolist(),
        "min_cluster_count": int(counts.min()) if len(counts) else 0,
        "silhouette_score": sil,
        "davies_bouldin": db_idx,
        "calinski_harabasz": ch_idx,
        "inertia": inertia,
        "consensus_strength": consensus_strength,
        "consensus_runs": consensus_runs,
        "n_init": n_init,
        "used_consensus": use_consensus,
    }


def _build_clustering_candidates(
    X_scaled: np.ndarray,
    *,
    max_pca_components: int = 6,
) -> list[dict]:
    candidates: list[dict] = [
        {
            "name": "feature",
            "matrix": X_scaled,
            "space": "feature",
        }
    ]

    max_comp = int(min(X_scaled.shape[0], X_scaled.shape[1], max_pca_components))
    if max_comp < 2:
        return candidates

    pca = PCA(n_components=max_comp)
    X_pca = pca.fit_transform(X_scaled)
    cumulative = np.cumsum(pca.explained_variance_ratio_)

    component_choices = {2, 3, 4}
    for threshold in (0.85, 0.90, 0.95):
        n_comp = int(np.searchsorted(cumulative, threshold) + 1)
        component_choices.add(n_comp)

    for n_comp in sorted(component_choices):
        if n_comp < 2 or n_comp > max_comp:
            continue
        candidates.append(
            {
                "name": f"pca_{n_comp}",
                "matrix": X_pca[:, :n_comp],
                "space": "pca",
                "pca_components": int(n_comp),
                "pca_cumulative_variance": _safe_float(cumulative[n_comp - 1]),
            }
        )
    return candidates


def _select_stable_clustering_for_fixed_k(
    X_scaled: np.ndarray,
    k: int,
    *,
    min_cluster_size: int,
    consensus_runs: int,
    n_init: int,
    enforce_min_cluster_size: bool,
) -> dict:
    candidates = _build_clustering_candidates(X_scaled)
    evaluations: list[dict] = []
    for candidate in candidates:
        stable = _run_stable_kmeans(
            candidate["matrix"],
            k=k,
            consensus_runs=consensus_runs,
            n_init=n_init,
            min_cluster_size=min_cluster_size,
        )
        evaluations.append(
            {
                "candidate": candidate,
                "stable": stable,
                "valid_min_cluster": bool(stable["min_cluster_count"] >= min_cluster_size),
            }
        )

    valid_evaluations = [e for e in evaluations if e["valid_min_cluster"]]
    if enforce_min_cluster_size and valid_evaluations:
        pool = valid_evaluations
    else:
        pool = evaluations

    best = max(
        pool,
        key=lambda e: (
            float(e["stable"]["silhouette_score"]),
            -float(e["stable"]["davies_bouldin"]),
            -float(e["stable"]["inertia"]),
        ),
    )
    return {
        "best": best,
        "evaluations": evaluations,
    }


def find_optimal_k(
    X_scaled: np.ndarray,
    k_min: int = 2,
    k_max: int = 8,
    min_cluster_size: int = 3,
    consensus_runs: int = DEFAULT_CONSENSUS_RUNS,
    n_init: int = DEFAULT_KMEANS_N_INIT,
) -> dict:
    """Evaluate multiple K values and recommend the optimal K
    based on highest silhouette score."""
    results: list[dict] = []
    best_k = k_min
    best_sil = -1.0
    best_valid_k: int | None = None
    best_valid_sil = -1.0

    if min_cluster_size < 2:
        min_cluster_size = 2

    for k in range(k_min, k_max + 1):
        stable = _run_stable_kmeans(
            X_scaled,
            k=k,
            consensus_runs=consensus_runs,
            n_init=n_init,
            min_cluster_size=min_cluster_size,
        )
        min_count = int(stable["min_cluster_count"])
        is_valid = min_count >= min_cluster_size
        sil = float(stable["silhouette_score"])
        db_idx = float(stable["davies_bouldin"])
        ch_idx = float(stable["calinski_harabasz"])

        results.append(
            {
                "k": k,
                "inertia": float(stable["inertia"]),
                "silhouette_score": sil,
                "davies_bouldin": db_idx,
                "calinski_harabasz": ch_idx,
                "min_cluster_count": min_count,
                "valid_min_cluster": bool(is_valid),
                "consensus_strength": float(stable["consensus_strength"]),
            }
        )

        if sil > best_sil:
            best_sil = sil
            best_k = k
        if is_valid and sil > best_valid_sil:
            best_valid_sil = sil
            best_valid_k = k

    optimal_k = best_valid_k if best_valid_k is not None else best_k

    return {
        "evaluation": results,
        "optimal_k": optimal_k,
        "best_silhouette": best_valid_sil if best_valid_k is not None else best_sil,
        "min_cluster_size": min_cluster_size,
        "used_valid_filter": best_valid_k is not None,
        "consensus_runs": consensus_runs,
        "n_init": n_init,
    }


def evaluate_k_range(
    X_scaled: np.ndarray,
    k_min: int = 2,
    k_max: int = 8,
    min_cluster_size: int = 3,
    consensus_runs: int = DEFAULT_CONSENSUS_RUNS,
    n_init: int = DEFAULT_KMEANS_N_INIT,
) -> list[dict]:
    """Evaluate multiple K values and return metrics for each."""
    return find_optimal_k(
        X_scaled,
        k_min,
        k_max,
        min_cluster_size=min_cluster_size,
        consensus_runs=consensus_runs,
        n_init=n_init,
    )["evaluation"]


# ─── Cluster labels (descending by investment level) ─────────────────

CLUSTER_LABELS = {
    0: "Investasi Sangat Tinggi",
    1: "Investasi Tinggi",
    2: "Investasi Sedang",
    3: "Investasi Rendah",
}


# ─── Relabel clusters by investment ──────────────────────────────────


def _relabel_clusters_by_investment(
    df: pd.DataFrame,
    labels: np.ndarray,
) -> tuple[np.ndarray, dict[int, int]]:
    """Re-map K-Means cluster IDs so that cluster 0 has the *highest*
    combined investment (pmdn_rp + fdi_rp) and cluster K-1 the *lowest*.

    Returns (newLabels, oldToNew map)."""
    df_tmp = df.copy()
    df_tmp["cluster"] = labels
    df_tmp["_total_investasi"] = df_tmp["pmdn_rp"] + df_tmp["fdi_rp"]

    # Compute mean total investment per original cluster
    means = (
        df_tmp.groupby("cluster")["_total_investasi"]
        .mean()
        .sort_values(ascending=False)   # descending – highest first
    )

    # Build mapping: oldId → newId  (sorted rank)
    old_to_new: dict[int, int] = {
        old_id: new_id for new_id, old_id in enumerate(means.index)
    }

    new_labels = np.array([old_to_new[lbl] for lbl in labels])
    return new_labels, old_to_new


# ─── Cluster Summary ─────────────────────────────────────────────────


def _build_cluster_summary(
    df: pd.DataFrame,
    labels: np.ndarray,
    data_mode: str = DATA_MODE_PANEL,
    k: int = 4,
) -> list[dict]:
    """Build per-cluster summary statistics with human-readable labels."""
    mode = _normalise_data_mode(data_mode)
    df_copy = df.copy()
    df_copy["cluster"] = labels
    summary = []

    for cluster_id in sorted(df_copy["cluster"].unique()):
        cluster_df = df_copy[df_copy["cluster"] == cluster_id]
        provinces = sorted(
            {str(p).strip() for p in cluster_df["provinsi"].tolist() if str(p).strip()}
        )
        stats = {}
        for col in Province.NUMERIC_COLUMNS:
            stats[col] = {
                "mean": _safe_float(cluster_df[col].mean()),
                "min": _safe_float(cluster_df[col].min()),
                "max": _safe_float(cluster_df[col].max()),
                "std": _safe_float(cluster_df[col].std()),
            }

        label = CLUSTER_LABELS.get(int(cluster_id), f"Cluster {cluster_id}")
        item = {
            "cluster": int(cluster_id),
            "label": label,
            "count": len(provinces),
            "provinces": provinces,
            "statistics": stats,
        }
        if mode == DATA_MODE_PANEL:
            item["observation_count"] = len(cluster_df)
            if "year" in cluster_df.columns:
                years = pd.to_numeric(cluster_df["year"], errors="coerce").dropna()
                if not years.empty:
                    item["year_min"] = int(years.min())
                    item["year_max"] = int(years.max())
        summary.append(item)

    return summary


# ─── Full Analysis Pipeline ──────────────────────────────────────────


def run_full_analysis(
    k: int | None = None,
    log_transform: bool = True,
    data_mode: str = DATA_MODE_PANEL,
    panel_year_start: int | None = None,
    panel_year_end: int | None = None,
    normalise_by_year: bool | None = None,
    auto_k: bool = True,
    k_min: int = 2,
    k_max: int = 8,
    min_cluster_size: int = 3,
    consensus_runs: int = DEFAULT_CONSENSUS_RUNS,
    kmeans_n_init: int = DEFAULT_KMEANS_N_INIT,
    enforce_min_cluster_size: bool = True,
) -> AnalysisResult:
    """
    Run the complete PCA + K-Means pipeline:
    1. Load provinces from the **active dataset**
    2. Standardise features (with optional log-transform)
    3. PCA (keep all components)
    4. Find optimal K (if autoK=True and k is None)
    5. K-Means with k clusters
    6. Compute evaluation metrics + cluster summary
    7. Persist AnalysisResult (linked to dataset) and return it
    """
    mode = _normalise_data_mode(data_mode)
    year_start = panel_year_start
    year_end = panel_year_end
    if mode == DATA_MODE_PANEL:
        if year_start is None:
            year_start = DEFAULT_PANEL_YEAR_START
        if year_end is None:
            year_end = DEFAULT_PANEL_YEAR_END
    if min_cluster_size < 2:
        min_cluster_size = 2
    if consensus_runs < 1:
        consensus_runs = 1
    if kmeans_n_init < 1:
        kmeans_n_init = DEFAULT_KMEANS_N_INIT
    use_normalise_by_year = bool(normalise_by_year) if normalise_by_year is not None else (mode == DATA_MODE_PANEL)

    df, dataset_id, data_info = _load_dataframe_with_meta(
        data_mode=mode,
        year_start=year_start,
        year_end=year_end,
    )
    X_scaled, _scaler, transform_info = _prepare_matrix(
        df,
        log_transform=log_transform,
        normalise_by_year=use_normalise_by_year,
    )
    transform_info.append(f"data_mode:{mode}")
    transform_info.append(f"normalise_by_year:{str(use_normalise_by_year).lower()}")
    transform_info.append(f"kmeans_n_init:{kmeans_n_init}")
    transform_info.append(f"consensus_runs:{consensus_runs}")
    transform_info.append(f"min_cluster_size:{min_cluster_size}")
    transform_info.append(
        f"enforce_min_cluster_size:{str(bool(enforce_min_cluster_size)).lower()}"
    )
    if mode == DATA_MODE_PANEL:
        transform_info.extend(
            [
                "panel_input:province_year_rows",
                f"source_rows:{data_info.get('source_rows')}",
                f"scoped_rows:{data_info.get('scoped_rows')}",
                f"observation_rows:{data_info.get('observation_rows')}",
                f"province_rows:{data_info.get('province_rows')}",
            ]
        )
        year_min = data_info.get("year_min")
        year_max = data_info.get("year_max")
        if year_min is not None and year_max is not None:
            transform_info.append(f"year_range:{year_min}-{year_max}")
    if (
        mode == DATA_MODE_AGGREGATED
        and data_info.get("source_rows", 0) > data_info.get("province_rows", 0)
    ):
        transform_info.extend(
            [
                "panel_aggregation:mean_by_province",
                f"source_rows:{data_info.get('source_rows')}",
                f"scoped_rows:{data_info.get('scoped_rows')}",
                f"province_rows:{data_info.get('province_rows')}",
            ]
        )
        year_min = data_info.get("year_min")
        year_max = data_info.get("year_max")
        if year_min is not None and year_max is not None:
            transform_info.append(f"year_range:{year_min}-{year_max}")

    # ── PCA ──
    pca = run_pca(X_scaled)
    X_pca = pca.transform(X_scaled)

    # Build PCA components list
    pca_components = []
    for comp_idx in range(pca.n_components_):
        pca_components.append(
            {
                "component": comp_idx + 1,
                "explained_variance_ratio": float(
                    pca.explained_variance_ratio_[comp_idx]
                ),
                "scores": {
                    _build_observation_key(row, mode): float(X_pca[i, comp_idx])
                    for i, row in df.iterrows()
                },
            }
        )

    # PCA loadings
    pca_loadings = {}
    for comp_idx in range(pca.n_components_):
        pca_loadings[f"PC{comp_idx + 1}"] = {
            col: float(pca.components_[comp_idx, j])
            for j, col in enumerate(Province.NUMERIC_COLUMNS)
        }

    pca_explained_variance = [
        {
            "component": i + 1,
            "variance": float(pca.explained_variance_ratio_[i]),
            "cumulative": float(
                pca.explained_variance_ratio_[: i + 1].sum()
            ),
        }
        for i in range(pca.n_components_)
    ]

    # ── Optimal K ──
    k_evaluation = None
    if k is None and auto_k:
        k_result = find_optimal_k(
            X_scaled,
            k_min=k_min,
            k_max=k_max,
            min_cluster_size=min_cluster_size,
            consensus_runs=consensus_runs,
            n_init=kmeans_n_init,
        )
        k = k_result["optimal_k"]
        k_evaluation = k_result["evaluation"]
    elif k is None:
        k = 4  # default fallback

    # ── K-Means ──
    clustering_selection = _select_stable_clustering_for_fixed_k(
        X_scaled,
        k=k,
        min_cluster_size=min_cluster_size,
        consensus_runs=consensus_runs,
        n_init=kmeans_n_init,
        enforce_min_cluster_size=enforce_min_cluster_size,
    )
    best_candidate = clustering_selection["best"]["candidate"]
    stable = clustering_selection["best"]["stable"]
    cluster_input_matrix = best_candidate["matrix"]
    raw_labels = stable["labels"]
    stable_centers = stable["centers"]
    min_count = int(stable["min_cluster_count"])
    if enforce_min_cluster_size and min_count < min_cluster_size:
        raise ValueError(
            "Hasil clustering tidak lolos quality gate: "
            f"cluster terkecil {min_count} < minClusterSize {min_cluster_size}"
        )
    transform_info.append(f"cluster_space:{best_candidate['space']}")
    transform_info.append(f"cluster_space_candidate:{best_candidate['name']}")
    if best_candidate.get("space") == "pca":
        transform_info.append(
            f"cluster_space_pca_components:{best_candidate.get('pca_components')}"
        )
        transform_info.append(
            "cluster_space_pca_cumulative_variance:"
            f"{_safe_float(best_candidate.get('pca_cumulative_variance')):.4f}"
        )
    transform_info.append(f"cluster_input_dim:{int(cluster_input_matrix.shape[1])}")
    transform_info.append(f"actual_min_cluster_count:{min_count}")
    transform_info.append(
        f"consensus_strength:{_safe_float(stable['consensus_strength']):.4f}"
    )
    transform_info.append(f"used_consensus:{str(bool(stable['used_consensus'])).lower()}")

    # Relabel clusters so 0 = highest investment, K-1 = lowest
    labels, old_to_new = _relabel_clusters_by_investment(df, raw_labels)

    cluster_assignments = {
        _build_observation_key(row, mode): int(labels[i]) for i, row in df.iterrows()
    }

    # Reorder cluster centers to match new labels
    reordered_centers = [None] * k
    for old_id, new_id in old_to_new.items():
        reordered_centers[new_id] = stable_centers[old_id].tolist()
    cluster_centers = reordered_centers

    # ── Cluster Summary (original scale) ──
    cluster_summary = _build_cluster_summary(df, labels, data_mode=mode, k=k)

    # ── Metrics ──
    sil = _safe_float(stable["silhouette_score"])
    inertia = _safe_float(stable["inertia"])
    db_score = _safe_float(stable["davies_bouldin"])
    ch_score = _safe_float(stable["calinski_harabasz"])

    # ── Persist ──
    result = AnalysisResult(
        dataset_id=dataset_id,
        k=k,
        pca_components=_sanitize_json_value(pca_components),
        pca_loadings=_sanitize_json_value(pca_loadings),
        pca_explained_variance=_sanitize_json_value(pca_explained_variance),
        cluster_assignments=_sanitize_json_value(cluster_assignments),
        cluster_centers=_sanitize_json_value(cluster_centers),
        cluster_summary=_sanitize_json_value(cluster_summary),
        k_evaluation=_sanitize_json_value(k_evaluation),
        silhouette_score=sil,
        inertia=inertia,
        davies_bouldin=db_score,
        calinski_harabasz=ch_score,
        log_transformed=log_transform,
        transform_info=_sanitize_json_value(transform_info),
    )
    result.ensure_public_identifiers()
    db.session.add(result)
    db.session.commit()

    return result


def get_latest_result() -> AnalysisResult | None:
    """Return most recent analysis result for the active dataset."""
    ds = Dataset.get_active()
    if ds is None:
        return None
    return (
        AnalysisResult.query
        .filter_by(dataset_id=ds.id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

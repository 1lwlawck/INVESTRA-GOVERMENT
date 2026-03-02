"""
Analysis Service – PCA dimensionality reduction + K-Means clustering
using scikit-learn on the provinces dataset.
"""

from __future__ import annotations

import itertools

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.cluster import KMeans
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score,
    calinski_harabasz_score,
)

from app.Extensions import db
from app.models.Dataset import Dataset
from app.models.Province import Province
from app.models.AnalysisResult import AnalysisResult


# ─── Constants ────────────────────────────────────────────────────────

SKEWED_COLUMNS = ["pmdn_rp", "fdi_rp", "pdrb_per_kapita"]
DATA_MODE_AGGREGATED = "aggregated"
DATA_MODE_PANEL = "panel"
VALID_DATA_MODES = {DATA_MODE_PANEL}
DEFAULT_PANEL_YEAR_START = 2022
DEFAULT_PANEL_YEAR_END = 2024
DEFAULT_KMEANS_N_INIT = 50
DEFAULT_CONSENSUS_RUNS = 25


def _safeFloat(value: float | int | np.floating | np.integer | None) -> float:
    """Return JSON-safe float; convert NaN/inf to 0.0."""
    try:
        v = float(value)
    except (TypeError, ValueError):
        return 0.0
    return v if np.isfinite(v) else 0.0


def _sanitizeJsonValue(value):
    """Recursively sanitize structures before persisting into JSON columns."""
    if isinstance(value, dict):
        return {k: _sanitizeJsonValue(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_sanitizeJsonValue(v) for v in value]
    if isinstance(value, tuple):
        return [_sanitizeJsonValue(v) for v in value]
    if isinstance(value, np.bool_):
        return bool(value)
    if isinstance(value, bool):
        return value
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, int):
        return value
    if isinstance(value, (np.floating, float)):
        return _safeFloat(value)
    return value


def _normaliseDataMode(dataMode: str | None) -> str:
    mode = str(dataMode or DATA_MODE_PANEL).strip().lower()
    if mode == DATA_MODE_AGGREGATED:
        raise ValueError(
            "Mode analisis 'aggregated' dinonaktifkan. Gunakan mode 'panel'"
        )
    if mode not in VALID_DATA_MODES:
        raise ValueError("Mode analisis tidak valid. Gunakan mode 'panel'")
    return DATA_MODE_PANEL


# ─── Helpers ──────────────────────────────────────────────────────────


def _getActiveDataset() -> Dataset:
    """Return the active dataset or raise ValueError."""
    ds = Dataset.getActive()
    if ds is None:
        raise ValueError("Tidak ada dataset aktif")
    return ds


def _loadRawDataframe(datasetId: str | None = None) -> tuple[pd.DataFrame, str]:
    """Load province rows for a specific dataset (or active) into a DataFrame."""
    if datasetId is None:
        ds = _getActiveDataset()
        datasetId = ds.id
    provinces = (
        Province.query
        .filter_by(dataset_id=datasetId)
        .order_by(Province.year.desc(), Province.provinsi)
        .all()
    )
    if not provinces:
        raise ValueError(f"Dataset {datasetId} tidak memiliki data provinsi")
    rows = [p.toDict() for p in provinces]
    return pd.DataFrame(rows), datasetId


def _filterDataframeByYearRange(
    df: pd.DataFrame,
    yearStart: int | None = None,
    yearEnd: int | None = None,
) -> tuple[pd.DataFrame, dict]:
    """Filter dataframe by inclusive year range."""
    if yearStart is None and yearEnd is None:
        return df, {}
    if "year" not in df.columns:
        raise ValueError("Dataset tidak memiliki kolom year")

    years = pd.to_numeric(df["year"], errors="coerce")
    validYears = years.dropna()
    if validYears.empty:
        raise ValueError("Dataset tidak memiliki nilai year yang valid")

    start = int(yearStart) if yearStart is not None else int(validYears.min())
    end = int(yearEnd) if yearEnd is not None else int(validYears.max())
    if start > end:
        raise ValueError("Rentang tahun tidak valid: yearStart harus <= yearEnd")

    mask = (years >= start) & (years <= end)
    filtered = df.loc[mask].copy().reset_index(drop=True)
    if filtered.empty:
        raise ValueError(f"Tidak ada data pada rentang tahun {start}-{end}")

    return filtered, {
        "filter_year_min": start,
        "filter_year_max": end,
        "available_year_min": int(validYears.min()),
        "available_year_max": int(validYears.max()),
        "filtered_rows": int(len(filtered)),
    }


def _aggregateDataframeByProvince(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """
    Aggregate multi-year panel rows into one row per province
    using mean for each numeric indicator.
    """
    numericCols = Province.NUMERIC_COLUMNS
    grouped = (
        df.groupby("provinsi", as_index=False)[numericCols]
        .mean()
        .sort_values("provinsi")
        .reset_index(drop=True)
    )

    info: dict[str, int] = {
        "source_rows": int(len(df)),
        "province_rows": int(len(grouped)),
    }
    if "year" in df.columns:
        years = pd.to_numeric(df["year"], errors="coerce").dropna()
        if not years.empty:
            info["year_min"] = int(years.min())
            info["year_max"] = int(years.max())
    return grouped, info


def _loadDataframeWithMeta(
    datasetId: str | None = None,
    dataMode: str = DATA_MODE_PANEL,
    yearStart: int | None = None,
    yearEnd: int | None = None,
) -> tuple[pd.DataFrame, str, dict]:
    """Load dataset rows into analysis-ready rows based on selected mode."""
    mode = _normaliseDataMode(dataMode)
    rawDf, datasetId = _loadRawDataframe(datasetId)
    scopedDf, yearInfo = _filterDataframeByYearRange(
        rawDf,
        yearStart=yearStart,
        yearEnd=yearEnd,
    )
    if mode == DATA_MODE_PANEL:
        panelDf = (
            scopedDf
            .sort_values(["provinsi", "year"])
            .reset_index(drop=True)
        )
        info: dict[str, int | str] = {
            "data_mode": mode,
            "source_rows": int(len(rawDf)),
            "scoped_rows": int(len(scopedDf)),
            "observation_rows": int(len(panelDf)),
            "province_rows": int(panelDf["provinsi"].nunique()),
        }
        info.update(yearInfo)
        if "year" in panelDf.columns:
            years = pd.to_numeric(panelDf["year"], errors="coerce").dropna()
            if not years.empty:
                info["year_min"] = int(years.min())
                info["year_max"] = int(years.max())
        return panelDf, datasetId, info

    aggregatedDf, info = _aggregateDataframeByProvince(scopedDf)
    info["source_rows"] = int(len(rawDf))
    info["scoped_rows"] = int(len(scopedDf))
    info.update(yearInfo)
    info["data_mode"] = mode
    return aggregatedDf, datasetId, info


def _loadDataframe(
    datasetId: str | None = None,
    dataMode: str = DATA_MODE_PANEL,
    yearStart: int | None = None,
    yearEnd: int | None = None,
) -> tuple[pd.DataFrame, str]:
    """Load analysis-ready dataframe based on selected data mode."""
    df, datasetId, _info = _loadDataframeWithMeta(
        datasetId,
        dataMode=dataMode,
        yearStart=yearStart,
        yearEnd=yearEnd,
    )
    return df, datasetId


def _prepareMatrix(
    df: pd.DataFrame,
    logTransform: bool = True,
    normaliseByYear: bool = False,
) -> tuple[np.ndarray, StandardScaler, list[str]]:
    """Extract numeric columns, optionally log-transform skewed features,
    and return standardised matrix + scaler + column names used."""
    numericCols = Province.NUMERIC_COLUMNS
    valuesDf = df[numericCols].astype(float).copy()

    transformInfo = []
    if logTransform:
        for col in SKEWED_COLUMNS:
            if col in numericCols:
                valuesDf[col] = np.log1p(valuesDf[col].to_numpy())
                transformInfo.append(col)

    X = valuesDf.to_numpy(dtype=float)
    scaler = StandardScaler()

    if normaliseByYear and "year" in df.columns:
        yearSeries = pd.to_numeric(df["year"], errors="coerce")
        X_scaled = np.zeros_like(X, dtype=float)
        assignedMask = np.zeros(len(df), dtype=bool)

        for year in sorted(yearSeries.dropna().unique()):
            maskSeries = (yearSeries == year)
            mask = maskSeries.to_numpy()
            if not mask.any():
                continue
            yearScaler = StandardScaler()
            X_scaled[mask] = yearScaler.fit_transform(X[mask])
            assignedMask = assignedMask | mask

        if not assignedMask.all():
            fallbackScaler = StandardScaler()
            X_scaled[~assignedMask] = fallbackScaler.fit_transform(X[~assignedMask])

        scaler.fit(X)
        transformInfo.append("normalise_within_year")
        return X_scaled, scaler, transformInfo

    X_scaled = scaler.fit_transform(X)
    transformInfo.append("normalise_global")
    return X_scaled, scaler, transformInfo


def _buildObservationKey(row: pd.Series, dataMode: str) -> str:
    provinsi = str(row.get("provinsi", "")).strip()
    if dataMode == DATA_MODE_PANEL:
        yearRaw = row.get("year")
        year = "NA"
        if pd.notna(yearRaw):
            try:
                year = str(int(yearRaw))
            except (TypeError, ValueError):
                year = str(yearRaw)
        return f"{provinsi} ({year})"
    return provinsi


# ─── PCA ──────────────────────────────────────────────────────────────


def runPca(X_scaled: np.ndarray, n_components: int | None = None) -> PCA:
    """Fit PCA. Default keeps all components (min of n_samples, n_features)."""
    if n_components is None:
        n_components = min(X_scaled.shape)
    pca = PCA(n_components=n_components)
    pca.fit(X_scaled)
    return pca


# ─── K-Means ─────────────────────────────────────────────────────────


def runKmeans(
    X_scaled: np.ndarray,
    k: int = 3,
    random_state: int = 42,
    n_init: int = DEFAULT_KMEANS_N_INIT,
) -> KMeans:
    """Fit K-Means with *k* clusters."""
    km = KMeans(n_clusters=k, random_state=random_state, n_init=n_init)
    km.fit(X_scaled)
    return km


def _clusterCounts(labels: np.ndarray, k: int) -> np.ndarray:
    return np.bincount(labels.astype(int), minlength=k)


def _minClusterCount(labels: np.ndarray, k: int) -> int:
    counts = _clusterCounts(labels, k)
    return int(counts.min()) if len(counts) else 0


def _calculateInertiaFromLabels(
    X_scaled: np.ndarray,
    labels: np.ndarray,
    centers: np.ndarray,
) -> float:
    diffs = X_scaled - centers[labels]
    return float(np.sum(diffs * diffs))


def _buildCenterMapping(
    referenceCenters: np.ndarray,
    candidateCenters: np.ndarray,
) -> dict[int, int]:
    """
    Build mapping candidate cluster id -> reference cluster id
    by minimizing centroid distance.
    """
    k = int(referenceCenters.shape[0])
    distanceMatrix = np.zeros((k, k), dtype=float)
    for src in range(k):
        for dst in range(k):
            diff = candidateCenters[src] - referenceCenters[dst]
            distanceMatrix[src, dst] = float(np.dot(diff, diff))

    if k <= 7:
        bestPerm = None
        bestCost = float("inf")
        for perm in itertools.permutations(range(k)):
            cost = 0.0
            for src, dst in enumerate(perm):
                cost += distanceMatrix[src, dst]
            if cost < bestCost:
                bestCost = cost
                bestPerm = perm
        assert bestPerm is not None
        return {src: int(dst) for src, dst in enumerate(bestPerm)}

    remainingDest = set(range(k))
    mapping: dict[int, int] = {}
    for src in range(k):
        bestDst = min(remainingDest, key=lambda dst: distanceMatrix[src, dst])
        mapping[src] = int(bestDst)
        remainingDest.remove(bestDst)
    return mapping


def _alignLabelsToReference(
    referenceCenters: np.ndarray,
    candidateCenters: np.ndarray,
    candidateLabels: np.ndarray,
) -> np.ndarray:
    mapping = _buildCenterMapping(referenceCenters, candidateCenters)
    return np.array([mapping[int(lbl)] for lbl in candidateLabels], dtype=int)


def _runStableKmeans(
    X_scaled: np.ndarray,
    k: int,
    *,
    randomState: int = 42,
    nInit: int = DEFAULT_KMEANS_N_INIT,
    consensusRuns: int = DEFAULT_CONSENSUS_RUNS,
    minClusterSize: int = 2,
) -> dict:
    """
    Run K-Means multiple times and build a consensus labeling.
    Falls back to the best individual run if consensus collapses clusters.
    """
    if consensusRuns < 1:
        consensusRuns = 1

    runs: list[dict] = []
    for runIdx in range(consensusRuns):
        seed = randomState + runIdx
        km = runKmeans(X_scaled, k=k, random_state=seed, n_init=nInit)
        labels = km.labels_.astype(int)
        uniqueCount = int(len(np.unique(labels)))
        if uniqueCount < 2:
            sil = -1.0
            dbIdx = float("inf")
            chIdx = 0.0
        else:
            sil = float(silhouette_score(X_scaled, labels))
            dbIdx = float(davies_bouldin_score(X_scaled, labels))
            chIdx = float(calinski_harabasz_score(X_scaled, labels))
        minCount = _minClusterCount(labels, k)
        runs.append(
            {
                "labels": labels,
                "centers": km.cluster_centers_.copy(),
                "inertia": float(km.inertia_),
                "silhouette": sil,
                "davies_bouldin": dbIdx,
                "calinski_harabasz": chIdx,
                "min_cluster_count": minCount,
                "valid_min_cluster": bool(minCount >= minClusterSize),
            }
        )

    validRuns = [r for r in runs if r["valid_min_cluster"]]
    candidateRuns = validRuns if validRuns else runs
    bestRun = max(
        candidateRuns,
        key=lambda r: (
            float(r["silhouette"]),
            -float(r["davies_bouldin"]),
            -float(r["inertia"]),
        ),
    )

    if consensusRuns == 1:
        labels = bestRun["labels"].copy()
        centers = bestRun["centers"].copy()
        counts = _clusterCounts(labels, k)
        return {
            "labels": labels,
            "centers": centers,
            "cluster_counts": counts.tolist(),
            "min_cluster_count": int(counts.min()) if len(counts) else 0,
            "silhouette_score": float(bestRun["silhouette"]),
            "davies_bouldin": float(bestRun["davies_bouldin"]),
            "calinski_harabasz": float(bestRun["calinski_harabasz"]),
            "inertia": float(bestRun["inertia"]),
            "consensus_strength": 1.0,
            "consensus_runs": 1,
            "n_init": nInit,
            "used_consensus": False,
        }

    voteCounts = np.zeros((X_scaled.shape[0], k), dtype=int)
    for run in runs:
        aligned = _alignLabelsToReference(
            bestRun["centers"],
            run["centers"],
            run["labels"],
        )
        voteCounts[np.arange(X_scaled.shape[0]), aligned] += 1

    votedLabels = np.argmax(voteCounts, axis=1).astype(int)
    votedCounts = _clusterCounts(votedLabels, k)

    useConsensus = bool(np.all(votedCounts > 0))
    if useConsensus:
        labels = votedLabels
        centers = np.zeros((k, X_scaled.shape[1]), dtype=float)
        for clusterId in range(k):
            clusterMask = labels == clusterId
            centers[clusterId] = X_scaled[clusterMask].mean(axis=0)
    else:
        labels = bestRun["labels"].copy()
        centers = bestRun["centers"].copy()

    uniqueCount = int(len(np.unique(labels)))
    if uniqueCount < 2:
        sil = -1.0
        dbIdx = float("inf")
        chIdx = 0.0
    else:
        sil = float(silhouette_score(X_scaled, labels))
        dbIdx = float(davies_bouldin_score(X_scaled, labels))
        chIdx = float(calinski_harabasz_score(X_scaled, labels))

    counts = _clusterCounts(labels, k)
    inertia = _calculateInertiaFromLabels(X_scaled, labels, centers)
    voteMax = np.max(voteCounts, axis=1) if voteCounts.size else np.array([consensusRuns])
    consensusStrength = float(np.mean(voteMax / max(consensusRuns, 1)))

    return {
        "labels": labels,
        "centers": centers,
        "cluster_counts": counts.tolist(),
        "min_cluster_count": int(counts.min()) if len(counts) else 0,
        "silhouette_score": sil,
        "davies_bouldin": dbIdx,
        "calinski_harabasz": chIdx,
        "inertia": inertia,
        "consensus_strength": consensusStrength,
        "consensus_runs": consensusRuns,
        "n_init": nInit,
        "used_consensus": useConsensus,
    }


def _buildClusteringCandidates(
    X_scaled: np.ndarray,
    *,
    maxPcaComponents: int = 6,
) -> list[dict]:
    candidates: list[dict] = [
        {
            "name": "feature",
            "matrix": X_scaled,
            "space": "feature",
        }
    ]

    maxComp = int(min(X_scaled.shape[0], X_scaled.shape[1], maxPcaComponents))
    if maxComp < 2:
        return candidates

    pca = PCA(n_components=maxComp)
    X_pca = pca.fit_transform(X_scaled)
    cumulative = np.cumsum(pca.explained_variance_ratio_)

    componentChoices = {2, 3, 4}
    for threshold in (0.85, 0.90, 0.95):
        nComp = int(np.searchsorted(cumulative, threshold) + 1)
        componentChoices.add(nComp)

    for nComp in sorted(componentChoices):
        if nComp < 2 or nComp > maxComp:
            continue
        candidates.append(
            {
                "name": f"pca_{nComp}",
                "matrix": X_pca[:, :nComp],
                "space": "pca",
                "pca_components": int(nComp),
                "pca_cumulative_variance": _safeFloat(cumulative[nComp - 1]),
            }
        )
    return candidates


def _selectStableClusteringForFixedK(
    X_scaled: np.ndarray,
    k: int,
    *,
    minClusterSize: int,
    consensusRuns: int,
    nInit: int,
    enforceMinClusterSize: bool,
) -> dict:
    candidates = _buildClusteringCandidates(X_scaled)
    evaluations: list[dict] = []
    for candidate in candidates:
        stable = _runStableKmeans(
            candidate["matrix"],
            k=k,
            consensusRuns=consensusRuns,
            nInit=nInit,
            minClusterSize=minClusterSize,
        )
        evaluations.append(
            {
                "candidate": candidate,
                "stable": stable,
                "valid_min_cluster": bool(stable["min_cluster_count"] >= minClusterSize),
            }
        )

    validEvaluations = [e for e in evaluations if e["valid_min_cluster"]]
    if enforceMinClusterSize and validEvaluations:
        pool = validEvaluations
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


def findOptimalK(
    X_scaled: np.ndarray,
    kMin: int = 2,
    kMax: int = 8,
    minClusterSize: int = 3,
    consensusRuns: int = DEFAULT_CONSENSUS_RUNS,
    nInit: int = DEFAULT_KMEANS_N_INIT,
) -> dict:
    """Evaluate multiple K values and recommend the optimal K
    based on highest silhouette score."""
    results: list[dict] = []
    bestK = kMin
    bestSil = -1.0
    bestValidK: int | None = None
    bestValidSil = -1.0

    if minClusterSize < 2:
        minClusterSize = 2

    for k in range(kMin, kMax + 1):
        stable = _runStableKmeans(
            X_scaled,
            k=k,
            consensusRuns=consensusRuns,
            nInit=nInit,
            minClusterSize=minClusterSize,
        )
        minCount = int(stable["min_cluster_count"])
        isValid = minCount >= minClusterSize
        sil = float(stable["silhouette_score"])
        dbIdx = float(stable["davies_bouldin"])
        chIdx = float(stable["calinski_harabasz"])

        results.append(
            {
                "k": k,
                "inertia": float(stable["inertia"]),
                "silhouette_score": sil,
                "davies_bouldin": dbIdx,
                "calinski_harabasz": chIdx,
                "min_cluster_count": minCount,
                "valid_min_cluster": bool(isValid),
                "consensus_strength": float(stable["consensus_strength"]),
            }
        )

        if sil > bestSil:
            bestSil = sil
            bestK = k
        if isValid and sil > bestValidSil:
            bestValidSil = sil
            bestValidK = k

    optimalK = bestValidK if bestValidK is not None else bestK

    return {
        "evaluation": results,
        "optimal_k": optimalK,
        "best_silhouette": bestValidSil if bestValidK is not None else bestSil,
        "min_cluster_size": minClusterSize,
        "used_valid_filter": bestValidK is not None,
        "consensus_runs": consensusRuns,
        "n_init": nInit,
    }


def evaluateKRange(
    X_scaled: np.ndarray,
    kMin: int = 2,
    kMax: int = 8,
    minClusterSize: int = 3,
    consensusRuns: int = DEFAULT_CONSENSUS_RUNS,
    nInit: int = DEFAULT_KMEANS_N_INIT,
) -> list[dict]:
    """Evaluate multiple K values and return metrics for each."""
    return findOptimalK(
        X_scaled,
        kMin,
        kMax,
        minClusterSize=minClusterSize,
        consensusRuns=consensusRuns,
        nInit=nInit,
    )["evaluation"]


# ─── Cluster labels (descending by investment level) ─────────────────

CLUSTER_LABELS = {
    0: "Investasi Sangat Tinggi",
    1: "Investasi Tinggi",
    2: "Investasi Sedang",
    3: "Investasi Rendah",
}


# ─── Relabel clusters by investment ──────────────────────────────────


def _relabelClustersByInvestment(
    df: pd.DataFrame,
    labels: np.ndarray,
) -> tuple[np.ndarray, dict[int, int]]:
    """Re-map K-Means cluster IDs so that cluster 0 has the *highest*
    combined investment (pmdn_rp + fdi_rp) and cluster K-1 the *lowest*.

    Returns (newLabels, oldToNew map)."""   
    dfTmp = df.copy()
    dfTmp["cluster"] = labels
    dfTmp["_total_investasi"] = dfTmp["pmdn_rp"] + dfTmp["fdi_rp"]

    # Compute mean total investment per original cluster
    means = (
        dfTmp.groupby("cluster")["_total_investasi"]
        .mean()
        .sort_values(ascending=False)   # descending – highest first
    )

    # Build mapping: oldId → newId  (sorted rank)
    oldToNew: dict[int, int] = {
        oldId: newId for newId, oldId in enumerate(means.index)
    }

    newLabels = np.array([oldToNew[lbl] for lbl in labels])
    return newLabels, oldToNew


# ─── Cluster Summary ─────────────────────────────────────────────────


def _buildClusterSummary(
    df: pd.DataFrame,
    labels: np.ndarray,
    dataMode: str = DATA_MODE_PANEL,
    k: int = 4,
) -> list[dict]:
    """Build per-cluster summary statistics with human-readable labels."""
    mode = _normaliseDataMode(dataMode)
    dfCopy = df.copy()
    dfCopy["cluster"] = labels
    summary = []

    for clusterId in sorted(dfCopy["cluster"].unique()):
        clusterDf = dfCopy[dfCopy["cluster"] == clusterId]
        provinces = sorted(
            {str(p).strip() for p in clusterDf["provinsi"].tolist() if str(p).strip()}
        )
        stats = {}
        for col in Province.NUMERIC_COLUMNS:
            stats[col] = {
                "mean": _safeFloat(clusterDf[col].mean()),
                "min": _safeFloat(clusterDf[col].min()),
                "max": _safeFloat(clusterDf[col].max()),
                "std": _safeFloat(clusterDf[col].std()),
            }

        label = CLUSTER_LABELS.get(int(clusterId), f"Cluster {clusterId}")
        item = {
            "cluster": int(clusterId),
            "label": label,
            "count": len(provinces),
            "provinces": provinces,
            "statistics": stats,
        }
        if mode == DATA_MODE_PANEL:
            item["observation_count"] = int(len(clusterDf))
            if "year" in clusterDf.columns:
                years = pd.to_numeric(clusterDf["year"], errors="coerce").dropna()
                if not years.empty:
                    item["year_min"] = int(years.min())
                    item["year_max"] = int(years.max())
        summary.append(item)

    return summary


# ─── Full Analysis Pipeline ──────────────────────────────────────────


def runFullAnalysis(
    k: int | None = None,
    logTransform: bool = True,
    dataMode: str = DATA_MODE_PANEL,
    panelYearStart: int | None = None,
    panelYearEnd: int | None = None,
    normaliseByYear: bool | None = None,
    autoK: bool = True,
    kMin: int = 2,
    kMax: int = 8,
    minClusterSize: int = 3,
    consensusRuns: int = DEFAULT_CONSENSUS_RUNS,
    kmeansNInit: int = DEFAULT_KMEANS_N_INIT,
    enforceMinClusterSize: bool = True,
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
    mode = _normaliseDataMode(dataMode)
    yearStart = panelYearStart
    yearEnd = panelYearEnd
    if mode == DATA_MODE_PANEL:
        if yearStart is None:
            yearStart = DEFAULT_PANEL_YEAR_START
        if yearEnd is None:
            yearEnd = DEFAULT_PANEL_YEAR_END
    if minClusterSize < 2:
        minClusterSize = 2
    if consensusRuns < 1:
        consensusRuns = 1
    if kmeansNInit < 1:
        kmeansNInit = DEFAULT_KMEANS_N_INIT
    useNormaliseByYear = bool(normaliseByYear) if normaliseByYear is not None else (mode == DATA_MODE_PANEL)

    df, datasetId, dataInfo = _loadDataframeWithMeta(
        dataMode=mode,
        yearStart=yearStart,
        yearEnd=yearEnd,
    )
    X_scaled, _scaler, transformInfo = _prepareMatrix(
        df,
        logTransform=logTransform,
        normaliseByYear=useNormaliseByYear,
    )
    transformInfo.append(f"data_mode:{mode}")
    transformInfo.append(f"normalise_by_year:{str(useNormaliseByYear).lower()}")
    transformInfo.append(f"kmeans_n_init:{kmeansNInit}")
    transformInfo.append(f"consensus_runs:{consensusRuns}")
    transformInfo.append(f"min_cluster_size:{minClusterSize}")
    transformInfo.append(
        f"enforce_min_cluster_size:{str(bool(enforceMinClusterSize)).lower()}"
    )
    if mode == DATA_MODE_PANEL:
        transformInfo.extend(
            [
                "panel_input:province_year_rows",
                f"source_rows:{dataInfo.get('source_rows')}",
                f"scoped_rows:{dataInfo.get('scoped_rows')}",
                f"observation_rows:{dataInfo.get('observation_rows')}",
                f"province_rows:{dataInfo.get('province_rows')}",
            ]
        )
        yearMin = dataInfo.get("year_min")
        yearMax = dataInfo.get("year_max")
        if yearMin is not None and yearMax is not None:
            transformInfo.append(f"year_range:{yearMin}-{yearMax}")
    if (
        mode == DATA_MODE_AGGREGATED
        and dataInfo.get("source_rows", 0) > dataInfo.get("province_rows", 0)
    ):
        transformInfo.extend(
            [
                "panel_aggregation:mean_by_province",
                f"source_rows:{dataInfo.get('source_rows')}",
                f"scoped_rows:{dataInfo.get('scoped_rows')}",
                f"province_rows:{dataInfo.get('province_rows')}",
            ]
        )
        yearMin = dataInfo.get("year_min")
        yearMax = dataInfo.get("year_max")
        if yearMin is not None and yearMax is not None:
            transformInfo.append(f"year_range:{yearMin}-{yearMax}")

    # ── PCA ──
    pca = runPca(X_scaled)
    X_pca = pca.transform(X_scaled)

    # Build PCA components list
    pcaComponents = []
    for compIdx in range(pca.n_components_):
        pcaComponents.append(
            {
                "component": compIdx + 1,
                "explained_variance_ratio": float(
                    pca.explained_variance_ratio_[compIdx]
                ),
                "scores": {
                    _buildObservationKey(row, mode): float(X_pca[i, compIdx])
                    for i, row in df.iterrows()
                },
            }
        )

    # PCA loadings
    pcaLoadings = {}
    for compIdx in range(pca.n_components_):
        pcaLoadings[f"PC{compIdx + 1}"] = {
            col: float(pca.components_[compIdx, j])
            for j, col in enumerate(Province.NUMERIC_COLUMNS)
        }

    pcaExplainedVariance = [
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
    kEvaluation = None
    if k is None and autoK:
        kResult = findOptimalK(
            X_scaled,
            kMin=kMin,
            kMax=kMax,
            minClusterSize=minClusterSize,
            consensusRuns=consensusRuns,
            nInit=kmeansNInit,
        )
        k = kResult["optimal_k"]
        kEvaluation = kResult["evaluation"]
    elif k is None:
        k = 4  # default fallback

    # ── K-Means ──
    clusteringSelection = _selectStableClusteringForFixedK(
        X_scaled,
        k=k,
        minClusterSize=minClusterSize,
        consensusRuns=consensusRuns,
        nInit=kmeansNInit,
        enforceMinClusterSize=enforceMinClusterSize,
    )
    bestCandidate = clusteringSelection["best"]["candidate"]
    stable = clusteringSelection["best"]["stable"]
    clusterInputMatrix = bestCandidate["matrix"]
    rawLabels = stable["labels"]
    stableCenters = stable["centers"]
    minCount = int(stable["min_cluster_count"])
    if enforceMinClusterSize and minCount < minClusterSize:
        raise ValueError(
            "Hasil clustering tidak lolos quality gate: "
            f"cluster terkecil {minCount} < minClusterSize {minClusterSize}"
        )
    transformInfo.append(f"cluster_space:{bestCandidate['space']}")
    transformInfo.append(f"cluster_space_candidate:{bestCandidate['name']}")
    if bestCandidate.get("space") == "pca":
        transformInfo.append(
            f"cluster_space_pca_components:{bestCandidate.get('pca_components')}"
        )
        transformInfo.append(
            "cluster_space_pca_cumulative_variance:"
            f"{_safeFloat(bestCandidate.get('pca_cumulative_variance')):.4f}"
        )
    transformInfo.append(f"cluster_input_dim:{int(clusterInputMatrix.shape[1])}")
    transformInfo.append(f"actual_min_cluster_count:{minCount}")
    transformInfo.append(
        f"consensus_strength:{_safeFloat(stable['consensus_strength']):.4f}"
    )
    transformInfo.append(f"used_consensus:{str(bool(stable['used_consensus'])).lower()}")

    # Relabel clusters so 0 = highest investment, K-1 = lowest
    labels, oldToNew = _relabelClustersByInvestment(df, rawLabels)

    clusterAssignments = {
        _buildObservationKey(row, mode): int(labels[i]) for i, row in df.iterrows()
    }

    # Reorder cluster centers to match new labels
    reorderedCenters = [None] * k
    for oldId, newId in oldToNew.items():
        reorderedCenters[newId] = stableCenters[oldId].tolist()
    clusterCenters = reorderedCenters

    # ── Cluster Summary (original scale) ──
    clusterSummary = _buildClusterSummary(df, labels, dataMode=mode, k=k)

    # ── Metrics ──
    sil = _safeFloat(stable["silhouette_score"])
    inertia = _safeFloat(stable["inertia"])
    dbScore = _safeFloat(stable["davies_bouldin"])
    chScore = _safeFloat(stable["calinski_harabasz"])

    # ── Persist ──
    result = AnalysisResult(
        dataset_id=datasetId,
        k=k,
        pca_components=_sanitizeJsonValue(pcaComponents),
        pca_loadings=_sanitizeJsonValue(pcaLoadings),
        pca_explained_variance=_sanitizeJsonValue(pcaExplainedVariance),
        cluster_assignments=_sanitizeJsonValue(clusterAssignments),
        cluster_centers=_sanitizeJsonValue(clusterCenters),
        cluster_summary=_sanitizeJsonValue(clusterSummary),
        k_evaluation=_sanitizeJsonValue(kEvaluation),
        silhouette_score=sil,
        inertia=inertia,
        davies_bouldin=dbScore,
        calinski_harabasz=chScore,
        log_transformed=logTransform,
        transform_info=_sanitizeJsonValue(transformInfo),
    )
    result.ensurePublicIdentifiers()
    db.session.add(result)
    db.session.commit()

    return result


def getLatestResult() -> AnalysisResult | None:
    """Return most recent analysis result for the active dataset."""
    ds = Dataset.getActive()
    if ds is None:
        return None
    return (
        AnalysisResult.query
        .filter_by(dataset_id=ds.id)
        .order_by(AnalysisResult.created_at.desc())
        .first()
    )

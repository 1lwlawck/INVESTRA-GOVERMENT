"""
Analysis Service – PCA dimensionality reduction + K-Means clustering
using scikit-learn on the provinces dataset.
"""

from __future__ import annotations

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


# ─── Helpers ──────────────────────────────────────────────────────────


def _getActiveDataset() -> Dataset:
    """Return the active dataset or raise ValueError."""
    ds = Dataset.getActive()
    if ds is None:
        raise ValueError("Tidak ada dataset aktif")
    return ds


def _loadDataframe(datasetId: int | None = None) -> tuple[pd.DataFrame, int]:
    """Load provinces for a specific dataset (or active) into a DataFrame.
       Returns (DataFrame, datasetId)."""
    if datasetId is None:
        ds = _getActiveDataset()
        datasetId = ds.id
    provinces = (
        Province.query
        .filter_by(dataset_id=datasetId)
        .order_by(Province.provinsi)
        .all()
    )
    if not provinces:
        raise ValueError(f"Dataset {datasetId} tidak memiliki data provinsi")
    rows = [p.toDict() for p in provinces]
    return pd.DataFrame(rows), datasetId


def _prepareMatrix(
    df: pd.DataFrame,
    logTransform: bool = True,
) -> tuple[np.ndarray, StandardScaler, list[str]]:
    """Extract numeric columns, optionally log-transform skewed features,
    and return standardised matrix + scaler + column names used."""
    numericCols = Province.NUMERIC_COLUMNS
    X = df[numericCols].values.astype(float)

    transformInfo = []
    if logTransform:
        for col in SKEWED_COLUMNS:
            if col in numericCols:
                idx = numericCols.index(col)
                X[:, idx] = np.log1p(X[:, idx])
                transformInfo.append(col)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled, scaler, transformInfo


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
    n_init: int = 10,
) -> KMeans:
    """Fit K-Means with *k* clusters."""
    km = KMeans(n_clusters=k, random_state=random_state, n_init=n_init)
    km.fit(X_scaled)
    return km


def findOptimalK(
    X_scaled: np.ndarray,
    kMin: int = 2,
    kMax: int = 8,
    minClusterSize: int = 3,
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
        km = runKmeans(X_scaled, k=k)
        labels = km.labels_
        clusterCounts = np.bincount(labels, minlength=k)
        minCount = int(clusterCounts.min()) if len(clusterCounts) else 0
        isValid = minCount >= minClusterSize
        sil = float(silhouette_score(X_scaled, labels))
        dbIdx = float(davies_bouldin_score(X_scaled, labels))
        chIdx = float(calinski_harabasz_score(X_scaled, labels))

        results.append(
            {
                "k": k,
                "inertia": float(km.inertia_),
                "silhouette_score": sil,
                "davies_bouldin": dbIdx,
                "calinski_harabasz": chIdx,
                "min_cluster_count": minCount,
                "valid_min_cluster": bool(isValid),
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
    }


def evaluateKRange(
    X_scaled: np.ndarray,
    kMin: int = 2,
    kMax: int = 8,
) -> list[dict]:
    """Evaluate multiple K values and return metrics for each."""
    return findOptimalK(X_scaled, kMin, kMax)["evaluation"]


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
    k: int = 4,
) -> list[dict]:
    """Build per-cluster summary statistics with human-readable labels."""
    dfCopy = df.copy()
    dfCopy["cluster"] = labels
    summary = []

    for clusterId in sorted(dfCopy["cluster"].unique()):
        clusterDf = dfCopy[dfCopy["cluster"] == clusterId]
        provinces = clusterDf["provinsi"].tolist()
        stats = {}
        for col in Province.NUMERIC_COLUMNS:
            stats[col] = {
                "mean": float(clusterDf[col].mean()),
                "min": float(clusterDf[col].min()),
                "max": float(clusterDf[col].max()),
                "std": float(clusterDf[col].std()),
            }

        label = CLUSTER_LABELS.get(int(clusterId), f"Cluster {clusterId}")
        summary.append(
            {
                "cluster": int(clusterId),
                "label": label,
                "count": len(provinces),
                "provinces": provinces,
                "statistics": stats,
            }
        )

    return summary


# ─── Full Analysis Pipeline ──────────────────────────────────────────


def runFullAnalysis(
    k: int | None = None,
    logTransform: bool = True,
    autoK: bool = True,
    kMin: int = 2,
    kMax: int = 8,
    minClusterSize: int = 3,
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
    df, datasetId = _loadDataframe()
    X_scaled, _scaler, transformInfo = _prepareMatrix(df, logTransform=logTransform)

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
                    row["provinsi"]: float(X_pca[i, compIdx])
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
        )
        k = kResult["optimal_k"]
        kEvaluation = kResult["evaluation"]
    elif k is None:
        k = 4  # default fallback

    # ── K-Means ──
    km = runKmeans(X_scaled, k=k)
    rawLabels = km.labels_

    # Relabel clusters so 0 = highest investment, K-1 = lowest
    labels, oldToNew = _relabelClustersByInvestment(df, rawLabels)

    clusterAssignments = {
        row["provinsi"]: int(labels[i]) for i, row in df.iterrows()
    }

    # Reorder cluster centers to match new labels
    reorderedCenters = [None] * k
    for oldId, newId in oldToNew.items():
        reorderedCenters[newId] = km.cluster_centers_[oldId].tolist()
    clusterCenters = reorderedCenters

    # ── Cluster Summary (original scale) ──
    clusterSummary = _buildClusterSummary(df, labels, k=k)

    # ── Metrics ──
    sil = float(silhouette_score(X_scaled, labels))
    inertia = float(km.inertia_)
    dbScore = float(davies_bouldin_score(X_scaled, labels))
    chScore = float(calinski_harabasz_score(X_scaled, labels))

    # ── Persist ──
    result = AnalysisResult(
        dataset_id=datasetId,
        k=k,
        pca_components=pcaComponents,
        pca_loadings=pcaLoadings,
        pca_explained_variance=pcaExplainedVariance,
        cluster_assignments=clusterAssignments,
        cluster_centers=clusterCenters,
        cluster_summary=clusterSummary,
        k_evaluation=kEvaluation,
        silhouette_score=sil,
        inertia=inertia,
        davies_bouldin=dbScore,
        calinski_harabasz=chScore,
        log_transformed=logTransform,
        transform_info=transformInfo,
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

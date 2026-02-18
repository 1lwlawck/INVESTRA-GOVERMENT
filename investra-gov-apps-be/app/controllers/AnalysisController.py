"""
Analysis Controller – orchestrates PCA + K-Means pipeline.
"""

from flask import request, jsonify

from app.services.AnalysisService import (
    runFullAnalysis,
    getLatestResult,
    evaluateKRange,
    _loadDataframe,
    _prepareMatrix,
)
from app.services.PolicyService import generatePolicyRecommendations
from app.utils.ApiResponse import errorResponse
from app.utils.RequestParser import parseJsonObject


def _parseBool(value, default: bool) -> bool:
    if value is None:
        return default
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        v = value.strip().lower()
        if v in {"1", "true", "yes", "y", "on"}:
            return True
        if v in {"0", "false", "no", "n", "off"}:
            return False
    return default


def _parseInt(value, default: int) -> int:
    if value is None:
        return default
    if isinstance(value, bool):
        return default
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if raw == "":
            return default
        try:
            return int(raw)
        except ValueError:
            return default
    return default


class AnalysisController:

    @staticmethod
    def run():
        """POST /api/analysis/run"""
        body, parseError = parseJsonObject(request, required=False)
        if parseError:
            return parseError

        assert body is not None
        autoK = _parseBool(body.get("autoK", body.get("auto_k")), True)
        logTransform = _parseBool(body.get("logTransform", body.get("log_transform")), True)
        kRaw = body.get("k")
        kMin = _parseInt(body.get("kMin", body.get("k_min")), 2)
        kMax = _parseInt(body.get("kMax", body.get("k_max")), 8)
        minClusterSize = _parseInt(
            body.get("minClusterSize", body.get("min_cluster_size")),
            3,
        )

        if kRaw is not None and not isinstance(kRaw, int):
            return errorResponse("k harus integer antara 2 dan 10", "INVALID_K", 400)
        if kRaw is not None and (kRaw < 2 or kRaw > 10):
            return errorResponse("k harus integer antara 2 dan 10", "INVALID_K", 400)
        if kMin < 2:
            kMin = 2
        if kMax > 10:
            kMax = 10
        if kMin > kMax:
            return errorResponse("kMin harus <= kMax", "INVALID_K_RANGE", 400)
        if minClusterSize < 2:
            return errorResponse(
                "minClusterSize minimal 2",
                "INVALID_MIN_CLUSTER_SIZE",
                400,
            )

        # If autoK=true, let service choose optimal K; otherwise use provided k or default 4.
        k = None if autoK else (kRaw if kRaw is not None else 4)

        try:
            result = runFullAnalysis(
                k=k,
                logTransform=logTransform,
                autoK=autoK,
                kMin=kMin,
                kMax=kMax,
                minClusterSize=minClusterSize,
            )
        except ValueError as exc:
            message = str(exc)
            if "Tidak ada dataset aktif" in message:
                return errorResponse(message, "NO_ACTIVE_DATASET", 404)
            if "tidak memiliki data provinsi" in message:
                return errorResponse(message, "DATASET_EMPTY", 422)
            return errorResponse(message, "ANALYSIS_VALIDATION_FAILED", 400)

        return jsonify(result.toDict()), 201

    @staticmethod
    def getPca():
        """GET /api/analysis/pca"""
        result = getLatestResult()
        if result is None:
            return errorResponse(
                "Belum ada analisis yang dijalankan",
                "ANALYSIS_NOT_FOUND",
                404,
            )

        return jsonify(
            {
                "components": result.pca_components,
                "loadings": result.pca_loadings,
                "explained_variance": result.pca_explained_variance,
            }
        )

    @staticmethod
    def getClusters():
        """GET /api/analysis/clusters"""
        result = getLatestResult()
        if result is None:
            return errorResponse(
                "Belum ada analisis yang dijalankan",
                "ANALYSIS_NOT_FOUND",
                404,
            )

        return jsonify(
            {
                "k": result.k,
                "assignments": result.cluster_assignments,
                "centers": result.cluster_centers,
                "summary": result.cluster_summary,
                "k_evaluation": result.k_evaluation,
                "log_transformed": result.log_transformed,
                "transform_info": result.transform_info,
                "metrics": {
                    "silhouette_score": result.silhouette_score,
                    "inertia": result.inertia,
                    "davies_bouldin": result.davies_bouldin,
                    "calinski_harabasz": result.calinski_harabasz,
                },
            }
        )

    @staticmethod
    def evaluateK():
        """GET /api/analysis/evaluate-k"""
        kMin = request.args.get("kMin", request.args.get("k_min", 2, type=int), type=int)
        kMax = request.args.get("kMax", request.args.get("k_max", 8, type=int), type=int)

        if kMin < 2:
            kMin = 2
        if kMax > 10:
            kMax = 10
        if kMin > kMax:
            return errorResponse("k_min harus <= k_max", "INVALID_K_RANGE", 400)

        try:
            df, _dataset_id = _loadDataframe()
            X_scaled, _scaler, _info = _prepareMatrix(df)
            evaluations = evaluateKRange(X_scaled, kMin=kMin, kMax=kMax)
        except ValueError as exc:
            message = str(exc)
            if "Tidak ada dataset aktif" in message:
                return errorResponse(message, "NO_ACTIVE_DATASET", 404)
            if "tidak memiliki data provinsi" in message:
                return errorResponse(message, "DATASET_EMPTY", 422)
            return errorResponse(message, "ANALYSIS_VALIDATION_FAILED", 400)

        return jsonify({"evaluations": evaluations})

    @staticmethod
    def getPolicy():
        """GET /api/analysis/policy – data-driven policy recommendations."""
        try:
            result = generatePolicyRecommendations()
            return jsonify(result)
        except ValueError as exc:
            return errorResponse(str(exc), "POLICY_NOT_FOUND", 404)

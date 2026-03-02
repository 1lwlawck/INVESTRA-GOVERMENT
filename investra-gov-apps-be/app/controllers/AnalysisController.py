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
    DEFAULT_PANEL_YEAR_START,
    DEFAULT_PANEL_YEAR_END,
    DEFAULT_CONSENSUS_RUNS,
    DEFAULT_KMEANS_N_INIT,
)
from app.services.PolicyService import generatePolicyRecommendations
from app.utils.ApiResponse import errorResponse
from app.utils.RequestParser import parseJsonObject

VALID_DATA_MODES = {"panel"}
MIN_YEAR = 1900
MAX_YEAR = 2100


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


def _parseOptionalInt(value, fieldName: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError(f"{fieldName} harus integer")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if raw == "":
            return None
        try:
            return int(raw)
        except ValueError as exc:
            raise ValueError(f"{fieldName} harus integer") from exc
    raise ValueError(f"{fieldName} harus integer")


def _parseDataMode(value) -> str:
    if value is None:
        return "panel"
    if isinstance(value, str):
        mode = value.strip().lower()
        if mode in VALID_DATA_MODES:
            return mode
    raise ValueError("dataMode saat ini hanya mendukung 'panel'")


def _extractDataModeFromTransformInfo(transformInfo) -> str:
    if isinstance(transformInfo, list):
        for item in transformInfo:
            if isinstance(item, str) and item.startswith("data_mode:"):
                return item.split(":", 1)[1].strip() or "panel"
    return "panel"


def _extractYearRangeFromTransformInfo(transformInfo) -> dict | None:
    if not isinstance(transformInfo, list):
        return None
    for item in transformInfo:
        if not isinstance(item, str) or not item.startswith("year_range:"):
            continue
        raw = item.split(":", 1)[1].strip()
        if "-" not in raw:
            continue
        startRaw, endRaw = raw.split("-", 1)
        try:
            return {"start": int(startRaw), "end": int(endRaw)}
        except ValueError:
            continue
    return None


def _resolveYearRange(
    dataMode: str,
    yearStart: int | None,
    yearEnd: int | None,
) -> tuple[int | None, int | None]:
    resolvedStart = yearStart
    resolvedEnd = yearEnd
    if dataMode == "panel":
        if resolvedStart is None:
            resolvedStart = DEFAULT_PANEL_YEAR_START
        if resolvedEnd is None:
            resolvedEnd = DEFAULT_PANEL_YEAR_END
    if resolvedStart is not None and not (MIN_YEAR <= resolvedStart <= MAX_YEAR):
        raise ValueError("yearStart di luar rentang valid")
    if resolvedEnd is not None and not (MIN_YEAR <= resolvedEnd <= MAX_YEAR):
        raise ValueError("yearEnd di luar rentang valid")
    if (
        resolvedStart is not None
        and resolvedEnd is not None
        and resolvedStart > resolvedEnd
    ):
        raise ValueError("yearStart harus <= yearEnd")
    return resolvedStart, resolvedEnd


def _extractProvinceFromObservationKey(key: str) -> str:
    raw = str(key or "").strip()
    if raw.endswith(")") and " (" in raw:
        return raw.rsplit(" (", 1)[0].strip()
    return raw


def _buildPanelStability(assignments) -> dict | None:
    if not isinstance(assignments, dict) or not assignments:
        return None

    perProvince: dict[str, dict[int, int]] = {}
    for obsKey, clusterValue in assignments.items():
        province = _extractProvinceFromObservationKey(obsKey)
        if not province:
            continue
        try:
            clusterId = int(clusterValue)
        except (TypeError, ValueError):
            continue
        perProvince.setdefault(province, {})
        perProvince[province][clusterId] = perProvince[province].get(clusterId, 0) + 1

    if not perProvince:
        return None

    provinceDetails: list[dict] = []
    stableCount = 0
    strictStableCount = 0
    for province in sorted(perProvince):
        counts = perProvince[province]
        dominantCluster, dominantCount = max(counts.items(), key=lambda item: item[1])
        total = sum(counts.values())
        consistencyRatio = (dominantCount / total) if total > 0 else 0.0
        isStable = dominantCount * 3 >= total * 2  # >= 2/3
        isStrictStable = dominantCount == total
        if isStable:
            stableCount += 1
        if isStrictStable:
            strictStableCount += 1
        provinceDetails.append(
            {
                "province": province,
                "observation_count": total,
                "dominant_cluster": dominantCluster,
                "dominant_count": dominantCount,
                "consistency_ratio": consistencyRatio,
                "is_stable": isStable,
                "is_strict_stable": isStrictStable,
            }
        )

    provinceCount = len(provinceDetails)
    return {
        "province_count": provinceCount,
        "stable_province_count": stableCount,
        "stability_ratio": (stableCount / provinceCount) if provinceCount > 0 else 0.0,
        "threshold_ratio": 2 / 3,
        "strict_stable_province_count": strictStableCount,
        "strict_stability_ratio": (
            strictStableCount / provinceCount
            if provinceCount > 0
            else 0.0
        ),
        "strict_threshold_ratio": 1.0,
        "provinces": provinceDetails,
    }


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
        try:
            dataMode = _parseDataMode(body.get("dataMode", body.get("data_mode")))
        except ValueError as exc:
            return errorResponse(str(exc), "INVALID_DATA_MODE", 400)
        try:
            requestedYearStart = _parseOptionalInt(
                body.get("panelYearStart", body.get("panel_year_start")),
                "panelYearStart",
            )
            requestedYearEnd = _parseOptionalInt(
                body.get("panelYearEnd", body.get("panel_year_end")),
                "panelYearEnd",
            )
            panelYearStart, panelYearEnd = _resolveYearRange(
                dataMode,
                requestedYearStart,
                requestedYearEnd,
            )
        except ValueError as exc:
            return errorResponse(str(exc), "INVALID_YEAR_RANGE", 400)
        normaliseByYear = _parseBool(
            body.get(
                "normaliseByYear",
                body.get("normalizeByYear", body.get("normalise_by_year")),
            ),
            dataMode == "panel",
        )
        kMin = _parseInt(body.get("kMin", body.get("k_min")), 2)
        kMax = _parseInt(body.get("kMax", body.get("k_max")), 8)
        minClusterSize = _parseInt(
            body.get("minClusterSize", body.get("min_cluster_size")),
            3,
        )
        consensusRuns = _parseInt(
            body.get("consensusRuns", body.get("consensus_runs")),
            DEFAULT_CONSENSUS_RUNS,
        )
        kmeansNInit = _parseInt(
            body.get("kmeansNInit", body.get("kmeans_n_init")),
            DEFAULT_KMEANS_N_INIT,
        )
        enforceMinClusterSize = _parseBool(
            body.get(
                "enforceMinClusterSize",
                body.get("enforce_min_cluster_size"),
            ),
            True,
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
        if consensusRuns < 1 or consensusRuns > 100:
            return errorResponse(
                "consensusRuns harus integer antara 1 dan 100",
                "INVALID_CONSENSUS_RUNS",
                400,
            )
        if kmeansNInit < 1 or kmeansNInit > 1000:
            return errorResponse(
                "kmeansNInit harus integer antara 1 dan 1000",
                "INVALID_KMEANS_N_INIT",
                400,
            )

        # If autoK=true, let service choose optimal K; otherwise use provided k or default 4.
        k = None if autoK else (kRaw if kRaw is not None else 4)

        try:
            result = runFullAnalysis(
                k=k,
                logTransform=logTransform,
                dataMode=dataMode,
                panelYearStart=panelYearStart,
                panelYearEnd=panelYearEnd,
                normaliseByYear=normaliseByYear,
                autoK=autoK,
                kMin=kMin,
                kMax=kMax,
                minClusterSize=minClusterSize,
                consensusRuns=consensusRuns,
                kmeansNInit=kmeansNInit,
                enforceMinClusterSize=enforceMinClusterSize,
            )
        except ValueError as exc:
            message = str(exc)
            if "Tidak ada dataset aktif" in message:
                return errorResponse(message, "NO_ACTIVE_DATASET", 404)
            if "tidak memiliki data provinsi" in message:
                return errorResponse(message, "DATASET_EMPTY", 422)
            if "quality gate" in message:
                return errorResponse(message, "ANALYSIS_QUALITY_GATE_FAILED", 422)
            return errorResponse(message, "ANALYSIS_VALIDATION_FAILED", 400)

        payload = result.toDict()
        resolvedMode = _extractDataModeFromTransformInfo(result.transform_info)
        payload["data_mode"] = resolvedMode
        payload["year_range"] = _extractYearRangeFromTransformInfo(result.transform_info)
        if resolvedMode == "panel":
            payload["panel_stability"] = _buildPanelStability(result.cluster_assignments)
        return jsonify(payload), 201

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

        resolvedMode = _extractDataModeFromTransformInfo(result.transform_info)
        return jsonify(
            {
                "k": result.k,
                "assignments": result.cluster_assignments,
                "centers": result.cluster_centers,
                "summary": result.cluster_summary,
                "k_evaluation": result.k_evaluation,
                "log_transformed": result.log_transformed,
                "transform_info": result.transform_info,
                "data_mode": resolvedMode,
                "year_range": _extractYearRangeFromTransformInfo(result.transform_info),
                "panel_stability": (
                    _buildPanelStability(result.cluster_assignments)
                    if resolvedMode == "panel"
                    else None
                ),
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
        try:
            dataMode = _parseDataMode(
                request.args.get("dataMode", request.args.get("data_mode"))
            )
        except ValueError as exc:
            return errorResponse(str(exc), "INVALID_DATA_MODE", 400)
        try:
            requestedYearStart = _parseOptionalInt(
                request.args.get("panelYearStart", request.args.get("panel_year_start")),
                "panelYearStart",
            )
            requestedYearEnd = _parseOptionalInt(
                request.args.get("panelYearEnd", request.args.get("panel_year_end")),
                "panelYearEnd",
            )
            panelYearStart, panelYearEnd = _resolveYearRange(
                dataMode,
                requestedYearStart,
                requestedYearEnd,
            )
        except ValueError as exc:
            return errorResponse(str(exc), "INVALID_YEAR_RANGE", 400)
        logTransform = _parseBool(
            request.args.get("logTransform", request.args.get("log_transform")),
            True,
        )
        normaliseByYear = _parseBool(
            request.args.get(
                "normaliseByYear",
                request.args.get("normalizeByYear", request.args.get("normalise_by_year")),
            ),
            dataMode == "panel",
        )
        minClusterSize = _parseInt(
            request.args.get("minClusterSize", request.args.get("min_cluster_size")),
            3,
        )
        consensusRuns = _parseInt(
            request.args.get("consensusRuns", request.args.get("consensus_runs")),
            DEFAULT_CONSENSUS_RUNS,
        )
        kmeansNInit = _parseInt(
            request.args.get("kmeansNInit", request.args.get("kmeans_n_init")),
            DEFAULT_KMEANS_N_INIT,
        )
        if kMin > kMax:
            return errorResponse("k_min harus <= k_max", "INVALID_K_RANGE", 400)
        if minClusterSize < 2:
            return errorResponse(
                "minClusterSize minimal 2",
                "INVALID_MIN_CLUSTER_SIZE",
                400,
            )
        if consensusRuns < 1 or consensusRuns > 100:
            return errorResponse(
                "consensusRuns harus integer antara 1 dan 100",
                "INVALID_CONSENSUS_RUNS",
                400,
            )
        if kmeansNInit < 1 or kmeansNInit > 1000:
            return errorResponse(
                "kmeansNInit harus integer antara 1 dan 1000",
                "INVALID_KMEANS_N_INIT",
                400,
            )

        try:
            df, _dataset_id = _loadDataframe(
                dataMode=dataMode,
                yearStart=panelYearStart,
                yearEnd=panelYearEnd,
            )
            X_scaled, _scaler, _info = _prepareMatrix(
                df,
                logTransform=logTransform,
                normaliseByYear=normaliseByYear,
            )
            evaluations = evaluateKRange(
                X_scaled,
                kMin=kMin,
                kMax=kMax,
                minClusterSize=minClusterSize,
                consensusRuns=consensusRuns,
                nInit=kmeansNInit,
            )
        except ValueError as exc:
            message = str(exc)
            if "Tidak ada dataset aktif" in message:
                return errorResponse(message, "NO_ACTIVE_DATASET", 404)
            if "tidak memiliki data provinsi" in message:
                return errorResponse(message, "DATASET_EMPTY", 422)
            return errorResponse(message, "ANALYSIS_VALIDATION_FAILED", 400)

        return jsonify(
            {
                "evaluations": evaluations,
                "data_mode": dataMode,
                "year_range": (
                    {"start": panelYearStart, "end": panelYearEnd}
                    if panelYearStart is not None and panelYearEnd is not None
                    else None
                ),
                "normalise_by_year": normaliseByYear,
                "log_transform": logTransform,
                "min_cluster_size": minClusterSize,
                "consensus_runs": consensusRuns,
                "kmeans_n_init": kmeansNInit,
            }
        )

    @staticmethod
    def getPolicy():
        """GET /api/analysis/policy – data-driven policy recommendations."""
        try:
            result = generatePolicyRecommendations()
            return jsonify(result)
        except ValueError as exc:
            return errorResponse(str(exc), "POLICY_NOT_FOUND", 404)

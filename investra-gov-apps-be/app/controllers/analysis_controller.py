"""
Analysis Controller – orchestrates PCA + K-Means pipeline.
"""

from flask import jsonify, request

from app.services.analysis_service import (
    DEFAULT_CONSENSUS_RUNS,
    DEFAULT_KMEANS_N_INIT,
    DEFAULT_PANEL_YEAR_END,
    DEFAULT_PANEL_YEAR_START,
    _load_dataframe,
    _prepare_matrix,
    evaluate_k_range,
    get_latest_result,
    run_full_analysis,
)
from app.services.policy_service import generate_policy_recommendations
from app.utils.api_response import error_response
from app.utils.request_parser import parse_json_object

VALID_DATA_MODES = {"panel"}
MIN_YEAR = 1900
MAX_YEAR = 2100


def _parse_bool(value, default: bool) -> bool:
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


def _parse_int(value, default: int) -> int:
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


def _parse_optional_int(value, field_name: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool):
        raise ValueError(f"{field_name} harus integer")
    if isinstance(value, int):
        return value
    if isinstance(value, str):
        raw = value.strip()
        if raw == "":
            return None
        try:
            return int(raw)
        except ValueError as exc:
            raise ValueError(f"{field_name} harus integer") from exc
    raise ValueError(f"{field_name} harus integer")


def _parse_data_mode(value) -> str:
    if value is None:
        return "panel"
    if isinstance(value, str):
        mode = value.strip().lower()
        if mode in VALID_DATA_MODES:
            return mode
    raise ValueError("dataMode saat ini hanya mendukung 'panel'")


def _extract_data_mode_from_transform_info(transform_info) -> str:
    if isinstance(transform_info, list):
        for item in transform_info:
            if isinstance(item, str) and item.startswith("data_mode:"):
                return item.split(":", 1)[1].strip() or "panel"
    return "panel"


def _extract_year_range_from_transform_info(transform_info) -> dict | None:
    if not isinstance(transform_info, list):
        return None
    for item in transform_info:
        if not isinstance(item, str) or not item.startswith("year_range:"):
            continue
        raw = item.split(":", 1)[1].strip()
        if "-" not in raw:
            continue
        start_raw, end_raw = raw.split("-", 1)
        try:
            return {"start": int(start_raw), "end": int(end_raw)}
        except ValueError:
            continue
    return None


def _resolve_year_range(
    data_mode: str,
    year_start: int | None,
    year_end: int | None,
) -> tuple[int | None, int | None]:
    resolved_start = year_start
    resolved_end = year_end
    if data_mode == "panel":
        if resolved_start is None:
            resolved_start = DEFAULT_PANEL_YEAR_START
        if resolved_end is None:
            resolved_end = DEFAULT_PANEL_YEAR_END
    if resolved_start is not None and not (MIN_YEAR <= resolved_start <= MAX_YEAR):
        raise ValueError("yearStart di luar rentang valid")
    if resolved_end is not None and not (MIN_YEAR <= resolved_end <= MAX_YEAR):
        raise ValueError("yearEnd di luar rentang valid")
    if (
        resolved_start is not None
        and resolved_end is not None
        and resolved_start > resolved_end
    ):
        raise ValueError("yearStart harus <= yearEnd")
    return resolved_start, resolved_end


def _extract_province_from_observation_key(key: str) -> str:
    raw = str(key or "").strip()
    if raw.endswith(")") and " (" in raw:
        return raw.rsplit(" (", 1)[0].strip()
    return raw


def _build_panel_stability(assignments) -> dict | None:
    if not isinstance(assignments, dict) or not assignments:
        return None

    per_province: dict[str, dict[int, int]] = {}
    for obs_key, cluster_value in assignments.items():
        province = _extract_province_from_observation_key(obs_key)
        if not province:
            continue
        try:
            cluster_id = int(cluster_value)
        except (TypeError, ValueError):
            continue
        per_province.setdefault(province, {})
        per_province[province][cluster_id] = per_province[province].get(cluster_id, 0) + 1

    if not per_province:
        return None

    province_details: list[dict] = []
    stable_count = 0
    strict_stable_count = 0
    for province in sorted(per_province):
        counts = per_province[province]
        dominant_cluster, dominant_count = max(counts.items(), key=lambda item: item[1])
        total = sum(counts.values())
        consistency_ratio = (dominant_count / total) if total > 0 else 0.0
        is_stable = dominant_count * 3 >= total * 2  # >= 2/3
        is_strict_stable = dominant_count == total
        if is_stable:
            stable_count += 1
        if is_strict_stable:
            strict_stable_count += 1
        province_details.append(
            {
                "province": province,
                "observation_count": total,
                "dominant_cluster": dominant_cluster,
                "dominant_count": dominant_count,
                "consistency_ratio": consistency_ratio,
                "is_stable": is_stable,
                "is_strict_stable": is_strict_stable,
            }
        )

    province_count = len(province_details)
    return {
        "province_count": province_count,
        "stable_province_count": stable_count,
        "stability_ratio": (stable_count / province_count) if province_count > 0 else 0.0,
        "threshold_ratio": 2 / 3,
        "strict_stable_province_count": strict_stable_count,
        "strict_stability_ratio": (
            strict_stable_count / province_count
            if province_count > 0
            else 0.0
        ),
        "strict_threshold_ratio": 1.0,
        "provinces": province_details,
    }

def run():
    """POST /api/analysis/run"""
    body, parse_error = parse_json_object(request, required=False)
    if parse_error:
        return parse_error

    assert body is not None
    auto_k = _parse_bool(body.get("autoK", body.get("auto_k")), True)
    log_transform = _parse_bool(body.get("logTransform", body.get("log_transform")), True)
    k_raw = body.get("k")
    try:
        data_mode = _parse_data_mode(body.get("dataMode", body.get("data_mode")))
    except ValueError as exc:
        return error_response(str(exc), "INVALID_DATA_MODE", 400)
    try:
        requested_year_start = _parse_optional_int(
            body.get("panelYearStart", body.get("panel_year_start")),
            "panelYearStart",
        )
        requested_year_end = _parse_optional_int(
            body.get("panelYearEnd", body.get("panel_year_end")),
            "panelYearEnd",
        )
        panel_year_start, panel_year_end = _resolve_year_range(
            data_mode,
            requested_year_start,
            requested_year_end,
        )
    except ValueError as exc:
        return error_response(str(exc), "INVALID_YEAR_RANGE", 400)
    normalise_by_year = _parse_bool(
        body.get(
            "normaliseByYear",
            body.get("normalizeByYear", body.get("normalise_by_year")),
        ),
        data_mode == "panel",
    )
    k_min = _parse_int(body.get("kMin", body.get("k_min")), 2)
    k_max = _parse_int(body.get("kMax", body.get("k_max")), 8)
    min_cluster_size = _parse_int(
        body.get("minClusterSize", body.get("min_cluster_size")),
        3,
    )
    consensus_runs = _parse_int(
        body.get("consensusRuns", body.get("consensus_runs")),
        DEFAULT_CONSENSUS_RUNS,
    )
    kmeans_n_init = _parse_int(
        body.get("kmeansNInit", body.get("kmeans_n_init")),
        DEFAULT_KMEANS_N_INIT,
    )
    enforce_min_cluster_size = _parse_bool(
        body.get(
            "enforceMinClusterSize",
            body.get("enforce_min_cluster_size"),
        ),
        True,
    )

    if k_raw is not None and not isinstance(k_raw, int):
        return error_response("k harus integer antara 2 dan 10", "INVALID_K", 400)
    if k_raw is not None and (k_raw < 2 or k_raw > 10):
        return error_response("k harus integer antara 2 dan 10", "INVALID_K", 400)
    if k_min < 2:
        k_min = 2
    if k_max > 10:
        k_max = 10
    if k_min > k_max:
        return error_response("kMin harus <= kMax", "INVALID_K_RANGE", 400)
    if min_cluster_size < 2:
        return error_response(
            "minClusterSize minimal 2",
            "INVALID_MIN_CLUSTER_SIZE",
            400,
        )
    if consensus_runs < 1 or consensus_runs > 100:
        return error_response(
            "consensusRuns harus integer antara 1 dan 100",
            "INVALID_CONSENSUS_RUNS",
            400,
        )
    if kmeans_n_init < 1 or kmeans_n_init > 1000:
        return error_response(
            "kmeansNInit harus integer antara 1 dan 1000",
            "INVALID_KMEANS_N_INIT",
            400,
        )

    # If autoK=true, let service choose optimal K; otherwise use provided k or default 4.
    k = None if auto_k else (k_raw if k_raw is not None else 4)

    try:
        result = run_full_analysis(
            k=k,
            log_transform=log_transform,
            data_mode=data_mode,
            panel_year_start=panel_year_start,
            panel_year_end=panel_year_end,
            normalise_by_year=normalise_by_year,
            auto_k=auto_k,
            k_min=k_min,
            k_max=k_max,
            min_cluster_size=min_cluster_size,
            consensus_runs=consensus_runs,
            kmeans_n_init=kmeans_n_init,
            enforce_min_cluster_size=enforce_min_cluster_size,
        )
    except ValueError as exc:
        message = str(exc)
        if "Tidak ada dataset aktif" in message:
            return error_response(message, "NO_ACTIVE_DATASET", 404)
        if "tidak memiliki data provinsi" in message:
            return error_response(message, "DATASET_EMPTY", 422)
        if "quality gate" in message:
            return error_response(message, "ANALYSIS_QUALITY_GATE_FAILED", 422)
        return error_response(message, "ANALYSIS_VALIDATION_FAILED", 400)

    payload = result.to_dict()
    resolved_mode = _extract_data_mode_from_transform_info(result.transform_info)
    payload["data_mode"] = resolved_mode
    payload["year_range"] = _extract_year_range_from_transform_info(result.transform_info)
    if resolved_mode == "panel":
        payload["panel_stability"] = _build_panel_stability(result.cluster_assignments)
    return jsonify(payload), 201

def get_pca():
    """GET /api/analysis/pca"""
    result = get_latest_result()
    if result is None:
        return error_response(
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

def get_clusters():
    """GET /api/analysis/clusters"""
    result = get_latest_result()
    if result is None:
        return error_response(
            "Belum ada analisis yang dijalankan",
            "ANALYSIS_NOT_FOUND",
            404,
        )

    resolved_mode = _extract_data_mode_from_transform_info(result.transform_info)
    return jsonify(
        {
            "k": result.k,
            "assignments": result.cluster_assignments,
            "centers": result.cluster_centers,
            "summary": result.cluster_summary,
            "k_evaluation": result.k_evaluation,
            "log_transformed": result.log_transformed,
            "transform_info": result.transform_info,
            "data_mode": resolved_mode,
            "year_range": _extract_year_range_from_transform_info(result.transform_info),
            "panel_stability": (
                _build_panel_stability(result.cluster_assignments)
                if resolved_mode == "panel"
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

def evaluate_k():
    """GET /api/analysis/evaluate-k"""
    k_min = request.args.get("kMin", request.args.get("k_min", 2, type=int), type=int)
    k_max = request.args.get("kMax", request.args.get("k_max", 8, type=int), type=int)

    if k_min < 2:
        k_min = 2
    if k_max > 10:
        k_max = 10
    try:
        data_mode = _parse_data_mode(
            request.args.get("dataMode", request.args.get("data_mode"))
        )
    except ValueError as exc:
        return error_response(str(exc), "INVALID_DATA_MODE", 400)
    try:
        requested_year_start = _parse_optional_int(
            request.args.get("panelYearStart", request.args.get("panel_year_start")),
            "panelYearStart",
        )
        requested_year_end = _parse_optional_int(
            request.args.get("panelYearEnd", request.args.get("panel_year_end")),
            "panelYearEnd",
        )
        panel_year_start, panel_year_end = _resolve_year_range(
            data_mode,
            requested_year_start,
            requested_year_end,
        )
    except ValueError as exc:
        return error_response(str(exc), "INVALID_YEAR_RANGE", 400)
    log_transform = _parse_bool(
        request.args.get("logTransform", request.args.get("log_transform")),
        True,
    )
    normalise_by_year = _parse_bool(
        request.args.get(
            "normaliseByYear",
            request.args.get("normalizeByYear", request.args.get("normalise_by_year")),
        ),
        data_mode == "panel",
    )
    min_cluster_size = _parse_int(
        request.args.get("minClusterSize", request.args.get("min_cluster_size")),
        3,
    )
    consensus_runs = _parse_int(
        request.args.get("consensusRuns", request.args.get("consensus_runs")),
        DEFAULT_CONSENSUS_RUNS,
    )
    kmeans_n_init = _parse_int(
        request.args.get("kmeansNInit", request.args.get("kmeans_n_init")),
        DEFAULT_KMEANS_N_INIT,
    )
    if k_min > k_max:
        return error_response("k_min harus <= k_max", "INVALID_K_RANGE", 400)
    if min_cluster_size < 2:
        return error_response(
            "minClusterSize minimal 2",
            "INVALID_MIN_CLUSTER_SIZE",
            400,
        )
    if consensus_runs < 1 or consensus_runs > 100:
        return error_response(
            "consensusRuns harus integer antara 1 dan 100",
            "INVALID_CONSENSUS_RUNS",
            400,
        )
    if kmeans_n_init < 1 or kmeans_n_init > 1000:
        return error_response(
            "kmeansNInit harus integer antara 1 dan 1000",
            "INVALID_KMEANS_N_INIT",
            400,
        )

    try:
        df, _dataset_id = _load_dataframe(
            data_mode=data_mode,
            year_start=panel_year_start,
            year_end=panel_year_end,
        )
        X_scaled, _scaler, _info = _prepare_matrix(
            df,
            log_transform=log_transform,
            normalise_by_year=normalise_by_year,
        )
        evaluations = evaluate_k_range(
            X_scaled,
            k_min=k_min,
            k_max=k_max,
            min_cluster_size=min_cluster_size,
            consensus_runs=consensus_runs,
            n_init=kmeans_n_init,
        )
    except ValueError as exc:
        message = str(exc)
        if "Tidak ada dataset aktif" in message:
            return error_response(message, "NO_ACTIVE_DATASET", 404)
        if "tidak memiliki data provinsi" in message:
            return error_response(message, "DATASET_EMPTY", 422)
        return error_response(message, "ANALYSIS_VALIDATION_FAILED", 400)

    return jsonify(
        {
            "evaluations": evaluations,
            "data_mode": data_mode,
            "year_range": (
                {"start": panel_year_start, "end": panel_year_end}
                if panel_year_start is not None and panel_year_end is not None
                else None
            ),
            "normalise_by_year": normalise_by_year,
            "log_transform": log_transform,
            "min_cluster_size": min_cluster_size,
            "consensus_runs": consensus_runs,
            "kmeans_n_init": kmeans_n_init,
        }
    )

def get_policy():
    """GET /api/analysis/policy – data-driven policy recommendations."""
    try:
        result = generate_policy_recommendations()
        return jsonify(result)
    except ValueError as exc:
        return error_response(str(exc), "POLICY_NOT_FOUND", 404)

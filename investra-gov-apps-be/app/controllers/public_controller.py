"""Public read-only analysis controller."""

from __future__ import annotations

from flask import jsonify

from app.extensions import db
from app.models.dataset import Dataset
from app.models.province import Province
from app.services.analysis_service import get_latest_result
from app.services.policy_service import VARIABLE_LABELS, generate_policy_recommendations
from app.utils.api_response import error_response

CLUSTER_COLORS = {
    0: "#003c33",
    1: "#1863dc",
    2: "#ff7759",
    3: "#75758a",
}


def _extract_province_from_observation_key(key: str) -> str:
    raw = str(key or "").strip()
    if raw.endswith(")") and " (" in raw:
        return raw.rsplit(" (", 1)[0].strip()
    return raw


def _dominant_cluster_for_province(assignments: dict, province_name: str) -> dict | None:
    counts: dict[int, int] = {}
    for observation_key, cluster_value in (assignments or {}).items():
        province = _extract_province_from_observation_key(observation_key)
        if province.lower() != province_name.lower():
            continue
        try:
            cluster_id = int(cluster_value)
        except (TypeError, ValueError):
            continue
        counts[cluster_id] = counts.get(cluster_id, 0) + 1

    if not counts:
        return None

    dominant_cluster, dominant_count = max(counts.items(), key=lambda item: item[1])
    total = sum(counts.values())
    return {
        "cluster_id": dominant_cluster,
        "dominant_count": dominant_count,
        "observation_count": total,
        "consistency_ratio": dominant_count / total if total else 0,
        "cluster_counts": counts,
    }


def _year_range(dataset_id: str) -> dict:
    row = (
        db.session.query(db.func.min(Province.year), db.func.max(Province.year))
        .filter(Province.dataset_id == dataset_id)
        .first()
    )
    return {
        "start": int(row[0]) if row and row[0] else None,
        "end": int(row[1]) if row and row[1] else None,
    }


def _province_averages(dataset_id: str, province_name: str) -> dict | None:
    select_columns = [
        db.func.avg(getattr(Province, col)).label(col)
        for col in Province.NUMERIC_COLUMNS
    ]
    row = (
        db.session.query(
            *select_columns,
            db.func.count(Province.id).label("observation_count"),
        )
        .filter(Province.dataset_id == dataset_id)
        .filter(db.func.lower(Province.provinsi) == province_name.lower())
        .first()
    )
    if row is None or not row.observation_count:
        return None

    indicators = {}
    for col in Province.NUMERIC_COLUMNS:
        value = getattr(row, col)
        indicators[col] = {
            "label": VARIABLE_LABELS.get(col, col),
            "value": round(float(value), 2) if value is not None else 0,
        }
    return {
        "indicators": indicators,
        "observation_count": int(row.observation_count),
    }


def _cluster_summary_map(result) -> dict[int, dict]:
    return {
        int(item.get("cluster")): item
        for item in (result.cluster_summary or [])
        if item.get("cluster") is not None
    }


def _policy_map() -> dict[int, dict]:
    try:
        policies = generate_policy_recommendations().get("cluster_policies", [])
    except ValueError:
        return {}
    return {
        int(item.get("cluster_id")): item
        for item in policies
        if item.get("cluster_id") is not None
    }


def _result_or_error():
    dataset = Dataset.get_active()
    if dataset is None:
        return None, None, error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    result = get_latest_result()
    if result is None:
        return dataset, None, error_response(
            "Belum ada analisis publik yang tersedia",
            "ANALYSIS_NOT_FOUND",
            404,
        )
    return dataset, result, None
def summary():
    """GET /api/public/analysis/summary"""
    dataset, result, error = _result_or_error()
    if error:
        return error

    assert dataset is not None and result is not None
    policies_by_cluster = _policy_map()
    clusters = []
    for cluster_id, item in sorted(_cluster_summary_map(result).items()):
        policy = policies_by_cluster.get(cluster_id, {})
        clusters.append(
            {
                "cluster_id": cluster_id,
                "label": item.get("label", f"Klaster {cluster_id + 1}"),
                "color": CLUSTER_COLORS.get(cluster_id, "#6B7280"),
                "province_count": int(item.get("count", 0) or 0),
                "observation_count": int(item.get("observation_count", 0) or 0),
                "provinces": item.get("provinces", []),
                "policy_rationale": policy.get("policy_rationale"),
                "dominant_factor": policy.get("dominant_factor"),
            }
        )

    return jsonify(
        {
            "dataset": dataset.to_dict(include_uploader=False),
            "analysis": {
                "id": result.id,
                "code": result.code,
                "k": result.k,
                "created_at": result.created_at.isoformat(),
                "silhouette_score": result.silhouette_score,
                "davies_bouldin": result.davies_bouldin,
                "calinski_harabasz": result.calinski_harabasz,
            },
            "year_range": _year_range(dataset.id),
            "clusters": clusters,
            "variables": [
                {"key": key, "label": VARIABLE_LABELS.get(key, key)}
                for key in Province.NUMERIC_COLUMNS
            ],
            "limitations": [
                "Hasil menunjukkan pola berdasarkan data yang tersedia, bukan keputusan final pemerintah.",
                "PCA dan K-Means membantu mengelompokkan kemiripan data, bukan membuktikan sebab-akibat langsung.",
                "Rekomendasi tetap perlu divalidasi dengan kondisi lapangan dan kebijakan daerah.",
            ],
        }
    )

def provinces():
    """GET /api/public/provinces"""
    dataset = Dataset.get_active()
    if dataset is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    rows = (
        db.session.query(Province.provinsi)
        .filter(Province.dataset_id == dataset.id)
        .group_by(Province.provinsi)
        .order_by(Province.provinsi.asc())
        .all()
    )
    return jsonify(
        {
            "provinces": [
                {"id": name, "provinsi": name}
                for (name,) in rows
            ]
        }
    )

def province_analysis(province_name: str):
    """GET /api/public/provinces/<provinceName>/analysis"""
    dataset, result, error = _result_or_error()
    if error:
        return error

    assert dataset is not None and result is not None
    province = str(province_name or "").strip()
    if not province:
        return error_response("Nama provinsi wajib diisi", "PROVINCE_REQUIRED", 400)

    averages = _province_averages(dataset.id, province)
    if averages is None:
        return error_response("Provinsi tidak ditemukan", "PROVINCE_NOT_FOUND", 404)

    cluster_info = _dominant_cluster_for_province(result.cluster_assignments, province)
    if cluster_info is None:
        return error_response(
            "Hasil cluster untuk provinsi belum tersedia",
            "PROVINCE_ANALYSIS_NOT_FOUND",
            404,
        )

    cluster_id = int(cluster_info["cluster_id"])
    summary = _cluster_summary_map(result).get(cluster_id, {})
    policy = _policy_map().get(cluster_id, {})

    return jsonify(
        {
            "province": province,
            "dataset": dataset.to_dict(include_uploader=False),
            "year_range": _year_range(dataset.id),
            "cluster": {
                "id": cluster_id,
                "label": summary.get("label", f"Klaster {cluster_id + 1}"),
                "color": CLUSTER_COLORS.get(cluster_id, "#6B7280"),
                "dominant_count": cluster_info["dominant_count"],
                "observation_count": cluster_info["observation_count"],
                "consistency_ratio": round(cluster_info["consistency_ratio"], 4),
                "province_count": int(summary.get("count", 0) or 0),
                "dominant_factor": policy.get("dominant_factor"),
                "policy_rationale": policy.get("policy_rationale"),
                "policy_directions": policy.get("policy_directions", [])[:2],
            },
            "indicators": averages["indicators"],
            "analysis": {
                "id": result.id,
                "code": result.code,
                "created_at": result.created_at.isoformat(),
            },
            "plain_language_note": (
                "Kelompok ini menunjukkan kemiripan pola indikator provinsi "
                "dibanding provinsi lain pada dataset yang dianalisis."
            ),
        }
    )

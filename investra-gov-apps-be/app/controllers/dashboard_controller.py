"""
Dashboard Controller – aggregate statistics + province listing.
Scoped to the currently active dataset version.
"""

from flask import jsonify
from sqlalchemy import and_

from app.extensions import db
from app.models.dataset import Dataset
from app.models.province import Province
from app.utils.api_response import error_response


def summary():
    """GET /api/dashboard/summary"""
    ds = Dataset.get_active()
    if ds is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    per_province = (
        db.session.query(
            Province.provinsi.label("provinsi"),
            db.func.avg(Province.pmdn_rp).label("pmdn_rp"),
            db.func.avg(Province.fdi_rp).label("fdi_rp"),
            db.func.avg(Province.ipm).label("ipm"),
            db.func.avg(Province.kemiskinan).label("kemiskinan"),
            db.func.avg(Province.pdrb_per_kapita).label("pdrb_per_kapita"),
            db.func.avg(Province.tpt).label("tpt"),
            db.func.avg(Province.akses_listrik).label("akses_listrik"),
        )
        .filter(Province.dataset_id == ds.id)
        .group_by(Province.provinsi)
        .subquery()
    )

    agg = db.session.query(
        db.func.count(per_province.c.provinsi),
        db.func.sum(per_province.c.pmdn_rp),
        db.func.sum(per_province.c.fdi_rp),
        db.func.avg(per_province.c.ipm),
        db.func.avg(per_province.c.kemiskinan),
        db.func.avg(per_province.c.pdrb_per_kapita),
        db.func.avg(per_province.c.tpt),
        db.func.avg(per_province.c.akses_listrik),
    ).first()
    year_agg = db.session.query(
        db.func.min(Province.year),
        db.func.max(Province.year),
    ).filter(Province.dataset_id == ds.id).first()

    total_provinces = int(agg[0]) if agg and agg[0] else 0
    total_pmdn = float(agg[1]) if agg and agg[1] else 0
    total_fdi = float(agg[2]) if agg and agg[2] else 0
    total_investment = total_pmdn + total_fdi
    avg_ipm = float(agg[3]) if agg and agg[3] else 0
    avg_kemiskinan = float(agg[4]) if agg and agg[4] else 0
    avg_pdrb = float(agg[5]) if agg and agg[5] else 0
    avg_tpt = float(agg[6]) if agg and agg[6] else 0
    avg_akses_listrik = float(agg[7]) if agg and agg[7] else 0
    dataset_year_min = int(year_agg[0]) if year_agg and year_agg[0] else ds.year
    dataset_year_max = int(year_agg[1]) if year_agg and year_agg[1] else ds.year

    return jsonify(
        {
            "total_provinces": total_provinces,
            "total_investment": round(total_investment, 2),
            "average_ipm": round(avg_ipm, 2),
            "average_kemiskinan": round(avg_kemiskinan, 2),
            "average_pdrb_per_kapita": round(avg_pdrb, 2),
            "average_tpt": round(avg_tpt, 2),
            "average_akses_listrik": round(avg_akses_listrik, 2),
            "dataset_version": ds.version,
            "dataset_year": ds.year,
            "dataset_year_min": dataset_year_min,
            "dataset_year_max": dataset_year_max,
        }
    )

def provinces():
    """GET /api/provinces"""
    ds = Dataset.get_active()
    if ds is None:
        return error_response("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

    latest_year_subquery = (
        db.session.query(
            Province.provinsi.label("provinsi"),
            db.func.max(Province.year).label("latest_year"),
        )
        .filter(Province.dataset_id == ds.id)
        .group_by(Province.provinsi)
        .subquery()
    )

    all_provinces = (
        db.session.query(Province)
        .join(
            latest_year_subquery,
            and_(
                Province.provinsi == latest_year_subquery.c.provinsi,
                Province.year == latest_year_subquery.c.latest_year,
            ),
        )
        .filter(Province.dataset_id == ds.id)
        .order_by(Province.provinsi.asc())
        .all()
    )
    return jsonify(
        {
            "provinces": [
                {"id": p.id, "code": p.code, "provinsi": p.provinsi}
                for p in all_provinces
            ]
        }
    )

"""
Dashboard Controller – aggregate statistics + province listing.
Scoped to the currently active dataset version.
"""

from flask import jsonify
from sqlalchemy import and_

from app.Extensions import db
from app.models.Dataset import Dataset
from app.models.Province import Province
from app.utils.ApiResponse import errorResponse


class DashboardController:

    @staticmethod
    def summary():
        """GET /api/dashboard/summary"""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        perProvince = (
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
            db.func.count(perProvince.c.provinsi),
            db.func.sum(perProvince.c.pmdn_rp),
            db.func.sum(perProvince.c.fdi_rp),
            db.func.avg(perProvince.c.ipm),
            db.func.avg(perProvince.c.kemiskinan),
            db.func.avg(perProvince.c.pdrb_per_kapita),
            db.func.avg(perProvince.c.tpt),
            db.func.avg(perProvince.c.akses_listrik),
        ).first()
        yearAgg = db.session.query(
            db.func.min(Province.year),
            db.func.max(Province.year),
        ).filter(Province.dataset_id == ds.id).first()

        totalProvinces = int(agg[0]) if agg and agg[0] else 0
        totalPmdn = float(agg[1]) if agg and agg[1] else 0
        totalFdi = float(agg[2]) if agg and agg[2] else 0
        totalInvestment = totalPmdn + totalFdi
        avgIpm = float(agg[3]) if agg and agg[3] else 0
        avgKemiskinan = float(agg[4]) if agg and agg[4] else 0
        avgPdrb = float(agg[5]) if agg and agg[5] else 0
        avgTpt = float(agg[6]) if agg and agg[6] else 0
        avgAksesListrik = float(agg[7]) if agg and agg[7] else 0
        datasetYearMin = int(yearAgg[0]) if yearAgg and yearAgg[0] else ds.year
        datasetYearMax = int(yearAgg[1]) if yearAgg and yearAgg[1] else ds.year

        return jsonify(
            {
                "total_provinces": totalProvinces,
                "total_investment": round(totalInvestment, 2),
                "average_ipm": round(avgIpm, 2),
                "average_kemiskinan": round(avgKemiskinan, 2),
                "average_pdrb_per_kapita": round(avgPdrb, 2),
                "average_tpt": round(avgTpt, 2),
                "average_akses_listrik": round(avgAksesListrik, 2),
                "dataset_version": ds.version,
                "dataset_year": ds.year,
                "dataset_year_min": datasetYearMin,
                "dataset_year_max": datasetYearMax,
            }
        )

    @staticmethod
    def provinces():
        """GET /api/provinces"""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        latestYearSubquery = (
            db.session.query(
                Province.provinsi.label("provinsi"),
                db.func.max(Province.year).label("latest_year"),
            )
            .filter(Province.dataset_id == ds.id)
            .group_by(Province.provinsi)
            .subquery()
        )

        allProvinces = (
            db.session.query(Province)
            .join(
                latestYearSubquery,
                and_(
                    Province.provinsi == latestYearSubquery.c.provinsi,
                    Province.year == latestYearSubquery.c.latest_year,
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
                    for p in allProvinces
                ]
            }
        )

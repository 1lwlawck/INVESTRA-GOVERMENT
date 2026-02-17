"""
Dashboard Controller – aggregate statistics + province listing.
Scoped to the currently active dataset version.
"""

from flask import jsonify

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

        base = Province.query.filter_by(dataset_id=ds.id)
        totalProvinces = base.count()

        agg = db.session.query(
            db.func.sum(Province.pmdn_rp),
            db.func.sum(Province.fdi_rp),
            db.func.avg(Province.ipm),
            db.func.avg(Province.kemiskinan),
            db.func.avg(Province.pdrb_per_kapita),
            db.func.avg(Province.tpt),
            db.func.avg(Province.akses_listrik),
        ).filter(Province.dataset_id == ds.id).first()

        totalPmdn = float(agg[0]) if agg[0] else 0
        totalFdi = float(agg[1]) if agg[1] else 0
        totalInvestment = totalPmdn + totalFdi
        avgIpm = float(agg[2]) if agg[2] else 0
        avgKemiskinan = float(agg[3]) if agg[3] else 0
        avgPdrb = float(agg[4]) if agg[4] else 0
        avgTpt = float(agg[5]) if agg[5] else 0
        avgAksesListrik = float(agg[6]) if agg[6] else 0

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
            }
        )

    @staticmethod
    def provinces():
        """GET /api/provinces"""
        ds = Dataset.getActive()
        if ds is None:
            return errorResponse("Tidak ada dataset aktif", "NO_ACTIVE_DATASET", 404)

        allProvinces = (
            Province.query
            .filter_by(dataset_id=ds.id)
            .order_by(Province.provinsi)
            .all()
        )
        return jsonify(
            {
                "provinces": [
                    {"id": p.id, "provinsi": p.provinsi} for p in allProvinces
                ]
            }
        )

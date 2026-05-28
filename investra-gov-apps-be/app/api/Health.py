"""
Health-check route.
"""

import logging

from flask import Blueprint, jsonify

from app.extensions import db

logger = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    """Liveness + DB readiness probe."""
    try:
        db.session.execute(db.text("SELECT 1"))
        db_status = "ok"
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        db_status = "error"

    status_code = 200 if db_status == "ok" else 503
    return jsonify({"status": "ok", "database": db_status}), status_code

"""
Health-check route.
"""

import logging
from flask import Blueprint, jsonify
from app.Extensions import db

logger = logging.getLogger(__name__)
health_bp = Blueprint("health", __name__)


@health_bp.route("/health", methods=["GET"])
def health():
    """Liveness + DB readiness probe."""
    try:
        db.session.execute(db.text("SELECT 1"))
        dbStatus = "ok"
    except Exception as exc:
        logger.error("Database health check failed: %s", exc)
        dbStatus = "error"

    statusCode = 200 if dbStatus == "ok" else 503
    return jsonify({"status": "ok", "database": dbStatus}), statusCode

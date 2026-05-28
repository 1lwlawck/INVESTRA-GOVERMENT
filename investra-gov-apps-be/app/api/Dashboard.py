"""
Dashboard routes – delegates to DashboardController.
Protected: requires admin role.
"""

from flask import Blueprint

from app.controllers.dashboard_controller import provinces as _ctrl_provinces
from app.controllers.dashboard_controller import summary as _ctrl_summary
from app.middleware.auth import role_required, token_required

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/summary", methods=["GET"])
@token_required
@role_required("admin")
def summary():
    return _ctrl_summary()


@dashboard_bp.route("/provinces", methods=["GET"])
@token_required
@role_required("admin")
def provinces():
    return _ctrl_provinces()

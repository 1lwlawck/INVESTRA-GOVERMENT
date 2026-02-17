"""
Dashboard routes – delegates to DashboardController.
Protected: requires admin role.
"""

from flask import Blueprint
from app.controllers.DashboardController import DashboardController
from app.middleware.Auth import tokenRequired, roleRequired

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard/summary", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def summary():
    return DashboardController.summary()


@dashboard_bp.route("/provinces", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def provinces():
    return DashboardController.provinces()

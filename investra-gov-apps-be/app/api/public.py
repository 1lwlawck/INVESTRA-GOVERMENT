"""Public read-only routes."""

from flask import Blueprint

from app.controllers.public_controller import province_analysis as _ctrl_province_analysis
from app.controllers.public_controller import provinces as _ctrl_provinces
from app.controllers.public_controller import summary as _ctrl_summary

public_bp = Blueprint("public", __name__)


@public_bp.route("/public/analysis/summary", methods=["GET"])
def summary():
    return _ctrl_summary()


@public_bp.route("/public/provinces", methods=["GET"])
def provinces():
    return _ctrl_provinces()


@public_bp.route("/public/provinces/<path:province_name>/analysis", methods=["GET"])
def province_analysis(province_name):
    return _ctrl_province_analysis(province_name)

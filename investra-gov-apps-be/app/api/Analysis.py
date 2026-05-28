"""
Analysis routes – delegates to AnalysisController.
Protected: requires admin role.
"""

from flask import Blueprint

from app.controllers.analysis_controller import evaluate_k as _ctrl_evaluate_k
from app.controllers.analysis_controller import get_clusters as _ctrl_get_clusters
from app.controllers.analysis_controller import get_pca as _ctrl_get_pca
from app.controllers.analysis_controller import get_policy as _ctrl_get_policy
from app.controllers.analysis_controller import run as _ctrl_run
from app.middleware.auth import role_required, token_required

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/analysis/run", methods=["POST"])
@token_required
@role_required("admin")
def run_analysis():
    return _ctrl_run()


@analysis_bp.route("/analysis/pca", methods=["GET"])
@token_required
@role_required("admin")
def get_pca():
    return _ctrl_get_pca()


@analysis_bp.route("/analysis/clusters", methods=["GET"])
@token_required
@role_required("admin")
def get_clusters():
    return _ctrl_get_clusters()


@analysis_bp.route("/analysis/evaluate-k", methods=["GET"])
@token_required
@role_required("admin")
def evaluate_k():
    return _ctrl_evaluate_k()


@analysis_bp.route("/analysis/policy", methods=["GET"])
@token_required
@role_required("admin")
def get_policy():
    return _ctrl_get_policy()

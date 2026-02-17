"""
Analysis routes – delegates to AnalysisController.
Protected: requires admin role.
"""

from flask import Blueprint
from app.controllers.AnalysisController import AnalysisController
from app.middleware.Auth import tokenRequired, roleRequired

analysis_bp = Blueprint("analysis", __name__)


@analysis_bp.route("/analysis/run", methods=["POST"])
@tokenRequired
@roleRequired("admin")
def runAnalysis():
    return AnalysisController.run()


@analysis_bp.route("/analysis/pca", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def getPca():
    return AnalysisController.getPca()


@analysis_bp.route("/analysis/clusters", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def getClusters():
    return AnalysisController.getClusters()


@analysis_bp.route("/analysis/evaluate-k", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def evaluateK():
    return AnalysisController.evaluateK()


@analysis_bp.route("/analysis/policy", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def getPolicy():
    return AnalysisController.getPolicy()

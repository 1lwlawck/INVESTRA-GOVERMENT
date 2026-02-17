"""
Dataset routes – delegates to DatasetController.
Includes version management endpoints.
"""

from flask import Blueprint
from app.controllers.DatasetController import DatasetController
from app.middleware.Auth import tokenRequired, roleRequired

dataset_bp = Blueprint("dataset", __name__)

# ── Active dataset (authenticated users) ──────────────────
@dataset_bp.route("/dataset/default", methods=["GET"])
@tokenRequired
def getDefaultInfo():
    return DatasetController.getInfo()


@dataset_bp.route("/dataset/default/data", methods=["GET"])
@tokenRequired
def getDefaultData():
    return DatasetController.getData()


@dataset_bp.route("/dataset/default/sample", methods=["GET"])
@tokenRequired
def getDefaultSample():
    return DatasetController.getSample()


# ── Version history (admin+) ─────────────────────────────────

@dataset_bp.route("/dataset/versions", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def listVersions():
    """List all dataset versions."""
    return DatasetController.listVersions()


@dataset_bp.route("/dataset/versions/<int:versionId>", methods=["GET"])
@tokenRequired
@roleRequired("admin")
def getVersion(versionId):
    """Get a specific dataset version with its data."""
    return DatasetController.getVersion(versionId)


@dataset_bp.route("/dataset/versions/<int:versionId>/activate", methods=["PUT"])
@tokenRequired
@roleRequired("superadmin")
def activateVersion(versionId):
    """Activate a specific dataset version – superadmin only."""
    return DatasetController.activateVersion(versionId)


# ── Upload (superadmin only) ─────────────────────────────────

@dataset_bp.route("/dataset/upload", methods=["POST"])
@tokenRequired
@roleRequired("superadmin")
def uploadCsv():
    """Upload CSV dataset – superadmin only. Creates a new version."""
    return DatasetController.uploadCsv()

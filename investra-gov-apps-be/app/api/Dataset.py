"""
Dataset routes – delegates to DatasetController.
Includes version management endpoints.
"""

from flask import Blueprint

from app.controllers.dataset_controller import activate_version as _ctrl_activate_version
from app.controllers.dataset_controller import get_data as _ctrl_get_data
from app.controllers.dataset_controller import get_info as _ctrl_get_info
from app.controllers.dataset_controller import get_sample as _ctrl_get_sample
from app.controllers.dataset_controller import get_version as _ctrl_get_version
from app.controllers.dataset_controller import list_versions as _ctrl_list_versions
from app.controllers.dataset_controller import upload_csv as _ctrl_upload_csv
from app.middleware.auth import role_required, token_required

dataset_bp = Blueprint("dataset", __name__)

# ── Active dataset (authenticated users) ──────────────────
@dataset_bp.route("/dataset/default", methods=["GET"])
@token_required
def get_default_info():
    return _ctrl_get_info()


@dataset_bp.route("/dataset/default/data", methods=["GET"])
@token_required
def get_default_data():
    return _ctrl_get_data()


@dataset_bp.route("/dataset/default/sample", methods=["GET"])
@token_required
def get_default_sample():
    return _ctrl_get_sample()


# ── Version history (admin+) ─────────────────────────────────

@dataset_bp.route("/dataset/versions", methods=["GET"])
@token_required
@role_required("admin")
def list_versions():
    """List all dataset versions."""
    return _ctrl_list_versions()


@dataset_bp.route("/dataset/versions/<string:versionId>", methods=["GET"])
@token_required
@role_required("admin")
def get_version(version_id):
    """Get a specific dataset version with its data."""
    return _ctrl_get_version(version_id)


@dataset_bp.route("/dataset/versions/<string:versionId>/activate", methods=["PUT"])
@token_required
@role_required("superadmin")
def activate_version(version_id):
    """Activate a specific dataset version – superadmin only."""
    return _ctrl_activate_version(version_id)


# ── Upload (superadmin only) ─────────────────────────────────

@dataset_bp.route("/dataset/upload", methods=["POST"])
@token_required
@role_required("superadmin")
def upload_csv():
    """Upload CSV dataset – superadmin only. Creates a new version."""
    return _ctrl_upload_csv()

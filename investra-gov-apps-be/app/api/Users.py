"""
User management routes – CRUD (superadmin only).
"""

from flask import Blueprint

from app.controllers.user_controller import create_user as _ctrl_create_user
from app.controllers.user_controller import delete_user as _ctrl_delete_user
from app.controllers.user_controller import get_user as _ctrl_get_user
from app.controllers.user_controller import list_users as _ctrl_list_users
from app.controllers.user_controller import update_user as _ctrl_update_user
from app.middleware.auth import role_required, token_required

users_bp = Blueprint("users", __name__)


@users_bp.route("/users", methods=["GET"])
@token_required
@role_required("superadmin")
def list_users():
    return _ctrl_list_users()


@users_bp.route("/users/<string:userId>", methods=["GET"])
@token_required
@role_required("superadmin")
def get_user(user_id):
    return _ctrl_get_user(user_id)


@users_bp.route("/users", methods=["POST"])
@token_required
@role_required("superadmin")
def create_user():
    return _ctrl_create_user()


@users_bp.route("/users/<string:userId>", methods=["PUT"])
@token_required
@role_required("superadmin")
def update_user(user_id):
    return _ctrl_update_user(user_id)


@users_bp.route("/users/<string:userId>", methods=["DELETE"])
@token_required
@role_required("superadmin")
def delete_user(user_id):
    return _ctrl_delete_user(user_id)

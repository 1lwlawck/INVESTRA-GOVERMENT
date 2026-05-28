"""
Auth routes – login and current-user retrieval.
"""

from flask import Blueprint

from app.controllers.auth_controller import login as _ctrl_login
from app.controllers.auth_controller import me as _ctrl_me
from app.controllers.auth_controller import refresh as _ctrl_refresh
from app.extensions import limiter
from app.middleware.auth import token_required

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    return _ctrl_login()


@auth_bp.route("/auth/me", methods=["GET"])
@token_required
def me():
    return _ctrl_me()


@auth_bp.route("/auth/refresh", methods=["POST"])
@token_required
@limiter.limit("30 per minute")
def refresh():
    return _ctrl_refresh()

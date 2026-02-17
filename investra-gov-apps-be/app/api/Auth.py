"""
Auth routes – login and current-user retrieval.
"""

from flask import Blueprint
from app.controllers.AuthController import AuthController
from app.middleware.Auth import tokenRequired
from app.Extensions import limiter

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/auth/login", methods=["POST"])
@limiter.limit("10 per minute")
def login():
    return AuthController.login()


@auth_bp.route("/auth/me", methods=["GET"])
@tokenRequired
def me():
    return AuthController.me()


@auth_bp.route("/auth/refresh", methods=["POST"])
@tokenRequired
@limiter.limit("30 per minute")
def refresh():
    return AuthController.refresh()

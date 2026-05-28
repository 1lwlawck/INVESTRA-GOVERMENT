"""
Auth Controller – handles login, token refresh, and current-user retrieval.
"""

import logging
import re

from flask import g, jsonify, request

from app.extensions import db
from app.middleware.auth import generate_token
from app.models.user import User
from app.utils.api_response import error_response
from app.utils.request_parser import parse_json_object

logger = logging.getLogger(__name__)

# Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


def validate_password_strength(password: str) -> str | None:
    """Return an error message if password is weak, else None."""
    if not PASSWORD_REGEX.match(password):
        return (
            "Password minimal 8 karakter, "
            "mengandung huruf besar, huruf kecil, dan angka."
        )
    return None


class AuthController:
    """Stateless controller – all methods are static / classmethod."""

def login():
    """POST /api/auth/login"""
    data, parse_error = parse_json_object(request, required=True)
    if parse_error:
        return parse_error

    assert data is not None
    username_raw = data.get("username", "")
    password_raw = data.get("password", "")
    username = username_raw.strip() if isinstance(username_raw, str) else ""
    password = password_raw if isinstance(password_raw, str) else ""

    if not username or not password:
        return error_response(
            "Username dan password wajib diisi",
            "AUTH_REQUIRED_FIELDS",
            400,
        )

    user = User.query.filter_by(username=username).first()

    if user is None or not user.check_password(password):
        return error_response(
            "Username atau password salah",
            "INVALID_CREDENTIALS",
            401,
        )

    if not user.is_active:
        return error_response("Akun dinonaktifkan", "ACCOUNT_DISABLED", 403)

    if not user.id or not user.code:
        user.ensure_public_identifiers()
        db.session.commit()

    token = generate_token(user)

    return jsonify(
        {
            "message": "Login berhasil",
            "user": user.to_dict(),
            "token": token,
        }
    )

def me():
    """GET /api/auth/me  (requires @token_required)"""
    user: User = g.current_user
    return jsonify({"user": user.to_dict()})

def refresh():
    """POST /api/auth/refresh  (requires @token_required)"""
    user: User = g.current_user
    token = generate_token(user)
    return jsonify(
        {
            "message": "Token berhasil diperbarui",
            "user": user.to_dict(),
            "token": token,
        }
    )

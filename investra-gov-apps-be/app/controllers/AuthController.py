"""
Auth Controller – handles login, token refresh, and current-user retrieval.
"""

import re
import logging

from flask import request, jsonify, g

from app.Extensions import db
from app.models.User import User
from app.middleware.Auth import generateToken
from app.utils.ApiResponse import errorResponse
from app.utils.RequestParser import parseJsonObject

logger = logging.getLogger(__name__)

# Minimum 8 chars, at least 1 uppercase, 1 lowercase, 1 digit
PASSWORD_REGEX = re.compile(r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$")


def validatePasswordStrength(password: str) -> str | None:
    """Return an error message if password is weak, else None."""
    if not PASSWORD_REGEX.match(password):
        return (
            "Password minimal 8 karakter, "
            "mengandung huruf besar, huruf kecil, dan angka."
        )
    return None


class AuthController:
    """Stateless controller – all methods are static / classmethod."""

    @staticmethod
    def login():
        """POST /api/auth/login"""
        data, parseError = parseJsonObject(request, required=True)
        if parseError:
            return parseError

        assert data is not None
        usernameRaw = data.get("username", "")
        passwordRaw = data.get("password", "")
        username = usernameRaw.strip() if isinstance(usernameRaw, str) else ""
        password = passwordRaw if isinstance(passwordRaw, str) else ""

        if not username or not password:
            return errorResponse(
                "Username dan password wajib diisi",
                "AUTH_REQUIRED_FIELDS",
                400,
            )

        user = User.query.filter_by(username=username).first()

        if user is None or not user.checkPassword(password):
            return errorResponse(
                "Username atau password salah",
                "INVALID_CREDENTIALS",
                401,
            )

        if not user.is_active:
            return errorResponse("Akun dinonaktifkan", "ACCOUNT_DISABLED", 403)

        if not user.uuid or not user.code:
            user.ensurePublicIdentifiers()
            db.session.commit()

        token = generateToken(user)

        return jsonify(
            {
                "message": "Login berhasil",
                "user": user.toDict(),
                "token": token,
            }
        )

    @staticmethod
    def me():
        """GET /api/auth/me  (requires @token_required)"""
        user: User = g.current_user
        return jsonify({"user": user.toDict()})

    @staticmethod
    def refresh():
        """POST /api/auth/refresh  (requires @token_required)"""
        user: User = g.current_user
        token = generateToken(user)
        return jsonify(
            {
                "message": "Token berhasil diperbarui",
                "user": user.toDict(),
                "token": token,
            }
        )

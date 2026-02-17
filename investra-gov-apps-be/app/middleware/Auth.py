"""
Authentication & Authorisation middleware.

Provides two decorators:
  @tokenRequired   – verifies JWT, injects `g.current_user`
  @roleRequired(minRole)  – checks user's role against hierarchy
"""

from functools import wraps

import jwt
from flask import request, g, current_app

from app.models.User import User
from app.Extensions import db
from app.utils.ApiResponse import errorResponse


# ─── JWT helpers ──────────────────────────────────────────────────────

def _decodeToken(token: str) -> dict:
    """Decode and validate a JWT token."""
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def _extractUserId(payload: dict) -> int | None:
    """Return integer user id from JWT payload `sub`, or None if invalid."""
    sub = payload.get("sub")
    try:
        return int(sub)
    except (TypeError, ValueError):
        return None


def generateToken(user: User) -> str:
    """Create a signed JWT containing user id/role."""
    from datetime import datetime, timedelta, timezone

    hours = current_app.config.get("JWT_EXPIRES_HOURS", 12)
    try:
        hours = int(hours)
    except (TypeError, ValueError):
        hours = 12
    hours = min(max(hours, 1), 168)

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(hours=hours),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


# ─── Decorators ───────────────────────────────────────────────────────

def tokenRequired(f):
    """
    Decorator that enforces authentication.
    Extracts 'Authorization: Bearer <token>' header, validates the JWT,
    and sets `g.current_user` for downstream handlers.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        authHeader = request.headers.get("Authorization", "")

        if not authHeader.startswith("Bearer "):
            return errorResponse("Token tidak ditemukan", "NO_TOKEN", 401)

        token = authHeader.split(" ", 1)[1]

        try:
            payload = _decodeToken(token)
        except jwt.ExpiredSignatureError:
            return errorResponse("Token sudah kedaluwarsa", "TOKEN_EXPIRED", 401)
        except jwt.InvalidTokenError:
            return errorResponse("Token tidak valid", "INVALID_TOKEN", 401)

        userId = _extractUserId(payload)
        if userId is None:
            return errorResponse("Token tidak valid", "INVALID_TOKEN", 401)

        user = db.session.get(User, userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 401)
        if not user.is_active:
            return errorResponse("Akun dinonaktifkan", "ACCOUNT_DISABLED", 403)

        g.current_user = user
        return f(*args, **kwargs)

    return decorated


def roleRequired(minRole: str):
    """
    Decorator factory that enforces a minimum role.
    Must be placed **after** @tokenRequired so that `g.current_user` exists.

    Usage:
        @bp.route("/admin-only")
        @tokenRequired
        @roleRequired("admin")
        def admin_view():
            ...
    """

    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user: User = g.current_user
            if not user.hasRole(minRole):
                return errorResponse(
                    f"Akses ditolak. Minimal role: {minRole}",
                    "FORBIDDEN",
                    403,
                )
            return f(*args, **kwargs)

        return decorated

    return decorator


def optionalToken(f):
    """
    Like @tokenRequired but does NOT reject unauthenticated requests.
    Sets `g.current_user = None` if no valid token is present.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        authHeader = request.headers.get("Authorization", "")

        if authHeader.startswith("Bearer "):
            token = authHeader.split(" ", 1)[1]
            try:
                payload = _decodeToken(token)
                userId = _extractUserId(payload)
                user = db.session.get(User, userId) if userId is not None else None
                if user and user.is_active:
                    g.current_user = user
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass  # silently ignore bad tokens

        return f(*args, **kwargs)

    return decorated

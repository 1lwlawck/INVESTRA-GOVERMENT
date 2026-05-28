"""
Authentication & Authorisation middleware.

Provides two decorators:
  @tokenRequired   – verifies JWT, injects `g.current_user`
  @roleRequired(minRole)  – checks user's role against hierarchy
"""

from datetime import UTC
from functools import wraps

import jwt
from flask import current_app, g, request

from app.models.user import User
from app.utils.api_response import error_response
from app.utils.public_identifier import is_valid_uuid

# ─── JWT helpers ──────────────────────────────────────────────────────

def _decode_token(token: str) -> dict:
    """Decode and validate a JWT token."""
    return jwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])


def _extract_user_id(payload: dict) -> str | None:
    """Return UUID user id from JWT payload `sub`."""
    sub = payload.get("sub")
    if isinstance(sub, str) and is_valid_uuid(sub):
        return sub
    return None


def generate_token(user: User) -> str:
    """Create a signed JWT containing user id/role."""
    from datetime import datetime, timedelta

    hours = current_app.config.get("JWT_EXPIRES_HOURS", 12)
    try:
        hours = int(hours)
    except (TypeError, ValueError):
        hours = 12
    hours = min(max(hours, 1), 168)

    payload = {
        "sub": str(user.id),
        "role": user.role,
        "iat": datetime.now(UTC),
        "exp": datetime.now(UTC) + timedelta(hours=hours),
    }
    return jwt.encode(payload, current_app.config["SECRET_KEY"], algorithm="HS256")


# ─── Decorators ───────────────────────────────────────────────────────

def token_required(f):
    """
    Decorator that enforces authentication.
    Extracts 'Authorization: Bearer <token>' header, validates the JWT,
    and sets `g.current_user` for downstream handlers.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            return error_response("Token tidak ditemukan", "NO_TOKEN", 401)

        token = auth_header.split(" ", 1)[1]

        try:
            payload = _decode_token(token)
        except jwt.ExpiredSignatureError:
            return error_response("Token sudah kedaluwarsa", "TOKEN_EXPIRED", 401)
        except jwt.InvalidTokenError:
            return error_response("Token tidak valid", "INVALID_TOKEN", 401)

        user_id = _extract_user_id(payload)
        if user_id is None:
            return error_response("Token tidak valid", "INVALID_TOKEN", 401)

        user = User.query.filter_by(id=user_id).first()
        if user is None:
            return error_response("User tidak ditemukan", "USER_NOT_FOUND", 401)
        if not user.is_active:
            return error_response("Akun dinonaktifkan", "ACCOUNT_DISABLED", 403)

        g.current_user = user
        return f(*args, **kwargs)

    return decorated


def role_required(min_role: str):
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
            if not user.has_role(min_role):
                return error_response(
                    f"Akses ditolak. Minimal role: {min_role}",
                    "FORBIDDEN",
                    403,
                )
            return f(*args, **kwargs)

        return decorated

    return decorator


def optional_token(f):
    """
    Like @tokenRequired but does NOT reject unauthenticated requests.
    Sets `g.current_user = None` if no valid token is present.
    """

    @wraps(f)
    def decorated(*args, **kwargs):
        g.current_user = None
        auth_header = request.headers.get("Authorization", "")

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            try:
                payload = _decode_token(token)
                user_id = _extract_user_id(payload)
                user = User.query.filter_by(id=user_id).first() if user_id else None
                if user and user.is_active:
                    g.current_user = user
            except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
                pass  # silently ignore bad tokens

        return f(*args, **kwargs)

    return decorated

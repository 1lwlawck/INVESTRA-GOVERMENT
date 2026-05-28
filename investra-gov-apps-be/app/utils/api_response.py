"""Shared API response helpers."""

from typing import Any

from flask import g, jsonify


def error_response(
    error: str,
    code: str,
    status: int,
    *,
    details: Any = None,
    **extra: Any,
):
    """Build a consistent error response body with HTTP status."""
    payload: dict[str, Any] = {"error": error, "code": code}
    try:
        request_id = getattr(g, "request_id", None)
        if request_id:
            payload["request_id"] = request_id
    except RuntimeError:
        # Outside request context
        pass

    if details is not None:
        payload["details"] = details
    payload.update(extra)
    return jsonify(payload), status

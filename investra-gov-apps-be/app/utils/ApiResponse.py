"""Shared API response helpers."""

from typing import Any

from flask import jsonify, g


def errorResponse(
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
        requestId = getattr(g, "request_id", None)
        if requestId:
            payload["request_id"] = requestId
    except RuntimeError:
        # Outside request context
        pass

    if details is not None:
        payload["details"] = details
    payload.update(extra)
    return jsonify(payload), status

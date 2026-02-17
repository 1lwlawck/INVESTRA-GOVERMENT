"""Shared API response helpers."""

from typing import Any

from flask import jsonify


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
    if details is not None:
        payload["details"] = details
    payload.update(extra)
    return jsonify(payload), status

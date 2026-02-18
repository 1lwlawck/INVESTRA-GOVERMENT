"""Helpers for robust request body parsing."""

from __future__ import annotations

from typing import Any

from flask import Request
from werkzeug.exceptions import BadRequest

from app.utils.ApiResponse import errorResponse


def parseJsonObject(
    request: Request,
    *,
    required: bool,
) -> tuple[dict[str, Any] | None, tuple[Any, int] | None]:
    """
    Parse request JSON into an object/dict with consistent error responses.

    Returns:
      (data, None) on success
      (None, flask_response_tuple) on validation failure
    """
    contentLength = request.content_length or 0

    if contentLength == 0:
        if required:
            return None, errorResponse("Body JSON wajib diisi", "EMPTY_JSON_BODY", 400)
        return {}, None

    if not request.is_json:
        return None, errorResponse(
            "Content-Type harus application/json",
            "INVALID_CONTENT_TYPE",
            415,
        )

    try:
        parsed = request.get_json(silent=False)
    except BadRequest:
        return None, errorResponse("Body JSON tidak valid", "INVALID_JSON_BODY", 400)

    if parsed is None:
        if required:
            return None, errorResponse("Body JSON wajib diisi", "EMPTY_JSON_BODY", 400)
        return {}, None

    if not isinstance(parsed, dict):
        return None, errorResponse("Body JSON harus object", "INVALID_JSON_OBJECT", 400)

    return parsed, None


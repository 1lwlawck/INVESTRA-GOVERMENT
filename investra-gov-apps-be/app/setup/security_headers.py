"""Security headers + JSON camelize after_request."""

from __future__ import annotations

import json
import time

from flask import Flask, g, request

from app.utils.case_converter import camelize


def register_response_hooks(app: Flask) -> None:
    @app.after_request
    def harden_and_camelize_json_response(response):
        if response.content_type and "application/json" in response.content_type:
            data = response.get_json(silent=True)
            if data is not None:
                response.set_data(json.dumps(camelize(data), ensure_ascii=False))

        request_id = getattr(g, "request_id", None)
        if request_id:
            response.headers.setdefault("X-Request-ID", request_id)

        started_at = getattr(g, "request_started_at", None)
        if started_at is not None:
            duration_ms = (time.perf_counter() - started_at) * 1000
            app.logger.info(
                "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
                request_id,
                request.method,
                request.path,
                response.status_code,
                duration_ms,
            )

        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        response.headers.setdefault(
            "Content-Security-Policy",
            "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; "
            "form-action 'none'",
        )

        if not app.config.get("DEBUG"):
            hsts_seconds = int(app.config.get("HSTS_SECONDS", 31536000))
            if hsts_seconds > 0:
                response.headers.setdefault(
                    "Strict-Transport-Security",
                    f"max-age={hsts_seconds}; includeSubDomains",
                )

        return response

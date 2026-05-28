"""CORS configuration."""

from __future__ import annotations

from flask import Flask
from flask_cors import CORS


def configure_cors(app: Flask) -> None:
    cors_origins_raw = str(app.config.get("CORS_ORIGINS", "")).strip()
    allow_credentials = bool(app.config.get("CORS_SUPPORTS_CREDENTIALS", False))

    if cors_origins_raw == "*":
        if allow_credentials:
            raise RuntimeError(
                "Invalid CORS configuration: wildcard origin cannot be used "
                "when CORS_SUPPORTS_CREDENTIALS=true."
            )
        origins: str | list[str] = "*"
    else:
        origins = [o.strip() for o in cors_origins_raw.split(",") if o.strip()]
        if not origins:
            raise RuntimeError(
                "Invalid CORS configuration: set CORS_ORIGINS to '*' or "
                "a comma-separated list of origins."
            )

    CORS(app, origins=origins, supports_credentials=allow_credentials)

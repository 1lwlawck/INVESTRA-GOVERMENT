"""Flask Application Factory."""

from __future__ import annotations

import os

from flask import Flask

from app.config import config_map
from app.extensions import db, limiter, migrate


def _ensure_required_config(app: Flask) -> None:
    missing = [
        key
        for key in ("SECRET_KEY", "SQLALCHEMY_DATABASE_URI")
        if not app.config.get(key)
    ]
    if missing:
        env_names = ["DATABASE_URL" if k == "SQLALCHEMY_DATABASE_URI" else k for k in missing]
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(env_names)
        )


def _init_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)


def create_app() -> Flask:
    app = Flask(__name__)

    env = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map.get(env, config_map["development"]))
    _ensure_required_config(app)

    from app.setup.logging import configure_logging

    configure_logging(app)

    _init_extensions(app)

    from app.setup.cors import configure_cors

    configure_cors(app)

    from app.middleware.error_handler import register_error_handlers
    from app.setup.request_context import register_request_hooks
    from app.setup.security_headers import register_response_hooks

    register_error_handlers(app)
    register_request_hooks(app)
    register_response_hooks(app)

    # Import models so Alembic sees them
    from app.cli import register_cli
    from app.models import AnalysisResult, Dataset, Province, User  # noqa: F401
    from app.setup.blueprints import register_blueprints

    register_blueprints(app)
    register_cli(app)

    return app

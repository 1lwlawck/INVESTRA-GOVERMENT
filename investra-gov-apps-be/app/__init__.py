"""Flask Application Factory."""

import json
import logging
import os

from flask import Flask
from flask_cors import CORS

from app.Config import config_map
from app.Extensions import db, limiter, migrate
from app.utils.CaseConverter import camelize


def createApp() -> Flask:
    app = Flask(__name__)

    env = os.getenv("FLASK_ENV", "development")
    app.config.from_object(config_map.get(env, config_map["development"]))

    missing = [
        key
        for key in ("SECRET_KEY", "SQLALCHEMY_DATABASE_URI")
        if not app.config.get(key)
    ]
    if missing:
        envNames = ["DATABASE_URL" if k == "SQLALCHEMY_DATABASE_URI" else k for k in missing]
        raise RuntimeError(
            "Missing required environment variables: " + ", ".join(envNames)
        )

    logging.basicConfig(
        level=logging.DEBUG if app.config.get("DEBUG") else logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)

    corsOriginsRaw = str(app.config.get("CORS_ORIGINS", "")).strip()
    allowCredentials = bool(app.config.get("CORS_SUPPORTS_CREDENTIALS", False))

    if corsOriginsRaw == "*":
        if allowCredentials:
            raise RuntimeError(
                "Invalid CORS configuration: wildcard origin cannot be used "
                "when CORS_SUPPORTS_CREDENTIALS=true."
            )
        origins = "*"
    else:
        origins = [o.strip() for o in corsOriginsRaw.split(",") if o.strip()]
        if not origins:
            raise RuntimeError(
                "Invalid CORS configuration: set CORS_ORIGINS to '*' or "
                "a comma-separated list of origins."
            )

    CORS(app, origins=origins, supports_credentials=allowCredentials)

    from app.middleware.ErrorHandler import registerErrorHandlers

    registerErrorHandlers(app)

    @app.after_request
    def hardenAndCamelizeJsonResponse(response):
        if response.content_type and "application/json" in response.content_type:
            data = response.get_json(silent=True)
            if data is not None:
                response.set_data(json.dumps(camelize(data), ensure_ascii=False))

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
            hstsSeconds = int(app.config.get("HSTS_SECONDS", 31536000))
            if hstsSeconds > 0:
                response.headers.setdefault(
                    "Strict-Transport-Security",
                    f"max-age={hstsSeconds}; includeSubDomains",
                )

        return response

    # Import models so Alembic sees them
    from app.models import AnalysisResult, Dataset, Province, User  # noqa: F401

    # Blueprints
    from app.api.Analysis import analysis_bp
    from app.api.Auth import auth_bp
    from app.api.Dashboard import dashboard_bp
    from app.api.Dataset import dataset_bp
    from app.api.Health import health_bp
    from app.api.Users import users_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")

    return app

"""Blueprint registration."""

from __future__ import annotations

from flask import Flask


def register_blueprints(app: Flask) -> None:
    from app.api.analysis import analysis_bp
    from app.api.auth import auth_bp
    from app.api.dashboard import dashboard_bp
    from app.api.dataset import dataset_bp
    from app.api.health import health_bp
    from app.api.public import public_bp
    from app.api.users import users_bp

    app.register_blueprint(health_bp)
    app.register_blueprint(public_bp, url_prefix="/api")
    app.register_blueprint(dataset_bp, url_prefix="/api")
    app.register_blueprint(analysis_bp, url_prefix="/api")
    app.register_blueprint(dashboard_bp, url_prefix="/api")
    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(users_bp, url_prefix="/api")

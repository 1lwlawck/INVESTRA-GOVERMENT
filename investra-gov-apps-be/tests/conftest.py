"""Pytest configuration and shared fixtures."""

from __future__ import annotations

import os

import pytest

# Ensure required env vars are set before the app factory runs
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest")
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("FLASK_ENV", "development")
os.environ.setdefault("CORS_ORIGINS", "*")
os.environ.setdefault("RATELIMIT_STORAGE_URI", "memory://")

from app import create_app
from app.extensions import db
from app.models.user import User

SUPERADMIN_PASSWORD = "Sup3rAdmin!"
ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="session")
def app():
    application = create_app()
    application.config.update(
        TESTING=True,
        SQLALCHEMY_DATABASE_URI="sqlite:///:memory:",
        RATELIMIT_ENABLED=False,
    )
    # Disable Flask-Limiter at runtime — TESTING flag alone is not honored.
    from app.extensions import limiter

    limiter.enabled = False

    with application.app_context():
        db.create_all()
        yield application
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db_session(app):
    """Wrap each test in a transaction that is rolled back at teardown."""
    with app.app_context():
        yield db.session
        db.session.rollback()
        # Wipe rows created during the test so other tests start clean
        for table in reversed(db.metadata.sorted_tables):
            db.session.execute(table.delete())
        db.session.commit()


@pytest.fixture()
def superadmin_user(app, db_session):
    user = User(
        username="superadmin_test",
        email="superadmin@test.local",
        full_name="Super Admin Test",
        role="superadmin",
        is_active=True,
    )
    user.ensure_public_identifiers()
    user.set_password(SUPERADMIN_PASSWORD)
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture()
def admin_user(app, db_session):
    user = User(
        username="admin_test",
        email="admin@test.local",
        full_name="Admin Test",
        role="admin",
        is_active=True,
    )
    user.ensure_public_identifiers()
    user.set_password(ADMIN_PASSWORD)
    db_session.add(user)
    db_session.commit()
    return user


def login(client, username: str, password: str) -> str | None:
    """Helper: POST /api/auth/login and return the JWT token, or None on failure."""
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": password},
    )
    if response.status_code != 200:
        return None
    body = response.get_json()
    if not body:
        return None
    return body.get("token")


@pytest.fixture()
def auth_headers_factory(client):
    """Returns a function that logs the given user in and yields headers."""

    def _factory(username: str, password: str) -> dict[str, str]:
        token = login(client, username, password)
        assert token is not None, f"login failed for {username}"
        return {"Authorization": f"Bearer {token}"}

    return _factory

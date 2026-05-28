"""Smoke tests: app boot + critical endpoints."""

from __future__ import annotations


def test_app_factory_boots(app):
    assert app is not None
    assert "SQLALCHEMY_DATABASE_URI" in app.config
    assert app.config["TESTING"] is True


def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.get_json()
    assert body is not None
    assert body.get("status") == "ok"


def test_security_headers_present(client):
    response = client.get("/health")
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy") == "no-referrer"
    assert response.headers.get("X-Request-ID")


def test_camelize_response_keys(client):
    """Response JSON keys are camelCase via after_request."""
    response = client.get("/health")
    body = response.get_json()
    assert body is not None
    # snake_case keys (e.g. is_active, request_id) must not appear in body
    for key in body:
        assert "_" not in key, f"snake_case key leaked into response: {key}"

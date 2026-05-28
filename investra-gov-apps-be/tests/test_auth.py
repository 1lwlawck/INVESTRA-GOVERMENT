"""Auth endpoint smoke tests."""

from __future__ import annotations


def test_login_requires_credentials(client):
    response = client.post("/api/auth/login", json={})
    assert response.status_code == 400
    body = response.get_json()
    assert body is not None
    # camelize converts "code" key as-is (single word stays the same)
    assert body.get("code") in {"AUTH_REQUIRED_FIELDS", "EMPTY_JSON_BODY"}


def test_login_rejects_unknown_user(client):
    response = client.post(
        "/api/auth/login",
        json={"username": "nope", "password": "Whatever1"},
    )
    assert response.status_code == 401
    body = response.get_json()
    assert body is not None
    assert body.get("code") == "INVALID_CREDENTIALS"


def test_me_requires_token(client):
    response = client.get("/api/auth/me")
    assert response.status_code == 401
    body = response.get_json()
    assert body is not None
    assert body.get("code") == "NO_TOKEN"

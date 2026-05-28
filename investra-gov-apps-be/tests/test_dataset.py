"""Dataset endpoint smoke tests (auth-gated)."""

from __future__ import annotations


def test_default_dataset_requires_token(client):
    response = client.get("/api/dataset/default")
    assert response.status_code == 401
    body = response.get_json()
    assert body is not None
    assert body.get("code") == "NO_TOKEN"


def test_versions_requires_token(client):
    response = client.get("/api/dataset/versions")
    assert response.status_code == 401

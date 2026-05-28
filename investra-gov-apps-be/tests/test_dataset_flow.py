"""Dataset endpoint deeper tests (no real CSV; just the auth + 404 paths)."""

from __future__ import annotations

from tests.conftest import SUPERADMIN_PASSWORD


def test_default_dataset_returns_404_when_no_active(
    client, superadmin_user, auth_headers_factory
):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.get("/api/dataset/default", headers=headers)
    assert response.status_code == 404
    assert response.get_json()["code"] == "NO_ACTIVE_DATASET"


def test_default_dataset_data_returns_404_when_no_active(
    client, superadmin_user, auth_headers_factory
):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.get("/api/dataset/default/data", headers=headers)
    assert response.status_code == 404


def test_versions_returns_empty_list_when_no_dataset(
    client, superadmin_user, auth_headers_factory
):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.get("/api/dataset/versions", headers=headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body is not None
    # camelize converts "total" / "versions" both single-word
    assert body.get("total") == 0
    assert body.get("versions") == []


def test_upload_csv_requires_file(client, superadmin_user, auth_headers_factory):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.post("/api/dataset/upload", headers=headers)
    assert response.status_code == 400
    assert response.get_json()["code"] == "FILE_FIELD_REQUIRED"

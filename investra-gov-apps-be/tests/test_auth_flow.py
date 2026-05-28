"""Login + JWT + protected endpoint flow tests."""

from __future__ import annotations

from tests.conftest import ADMIN_PASSWORD, SUPERADMIN_PASSWORD


def test_login_with_correct_credentials_returns_token(client, superadmin_user):
    response = client.post(
        "/api/auth/login",
        json={"username": superadmin_user.username, "password": SUPERADMIN_PASSWORD},
    )
    assert response.status_code == 200
    body = response.get_json()
    assert body is not None
    # Response is camelized; check both possible keys
    assert "token" in body
    assert isinstance(body["token"], str) and body["token"].count(".") == 2
    user = body.get("user")
    assert user is not None
    assert user["username"] == superadmin_user.username
    assert user["role"] == "superadmin"


def test_login_wrong_password_returns_401(client, superadmin_user):
    response = client.post(
        "/api/auth/login",
        json={"username": superadmin_user.username, "password": "WrongPassword1"},
    )
    assert response.status_code == 401
    assert response.get_json()["code"] == "INVALID_CREDENTIALS"


def test_me_endpoint_with_valid_token(client, superadmin_user, auth_headers_factory):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.get("/api/auth/me", headers=headers)
    assert response.status_code == 200
    body = response.get_json()
    assert body is not None
    assert body["user"]["username"] == superadmin_user.username


def test_me_endpoint_with_invalid_token(client):
    response = client.get(
        "/api/auth/me",
        headers={"Authorization": "Bearer not.a.real.token"},
    )
    assert response.status_code == 401
    assert response.get_json()["code"] == "INVALID_TOKEN"


def test_refresh_returns_new_token(client, superadmin_user, auth_headers_factory):
    headers = auth_headers_factory(superadmin_user.username, SUPERADMIN_PASSWORD)
    response = client.post("/api/auth/refresh", headers=headers)
    assert response.status_code == 200
    body = response.get_json()
    assert "token" in body
    assert body["token"].count(".") == 2


def test_admin_role_cannot_access_superadmin_endpoint(
    client, admin_user, auth_headers_factory
):
    """`/api/dataset/versions/<id>/activate` requires superadmin."""
    headers = auth_headers_factory(admin_user.username, ADMIN_PASSWORD)
    response = client.put(
        "/api/dataset/versions/some-id/activate",
        headers=headers,
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "FORBIDDEN"


def test_user_role_cannot_access_admin_endpoint(client, db_session, auth_headers_factory):
    """`/api/dataset/versions` requires admin+."""
    from app.models.user import User

    user = User(
        username="plain_user_test",
        email="plain@test.local",
        full_name="Plain User Test",
        role="user",
        is_active=True,
    )
    user.ensure_public_identifiers()
    user.set_password("PlainUser1")
    db_session.add(user)
    db_session.commit()

    headers = auth_headers_factory("plain_user_test", "PlainUser1")
    response = client.get("/api/dataset/versions", headers=headers)
    assert response.status_code == 403


def test_disabled_user_cannot_login(client, db_session):
    from app.models.user import User

    user = User(
        username="disabled_test",
        email="disabled@test.local",
        full_name="Disabled User",
        role="user",
        is_active=False,
    )
    user.ensure_public_identifiers()
    user.set_password("Disabled1A")
    db_session.add(user)
    db_session.commit()

    response = client.post(
        "/api/auth/login",
        json={"username": "disabled_test", "password": "Disabled1A"},
    )
    assert response.status_code == 403
    assert response.get_json()["code"] == "ACCOUNT_DISABLED"

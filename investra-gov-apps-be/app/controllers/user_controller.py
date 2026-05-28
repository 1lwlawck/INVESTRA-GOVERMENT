"""User controller: CRUD operations for user management (superadmin)."""

from __future__ import annotations

from flask import g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.controllers.auth_controller import validate_password_strength
from app.extensions import db
from app.models.user import User
from app.utils.api_response import error_response
from app.utils.request_parser import parse_json_object


def _string_field(data: dict, field: str) -> str:
    value = data.get(field, "")
    return value.strip() if isinstance(value, str) else ""


def _parse_optional_bool(data: dict, field: str, default: bool) -> bool:
    if field not in data:
        return default
    raw = data.get(field)
    if isinstance(raw, bool):
        return raw
    if isinstance(raw, str):
        value = raw.strip().lower()
        if value in {"1", "true", "yes", "y", "on"}:
            return True
        if value in {"0", "false", "no", "n", "off"}:
            return False
    return bool(raw)


def _count_active_superadmins() -> int:
    return User.query.filter_by(role="superadmin", is_active=True).count()


def _is_last_active_superadmin(user: User) -> bool:
    if user.role != "superadmin" or not user.is_active:
        return False
    return _count_active_superadmins() <= 1
def list_users():
    """GET /api/users"""
    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify({"users": [u.to_dict() for u in users]})

def get_user(user_id: str):
    """GET /api/users/<id>"""
    user = User.get_by_public_id(user_id)
    if user is None:
        return error_response("User tidak ditemukan", "USER_NOT_FOUND", 404)
    return jsonify({"user": user.to_dict()})

def create_user():
    """POST /api/users"""
    data, parse_error = parse_json_object(request, required=True)
    if parse_error:
        return parse_error
    assert data is not None

    required_fields = ["username", "email", "password", "fullName"]
    for field in required_fields:
        if not _string_field(data, field):
            return error_response(
                f"Field '{field}' wajib diisi",
                "REQUIRED_FIELD_MISSING",
                400,
                field=field,
            )

    role = _string_field(data, "role") or "user"
    if role not in User.VALID_ROLES:
        return error_response(
            f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
            "INVALID_ROLE",
            400,
            valid_roles=list(User.VALID_ROLES),
        )

    username = _string_field(data, "username")
    email = _string_field(data, "email")
    full_name = _string_field(data, "fullName")
    password = _string_field(data, "password")
    is_active = _parse_optional_bool(data, "isActive", True)

    if User.query.filter_by(username=username).first():
        return error_response("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)

    if User.query.filter_by(email=email).first():
        return error_response("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)

    pw_error = validate_password_strength(password)
    if pw_error:
        return error_response(pw_error, "WEAK_PASSWORD", 400)

    user = User(
        username=username,
        email=email,
        full_name=full_name,
        role=role,
        is_active=is_active,
    )
    user.ensure_public_identifiers()
    user.set_password(password)

    try:
        db.session.add(user)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error_response(
            "Gagal menyimpan user ke database",
            "USER_PERSIST_FAILED",
            500,
        )

    return jsonify({"message": "User berhasil dibuat", "user": user.to_dict()}), 201

def update_user(user_id: str):
    """PUT /api/users/<id>"""
    user = User.get_by_public_id(user_id)
    if user is None:
        return error_response("User tidak ditemukan", "USER_NOT_FOUND", 404)
    user.ensure_public_identifiers()

    data, parse_error = parse_json_object(request, required=True)
    if parse_error:
        return parse_error
    assert data is not None

    current_user: User | None = getattr(g, "current_user", None)

    next_role = _string_field(data, "role") if "role" in data else user.role
    next_is_active = (
        _parse_optional_bool(data, "isActive", user.is_active)
        if "isActive" in data
        else user.is_active
    )

    if current_user and current_user.id == user.id and (
        next_role != "superadmin" or not next_is_active
    ):
        return error_response(
            "Tidak dapat menurunkan role atau menonaktifkan akun sendiri",
            "SELF_PROTECTION",
            409,
        )

    if _is_last_active_superadmin(user) and (next_role != "superadmin" or not next_is_active):
        return error_response(
            "Superadmin aktif terakhir tidak boleh dinonaktifkan atau diubah role",
            "LAST_SUPERADMIN_PROTECTED",
            409,
        )

    username = _string_field(data, "username")
    if "username" in data:
        if not username:
            return error_response(
                "Field 'username' tidak boleh kosong",
                "REQUIRED_FIELD_MISSING",
                400,
                field="username",
            )
        if username != user.username:
            if User.query.filter_by(username=username).first():
                return error_response("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)
            user.username = username

    email = _string_field(data, "email")
    if "email" in data:
        if not email:
            return error_response(
                "Field 'email' tidak boleh kosong",
                "REQUIRED_FIELD_MISSING",
                400,
                field="email",
            )
        if email != user.email:
            if User.query.filter_by(email=email).first():
                return error_response("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)
            user.email = email

    if "fullName" in data:
        full_name = _string_field(data, "fullName")
        if not full_name:
            return error_response(
                "Field 'fullName' tidak boleh kosong",
                "REQUIRED_FIELD_MISSING",
                400,
                field="fullName",
            )
        user.full_name = full_name

    if "role" in data:
        if next_role not in User.VALID_ROLES:
            return error_response(
                f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
                "INVALID_ROLE",
                400,
                valid_roles=list(User.VALID_ROLES),
            )
        user.role = next_role

    if "isActive" in data:
        user.is_active = next_is_active

    if "password" in data:
        password = _string_field(data, "password")
        if password:
            pw_error = validate_password_strength(password)
            if pw_error:
                return error_response(pw_error, "WEAK_PASSWORD", 400)
            user.set_password(password)

    try:
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error_response(
            "Gagal memperbarui user di database",
            "USER_UPDATE_FAILED",
            500,
        )

    return jsonify({"message": "User berhasil diperbarui", "user": user.to_dict()})

def delete_user(user_id: str):
    """DELETE /api/users/<id>"""
    user = User.get_by_public_id(user_id)
    if user is None:
        return error_response("User tidak ditemukan", "USER_NOT_FOUND", 404)

    current_user: User | None = getattr(g, "current_user", None)
    if current_user and current_user.id == user.id:
        return error_response(
            "Tidak dapat menghapus akun sendiri",
            "SELF_DELETE_FORBIDDEN",
            409,
        )

    if _is_last_active_superadmin(user):
        return error_response(
            "Superadmin aktif terakhir tidak boleh dihapus",
            "LAST_SUPERADMIN_PROTECTED",
            409,
        )

    username = user.username
    try:
        db.session.delete(user)
        db.session.commit()
    except SQLAlchemyError:
        db.session.rollback()
        return error_response(
            "Gagal menghapus user dari database",
            "USER_DELETE_FAILED",
            500,
        )
    return jsonify({"message": f"User '{username}' berhasil dihapus"})

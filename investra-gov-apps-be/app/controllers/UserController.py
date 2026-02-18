"""User controller: CRUD operations for user management (superadmin)."""

from __future__ import annotations

from flask import g, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from app.controllers.AuthController import validatePasswordStrength
from app.Extensions import db
from app.models.User import User
from app.utils.ApiResponse import errorResponse
from app.utils.RequestParser import parseJsonObject


def _stringField(data: dict, field: str) -> str:
    value = data.get(field, "")
    return value.strip() if isinstance(value, str) else ""


def _parseOptionalBool(data: dict, field: str, default: bool) -> bool:
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


def _countActiveSuperadmins() -> int:
    return User.query.filter_by(role="superadmin", is_active=True).count()


def _isLastActiveSuperadmin(user: User) -> bool:
    if user.role != "superadmin" or not user.is_active:
        return False
    return _countActiveSuperadmins() <= 1


class UserController:
    @staticmethod
    def listUsers():
        """GET /api/users"""
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify({"users": [u.toDict() for u in users]})

    @staticmethod
    def getUser(userId: str):
        """GET /api/users/<id>"""
        user = User.getByPublicId(userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)
        return jsonify({"user": user.toDict()})

    @staticmethod
    def createUser():
        """POST /api/users"""
        data, parseError = parseJsonObject(request, required=True)
        if parseError:
            return parseError
        assert data is not None

        requiredFields = ["username", "email", "password", "fullName"]
        for field in requiredFields:
            if not _stringField(data, field):
                return errorResponse(
                    f"Field '{field}' wajib diisi",
                    "REQUIRED_FIELD_MISSING",
                    400,
                    field=field,
                )

        role = _stringField(data, "role") or "user"
        if role not in User.VALID_ROLES:
            return errorResponse(
                f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
                "INVALID_ROLE",
                400,
                valid_roles=list(User.VALID_ROLES),
            )

        username = _stringField(data, "username")
        email = _stringField(data, "email")
        fullName = _stringField(data, "fullName")
        password = _stringField(data, "password")
        isActive = _parseOptionalBool(data, "isActive", True)

        if User.query.filter_by(username=username).first():
            return errorResponse("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)

        if User.query.filter_by(email=email).first():
            return errorResponse("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)

        pwError = validatePasswordStrength(password)
        if pwError:
            return errorResponse(pwError, "WEAK_PASSWORD", 400)

        user = User(
            username=username,
            email=email,
            full_name=fullName,
            role=role,
            is_active=isActive,
        )
        user.ensurePublicIdentifiers()
        user.setPassword(password)

        try:
            db.session.add(user)
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return errorResponse(
                "Gagal menyimpan user ke database",
                "USER_PERSIST_FAILED",
                500,
            )

        return jsonify({"message": "User berhasil dibuat", "user": user.toDict()}), 201

    @staticmethod
    def updateUser(userId: str):
        """PUT /api/users/<id>"""
        user = User.getByPublicId(userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)
        user.ensurePublicIdentifiers()

        data, parseError = parseJsonObject(request, required=True)
        if parseError:
            return parseError
        assert data is not None

        currentUser: User | None = getattr(g, "current_user", None)

        nextRole = _stringField(data, "role") if "role" in data else user.role
        nextIsActive = (
            _parseOptionalBool(data, "isActive", user.is_active)
            if "isActive" in data
            else user.is_active
        )

        if currentUser and currentUser.id == user.id and (
            nextRole != "superadmin" or not nextIsActive
        ):
            return errorResponse(
                "Tidak dapat menurunkan role atau menonaktifkan akun sendiri",
                "SELF_PROTECTION",
                409,
            )

        if _isLastActiveSuperadmin(user) and (nextRole != "superadmin" or not nextIsActive):
            return errorResponse(
                "Superadmin aktif terakhir tidak boleh dinonaktifkan atau diubah role",
                "LAST_SUPERADMIN_PROTECTED",
                409,
            )

        username = _stringField(data, "username")
        if "username" in data:
            if not username:
                return errorResponse(
                    "Field 'username' tidak boleh kosong",
                    "REQUIRED_FIELD_MISSING",
                    400,
                    field="username",
                )
            if username != user.username:
                if User.query.filter_by(username=username).first():
                    return errorResponse("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)
                user.username = username

        email = _stringField(data, "email")
        if "email" in data:
            if not email:
                return errorResponse(
                    "Field 'email' tidak boleh kosong",
                    "REQUIRED_FIELD_MISSING",
                    400,
                    field="email",
                )
            if email != user.email:
                if User.query.filter_by(email=email).first():
                    return errorResponse("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)
                user.email = email

        if "fullName" in data:
            fullName = _stringField(data, "fullName")
            if not fullName:
                return errorResponse(
                    "Field 'fullName' tidak boleh kosong",
                    "REQUIRED_FIELD_MISSING",
                    400,
                    field="fullName",
                )
            user.full_name = fullName

        if "role" in data:
            if nextRole not in User.VALID_ROLES:
                return errorResponse(
                    f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
                    "INVALID_ROLE",
                    400,
                    valid_roles=list(User.VALID_ROLES),
                )
            user.role = nextRole

        if "isActive" in data:
            user.is_active = nextIsActive

        if "password" in data:
            password = _stringField(data, "password")
            if password:
                pwError = validatePasswordStrength(password)
                if pwError:
                    return errorResponse(pwError, "WEAK_PASSWORD", 400)
                user.setPassword(password)

        try:
            db.session.commit()
        except SQLAlchemyError:
            db.session.rollback()
            return errorResponse(
                "Gagal memperbarui user di database",
                "USER_UPDATE_FAILED",
                500,
            )

        return jsonify({"message": "User berhasil diperbarui", "user": user.toDict()})

    @staticmethod
    def deleteUser(userId: str):
        """DELETE /api/users/<id>"""
        user = User.getByPublicId(userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)

        currentUser: User | None = getattr(g, "current_user", None)
        if currentUser and currentUser.id == user.id:
            return errorResponse(
                "Tidak dapat menghapus akun sendiri",
                "SELF_DELETE_FORBIDDEN",
                409,
            )

        if _isLastActiveSuperadmin(user):
            return errorResponse(
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
            return errorResponse(
                "Gagal menghapus user dari database",
                "USER_DELETE_FAILED",
                500,
            )
        return jsonify({"message": f"User '{username}' berhasil dihapus"})

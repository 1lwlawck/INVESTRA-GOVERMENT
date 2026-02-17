"""
User Controller – CRUD operations for user management (superadmin).
"""

from flask import request, jsonify

from app.Extensions import db
from app.models.User import User
from app.controllers.AuthController import validatePasswordStrength
from app.utils.ApiResponse import errorResponse


class UserController:

    @staticmethod
    def listUsers():
        """GET /api/users"""
        users = User.query.order_by(User.created_at.desc()).all()
        return jsonify({"users": [u.toDict() for u in users]})

    @staticmethod
    def getUser(userId: int):
        """GET /api/users/<id>"""
        user = db.session.get(User, userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)
        return jsonify({"user": user.toDict()})

    @staticmethod
    def createUser():
        """POST /api/users"""
        data = request.get_json(silent=True) or {}

        required = ["username", "email", "password", "fullName"]
        for field in required:
            if not data.get(field, "").strip():
                return errorResponse(
                    f"Field '{field}' wajib diisi",
                    "REQUIRED_FIELD_MISSING",
                    400,
                    field=field,
                )

        role = data.get("role", "user")
        if role not in User.VALID_ROLES:
            return errorResponse(
                f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
                "INVALID_ROLE",
                400,
                valid_roles=list(User.VALID_ROLES),
            )

        if User.query.filter_by(username=data["username"]).first():
            return errorResponse("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)

        if User.query.filter_by(email=data["email"]).first():
            return errorResponse("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)

        # Password strength
        pwError = validatePasswordStrength(data["password"])
        if pwError:
            return errorResponse(pwError, "WEAK_PASSWORD", 400)

        user = User(
            username=data["username"].strip(),
            email=data["email"].strip(),
            full_name=data["fullName"].strip(),
            role=role,
            is_active=data.get("isActive", True),
        )
        user.setPassword(data["password"])

        db.session.add(user)
        db.session.commit()

        return jsonify({"message": "User berhasil dibuat", "user": user.toDict()}), 201

    @staticmethod
    def updateUser(userId: int):
        """PUT /api/users/<id>"""
        user = db.session.get(User, userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)

        data = request.get_json(silent=True) or {}

        if "username" in data and data["username"] != user.username:
            if User.query.filter_by(username=data["username"]).first():
                return errorResponse("Username sudah digunakan", "USERNAME_ALREADY_USED", 409)
            user.username = data["username"].strip()

        if "email" in data and data["email"] != user.email:
            if User.query.filter_by(email=data["email"]).first():
                return errorResponse("Email sudah digunakan", "EMAIL_ALREADY_USED", 409)
            user.email = data["email"].strip()

        if "fullName" in data:
            user.full_name = data["fullName"].strip()

        if "role" in data:
            if data["role"] not in User.VALID_ROLES:
                return errorResponse(
                    f"Role harus salah satu dari: {', '.join(User.VALID_ROLES)}",
                    "INVALID_ROLE",
                    400,
                    valid_roles=list(User.VALID_ROLES),
                )
            user.role = data["role"]

        if "isActive" in data:
            user.is_active = bool(data["isActive"])

        if "password" in data and data["password"].strip():
            pwError = validatePasswordStrength(data["password"])
            if pwError:
                return errorResponse(pwError, "WEAK_PASSWORD", 400)
            user.setPassword(data["password"])

        db.session.commit()
        return jsonify({"message": "User berhasil diperbarui", "user": user.toDict()})

    @staticmethod
    def deleteUser(userId: int):
        """DELETE /api/users/<id>"""
        user = db.session.get(User, userId)
        if user is None:
            return errorResponse("User tidak ditemukan", "USER_NOT_FOUND", 404)

        username = user.username
        db.session.delete(user)
        db.session.commit()
        return jsonify({"message": f"User '{username}' berhasil dihapus"})

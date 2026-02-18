"""User model: authentication and role-based access control."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_
from werkzeug.security import check_password_hash, generate_password_hash

from app.Extensions import db
from app.utils.PublicIdentifier import generateUuid, nextCode


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint(
            "role IN ('user', 'admin', 'superadmin')",
            name="ck_users_role",
        ),
    )

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, index=True, default=generateUuid)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="user")
    is_active = db.Column(db.Boolean, nullable=False, default=True, index=True)
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    VALID_ROLES = ("user", "admin", "superadmin")
    ROLE_HIERARCHY = {"user": 0, "admin": 1, "superadmin": 2}

    @classmethod
    def nextCode(cls, year: int | None = None) -> str:
        nowYear = year or datetime.now(timezone.utc).year
        suffix = f"{nowYear}"
        existing = db.session.query(cls.code).filter(cls.code.like(f"USR%{suffix}")).all()
        return nextCode(
            [row[0] for row in existing],
            prefix="USR",
            sequenceWidth=2,
            suffix=suffix,
        )

    @classmethod
    def getByPublicId(cls, publicId: str | int) -> "User | None":
        if publicId is None:
            return None
        if isinstance(publicId, int):
            return db.session.get(cls, publicId)
        publicId = str(publicId).strip()
        if not publicId:
            return None
        if publicId.isdigit():
            legacy = db.session.get(cls, int(publicId))
            if legacy is not None:
                return legacy
        return cls.query.filter(or_(cls.uuid == publicId, cls.code == publicId)).first()

    def setPassword(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def checkPassword(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def hasRole(self, minRole: str) -> bool:
        return self.ROLE_HIERARCHY.get(self.role, 0) >= self.ROLE_HIERARCHY.get(
            minRole, 0
        )

    def ensurePublicIdentifiers(self) -> None:
        if not self.uuid:
            self.uuid = generateUuid()
        if not self.code:
            self.code = self.nextCode()

    def toDict(self) -> dict:
        return {
            "id": self.uuid,
            "code": self.code,
            "internal_id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

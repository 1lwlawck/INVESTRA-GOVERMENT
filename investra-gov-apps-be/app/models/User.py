"""User model: authentication and role-based access control."""

from __future__ import annotations

from datetime import UTC, datetime
from typing import ClassVar

from sqlalchemy import or_
from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db
from app.utils.public_identifier import generate_uuid, next_code


class User(db.Model):
    __tablename__ = "users"
    __table_args__ = (
        db.CheckConstraint(
            "role IN ('user', 'admin', 'superadmin')",
            name="ck_users_role",
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
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
        default=lambda: datetime.now(UTC),
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
    )

    VALID_ROLES: ClassVar[tuple[str, ...]] = ("user", "admin", "superadmin")
    ROLE_HIERARCHY: ClassVar[dict[str, int]] = {"user": 0, "admin": 1, "superadmin": 2}

    @classmethod
    def next_code(cls, year: int | None = None) -> str:
        now_year = year or datetime.now(UTC).year
        suffix = f"{now_year}"
        existing = db.session.query(cls.code).filter(cls.code.like(f"USR%{suffix}")).all()
        return next_code(
            [row[0] for row in existing],
            prefix="USR",
            sequence_width=2,
            suffix=suffix,
        )

    @classmethod
    def get_by_public_id(cls, public_id: str) -> User | None:
        if not public_id:
            return None
        public_id = str(public_id).strip()
        if not public_id:
            return None
        return cls.query.filter(or_(cls.id == public_id, cls.code == public_id)).first()

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def has_role(self, min_role: str) -> bool:
        return self.ROLE_HIERARCHY.get(self.role, 0) >= self.ROLE_HIERARCHY.get(
            min_role, 0
        )

    def ensure_public_identifiers(self) -> None:
        if not self.id:
            self.id = generate_uuid()
        if not self.code:
            self.code = self.next_code()

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "code": self.code,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

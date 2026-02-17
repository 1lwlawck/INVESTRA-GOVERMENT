"""
User model – authentication & role-based access control.
"""

from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from app.Extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(150), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(150), nullable=False)
    role = db.Column(
        db.String(20), nullable=False, default="user"
    )  # user | admin | superadmin
    is_active = db.Column(db.Boolean, nullable=False, default=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at = db.Column(
        db.DateTime,
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    VALID_ROLES = ("user", "admin", "superadmin")
    ROLE_HIERARCHY = {"user": 0, "admin": 1, "superadmin": 2}

    # ── Password helpers ──────────────────────────────────────
    def setPassword(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def checkPassword(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    # ── Role helpers ──────────────────────────────────────────
    def hasRole(self, minRole: str) -> bool:
        """Return True if user's role >= minRole in hierarchy."""
        return self.ROLE_HIERARCHY.get(self.role, 0) >= self.ROLE_HIERARCHY.get(
            minRole, 0
        )

    # ── Serialisation ─────────────────────────────────────────
    def toDict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "full_name": self.full_name,
            "role": self.role,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

"""Dataset model: versioned dataset metadata."""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from sqlalchemy import or_

from app.extensions import db
from app.utils.public_identifier import generate_uuid, next_code


class Dataset(db.Model):
    __tablename__ = "datasets"
    __table_args__ = (
        db.UniqueConstraint("version", name="uq_datasets_version"),
        db.UniqueConstraint("checksum", name="uq_datasets_checksum"),
        db.CheckConstraint("row_count >= 0", name="ck_datasets_row_count_non_negative"),
        db.CheckConstraint("year BETWEEN 1900 AND 2100", name="ck_datasets_year_range"),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    version = db.Column(db.Integer, nullable=False, default=1)
    name = db.Column(
        db.String(200),
        nullable=False,
        default="Investasi Per Provinsi Indonesia",
    )
    description = db.Column(db.Text, nullable=True)
    year = db.Column(db.Integer, nullable=False, default=2023)
    is_active = db.Column(
        db.Boolean,
        nullable=False,
        default=False,
        index=True,
        comment="Only one dataset should be active",
    )

    uploaded_by = db.Column(
        db.String(36),
        db.ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        index=True,
        default=lambda: datetime.now(UTC),
    )

    original_filename = db.Column(db.String(255), nullable=True)
    checksum = db.Column(db.String(64), nullable=True)
    row_count = db.Column(db.Integer, nullable=False, default=0)

    uploader = db.relationship("User", backref="uploaded_datasets", lazy="joined")
    provinces = db.relationship(
        "Province",
        backref="dataset",
        lazy="dynamic",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    analysis_results = db.relationship(
        "AnalysisResult",
        backref="dataset",
        lazy="dynamic",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    @classmethod
    def get_active(cls) -> Dataset | None:
        return cls.query.filter_by(is_active=True).first()

    @classmethod
    def next_version(cls) -> int:
        max_ver = db.session.query(db.func.max(cls.version)).scalar()
        return (max_ver or 0) + 1

    @classmethod
    def next_code(cls) -> str:
        existing = db.session.query(cls.code).filter(cls.code.like("DTS%")).all()
        return next_code([row[0] for row in existing], prefix="DTS", sequence_width=3)

    @classmethod
    def get_by_public_id(cls, public_id: str) -> Dataset | None:
        if not public_id:
            return None
        public_id = str(public_id).strip()
        if not public_id:
            return None
        return cls.query.filter(or_(cls.id == public_id, cls.code == public_id)).first()

    @staticmethod
    def compute_checksum(content: bytes) -> str:
        return hashlib.sha256(content).hexdigest()

    def ensure_public_identifiers(self) -> None:
        if not self.id:
            self.id = generate_uuid()
        if not self.code:
            self.code = self.next_code()

    def to_dict(self, include_uploader: bool = True) -> dict:
        data = {
            "id": self.id,
            "code": self.code,
            "version": self.version,
            "name": self.name,
            "description": self.description,
            "year": self.year,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat(),
            "original_filename": self.original_filename,
            "checksum": self.checksum,
            "row_count": self.row_count,
        }

        if include_uploader and self.uploader:
            data["uploaded_by"] = {
                "id": self.uploader.id,
                "code": self.uploader.code,
                "username": self.uploader.username,
                "full_name": self.uploader.full_name,
            }
        elif include_uploader:
            data["uploaded_by"] = None
        return data

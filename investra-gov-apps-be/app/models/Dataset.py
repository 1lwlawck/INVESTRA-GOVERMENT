"""
Dataset model – versioned dataset metadata.

Each uploaded CSV creates a new Dataset record. Only one dataset
can be 'active' at a time. Provinces and AnalysisResults reference
their parent dataset via FK, enabling:
  - Full audit trail (who uploaded, when)
  - Reproducibility (analysis linked to exact dataset version)
  - Non-destructive uploads (old data is preserved)
  - Rollback (re-activate a previous version)
  - Longitudinal comparison (query across versions)
"""

from __future__ import annotations

import hashlib
from datetime import datetime, timezone

from app.Extensions import db


class Dataset(db.Model):
    __tablename__ = "datasets"

    id = db.Column(db.Integer, primary_key=True)
    version = db.Column(db.Integer, nullable=False, default=1,
                        comment="Auto-incrementing version number")
    name = db.Column(db.String(200), nullable=False,
                     default="Investasi Per Provinsi Indonesia")
    description = db.Column(db.Text, nullable=True)
    year = db.Column(db.Integer, nullable=False, default=2023)
    is_active = db.Column(db.Boolean, nullable=False, default=False,
                          index=True,
                          comment="Only one dataset should be active")

    # Audit fields
    uploaded_by = db.Column(db.Integer, db.ForeignKey("users.id"),
                            nullable=True,
                            comment="User who uploaded this version")
    created_at = db.Column(db.DateTime, nullable=False,
                           default=lambda: datetime.now(timezone.utc))

    # File metadata
    original_filename = db.Column(db.String(255), nullable=True)
    checksum = db.Column(db.String(64), nullable=True,
                         comment="SHA-256 of the uploaded CSV content")
    row_count = db.Column(db.Integer, nullable=False, default=0)

    # Relationships
    uploader = db.relationship("User", backref="uploaded_datasets",
                               lazy="joined")
    provinces = db.relationship("Province", backref="dataset",
                                lazy="dynamic",
                                cascade="all, delete-orphan")
    analysis_results = db.relationship("AnalysisResult", backref="dataset",
                                       lazy="dynamic",
                                       cascade="all, delete-orphan")

    # ── Class helpers ─────────────────────────────────────────

    @classmethod
    def getActive(cls) -> "Dataset | None":
        """Return the currently active dataset (at most one)."""
        return cls.query.filter_by(is_active=True).first()

    @classmethod
    def nextVersion(cls) -> int:
        """Return the next version number."""
        max_ver = db.session.query(db.func.max(cls.version)).scalar()
        return (max_ver or 0) + 1

    @staticmethod
    def computeChecksum(content: bytes) -> str:
        """SHA-256 hex digest of raw file content."""
        return hashlib.sha256(content).hexdigest()

    # ── Serialisation ─────────────────────────────────────────

    def toDict(self, includeUploader: bool = True) -> dict:
        d = {
            "id": self.id,
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
        if includeUploader and self.uploader:
            d["uploaded_by"] = {
                "id": self.uploader.id,
                "username": self.uploader.username,
                "full_name": self.uploader.full_name,
            }
        elif includeUploader:
            d["uploaded_by"] = None
        return d

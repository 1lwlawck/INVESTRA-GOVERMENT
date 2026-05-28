"""Province model for per-province investment indicators."""

from __future__ import annotations

from typing import ClassVar

from sqlalchemy import or_

from app.extensions import db
from app.utils.public_identifier import generate_uuid, next_code


class Province(db.Model):
    __tablename__ = "provinces"
    __table_args__ = (
        db.UniqueConstraint(
            "dataset_id",
            "provinsi",
            "year",
            name="uq_province_per_dataset_year",
        ),
        db.CheckConstraint("pmdn_rp >= 0", name="ck_provinces_pmdn_non_negative"),
        db.CheckConstraint("fdi_rp >= 0", name="ck_provinces_fdi_non_negative"),
        db.CheckConstraint("pdrb_per_kapita >= 0", name="ck_provinces_pdrb_non_negative"),
        db.CheckConstraint("ipm BETWEEN 0 AND 100", name="ck_provinces_ipm_range"),
        db.CheckConstraint("kemiskinan BETWEEN 0 AND 100", name="ck_provinces_kemiskinan_range"),
        db.CheckConstraint("akses_listrik BETWEEN 0 AND 100", name="ck_provinces_akses_listrik_range"),
        db.CheckConstraint("tpt BETWEEN 0 AND 100", name="ck_provinces_tpt_range"),
        db.CheckConstraint("year BETWEEN 1900 AND 2100", name="ck_provinces_year_range"),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    dataset_id = db.Column(
        db.String(36),
        db.ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provinsi = db.Column(db.String(100), nullable=False)
    pmdn_rp = db.Column(db.Float, nullable=False)
    fdi_rp = db.Column(db.Float, nullable=False)
    pdrb_per_kapita = db.Column(db.Float, nullable=False)
    ipm = db.Column(db.Float, nullable=False)
    kemiskinan = db.Column(db.Float, nullable=False)
    akses_listrik = db.Column(db.Float, nullable=False)
    tpt = db.Column(db.Float, nullable=False)
    year = db.Column(db.Integer, nullable=False, default=2024)

    NUMERIC_COLUMNS: ClassVar[list[str]] = [
        "pmdn_rp",
        "fdi_rp",
        "pdrb_per_kapita",
        "ipm",
        "kemiskinan",
        "akses_listrik",
        "tpt",
    ]

    @classmethod
    def get_by_public_id(cls, public_id: str) -> Province | None:
        if not public_id:
            return None
        public_id = str(public_id).strip()
        if not public_id:
            return None
        return cls.query.filter(or_(cls.id == public_id, cls.code == public_id)).first()

    @classmethod
    def next_sequence_for_year(cls, year: int) -> int:
        existing = db.session.query(cls.code).filter(cls.code.like(f"PROV%{year}")).all()
        max_seq = 0
        for row in existing:
            code = row[0]
            if not code or not code.startswith("PROV") or not code.endswith(str(year)):
                continue
            seq_part = code[4:-len(str(year))]
            if seq_part.isdigit():
                max_seq = max(max_seq, int(seq_part))
        return max_seq + 1

    @classmethod
    def build_code(cls, seq: int, year: int) -> str:
        return f"PROV{seq:03d}{year}"

    @classmethod
    def next_code(cls, year: int) -> str:
        existing = db.session.query(cls.code).filter(cls.code.like(f"PROV%{year}")).all()
        return next_code(
            [row[0] for row in existing],
            prefix="PROV",
            sequence_width=3,
            suffix=f"{year}",
        )

    def ensure_public_identifiers(self) -> None:
        if not self.id:
            self.id = generate_uuid()
        if not self.code:
            self.code = self.next_code(self.year)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "code": self.code,
            "provinsi": self.provinsi,
            "pmdn_rp": self.pmdn_rp,
            "fdi_rp": self.fdi_rp,
            "pdrb_per_kapita": self.pdrb_per_kapita,
            "ipm": self.ipm,
            "kemiskinan": self.kemiskinan,
            "akses_listrik": self.akses_listrik,
            "tpt": self.tpt,
            "year": self.year,
        }

"""Province model for per-province investment indicators."""

from __future__ import annotations

from sqlalchemy import or_

from app.Extensions import db
from app.utils.PublicIdentifier import generateUuid, nextCode


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

    id = db.Column(db.String(36), primary_key=True, default=generateUuid)
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

    NUMERIC_COLUMNS = [
        "pmdn_rp",
        "fdi_rp",
        "pdrb_per_kapita",
        "ipm",
        "kemiskinan",
        "akses_listrik",
        "tpt",
    ]

    @classmethod
    def getByPublicId(cls, publicId: str) -> "Province | None":
        if not publicId:
            return None
        publicId = str(publicId).strip()
        if not publicId:
            return None
        return cls.query.filter(or_(cls.id == publicId, cls.code == publicId)).first()

    @classmethod
    def nextSequenceForYear(cls, year: int) -> int:
        existing = db.session.query(cls.code).filter(cls.code.like(f"PROV%{year}")).all()
        maxSeq = 0
        for row in existing:
            code = row[0]
            if not code or not code.startswith("PROV") or not code.endswith(str(year)):
                continue
            seqPart = code[4:-len(str(year))]
            if seqPart.isdigit():
                maxSeq = max(maxSeq, int(seqPart))
        return maxSeq + 1

    @classmethod
    def buildCode(cls, seq: int, year: int) -> str:
        return f"PROV{seq:03d}{year}"

    @classmethod
    def nextCode(cls, year: int) -> str:
        existing = db.session.query(cls.code).filter(cls.code.like(f"PROV%{year}")).all()
        return nextCode(
            [row[0] for row in existing],
            prefix="PROV",
            sequenceWidth=3,
            suffix=f"{year}",
        )

    def ensurePublicIdentifiers(self) -> None:
        if not self.id:
            self.id = generateUuid()
        if not self.code:
            self.code = self.nextCode(self.year)

    def toDict(self) -> dict:
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

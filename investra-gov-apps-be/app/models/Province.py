"""
Province model – stores per-province investment indicators.

Selected variables (7) for PCA & K-Means analysis:
  1. pmdn_rp          – Domestic investment / PMDN (Rp)
  2. fdi_rp           – Foreign direct investment / PMA (Rp)
  3. pdrb_per_kapita  – Economic strength (Rp ribu)
  4. ipm              – Human capital (composite: education + health + income)
  5. kemiskinan       – Social condition (%)
  6. akses_listrik    – Basic infrastructure proxy (%)
  7. tpt              – Labour market condition / Tingkat Pengangguran Terbuka (%)

Data: Rata-rata 2022–2024, 38 provinsi, sumber BPS.
"""

from app.Extensions import db


class Province(db.Model):
    __tablename__ = "provinces"
    __table_args__ = (
        db.UniqueConstraint("dataset_id", "provinsi",
                            name="uq_province_per_dataset"),
    )

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(
        db.Integer, db.ForeignKey("datasets.id"), nullable=False, index=True,
        comment="FK to datasets – scopes rows to a specific dataset version",
    )
    provinsi = db.Column(db.String(100), nullable=False)
    pmdn_rp = db.Column(db.Float, nullable=False, comment="PMDN / Investasi Dalam Negeri (Rp)")
    fdi_rp = db.Column(db.Float, nullable=False, comment="PMA / Foreign Direct Investment (Rp)")
    pdrb_per_kapita = db.Column(db.Float, nullable=False)
    ipm = db.Column(db.Float, nullable=False)
    kemiskinan = db.Column(db.Float, nullable=False)
    akses_listrik = db.Column(db.Float, nullable=False)
    tpt = db.Column(db.Float, nullable=False, comment="Tingkat Pengangguran Terbuka (%)")
    year = db.Column(db.Integer, nullable=False, default=2024)

    # Numeric columns used for PCA & K-Means analysis (7 variables)
    NUMERIC_COLUMNS = [
        "pmdn_rp",
        "fdi_rp",
        "pdrb_per_kapita",
        "ipm",
        "kemiskinan",
        "akses_listrik",
        "tpt",
    ]

    def toDict(self) -> dict:
        return {
            "id": self.id,
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

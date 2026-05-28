"""AnalysisResult model stores PCA + K-Means outputs."""

from __future__ import annotations

from datetime import UTC, datetime

from sqlalchemy import or_

from app.extensions import db
from app.utils.public_identifier import generate_uuid, next_code


class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"
    __table_args__ = (
        db.CheckConstraint("k BETWEEN 2 AND 10", name="ck_analysis_results_k_range"),
        db.CheckConstraint("inertia >= 0", name="ck_analysis_results_inertia_non_negative"),
        db.CheckConstraint(
            "davies_bouldin >= 0",
            name="ck_analysis_results_davies_bouldin_non_negative",
        ),
        db.CheckConstraint(
            "calinski_harabasz >= 0",
            name="ck_analysis_results_calinski_harabasz_non_negative",
        ),
        db.CheckConstraint(
            "silhouette_score BETWEEN -1 AND 1",
            name="ck_analysis_results_silhouette_range",
        ),
    )

    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    dataset_id = db.Column(
        db.String(36),
        db.ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        index=True,
        default=lambda: datetime.now(UTC),
    )
    k = db.Column(db.Integer, nullable=False)

    pca_components = db.Column(db.JSON, nullable=False)
    pca_loadings = db.Column(db.JSON, nullable=False)
    pca_explained_variance = db.Column(db.JSON, nullable=False)
    cluster_assignments = db.Column(db.JSON, nullable=False)
    cluster_centers = db.Column(db.JSON, nullable=False)
    silhouette_score = db.Column(db.Float, nullable=False)
    inertia = db.Column(db.Float, nullable=False)
    davies_bouldin = db.Column(db.Float, nullable=False)
    calinski_harabasz = db.Column(db.Float, nullable=False)
    cluster_summary = db.Column(db.JSON, nullable=True)
    k_evaluation = db.Column(db.JSON, nullable=True)
    log_transformed = db.Column(db.Boolean, default=True)
    transform_info = db.Column(db.JSON, nullable=True)

    @classmethod
    def next_code(cls, year: int | None = None) -> str:
        now_year = year or datetime.now(UTC).year
        suffix = f"{now_year}"
        existing = db.session.query(cls.code).filter(cls.code.like(f"ANL%{suffix}")).all()
        return next_code(
            [row[0] for row in existing],
            prefix="ANL",
            sequence_width=3,
            suffix=suffix,
        )

    @classmethod
    def get_by_public_id(cls, public_id: str) -> AnalysisResult | None:
        if not public_id:
            return None
        public_id = str(public_id).strip()
        if not public_id:
            return None
        return cls.query.filter(or_(cls.id == public_id, cls.code == public_id)).first()

    def ensure_public_identifiers(self) -> None:
        if not self.id:
            self.id = generate_uuid()
        if not self.code:
            self.code = self.next_code()

    def to_dict(self) -> dict:
        dataset_public_id = self.dataset.id if self.dataset else None
        dataset_code = self.dataset.code if self.dataset else None
        return {
            "id": self.id,
            "code": self.code,
            "dataset_id": dataset_public_id,
            "dataset_code": dataset_code,
            "created_at": self.created_at.isoformat(),
            "k": self.k,
            "pca_components": self.pca_components,
            "pca_loadings": self.pca_loadings,
            "pca_explained_variance": self.pca_explained_variance,
            "cluster_assignments": self.cluster_assignments,
            "cluster_centers": self.cluster_centers,
            "silhouette_score": self.silhouette_score,
            "inertia": self.inertia,
            "davies_bouldin": self.davies_bouldin,
            "calinski_harabasz": self.calinski_harabasz,
            "cluster_summary": self.cluster_summary,
            "k_evaluation": self.k_evaluation,
            "log_transformed": self.log_transformed,
            "transform_info": self.transform_info,
        }

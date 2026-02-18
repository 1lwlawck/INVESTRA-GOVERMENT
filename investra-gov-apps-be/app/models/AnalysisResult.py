"""AnalysisResult model stores PCA + K-Means outputs."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import or_

from app.Extensions import db
from app.utils.PublicIdentifier import generateUuid, nextCode


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

    id = db.Column(db.Integer, primary_key=True)
    uuid = db.Column(db.String(36), unique=True, nullable=False, index=True, default=generateUuid)
    code = db.Column(db.String(32), unique=True, nullable=False, index=True)
    dataset_id = db.Column(
        db.Integer,
        db.ForeignKey("datasets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    created_at = db.Column(
        db.DateTime,
        nullable=False,
        index=True,
        default=lambda: datetime.now(timezone.utc),
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
    def nextCode(cls, year: int | None = None) -> str:
        nowYear = year or datetime.now(timezone.utc).year
        suffix = f"{nowYear}"
        existing = db.session.query(cls.code).filter(cls.code.like(f"ANL%{suffix}")).all()
        return nextCode(
            [row[0] for row in existing],
            prefix="ANL",
            sequenceWidth=3,
            suffix=suffix,
        )

    @classmethod
    def getByPublicId(cls, publicId: str | int) -> "AnalysisResult | None":
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

    def ensurePublicIdentifiers(self) -> None:
        if not self.uuid:
            self.uuid = generateUuid()
        if not self.code:
            self.code = self.nextCode()

    def toDict(self) -> dict:
        datasetPublicId = self.dataset.uuid if self.dataset else None
        datasetCode = self.dataset.code if self.dataset else None
        return {
            "id": self.uuid,
            "code": self.code,
            "internal_id": self.id,
            "dataset_id": datasetPublicId,
            "dataset_code": datasetCode,
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

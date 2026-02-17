"""
AnalysisResult model – stores PCA + K-Means results in JSON columns.
"""

from datetime import datetime, timezone
from app.Extensions import db


class AnalysisResult(db.Model):
    __tablename__ = "analysis_results"

    id = db.Column(db.Integer, primary_key=True)
    dataset_id = db.Column(
        db.Integer, db.ForeignKey("datasets.id"), nullable=False, index=True,
        comment="FK to datasets – links result to the exact dataset version",
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    k = db.Column(db.Integer, nullable=False, comment="Number of clusters used")

    # PCA outputs (stored as JSON)
    pca_components = db.Column(db.JSON, nullable=False)
    pca_loadings = db.Column(db.JSON, nullable=False)
    pca_explained_variance = db.Column(db.JSON, nullable=False)

    # Clustering outputs
    cluster_assignments = db.Column(
        db.JSON, nullable=False, comment="{ province_name: cluster_id }"
    )
    cluster_centers = db.Column(db.JSON, nullable=False)

    # Evaluation metrics
    silhouette_score = db.Column(db.Float, nullable=False)
    inertia = db.Column(db.Float, nullable=False)
    davies_bouldin = db.Column(db.Float, nullable=False)
    calinski_harabasz = db.Column(db.Float, nullable=False)

    # Tambahkan kolom baru
    cluster_summary = db.Column(db.JSON, nullable=True)       # statistik per cluster
    k_evaluation = db.Column(db.JSON, nullable=True)           # hasil evaluasi range K
    log_transformed = db.Column(db.Boolean, default=True)      # apakah log-transform aktif
    transform_info = db.Column(db.JSON, nullable=True)         # kolom yang di-transform

    def toDict(self) -> dict:
        return {
            "id": self.id,
            "dataset_id": self.dataset_id,
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

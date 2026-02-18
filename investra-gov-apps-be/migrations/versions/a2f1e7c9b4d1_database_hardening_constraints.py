"""database hardening constraints

Revision ID: a2f1e7c9b4d1
Revises: 96751a710f36
Create Date: 2026-02-18 05:35:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "a2f1e7c9b4d1"
down_revision = "96751a710f36"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.create_check_constraint(
            "ck_users_role",
            "role IN ('user', 'admin', 'superadmin')",
        )
        batch_op.create_index("ix_users_is_active", ["is_active"], unique=False)

    with op.batch_alter_table("datasets", schema=None) as batch_op:
        batch_op.create_unique_constraint("uq_datasets_version", ["version"])
        batch_op.create_unique_constraint("uq_datasets_checksum", ["checksum"])
        batch_op.create_check_constraint(
            "ck_datasets_row_count_non_negative",
            "row_count >= 0",
        )
        batch_op.create_check_constraint(
            "ck_datasets_year_range",
            "year BETWEEN 1900 AND 2100",
        )
        batch_op.create_index("ix_datasets_created_at", ["created_at"], unique=False)
        batch_op.drop_constraint("datasets_uploaded_by_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_datasets_uploaded_by_users_set_null",
            "users",
            ["uploaded_by"],
            ["id"],
            ondelete="SET NULL",
        )

    op.create_index(
        "uq_datasets_single_active_true",
        "datasets",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active IS TRUE"),
    )

    with op.batch_alter_table("provinces", schema=None) as batch_op:
        batch_op.drop_constraint("provinces_dataset_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_provinces_dataset_id_cascade",
            "datasets",
            ["dataset_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_check_constraint(
            "ck_provinces_pmdn_non_negative",
            "pmdn_rp >= 0",
        )
        batch_op.create_check_constraint(
            "ck_provinces_fdi_non_negative",
            "fdi_rp >= 0",
        )
        batch_op.create_check_constraint(
            "ck_provinces_pdrb_non_negative",
            "pdrb_per_kapita >= 0",
        )
        batch_op.create_check_constraint(
            "ck_provinces_ipm_range",
            "ipm BETWEEN 0 AND 100",
        )
        batch_op.create_check_constraint(
            "ck_provinces_kemiskinan_range",
            "kemiskinan BETWEEN 0 AND 100",
        )
        batch_op.create_check_constraint(
            "ck_provinces_akses_listrik_range",
            "akses_listrik BETWEEN 0 AND 100",
        )
        batch_op.create_check_constraint(
            "ck_provinces_tpt_range",
            "tpt BETWEEN 0 AND 100",
        )
        batch_op.create_check_constraint(
            "ck_provinces_year_range",
            "year BETWEEN 1900 AND 2100",
        )

    with op.batch_alter_table("analysis_results", schema=None) as batch_op:
        batch_op.drop_constraint("analysis_results_dataset_id_fkey", type_="foreignkey")
        batch_op.create_foreign_key(
            "fk_analysis_results_dataset_id_cascade",
            "datasets",
            ["dataset_id"],
            ["id"],
            ondelete="CASCADE",
        )
        batch_op.create_check_constraint(
            "ck_analysis_results_k_range",
            "k BETWEEN 2 AND 10",
        )
        batch_op.create_check_constraint(
            "ck_analysis_results_inertia_non_negative",
            "inertia >= 0",
        )
        batch_op.create_check_constraint(
            "ck_analysis_results_davies_bouldin_non_negative",
            "davies_bouldin >= 0",
        )
        batch_op.create_check_constraint(
            "ck_analysis_results_calinski_harabasz_non_negative",
            "calinski_harabasz >= 0",
        )
        batch_op.create_check_constraint(
            "ck_analysis_results_silhouette_range",
            "silhouette_score BETWEEN -1 AND 1",
        )
        batch_op.create_index(
            "ix_analysis_results_created_at",
            ["created_at"],
            unique=False,
        )


def downgrade():
    with op.batch_alter_table("analysis_results", schema=None) as batch_op:
        batch_op.drop_index("ix_analysis_results_created_at")
        batch_op.drop_constraint("fk_analysis_results_dataset_id_cascade", type_="foreignkey")
        batch_op.create_foreign_key(
            "analysis_results_dataset_id_fkey",
            "datasets",
            ["dataset_id"],
            ["id"],
        )
        batch_op.drop_constraint("ck_analysis_results_silhouette_range", type_="check")
        batch_op.drop_constraint(
            "ck_analysis_results_calinski_harabasz_non_negative",
            type_="check",
        )
        batch_op.drop_constraint(
            "ck_analysis_results_davies_bouldin_non_negative",
            type_="check",
        )
        batch_op.drop_constraint("ck_analysis_results_inertia_non_negative", type_="check")
        batch_op.drop_constraint("ck_analysis_results_k_range", type_="check")

    with op.batch_alter_table("provinces", schema=None) as batch_op:
        batch_op.drop_constraint("fk_provinces_dataset_id_cascade", type_="foreignkey")
        batch_op.create_foreign_key(
            "provinces_dataset_id_fkey",
            "datasets",
            ["dataset_id"],
            ["id"],
        )
        batch_op.drop_constraint("ck_provinces_year_range", type_="check")
        batch_op.drop_constraint("ck_provinces_tpt_range", type_="check")
        batch_op.drop_constraint("ck_provinces_akses_listrik_range", type_="check")
        batch_op.drop_constraint("ck_provinces_kemiskinan_range", type_="check")
        batch_op.drop_constraint("ck_provinces_ipm_range", type_="check")
        batch_op.drop_constraint("ck_provinces_pdrb_non_negative", type_="check")
        batch_op.drop_constraint("ck_provinces_fdi_non_negative", type_="check")
        batch_op.drop_constraint("ck_provinces_pmdn_non_negative", type_="check")

    op.drop_index("uq_datasets_single_active_true", table_name="datasets")

    with op.batch_alter_table("datasets", schema=None) as batch_op:
        batch_op.drop_index("ix_datasets_created_at")
        batch_op.drop_constraint("fk_datasets_uploaded_by_users_set_null", type_="foreignkey")
        batch_op.create_foreign_key(
            "datasets_uploaded_by_fkey",
            "users",
            ["uploaded_by"],
            ["id"],
        )
        batch_op.drop_constraint("ck_datasets_year_range", type_="check")
        batch_op.drop_constraint("ck_datasets_row_count_non_negative", type_="check")
        batch_op.drop_constraint("uq_datasets_checksum", type_="unique")
        batch_op.drop_constraint("uq_datasets_version", type_="unique")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_index("ix_users_is_active")
        batch_op.drop_constraint("ck_users_role", type_="check")

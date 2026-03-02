"""switch primary keys and foreign keys to uuid

Revision ID: c9d2e84a1f07
Revises: b7c4f1e92d3a
Create Date: 2026-02-18 15:20:00.000000

"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "c9d2e84a1f07"
down_revision = "b7c4f1e92d3a"
branch_labels = None
depends_on = None


def upgrade():
    # 1) Add temporary UUID key columns and UUID foreign key columns.
    op.add_column("users", sa.Column("id_new", sa.String(length=36), nullable=True))

    op.add_column("datasets", sa.Column("id_new", sa.String(length=36), nullable=True))
    op.add_column("datasets", sa.Column("uploaded_by_new", sa.String(length=36), nullable=True))

    op.add_column("provinces", sa.Column("id_new", sa.String(length=36), nullable=True))
    op.add_column("provinces", sa.Column("dataset_id_new", sa.String(length=36), nullable=True))

    op.add_column("analysis_results", sa.Column("id_new", sa.String(length=36), nullable=True))
    op.add_column("analysis_results", sa.Column("dataset_id_new", sa.String(length=36), nullable=True))

    # 2) Backfill temp columns from current UUID columns.
    conn = op.get_bind()
    conn.execute(sa.text("UPDATE users SET id_new = uuid"))
    conn.execute(sa.text("UPDATE datasets SET id_new = uuid"))
    conn.execute(sa.text("UPDATE provinces SET id_new = uuid"))
    conn.execute(sa.text("UPDATE analysis_results SET id_new = uuid"))

    conn.execute(
        sa.text(
            """
            UPDATE datasets d
            SET uploaded_by_new = u.uuid
            FROM users u
            WHERE d.uploaded_by = u.id
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE provinces p
            SET dataset_id_new = d.uuid
            FROM datasets d
            WHERE p.dataset_id = d.id
            """
        )
    )
    conn.execute(
        sa.text(
            """
            UPDATE analysis_results a
            SET dataset_id_new = d.uuid
            FROM datasets d
            WHERE a.dataset_id = d.id
            """
        )
    )

    # 3) Mark required new columns as NOT NULL (nullable FK: datasets.uploaded_by_new).
    op.execute("ALTER TABLE users ALTER COLUMN id_new SET NOT NULL")
    op.execute("ALTER TABLE datasets ALTER COLUMN id_new SET NOT NULL")
    op.execute("ALTER TABLE provinces ALTER COLUMN id_new SET NOT NULL")
    op.execute("ALTER TABLE provinces ALTER COLUMN dataset_id_new SET NOT NULL")
    op.execute("ALTER TABLE analysis_results ALTER COLUMN id_new SET NOT NULL")
    op.execute("ALTER TABLE analysis_results ALTER COLUMN dataset_id_new SET NOT NULL")

    # 4) Drop FK/PK/UUID constraints and indexes tied to integer keys.
    op.execute("ALTER TABLE datasets DROP CONSTRAINT IF EXISTS fk_datasets_uploaded_by_users_set_null")
    op.execute("ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_uploaded_by_fkey")
    op.execute("ALTER TABLE provinces DROP CONSTRAINT IF EXISTS fk_provinces_dataset_id_cascade")
    op.execute("ALTER TABLE provinces DROP CONSTRAINT IF EXISTS provinces_dataset_id_fkey")
    op.execute("ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS fk_analysis_results_dataset_id_cascade")
    op.execute("ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_dataset_id_fkey")

    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS uq_users_uuid")
    op.execute("ALTER TABLE datasets DROP CONSTRAINT IF EXISTS uq_datasets_uuid")
    op.execute("ALTER TABLE provinces DROP CONSTRAINT IF EXISTS uq_provinces_uuid")
    op.execute("ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS uq_analysis_results_uuid")

    op.execute("ALTER TABLE provinces DROP CONSTRAINT IF EXISTS uq_province_per_dataset")
    op.execute("DROP INDEX IF EXISTS ix_provinces_dataset_id")
    op.execute("DROP INDEX IF EXISTS ix_analysis_results_dataset_id")

    op.execute("ALTER TABLE analysis_results DROP CONSTRAINT IF EXISTS analysis_results_pkey")
    op.execute("ALTER TABLE provinces DROP CONSTRAINT IF EXISTS provinces_pkey")
    op.execute("ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_pkey")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey")

    # 5) Replace old int id/fk columns with UUID columns.
    op.execute("ALTER TABLE users DROP COLUMN id")
    op.execute("ALTER TABLE users DROP COLUMN uuid")
    op.execute("ALTER TABLE users RENAME COLUMN id_new TO id")

    op.execute("ALTER TABLE datasets DROP COLUMN id")
    op.execute("ALTER TABLE datasets DROP COLUMN uuid")
    op.execute("ALTER TABLE datasets DROP COLUMN uploaded_by")
    op.execute("ALTER TABLE datasets RENAME COLUMN id_new TO id")
    op.execute("ALTER TABLE datasets RENAME COLUMN uploaded_by_new TO uploaded_by")

    op.execute("ALTER TABLE provinces DROP COLUMN id")
    op.execute("ALTER TABLE provinces DROP COLUMN uuid")
    op.execute("ALTER TABLE provinces DROP COLUMN dataset_id")
    op.execute("ALTER TABLE provinces RENAME COLUMN id_new TO id")
    op.execute("ALTER TABLE provinces RENAME COLUMN dataset_id_new TO dataset_id")

    op.execute("ALTER TABLE analysis_results DROP COLUMN id")
    op.execute("ALTER TABLE analysis_results DROP COLUMN uuid")
    op.execute("ALTER TABLE analysis_results DROP COLUMN dataset_id")
    op.execute("ALTER TABLE analysis_results RENAME COLUMN id_new TO id")
    op.execute("ALTER TABLE analysis_results RENAME COLUMN dataset_id_new TO dataset_id")

    # 6) Recreate PK/FK/index/unique constraints on UUID key columns.
    op.execute("ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id)")
    op.execute("ALTER TABLE datasets ADD CONSTRAINT datasets_pkey PRIMARY KEY (id)")
    op.execute("ALTER TABLE provinces ADD CONSTRAINT provinces_pkey PRIMARY KEY (id)")
    op.execute("ALTER TABLE analysis_results ADD CONSTRAINT analysis_results_pkey PRIMARY KEY (id)")

    op.execute(
        """
        ALTER TABLE datasets
        ADD CONSTRAINT fk_datasets_uploaded_by_users_set_null
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
        """
    )
    op.execute(
        """
        ALTER TABLE provinces
        ADD CONSTRAINT fk_provinces_dataset_id_cascade
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        """
    )
    op.execute(
        """
        ALTER TABLE analysis_results
        ADD CONSTRAINT fk_analysis_results_dataset_id_cascade
        FOREIGN KEY (dataset_id) REFERENCES datasets(id) ON DELETE CASCADE
        """
    )

    op.execute("CREATE INDEX ix_provinces_dataset_id ON provinces (dataset_id)")
    op.execute("CREATE INDEX ix_analysis_results_dataset_id ON analysis_results (dataset_id)")
    op.execute(
        "ALTER TABLE provinces ADD CONSTRAINT uq_province_per_dataset UNIQUE (dataset_id, provinsi)"
    )

    # 7) Clean up legacy sequences that are no longer needed.
    op.execute("DROP SEQUENCE IF EXISTS users_id_seq")
    op.execute("DROP SEQUENCE IF EXISTS datasets_id_seq")
    op.execute("DROP SEQUENCE IF EXISTS provinces_id_seq")
    op.execute("DROP SEQUENCE IF EXISTS analysis_results_id_seq")


def downgrade():
    raise RuntimeError(
        "Downgrade is not supported for c9d2e84a1f07 because integer primary keys were removed."
    )


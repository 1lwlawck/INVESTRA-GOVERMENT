"""support panel dataset year uniqueness

Revision ID: d1f0c7a8e2b4
Revises: c9d2e84a1f07
Create Date: 2026-02-18 18:20:00.000000

"""

from alembic import op


# revision identifiers, used by Alembic.
revision = "d1f0c7a8e2b4"
down_revision = "c9d2e84a1f07"
branch_labels = None
depends_on = None


def upgrade():
    op.execute(
        "ALTER TABLE provinces DROP CONSTRAINT IF EXISTS uq_province_per_dataset"
    )
    op.execute(
        """
        ALTER TABLE provinces
        ADD CONSTRAINT uq_province_per_dataset_year
        UNIQUE (dataset_id, provinsi, year)
        """
    )


def downgrade():
    op.execute(
        "ALTER TABLE provinces DROP CONSTRAINT IF EXISTS uq_province_per_dataset_year"
    )
    op.execute(
        """
        ALTER TABLE provinces
        ADD CONSTRAINT uq_province_per_dataset
        UNIQUE (dataset_id, provinsi)
        """
    )


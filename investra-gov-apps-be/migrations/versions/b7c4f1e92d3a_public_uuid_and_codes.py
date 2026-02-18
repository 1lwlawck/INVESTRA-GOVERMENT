"""public uuid and codes

Revision ID: b7c4f1e92d3a
Revises: a2f1e7c9b4d1
Create Date: 2026-02-18 06:05:00.000000

"""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from uuid import uuid4

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "b7c4f1e92d3a"
down_revision = "a2f1e7c9b4d1"
branch_labels = None
depends_on = None


def _yearSuffix(value) -> str:
    try:
        return f"{int(value):04d}"
    except (TypeError, ValueError):
        return f"{datetime.now(timezone.utc).year:04d}"


def upgrade():
    op.add_column("users", sa.Column("uuid", sa.String(length=36), nullable=True))
    op.add_column("users", sa.Column("code", sa.String(length=32), nullable=True))
    op.add_column("datasets", sa.Column("uuid", sa.String(length=36), nullable=True))
    op.add_column("datasets", sa.Column("code", sa.String(length=32), nullable=True))
    op.add_column("provinces", sa.Column("uuid", sa.String(length=36), nullable=True))
    op.add_column("provinces", sa.Column("code", sa.String(length=32), nullable=True))
    op.add_column("analysis_results", sa.Column("uuid", sa.String(length=36), nullable=True))
    op.add_column("analysis_results", sa.Column("code", sa.String(length=32), nullable=True))

    conn = op.get_bind()

    users = sa.table(
        "users",
        sa.column("id", sa.Integer),
        sa.column("created_at", sa.DateTime),
        sa.column("uuid", sa.String),
        sa.column("code", sa.String),
    )
    userRows = conn.execute(
        sa.select(users.c.id, users.c.created_at).order_by(users.c.created_at, users.c.id)
    ).fetchall()
    userSeqByYear: dict[str, int] = defaultdict(int)
    for row in userRows:
        year = _yearSuffix(getattr(row, "created_at", None).year if getattr(row, "created_at", None) else None)
        userSeqByYear[year] += 1
        conn.execute(
            users.update()
            .where(users.c.id == row.id)
            .values(
                uuid=str(uuid4()),
                code=f"USR{userSeqByYear[year]:02d}{year}",
            )
        )

    datasets = sa.table(
        "datasets",
        sa.column("id", sa.Integer),
        sa.column("version", sa.Integer),
        sa.column("uuid", sa.String),
        sa.column("code", sa.String),
    )
    datasetRows = conn.execute(
        sa.select(datasets.c.id).order_by(datasets.c.version, datasets.c.id)
    ).fetchall()
    for seq, row in enumerate(datasetRows, start=1):
        conn.execute(
            datasets.update()
            .where(datasets.c.id == row.id)
            .values(uuid=str(uuid4()), code=f"DTS{seq:03d}")
        )

    provinces = sa.table(
        "provinces",
        sa.column("id", sa.Integer),
        sa.column("year", sa.Integer),
        sa.column("provinsi", sa.String),
        sa.column("uuid", sa.String),
        sa.column("code", sa.String),
    )
    provinceRows = conn.execute(
        sa.select(provinces.c.id, provinces.c.year, provinces.c.provinsi).order_by(
            provinces.c.year, provinces.c.provinsi, provinces.c.id
        )
    ).fetchall()
    provinceSeqByYear: dict[int, int] = defaultdict(int)
    for row in provinceRows:
        year = int(row.year or datetime.now(timezone.utc).year)
        provinceSeqByYear[year] += 1
        conn.execute(
            provinces.update()
            .where(provinces.c.id == row.id)
            .values(
                uuid=str(uuid4()),
                code=f"PROV{provinceSeqByYear[year]:03d}{year}",
            )
        )

    analysisResults = sa.table(
        "analysis_results",
        sa.column("id", sa.Integer),
        sa.column("created_at", sa.DateTime),
        sa.column("uuid", sa.String),
        sa.column("code", sa.String),
    )
    analysisRows = conn.execute(
        sa.select(analysisResults.c.id, analysisResults.c.created_at).order_by(
            analysisResults.c.created_at, analysisResults.c.id
        )
    ).fetchall()
    analysisSeqByYear: dict[str, int] = defaultdict(int)
    for row in analysisRows:
        year = _yearSuffix(getattr(row, "created_at", None).year if getattr(row, "created_at", None) else None)
        analysisSeqByYear[year] += 1
        conn.execute(
            analysisResults.update()
            .where(analysisResults.c.id == row.id)
            .values(
                uuid=str(uuid4()),
                code=f"ANL{analysisSeqByYear[year]:03d}{year}",
            )
        )

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.alter_column("uuid", existing_type=sa.String(length=36), nullable=False)
        batch_op.alter_column("code", existing_type=sa.String(length=32), nullable=False)
        batch_op.create_unique_constraint("uq_users_uuid", ["uuid"])
        batch_op.create_unique_constraint("uq_users_code", ["code"])

    with op.batch_alter_table("datasets", schema=None) as batch_op:
        batch_op.alter_column("uuid", existing_type=sa.String(length=36), nullable=False)
        batch_op.alter_column("code", existing_type=sa.String(length=32), nullable=False)
        batch_op.create_unique_constraint("uq_datasets_uuid", ["uuid"])
        batch_op.create_unique_constraint("uq_datasets_code", ["code"])

    with op.batch_alter_table("provinces", schema=None) as batch_op:
        batch_op.alter_column("uuid", existing_type=sa.String(length=36), nullable=False)
        batch_op.alter_column("code", existing_type=sa.String(length=32), nullable=False)
        batch_op.create_unique_constraint("uq_provinces_uuid", ["uuid"])
        batch_op.create_unique_constraint("uq_provinces_code", ["code"])

    with op.batch_alter_table("analysis_results", schema=None) as batch_op:
        batch_op.alter_column("uuid", existing_type=sa.String(length=36), nullable=False)
        batch_op.alter_column("code", existing_type=sa.String(length=32), nullable=False)
        batch_op.create_unique_constraint("uq_analysis_results_uuid", ["uuid"])
        batch_op.create_unique_constraint("uq_analysis_results_code", ["code"])


def downgrade():
    with op.batch_alter_table("analysis_results", schema=None) as batch_op:
        batch_op.drop_constraint("uq_analysis_results_code", type_="unique")
        batch_op.drop_constraint("uq_analysis_results_uuid", type_="unique")
        batch_op.drop_column("code")
        batch_op.drop_column("uuid")

    with op.batch_alter_table("provinces", schema=None) as batch_op:
        batch_op.drop_constraint("uq_provinces_code", type_="unique")
        batch_op.drop_constraint("uq_provinces_uuid", type_="unique")
        batch_op.drop_column("code")
        batch_op.drop_column("uuid")

    with op.batch_alter_table("datasets", schema=None) as batch_op:
        batch_op.drop_constraint("uq_datasets_code", type_="unique")
        batch_op.drop_constraint("uq_datasets_uuid", type_="unique")
        batch_op.drop_column("code")
        batch_op.drop_column("uuid")

    with op.batch_alter_table("users", schema=None) as batch_op:
        batch_op.drop_constraint("uq_users_code", type_="unique")
        batch_op.drop_constraint("uq_users_uuid", type_="unique")
        batch_op.drop_column("code")
        batch_op.drop_column("uuid")

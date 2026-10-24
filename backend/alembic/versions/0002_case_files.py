"""case files — evidence attachments on incidents

Revision ID: 0002_case_files
Revises: 0001_initial
Create Date: 2026-09-27

0001 materialises the schema from the live metadata, so on a fresh database
`case_files` already exists by the time this runs — hence the existence check.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_case_files"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    if sa.inspect(op.get_bind()).has_table("case_files"):
        return
    op.create_table(
        "case_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("incident_id", sa.Integer(), sa.ForeignKey("incidents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("original_filename", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(128)),
        sa.Column("size_bytes", sa.BigInteger(), server_default="0"),
        sa.Column("stored_name", sa.String(128), nullable=False, unique=True),
        sa.Column("category", sa.String(32), server_default="Evidence"),
        sa.Column("description", sa.Text()),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id")),
        sa.Column("uploaded_by_name", sa.String(255)),
        sa.Column("download_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_case_files_id", "case_files", ["id"])
    op.create_index("ix_case_files_incident_id", "case_files", ["incident_id"])


def downgrade() -> None:
    op.drop_table("case_files")

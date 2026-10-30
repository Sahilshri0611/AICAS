"""Advanced modules: surveillance, patrol, and fir file storage

Revision ID: 0003_advanced_modules
Revises: 0002_case_files
Create Date: 2026-10-25
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op
from app.core.database import Base
import app.models  # noqa

revision: str = "0003_advanced_modules"
down_revision: Union[str, None] = "0002_case_files"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    # Create any missing tables from Base.metadata
    Base.metadata.create_all(bind=bind)

    # Ensure columns exist on fir_documents if table already existed
    insp = sa.inspect(bind)
    fir_cols = [c["name"] for c in insp.get_columns("fir_documents")]
    if "file_path" not in fir_cols:
        op.add_column("fir_documents", sa.Column("file_path", sa.String(512), nullable=True))
    if "file_size" not in fir_cols:
        op.add_column("fir_documents", sa.Column("file_size", sa.BigInteger(), nullable=True))
    if "file_hash" not in fir_cols:
        op.add_column("fir_documents", sa.Column("file_hash", sa.String(128), nullable=True))
    if "original_pdf_stored" not in fir_cols:
        op.add_column("fir_documents", sa.Column("original_pdf_stored", sa.Boolean(), server_default="false", nullable=False))


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    for tbl in ["anpr_detections", "cctv_cameras", "vehicle_hotlists", "patrol_logs", "patrol_routes"]:
        if insp.has_table(tbl):
            op.drop_table(tbl)

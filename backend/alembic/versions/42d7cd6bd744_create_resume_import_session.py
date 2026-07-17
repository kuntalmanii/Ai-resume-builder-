"""create_resume_import_session

Revision ID: 42d7cd6bd744
Revises: b3d36b801a2c
Create Date: 2026-07-14 07:57:20.443450

"""
from collections.abc import Sequence

import sqlalchemy as sa

import app.db.types
from alembic import op

# revision identifiers, used by Alembic.
revision: str = '42d7cd6bd744'
down_revision: str | Sequence[str] | None = 'b3d36b801a2c'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('resume_import_sessions',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('original_filename', sa.String(length=255), nullable=False),
    sa.Column('document_type', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('extraction_metadata', app.db.types.JSONBType(), nullable=False),
    sa.Column('parsed_document', app.db.types.JSONBType(), nullable=False),
    sa.Column('parsing_warnings', app.db.types.JSONBType(), nullable=False),
    sa.Column('detected_sections', app.db.types.JSONBType(), nullable=False),
    sa.Column('missing_sections', app.db.types.JSONBType(), nullable=False),
    sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_import_sessions_user_id'), 'resume_import_sessions', ['user_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_resume_import_sessions_user_id'), table_name='resume_import_sessions')
    op.drop_table('resume_import_sessions')


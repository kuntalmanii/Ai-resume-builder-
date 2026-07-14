"""add_analysis_scoring_fields

Adds resume_version, raw_score, raw_max_score to resume_analyses.

These fields support the deterministic scoring engine introduced in Phase 9:
- resume_version: links an analysis to the exact resume version snapshot analyzed
- raw_score: sum of raw category points earned (0-75 for resume-only mode)
- raw_max_score: normalization denominator (75 for resume-only, 100 when JD is added)

Revision ID: 4fc2755c36e3
Revises: 42d7cd6bd744
Create Date: 2026-07-14 09:07:19.982007

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4fc2755c36e3'
down_revision: Union[str, Sequence[str], None] = '42d7cd6bd744'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add scoring metadata columns to resume_analyses."""
    # SQLite does not support DEFAULT in ADD COLUMN for existing rows without
    # a literal server_default — supply explicit defaults here.
    op.add_column(
        'resume_analyses',
        sa.Column('resume_version', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'resume_analyses',
        sa.Column('raw_score', sa.Integer(), nullable=False, server_default='0'),
    )
    op.add_column(
        'resume_analyses',
        sa.Column('raw_max_score', sa.Integer(), nullable=False, server_default='75'),
    )


def downgrade() -> None:
    """Remove scoring metadata columns from resume_analyses."""
    op.drop_column('resume_analyses', 'raw_max_score')
    op.drop_column('resume_analyses', 'raw_score')
    op.drop_column('resume_analyses', 'resume_version')

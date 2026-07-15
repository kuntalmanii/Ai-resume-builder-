"""add_jd_matching_fields

Revision ID: e3844a5eacc5
Revises: 4fc2755c36e3
Create Date: 2026-07-15 12:27:39.701549

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from app.db.types import JSONBType


# revision identifiers, used by Alembic.
revision: str = 'e3844a5eacc5'
down_revision: Union[str, Sequence[str], None] = '4fc2755c36e3'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns to job_descriptions
    op.add_column('job_descriptions', sa.Column('parsed_requirements', JSONBType(), nullable=True))
    
    # Add columns to job_match_results
    op.add_column('job_match_results', sa.Column('resume_version', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('job_match_results', sa.Column('matching_version', sa.String(length=50), nullable=False, server_default='jd-match-v1.0'))
    op.add_column('job_match_results', sa.Column('required_skills_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('job_match_results', sa.Column('preferred_skills_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('job_match_results', sa.Column('keyword_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('job_match_results', sa.Column('education_certification_score', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('job_match_results', sa.Column('matched_requirements', JSONBType(), nullable=False, server_default='[]'))
    op.add_column('job_match_results', sa.Column('missing_requirements', JSONBType(), nullable=False, server_default='[]'))
    op.add_column('job_match_results', sa.Column('hidden_profile_matches', JSONBType(), nullable=False, server_default='[]'))
    op.add_column('job_match_results', sa.Column('recommendations', JSONBType(), nullable=False, server_default='[]'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('job_descriptions', 'parsed_requirements')
    
    op.drop_column('job_match_results', 'recommendations')
    op.drop_column('job_match_results', 'hidden_profile_matches')
    op.drop_column('job_match_results', 'missing_requirements')
    op.drop_column('job_match_results', 'matched_requirements')
    op.drop_column('job_match_results', 'education_certification_score')
    op.drop_column('job_match_results', 'keyword_score')
    op.drop_column('job_match_results', 'preferred_skills_score')
    op.drop_column('job_match_results', 'required_skills_score')
    op.drop_column('job_match_results', 'matching_version')
    op.drop_column('job_match_results', 'resume_version')

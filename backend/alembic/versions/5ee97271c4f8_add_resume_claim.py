"""add_resume_claim

Revision ID: 5ee97271c4f8
Revises: a37282f03a79
Create Date: 2026-07-15 15:49:05.740683

"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '5ee97271c4f8'
down_revision: str | Sequence[str] | None = 'a37282f03a79'
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('resume_claims',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('resume_id', sa.UUID(), nullable=False),
    sa.Column('claim_text', sa.Text(), nullable=False),
    sa.Column('claim_fingerprint', sa.String(length=64), nullable=False),
    sa.Column('source_section', sa.String(length=50), nullable=False),
    sa.Column('source_entry_id', sa.String(length=100), nullable=True),
    sa.Column('verification_status', sa.String(length=50), nullable=False),
    sa.Column('contradiction_details', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('(CURRENT_TIMESTAMP)'), nullable=False),
    sa.ForeignKeyConstraint(['resume_id'], ['resumes.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_resume_claims_claim_fingerprint'), 'resume_claims', ['claim_fingerprint'], unique=False)
    op.create_index(op.f('ix_resume_claims_resume_id'), 'resume_claims', ['resume_id'], unique=False)

    # SQLite compatible alteration using batch operations
    with op.batch_alter_table('evidence_sources', schema=None) as batch_op:
        batch_op.add_column(sa.Column('resume_claim_id', sa.UUID(), nullable=True))
        batch_op.alter_column('ai_suggestion_id', existing_type=sa.UUID(), nullable=True)
        batch_op.create_index(batch_op.f('ix_evidence_sources_resume_claim_id'), ['resume_claim_id'], unique=False)
        batch_op.create_foreign_key('fk_evidence_sources_resume_claims', 'resume_claims', ['resume_claim_id'], ['id'], ondelete='CASCADE')


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('evidence_sources', schema=None) as batch_op:
        batch_op.drop_constraint('fk_evidence_sources_resume_claims', type_='foreignkey')
        batch_op.drop_index(batch_op.f('ix_evidence_sources_resume_claim_id'))
        batch_op.alter_column('ai_suggestion_id', existing_type=sa.UUID(), nullable=False)
        batch_op.drop_column('resume_claim_id')

    op.drop_index(op.f('ix_resume_claims_resume_id'), table_name='resume_claims')
    op.drop_index(op.f('ix_resume_claims_claim_fingerprint'), table_name='resume_claims')
    op.drop_table('resume_claims')

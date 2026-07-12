"""Resume Analysis Repository class."""
from uuid import UUID
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models.analysis import ResumeAnalysis
from app.repositories.base import BaseRepository

class ResumeAnalysisRepository(BaseRepository[ResumeAnalysis]):
    def __init__(self):
        super().__init__(ResumeAnalysis)

    async def get_by_resume_id(self, db: AsyncSession, resume_id: UUID) -> list[ResumeAnalysis]:
        query = select(ResumeAnalysis).where(ResumeAnalysis.resume_id == resume_id).order_by(ResumeAnalysis.created_at.desc())
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_latest_by_resume_id(self, db: AsyncSession, resume_id: UUID) -> ResumeAnalysis | None:
        query = select(ResumeAnalysis).where(ResumeAnalysis.resume_id == resume_id).order_by(ResumeAnalysis.created_at.desc())
        result = await db.execute(query)
        return result.scalars().first()

analysis_repository = ResumeAnalysisRepository()

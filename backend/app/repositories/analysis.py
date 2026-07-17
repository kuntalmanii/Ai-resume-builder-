"""Resume Analysis Repository class."""
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.analysis import ResumeAnalysis
from app.repositories.base import BaseRepository


class ResumeAnalysisRepository(BaseRepository[ResumeAnalysis]):
    def __init__(self):
        super().__init__(ResumeAnalysis)

    async def get_by_resume_id(
        self,
        db: AsyncSession,
        resume_id: UUID,
    ) -> list[ResumeAnalysis]:
        query = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.resume_id == resume_id)
            .order_by(ResumeAnalysis.created_at.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_latest_by_resume_id(
        self,
        db: AsyncSession,
        resume_id: UUID,
    ) -> ResumeAnalysis | None:
        query = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.resume_id == resume_id)
            .order_by(ResumeAnalysis.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_with_checks(
        self,
        db: AsyncSession,
        analysis_id: UUID,
    ) -> ResumeAnalysis | None:
        """Fetch an analysis with all its AnalysisCheck records eagerly loaded."""
        query = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.id == analysis_id)
            .options(selectinload(ResumeAnalysis.checks))
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def get_latest_with_checks(
        self,
        db: AsyncSession,
        resume_id: UUID,
    ) -> ResumeAnalysis | None:
        """Fetch the latest analysis for a resume with all checks eagerly loaded."""
        query = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.resume_id == resume_id)
            .options(selectinload(ResumeAnalysis.checks))
            .order_by(ResumeAnalysis.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().first()

    async def find_cached(
        self,
        db: AsyncSession,
        resume_id: UUID,
        resume_version: int,
        analysis_version: str,
    ) -> ResumeAnalysis | None:
        """Find an existing completed analysis for the same resume version."""
        query = (
            select(ResumeAnalysis)
            .where(
                and_(
                    ResumeAnalysis.resume_id == resume_id,
                    ResumeAnalysis.resume_version == resume_version,
                    ResumeAnalysis.analysis_version == analysis_version,
                    ResumeAnalysis.status == "completed",
                )
            )
            .options(selectinload(ResumeAnalysis.checks))
            .order_by(ResumeAnalysis.created_at.desc())
        )
        result = await db.execute(query)
        return result.scalars().first()


analysis_repository = ResumeAnalysisRepository()

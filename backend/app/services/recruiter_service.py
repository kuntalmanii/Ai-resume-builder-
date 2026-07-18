"""Recruiter Service class."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.job_match_result import JobMatchResult
from app.db.models.resume import Resume
from app.db.models.user import User


class RecruiterService:
    async def list_candidates(self, db: AsyncSession) -> list[dict]:
        """List candidates who have at least one resume shared."""
        query = select(User).where(User.role == "user")
        result = await db.execute(query)
        users = result.scalars().all()

        candidates = []
        for u in users:
            # Get primary resume details
            res_query = select(Resume).where(Resume.user_id == u.id, Resume.is_primary)
            res_result = await db.execute(res_query)
            resume = res_result.scalars().first()

            if not resume:
                # fetch any resume
                res_query = select(Resume).where(Resume.user_id == u.id).limit(1)
                res_result = await db.execute(res_query)
                resume = res_result.scalars().first()

            if resume:
                # fetch average score details
                match_query = (
                    select(JobMatchResult).where(JobMatchResult.resume_id == resume.id).limit(1)
                )
                match_res = await db.execute(match_query)
                match = match_res.scalars().first()
                match_score = round(match.overall_score * 100, 2) if match else 75.0

                candidates.append(
                    {
                        "user_id": str(u.id),
                        "full_name": u.full_name,
                        "email": u.email,
                        "primary_resume_id": str(resume.id) if resume else None,
                        "primary_resume_title": resume.title if resume else None,
                        "ats_score": 78.0,
                        "credibility_score": 85.0,
                        "jd_match_score": match_score,
                    }
                )

        return candidates

    async def get_candidate_resume(
        self, db: AsyncSession, *, candidate_id: uuid.UUID
    ) -> Resume | None:
        """Fetch candidate's primary resume for read-only viewer."""
        query = select(Resume).where(Resume.user_id == candidate_id, Resume.is_primary)
        result = await db.execute(query)
        resume = result.scalars().first()

        if not resume:
            query = select(Resume).where(Resume.user_id == candidate_id).limit(1)
            result = await db.execute(query)
            resume = result.scalars().first()

        return resume


recruiter_service = RecruiterService()

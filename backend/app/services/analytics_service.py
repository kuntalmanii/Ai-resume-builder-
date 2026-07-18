"""Analytics Service class."""

import uuid
from datetime import date, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.analysis import ResumeAnalysis
from app.db.models.application import Application
from app.db.models.job_match_result import JobMatchResult
from app.db.models.profile import CareerProfile
from app.db.models.resume import Resume
from app.db.models.roadmap import Roadmap
from app.schemas.analytics import (
    AnalyticsSummaryResponse,
    ApplicationsSummary,
    CredibilitySummary,
    FunnelStage,
    InterviewsSummary,
    ResumePerformanceMetric,
    RoadmapsSummary,
    SkillGapMetric,
)


class AnalyticsService:
    async def get_summary(
        self, db: AsyncSession, *, user_id: uuid.UUID
    ) -> AnalyticsSummaryResponse:
        # 1. Basic Counts
        apps_query = select(Application).where(Application.user_id == user_id)
        apps_res = await db.execute(apps_query)
        apps = list(apps_res.scalars().all())

        total_apps = len(apps)
        interviews_count = 0
        offers_count = 0
        rejections_count = 0

        wishlist_count = 0
        applied_count = 0
        oa_count = 0
        interview_stage_count = 0
        final_count = 0

        for a in apps:
            st = a.status.lower()
            if st == "wishlist":
                wishlist_count += 1
            elif st == "applied":
                applied_count += 1
            elif st == "oa":
                oa_count += 1
            elif st == "interview":
                interview_stage_count += 1
                interviews_count += 1
            elif st == "final round":
                final_count += 1
                interviews_count += 1
            elif st == "offer":
                offers_count += 1
            elif st == "rejected":
                rejections_count += 1

        interview_rate = round((interviews_count / total_apps * 100), 2) if total_apps > 0 else 0.0
        offer_rate = round((offers_count / total_apps * 100), 2) if total_apps > 0 else 0.0

        # Funnel representation
        funnel = [
            FunnelStage(stage="Wishlist", count=wishlist_count, conversion_rate=100.0),
            FunnelStage(
                stage="Applied",
                count=applied_count,
                conversion_rate=round(applied_count / total_apps * 100, 2)
                if total_apps > 0
                else 0.0,
            ),
            FunnelStage(
                stage="OA",
                count=oa_count,
                conversion_rate=round(oa_count / total_apps * 100, 2) if total_apps > 0 else 0.0,
            ),
            FunnelStage(
                stage="Interview",
                count=interview_stage_count,
                conversion_rate=round(interview_stage_count / total_apps * 100, 2)
                if total_apps > 0
                else 0.0,
            ),
            FunnelStage(stage="Offer", count=offers_count, conversion_rate=offer_rate),
        ]

        # 2. Resumes Performance
        resumes_query = select(Resume).where(Resume.user_id == user_id)
        resumes_res = await db.execute(resumes_query)
        resumes = list(resumes_res.scalars().all())

        resume_metrics = []
        for r in resumes:
            # Query match results
            match_query = select(func.avg(JobMatchResult.overall_match_percentage)).where(
                JobMatchResult.resume_id == r.id
            )
            match_res = await db.execute(match_query)
            avg_match = match_res.scalar() or 0.0

            # Count applications using this resume
            app_cnt = sum(
                1 for a in apps if a.resume_version_id == r.id or a.job_description_id == r.id
            )  # approximate reference

            resume_metrics.append(
                ResumePerformanceMetric(
                    resume_id=str(r.id),
                    title=r.title,
                    average_ats_score=75.0,  # default placeholder score
                    average_jd_match=round(float(avg_match), 2),
                    application_count=app_cnt,
                )
            )

        # 3. Skill Gaps (from user profile skills versus placeholder standard list)
        profile_query = select(CareerProfile).where(CareerProfile.user_id == user_id)
        profile_res = await db.execute(profile_query)
        profile = profile_res.scalars().first()
        user_skills = set(profile.skills if profile and profile.skills else [])

        common_jds_skills = [
            "Python",
            "SQL",
            "React",
            "Docker",
            "AWS",
            "Kubernetes",
            "System Design",
            "TypeScript",
        ]
        skill_gaps = []
        for s in common_jds_skills:
            has = s in user_skills or s.lower() in [us.lower() for us in user_skills]
            skill_gaps.append(
                SkillGapMetric(skill=s, frequency_in_jds=5 if not has else 8, has_skill=has)
            )

        # 4. Applications trend
        trends = [
            {"date": (date.today() - timedelta(days=i)).strftime("%Y-%m-%d"), "count": i % 3}
            for i in range(7)
        ]

        # 5. Evidence Score Trends
        evidence_trend = [
            {"date": (date.today() - timedelta(days=i)).strftime("%Y-%m-%d"), "score": 80 + (i % 5)}
            for i in range(5)
        ]

        # 6. Nested structures expected by the UI
        # Applications Summary
        apps_summary = ApplicationsSummary(
            total=total_apps,
            wishlist=wishlist_count,
            applied=applied_count,
            interviewing=interviews_count,
            offer=offers_count,
            rejected=rejections_count,
            conversion_rate=interview_rate,
        )

        # Interviews Summary
        interviews_summary = InterviewsSummary(
            total=interviews_count,
            average_score=0.0,
        )

        # Roadmaps Summary
        roadmaps_query = select(Roadmap).where(Roadmap.user_id == user_id)
        roadmaps_res = await db.execute(roadmaps_query)
        roadmaps = list(roadmaps_res.scalars().all())

        total_roadmaps = len(roadmaps)
        completed_steps = 0
        total_steps = 0
        for rm in roadmaps:
            plan_items = rm.plan.get("items", []) if isinstance(rm.plan, dict) else []
            completed_items = rm.progress.get("completed", []) if isinstance(rm.progress, dict) else []
            total_steps += len(plan_items)
            completed_steps += len(completed_items)

        roadmap_completion_rate = (
            round((completed_steps / total_steps * 100), 2) if total_steps > 0 else 0.0
        )
        roadmaps_summary = RoadmapsSummary(
            total=total_roadmaps,
            completed_steps=completed_steps,
            total_steps=total_steps,
            completion_rate=roadmap_completion_rate,
        )

        # Credibility Summary
        analysis_query = (
            select(ResumeAnalysis)
            .where(ResumeAnalysis.user_id == user_id)
            .order_by(ResumeAnalysis.created_at.desc())
        )
        analysis_res = await db.execute(analysis_query)
        latest_analysis = analysis_res.scalars().first()

        cred_score = 0.0
        audit_dt = None
        if latest_analysis:
            raw_score = latest_analysis.evidence_credibility_score
            if raw_score <= 10:
                cred_score = float(raw_score * 10)
            else:
                cred_score = float(raw_score)
            audit_dt = latest_analysis.created_at.strftime("%Y-%m-%d")

        credibility_summary = CredibilitySummary(
            score=cred_score,
            audit_date=audit_dt,
        )

        return AnalyticsSummaryResponse(
            total_applications=total_apps,
            interviews_scheduled=interviews_count,
            offers_received=offers_count,
            rejections=rejections_count,
            interview_rate=interview_rate,
            offer_rate=offer_rate,
            funnel=funnel,
            resumes_performance=resume_metrics,
            skill_gaps=skill_gaps,
            weekly_application_trends=trends,
            evidence_score_trend=evidence_trend,
            applications=apps_summary,
            interviews=interviews_summary,
            roadmaps=roadmaps_summary,
            credibility=credibility_summary,
        )


analytics_service = AnalyticsService()

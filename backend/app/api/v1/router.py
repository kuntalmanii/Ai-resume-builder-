"""V1 api router aggregator."""

from fastapi import APIRouter

from app.api.v1.endpoints import (
    analyses,
    analytics,
    applications,
    auth,
    cover_letters,
    exports,
    interview_sessions,
    job_descriptions,
    job_matches,
    linkedin,
    notifications,
    observability,
    portfolio,
    profile,
    recruiter,
    resume_imports,
    resumes,
    roadmaps,
    suggestions,
    users,
)

router = APIRouter()

# ─── Observability (no auth required) ────────────────────────────────────────
router.include_router(observability.router)

# ─── Feature routes ───────────────────────────────────────────────────────────
router.include_router(auth.router)
router.include_router(profile.router)
router.include_router(users.router)
router.include_router(resumes.router)
router.include_router(resumes.evidence_router)
router.include_router(exports.router)
router.include_router(job_descriptions.router)
router.include_router(resume_imports.router)
router.include_router(analyses.router)
router.include_router(job_matches.router)
router.include_router(suggestions.router)
router.include_router(applications.router)
router.include_router(cover_letters.router)
router.include_router(linkedin.router)
router.include_router(portfolio.router)
router.include_router(interview_sessions.router)
router.include_router(roadmaps.router)
router.include_router(analytics.router)
router.include_router(notifications.router)
router.include_router(recruiter.router)

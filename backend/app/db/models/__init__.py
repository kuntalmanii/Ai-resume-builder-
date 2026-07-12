"""Models package — import all models here so Alembic can detect them."""
from app.db.models.user import User
from app.db.models.profile import CareerProfile
from app.db.models.resume import Resume
from app.db.models.analysis import ResumeAnalysis
from app.db.models.resume_version import ResumeVersion
from app.db.models.job_description import JobDescription
from app.db.models.analysis_check import AnalysisCheck
from app.db.models.job_match_result import JobMatchResult
from app.db.models.ai_suggestion import AISuggestion
from app.db.models.evidence_source import EvidenceSource

__all__ = [
    "User",
    "CareerProfile",
    "Resume",
    "ResumeAnalysis",
    "ResumeVersion",
    "JobDescription",
    "AnalysisCheck",
    "JobMatchResult",
    "AISuggestion",
    "EvidenceSource",
]

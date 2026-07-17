"""Schemas package."""
from app.schemas.analysis import (
    AnalysisCheckResponse,
    AnalysisHistoryResponse,
    AnalysisSummaryResponse,
    ResumeAnalysisResponse,
    RunAnalysisResponse,
    ScoringMethodologyResponse,
    TopRecommendationSchema,
)
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionResponse,
    JobDescriptionUpdate,
)
from app.schemas.job_match import (
    AISuggestionResponse,
    EvidenceSourceResponse,
    JobMatchMethodologyResponse,
    JobMatchResultResponse,
    JobMatchRunRequest,
)
from app.schemas.job_match_requirements import (
    JobDescriptionRequirement,
    JobDescriptionRequirements,
)
from app.schemas.profile import (
    AchievementEntry,
    CareerProfileResponse,
    CareerProfileUpdate,
    CertificationEntry,
    EducationEntry,
    ExperienceEntry,
    LanguageEntry,
    PositionEntry,
    ProfileSectionPatch,
    ProjectEntry,
    SkillsMap,
)
from app.schemas.resume import (
    ResumeCreate,
    ResumeResponse,
    ResumeUpdate,
    ResumeVersionResponse,
)
from app.schemas.user import UserResponse, UserUpdate

__all__ = [
    "RegisterRequest",
    "LoginRequest",
    "TokenResponse",
    "RefreshRequest",
    "MessageResponse",
    "UserResponse",
    "UserUpdate",
    "CareerProfileResponse",
    "CareerProfileUpdate",
    "ProfileSectionPatch",
    "EducationEntry",
    "ExperienceEntry",
    "ProjectEntry",
    "SkillsMap",
    "CertificationEntry",
    "AchievementEntry",
    "PositionEntry",
    "LanguageEntry",
    "ResumeCreate",
    "ResumeUpdate",
    "ResumeResponse",
    "ResumeVersionResponse",
    "AnalysisCheckResponse",
    "ResumeAnalysisResponse",
    "AnalysisSummaryResponse",
    "AnalysisHistoryResponse",
    "ScoringMethodologyResponse",
    "TopRecommendationSchema",
    "RunAnalysisResponse",
    "JobDescriptionCreate",
    "JobDescriptionUpdate",
    "JobDescriptionResponse",
    "JobMatchResultResponse",
    "EvidenceSourceResponse",
    "AISuggestionResponse",
    "JobMatchRunRequest",
    "JobMatchMethodologyResponse",
    "JobDescriptionRequirement",
    "JobDescriptionRequirements",
]

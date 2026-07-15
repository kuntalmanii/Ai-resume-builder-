"""Schemas package."""
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    MessageResponse,
)
from app.schemas.user import UserResponse, UserUpdate
from app.schemas.profile import (
    CareerProfileResponse,
    CareerProfileUpdate,
    ProfileSectionPatch,
    EducationEntry,
    ExperienceEntry,
    ProjectEntry,
    SkillsMap,
    CertificationEntry,
    AchievementEntry,
    PositionEntry,
    LanguageEntry,
)
from app.schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeResponse,
    ResumeVersionResponse,
)
from app.schemas.analysis import (
    AnalysisCheckResponse,
    ResumeAnalysisResponse,
    AnalysisSummaryResponse,
    AnalysisHistoryResponse,
    ScoringMethodologyResponse,
    TopRecommendationSchema,
    RunAnalysisResponse,
)
from app.schemas.job_description import (
    JobDescriptionCreate,
    JobDescriptionUpdate,
    JobDescriptionResponse,
)
from app.schemas.job_match import (
    JobMatchResultResponse,
    EvidenceSourceResponse,
    AISuggestionResponse,
    JobMatchRunRequest,
    JobMatchMethodologyResponse,
)
from app.schemas.job_match_requirements import (
    JobDescriptionRequirement,
    JobDescriptionRequirements,
)

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

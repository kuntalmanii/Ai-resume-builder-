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
    ScoreDeductionSchema,
    RecommendationSchema,
    AnalysisCheckResponse,
    ResumeAnalysisResponse,
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
    "ScoreDeductionSchema",
    "RecommendationSchema",
    "AnalysisCheckResponse",
    "ResumeAnalysisResponse",
    "JobDescriptionCreate",
    "JobDescriptionUpdate",
    "JobDescriptionResponse",
    "JobMatchResultResponse",
    "EvidenceSourceResponse",
    "AISuggestionResponse",
]

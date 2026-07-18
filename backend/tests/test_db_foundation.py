"""Database foundation tests: ORM constraints, cascades, and unique indexes.

All tests run against an in-memory SQLite database via the conftest fixtures.
"""

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User

pytestmark = pytest.mark.asyncio


# ─── Helpers ──────────────────────────────────────────────────────────────────
async def _create_user(db: AsyncSession, email: str = "test@example.com") -> User:
    from app.core.security import hash_password

    user = User(
        email=email,
        hashed_password=hash_password("TestPass1!"),
        full_name="Test User",
    )
    db.add(user)
    await db.flush()
    return user


# ─── User Model ───────────────────────────────────────────────────────────────
async def test_user_created_with_defaults(db_session: AsyncSession) -> None:
    """User should be persisted with correct defaults."""
    user = await _create_user(db_session)
    assert user.id is not None
    assert user.is_active is True
    assert user.is_verified is False
    assert user.last_login_at is None


async def test_user_email_is_unique(db_session: AsyncSession) -> None:
    """Creating two users with the same email should raise an IntegrityError."""
    from sqlalchemy.exc import IntegrityError

    await _create_user(db_session, email="dup@example.com")
    with pytest.raises(IntegrityError):
        await _create_user(db_session, email="dup@example.com")


# ─── CareerProfile Model ──────────────────────────────────────────────────────
async def test_career_profile_auto_created(db_session: AsyncSession) -> None:
    """CareerProfile can be associated with a user and persisted."""
    from app.db.models.profile import CareerProfile

    user = await _create_user(db_session, email="profile@example.com")
    profile = CareerProfile(user_id=user.id)
    db_session.add(profile)
    await db_session.flush()

    assert profile.id is not None
    assert profile.user_id == user.id
    assert profile.phone is None
    assert profile.education == []
    assert profile.skills == {}


async def test_career_profile_new_fields(db_session: AsyncSession) -> None:
    """New fields (phone, location, links) should persist correctly."""
    from app.db.models.profile import CareerProfile

    user = await _create_user(db_session, email="fields@example.com")
    profile = CareerProfile(
        user_id=user.id,
        phone="+1-555-0100",
        location="San Francisco, CA",
        professional_title="Senior Engineer",
        linkedin_url="https://linkedin.com/in/test",
    )
    db_session.add(profile)
    await db_session.flush()

    fetched = await db_session.get(CareerProfile, profile.id)
    assert fetched.phone == "+1-555-0100"
    assert fetched.professional_title == "Senior Engineer"
    assert fetched.linkedin_url == "https://linkedin.com/in/test"


# ─── Resume Model ─────────────────────────────────────────────────────────────
async def test_resume_created_with_defaults(db_session: AsyncSession) -> None:
    """Resume should be created with correct default values."""
    from app.db.models.resume import Resume

    user = await _create_user(db_session, email="resume@example.com")
    resume = Resume(user_id=user.id, title="My Resume")
    db_session.add(resume)
    await db_session.flush()

    assert resume.id is not None
    assert resume.status == "draft"
    assert resume.is_primary is False
    assert resume.source_type == "scratch"
    assert resume.version == 1
    assert resume.last_analyzed_at is None


# ─── ResumeVersion Unique Constraint ──────────────────────────────────────────
async def test_resume_version_unique_constraint(db_session: AsyncSession) -> None:
    """Two versions with the same (resume_id, version_number) should fail."""
    from sqlalchemy.exc import IntegrityError

    from app.db.models.resume import Resume
    from app.db.models.resume_version import ResumeVersion

    user = await _create_user(db_session, email="version@example.com")
    resume = Resume(user_id=user.id, title="Versioned Resume")
    db_session.add(resume)
    await db_session.flush()

    v1 = ResumeVersion(
        resume_id=resume.id, version_number=1, content_snapshot={"data": "v1"}
    )
    db_session.add(v1)
    await db_session.flush()

    v1_dup = ResumeVersion(
        resume_id=resume.id, version_number=1, content_snapshot={"data": "v1-dup"}
    )
    db_session.add(v1_dup)
    with pytest.raises(IntegrityError):
        await db_session.flush()


# ─── JobDescription Model ─────────────────────────────────────────────────────
async def test_job_description_created(db_session: AsyncSession) -> None:
    """JobDescription should be created and linked to user."""
    from app.db.models.job_description import JobDescription

    user = await _create_user(db_session, email="jd@example.com")
    jd = JobDescription(
        user_id=user.id,
        title="Software Engineer",
        company="Acme Corp",
        raw_text="We are looking for a software engineer...",
    )
    db_session.add(jd)
    await db_session.flush()

    assert jd.id is not None
    assert jd.source_type == "manual"
    assert jd.title == "Software Engineer"


# ─── Cascade Deletion ─────────────────────────────────────────────────────────
async def test_resume_cascade_deletes_versions(db_session: AsyncSession) -> None:
    """Deleting a Resume should cascade-delete its ResumeVersions."""
    from app.db.models.resume import Resume
    from app.db.models.resume_version import ResumeVersion

    user = await _create_user(db_session, email="cascade@example.com")
    resume = Resume(user_id=user.id, title="Cascade Test Resume")
    db_session.add(resume)
    await db_session.flush()

    version = ResumeVersion(
        resume_id=resume.id, version_number=1, content_snapshot={"data": "v1"}
    )
    db_session.add(version)
    await db_session.flush()
    version_id = version.id

    await db_session.delete(resume)
    await db_session.flush()

    fetched_version = await db_session.get(ResumeVersion, version_id)
    assert fetched_version is None, "ResumeVersion should be cascade-deleted with its Resume"


# ─── AISuggestion & EvidenceSource ───────────────────────────────────────────
async def test_ai_suggestion_and_evidence_source(db_session: AsyncSession) -> None:
    """AISuggestion can be created with EvidenceSource children."""
    from app.db.models.ai_suggestion import AISuggestion
    from app.db.models.evidence_source import EvidenceSource
    from app.db.models.resume import Resume

    user = await _create_user(db_session, email="aisugg@example.com")
    resume = Resume(user_id=user.id, title="AI Test Resume")
    db_session.add(resume)
    await db_session.flush()

    suggestion = AISuggestion(
        resume_id=resume.id,
        suggestion_type="keyword_add",
        section_type="experience",
        original_content="Worked on projects.",
        suggested_content="Led cross-functional projects delivering 30% efficiency gains.",
        confidence=0.92,
    )
    db_session.add(suggestion)
    await db_session.flush()

    evidence = EvidenceSource(
        ai_suggestion_id=suggestion.id,
        label="Identified from career profile experience section",
        source_type="career_profile",
        verified=True,
    )
    db_session.add(evidence)
    await db_session.flush()

    assert evidence.id is not None
    assert evidence.verified is True
    assert evidence.ai_suggestion_id == suggestion.id

"""Resume Service layer — handles core CRUD, ownership checks, version snapshotting, and concurrency control."""
import uuid
import copy
from typing import Any
from datetime import datetime, timezone

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.resume import Resume
from app.db.models.resume_version import ResumeVersion
from app.schemas.resume import ResumeCreate, ResumeUpdate, ResumeDocument
from app.core.exceptions import ResourceNotFoundError, ConflictError


async def get_resume_by_id_raw(db: AsyncSession, resume_id: uuid.UUID) -> Resume | None:
    """Fetch a resume object directly from DB by its primary key ID."""
    result = await db.execute(
        select(Resume).where(Resume.id == resume_id).options(selectinload(Resume.analyses))
    )
    return result.scalar_one_or_none()


async def get_resume(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
    """Fetch resume and enforce user ownership.

    Returns 404 (ResourceNotFoundError) on ownership mismatch for security
    to prevent resource enumeration timing or id attacks.
    """
    resume = await get_resume_by_id_raw(db, resume_id)
    if not resume:
        raise ResourceNotFoundError("Resume not found")
    if resume.user_id != user_id:
        raise ResourceNotFoundError("Resume not found")
    return resume


async def get_resumes(
    db: AsyncSession,
    user_id: uuid.UUID,
    search: str | None = None,
    status: str | None = None,
    sort_by: str | None = "updated_at",
    sort_order: str | None = "desc",
    limit: int | None = None,
    offset: int | None = None,
) -> list[Resume]:
    """Fetch all resumes belonging to user, supporting search, status filtering, sorting, and pagination."""
    stmt = select(Resume).where(Resume.user_id == user_id).options(selectinload(Resume.analyses))

    if search:
        stmt = stmt.where(Resume.title.ilike(f"%{search}%"))
    if status:
        stmt = stmt.where(Resume.status == status)

    # Simple sorting resolver
    order_col = Resume.updated_at
    if sort_by == "created_at":
        order_col = Resume.created_at
    elif sort_by == "title":
        order_col = Resume.title

    if sort_order == "asc":
        stmt = stmt.order_by(order_col.asc())
    else:
        stmt = stmt.order_by(order_col.desc())

    if limit is not None:
        stmt = stmt.limit(limit)
    if offset is not None:
        stmt = stmt.offset(offset)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_resume(db: AsyncSession, user_id: uuid.UUID, payload: ResumeCreate) -> Resume:
    """Create a new resume. Automatically handles primary settings and default template structured schema."""
    # Check if this is the user's first resume
    existing_resumes = await get_resumes(db, user_id)
    is_first = len(existing_resumes) == 0

    is_primary = payload.is_primary or is_first

    # If setting to primary, unset previous primary
    if is_primary and not is_first:
        await db.execute(
            update(Resume).where(Resume.user_id == user_id, Resume.is_primary == True).values(is_primary=False)
        )

    # Use default content template if empty
    default_content = {
        "personal_information": {
            "full_name": "",
            "email": "",
            "phone": "",
            "location": "",
            "professional_title": "",
            "linkedin_url": "",
            "github_url": "",
            "portfolio_url": "",
        },
        "professional_summary": "",
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "achievements": [],
        "positions_of_responsibility": [],
        "languages": [],
        "interests": [],
        "section_order": [
            "personal_information",
            "professional_summary",
            "education",
            "experience",
            "projects",
            "skills",
            "certifications",
            "achievements",
            "positions_of_responsibility",
            "languages",
            "interests",
        ],
    }

    content_dict = payload.content.model_dump() if payload.content else default_content

    resume = Resume(
        user_id=user_id,
        title=payload.title,
        template_id=payload.template_id or "modern",
        content=content_dict,
        raw_text=payload.raw_text,
        status=payload.status or "draft",
        is_primary=is_primary,
        source_type=payload.source_type or "scratch",
        version=1,
        is_base=True,
    )
    db.add(resume)
    await db.flush()  # flush to generate ID

    # Create initial version snapshot
    snapshot = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        content_snapshot=content_dict,
        change_reason="Initial creation snapshot",
    )
    db.add(snapshot)

    await db.commit()
    await db.refresh(resume)
    return resume


async def update_resume(
    db: AsyncSession,
    resume_id: uuid.UUID,
    user_id: uuid.UUID,
    payload: ResumeUpdate,
    change_reason: str | None = None,
    expected_version: int | None = None,
) -> Resume:
    """Update resume metadata or content. Implements Optimistic Concurrency Control checking."""
    resume = await get_resume(db, resume_id, user_id)

    # Optimistic concurrency check
    if expected_version is not None and resume.version != expected_version:
        raise ConflictError("Version conflict: resume state has diverged", details="RESUME_VERSION_CONFLICT")

    update_data = payload.model_dump(exclude_unset=True)

    # Detect if content is changing
    if "content" in update_data:
        if update_data["content"] is not None:
            # Check if snapshot for the current version already exists to prevent duplicate key violations
            existing_snapshot = await db.scalar(
                select(ResumeVersion).where(
                    ResumeVersion.resume_id == resume.id,
                    ResumeVersion.version_number == resume.version
                )
            )
            if not existing_snapshot:
                snapshot = ResumeVersion(
                    resume_id=resume.id,
                    version_number=resume.version,
                    content_snapshot=resume.content,
                    change_reason=change_reason or "Autosave snapshot",
                )
                db.add(snapshot)
            else:
                existing_snapshot.content_snapshot = resume.content
                existing_snapshot.change_reason = change_reason or existing_snapshot.change_reason
                db.add(existing_snapshot)
            
            # Increment active version number
            resume.version += 1
            
            # Dump document back to dictionary format for JSONB column
            if isinstance(update_data["content"], ResumeDocument):
                resume.content = update_data["content"].model_dump()
            else:
                resume.content = update_data["content"]
        
        del update_data["content"]

    # Update remaining metadata fields
    for field, value in update_data.items():
        if field == "is_primary" and value is True:
            # Setting to primary unsets all other user resumes
            await db.execute(
                update(Resume)
                .where(Resume.user_id == user_id, Resume.id != resume.id, Resume.is_primary == True)
                .values(is_primary=False)
            )
        setattr(resume, field, value)

    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def delete_resume(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Delete resume. If deleted resume was primary, promotes another resume if available."""
    resume = await get_resume(db, resume_id, user_id)
    was_primary = resume.is_primary

    await db.delete(resume)
    await db.flush()

    if was_primary:
        # Promote the most recently updated resume to primary
        remaining = await get_resumes(db, user_id, sort_by="updated_at", sort_order="desc")
        if remaining:
            remaining[0].is_primary = True
            db.add(remaining[0])

    await db.commit()


async def duplicate_resume(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
    """Deep-copies content of an existing resume to a new duplicate entry."""
    resume = await get_resume(db, resume_id, user_id)

    # Perform deep-copy of content dict
    content_copy = copy.deepcopy(resume.content)

    new_title = f"{resume.title} — Copy"
    # Ensure length constraint isn't breached
    if len(new_title) > 255:
        new_title = new_title[:250] + "..."

    dup = Resume(
        user_id=user_id,
        title=new_title,
        template_id=resume.template_id,
        content=content_copy,
        raw_text=resume.raw_text,
        status="draft",
        is_primary=False,
        source_type="duplicated",
        version=1,
        is_base=False,
    )
    db.add(dup)
    await db.flush()

    # Create initial version snapshot for duplicate
    snapshot = ResumeVersion(
        resume_id=dup.id,
        version_number=1,
        content_snapshot=content_copy,
        change_reason=f"Initial snapshot of duplication from resume {resume_id}",
    )
    db.add(snapshot)

    await db.commit()
    await db.refresh(dup)
    return dup


async def set_primary_resume(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
    """Force sets a single resume as primary and updates any prior primary flags."""
    resume = await get_resume(db, resume_id, user_id)
    
    # Unset previous primary resume
    await db.execute(
        update(Resume)
        .where(Resume.user_id == user_id, Resume.id != resume.id, Resume.is_primary == True)
        .values(is_primary=False)
    )

    resume.is_primary = True
    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume


async def get_versions(db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> list[ResumeVersion]:
    """Retrieve all historical version snapshots for a resume."""
    # Enforce ownership check first
    await get_resume(db, resume_id, user_id)

    result = await db.execute(
        select(ResumeVersion)
        .where(ResumeVersion.resume_id == resume_id)
        .order_by(ResumeVersion.version_number.desc())
    )
    return list(result.scalars().all())


async def get_version(
    db: AsyncSession, resume_id: uuid.UUID, version_number: int, user_id: uuid.UUID
) -> ResumeVersion:
    """Retrieve a single historical version snapshot if parent resume is owned."""
    # Check parent resume ownership
    await get_resume(db, resume_id, user_id)

    result = await db.execute(
        select(ResumeVersion).where(
            ResumeVersion.resume_id == resume_id,
            ResumeVersion.version_number == version_number,
        )
    )
    version = result.scalar_one_or_none()
    if not version:
        raise ResourceNotFoundError(f"Version snapshot {version_number} not found")
    return version


async def create_manual_version(
    db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID, change_reason: str | None = None
) -> ResumeVersion:
    """Manually triggers a new version snapshot of the current active resume content."""
    resume = await get_resume(db, resume_id, user_id)

    # Current state snapshot
    snapshot = ResumeVersion(
        resume_id=resume.id,
        version_number=resume.version,
        content_snapshot=resume.content,
        change_reason=change_reason or "Manual checkpoint snapshot",
    )
    db.add(snapshot)

    # Increment active version
    resume.version += 1
    db.add(resume)

    await db.commit()
    await db.refresh(snapshot)
    return snapshot


async def restore_version(
    db: AsyncSession, resume_id: uuid.UUID, version_number: int, user_id: uuid.UUID
) -> Resume:
    """Restore resume content to a historical version, creating a new history node."""
    resume = await get_resume(db, resume_id, user_id)
    historical_version = await get_version(db, resume_id, version_number, user_id)

    # Save CURRENT content as a new snapshot history node first
    snapshot = ResumeVersion(
        resume_id=resume.id,
        version_number=resume.version,
        content_snapshot=resume.content,
        change_reason=f"Auto-snapshot before restoring version {version_number}",
    )
    db.add(snapshot)

    # Update active content & version
    resume.content = historical_version.content_snapshot
    resume.version += 1

    db.add(resume)
    await db.commit()
    await db.refresh(resume)
    return resume

"""Profile service: CRUD operations for Career Profile."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.profile import CareerProfile
from app.schemas.profile import CareerProfileUpdate


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> CareerProfile | None:
    result = await db.execute(select(CareerProfile).where(CareerProfile.user_id == user_id))
    return result.scalar_one_or_none()


async def get_or_create_profile(db: AsyncSession, user_id: uuid.UUID) -> CareerProfile:
    profile = await get_profile(db, user_id)
    if not profile:
        profile = CareerProfile(user_id=user_id)
        db.add(profile)
        await db.commit()
        await db.refresh(profile)
    return profile


async def update_profile(
    db: AsyncSession, user_id: uuid.UUID, payload: CareerProfileUpdate
) -> CareerProfile:
    profile = await get_or_create_profile(db, user_id)

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None:
            # Convert Pydantic sub-models to dicts for JSONB storage
            if isinstance(value, list):
                setattr(
                    profile,
                    field,
                    [item.model_dump() if hasattr(item, "model_dump") else item for item in value],
                )
            elif hasattr(value, "model_dump"):
                setattr(profile, field, value.model_dump())
            else:
                setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile


async def patch_profile_section(
    db: AsyncSession, user_id: uuid.UUID, section: str, data: object
) -> CareerProfile:
    """Patch a single named section of the career profile."""
    from fastapi import HTTPException

    allowed_sections = {
        "education",
        "experience",
        "projects",
        "skills",
        "certifications",
        "achievements",
        "positions_of_responsibility",
        "languages",
        "interests",
    }
    if section not in allowed_sections:
        raise HTTPException(status_code=400, detail=f"Unknown section: {section}")

    profile = await get_or_create_profile(db, user_id)
    if hasattr(data, "model_dump"):
        setattr(profile, section, data.model_dump())  # type: ignore[arg-type]
    elif isinstance(data, list):
        setattr(
            profile,
            section,
            [item.model_dump() if hasattr(item, "model_dump") else item for item in data],
        )
    else:
        setattr(profile, section, data)

    await db.commit()
    await db.refresh(profile)
    return profile


async def get_combined_profile(db: AsyncSession, user_id: uuid.UUID) -> dict:
    """Retrieve metadata and structured entries dynamically grouped into the profile
    response format."""
    from app.services import career_entry_service

    profile = await get_or_create_profile(db, user_id)
    entries = await career_entry_service.get_career_entries(db, user_id)

    from typing import Any
    profile_dict: dict[str, Any] = {
        "id": profile.id,
        "user_id": profile.user_id,
        "phone": profile.phone,
        "location": profile.location,
        "professional_title": profile.professional_title,
        "professional_summary": profile.professional_summary,
        "linkedin_url": profile.linkedin_url,
        "github_url": profile.github_url,
        "portfolio_url": profile.portfolio_url,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
        "education": [],
        "experience": [],
        "projects": [],
        "skills": {"technical": [], "soft": [], "tools": [], "languages_prog": []},
        "certifications": [],
        "achievements": [],
        "positions_of_responsibility": [],
        "languages": [],
        "interests": [],
    }

    # Group entries by type to construct legacy layout structures dynamically
    for entry in entries:
        if entry.entry_type == "education":
            profile_dict["education"].append(
                {
                    "institution": entry.organization,
                    "degree": entry.title,
                    "field_of_study": entry.data.get("field_of_study", ""),
                    "start_date": entry.start_date or "",
                    "end_date": entry.end_date or "",
                    "gpa": entry.data.get("grade", "")
                    or entry.data.get("gpa", "")
                    or entry.data.get("grade", ""),
                    "description": entry.data.get("description", ""),
                    "is_current": entry.is_current,
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type in ("work_experience", "internship"):
            profile_dict["experience"].append(
                {
                    "company": entry.organization,
                    "title": entry.title,
                    "location": entry.data.get("location", ""),
                    "start_date": entry.start_date or "",
                    "end_date": entry.end_date or "",
                    "is_current": entry.is_current,
                    "description": entry.data.get("description", ""),
                    "bullet_points": entry.data.get("bullets", [])
                    or entry.data.get("bullet_points", []),
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "project":
            profile_dict["projects"].append(
                {
                    "name": entry.title,
                    "description": entry.data.get("description", ""),
                    "technologies": entry.data.get("technologies", []),
                    "url": entry.data.get("url", ""),
                    "github_url": entry.data.get("github_url", ""),
                    "start_date": entry.start_date or "",
                    "end_date": entry.end_date or "",
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "technical_skill":
            profile_dict["skills"]["technical"].append(entry.title)
        elif entry.entry_type == "soft_skill":
            profile_dict["skills"]["soft"].append(entry.title)
        elif entry.entry_type == "certification":
            profile_dict["certifications"].append(
                {
                    "name": entry.title,
                    "issuer": entry.organization,
                    "issue_date": entry.start_date or "",
                    "expiry_date": entry.end_date or "",
                    "credential_id": entry.data.get("credential_id", ""),
                    "url": entry.data.get("credential_url", "") or entry.data.get("url", ""),
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "achievement":
            profile_dict["achievements"].append(
                {
                    "title": entry.title,
                    "description": entry.data.get("description", ""),
                    "date": entry.start_date or "",
                    "issuer": entry.organization,
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "position_of_responsibility":
            profile_dict["positions_of_responsibility"].append(
                {
                    "role": entry.title,
                    "organization": entry.organization,
                    "start_date": entry.start_date or "",
                    "end_date": entry.end_date or "",
                    "description": entry.data.get("description", "")
                    or "\n".join(entry.data.get("bullets", [])),
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "language":
            profile_dict["languages"].append(
                {
                    "language": entry.title,
                    "proficiency": entry.data.get("proficiency", ""),
                    "id": str(entry.id),
                    "verification_status": entry.verification_status,
                }
            )
        elif entry.entry_type == "interest":
            profile_dict["interests"].append(entry.title)

    return profile_dict

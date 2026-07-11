"""Profile service: CRUD operations for Career Profile."""
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.profile import CareerProfile
from app.schemas.profile import CareerProfileUpdate


async def get_profile(db: AsyncSession, user_id: uuid.UUID) -> CareerProfile | None:
    result = await db.execute(
        select(CareerProfile).where(CareerProfile.user_id == user_id)
    )
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
                setattr(profile, field, [
                    item.model_dump() if hasattr(item, "model_dump") else item
                    for item in value
                ])
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
        "education", "experience", "projects", "skills",
        "certifications", "achievements", "positions_of_responsibility",
        "languages", "interests",
    }
    if section not in allowed_sections:
        raise HTTPException(status_code=400, detail=f"Unknown section: {section}")

    profile = await get_or_create_profile(db, user_id)
    if hasattr(data, "model_dump"):
        setattr(profile, section, data.model_dump())  # type: ignore[arg-type]
    elif isinstance(data, list):
        setattr(profile, section, [
            item.model_dump() if hasattr(item, "model_dump") else item
            for item in data
        ])
    else:
        setattr(profile, section, data)

    await db.commit()
    await db.refresh(profile)
    return profile

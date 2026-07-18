"""Career Entry Service layer — handles CRUD, ownership checks, and status confirmation
for profile entries."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError
from app.db.models.career_entry import CareerEntry
from app.schemas.career_entry import CareerEntryCreate, CareerEntryUpdate


async def get_career_entry_by_id_raw(db: AsyncSession, entry_id: uuid.UUID) -> CareerEntry | None:
    """Fetch a career entry object directly from DB."""
    result = await db.execute(select(CareerEntry).where(CareerEntry.id == entry_id))
    return result.scalar_one_or_none()


async def get_career_entry(
    db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID
) -> CareerEntry:
    """Fetch entry and enforce user ownership.

    Returns 404 (ResourceNotFoundError) on ownership mismatch for security
    to prevent resource enumeration.
    """
    entry = await get_career_entry_by_id_raw(db, entry_id)
    if not entry:
        raise ResourceNotFoundError("Career entry not found")
    if entry.user_id != user_id:
        raise ResourceNotFoundError("Career entry not found")
    return entry


async def get_career_entries(
    db: AsyncSession, user_id: uuid.UUID, entry_type: str | None = None
) -> list[CareerEntry]:
    """Retrieve user-owned career entries, optionally filtered by type."""
    stmt = select(CareerEntry).where(CareerEntry.user_id == user_id)
    if entry_type:
        stmt = stmt.where(CareerEntry.entry_type == entry_type)

    stmt = stmt.order_by(CareerEntry.created_at.desc())
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_career_entry(
    db: AsyncSession, user_id: uuid.UUID, payload: CareerEntryCreate
) -> CareerEntry:
    """Create a new career entry. Forces status to unverified."""
    entry = CareerEntry(
        user_id=user_id,
        entry_type=payload.entry_type,
        title=payload.title,
        organization=payload.organization,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=payload.is_current,
        data=payload.data,
        verification_status="unverified",
        source_type=payload.source_type,
    )
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def update_career_entry(
    db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID, payload: CareerEntryUpdate
) -> CareerEntry:
    """Update career entry fields. Enforces source_verified record immutability."""
    from app.core.exceptions import ValidationError

    entry = await get_career_entry(db, entry_id, user_id)

    if entry.verification_status == "source_verified":
        raise ValidationError(
            "Cannot edit source-verified records", details="SOURCE_VERIFIED_IMMUTABLE"
        )

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(entry, field, value)

    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def delete_career_entry(db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID) -> None:
    """Delete owned career entry. Enforces source_verified record immutability."""
    from app.core.exceptions import ValidationError

    entry = await get_career_entry(db, entry_id, user_id)

    if entry.verification_status == "source_verified":
        raise ValidationError(
            "Cannot delete source-verified records", details="SOURCE_VERIFIED_IMMUTABLE"
        )

    await db.delete(entry)
    await db.commit()


async def confirm_career_entry(
    db: AsyncSession, entry_id: uuid.UUID, user_id: uuid.UUID
) -> CareerEntry:
    """Promotes manually created unverified entries to user_confirmed state."""
    entry = await get_career_entry(db, entry_id, user_id)
    if entry.verification_status == "unverified":
        entry.verification_status = "user_confirmed"
        db.add(entry)
        await db.commit()
        await db.refresh(entry)
    return entry

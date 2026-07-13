"""Profile router: CRUD operations for Career Profile metadata and structured entries."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.profile import CareerProfileResponse, CareerProfileUpdate
from app.schemas.career_entry import (
    CareerEntryCreate,
    CareerEntryUpdate,
    CareerEntryResponse,
)
from app.services import profile_service, career_entry_service

router = APIRouter(prefix="/career-profile", tags=["Career Profile"])


@router.get("", response_model=CareerProfileResponse)
async def get_profile(current_user: CurrentUser, db: DBSession) -> CareerProfileResponse:
    """Get the authenticated user's career profile (metadata + grouped structured entries)."""
    profile_data = await profile_service.get_combined_profile(db, current_user.id)
    return CareerProfileResponse.model_validate(profile_data)


@router.patch("", response_model=CareerProfileResponse)
async def update_profile_metadata(
    payload: CareerProfileUpdate, current_user: CurrentUser, db: DBSession
) -> CareerProfileResponse:
    """Update profile metadata fields (phone, location, summary, urls)."""
    # Enforce updating only metadata keys by clearing legacy json fields if any are sent
    payload.education = None
    payload.experience = None
    payload.projects = None
    payload.skills = None
    payload.certifications = None
    payload.achievements = None
    payload.positions_of_responsibility = None
    payload.languages = None
    payload.interests = None

    await profile_service.update_profile(db, current_user.id, payload)
    
    # Return refreshed combined dictionary
    profile_data = await profile_service.get_combined_profile(db, current_user.id)
    return CareerProfileResponse.model_validate(profile_data)


@router.post("/entries", response_model=CareerEntryResponse, status_code=status.HTTP_201_CREATED)
async def create_career_entry(
    payload: CareerEntryCreate, current_user: CurrentUser, db: DBSession
) -> CareerEntryResponse:
    """Create a new structured career entry (e.g. education, experience, skill)."""
    entry = await career_entry_service.create_career_entry(db, current_user.id, payload)
    return CareerEntryResponse.model_validate(entry)


@router.get("/entries", response_model=list[CareerEntryResponse])
async def list_career_entries(
    current_user: CurrentUser,
    db: DBSession,
    entry_type: Annotated[str | None, Query(description="Filter by entry type")] = None,
) -> list[CareerEntryResponse]:
    """Retrieve all structured career entries for the authenticated user, optionally filtered by type."""
    entries = await career_entry_service.get_career_entries(db, current_user.id, entry_type=entry_type)
    return [CareerEntryResponse.model_validate(e) for e in entries]


@router.get("/entries/{entry_id}", response_model=CareerEntryResponse)
async def get_career_entry(
    entry_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> CareerEntryResponse:
    """Fetch details of a specific career entry. Enforces user ownership."""
    entry = await career_entry_service.get_career_entry(db, entry_id, current_user.id)
    return CareerEntryResponse.model_validate(entry)


@router.patch("/entries/{entry_id}", response_model=CareerEntryResponse)
async def update_career_entry(
    entry_id: uuid.UUID,
    payload: CareerEntryUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> CareerEntryResponse:
    """Update properties of a structured career entry. Enforces user ownership."""
    entry = await career_entry_service.update_career_entry(db, entry_id, current_user.id, payload)
    return CareerEntryResponse.model_validate(entry)


@router.delete("/entries/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_career_entry(
    entry_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> None:
    """Delete a structured career entry. Enforces user ownership."""
    await career_entry_service.delete_career_entry(db, entry_id, current_user.id)


@router.post("/entries/{entry_id}/confirm", response_model=CareerEntryResponse)
async def confirm_career_entry(
    entry_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> CareerEntryResponse:
    """Confirm a manually entered career entry, promoting verification status from unverified to user_confirmed."""
    entry = await career_entry_service.confirm_career_entry(db, entry_id, current_user.id)
    return CareerEntryResponse.model_validate(entry)

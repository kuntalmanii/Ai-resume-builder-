"""Profile router: get and update career profile."""
from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.profile import CareerProfileResponse, CareerProfileUpdate, ProfileSectionPatch
from app.services import profile_service

router = APIRouter(prefix="/profile", tags=["Career Profile"])


@router.get("", response_model=CareerProfileResponse)
async def get_profile(current_user: CurrentUser, db: DBSession) -> CareerProfileResponse:
    """Get the authenticated user's full career profile."""
    profile = await profile_service.get_or_create_profile(db, current_user.id)
    return CareerProfileResponse.model_validate(profile)


@router.put("", response_model=CareerProfileResponse)
async def update_profile(
    payload: CareerProfileUpdate, current_user: CurrentUser, db: DBSession
) -> CareerProfileResponse:
    """Replace entire career profile sections that are provided."""
    profile = await profile_service.update_profile(db, current_user.id, payload)
    return CareerProfileResponse.model_validate(profile)


@router.patch("/section/{section_name}", response_model=CareerProfileResponse)
async def patch_section(
    section_name: str,
    payload: ProfileSectionPatch,
    current_user: CurrentUser,
    db: DBSession,
) -> CareerProfileResponse:
    """Update a single named section of the career profile."""
    profile = await profile_service.patch_profile_section(
        db, current_user.id, section_name, payload.data
    )
    return CareerProfileResponse.model_validate(profile)

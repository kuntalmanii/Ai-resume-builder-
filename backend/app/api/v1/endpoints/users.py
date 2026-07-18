"""Users router: current user info and updates."""

from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.user import UserResponse, UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Return the authenticated user's profile info."""
    return UserResponse.model_validate(current_user)


@router.patch("/me", response_model=UserResponse)
async def update_me(payload: UserUpdate, current_user: CurrentUser, db: DBSession) -> UserResponse:
    """Update basic user info (full name)."""
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)

"""Auth router: register, login, refresh, logout, account deletion."""
from fastapi import APIRouter, Response, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserResponse
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: DBSession) -> UserResponse:
    """Register a new user account. Auto-creates an empty career profile."""
    user = await auth_service.register_user(db, payload)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBSession) -> TokenResponse:
    """Authenticate and return access + refresh tokens."""
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    tokens = auth_service.generate_token_pair(user.id)
    return TokenResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        expires_in=tokens["expires_in"],  # type: ignore[arg-type]
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest, db: DBSession) -> TokenResponse:
    """Issue a new access token using a valid refresh token."""
    tokens = await auth_service.refresh_access_token(db, payload.refresh_token)
    return TokenResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        expires_in=tokens["expires_in"],  # type: ignore[arg-type]
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser) -> MessageResponse:
    """Logout — client must discard tokens. Server-side token blacklisting is Sprint 4."""
    return MessageResponse(message="Logged out successfully")


@router.delete("/account", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_account(current_user: CurrentUser, db: DBSession) -> MessageResponse:
    """Permanently delete account and all user data (GDPR compliance)."""
    await auth_service.delete_user_account(db, current_user)
    return MessageResponse(message="Account and all associated data have been permanently deleted")

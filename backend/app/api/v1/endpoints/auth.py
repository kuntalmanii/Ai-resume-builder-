"""Auth router: register, login, refresh, logout, account deletion, and current user info."""
from fastapi import APIRouter, Response, status, Cookie, Body

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
async def login(
    payload: LoginRequest,
    db: DBSession,
    response: Response,
) -> TokenResponse:
    """Authenticate and return access + refresh tokens, setting secure refresh cookie."""
    user = await auth_service.authenticate_user(db, payload.email, payload.password)
    tokens = auth_service.generate_token_pair(user.id)
    
    from app.core.config import get_settings
    settings = get_settings()
    is_prod = settings.APP_ENV == "production"

    response.set_cookie(
        key="refresh_token",
        value=str(tokens["refresh_token"]),
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=is_prod,
    )

    return TokenResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        expires_in=tokens["expires_in"],  # type: ignore[arg-type]
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    db: DBSession,
    response: Response,
    payload: RefreshRequest | None = Body(None),
    refresh_token: str | None = Cookie(None),
) -> TokenResponse:
    """Issue a new access token using a valid refresh token from cookie or payload."""
    token = refresh_token or (payload.refresh_token if payload else None)
    if not token:
        from app.core.exceptions import ValidationError
        raise ValidationError("Refresh token missing")

    tokens = await auth_service.refresh_access_token(db, token)

    from app.core.config import get_settings
    settings = get_settings()
    is_prod = settings.APP_ENV == "production"

    response.set_cookie(
        key="refresh_token",
        value=str(tokens["refresh_token"]),
        httponly=True,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        expires=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        samesite="lax",
        secure=is_prod,
    )

    return TokenResponse(
        access_token=tokens["access_token"],  # type: ignore[arg-type]
        refresh_token=tokens["refresh_token"],  # type: ignore[arg-type]
        expires_in=tokens["expires_in"],  # type: ignore[arg-type]
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: CurrentUser, response: Response) -> MessageResponse:
    """Logout — clear browser cookies and return success."""
    response.delete_cookie(key="refresh_token", samesite="lax")
    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser) -> UserResponse:
    """Return the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.delete("/account", response_model=MessageResponse, status_code=status.HTTP_200_OK)
async def delete_account(current_user: CurrentUser, db: DBSession) -> MessageResponse:
    """Permanently delete account and all user data (GDPR compliance)."""
    await auth_service.delete_user_account(db, current_user)
    return MessageResponse(message="Account and all associated data have been permanently deleted")

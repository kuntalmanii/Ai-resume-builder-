"""Auth service: registration, login, token refresh, account deletion."""
import uuid
from datetime import datetime, timezone

from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.models.profile import CareerProfile
from app.db.models.user import User
from app.schemas.auth import RegisterRequest
from app.core.exceptions import (
    ConflictError,
    UnauthorizedError,
    ForbiddenError,
)


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def register_user(db: AsyncSession, payload: RegisterRequest) -> User:
    """Create a new user and an empty career profile."""
    existing = await get_user_by_email(db, payload.email)
    if existing:
        raise ConflictError("An account with this email already exists")

    user = User(
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    db.add(user)
    await db.flush()  # get user.id before profile creation

    # Auto-create empty career profile
    profile = CareerProfile(user_id=user.id)
    db.add(profile)
    await db.commit()
    await db.refresh(user)
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Authenticate credentials. Raises UnauthorizedError/ForbiddenError on failure."""
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise UnauthorizedError("Incorrect email or password")
    if not user.is_active:
        raise ForbiddenError("Account is disabled")
    return user


def generate_token_pair(user_id: uuid.UUID) -> dict[str, str | int]:
    """Return access + refresh token dict."""
    from app.core.config import get_settings
    settings = get_settings()
    return {
        "access_token": create_access_token(str(user_id)),
        "refresh_token": create_refresh_token(str(user_id)),
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


async def refresh_access_token(db: AsyncSession, refresh_token: str) -> dict[str, str | int]:
    """Validate refresh token and issue a new access token."""
    try:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type")
        user_id = uuid.UUID(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise UnauthorizedError("Invalid or expired refresh token")

    user = await get_user_by_id(db, user_id)
    if not user or not user.is_active:
        raise UnauthorizedError("User not found")

    return generate_token_pair(user.id)


async def delete_user_account(db: AsyncSession, user: User) -> None:
    """Permanently delete user and all associated data (GDPR)."""
    await db.delete(user)
    await db.commit()

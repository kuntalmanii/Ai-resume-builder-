"""Health check and auth endpoint integration tests.

These run against the in-memory SQLite test database configured in conftest.py.
No live PostgreSQL is needed.
"""

from datetime import UTC

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


async def test_root_health(client: AsyncClient) -> None:
    """Root /health endpoint should return 200 with status=healthy."""
    response = await client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["service"] == "CareerOS AI API"


async def test_v1_health(client: AsyncClient) -> None:
    """API v1 /health endpoint should return 200 (or 503 in degraded state)."""
    response = await client.get("/api/v1/health")
    assert response.status_code in (200, 503)
    body = response.json()
    assert "status" in body
    assert "checks" in body


async def test_register_creates_user(client: AsyncClient) -> None:
    """Registering a new user returns 201 with user data."""
    response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Alice Smith",
            "email": "alice@example.com",
            "password": "Testpass1!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert data["full_name"] == "Alice Smith"
    assert "hashed_password" not in data


async def test_register_duplicate_email_returns_409(client: AsyncClient) -> None:
    """Registering with an already-taken email returns 409 Conflict."""
    payload = {
        "full_name": "Bob Jones",
        "email": "bob@example.com",
        "password": "Testpass1!",
    }
    res1 = await client.post("/api/v1/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = await client.post("/api/v1/auth/register", json=payload)
    assert res2.status_code == 409
    error = res2.json()["error"]
    assert error["code"] == "CONFLICT_ERROR"


async def test_login_returns_tokens(client: AsyncClient) -> None:
    """Logging in with valid credentials returns access + refresh tokens."""
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Carol White", "email": "carol@example.com", "password": "Testpass1!"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "carol@example.com", "password": "Testpass1!"},
    )
    assert response.status_code == 200
    tokens = response.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert "expires_in" in tokens


async def test_login_wrong_password_returns_401(client: AsyncClient) -> None:
    """Wrong password on login returns 401 with UNAUTHORIZED code."""
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Dave Brown", "email": "dave@example.com", "password": "Testpass1!"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "dave@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"


async def test_access_protected_endpoint_without_token(client: AsyncClient) -> None:
    """Accessing a protected endpoint without a token returns 401."""
    response = await client.delete("/api/v1/auth/account")
    assert response.status_code == 401


async def test_invalid_jwt_sub_claim_returns_401(client: AsyncClient) -> None:
    """A JWT with a non-UUID sub claim is rejected with 401, not a 500 crash."""
    from app.core.config import get_settings

    settings = get_settings()

    # Manually craft a token with sub="not-a-uuid"
    from jose import jwt

    token = jwt.encode(
        {"sub": "not-a-uuid", "type": "access"},
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    response = await client.delete(
        "/api/v1/auth/account",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


async def test_get_me_endpoint_requires_auth(client: AsyncClient) -> None:
    """GET /auth/me without token returns 401."""
    response = await client.get("/api/v1/auth/me")
    assert response.status_code == 401


async def test_get_me_endpoint_returns_user_info(client: AsyncClient) -> None:
    """GET /auth/me returns details of current authenticated user."""
    # Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Ethan Hunt", "email": "ethan@example.com", "password": "Testpass1!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "ethan@example.com", "password": "Testpass1!"},
    )
    access_token = login_res.json()["access_token"]

    # Call me
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "ethan@example.com"
    assert data["full_name"] == "Ethan Hunt"
    assert "last_login_at" in data
    assert data["last_login_at"] is not None


async def test_refresh_token_rotation(client: AsyncClient) -> None:
    """Refreshing works via request payload and rotates token."""
    # Register & Login
    await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Fiona Gallagher",
            "email": "fiona@example.com",
            "password": "Testpass1!",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "fiona@example.com", "password": "Testpass1!"},
    )
    refresh_token = login_res.json()["refresh_token"]

    # Call /refresh
    res = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert "refresh_token" in data


async def test_expired_access_token_returns_401(client: AsyncClient) -> None:
    """An expired access token is rejected with 401."""
    from datetime import datetime, timedelta

    from jose import jwt

    from app.core.config import get_settings

    settings = get_settings()

    payload = {
        "sub": "00000000-0000-0000-0000-000000000001",
        "exp": datetime.now(UTC) - timedelta(minutes=1),
        "type": "access",
    }
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 401


async def test_refresh_token_cannot_access_protected_endpoint(client: AsyncClient) -> None:
    """A refresh token cannot be used to authenticate access-token endpoints."""
    await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "George Weasley",
            "email": "george@example.com",
            "password": "Testpass1!",
        },
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "george@example.com", "password": "Testpass1!"},
    )
    refresh_token = login_res.json()["refresh_token"]

    # Attempt to access protected endpoint using refresh token
    response = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {refresh_token}"},
    )
    assert response.status_code == 401


async def test_access_token_cannot_be_used_to_refresh(client: AsyncClient) -> None:
    """An access token cannot be used as a refresh token."""
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": "Harry Potter", "email": "harry@example.com", "password": "Testpass1!"},
    )
    login_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "harry@example.com", "password": "Testpass1!"},
    )
    access_token = login_res.json()["access_token"]

    # Clear cookies so client does not automatically send the valid refresh token cookie
    client.cookies.clear()

    # Attempt to refresh using access token in request body
    response = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access_token},
    )
    assert response.status_code == 401
    assert response.json()["error"]["code"] == "UNAUTHORIZED"

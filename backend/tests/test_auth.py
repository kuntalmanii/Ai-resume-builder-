"""Health check and auth endpoint integration tests.

These run against the in-memory SQLite test database configured in conftest.py.
No live PostgreSQL is needed.
"""
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
    """API v1 /health endpoint should return 200."""
    response = await client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["api_version"] == "v1"


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

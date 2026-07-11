"""Basic health check and auth flow tests."""
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as c:
        yield c


async def test_health(client: AsyncClient) -> None:
    response = await client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


async def test_register_and_login(client: AsyncClient) -> None:
    # Register
    reg_response = await client.post(
        "/api/v1/auth/register",
        json={
            "full_name": "Test User",
            "email": "test@example.com",
            "password": "Testpass1",
        },
    )
    assert reg_response.status_code == 201
    data = reg_response.json()
    assert data["email"] == "test@example.com"

    # Login
    login_response = await client.post(
        "/api/v1/auth/login",
        json={"email": "test@example.com", "password": "Testpass1"},
    )
    assert login_response.status_code == 200
    tokens = login_response.json()
    assert "access_token" in tokens


async def test_register_duplicate_email(client: AsyncClient) -> None:
    payload = {
        "full_name": "User A",
        "email": "duplicate@example.com",
        "password": "Testpass1",
    }
    await client.post("/api/v1/auth/register", json=payload)
    response = await client.post("/api/v1/auth/register", json=payload)
    assert response.status_code == 409


async def test_login_wrong_password(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": "User B", "email": "userb@example.com", "password": "Testpass1"},
    )
    response = await client.post(
        "/api/v1/auth/login",
        json={"email": "userb@example.com", "password": "WrongPassword1"},
    )
    assert response.status_code == 401

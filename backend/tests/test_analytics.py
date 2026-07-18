"""Tests for Career Analytics dashboard summary."""

import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str = "analytics_test@test.com") -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password@123", "full_name": "Analytics User"},
    )
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password@123"})
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_analytics_summary(client: AsyncClient) -> None:
    token = await _register_and_login(client, "analytics_flow@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # Fetch Analytics Summary (initially zeros)
    res = await client.get("/api/v1/analytics/", headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert body["total_applications"] == 0
    assert body["interviews_scheduled"] == 0
    assert body["offers_received"] == 0
    assert "funnel" in body
    assert "skill_gaps" in body

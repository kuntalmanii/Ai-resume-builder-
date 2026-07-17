"""Tests for Application Tracker and Interview schedules."""
import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str = "tracker@test.com", role: str = "user") -> str:
    # Register
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password@123",
        "full_name": "Tracker User"
    })
    # We need to manually set the role if it's recruiter in the DB, but for user we can login directly
    res = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password@123"
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_application_lifecycle(client: AsyncClient) -> None:
    token = await _register_and_login(client, "app_lifecycle@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create Application
    payload = {
        "company": "Google",
        "role": "Software Engineer",
        "location": "Mountain View, CA",
        "status": "Wishlist",
        "salary_min": 150000,
        "salary_max": 200000,
        "currency": "USD",
        "recruiter_name": "Sarah",
        "notes": "Referral from John."
    }
    res = await client.post("/api/v1/applications", json=payload, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert body["company"] == "Google"
    assert body["role"] == "Software Engineer"
    assert body["status"] == "Wishlist"
    app_id = body["id"]

    # 2. Get Application
    res = await client.get(f"/api/v1/applications/{app_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["company"] == "Google"

    # 3. Update Status (Move column)
    res = await client.patch(
        f"/api/v1/applications/{app_id}/status",
        json={"status": "Applied"},
        headers=headers
    )
    assert res.status_code == 200
    assert res.json()["status"] == "Applied"

    # 4. Schedule Interview
    iv_payload = {
        "round_type": "Technical Screening",
        "scheduled_at": "2026-08-01T10:00:00Z",
        "duration_minutes": 45,
        "location": "Google Meet",
        "format": "video"
    }
    res = await client.post(f"/api/v1/applications/{app_id}/interviews", json=iv_payload, headers=headers)
    assert res.status_code == 201
    iv_body = res.json()
    assert iv_body["round_type"] == "Technical Screening"
    assert iv_body["location"] == "Google Meet"
    iv_id = iv_body["id"]

    # 5. List Interviews
    res = await client.get(f"/api/v1/applications/{app_id}/interviews", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 1

    # 6. Delete Interview
    res = await client.delete(f"/api/v1/applications/{app_id}/interviews/{iv_id}", headers=headers)
    assert res.status_code == 204

    # 7. List Applications
    res = await client.get("/api/v1/applications", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 8. Delete Application
    res = await client.delete(f"/api/v1/applications/{app_id}", headers=headers)
    assert res.status_code == 204

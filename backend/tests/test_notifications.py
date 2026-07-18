"""Tests for Notifications Center."""

import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str = "notif_test@test.com") -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password@123", "full_name": "Notif User"},
    )
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password@123"})
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_notifications_lifecycle(client: AsyncClient) -> None:
    token = await _register_and_login(client, "notif_flow@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Initially count should be 0
    res = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json() == 0

    # 2. Trigger a notification by creating an application
    payload = {"company": "Netflix", "role": "Senior Engineer", "status": "Wishlist"}
    await client.post("/api/v1/applications", json=payload, headers=headers)

    # 3. Unread count should increment to 1
    res = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.status_code == 200
    assert res.json() == 1

    # 4. List notifications
    res = await client.get("/api/v1/notifications", headers=headers)
    assert res.status_code == 200
    notifs = res.json()
    assert len(notifs) == 1
    notif_id = notifs[0]["id"]

    # 5. Mark as read
    res = await client.patch(f"/api/v1/notifications/{notif_id}/read", headers=headers)
    assert res.status_code == 200
    assert res.json()["is_read"] is True

    # 6. Unread count back to 0
    res = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert res.json() == 0

    # 7. Create another application to get another notification
    await client.post("/api/v1/applications", json=payload, headers=headers)

    # 8. Mark all read
    res = await client.patch("/api/v1/notifications/read-all", headers=headers)
    assert res.status_code == 200
    assert res.json() == 1

    # 9. Delete notification
    res = await client.delete(f"/api/v1/notifications/{notif_id}", headers=headers)
    assert res.status_code == 204

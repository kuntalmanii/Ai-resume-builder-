"""Integration tests for Career Entries CRUD, confirmation, and immutability rules."""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.career_entry import CareerEntry

pytestmark = pytest.mark.asyncio


# ─── Helpers ──────────────────────────────────────────────────────────────────
async def _register_and_login(client: AsyncClient, email: str, name: str) -> str:
    """Helper to register and login a user, returning their access token."""
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": name, "email": email, "password": "Testpass1!"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Testpass1!"},
    )
    return res.json()["access_token"]


# ─── Career Entry Tests ───────────────────────────────────────────────────────
async def test_career_entry_crud_and_filtering(client: AsyncClient) -> None:
    """Creating and listing career entries works, including filtering by type."""
    token = await _register_and_login(client, "careeruser@example.com", "Career User")
    headers = {"Authorization": f"Bearer {token}"}

    # Create education entry
    res1 = await client.post(
        "/api/v1/career-profile/entries",
        headers=headers,
        json={
            "entry_type": "education",
            "title": "B.S. Software Engineering",
            "organization": "Stanford University",
            "start_date": "Sep 2018",
            "end_date": "Jun 2022",
            "is_current": False,
            "data": {"field_of_study": "AI", "grade": "4.0"},
            "source_type": "manual",
        },
    )
    assert res1.status_code == 201
    entry_id = res1.json()["id"]
    assert res1.json()["verification_status"] == "unverified"

    # Create work_experience entry
    res2 = await client.post(
        "/api/v1/career-profile/entries",
        headers=headers,
        json={
            "entry_type": "work_experience",
            "title": "Intern",
            "organization": "Google",
            "start_date": "Jun 2021",
            "is_current": True,
            "data": {"location": "Mountain View, CA"},
            "source_type": "manual",
        },
    )
    assert res2.status_code == 201

    # List all entries
    res_list = await client.get("/api/v1/career-profile/entries", headers=headers)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 2

    # Filter entries by education type
    res_filtered = await client.get(
        "/api/v1/career-profile/entries?entry_type=education",
        headers=headers,
    )
    assert res_filtered.status_code == 200
    assert len(res_filtered.json()) == 1
    assert res_filtered.json()[0]["title"] == "B.S. Software Engineering"

    # Update entry
    res_update = await client.patch(
        f"/api/v1/career-profile/entries/{entry_id}",
        headers=headers,
        json={"title": "M.S. Computer Science"},
    )
    assert res_update.status_code == 200
    assert res_update.json()["title"] == "M.S. Computer Science"


async def test_career_entry_ownership_enforcement(client: AsyncClient) -> None:
    """User B cannot access or modify User A's career entries (returns 404)."""
    token_a = await _register_and_login(client, "usera_entry@example.com", "User Entry A")
    token_b = await _register_and_login(client, "userb_entry@example.com", "User Entry B")

    # User A creates entry
    res = await client.post(
        "/api/v1/career-profile/entries",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "entry_type": "technical_skill",
            "title": "Python",
            "organization": "Profile",
            "source_type": "manual",
        },
    )
    entry_id = res.json()["id"]

    # User B attempts to read User A's entry -> returns 404 Not Found
    res_read = await client.get(
        f"/api/v1/career-profile/entries/{entry_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_read.status_code == 404

    # User B attempts to edit User A's entry -> returns 404 Not Found
    res_edit = await client.patch(
        f"/api/v1/career-profile/entries/{entry_id}",
        headers={"Authorization": f"Bearer {token_b}"},
        json={"title": "JavaScript"},
    )
    assert res_edit.status_code == 404

    # User B attempts to delete User A's entry -> returns 404 Not Found
    res_delete = await client.delete(
        f"/api/v1/career-profile/entries/{entry_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert res_delete.status_code == 404


async def test_career_entry_verification_promotion(client: AsyncClient) -> None:
    """Manually added unverified entries can be promoted to user_confirmed."""
    token = await _register_and_login(client, "promote@example.com", "Promote Test")
    headers = {"Authorization": f"Bearer {token}"}

    res = await client.post(
        "/api/v1/career-profile/entries",
        headers=headers,
        json={
            "entry_type": "certification",
            "title": "AWS Architect",
            "organization": "Amazon",
            "source_type": "manual",
        },
    )
    entry_id = res.json()["id"]
    assert res.json()["verification_status"] == "unverified"

    # Confirm the entry
    res_confirm = await client.post(
        f"/api/v1/career-profile/entries/{entry_id}/confirm",
        headers=headers,
    )
    assert res_confirm.status_code == 200
    assert res_confirm.json()["verification_status"] == "user_confirmed"


async def test_source_verified_immutability(client: AsyncClient, db_session: AsyncSession) -> None:
    """Source-verified entries are read-only and raise 400 validation error if edited/deleted."""
    token = await _register_and_login(client, "immutable@example.com", "Immutable Test")
    headers = {"Authorization": f"Bearer {token}"}

    # Create entry (starts as unverified)
    res = await client.post(
        "/api/v1/career-profile/entries",
        headers=headers,
        json={
            "entry_type": "education",
            "title": "B.Sc.",
            "organization": "MIT",
            "source_type": "manual",
        },
    )
    entry_id_str = res.json()["id"]
    entry_id = uuid.UUID(entry_id_str)

    # Manually promote to source_verified in DB to bypass API block
    await db_session.execute(
        update(CareerEntry)
        .where(CareerEntry.id == entry_id)
        .values(verification_status="source_verified")
    )
    await db_session.commit()

    # Attempt to edit -> returns 400 Bad Request
    res_edit = await client.patch(
        f"/api/v1/career-profile/entries/{entry_id_str}",
        headers=headers,
        json={"title": "M.Sc."},
    )
    assert res_edit.status_code == 400
    assert res_edit.json()["error"]["details"] == "SOURCE_VERIFIED_IMMUTABLE"

    # Attempt to delete -> returns 400 Bad Request
    res_delete = await client.delete(
        f"/api/v1/career-profile/entries/{entry_id_str}",
        headers=headers,
    )
    assert res_delete.status_code == 400
    assert res_delete.json()["error"]["details"] == "SOURCE_VERIFIED_IMMUTABLE"

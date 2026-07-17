"""Tests for Recruiter Dashboard role-based access control and read-only candidate views."""
import pytest
from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.user import User


async def _register_and_login(client: AsyncClient, email: str, name: str) -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": name, "email": email, "password": "Password@123"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Password@123"},
    )
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_recruiter_endpoint_role_verification(client: AsyncClient, db_session: AsyncSession) -> None:
    # 1. Register candidate user (default role = 'user')
    cand_token = await _register_and_login(client, "cand@test.com", "Cand User")
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    # 2. Candidate attempts to access recruiter dashboard -> 403 Forbidden
    res = await client.get("/api/v1/recruiter/candidates", headers=cand_headers)
    assert res.status_code == 403
    assert "Access denied" in res.json()["error"]["message"]

    # 3. Register recruiter user, and update their role in the DB to 'recruiter'
    rec_token = await _register_and_login(client, "rec@test.com", "Rec User")
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # Set recruiter role in DB
    await db_session.execute(
        update(User).where(User.email == "rec@test.com").values(role="recruiter")
    )
    await db_session.commit()

    # 4. Recruiter accesses candidates list -> 200 OK
    res = await client.get("/api/v1/recruiter/candidates", headers=rec_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

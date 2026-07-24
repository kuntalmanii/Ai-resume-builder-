"""Tests for 1-Click AI Resume Tailor & Google X-Y-Z formula alignment."""

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.asyncio


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


async def test_resume_tailor_endpoint(client: AsyncClient) -> None:
    """Test tailoring a resume against a target role generates Google X-Y-Z diffs."""
    token = await _register_and_login(client, "tailoruser@example.com", "Tailor User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a sample resume
    res = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "Backend Software Engineer",
            "target_role": "Senior Backend Engineer",
            "content": {
                "experience": [
                    {
                        "position": "Software Engineer",
                        "company": "Tech Corp",
                        "bullets": [
                            "Built API services using FastAPI and Python.",
                            "Optimized database queries for performance.",
                        ],
                    }
                ],
                "projects": [
                    {
                        "name": "Cloud Pipeline",
                        "bullets": ["Created data streaming pipeline."],
                    }
                ],
            },
        },
    )
    assert res.status_code == 201
    resume_id = res.json()["id"]

    # 2. Invoke the tailoring endpoint
    tailor_res = await client.post(
        f"/api/v1/resumes/{resume_id}/tailor",
        headers=headers,
        json={
            "target_role": "Staff Backend Engineer",
            "job_description_text": "Looking for Python, FastAPI, Microservices, and Redis expert.",
            "focus_skills": ["FastAPI", "Redis", "Microservices"],
        },
    )
    assert tailor_res.status_code == 200
    data = tailor_res.json()

    assert data["resume_id"] == resume_id
    assert data["target_role"] == "Staff Backend Engineer"
    assert data["estimated_ats_score_after"] > data["estimated_ats_score_before"]
    assert len(data["bullets"]) >= 3

    # Verify Google X-Y-Z formula fields present
    first_bullet = data["bullets"][0]
    assert "xyz_structure" in first_bullet
    assert "original_bullet" in first_bullet
    assert "tailored_bullet" in first_bullet
    assert first_bullet["status"] == "pending"

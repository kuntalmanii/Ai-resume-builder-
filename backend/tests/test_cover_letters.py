"""Tests for Cover Letter Generator and versioning."""

import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str = "cl_test@test.com") -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": "Password@123", "full_name": "CL User"},
    )
    res = await client.post("/api/v1/auth/login", json={"email": email, "password": "Password@123"})
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_cover_letter_flow(client: AsyncClient) -> None:
    token = await _register_and_login(client, "cl_flow@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a resume
    res = await client.post("/api/v1/resumes", json={"title": "My Resume"}, headers=headers)
    assert res.status_code == 201
    resume_id = res.json()["id"]

    # 2. Generate Cover Letter draft (AI mock call)
    payload = {
        "resume_id": resume_id,
        "job_description_text": "Looking for a Software Engineer with Python skills.",
        "style_preference": "professional",
    }
    from unittest.mock import patch

    with patch(
        "app.ai.gemini_provider.GeminiProvider.complete",
        return_value="Dear Hiring Manager, I love python.",
    ):
        res = await client.post("/api/v1/cover-letters/generate", json=payload, headers=headers)
    assert res.status_code == 200
    body = res.json()
    assert "content" in body
    ai_content = body["content"]

    # 3. Save Cover Letter draft
    save_payload = {"resume_id": resume_id, "title": "Google Cover Letter", "content": ai_content}
    res = await client.post("/api/v1/cover-letters", json=save_payload, headers=headers)
    assert res.status_code == 201
    cl_body = res.json()
    assert cl_body["title"] == "Google Cover Letter"
    cl_id = cl_body["id"]

    # 4. List Cover Letters
    res = await client.get("/api/v1/cover-letters", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 5. Get Cover Letter details
    res = await client.get(f"/api/v1/cover-letters/{cl_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Google Cover Letter"

    # 6. Update Cover Letter
    update_payload = {
        "title": "Google Updated Cover Letter",
        "content": "Dear Google Recruiter, I love python.",
    }
    res = await client.put(f"/api/v1/cover-letters/{cl_id}", json=update_payload, headers=headers)
    assert res.status_code == 200
    assert res.json()["title"] == "Google Updated Cover Letter"

    # 7. Create New Version
    version_payload = {"content": "Dear Google Hiring Manager, I am still loving python."}
    res = await client.post(
        f"/api/v1/cover-letters/{cl_id}/versions", json=version_payload, headers=headers
    )
    assert res.status_code == 201
    assert res.json()["version"] == 2

    # 8. List Versions
    res = await client.get(f"/api/v1/cover-letters/{cl_id}/versions", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) == 2

    # 9. PDF Export
    res = await client.post(f"/api/v1/cover-letters/{cl_id}/export", headers=headers)
    assert res.status_code == 200
    assert "export_path" in res.json()

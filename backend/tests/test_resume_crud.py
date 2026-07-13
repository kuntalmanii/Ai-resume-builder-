"""Integration tests for Resume CRUD, versioning, and Job Descriptions.

All tests run in-memory against SQLite via transactional conftest fixtures.
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

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


# ─── Resume CRUD Tests ────────────────────────────────────────────────────────
async def test_create_and_list_resumes(client: AsyncClient) -> None:
    """Creating a resume auto-assigns primary status if first, and appears in list."""
    token = await _register_and_login(client, "user1@example.com", "User One")
    headers = {"Authorization": f"Bearer {token}"}

    # Create first resume
    res1 = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "PM Resume",
            "template_id": "modern",
            "content": {
                "personal_information": {},
                "professional_summary": "original content",
                "education": [],
                "experience": [],
                "skills": [],
                "certifications": [],
                "achievements": [],
                "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"],
            }
        },
    )
    assert res1.status_code == 201
    data1 = res1.json()
    assert data1["title"] == "PM Resume"
    assert data1["is_primary"] is True  # First resume must be primary
    assert data1["version"] == 1

    # Create second resume
    res2 = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={"title": "SWE Resume", "template_id": "simple", "is_primary": False},
    )
    assert res2.status_code == 201
    data2 = res2.json()
    assert data2["title"] == "SWE Resume"
    assert data2["is_primary"] is False

    # List resumes
    list_res = await client.get("/api/v1/resumes", headers=headers)
    assert list_res.status_code == 200
    resumes_list = list_res.json()
    assert len(resumes_list) == 2
    titles = {r["title"] for r in resumes_list}
    assert titles == {"PM Resume", "SWE Resume"}


async def test_ownership_enforcement(client: AsyncClient) -> None:
    """User B cannot access or modify User A's resumes (returns 404 to avoid enumeration)."""
    token_a = await _register_and_login(client, "usera@example.com", "User A")
    token_b = await _register_and_login(client, "userb@example.com", "User B")

    # User A creates a resume
    res_a = await client.post(
        "/api/v1/resumes",
        headers={"Authorization": f"Bearer {token_a}"},
        json={"title": "User A Resume"},
    )
    resume_id = res_a.json()["id"]

    # User B attempts to read User A's resume -> returns 404 Not Found
    response_read = await client.get(
        f"/api/v1/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response_read.status_code == 404

    # User B attempts to edit User A's resume -> returns 404 Not Found
    response_update = await client.put(
        f"/api/v1/resumes/{resume_id}/content",
        headers={"Authorization": f"Bearer {token_b}"},
        json={
            "personal_information": {},
            "professional_summary": "hacked summary",
            "education": [],
            "experience": [],
            "skills": [],
            "certifications": [],
            "achievements": [],
            "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"],
        },
    )
    assert response_update.status_code == 404

    # User B attempts to delete User A's resume -> returns 404 Not Found
    response_delete = await client.delete(
        f"/api/v1/resumes/{resume_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert response_delete.status_code == 404


# ─── Resume Versioning Tests ──────────────────────────────────────────────────
async def test_resume_version_history_and_restore(client: AsyncClient) -> None:
    """Updating resume content creates a version snapshot, which can be restored."""
    token = await _register_and_login(client, "versiontest@example.com", "Version Test")
    headers = {"Authorization": f"Bearer {token}"}

    # Create resume (Version 1)
    res = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "V1 Title",
            "content": {
                "personal_information": {},
                "professional_summary": "original content",
                "education": [],
                "experience": [],
                "skills": [],
                "certifications": [],
                "achievements": [],
                "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"],
            }
        },
    )
    resume_id = res.json()["id"]
    assert res.json()["version"] == 1

    # Update content (creates version snapshot of original, active increments to V2)
    update_res = await client.put(
        f"/api/v1/resumes/{resume_id}/content?change_reason=Edited%20body",
        headers=headers,
        json={
            "personal_information": {},
            "professional_summary": "updated content v2",
            "education": [],
            "experience": [],
            "skills": [],
            "certifications": [],
            "achievements": [],
            "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"],
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["version"] == 2

    # Check version snapshots list -> contains 1 historical version (V1 snapshot)
    versions_res = await client.get(f"/api/v1/resumes/{resume_id}/versions", headers=headers)
    assert versions_res.status_code == 200
    versions = versions_res.json()
    assert len(versions) == 1
    assert versions[0]["version_number"] == 1
    assert versions[0]["content_snapshot"]["professional_summary"] == "original content"
    assert versions[0]["change_reason"] == "Edited body"

    # Restore V1 snapshot -> active content reverts, increments active version to V3
    restore_res = await client.post(
        f"/api/v1/resumes/{resume_id}/versions/1/restore",
        headers=headers,
    )
    assert restore_res.status_code == 200
    data = restore_res.json()
    assert data["version"] == 3
    assert data["content"]["professional_summary"] == "original content"

    # Historical versions list now has 2 entries (includes V2 snapshot)
    versions_res2 = await client.get(f"/api/v1/resumes/{resume_id}/versions", headers=headers)
    assert len(versions_res2.json()) == 2
    assert versions_res2.json()[0]["version_number"] == 2
    assert versions_res2.json()[0]["content_snapshot"]["professional_summary"] == "updated content v2"


# ─── Job Description CRUD Tests ───────────────────────────────────────────────
async def test_job_description_crud(client: AsyncClient) -> None:
    """Creating, reading, and deleting user-owned Job Descriptions works."""
    token_a = await _register_and_login(client, "jda@example.com", "User JD A")
    token_b = await _register_and_login(client, "jdb@example.com", "User JD B")

    # Create JD (User A)
    res_jd = await client.post(
        "/api/v1/job-descriptions",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "title": "Software Engineer",
            "company": "Stark Industries",
            "raw_text": "Requirements: Pyton, React...",
        },
    )
    assert res_jd.status_code == 201
    jd_id = res_jd.json()["id"]

    # List JDs (User A)
    list_jd = await client.get(
        "/api/v1/job-descriptions",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert len(list_jd.json()) == 1
    assert list_jd.json()[0]["company"] == "Stark Industries"

    # Access JD (User B) -> Forbidden 404
    forbidden_get = await client.get(
        f"/api/v1/job-descriptions/{jd_id}",
        headers={"Authorization": f"Bearer {token_b}"},
    )
    assert forbidden_get.status_code == 404

    # Delete JD (User A) -> 204
    delete_res = await client.delete(
        f"/api/v1/job-descriptions/{jd_id}",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert delete_res.status_code == 204

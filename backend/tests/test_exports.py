"""Integration tests for Resume Exports snapshots and history."""

import pytest
from httpx import AsyncClient

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


async def _create_resume(client: AsyncClient, headers: dict) -> str:
    """Helper to create a dummy resume."""
    res = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "PM Resume",
            "template_id": "modern",
            "content": {
                "personal_information": {
                    "full_name": "Jane Doe",
                    "email": "jane@example.com",
                    "phone": "123-456-7890",
                    "location": "San Francisco, CA",
                },
                "professional_summary": "Intelligent and results-driven PM.",
                "education": [
                    {
                        "institution": "Stanford University",
                        "degree": "B.S. Computer Science",
                        "end_date": "2022",
                    }
                ],
                "experience": [
                    {
                        "company": "Tech Corp",
                        "position": "Associate Product Manager",
                        "start_date": "2022-06",
                        "end_date": "Present",
                        "description": "Led shipping of 3 major features.",
                        "bullets": ["Managed roadmap", "Analyzed user behavior metrics"],
                    }
                ],
                "skills": [{"category": "Languages", "skills": ["Python", "JavaScript", "SQL"]}],
                "certifications": [],
                "achievements": [],
                "section_order": [
                    "personal_information",
                    "professional_summary",
                    "education",
                    "experience",
                    "skills",
                ],
            },
        },
    )
    assert res.status_code == 201
    return res.json()["id"]


# ─── Export Tests ─────────────────────────────────────────────────────────────
async def test_create_and_list_exports(client: AsyncClient) -> None:
    """Creating an export generates a PDF record and lists it."""
    token = await _register_and_login(client, "user.exp1@example.com", "Exporter One")
    headers = {"Authorization": f"Bearer {token}"}

    resume_id = await _create_resume(client, headers)

    # 1. Create export snapshot
    res = await client.post(
        f"/api/v1/resumes/{resume_id}/exports",
        headers=headers,
        json={
            "template_id": "modern",
            "settings": {
                "accent_color": "modern",
                "margin_top": "15mm",
                "font_scale": 1.0,
                "ats_mode": False,
            },
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["resume_id"] == resume_id
    assert data["template_id"] == "modern"
    assert data["status"] == "completed"
    assert "page_count" in data

    # 2. List exports
    list_res = await client.get(f"/api/v1/resumes/{resume_id}/exports", headers=headers)
    assert list_res.status_code == 200
    export_list = list_res.json()
    assert len(export_list) == 1
    assert export_list[0]["id"] == data["id"]


async def test_caching_and_force_regenerate(client: AsyncClient) -> None:
    """Caching returns identical export for matching settings, force regenerates a new one."""
    token = await _register_and_login(client, "user.exp2@example.com", "Exporter Two")
    headers = {"Authorization": f"Bearer {token}"}

    resume_id = await _create_resume(client, headers)

    # Create first export
    payload = {
        "template_id": "minimal",
        "settings": {"accent_color": "minimal", "margin_top": "10mm", "ats_mode": True},
    }
    res1 = await client.post(f"/api/v1/resumes/{resume_id}/exports", headers=headers, json=payload)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # Create second export (identical settings) - should reuse cache
    res2 = await client.post(f"/api/v1/resumes/{resume_id}/exports", headers=headers, json=payload)
    assert res2.status_code == 201
    id2 = res2.json()["id"]
    assert id1 == id2

    # Create third export (identical settings, but force=True) - should generate a new record
    payload_force = payload.copy()
    payload_force["force"] = True
    res3 = await client.post(
        f"/api/v1/resumes/{resume_id}/exports", headers=headers, json=payload_force
    )
    assert res3.status_code == 201
    id3 = res3.json()["id"]
    assert id1 != id3


async def test_export_ownership_enforcement(client: AsyncClient) -> None:
    """User B cannot download, delete, or view User A's export snapshot."""
    token_a = await _register_and_login(client, "usera.exp@example.com", "User A")
    token_b = await _register_and_login(client, "userb.exp@example.com", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # User A creates resume and export
    resume_id = await _create_resume(client, headers_a)
    res_export = await client.post(
        f"/api/v1/resumes/{resume_id}/exports", headers=headers_a, json={"template_id": "modern"}
    )
    export_id = res_export.json()["id"]

    # User B attempts to access User A's export details -> 403 Forbidden
    res_get = await client.get(f"/api/v1/exports/{export_id}", headers=headers_b)
    assert res_get.status_code == 403

    # User B attempts to download -> 403 Forbidden
    res_dl = await client.get(f"/api/v1/exports/{export_id}/download", headers=headers_b)
    assert res_dl.status_code == 403

    # User B attempts to delete -> 403 Forbidden
    res_del = await client.delete(f"/api/v1/exports/{export_id}", headers=headers_b)
    assert res_del.status_code == 403


async def test_download_and_delete_export(client: AsyncClient) -> None:
    """User can download the binary PDF file and delete the export snapshot."""
    token = await _register_and_login(client, "user.exp3@example.com", "Exporter Three")
    headers = {"Authorization": f"Bearer {token}"}

    resume_id = await _create_resume(client, headers)

    # Create export
    res = await client.post(
        f"/api/v1/resumes/{resume_id}/exports", headers=headers, json={"template_id": "modern"}
    )
    export_id = res.json()["id"]

    # Download PDF
    dl_res = await client.get(f"/api/v1/exports/{export_id}/download", headers=headers)
    assert dl_res.status_code == 200
    assert dl_res.headers["content-type"] == "application/pdf"
    # PDF should start with PDF magic bytes
    assert dl_res.content.startswith(b"%PDF")

    # Delete export
    del_res = await client.delete(f"/api/v1/exports/{export_id}", headers=headers)
    assert del_res.status_code == 200

    # List should be empty now
    list_res = await client.get(f"/api/v1/resumes/{resume_id}/exports", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 0

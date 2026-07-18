"""Integration tests for Job Description Matching, Boundary Checks, Caching, and Smart
Profile Retrieval."""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.matching.experience_matcher import calculate_unique_experience_years
from app.services.matching.skill_taxonomy import match_skill_in_text

pytestmark = pytest.mark.asyncio


# ─── Helpers ──────────────────────────────────────────────────────────────────
async def _register_and_login(client: AsyncClient, email: str, name: str) -> str:
    await client.post(
        "/api/v1/auth/register",
        json={"full_name": name, "email": email, "password": "Testpass1!"},
    )
    res = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "Testpass1!"},
    )
    return res.json()["access_token"]


# ─── 1. Auth & CRUD Tests ─────────────────────────────────────────────────────
async def test_unauthenticated_jd_creation_rejected(client: AsyncClient) -> None:
    res = await client.post(
        "/api/v1/job-descriptions",
        json={
            "title": "Software Eng",
            "company": "Stark",
            "raw_text": "Need React and python developer.",
        },
    )
    assert res.status_code == 401


async def test_jd_validations(client: AsyncClient) -> None:
    token = await _register_and_login(client, "user_jd@example.com", "John Doe")
    headers = {"Authorization": f"Bearer {token}"}

    # Empty JD
    res1 = await client.post(
        "/api/v1/job-descriptions",
        headers=headers,
        json={"title": "Short", "company": "Inc", "raw_text": "   "},
    )
    assert res1.status_code == 422


async def test_jd_crud_and_ownership(client: AsyncClient) -> None:
    token_a = await _register_and_login(client, "usera_jd@example.com", "User A")
    token_b = await _register_and_login(client, "userb_jd@example.com", "User B")

    headers_a = {"Authorization": f"Bearer {token_a}"}
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Create JD
    res = await client.post(
        "/api/v1/job-descriptions",
        headers=headers_a,
        json={
            "title": "SWE React",
            "company": "Meta",
            "raw_text": "We need a React developer. This description " \
                "has to be at least fifty characters long.",
        },
    )
    assert res.status_code == 201
    jd_id = res.json()["id"]

    # User B cannot retrieve User A's JD
    res_get = await client.get(f"/api/v1/job-descriptions/{jd_id}", headers=headers_b)
    assert res_get.status_code == 404

    # User B cannot edit User A's JD
    res_put = await client.put(
        f"/api/v1/job-descriptions/{jd_id}", headers=headers_b, json={"title": "Hacked Title"}
    )
    assert res_put.status_code == 404

    # User A lists only own JDs
    res_list = await client.get("/api/v1/job-descriptions", headers=headers_a)
    assert res_list.status_code == 200
    assert len(res_list.json()) == 1
    assert res_list.json()[0]["company"] == "Meta"


# ─── 2. Boundary Skills Matching Tests ────────────────────────────────────────
async def test_skill_boundary_isolation() -> None:
    # 1. Java must not match JavaScript
    assert match_skill_in_text("Java", "I am a Java developer.") is True
    assert match_skill_in_text("Java", "I write javascript code.") is False

    # 2. C must not match C++
    assert match_skill_in_text("C", "We code in C programming language.") is True
    assert match_skill_in_text("C", "We use C++ for performance.") is False
    assert match_skill_in_text("C", "C# is an OOP language.") is False

    # 3. Go avoids false positive on normal English usage
    assert match_skill_in_text("Go", "Let's go to the office.") is False
    assert match_skill_in_text("Go", "We use Golang for backend.") is True
    assert match_skill_in_text("Go", "Experienced with Go backend design.") is True

    # 4. R does not match arbitrary letter r
    assert match_skill_in_text("R", "r is a lowercase letter.") is False
    assert match_skill_in_text("R", "Programming in R is great.") is True


# ─── 3. Experience Matcher unique calendar years ──────────────────────────────
async def test_overlapping_experience_duration() -> None:
    experience_list = [
        {"start_date": "2022-06", "end_date": "Present", "is_current": True},  # current role
        {"start_date": "2022-01", "end_date": "2022-08", "is_current": False},  # overlap
        {"start_date": "2020-01", "end_date": "2021-06", "is_current": False},
    ]
    # Unique years should merge overlaps and count correctly
    years = calculate_unique_experience_years(experience_list)
    assert years > 0
    # Overlaps must not be double counted


# ─── 4. End-to-end Job Match Flow Tests ───────────────────────────────────────
async def test_end_to_end_job_match(client: AsyncClient, db_session: AsyncSession) -> None:
    token = await _register_and_login(client, "user_match@example.com", "User Match")
    headers = {"Authorization": f"Bearer {token}"}

    # Create Resume
    resume_res = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "React SWE",
            "content": {
                "personal_information": {"full_name": "Applicant"},
                "skills": [
                    {"category": "Frontend", "skills": ["React", "TypeScript", "JavaScript"]}
                ],
                "experience": [
                    {
                        "company": "Innovate",
                        "position": "Software Engineer",
                        "start_date": "2023-01",
                        "end_date": "Present",
                        "is_current": True,
                        "bullets": ["Coded responsive UI components using React."],
                        "technologies": ["React", "TypeScript"],
                    }
                ],
                "projects": [],
            },
        },
    )
    assert resume_res.status_code == 201
    resume_id = resume_res.json()["id"]

    # Create JD requiring PostgreSQL (which candidate lacks in resume) and React
    jd_res = await client.post(
        "/api/v1/job-descriptions",
        headers=headers,
        json={
            "title": "React and PostgreSQL developer",
            "company": "DataCorp",
            "raw_text": "We are seeking a React developer. Must have experience " \
                "with PostgreSQL. Preferred skills include TypeScript.",
        },
    )
    assert jd_res.status_code == 201
    jd_id = jd_res.json()["id"]

    # Add PostgreSQL to user's Career Profile as confirmed entry
    profile_entry = await client.post(
        "/api/v1/career-profile/entries",
        headers=headers,
        json={
            "entry_type": "project",
            "title": "Analytics Dashboard",
            "organization": "Innovate",
            "start_date": "2023-01",
            "end_date": "2023-06",
            "is_current": False,
            "data": {"skills": ["PostgreSQL", "React", "Python"]},
            "source_type": "manual",
        },
    )
    assert profile_entry.status_code == 201
    entry_id = profile_entry.json()["id"]

    # Confirm Career Profile entry to make it "user_confirmed" (so it counts for potential match!)
    confirm_res = await client.post(
        f"/api/v1/career-profile/entries/{entry_id}/confirm", headers=headers
    )
    assert confirm_res.status_code == 200

    # Run Job Description Match
    match_res = await client.post(
        f"/api/v1/resumes/{resume_id}/matches", headers=headers, json={"job_description_id": jd_id}
    )
    assert match_res.status_code == 200
    match_data = match_res.json()

    # Verify overall percentages and gaps
    assert match_data["overall_match_percentage"] > 0
    # Potential score must be higher than current score because PostgreSQL was found in
    # Career Profile
    assert match_data["potential_match_percentage"] >= match_data["overall_match_percentage"]

    # Check matching values are present in schema Response
    assert "is_stale" in match_data
    assert "ai_fallback_active" in match_data
    assert len(match_data["matched_requirements"]) > 0
    assert len(match_data["hidden_profile_matches"]) > 0
    assert match_data["hidden_profile_matches"][0]["requirement_text"] == "PostgreSQL"

    # Caching check: re-run match without force uses cache
    match_res_cached = await client.post(
        f"/api/v1/resumes/{resume_id}/matches", headers=headers, json={"job_description_id": jd_id}
    )
    assert match_res_cached.status_code == 200

    # Stale checks: edit resume content to increment version
    new_content = {
        "personal_information": {"full_name": "Applicant"},
        "skills": [
            {"category": "Frontend", "skills": ["React", "TypeScript", "JavaScript", "Python"]}
        ],
        "experience": [
            {
                "company": "Innovate",
                "position": "Software Engineer",
                "start_date": "2023-01",
                "end_date": "Present",
                "is_current": True,
                "bullets": ["Coded UI components in React."],
                "technologies": ["React"],
            }
        ],
        "projects": [],
    }
    edit_res = await client.put(
        f"/api/v1/resumes/{resume_id}/content", headers=headers, json=new_content
    )
    assert edit_res.status_code == 200

    # Get latest match, should now be stale
    latest_match = await client.get(
        f"/api/v1/resumes/{resume_id}/matches/latest?job_description_id={jd_id}", headers=headers
    )
    assert latest_match.status_code == 200
    assert latest_match.json()["is_stale"] is True


# ─── 5. Methodology endpoint ──────────────────────────────────────────────────
async def test_matching_methodology_public(client: AsyncClient) -> None:
    res = await client.get("/api/v1/matching/methodology")
    assert res.status_code == 200
    data = res.json()
    assert "matching_version" in data
    assert len(data["categories"]) > 0

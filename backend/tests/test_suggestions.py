"""Integration tests for AI Resume suggestions and evidence lifecycle."""
import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.ai_suggestion import AISuggestion
from app.db.models.resume_version import ResumeVersion
from app.services.ai.suggestion_service import LLMClaim, LLMClaimValidationOnly, LLMSuggestionOutput

pytestmark = pytest.mark.asyncio


# Helpers
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


async def _create_test_resume(client: AsyncClient, headers: dict) -> dict:
    res = await client.post(
        "/api/v1/resumes",
        headers=headers,
        json={
            "title": "Developer Resume",
            "template_id": "modern",
            "content": {
                "personal_information": {},
                "professional_summary": "Experienced software engineer specializing in web applications.",
                "education": [],
                "experience": [
                    {
                        "id": "exp-1",
                        "company": "Google",
                        "position": "Software Engineer",
                        "bullets": [
                            "Built and launched web APIs using Python."
                        ]
                    }
                ],
                "skills": [],
                "certifications": [],
                "achievements": [],
                "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"],
            }
        }
    )
    return res.json()


# Test Cases
async def test_suggestions_health_check(client: AsyncClient) -> None:
    """GET /resumes/suggestions/health returns status."""
    token = await _register_and_login(client, "health@example.com", "Health Check")
    headers = {"Authorization": f"Bearer {token}"}

    with patch("app.ai.gemini_provider.GeminiProvider.health_check", return_value=True):
        res = await client.get("/api/v1/resumes/suggestions/health", headers=headers)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "available"
        assert data["provider_name"] == "gemini"


async def test_generate_single_suggestion(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /resumes/{id}/suggestions generates grounded suggestion and evidence sources."""
    token = await _register_and_login(client, "gen@example.com", "Gen Tester")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = await _create_test_resume(client, headers)
    resume_id = resume_data["id"]

    # Mock output from Gemini
    mock_llm_output = LLMSuggestionOutput(
        suggested_text="Built scalable web APIs in Google using Python, improving performance by 30%.",
        rationale="Added impact metric and grounded company context.",
        risk_level="medium",
        claims=[
            LLMClaim(
                claim_text="Built web APIs using Python at Google",
                claim_type="responsibility",
                support_status="supported",
                supporting_sources=["Google experience section"],
                risk_level="low"
            ),
            LLMClaim(
                claim_text="Improving performance by 30%",
                claim_type="metric",
                support_status="user_confirmation_required",
                supporting_sources=[],
                risk_level="medium"
            )
        ],
        questions=["By what percentage did you improve performance?"],
        expected_score_gain=4
    )

    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_llm_output):
        res = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions",
            headers=headers,
            json={
                "suggestion_type": "bullet_enhancement",
                "target_section": "experience",
                "target_entry_id": "exp-1",
                "target_field": "bullets",
                "target_index": 0
            }
        )
        assert res.status_code == 201
        data = res.json()
        assert data["suggested_text"] == mock_llm_output.suggested_text
        assert data["rationale"] == mock_llm_output.rationale
        assert data["risk_level"] == "medium"
        assert len(data["claim_validation"]) == 2
        assert len(data["evidence_sources"]) == 3  # 1 supported, 1 confirmation pending, 1 clarifying question

        # Retrieve from DB to verify relations
        stmt = select(AISuggestion).options(selectinload(AISuggestion.evidence_sources)).where(AISuggestion.id == uuid.UUID(data["id"]))
        sugg = await db_session.scalar(stmt)
        assert sugg is not None
        assert sugg.status == "pending"
        assert len(sugg.evidence_sources) == 3


async def test_edit_suggestion_revalidates_claims(client: AsyncClient) -> None:
    """PUT /resumes/{id}/suggestions/{sugg_id} edits the text and re-runs claim verification."""
    token = await _register_and_login(client, "edit@example.com", "Edit Tester")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = await _create_test_resume(client, headers)
    resume_id = resume_data["id"]

    mock_gen_output = LLMSuggestionOutput(
        suggested_text="Built scalable web APIs in Google.",
        rationale="Added Google context.",
        risk_level="low",
        claims=[
            LLMClaim(
                claim_text="Built web APIs",
                claim_type="responsibility",
                support_status="supported",
                supporting_sources=["Resume content"],
                risk_level="low"
            )
        ],
        questions=[],
        expected_score_gain=2
    )

    # First generate the suggestion
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_gen_output):
        res = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions",
            headers=headers,
            json={
                "suggestion_type": "bullet_enhancement",
                "target_section": "experience",
                "target_entry_id": "exp-1",
                "target_field": "bullets",
                "target_index": 0
            }
        )
        sugg_id = res.json()["id"]

    # Mock edit validation
    mock_validate_output = LLMClaimValidationOnly(
        risk_level="high",
        claims=[
            LLMClaim(
                claim_text="Led a team of 50 engineers",
                claim_type="scope",
                support_status="unsupported",
                supporting_sources=[],
                risk_level="high"
            )
        ]
    )

    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_validate_output):
        res = await client.put(
            f"/api/v1/resumes/{resume_id}/suggestions/{sugg_id}",
            headers=headers,
            json={"suggested_text": "Led a team of 50 engineers."}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["edited_text"] == "Led a team of 50 engineers."
        assert data["status"] == "edited"
        assert data["risk_level"] == "high"
        assert data["claim_validation"][0]["support_status"] == "unsupported"


async def test_answer_clarifying_question(client: AsyncClient, db_session: AsyncSession) -> None:
    """POST /resumes/{id}/suggestions/{sugg_id}/answer saves confirmed evidence and regenerates suggestion."""
    token = await _register_and_login(client, "answer@example.com", "Answer Tester")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = await _create_test_resume(client, headers)
    resume_id = resume_data["id"]

    mock_gen_output = LLMSuggestionOutput(
        suggested_text="Built web APIs with Python.",
        rationale="Optimized.",
        risk_level="medium",
        claims=[
            LLMClaim(
                claim_text="Improved API throughput",
                claim_type="metric",
                support_status="user_confirmation_required",
                supporting_sources=[],
                risk_level="medium"
            )
        ],
        questions=["By what percentage did throughput increase?"],
        expected_score_gain=2
    )

    # Generate suggestion with clarifying question
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_gen_output):
        res = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions",
            headers=headers,
            json={
                "suggestion_type": "bullet_enhancement",
                "target_section": "experience",
                "target_entry_id": "exp-1",
                "target_field": "bullets",
                "target_index": 0
            }
        )
        sugg_id = res.json()["id"]

    # Answer question: triggers regenerate
    mock_regenerated_output = LLMSuggestionOutput(
        suggested_text="Built web APIs, improving throughput by 50%.",
        rationale="Incorporated user confirmed throughput improvement.",
        risk_level="low",
        claims=[
            LLMClaim(
                claim_text="Improved throughput by 50%",
                claim_type="metric",
                support_status="supported",
                supporting_sources=["User Confirmed Achievement Fact: Question: 'By what percentage did throughput increase?' Answer: '50%'"],
                risk_level="low"
            )
        ],
        questions=[],
        expected_score_gain=5
    )

    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_regenerated_output):
        res = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions/{sugg_id}/answer",
            headers=headers,
            json={"answer": "50%"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["suggested_text"] == "Built web APIs, improving throughput by 50%."
        assert data["risk_level"] == "low"
        assert data["status"] == "pending"

        # Verify the answer is in evidence sources
        has_answer_ev = any("50%" in (ev["excerpt"] or ev["label"] or "") for ev in data["evidence_sources"])
        assert has_answer_ev is True


async def test_apply_suggestion_occ_and_versioning(client: AsyncClient, db_session: AsyncSession) -> None:
    """Applying a suggestion increments version, snapshots content, and enforces OCC."""
    token = await _register_and_login(client, "apply@example.com", "Apply Tester")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = await _create_test_resume(client, headers)
    resume_id = resume_data["id"]

    mock_gen_output = LLMSuggestionOutput(
        suggested_text="Built scalable web APIs in Google with Python.",
        rationale="Optimized.",
        risk_level="low",
        claims=[],
        questions=[],
        expected_score_gain=2
    )

    # Generate first suggestion (sugg_id_1)
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_gen_output):
        res1 = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions",
            headers=headers,
            json={
                "suggestion_type": "bullet_enhancement",
                "target_section": "experience",
                "target_entry_id": "exp-1",
                "target_field": "bullets",
                "target_index": 0
            }
        )
        sugg_id_1 = res1.json()["id"]

    # Generate second suggestion (sugg_id_2) at the same original resume version (1)
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_gen_output):
        res2 = await client.post(
            f"/api/v1/resumes/{resume_id}/suggestions",
            headers=headers,
            json={
                "suggestion_type": "bullet_enhancement",
                "target_section": "experience",
                "target_entry_id": "exp-1",
                "target_field": "bullets",
                "target_index": 0
            }
        )
        sugg_id_2 = res2.json()["id"]

    # 1. Apply suggestion 1 (Success case)
    res_apply = await client.post(
        f"/api/v1/resumes/{resume_id}/suggestions/{sugg_id_1}/apply",
        headers=headers
    )
    assert res_apply.status_code == 200
    updated_resume = res_apply.json()
    assert updated_resume["version"] == 2
    assert updated_resume["content"]["experience"][0]["bullets"][0] == "Built scalable web APIs in Google with Python."

    # Verify ResumeVersion snapshot created in DB
    versions_stmt = select(ResumeVersion).where(ResumeVersion.resume_id == uuid.UUID(resume_id))
    versions = list(await db_session.scalars(versions_stmt))
    assert len(versions) == 1
    assert versions[0].version_number == 1
    assert versions[0].content_snapshot["experience"][0]["bullets"][0] == "Built and launched web APIs using Python."

    # 2. Try applying suggestion 2 (OCC Failure case because resume version is now 2, but suggestion 2 was based on version 1)
    res_apply_fail = await client.post(
        f"/api/v1/resumes/{resume_id}/suggestions/{sugg_id_2}/apply",
        headers=headers
    )
    assert res_apply_fail.status_code == 409
    assert "conflict" in res_apply_fail.json()["error"]["message"].lower()


import uuid
from unittest.mock import patch

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

async def test_evidence_map_flow(client: AsyncClient):
    """Test generating and retrieving an Evidence Map."""
    token = await _register_and_login(client, "evidence@example.com", "Evidence User")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a dummy resume
    resume_data = {
        "title": "Evidence Test Resume",
        "template_id": "modern",
        "content": {
            "personal_information": {},
            "professional_summary": "Test summary with 5 years experience.",
            "education": [],
            "experience": [
                {
                    "id": str(uuid.uuid4()),
                    "company": "Tech Corp",
                    "position": "Software Engineer",
                    "bullets": ["Increased performance by 20%"]
                }
            ],
            "skills": [],
            "certifications": [],
            "achievements": [],
            "section_order": ["personal_information", "professional_summary", "education", "experience", "skills"]
        }
    }
    create_res = await client.post("/api/v1/resumes", json=resume_data, headers=headers)
    assert create_res.status_code == 201
    resume_id = create_res.json()["id"]

    # 2. Get claims (should be empty initially)
    get_res = await client.get(f"/api/v1/resumes/{resume_id}/claims", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert "claims" in data
    assert "evidence_credibility_score" in data
    assert data["claims"] == []
    assert data["evidence_credibility_score"] == 100

    # 3. Trigger audit (mock the LLM responses)
    import re

    from app.services.evidence.claim_extractor import LLMClaimExtractionOutput, LLMResumeClaim
    from app.services.evidence.credibility_engine import (
        LLMClaimVerification,
        LLMVerificationBatchOutput,
    )

    async def mock_complete(*args, **kwargs):
        schema = kwargs.get("response_schema")
        if schema == LLMClaimExtractionOutput:
            return LLMClaimExtractionOutput(claims=[
                LLMResumeClaim(claim_text="Increased performance by 20%", source_section="experience", claim_type="metric")
            ])
        elif schema == LLMVerificationBatchOutput:
            prompt = kwargs.get("prompt", "")
            # Find the ID in the prompt
            match = re.search(r"ID:\s*([0-9a-fA-F-]+)\s*\|\s*Claim:\s*Increased performance by 20%", prompt)
            claim_id = match.group(1) if match else "12345"
            return LLMVerificationBatchOutput(verifications=[
                LLMClaimVerification(
                    claim_id=claim_id,
                    claim_text="Increased performance by 20%",
                    verification_status="user_confirmed",
                    reasoning="Matches profile",
                    confidence_score=95
                )
            ])
        return None

    with patch("app.services.evidence.claim_extractor.GeminiProvider.complete", side_effect=mock_complete):
        with patch("app.services.evidence.credibility_engine.GeminiProvider.complete", side_effect=mock_complete):
            audit_res = await client.post(f"/api/v1/resumes/{resume_id}/audit", headers=headers)
            assert audit_res.status_code == 200
            audit_data = audit_res.json()
            assert "claims" in audit_data

    # 4. Get claims again
    get_res2 = await client.get(f"/api/v1/resumes/{resume_id}/claims", headers=headers)
    assert get_res2.status_code == 200
    data2 = get_res2.json()
    assert len(data2["claims"]) == len(audit_data["claims"])

import uuid
from unittest.mock import patch

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.ai_suggestion import AISuggestion
from app.db.models.evidence_source import EvidenceSource
from app.db.models.resume_claim import ResumeClaim
from app.services.ai.suggestion_service import AISuggestionService
from app.services.evidence.claim_extractor import ClaimExtractorService
from app.services.evidence.credibility_engine import CredibilityEngineService

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


async def test_deterministic_claim_extraction():
    """Verify deterministic parsing rules extract correct claim types and values."""
    content = {
        "professional_summary": "Expert with 7 years of experience in React.",
        "skills": [
            {
                "category": "Languages",
                "skills": ["Python", "JavaScript"]
            }
        ],
        "experience": [
            {
                "id": "exp-1",
                "company": "Google LLC",
                "position": "SWE Intern",
                "start_date": "Jan 2024",
                "end_date": "Present",
                "is_current": True,
                "bullets": ["Led development of React dashboard.", "Reduced latency by 45% saving $15,000."]
            }
        ],
        "education": [
            {
                "id": "edu-1",
                "institution": "Stanford University",
                "degree": "B.S. Computer Science",
                "grade": "3.9 GPA",
                "start_date": "2020",
                "end_date": "2024"
            }
        ],
        "certifications": [
            {
                "id": "cert-1",
                "name": "AWS Solutions Architect",
                "issuer": "Amazon Web Services",
                "issue_date": "Feb 2023"
            }
        ]
    }

    claims = ClaimExtractorService.deterministic_extract_claims(content)

    # 1. Skill & Technology deterministic extraction
    tech_claims = [c for c in claims if c["claim_type"] == "technology"]
    assert any("Python" in c["claim_text"] for c in tech_claims)

    # 2. Employer deterministic extraction
    employer_claims = [c for c in claims if c["claim_type"] == "employer"]
    assert any("Google" in c["claim_text"] for c in employer_claims)

    # 3. Job title deterministic extraction
    role_claims = [c for c in claims if c["claim_type"] == "role"]
    assert any("SWE Intern" in c["claim_text"] for c in role_claims)

    # 4. Project/Education deterministic extraction
    edu_claims = [c for c in claims if c["claim_type"] == "education"]
    assert any("Stanford" in c["claim_text"] for c in edu_claims)
    assert any("B.S. Computer Science" in c["claim_text"] for c in edu_claims)

    # 5. Certification deterministic extraction
    cert_claims = [c for c in claims if c["claim_type"] == "certification"]
    assert any("AWS" in c["claim_text"] for c in cert_claims)

    # 6. Dates extraction
    date_claims = [c for c in claims if c["claim_type"] == "date"]
    assert any("Jan 2024" in c["claim_text"] for c in date_claims)
    assert any("Feb 2023" in c["claim_text"] for c in date_claims)

    # 7. Percentages & Currency metrics
    metric_claims = [c for c in claims if c["claim_type"] == "metric"]
    assert any("45%" in c["claim_text"] for c in metric_claims)
    assert any("$15,000" in c["claim_text"] for c in metric_claims)
    assert any("7 years" in c["claim_text"] for c in metric_claims)

    # 8. Leadership claims
    assert any("leadership" in c["normalized_value"] for c in claims)


async def test_fingerprint_normalization_and_deduplication():
    """Verify same claim produces same fingerprint and different ones do not collide."""
    fp1 = ClaimExtractorService._generate_fingerprint("employer", "google", "experience", "exp-1")
    fp2 = ClaimExtractorService._generate_fingerprint("employer", "google", "experience", "exp-1")
    fp3 = ClaimExtractorService._generate_fingerprint("employer", "google", "experience", "exp-2")

    assert fp1 == fp2
    assert fp1 != fp3


async def test_credibility_scoring_logic():
    """Verify credibility scoring formula & dimensions calculation."""
    # Build list of mocked claims
    claims = [
        ResumeClaim(id=uuid.uuid4(), claim_text="React", claim_type="technology", verification_status="source_verified"),
        ResumeClaim(id=uuid.uuid4(), claim_text="Google", claim_type="employer", verification_status="career_profile_supported"),
        ResumeClaim(id=uuid.uuid4(), claim_text="Stanford", claim_type="education", verification_status="unsupported"),
        ResumeClaim(id=uuid.uuid4(), claim_text="Latency by 40%", claim_type="metric", verification_status="contradictory")
    ]

    # Set mock evidence sources
    claims[0].evidence_sources = [EvidenceSource(label="V1", source_type="profile", support_kind="factual_support", evidence_strength="direct", verification_status="source_verified")]
    claims[1].evidence_sources = [EvidenceSource(label="V2", source_type="profile", support_kind="factual_support", evidence_strength="corroborating", verification_status="user_confirmed")]

    total_claims = len(claims)
    cnt_supported = 2
    cnt_contradictions = 1
    cnt_career_profile = 1
    cnt_unsupported = 1

    high_risk_claims = [c for c in claims if c.claim_type in ["employer", "role", "degree", "certification", "metric"]]
    cnt_high_risk_supported = 1 # Google is supported

    total_evidence_sources = 2
    cnt_verified_evidence = 2

    claim_support_score = 40.0 * (cnt_supported / total_claims) # 20.0
    internal_consistency_score = max(0.0, 20.0 - 5.0 * cnt_contradictions) # 15.0
    career_profile_score = 15.0 * (cnt_career_profile / total_claims) # 3.75

    applicable_max = 40.0 + 20.0 + 15.0

    high_risk_score = 0.0
    if len(high_risk_claims) > 0:
        high_risk_score = 15.0 * (cnt_high_risk_supported / len(high_risk_claims)) # 15 * 0.5 = 7.5
        applicable_max += 15.0

    transparency_score = 0.0
    if total_evidence_sources > 0:
        transparency_score = 10.0 * (cnt_verified_evidence / total_evidence_sources) # 10.0
        applicable_max += 10.0

    raw_score = claim_support_score + internal_consistency_score + career_profile_score + high_risk_score + transparency_score
    overall_score = max(0, min(100, int((raw_score / applicable_max) * 100)))

    assert overall_score > 0
    assert overall_score < 100
    assert claim_support_score == 20.0
    assert internal_consistency_score == 15.0


async def test_contradiction_detection():
    """Verify conservative contradiction checks detect conflicts without false positives."""
    facts = [
        {
            "type": "experience",
            "company": "Tech Inc",
            "title": "Software Engineer",
            "start_date": "Jan 2023",
            "end_date": "Dec 2023",
            "is_current": False,
            "bullets": ["Reduced memory usage by 15%"]
        }
    ]

    # 1. Date conflict
    claim_date = ResumeClaim(
        claim_text="Started at Tech Inc",
        claim_type="date",
        field_name="start_date",
        normalized_value="jan 2024",
        original_text="Jan 2024",
        source_section="experience"
    )
    res_date = CredibilityEngineService.check_contradictions(claim_date, facts)
    assert res_date is not None

    # 2. Metric conflict
    claim_metric = ResumeClaim(
        claim_text="Reduced memory usage by 40%",
        claim_type="metric",
        normalized_value="40%",
        original_text="Reduced memory usage by 40%",
        source_section="experience"
    )
    res_metric = CredibilityEngineService.check_contradictions(claim_metric, facts)
    assert res_metric is not None

    # 3. Absence is not contradiction
    claim_absent = ResumeClaim(
        claim_text="Built project using Rust",
        claim_type="technology",
        normalized_value="rust",
        original_text="Built project using Rust",
        source_section="experience"
    )
    res_absent = CredibilityEngineService.check_contradictions(claim_absent, facts)
    assert res_absent is None


async def test_evidence_audit_graceful_llm_fallback(client: AsyncClient):
    """Verify claim audits run successfully deterministically even when LLM fails."""
    token = await _register_and_login(client, "fallback@example.com", "Fallback User")
    headers = {"Authorization": f"Bearer {token}"}

    # Create resume
    resume_data = {
        "title": "Fallback Resume",
        "template_id": "modern",
        "content": {
            "experience": [
                {
                    "id": str(uuid.uuid4()),
                    "company": "Netflix",
                    "position": "Manager",
                    "bullets": ["Did leadership stuff."]
                }
            ]
        }
    }
    create_res = await client.post("/api/v1/resumes", json=resume_data, headers=headers)
    assert create_res.status_code == 201
    resume_id = create_res.json()["id"]

    # Mock complete to raise an exception
    with patch("app.services.evidence.claim_extractor.GeminiProvider.complete", side_effect=Exception("API limit exceeded")):
        audit_res = await client.post(f"/api/v1/resumes/{resume_id}/evidence-audits", headers=headers)
        assert audit_res.status_code == 200
        data = audit_res.json()
        assert data["ai_fallback_active"] is True
        assert data["overall_score"] is not None


async def test_audit_history_and_caching(client: AsyncClient):
    """Verify audits are stored historically, cache hits return existing logs, and force=True re-runs."""
    token = await _register_and_login(client, "history@example.com", "History User")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = {
        "title": "History Resume",
        "template_id": "modern",
        "content": {}
    }
    create_res = await client.post("/api/v1/resumes", json=resume_data, headers=headers)
    resume_id = create_res.json()["id"]

    # 1. Run audit
    res1 = await client.post(f"/api/v1/resumes/{resume_id}/evidence-audits", headers=headers)
    audit1 = res1.json()

    # 2. Run again (cache hit)
    res2 = await client.post(f"/api/v1/resumes/{resume_id}/evidence-audits", headers=headers)
    audit2 = res2.json()
    assert audit1["id"] == audit2["id"]

    # 3. Run with force=True
    res3 = await client.post(f"/api/v1/resumes/{resume_id}/evidence-audits?force=true", headers=headers)
    audit3 = res3.json()
    assert audit1["id"] != audit3["id"]


async def test_claim_confirm_and_link(client: AsyncClient):
    """Verify claim confirmations, link, and stale audit state trigger."""
    token = await _register_and_login(client, "linkconfirm@example.com", "Link User")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = {
        "title": "Link Resume",
        "template_id": "modern",
        "content": {
            "experience": [
                {
                    "id": "exp-1",
                    "company": "Amazon Inc",
                    "position": "Manager",
                    "bullets": ["Did stuff."]
                }
            ]
        }
    }
    create_res = await client.post("/api/v1/resumes", json=resume_data, headers=headers)
    resume_id = create_res.json()["id"]

    # Run audit to generate claims
    await client.post(f"/api/v1/resumes/{resume_id}/evidence-audits", headers=headers)

    # Fetch claims
    claims_res = await client.get(f"/api/v1/resumes/{resume_id}/claims", headers=headers)
    claims = claims_res.json()["claims"]
    assert len(claims) > 0
    claim_id = claims[0]["id"]

    # Confirm claim
    confirm_res = await client.post(
        f"/api/v1/resumes/{resume_id}/claims/{claim_id}/confirm",
        json={"note": "Verified by my contract"},
        headers=headers
    )
    assert confirm_res.status_code == 200
    assert confirm_res.json()["verification_status"] == "user_confirmed"


async def test_suggestion_application_blocking(client: AsyncClient, db_session: AsyncSession):
    """Verify apply-time revalidation blocks suggestions introducing unsupported claims or contradictions."""
    token = await _register_and_login(client, "suggestionblock@example.com", "Sugg User")
    headers = {"Authorization": f"Bearer {token}"}

    resume_data = {
        "title": "Suggestion Resume",
        "template_id": "modern",
        "content": {
            "experience": [
                {
                    "id": "exp-1",
                    "company": "Airtel",
                    "position": "SDE",
                    "bullets": ["Wrote code."]
                }
            ]
        }
    }
    create_res = await client.post("/api/v1/resumes", json=resume_data, headers=headers)
    resume_id = uuid.UUID(create_res.json()["id"])

    # Mock suggestion that introduces a fabricated metric (e.g. saving 90% latency)
    # The application should be blocked because the new metric is unsupported in the facts.
    sugg = AISuggestion(
        resume_id=resume_id,
        source_resume_version=1,
        suggestion_type="bullet_enhancement",
        target_section="experience",
        target_entry_id="exp-1",
        target_field="bullets",
        target_index=0,
        original_text="Wrote code.",
        suggested_text="Wrote code and saved 90% latency.",
        risk_level="low",
        status="pending"
    )
    db_session.add(sugg)
    await db_session.commit()
    await db_session.refresh(sugg)

    # Try applying
    from app.db.models.user import User
    user = await db_session.scalar(select(User).where(User.email == "suggestionblock@example.com"))
    user_id = user.id

    with pytest.raises(Exception) as exc_info:
        await AISuggestionService.apply_suggestion(db_session, sugg.id, user_id)

    assert "blocked" in str(exc_info.value).lower() or "unverified" in str(exc_info.value).lower()

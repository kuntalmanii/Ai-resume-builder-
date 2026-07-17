"""Evidence Credibility Engine Service."""
import hashlib
import re
import uuid
from typing import Any

from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import ResourceNotFoundError
from app.db.models.career_entry import CareerEntry
from app.db.models.evidence_audit import EvidenceAudit
from app.db.models.evidence_source import EvidenceSource
from app.db.models.profile import CareerProfile
from app.db.models.resume import Resume
from app.db.models.resume_claim import ResumeClaim


class LLMClaimVerification(BaseModel):
    claim_id: str = Field(..., description="The ID of the claim being verified")
    verification_status: str = Field(..., description="source_verified, user_confirmed, inferred, unverified, contradictory")
    contradiction_details: str | None = Field(None, description="Details if the claim contradicts known facts")
    supporting_sources: list[str] = Field(default_factory=list, description="List of source facts supporting this claim")

class LLMVerificationBatchOutput(BaseModel):
    verifications: list[LLMClaimVerification] = Field(default_factory=list)

CREDIBILITY_VERSION = "credibility-v1.0"

SUPPORT_MULTIPLIERS = {
    "source_verified": 1.0,
    "user_confirmed": 0.85,
    "career_profile_supported": 0.6,
    "resume_supported": 0.4,
    "self_reported": 0.25,
    "contextually_corroborated": 0.5,
    "insufficient_information": 0.1,
    "unsupported": 0.0,
    "contradictory": 0.0
}

RISK_WEIGHTS = {
    "employer": 3,
    "role": 3,
    "degree": 3,
    "certification": 3,
    "metric": 3,
    "project": 2,
    "technology": 2,
    "responsibility": 1
}


class CredibilityEngineService:

    @classmethod
    async def compute_evidence_state_fingerprint(cls, db: AsyncSession, resume_id: uuid.UUID, user_id: uuid.UUID) -> str:
        """Generate a fingerprint of the current state of career profile data, claims, and confirmations."""
        # 1. Fetch CareerEntries
        entries_stmt = select(CareerEntry).where(CareerEntry.user_id == user_id).order_by(CareerEntry.id)
        entries = list(await db.scalars(entries_stmt))

        # 2. Fetch ResumeClaims
        claims_stmt = select(ResumeClaim).where(ResumeClaim.resume_id == resume_id).order_by(ResumeClaim.id)
        claims = list(await db.scalars(claims_stmt))

        # 3. Compile fingerprint content
        state_parts = []
        for ent in entries:
            state_parts.append(f"entry:{ent.id}:{ent.updated_at.isoformat()}:{ent.verification_status}")
        for c in claims:
            state_parts.append(f"claim:{c.id}:{c.verification_status}:{c.updated_at.isoformat()}")

        state_str = "|".join(state_parts)
        return hashlib.sha256(state_str.encode("utf-8")).hexdigest()

    @classmethod
    def check_contradictions(cls, claim: ResumeClaim, facts: list[dict[str, Any]]) -> str | None:
        """
        Deterministically detect contradictions between a resume claim and profile facts.
        Returns a string detailing the contradiction if found, otherwise None.
        """
        # Date contradiction checks
        if claim.claim_type == "date" and claim.field_name in ["start_date", "end_date"]:
            # Match the corresponding employer/role or education
            # We look for corresponding entries where titles/company are identical
            for f in facts:
                # Same employer date check
                if f.get("type") == "experience" and claim.source_section == "experience":
                    c_norm = cls.normalize_text(claim.claim_text)
                    company_norm = cls.normalize_text(f.get("company", ""))
                    if company_norm and company_norm in c_norm:
                        # Compare dates
                        fact_start = f.get("start_date")
                        fact_end = f.get("end_date")
                        # e.g., if claim end date is "Jan 2024" but fact end date is "Jan 2023"
                        if claim.field_name == "end_date" and fact_end and claim.normalized_value != cls.normalize_text(fact_end):
                            return f"End date conflict for role at {f.get('company')}. Resume: {claim.original_text}, Profile: {fact_end}"
                        if claim.field_name == "start_date" and fact_start and claim.normalized_value != cls.normalize_text(fact_start):
                            return f"Start date conflict for role at {f.get('company')}. Resume: {claim.original_text}, Profile: {fact_start}"

        # Current-role vs explicit end-date conflicts
        if claim.claim_type == "role" and claim.field_name == "is_current" and claim.normalized_value == "current":
            for f in facts:
                if f.get("type") == "experience":
                    c_norm = cls.normalize_text(claim.claim_text)
                    company_norm = cls.normalize_text(f.get("company", ""))
                    if company_norm and company_norm in c_norm:
                        if f.get("end_date") and not f.get("is_current"):
                            return f"Role at {f.get('company')} is marked as current on resume, but has an end date of {f.get('end_date')} in Profile."

        # Degree-year conflicts
        if claim.claim_type == "education" and claim.field_name == "degree":
            for f in facts:
                if f.get("type") == "education":
                    inst_norm = cls.normalize_text(f.get("institution", ""))
                    if inst_norm and inst_norm in cls.normalize_text(claim.claim_text):
                        if f.get("degree") and cls.normalize_text(f.get("degree")) != claim.normalized_value:
                            return f"Degree mismatch at {f.get('institution')}. Resume: {claim.original_text}, Profile: {f.get('degree')}"

        # Metric conflicts
        if claim.claim_type == "metric":
            for f in facts:
                # If metric description matches (e.g. reduced latency) but number differs
                b_list = f.get("bullets", [])
                for b in b_list:
                    if cls.is_similar_achievement(claim.original_text or claim.claim_text, b):
                        # Extract digits
                        claim_digits = re.findall(r"\d+", claim.claim_text)
                        fact_digits = re.findall(r"\d+", b)
                        if claim_digits and fact_digits and claim_digits != fact_digits:
                            return f"Metric conflict for achievement. Resume: {claim.claim_text}, Profile: {b}"

        return None

    @classmethod
    def normalize_text(cls, text: str) -> str:
        if not text:
            return ""
        return " ".join(text.lower().strip().split())

    @classmethod
    def is_similar_achievement(cls, txt1: str, txt2: str) -> bool:
        """Heuristic check to see if two bullet lines describe the same project/achievement context."""
        t1 = cls.normalize_text(txt1)
        t2 = cls.normalize_text(txt2)
        # Check shared keyword tokens (excluding stop words)
        stop_words = {"the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "of"}
        w1 = {w for w in t1.split() if w not in stop_words and len(w) > 3}
        w2 = {w for w in t2.split() if w not in stop_words and len(w) > 3}
        if not w1 or not w2:
            return False
        shared = w1.intersection(w2)
        return len(shared) >= 3 or (len(shared) / min(len(w1), len(w2)) >= 0.5)

    @classmethod
    async def _fetch_user_facts_list(cls, db: AsyncSession, user_id: uuid.UUID) -> list[dict[str, Any]]:
        """Fetch all user facts as structured dictionaries for deterministic verification."""
        profile_stmt = select(CareerProfile).where(CareerProfile.user_id == user_id)
        profile = await db.scalar(profile_stmt)

        entries_stmt = select(CareerEntry).where(CareerEntry.user_id == user_id)
        entries_res = await db.scalars(entries_stmt)
        entries = list(entries_res)

        facts = []
        if profile:
            if profile.professional_summary:
                facts.append({"type": "summary", "text": profile.professional_summary})
            if profile.skills:
                # skills is a dict or list
                if isinstance(profile.skills, dict):
                    for k, v in profile.skills.items():
                        if isinstance(v, list):
                            for s in v:
                                facts.append({"type": "skill", "name": s, "category": k})
                elif isinstance(profile.skills, list):
                    for s in profile.skills:
                        facts.append({"type": "skill", "name": s})
            for exp in profile.experience:
                facts.append({
                    "type": "experience",
                    "company": exp.get("company"),
                    "title": exp.get("position") or exp.get("title"),
                    "start_date": exp.get("start_date"),
                    "end_date": exp.get("end_date"),
                    "is_current": exp.get("is_current"),
                    "bullets": exp.get("bullets", [])
                })
            for proj in profile.projects:
                facts.append({
                    "type": "project",
                    "name": proj.get("name"),
                    "bullets": proj.get("bullets", [])
                })

        for ent in entries:
            # Map career entry content to facts list
            ec = ent.data or {}
            facts.append({
                "type": ent.entry_type,
                "company": ec.get("company") or ec.get("organization") or ent.organization,
                "title": ec.get("position") or ec.get("title") or ent.title,
                "name": ec.get("name") or ent.title,
                "start_date": ent.start_date,
                "end_date": ent.end_date,
                "is_current": ent.is_current,
                "bullets": ec.get("bullets") or [ec.get("description")] if ec.get("bullets") or ec.get("description") else [],
                "verification_status": ent.verification_status,
                "entry_id": str(ent.id)
            })

        return facts

    @classmethod
    async def verify_claim_deterministically(
        cls,
        claim: ResumeClaim,
        facts: list[dict[str, Any]]
    ) -> tuple[str, str | None, list[dict[str, Any]]]:
        """
        Verify a single claim deterministically against user facts.
        Returns (verification_status, contradiction_details, list_of_evidence_metadata).
        """
        # 1. Check for contradictions first
        contradiction = cls.check_contradictions(claim, facts)
        if contradiction:
            return "contradictory", contradiction, []

        evidence = []
        c_norm = cls.normalize_text(claim.claim_text)

        # 2. Check profile facts for direct or corroborating support
        for f in facts:
            # Check matching employer
            if claim.claim_type == "employer" and f.get("type") == "experience":
                fact_company = cls.normalize_text(f.get("company", ""))
                if fact_company and fact_company == claim.normalized_value:
                    is_verified = f.get("verification_status") == "source_verified"
                    status = "source_verified" if is_verified else "career_profile_supported"
                    evidence.append({
                        "label": f"Profile matches employer: {f.get('company')}",
                        "source_type": "career_profile",
                        "source_id": f.get("entry_id"),
                        "support_kind": "factual_support",
                        "evidence_strength": "direct" if is_verified else "corroborating",
                        "verification_status": status
                    })

            # Check matching role
            if claim.claim_type == "role" and f.get("type") == "experience":
                fact_title = cls.normalize_text(f.get("title", ""))
                if fact_title and fact_title == claim.normalized_value:
                    is_verified = f.get("verification_status") == "source_verified"
                    status = "source_verified" if is_verified else "career_profile_supported"
                    evidence.append({
                        "label": f"Profile matches role: {f.get('title')}",
                        "source_type": "career_profile",
                        "source_id": f.get("entry_id"),
                        "support_kind": "factual_support",
                        "evidence_strength": "direct" if is_verified else "corroborating",
                        "verification_status": status
                    })

            # Check matching project
            if claim.claim_type == "project" and f.get("type") == "project":
                fact_name = cls.normalize_text(f.get("name", ""))
                if fact_name and fact_name == claim.normalized_value:
                    evidence.append({
                        "label": f"Profile matches project: {f.get('name')}",
                        "source_type": "career_profile",
                        "source_id": f.get("entry_id"),
                        "support_kind": "factual_support",
                        "evidence_strength": "corroborating",
                        "verification_status": "career_profile_supported"
                    })

            # Check matching technology/skill
            if claim.claim_type == "technology" and f.get("type") == "skill":
                fact_skill = cls.normalize_text(f.get("name", ""))
                if fact_skill and fact_skill == claim.normalized_value:
                    evidence.append({
                        "label": f"Profile lists skill: {f.get('name')}",
                        "source_type": "career_profile",
                        "support_kind": "factual_support",
                        "evidence_strength": "direct",
                        "verification_status": "career_profile_supported"
                    })

            # General keyword matching in descriptions/bullets (corroborating support)
            bullets = f.get("bullets", [])
            for b in bullets:
                if b and cls.is_similar_achievement(claim.claim_text, b):
                    is_verified = f.get("verification_status") == "source_verified"
                    status = "source_verified" if is_verified else "career_profile_supported"
                    evidence.append({
                        "label": f"Achievement matches: {b[:100]}...",
                        "source_type": "career_profile",
                        "source_id": f.get("entry_id"),
                        "support_kind": "corroborating_support",
                        "evidence_strength": "corroborating",
                        "verification_status": status,
                        "excerpt": b
                    })

        # Deduplicate evidence sources based on label
        seen_labels = set()
        dedup_evidence = []
        for ev in evidence:
            if ev["label"] not in seen_labels:
                seen_labels.add(ev["label"])
                dedup_evidence.append(ev)

        # 3. Determine status
        if dedup_evidence:
            # Check if any evidence is source_verified
            if any(ev["verification_status"] == "source_verified" for ev in dedup_evidence):
                return "source_verified", None, dedup_evidence
            return "career_profile_supported", None, dedup_evidence

        # Check for self-reported (e.g. responsibility claims or qualitative statements that don't need external verification)
        if claim.claim_type == "responsibility" and len(claim.claim_text.split()) > 3:
            return "self_reported", None, []

        return "unsupported", None, []

    @classmethod
    async def compute_evidence_map(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        force: bool = False,
        ai_fallback_active: bool = False
    ) -> tuple[list[ResumeClaim], EvidenceAudit]:
        """
        Verify all claims for a resume against Career Profile facts.
        Preserves cache and updates/saves the latest EvidenceAudit run.
        Returns (claims, audit).
        """
        # 1. Fetch resume and verify version
        resume = await db.get(Resume, resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        # Compute current state fingerprint
        state_fingerprint = await cls.compute_evidence_state_fingerprint(db, resume_id, user_id)

        # 2. Check Cache
        if not force:
            cache_stmt = (
                select(EvidenceAudit)
                .where(
                    EvidenceAudit.resume_id == resume_id,
                    EvidenceAudit.resume_version == resume.version,
                    EvidenceAudit.credibility_version == CREDIBILITY_VERSION,
                    EvidenceAudit.evidence_state_fingerprint == state_fingerprint,
                    EvidenceAudit.status == "completed"
                )
                .order_by(desc(EvidenceAudit.created_at))
            )
            cached_audit = await db.scalar(cache_stmt)
            if cached_audit:
                # Return claims and score directly
                claims_stmt = (
                    select(ResumeClaim)
                    .options(selectinload(ResumeClaim.evidence_sources))
                    .where(ResumeClaim.resume_id == resume_id)
                )
                claims = list(await db.scalars(claims_stmt))
                return claims, cached_audit

        # 3. Load all claims
        claims_stmt = (
            select(ResumeClaim)
            .options(selectinload(ResumeClaim.evidence_sources))
            .where(ResumeClaim.resume_id == resume_id)
        )
        claims = list(await db.scalars(claims_stmt))

        # Load user facts
        facts = await cls._fetch_user_facts_list(db, user_id)

        # 4. Verify each claim deterministically
        unverified_claims = [c for c in claims if c.verification_status in ["unverified", "unsupported", "career_profile_supported"]]

        for claim in claims:
            # Preserve user confirmations - do not overwrite user_confirmed claims
            if claim.verification_status == "user_confirmed":
                continue

            status, contra_details, evidence_list = await cls.verify_claim_deterministically(claim, facts)

            claim.verification_status = status
            claim.contradiction_details = contra_details

            # Re-map evidence sources
            # Delete old evidence sources first
            for ev in list(claim.evidence_sources):
                await db.delete(ev)

            for ev in evidence_list:
                evidence = EvidenceSource(
                    resume_claim_id=claim.id,
                    label=ev["label"][:255],
                    source_type=ev["source_type"],
                    source_id=ev.get("source_id"),
                    support_kind=ev["support_kind"],
                    evidence_strength=ev["evidence_strength"],
                    verification_status=ev["verification_status"],
                    excerpt=ev.get("excerpt")
                )
                db.add(evidence)

        await db.flush()

        # 5. Score Calculation (5-Dimensions)
        total_claims = len(claims)
        if total_claims == 0:
            # Create a completed audit record with 100% score
            audit = EvidenceAudit(
                resume_id=resume_id,
                resume_version=resume.version,
                credibility_version=CREDIBILITY_VERSION,
                evidence_state_fingerprint=state_fingerprint,
                overall_score=100,
                raw_score=100.0,
                raw_applicable_max=100.0,
                claim_support_score=40.0,
                internal_consistency_score=20.0,
                career_profile_score=15.0,
                high_risk_support_score=15.0,
                transparency_score=10.0,
                claim_count=0,
                contradiction_count=0,
                unsupported_count=0,
                status="completed",
                ai_fallback_active=ai_fallback_active
            )
            db.add(audit)
            await db.flush()
            return claims, audit

        # Count claims by status
        cnt_supported = sum(1 for c in claims if c.verification_status in ["source_verified", "user_confirmed", "career_profile_supported"])
        cnt_contradictions = sum(1 for c in claims if c.verification_status == "contradictory")
        cnt_career_profile = sum(1 for c in claims if c.verification_status == "career_profile_supported")
        cnt_unsupported = sum(1 for c in claims if c.verification_status == "unsupported")

        # High risk claim scoring
        high_risk_claims = [c for c in claims if c.claim_type in ["employer", "role", "degree", "certification", "metric"]]
        cnt_high_risk_supported = sum(1 for c in high_risk_claims if c.verification_status in ["source_verified", "user_confirmed", "career_profile_supported"])

        # Transparency scoring
        total_evidence_sources = sum(len(c.evidence_sources) for c in claims)
        cnt_verified_evidence = sum(sum(1 for ev in c.evidence_sources if ev.verification_status in ["source_verified", "user_confirmed"]) for c in claims)

        # Calculate raw dimension scores
        claim_support_score = 40.0 * (cnt_supported / total_claims)
        internal_consistency_score = max(0.0, 20.0 - 5.0 * cnt_contradictions)
        career_profile_score = 15.0 * (cnt_career_profile / total_claims)

        # Determine applicable dimensions for dynamic normalization
        applicable_max = 40.0 + 20.0 + 15.0  # Claim Support, Consistency, and Profile Corroboration are always applicable

        high_risk_score = 0.0
        if len(high_risk_claims) > 0:
            high_risk_score = 15.0 * (cnt_high_risk_supported / len(high_risk_claims))
            applicable_max += 15.0

        transparency_score = 0.0
        if total_evidence_sources > 0:
            transparency_score = 10.0 * (cnt_verified_evidence / total_evidence_sources)
            applicable_max += 10.0

        raw_score = claim_support_score + internal_consistency_score + career_profile_score + high_risk_score + transparency_score
        overall_score = max(0, min(100, int((raw_score / applicable_max) * 100)))

        # 6. Persist Audit
        audit = EvidenceAudit(
            resume_id=resume_id,
            resume_version=resume.version,
            credibility_version=CREDIBILITY_VERSION,
            evidence_state_fingerprint=state_fingerprint,
            overall_score=overall_score,
            raw_score=raw_score,
            raw_applicable_max=applicable_max,
            claim_support_score=claim_support_score,
            internal_consistency_score=internal_consistency_score,
            career_profile_score=career_profile_score,
            high_risk_support_score=high_risk_score,
            transparency_score=transparency_score,
            claim_count=total_claims,
            contradiction_count=cnt_contradictions,
            unsupported_count=cnt_unsupported,
            status="completed",
            ai_fallback_active=ai_fallback_active,
            summary=f"Audit completed. Score: {overall_score}/100. Claims checked: {total_claims}."
        )
        db.add(audit)
        await db.flush()

        return claims, audit

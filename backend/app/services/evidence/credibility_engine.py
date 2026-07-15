"""Credibility Engine Service."""
import uuid
from typing import List, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.db.models.resume import Resume
from app.db.models.resume_claim import ResumeClaim
from app.db.models.evidence_source import EvidenceSource
from app.db.models.profile import CareerProfile
from app.db.models.career_entry import CareerEntry
from app.ai.gemini_provider import GeminiProvider
from app.core.exceptions import ResourceNotFoundError


class LLMClaimVerification(BaseModel):
    claim_id: str = Field(..., description="The ID of the claim being verified")
    verification_status: str = Field(..., description="source_verified, user_confirmed, inferred, unverified, contradictory")
    contradiction_details: str | None = Field(None, description="Details if the claim contradicts known facts")
    supporting_sources: List[str] = Field(default_factory=list, description="List of source facts supporting this claim")

class LLMVerificationBatchOutput(BaseModel):
    verifications: List[LLMClaimVerification] = Field(default_factory=list)


class CredibilityEngineService:

    @staticmethod
    async def _fetch_user_facts(db: AsyncSession, user_id: uuid.UUID) -> str:
        """Fetch all trusted facts for a user."""
        profile_stmt = select(CareerProfile).where(CareerProfile.user_id == user_id)
        profile = await db.scalar(profile_stmt)
        
        entries_stmt = select(CareerEntry).where(CareerEntry.user_id == user_id)
        entries_res = await db.scalars(entries_stmt)
        entries = list(entries_res)

        facts = []
        if profile:
            if profile.professional_summary:
                facts.append(f"Profile Summary: {profile.professional_summary}")
            if profile.skills:
                facts.append(f"Skills: {profile.skills}")
            for exp in profile.experience:
                facts.append(f"Experience at {exp.get('company')} ({exp.get('position')}): {', '.join(exp.get('bullets', []))}")
            for proj in profile.projects:
                facts.append(f"Project {proj.get('name')}: {', '.join(proj.get('bullets', []))}")
        
        for ent in entries:
            # Verified entries carry more weight but for now we dump all
            v_status = ent.verification_status
            facts.append(f"Career Entry ({ent.entry_type}) [Status: {v_status}]: {ent.content.get('company') or ent.content.get('name')} - {ent.content.get('position') or ''}: {ent.content.get('description') or ''}")

        return "\n".join([f"- {f}" for f in facts]) or "No career facts documented yet."

    @classmethod
    async def compute_evidence_map(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Tuple[List[ResumeClaim], int]:
        """
        Verify all unverified claims for a resume against the user's truth facts,
        create EvidenceSource mappings, and calculate the overall credibility score.
        """
        # 1. Fetch claims
        claims_stmt = (
            select(ResumeClaim)
            .options(selectinload(ResumeClaim.evidence_sources))
            .where(ResumeClaim.resume_id == resume_id)
        )
        claims_res = await db.scalars(claims_stmt)
        claims = list(claims_res)
        
        if not claims:
            return [], 100

        unverified_claims = [c for c in claims if c.verification_status == "unverified"]
        
        if unverified_claims:
            # 2. Fetch ground truth facts
            facts_text = await cls._fetch_user_facts(db, user_id)
            
            # 3. Call LLM for verification batch
            provider = GeminiProvider()
            system_prompt = (
                "You are an expert fact-checker and credibility auditor. Your task is to verify a list of claims "
                "against a provided set of Ground Truth Facts from a user's Career Profile.\n\n"
                "CRITICAL INSTRUCTIONS:\n"
                "1. For each claim, determine its verification status:\n"
                "   - 'user_confirmed': The claim is explicitly stated in the facts.\n"
                "   - 'inferred': The claim is not explicitly stated but is heavily implied or corroborated by the facts.\n"
                "   - 'unverified': There is no evidence for or against the claim in the facts.\n"
                "   - 'contradictory': The claim explicitly contradicts a fact (e.g. claims 5 years experience, fact says 2 years).\n"
                "2. If 'contradictory', provide a brief explanation in 'contradiction_details'.\n"
                "3. List the exact supporting facts in 'supporting_sources'."
            )
            
            claims_text = "\n".join([f"ID: {c.id} | Claim: {c.claim_text}" for c in unverified_claims])
            user_prompt = (
                f"Ground Truth Facts:\n{facts_text}\n\n"
                f"Claims to Verify:\n{claims_text}\n\n"
                "Please verify all claims and output the structured result."
            )

            output: LLMVerificationBatchOutput = await provider.complete(
                prompt=user_prompt,
                system_prompt=system_prompt,
                response_schema=LLMVerificationBatchOutput,
                temperature=0.1
            )
            
            # 4. Map results back to DB
            claim_map = {str(c.id): c for c in unverified_claims}
            for v in output.verifications:
                claim = claim_map.get(v.claim_id)
                if not claim:
                    continue
                    
                claim.verification_status = v.verification_status
                claim.contradiction_details = v.contradiction_details
                
                # Delete old evidence if any (should be none for unverified)
                for ev in list(claim.evidence_sources):
                    await db.delete(ev)
                
                # Add new evidence sources
                for src in v.supporting_sources:
                    evidence = EvidenceSource(
                        resume_claim_id=claim.id,
                        label=src[:255],
                        source_type="career_profile",
                        support_kind="factual_support",
                        evidence_strength="direct" if v.verification_status in ["source_verified", "user_confirmed"] else "contextual",
                        verification_status="user_confirmed"
                    )
                    db.add(evidence)
            
            await db.commit()
            
            # Refresh claims
            for c in claims:
                await db.refresh(c)
                
        # 5. Calculate credibility score (0-100)
        # Score calculation: 
        # source_verified = +10, user_confirmed = +10, inferred = +5, unverified = +0, contradictory = -20
        # Normalize to 0-100 based on max possible score (all claims source_verified/user_confirmed)
        if not claims:
            return [], 100
            
        total_claims = len(claims)
        max_possible = total_claims * 10
        score = 0
        
        for c in claims:
            if c.verification_status in ["source_verified", "user_confirmed"]:
                score += 10
            elif c.verification_status == "inferred":
                score += 5
            elif c.verification_status == "contradictory":
                score -= 20
                
        normalized_score = max(0, min(100, int((score / max_possible) * 100)))
        
        return claims, normalized_score

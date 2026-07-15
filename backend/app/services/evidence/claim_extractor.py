"""Evidence Claim Extractor Service."""
import uuid
import hashlib
from typing import List, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field

from app.db.models.resume import Resume
from app.db.models.resume_claim import ResumeClaim
from app.ai.gemini_provider import GeminiProvider
from app.core.exceptions import ResourceNotFoundError


class LLMResumeClaim(BaseModel):
    claim_text: str = Field(..., description="The factual atomic claim made in the resume")
    source_section: str = Field(..., description="Section of the resume (e.g., experience, education, summary, projects)")
    source_entry_id: str = Field(None, description="Optional ID of the entry (e.g. specific job experience ID) if provided in the input text")
    claim_type: str = Field(..., description="Type: metric, technology, scope, responsibility, role, certification, education")

class LLMClaimExtractionOutput(BaseModel):
    claims: List[LLMResumeClaim] = Field(default_factory=list, description="List of atomic claims extracted from the resume content")


class ClaimExtractorService:
    @staticmethod
    def _generate_fingerprint(claim_text: str, source_section: str) -> str:
        """Generate a deterministic hash for a claim to avoid duplicates."""
        normalized_text = " ".join(claim_text.lower().split())
        data = f"{normalized_text}:{source_section}".encode("utf-8")
        return hashlib.sha256(data).hexdigest()

    @staticmethod
    def _format_resume_for_extraction(content: Dict[str, Any]) -> str:
        """Format the resume content into a text representation that includes IDs for traceability."""
        lines = []
        
        # Professional Summary
        summary = content.get("professional_summary") or content.get("summary")
        if summary:
            lines.append("Section: professional_summary")
            lines.append(f"Content: {summary}\n")
            
        # Experience
        for exp in content.get("experience", []):
            lines.append(f"Section: experience | Entry ID: {exp.get('id')}")
            lines.append(f"Role: {exp.get('title')} at {exp.get('company')}")
            for b in exp.get("bullets", []):
                lines.append(f"- {b}")
            lines.append("")
            
        # Projects
        for proj in content.get("projects", []):
            lines.append(f"Section: projects | Entry ID: {proj.get('id')}")
            lines.append(f"Project: {proj.get('name')}")
            for b in proj.get("bullets", []):
                lines.append(f"- {b}")
            lines.append("")
            
        # Education
        for edu in content.get("education", []):
            lines.append(f"Section: education | Entry ID: {edu.get('id')}")
            lines.append(f"Degree: {edu.get('degree')} at {edu.get('institution')} - GPA: {edu.get('gpa', 'N/A')}")
            lines.append("")

        return "\n".join(lines)

    @classmethod
    async def extract_claims_for_resume(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> List[ResumeClaim]:
        """
        Extract atomic claims from a user's resume using LLM,
        and store them as ResumeClaim records in the database.
        """
        # 1. Fetch Resume
        resume = await db.get(Resume, resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        content_text = cls._format_resume_for_extraction(resume.content or {})
        
        if not content_text.strip():
            return []

        # 2. Call LLM to extract claims
        provider = GeminiProvider()
        system_prompt = (
            "You are an expert factual auditor. Your task is to extract atomic, factual claims from a resume document.\n"
            "An atomic claim is a single testable assertion, such as a specific metric achieved, a tool used, a specific responsibility, "
            "or an educational degree obtained.\n\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. Extract ONLY facts present in the text. Do not hallucinate or infer missing details.\n"
            "2. Ensure each claim is atomic (e.g., instead of 'Used Python and SQL to increase sales by 20%', split into "
            "'Used Python', 'Used SQL', 'Increased sales by 20%').\n"
            "3. Carefully map each claim back to its exact `source_section` and `source_entry_id` as provided in the input text.\n"
            "4. Ignore subjective or purely qualitative statements (e.g., 'Passionate worker', 'Great communicator')."
        )
        
        user_prompt = f"Resume Content:\n{content_text}\n\nExtract all atomic factual claims."

        output: LLMClaimExtractionOutput = await provider.complete(
            prompt=user_prompt,
            system_prompt=system_prompt,
            response_schema=LLMClaimExtractionOutput,
            temperature=0.0
        )

        # 3. Fetch existing claims to avoid duplicates
        existing_stmt = select(ResumeClaim).where(ResumeClaim.resume_id == resume_id)
        existing_claims_res = await db.scalars(existing_stmt)
        existing_fingerprints = {c.claim_fingerprint for c in existing_claims_res}

        # 4. Create new claims
        new_claims = []
        for llm_claim in output.claims:
            fingerprint = cls._generate_fingerprint(llm_claim.claim_text, llm_claim.source_section)
            if fingerprint not in existing_fingerprints:
                claim = ResumeClaim(
                    resume_id=resume_id,
                    claim_text=llm_claim.claim_text,
                    claim_fingerprint=fingerprint,
                    source_section=llm_claim.source_section,
                    source_entry_id=llm_claim.source_entry_id,
                    verification_status="unverified"
                )
                db.add(claim)
                new_claims.append(claim)
                existing_fingerprints.add(fingerprint)

        await db.commit()
        
        # Return all claims for this resume
        all_stmt = select(ResumeClaim).where(ResumeClaim.resume_id == resume_id)
        all_res = await db.scalars(all_stmt)
        return list(all_res)

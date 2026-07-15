"""AI Suggestion Service implementation."""
import uuid
import copy
import asyncio
from datetime import datetime
from typing import List, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field

from app.db.models.resume import Resume
from app.db.models.resume_version import ResumeVersion
from app.db.models.ai_suggestion import AISuggestion
from app.db.models.evidence_source import EvidenceSource
from app.db.models.profile import CareerProfile
from app.db.models.career_entry import CareerEntry
from app.db.models.job_description import JobDescription
from app.db.models.job_match_result import JobMatchResult
from app.db.models.analysis import ResumeAnalysis

from app.schemas.ai_suggestion import SuggestionGenerateRequest, ClaimValidationResult
from app.ai.gemini_provider import GeminiProvider
from app.core.exceptions import ResourceNotFoundError, ConflictError


# Schemas for structured LLM completions
class LLMClaim(BaseModel):
    claim_text: str = Field(..., description="The factual claim made in the suggestion")
    claim_type: str = Field(..., description="Type: metric, technology, scope, responsibility, role")
    support_status: str = Field(..., description="supported, partially_supported, unsupported, contradictory, user_confirmation_required")
    supporting_sources: List[str] = Field(default_factory=list, description="List of source facts supporting this claim")
    risk_level: str = Field(..., description="low, medium, high, blocked")

class LLMSuggestionOutput(BaseModel):
    suggested_text: str = Field(..., description="The proposed text for the resume")
    rationale: str = Field(..., description="Why this suggestion improves the resume")
    risk_level: str = Field(..., description="Overall risk level: low, medium, high, blocked")
    claims: List[LLMClaim] = Field(default_factory=list, description="List of claims extracted from the suggested text")
    questions: List[str] = Field(default_factory=list, description="Clarifying questions if achievement metrics are missing")
    expected_score_gain: int = Field(0, description="Estimated ATS score gain (0-10)")

class LLMClaimValidationOnly(BaseModel):
    risk_level: str
    claims: List[LLMClaim]


class AISuggestionService:
    @staticmethod
    def _extract_original_text(doc: dict, section: str, entry_id: str | None, field: str, index: int | None) -> str:
        """Helper to safely extract the original text from a ResumeDocument dict."""
        if section in ["professional_summary", "summary"]:
            return doc.get("professional_summary") or doc.get("summary") or ""
        
        items = doc.get(section, [])
        if not isinstance(items, list):
            return ""
        
        for item in items:
            if item.get("id") == entry_id or str(item.get("id")) == str(entry_id):
                val = item.get(field)
                if isinstance(val, list):
                    if index is not None and 0 <= index < len(val):
                        return val[index]
                    return "\n".join(val)
                return str(val or "")
        return ""

    @staticmethod
    def _apply_text_to_doc(doc: dict, section: str, entry_id: str | None, field: str, index: int | None, new_text: str) -> dict:
        """Helper to safely return a modified copy of a ResumeDocument dict with the new text."""
        new_doc = copy.deepcopy(doc)
        
        if section in ["professional_summary", "summary"]:
            new_doc["professional_summary"] = new_text
            if "summary" in new_doc:
                new_doc["summary"] = new_text
            return new_doc
            
        items = new_doc.get(section, [])
        for item in items:
            if item.get("id") == entry_id or str(item.get("id")) == str(entry_id):
                val = item.get(field)
                if isinstance(val, list):
                    if index is not None and 0 <= index < len(val):
                        val[index] = new_text
                    else:
                        item[field] = [new_text]
                else:
                    item[field] = new_text
                break
        return new_doc

    @classmethod
    async def generate_suggestion(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        req: SuggestionGenerateRequest,
        user_id: uuid.UUID,
        answers: Optional[List[Dict[str, Any]]] = None
    ) -> AISuggestion:
        """Generate a grounded AI resume suggestion."""
        # 1. Fetch Resume and verify ownership
        resume_stmt = select(Resume).where(Resume.id == resume_id, Resume.user_id == user_id)
        resume = await db.scalar(resume_stmt)
        if not resume:
            raise ResourceNotFoundError(f"Resume with id {resume_id} not found")

        # 2. Extract original text
        original_text = cls._extract_original_text(
            resume.content or {},
            req.target_section,
            req.target_entry_id,
            req.target_field,
            req.target_index
        )

        # 3. Retrieve Career Profile and Career Entries as Ground Truth Facts
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
            facts.append(f"Career Entry ({ent.entry_type}): {ent.content.get('company') or ent.content.get('name')} - {ent.content.get('position') or ''}: {ent.content.get('description') or ''}")

        # Add user answers if any
        if answers:
            for ans in answers:
                facts.append(f"User Confirmed Achievement Fact: Question: '{ans.get('question')}' Answer: '{ans.get('answer')}'")

        facts_text = "\n".join([f"- {f}" for f in facts]) or "No career facts documented yet."

        # 4. Fetch Job Description details if provided
        jd_text = ""
        if req.job_description_id:
            jd = await db.get(JobDescription, req.job_description_id)
            if jd:
                jd_text = f"Job Title: {jd.title}\nCompany: {jd.company}\nRequirements: {jd.raw_text}"

        # 5. Call LLM for completion
        provider = GeminiProvider()
        system_prompt = (
            "You are an expert AI career coach and resume optimizer. Your task is to suggest a single high-quality resume improvement "
            "based strictly on the user's career facts. You must perform strict claim validation on any suggestions.\n\n"
            "CRITICAL INSTRUCTIONS FOR GROUNDING AND CLAIMS VALIDATION:\n"
            "1. You MUST NOT fabricate any facts, metrics, or achievements. All claims in the suggested text must be strictly grounded "
            "in the provided Career Profile Facts or the Original Resume content.\n"
            "2. If you want to include an achievement metric (e.g., 'improved sales by 40%') but do not see the exact metric in the facts, "
            "DO NOT make up a number. Instead, write the suggestion using placeholders/qualitative text and add a clarifying question to "
            "the 'questions' list (e.g., 'By what percentage did you improve sales?'). Set that claim's risk_level to 'user_confirmation_required' "
            "and the overall risk_level of the suggestion to 'medium'.\n"
            "3. Extract each atomic claim made in your suggested text. Validate each claim against the provided Career Profile Facts and Original Resume Content:\n"
            "   - 'supported': The claim is fully documented in the facts. (risk_level = 'low')\n"
            "   - 'partially_supported': The claim is partially supported, or requires minor user confirmation. (risk_level = 'medium')\n"
            "   - 'unsupported': The claim has no supporting facts whatsoever in the user's profile. (risk_level = 'high')\n"
            "   - 'contradictory': The claim directly contradicts a fact in the user's profile. (risk_level = 'blocked')\n"
            "4. Set the overall risk_level of the suggestion to the maximum risk of any individual claim."
        )

        user_prompt = (
            f"Original Text to Improve:\n\"{original_text}\"\n\n"
            f"Target Section: {req.target_section}\n"
            f"Target Field: {req.target_field}\n"
            f"Suggestion Type Mode: {req.suggestion_type}\n\n"
            f"Grounded Career Profile Facts (Ground Truth):\n{facts_text}\n\n"
            f"Job Description Context (if any):\n{jd_text}\n\n"
            f"User Specific Instructions:\n{req.instruction or 'Optimize for maximum impact, clarity, and ATS compatibility.'}\n\n"
            "Please generate the optimized text, rationale, expected ATS score gain (0-10), list of atomic claims, and any achievement clarifying questions."
        )

        # Execute structured completion
        output: LLMSuggestionOutput = await provider.complete(
            prompt=user_prompt,
            system_prompt=system_prompt,
            response_schema=LLMSuggestionOutput,
            temperature=0.2
        )

        # 6. Create AISuggestion record
        suggestion = AISuggestion(
            resume_id=resume_id,
            job_description_id=req.job_description_id,
            analysis_id=req.analysis_id,
            match_result_id=req.match_result_id,
            source_resume_version=resume.version,
            suggestion_type=req.suggestion_type,
            target_section=req.target_section,
            target_entry_id=req.target_entry_id,
            target_field=req.target_field,
            target_index=req.target_index,
            original_text=original_text,
            suggested_text=output.suggested_text,
            rationale=output.rationale,
            risk_level=output.risk_level,
            claim_validation=[c.model_dump() for c in output.claims],
            expected_score_gain=output.expected_score_gain,
            provider_name=provider.provider_name,
            model_name=provider.model_name,
            status="pending"
        )
        db.add(suggestion)
        await db.flush()

        # 7. Create EvidenceSource records for each claim
        for claim in output.claims:
            if claim.support_status in ["supported", "partially_supported"]:
                for src in claim.supporting_sources[:3]:
                    evidence = EvidenceSource(
                        ai_suggestion_id=suggestion.id,
                        label=src,
                        source_type="career_profile" if "Profile" in src or "Entry" in src else "resume_content",
                        support_kind="factual_support",
                        evidence_strength="direct" if claim.support_status == "supported" else "corborating",
                        verification_status="source_verified"
                    )
                    db.add(evidence)
            elif claim.support_status == "user_confirmation_required":
                # Create unverified evidence placeholder
                evidence = EvidenceSource(
                    ai_suggestion_id=suggestion.id,
                    label="User Confirmation Pending",
                    source_type="career_profile_user_confirmed",
                    support_kind="relevance_context",
                    evidence_strength="insufficient",
                    verification_status="unverified"
                )
                db.add(evidence)

        # If LLM generated achievement questions, insert them as context evidence sources
        for q in output.questions:
            q_evidence = EvidenceSource(
                ai_suggestion_id=suggestion.id,
                label=f"Clarifying Question: {q}",
                source_type="clarifying_question",
                support_kind="relevance_context",
                evidence_strength="insufficient",
                verification_status="unverified",
                excerpt=q
            )
            db.add(q_evidence)

        await db.commit()
        return await cls.get_suggestion(db, suggestion.id, user_id)

    @classmethod
    async def batch_generate_suggestions(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        mode: str,
        user_id: uuid.UUID,
        job_description_id: Optional[uuid.UUID] = None,
        analysis_id: Optional[uuid.UUID] = None,
        match_result_id: Optional[uuid.UUID] = None,
        max_suggestions: int = 5
    ) -> List[AISuggestion]:
        """Batch generate multiple suggestions based on targeted audit modes."""
        # 1. Fetch Resume
        resume = await db.get(Resume, resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        content = resume.content or {}
        suggestions_to_create = []

        if mode == "ats_driven" and (analysis_id or match_result_id):
            # Target missing keywords or missing requirements
            missing_keywords = []
            if match_result_id:
                mr = await db.get(JobMatchResult, match_result_id)
                if mr and mr.missing_requirements:
                    # Missing requirements is a list of dicts/strings
                    missing_keywords = [
                        req.get("name") if isinstance(req, dict) else str(req)
                        for req in mr.missing_requirements
                    ]
            
            # If missing requirements found, create JD-targeted rephrase requests for summary or experience bullets
            # We construct requests to inject these keywords/skills
            keywords_chunk = ", ".join(missing_keywords[:5])
            if keywords_chunk:
                # Add suggestion request targeting the professional summary
                req = SuggestionGenerateRequest(
                    suggestion_type="ats_fix",
                    target_section="professional_summary",
                    target_field="professional_summary",
                    job_description_id=job_description_id,
                    analysis_id=analysis_id,
                    match_result_id=match_result_id,
                    instruction=f"Incorporate missing ATS keywords and skills: {keywords_chunk}."
                )
                suggestions_to_create.append(req)

        elif mode == "jd_targeted" and job_description_id:
            # Rephrase experience bullets to align with the job description title and requirements
            jd = await db.get(JobDescription, job_description_id)
            if jd:
                experiences = content.get("experience", [])
                for i, exp in enumerate(experiences[:2]):
                    entry_id = exp.get("id")
                    bullets = exp.get("bullets", [])
                    if bullets:
                        req = SuggestionGenerateRequest(
                            suggestion_type="jd_targeted_rewrite",
                            target_section="experience",
                            target_entry_id=entry_id,
                            target_field="bullets",
                            target_index=0,
                            job_description_id=job_description_id,
                            instruction=f"Rephrase this bullet to target the {jd.title} position requirements."
                        )
                        suggestions_to_create.append(req)

        else:  # full_audit or default
            # Grammar, action verbs, conciseness audit on experience bullets
            experiences = content.get("experience", [])
            for i, exp in enumerate(experiences[:3]):
                entry_id = exp.get("id")
                bullets = exp.get("bullets", [])
                if bullets:
                    req = SuggestionGenerateRequest(
                        suggestion_type="bullet_enhancement",
                        target_section="experience",
                        target_entry_id=entry_id,
                        target_field="bullets",
                        target_index=0,
                        instruction="Enhance this experience bullet using active verbs and metrics."
                    )
                    suggestions_to_create.append(req)
                    if len(suggestions_to_create) >= max_suggestions:
                        break

        # Limit to max_suggestions
        suggestions_to_create = suggestions_to_create[:max_suggestions]

        # Generate sequentially to prevent API rate limits
        results = []
        for req in suggestions_to_create:
            try:
                sugg = await cls.generate_suggestion(db, resume_id, req, user_id)
                results.append(sugg)
            except Exception:
                # Log error and continue to not break the batch process
                pass
        return results

    @classmethod
    async def get_suggestions(
        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        status: Optional[str] = None
    ) -> List[AISuggestion]:
        """Retrieve suggestions for a resume."""
        # Check ownership
        resume = await db.get(Resume, resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        query = (
            select(AISuggestion)
            .options(selectinload(AISuggestion.evidence_sources))
            .execution_options(populate_existing=True)
            .where(AISuggestion.resume_id == resume_id)
        )
        if status:
            query = query.where(AISuggestion.status == status)
        query = query.order_by(AISuggestion.created_at.desc())
        
        res = await db.scalars(query)
        return list(res)

    @classmethod
    async def get_suggestion(
        cls,
        db: AsyncSession,
        suggestion_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> AISuggestion:
        """Retrieve a single suggestion, verifying resume ownership."""
        stmt = (
            select(AISuggestion)
            .options(selectinload(AISuggestion.evidence_sources))
            .execution_options(populate_existing=True)
            .join(Resume)
            .where(
                AISuggestion.id == suggestion_id,
                Resume.user_id == user_id
            )
        )
        sugg = await db.scalar(stmt)
        if not sugg:
            raise ResourceNotFoundError("AI suggestion not found")
        return sugg

    @classmethod
    async def accept_suggestion(cls, db: AsyncSession, suggestion_id: uuid.UUID, user_id: uuid.UUID) -> AISuggestion:
        """Mark a suggestion as accepted."""
        sugg = await cls.get_suggestion(db, suggestion_id, user_id)
        sugg.status = "accepted"
        await db.commit()
        await db.refresh(sugg)
        return sugg

    @classmethod
    async def reject_suggestion(cls, db: AsyncSession, suggestion_id: uuid.UUID, user_id: uuid.UUID) -> AISuggestion:
        """Mark a suggestion as rejected."""
        sugg = await cls.get_suggestion(db, suggestion_id, user_id)
        sugg.status = "rejected"
        await db.commit()
        await db.refresh(sugg)
        return sugg

    @classmethod
    async def edit_suggestion(
        cls,
        db: AsyncSession,
        suggestion_id: uuid.UUID,
        edited_text: str,
        user_id: uuid.UUID
    ) -> AISuggestion:
        """Edit the suggested text and re-validate claims using LLM."""
        sugg = await cls.get_suggestion(db, suggestion_id, user_id)
        sugg.edited_text = edited_text
        sugg.status = "edited"

        # Re-validate edited text claims using LLM
        profile_stmt = select(CareerProfile).where(CareerProfile.user_id == user_id)
        profile = await db.scalar(profile_stmt)
        
        facts = []
        if profile:
            for exp in profile.experience:
                facts.append(f"Experience: {', '.join(exp.get('bullets', []))}")
            for proj in profile.projects:
                facts.append(f"Project: {', '.join(proj.get('bullets', []))}")
        facts_text = "\n".join([f"- {f}" for f in facts]) or "No facts."

        provider = GeminiProvider()
        system_prompt = (
            "You are a strict claim verification assistant. Your job is to extract all factual claims from the edited text "
            "and check them against the provided Ground Truth Facts. Determine if they are supported, unsupported, partially supported, or contradictory."
        )
        user_prompt = (
            f"Edited Text:\n\"{edited_text}\"\n\n"
            f"Ground Truth Facts:\n{facts_text}\n\n"
            "Extract the claims and output the risk level and validation list."
        )

        output: LLMClaimValidationOnly = await provider.complete(
            prompt=user_prompt,
            system_prompt=system_prompt,
            response_schema=LLMClaimValidationOnly,
            temperature=0.1
        )

        sugg.risk_level = output.risk_level
        sugg.claim_validation = [c.model_dump() for c in output.claims]

        await db.commit()
        return await cls.get_suggestion(db, suggestion_id, user_id)

    @classmethod
    async def answer_clarifying_question(
        cls,
        db: AsyncSession,
        suggestion_id: uuid.UUID,
        answer: str,
        user_id: uuid.UUID
    ) -> AISuggestion:
        """Provide an answer to an achievement clarifying question and regenerate the suggestion."""
        sugg = await cls.get_suggestion(db, suggestion_id, user_id)
        
        # 1. Save the answer as a user_confirmed EvidenceSource
        question_text = ""
        clarifying_ev = None
        for ev in sugg.evidence_sources:
            if ev.source_type == "clarifying_question":
                question_text = ev.excerpt or ev.label
                clarifying_ev = ev
                break
        
        if not question_text:
            question_text = "Missing metric clarification"

        # Create confirmed answer evidence
        answer_ev = EvidenceSource(
            ai_suggestion_id=sugg.id,
            label=f"User answer to: {question_text}",
            source_type="career_profile_user_confirmed",
            support_kind="factual_support",
            evidence_strength="direct",
            verification_status="user_confirmed",
            excerpt=answer
        )
        db.add(answer_ev)
        
        # Remove or resolve the clarifying question evidence
        if clarifying_ev:
            await db.delete(clarifying_ev)

        await db.flush()

        # 2. Retrieve Career Profile and Career Entries as Ground Truth Facts
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
            facts.append(f"Career Entry ({ent.entry_type}): {ent.content.get('company') or ent.content.get('name')} - {ent.content.get('position') or ''}: {ent.content.get('description') or ''}")

        # Add the confirmed answer fact
        facts.append(f"User Confirmed Achievement Fact: Question: '{question_text}' Answer: '{answer}'")
        facts_text = "\n".join([f"- {f}" for f in facts]) or "No career facts documented yet."

        # Fetch Job Description details if provided
        jd_text = ""
        if sugg.job_description_id:
            jd = await db.get(JobDescription, sugg.job_description_id)
            if jd:
                jd_text = f"Job Title: {jd.title}\nCompany: {jd.company}\nRequirements: {jd.raw_text}"

        # 3. Call LLM for completion
        provider = GeminiProvider()
        system_prompt = (
            "You are an expert AI career coach and resume optimizer. Your task is to suggest a single high-quality resume improvement "
            "based strictly on the user's career facts. You must perform strict claim validation on any suggestions.\n\n"
            "CRITICAL INSTRUCTIONS FOR GROUNDING AND CLAIMS VALIDATION:\n"
            "1. You MUST NOT fabricate any facts, metrics, or achievements. All claims in the suggested text must be strictly grounded "
            "in the provided Career Profile Facts or the Original Resume content.\n"
            "2. Since the user has answered the clarifying question, incorporate their exact answer/metric into the suggested text "
            "and mark that claim as 'supported' and risk_level as 'low'."
        )

        user_prompt = (
            f"Original Text to Improve:\n\"{sugg.original_text}\"\n\n"
            f"Target Section: {sugg.target_section}\n"
            f"Target Field: {sugg.target_field}\n"
            f"Suggestion Type Mode: {sugg.suggestion_type}\n\n"
            f"Grounded Career Profile Facts (Ground Truth):\n{facts_text}\n\n"
            f"Job Description Context (if any):\n{jd_text}\n\n"
            f"User Specific Instructions:\nOptimize the suggestion using the provided answer: '{answer}'.\n\n"
            "Please generate the optimized text, rationale, expected ATS score gain (0-10), list of atomic claims, and any achievement clarifying questions."
        )

        output: LLMSuggestionOutput = await provider.complete(
            prompt=user_prompt,
            system_prompt=system_prompt,
            response_schema=LLMSuggestionOutput,
            temperature=0.2
        )

        # 4. Update the suggestion fields
        sugg.suggested_text = output.suggested_text
        sugg.rationale = output.rationale
        sugg.risk_level = output.risk_level
        sugg.claim_validation = [c.model_dump() for c in output.claims]
        sugg.expected_score_gain = output.expected_score_gain
        sugg.status = "pending"

        # 5. Clear old evidence sources (excluding the newly created answer_ev)
        for ev in list(sugg.evidence_sources):
            if ev.id != answer_ev.id:
                await db.delete(ev)

        # 6. Create new EvidenceSource records for the regenerated suggestion
        for claim in output.claims:
            if claim.support_status in ["supported", "partially_supported"]:
                for src in claim.supporting_sources[:3]:
                    evidence = EvidenceSource(
                        ai_suggestion_id=sugg.id,
                        label=src,
                        source_type="career_profile" if "Profile" in src or "Entry" in src else "resume_content",
                        support_kind="factual_support",
                        evidence_strength="direct" if claim.support_status == "supported" else "corborating",
                        verification_status="source_verified"
                    )
                    db.add(evidence)
            elif claim.support_status == "user_confirmation_required":
                evidence = EvidenceSource(
                    ai_suggestion_id=sugg.id,
                    label="User Confirmation Pending",
                    source_type="career_profile_user_confirmed",
                    support_kind="relevance_context",
                    evidence_strength="insufficient",
                    verification_status="unverified"
                )
                db.add(evidence)

        # If LLM generated new achievement questions, insert them
        for q in output.questions:
            q_evidence = EvidenceSource(
                ai_suggestion_id=sugg.id,
                label=f"Clarifying Question: {q}",
                source_type="clarifying_question",
                support_kind="relevance_context",
                evidence_strength="insufficient",
                verification_status="unverified",
                excerpt=q
            )
            db.add(q_evidence)

        await db.commit()
        return await cls.get_suggestion(db, suggestion_id, user_id)

    @classmethod
    async def apply_suggestion(
        cls,
        db: AsyncSession,
        suggestion_id: uuid.UUID,
        user_id: uuid.UUID
    ) -> Resume:
        """Apply a suggestion to the active resume. Implements version control & OCC checks."""
        sugg = await cls.get_suggestion(db, suggestion_id, user_id)
        
        if sugg.status in ["applied", "invalidated"]:
            raise ConflictError(f"Suggestion has already been {sugg.status}")

        resume = await db.get(Resume, sugg.resume_id)
        if not resume or resume.user_id != user_id:
            raise ResourceNotFoundError("Resume not found")

        # Optimistic Concurrency Control (OCC) check
        if resume.version != sugg.source_resume_version:
            sugg.status = "invalidated"
            await db.commit()
            raise ConflictError(
                f"Version conflict: The resume has been modified (version {resume.version}) since this suggestion was generated (version {sugg.source_resume_version}).",
                details="RESUME_VERSION_CONFLICT"
            )

        # 1. Create a ResumeVersion snapshot of the current resume content
        existing_snapshot = await db.scalar(
            select(ResumeVersion).where(
                ResumeVersion.resume_id == resume.id,
                ResumeVersion.version_number == resume.version
            )
        )
        if not existing_snapshot:
            snapshot = ResumeVersion(
                resume_id=resume.id,
                version_number=resume.version,
                content_snapshot=resume.content,
                change_reason=f"AI Suggestion applied: {sugg.suggestion_type}"
            )
            db.add(snapshot)

        # 2. Apply suggestion text to resume document content
        text_to_apply = sugg.edited_text if sugg.status == "edited" or sugg.edited_text else sugg.suggested_text
        updated_content = cls._apply_text_to_doc(
            resume.content or {},
            sugg.target_section,
            sugg.target_entry_id,
            sugg.target_field,
            sugg.target_index,
            text_to_apply
        )

        # 3. Update resume version and content
        resume.content = updated_content
        resume.version += 1

        # 4. Mark suggestion as applied
        sugg.status = "applied"
        sugg.applied_at = datetime.utcnow()

        await db.commit()
        await db.refresh(resume)
        await db.refresh(sugg)
        return resume

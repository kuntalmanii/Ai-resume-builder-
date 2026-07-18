"""Semantic matching module to compare unmatched requirements with resume facts using Gemini."""

import logging
from typing import Any, cast

from pydantic import BaseModel, Field

from app.ai.factory import get_ai_provider
from app.core.config import get_settings
from app.schemas.job_match_requirements import JobDescriptionRequirement
from app.services.matching.resume_facts import ResumeFact

logger = logging.getLogger(__name__)


class SemanticMatchItem(BaseModel):
    requirement_id: str = Field(..., description="ID of the unmatched requirement")
    matched_resume_text: str = Field(..., description="The matching text found in the resume")
    resume_section: str = Field(..., description="The resume section containing the text")
    resume_entry_id: str | None = Field(None, description="The ID or index of the matched entry")
    confidence: float = Field(..., description="Similarity confidence between 0.0 and 1.0")
    explanation: str = Field(
        ..., description="A short, clear explanation of why this matches semantically"
    )


class SemanticMatchReport(BaseModel):
    matches: list[SemanticMatchItem] = Field(default_factory=list)


async def run_semantic_matching(
    requirements: list[JobDescriptionRequirement],
    resume_facts: list[ResumeFact],
    existing_matches: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """
    Run semantic matching on unmatched requirements.
    Uses Gemini structured output to find contextual matches.
    """
    semantic_matches: list[dict[str, Any]] = []
    matched_req_ids = {m["requirement_id"] for m in existing_matches}

    # Filter only unmatched requirements of type skill, tool, responsibility, or domain
    unmatched_reqs = [
        r
        for r in requirements
        if r.id not in matched_req_ids
        and r.requirement_type
        in ["required_skill", "preferred_skill", "responsibility", "tool", "domain_keyword"]
    ]

    if not unmatched_reqs or not resume_facts:
        return []

    settings = get_settings()
    has_ai = (
        settings.AI_PROVIDER
        and settings.AI_API_KEY
        and settings.AI_API_KEY != "your-ai-api-key-here"
    )

    if has_ai:
        try:
            provider = get_ai_provider()

            # Format requirements and facts to keep prompt size optimized
            reqs_data = [
                {"id": r.id, "text": r.text, "type": r.requirement_type} for r in unmatched_reqs
            ]
            facts_data = [
                {"section": f.section, "entry_id": f.entry_id, "text": f.text}
                for f in resume_facts
                if f.section in ["experience", "projects", "professional_summary"]
            ]

            if not facts_data:
                return []

            prompt = (
                "You are an expert ATS semantic matcher. Compare the "
                "list of unmatched job requirements against the list of "
                "resume facts. Identify cases where a requirement is "
                "NOT an exact match but is covered semantically.\n"
                "Example: 'Build and maintain RESTful APIs' "
                "matches 'Developed Node.js backend endpoints'.\n"
                "Rules:\n"
                "1. Only match items with high confidence (>= 0.75). "
                "If related but not equivalent, set confidence low.\n"
                "2. Provide a brief (1-sentence) explanation justifying the match.\n"
                "3. Do not map a missing required hard skill (like Kafka) "
                "to a generic skill (like backend development).\n\n"
                f"Unmatched Job Requirements:\n{reqs_data}\n\n"
                f"Resume Facts:\n{facts_data}"
            )

            result = cast(
                SemanticMatchReport,
                await provider.complete(
                    prompt=prompt,
                    system_prompt="You are a strict, precise semantic matching "
                    "analyzer. Output structured semantic matches.",
                    response_schema=SemanticMatchReport,
                ),
            )

            for item in result.matches:
                if item.confidence >= 0.75:
                    semantic_matches.append(
                        {
                            "requirement_id": item.requirement_id,
                            "requirement_text": next(
                                (r.text for r in unmatched_reqs if r.id == item.requirement_id), ""
                            ),
                            "matched_resume_text": item.matched_resume_text,
                            "resume_section": item.resume_section,
                            "resume_entry_id": item.resume_entry_id,
                            "confidence": item.confidence,
                            "explanation": item.explanation,
                            "match_type": "semantic_match",
                        }
                    )

        except Exception:
            logger.exception("AI semantic matching failed. Continuing with empty semantic matches.")

    return semantic_matches

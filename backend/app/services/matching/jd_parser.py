"""Job Description parser and requirement extraction service."""

import logging
import re

from app.ai.factory import get_ai_provider
from app.core.config import get_settings
from app.schemas.job_match_requirements import JobDescriptionRequirement, JobDescriptionRequirements
from app.services.matching.skill_taxonomy import TAXONOMY, match_skill_in_text

logger = logging.getLogger(__name__)

# Experience and Education Regexes
EXP_REGEX = re.compile(
    r"\b(\d{1,2})\+?\s*(?:to\s*\d{1,2}\s*)?(?:year|yr)s?\s*(?:of\s*)?(?:experience|exp)\b",
    re.IGNORECASE,
)
DEGREE_KEYWORDS = [
    "bachelor",
    "master",
    "phd",
    "degree",
    "bs",
    "ms",
    "b.tech",
    "m.tech",
    "diploma",
    "associate",
]
CERT_KEYWORDS = ["certified", "certification", "pmp", "scrum", "aws", "gcp", "cissp", "ccna"]

# Preferred indicator terms
PREFERRED_INDICATORS = [
    "preferred",
    "nice to have",
    "plus",
    "bonus",
    "desired",
    "option",
    "advantage",
    "ideal",
]


def split_sentences(text: str) -> list[str]:
    """Split text into raw sentences for context analysis."""
    # Split by common sentence endings
    raw_sentences = re.split(r"[.\n;!?]", text)
    return [s.strip() for s in raw_sentences if s.strip()]


def parse_jd_deterministic(text: str) -> JobDescriptionRequirements:
    """
    Layer 1: Deterministic requirement extraction using regex and taxonomy.
    Guarantees a valid result even if Gemini is completely unavailable.
    """
    sentences = split_sentences(text)
    fragments: list[JobDescriptionRequirement] = []

    req_skills: list[str] = []
    pref_skills: list[str] = []
    responsibilities: list[str] = []
    req_exp: str | None = None
    pref_exp: str | None = None
    edu_reqs: list[str] = []
    cert_reqs: list[str] = []
    tools_techs: list[str] = []
    soft_skills: list[str] = []

    # 1. Skill taxonomy matching
    for canonical in TAXONOMY.keys():
        # Scan sentences to find occurrence and context
        matched_sentences = []
        for s in sentences:
            if match_skill_in_text(canonical, s):
                matched_sentences.append(s)

        if matched_sentences:
            excerpt = matched_sentences[0]
            # Heuristic: is it preferred or required?
            is_pref = any(ind in excerpt.lower() for ind in PREFERRED_INDICATORS)
            importance = "preferred" if is_pref else "required"
            req_type = "preferred_skill" if is_pref else "required_skill"

            if is_pref:
                if canonical not in pref_skills:
                    pref_skills.append(canonical)
            else:
                if canonical not in req_skills:
                    req_skills.append(canonical)

            fragments.append(
                JobDescriptionRequirement(
                    id=f"det-skill-{len(fragments) + 1}",
                    text=canonical,
                    normalized_value=canonical,
                    requirement_type=req_type,
                    importance=importance,
                    source_excerpt=excerpt[:255],
                    confidence=0.85,
                    extraction_method="deterministic",
                )
            )

            # Add to tools_and_technologies if it represents technology
            if canonical not in tools_techs:
                tools_techs.append(canonical)

    # 2. Experience Extraction
    for s in sentences:
        match = EXP_REGEX.search(s)
        if match:
            years = match.group(1)
            is_pref = any(ind in s.lower() for ind in PREFERRED_INDICATORS)
            importance = "preferred" if is_pref else "required"
            req_type = "preferred_experience" if is_pref else "required_experience"

            desc = f"{years}+ years of experience required"
            if is_pref:
                pref_exp = desc
            else:
                req_exp = desc

            fragments.append(
                JobDescriptionRequirement(
                    id=f"det-exp-{len(fragments) + 1}",
                    text=desc,
                    normalized_value=f"{years}_years",
                    requirement_type=req_type,
                    importance=importance,
                    source_excerpt=s[:255],
                    confidence=0.90,
                    extraction_method="deterministic",
                )
            )
            break  # limit to first matching experience sentence

    # 3. Education and Certifications Heuristic
    for s in sentences:
        # Check degree
        if any(kw in s.lower() for kw in DEGREE_KEYWORDS):
            edu_reqs.append(s)
            fragments.append(
                JobDescriptionRequirement(
                    id=f"det-edu-{len(fragments) + 1}",
                    text=s[:100],
                    normalized_value=None,
                    requirement_type="education",
                    importance="required",
                    source_excerpt=s[:255],
                    confidence=0.75,
                    extraction_method="deterministic",
                )
            )
        # Check certifications
        if any(kw in s.lower() for kw in CERT_KEYWORDS):
            cert_reqs.append(s)
            fragments.append(
                JobDescriptionRequirement(
                    id=f"det-cert-{len(fragments) + 1}",
                    text=s[:100],
                    normalized_value=None,
                    requirement_type="certification",
                    importance="preferred",
                    source_excerpt=s[:255],
                    confidence=0.75,
                    extraction_method="deterministic",
                )
            )

    return JobDescriptionRequirements(
        required_skills=req_skills,
        preferred_skills=pref_skills,
        responsibilities=responsibilities,
        required_experience=req_exp,
        preferred_experience=pref_exp,
        education_requirements=edu_reqs,
        certification_requirements=cert_reqs,
        tools_and_technologies=tools_techs,
        soft_skills=soft_skills,
        raw_requirement_fragments=fragments,
    )


async def parse_jd_text(text: str) -> JobDescriptionRequirements:
    """
    Parse JD text using two layers (Gemini Structured first, fallback to
    deterministic regex/taxonomy).
    """
    settings = get_settings()
    has_ai = (
        settings.AI_PROVIDER
        and settings.AI_API_KEY
        and settings.AI_API_KEY != "your-ai-api-key-here"
    )

    if has_ai:
        try:
            provider = get_ai_provider()
            prompt = (
                "You are a professional Job Description Requirement " \
                    "Extractor. Analyze the provided job description "
                "text and map all extracted details into the " \
                    "JobDescriptionRequirements JSON schema.\n"
                "Strict Guidelines:\n"
                "1. NEVER fabricate or hallucinate any requirements. " \
                    "Extract only what is present in the text.\n"
                "2. Classify each requirement fragment under " \
                    "raw_requirement_fragments. Each fragment must match one of "
                "the requirement_type values (required_skill, " \
                    "preferred_skill, responsibility, required_experience, "
                "preferred_experience, education, certification, " \
                    "domain_keyword, tool, soft_skill).\n"
                "3. Preserve the exact source_excerpt from the text to verify where it came from.\n"
                "4. Assign importance (required, preferred, " \
                    "optional) based on explicit wording.\n\n"
                f"Job Description text to analyze:\n{text}"
            )

            result: JobDescriptionRequirements = await provider.complete(
                prompt=prompt,
                system_prompt=(
                    "You are a precise, logical requirement parser. " \
                        "Map natural language requirements into structured "
                    "entities. Maintain absolute fidelity to the source " \
                        "text without exaggerating or inferring missing skills."
                ),
                response_schema=JobDescriptionRequirements,
            )

            # Post-process: set extraction method to hybrid/llm
            for frag in result.raw_requirement_fragments:
                frag.extraction_method = "llm_structured"

            return result
        except Exception:
            logger.exception(
                "AI Job Description parsing failed. Falling back to deterministic rules."
            )

    # Fallback to local rule-based extractor
    return parse_jd_deterministic(text)

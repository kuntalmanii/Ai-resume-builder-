"""Exact matching module for comparing JD requirements to resume facts."""
from typing import List, Dict, Any
from app.schemas.job_match_requirements import JobDescriptionRequirement
from app.services.matching.resume_facts import ResumeFact
from app.services.matching.skill_taxonomy import match_skill_in_text, get_canonical_skill

def run_exact_matching(
    requirements: List[JobDescriptionRequirement],
    resume_facts: List[ResumeFact]
) -> List[Dict[str, Any]]:
    """
    Find exact matches where a requirement's canonical skill matches a resume fact.
    Returns list of match details with full resume provenance.
    """
    matches: List[Dict[str, Any]] = []
    
    for req in requirements:
        # We only match skill/tool/domain/technology requirements
        if req.requirement_type not in ["required_skill", "preferred_skill", "tool", "domain_keyword"]:
            continue
            
        canonical = req.normalized_value or get_canonical_skill(req.text)
        if not canonical:
            # Fallback: use raw text normalized
            canonical = req.text
            
        for fact in resume_facts:
            # Enforce strict boundary rules for match check
            if match_skill_in_text(canonical, fact.text):
                matches.append({
                    "requirement_id": req.id,
                    "requirement_text": req.text,
                    "matched_canonical_skill": canonical,
                    "resume_section": fact.section,
                    "resume_entry_id": fact.entry_id,
                    "source_text": fact.text,
                    "match_type": "exact_match"
                })
                # Break to avoid duplicate exact match entries for the same requirement
                break
                
    return matches

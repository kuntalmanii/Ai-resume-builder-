"""Alias matching module for detecting synonyms of skills."""
from typing import List, Dict, Any
from app.schemas.job_match_requirements import JobDescriptionRequirement
from app.services.matching.resume_facts import ResumeFact
from app.services.matching.skill_taxonomy import match_skill_in_text, get_canonical_skill, TAXONOMY

def run_alias_matching(
    requirements: List[JobDescriptionRequirement],
    resume_facts: List[ResumeFact],
    existing_matches: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Find alias matches where the requirement and resume use different terms for the same canonical skill.
    Skips requirements that are already matched.
    """
    alias_matches: List[Dict[str, Any]] = []
    matched_req_ids = {m["requirement_id"] for m in existing_matches}
    
    for req in requirements:
        if req.id in matched_req_ids:
            continue
            
        if req.requirement_type not in ["required_skill", "preferred_skill", "tool", "domain_keyword"]:
            continue
            
        canonical = req.normalized_value or get_canonical_skill(req.text)
        if not canonical:
            continue
            
        for fact in resume_facts:
            # Check if canonical skill matches the fact
            if match_skill_in_text(canonical, fact.text):
                # Differentiate from exact match: does the fact contain the exact term in the JD?
                # If not, it's an alias match!
                jd_term = req.text.lower()
                fact_text_lower = fact.text.lower()
                
                # If it's an alias match, find which alias was matched
                matched_alias = None
                aliases = TAXONOMY.get(canonical, [])
                for a in aliases:
                    if a.lower() in fact_text_lower:
                        matched_alias = a
                        break
                        
                alias_matches.append({
                    "requirement_id": req.id,
                    "requirement_text": req.text,
                    "matched_canonical_skill": canonical,
                    "jd_phrase": req.text,
                    "resume_phrase": matched_alias or canonical,
                    "resume_section": fact.section,
                    "resume_entry_id": fact.entry_id,
                    "source_text": fact.text,
                    "match_type": "alias_match"
                })
                break
                
    return alias_matches

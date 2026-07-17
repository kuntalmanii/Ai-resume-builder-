"""Gap analysis module to classify missing skills, keywords, and experience alignments."""
from typing import Any

from app.schemas.job_match_requirements import JobDescriptionRequirement


def analyze_gaps(
    requirements: list[JobDescriptionRequirement],
    matches: list[dict[str, Any]],
    profile_opportunities: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Classify gaps (missing requirements) and generate recommendations.
    Enforces the GENUINE GAP RULE.
    """
    gaps: list[dict[str, Any]] = []
    recommendations: list[str] = []

    matched_req_ids = {m["requirement_id"] for m in matches}
    profile_req_ids = {o["requirement_id"] for o in profile_opportunities}

    # Map opportunities by req_id for lookup
    opportunity_map = {o["requirement_id"]: o for o in profile_opportunities}
    # Map matches by req_id for lookup
    matches_map = {m["requirement_id"]: m for m in matches}

    for req in requirements:
        req_id = req.id

        # Scenario 1: Requirement is matched in the resume
        if req_id in matched_req_ids:
            match = matches_map[req_id]
            if match["match_type"] == "semantic_match":
                # Keyword phrasing opportunity
                gaps.append({
                    "requirement_id": req_id,
                    "requirement_text": req.text,
                    "gap_type": "keyword_gap_semantically_covered",
                    "details": f"Covered semantically by: '{match['matched_resume_text']}' in {match['resume_section']}.",
                    "recommendation": f"Your resume demonstrates '{req.text}' semantically but doesn't use the exact phrase. Consider adding '{req.text}' directly."
                })
                recommendations.append(f"Your resume demonstrates {req.requirement_type.replace('_', ' ')} semantically but doesn't use the phrase '{req.text}'.")
            continue

        # Scenario 2: Requirement is missing from resume but found in Career Profile
        if req_id in profile_req_ids:
            opp = opportunity_map[req_id]
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "hidden_profile_opportunity",
                "details": f"Found in Career Profile: '{opp['title']}' at '{opp['organization']}'.",
                "recommendation": f"Add your '{opp['title']}' experience to this resume since it matches the target JD requirement."
            })
            recommendations.append(f"Highlight your {opp['title']} project/role because this JD explicitly requires '{req.text}'.")
            continue

        # Scenario 3: Genuine Gap (not in resume, not in career profile)
        if req.requirement_type == "required_skill":
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "missing_required_skill",
                "details": f"'{req.text}' was not found in your resume or Career Profile.",
                "recommendation": f"'{req.text}' is a required skill. Do not add this skill unless you genuinely have experience with it."
            })
            recommendations.append(f"'{req.text}' is a genuine gap based on your current resume and Career Profile. Do not add it unless you have real experience.")

        elif req.requirement_type == "preferred_skill":
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "missing_preferred_skill",
                "details": f"'{req.text}' (preferred) was not found in your resume or Career Profile.",
                "recommendation": f"Consider learning '{req.text}' or listing it if you have passive/project experience."
            })
            recommendations.append(f"Consider highlighting '{req.text}' if you have passive exposure to this preferred skill.")

        elif req.requirement_type == "education":
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "education_gap",
                "details": f"Education requirement '{req.text}' is missing.",
                "recommendation": f"This job description requests: '{req.text}'."
            })

        elif req.requirement_type == "certification":
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "certification_gap",
                "details": f"Certification requirement '{req.text}' is missing.",
                "recommendation": f"Consider listing '{req.text}' if you are certified."
            })

        else:
            # Other general gaps
            gaps.append({
                "requirement_id": req_id,
                "requirement_text": req.text,
                "gap_type": "general_gap",
                "details": f"Requirement '{req.text}' not found.",
                "recommendation": f"Review requirement details: '{req.text}'."
            })

    return gaps, recommendations

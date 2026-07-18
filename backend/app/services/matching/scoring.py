"""Deterministic scoring engine for Job Description Matching."""

from typing import Any

from app.schemas.job_match_requirements import JobDescriptionRequirement
from app.services.matching.config import CATEGORY_WEIGHTS


def calculate_match_scores(
    requirements: list[JobDescriptionRequirement],
    matches: list[dict[str, Any]],
    profile_opportunities: list[dict[str, Any]],
    current_experience_score: int,
    jd_has_experience: bool,
) -> tuple[int, int, dict[str, Any]]:
    """
    Calculate current and potential match scores deterministically with dynamic normalization.
    Returns:
        (current_match_score, potential_match_score, scores_breakdown)
    """
    # Group requirements by category
    cat_reqs: dict[str, list[JobDescriptionRequirement]] = {
        "required_skills": [],
        "preferred_skills": [],
        "responsibilities": [],
        "keywords": [],
        "education_certification": [],
    }

    for req in requirements:
        if req.requirement_type == "required_skill":
            cat_reqs["required_skills"].append(req)
        elif req.requirement_type == "preferred_skill":
            cat_reqs["preferred_skills"].append(req)
        elif req.requirement_type == "responsibility":
            cat_reqs["responsibilities"].append(req)
        elif req.requirement_type in ["tool", "domain_keyword", "soft_skill"]:
            cat_reqs["keywords"].append(req)
        elif req.requirement_type in ["education", "certification"]:
            cat_reqs["education_certification"].append(req)

    # Build match lookups
    match_map = {m["requirement_id"]: m for m in matches}
    opportunity_map = {o["requirement_id"]: o for o in profile_opportunities}

    # Track earned and max points
    earned_current = 0.0
    earned_potential = 0.0
    total_applicable_max = 0.0

    breakdown: dict[str, Any] = {}

    # 1. Evaluate standard categories
    for cat_name, req_list in cat_reqs.items():
        max_weight = CATEGORY_WEIGHTS[cat_name]

        if not req_list:
            # Category has no requirements, it is inactive (not counted towards max)
            breakdown[cat_name] = {
                "earned_current": 0,
                "earned_potential": 0,
                "max_possible": 0,
                "active": False,
            }
            continue

        total_applicable_max += max_weight
        cat_earned_current = 0.0
        cat_earned_potential = 0.0

        req_weight = 1.0 / len(req_list)

        for req in req_list:
            req_id = req.id

            # Evaluate current score
            if req_id in match_map:
                m = match_map[req_id]
                val = 1.0 if m["match_type"] in ["exact_match", "alias_match"] else 0.5
                cat_earned_current += val
                cat_earned_potential += val
            else:
                # Evaluate potential score from career profile if confirmed/verified
                if req_id in opportunity_map:
                    opp = opportunity_map[req_id]
                    if opp["verification_status"] in ["user_confirmed", "source_verified"]:
                        cat_earned_potential += 1.0  # counts fully for potential

        cat_score_curr = cat_earned_current * req_weight * max_weight
        cat_score_pot = cat_earned_potential * req_weight * max_weight

        earned_current += cat_score_curr
        earned_potential += cat_score_pot

        breakdown[cat_name] = {
            "earned_current": round(cat_score_curr, 1),
            "earned_potential": round(cat_score_pot, 1),
            "max_possible": max_weight,
            "active": True,
        }

    # 2. Evaluate Experience Category
    exp_max = CATEGORY_WEIGHTS["experience"]
    if jd_has_experience:
        total_applicable_max += exp_max
        # Potential experience score matches current unless Career Profile has confirmed
        # experience to cover gaps
        pot_exp_score = current_experience_score

        # Check if there are confirmed career profile opportunities matching experience requirements
        has_confirmed_exp_opp = False
        for opp in profile_opportunities:
            req = next((r for r in requirements if r.id == opp["requirement_id"]), None)
            if req and req.requirement_type in ["required_experience", "preferred_experience"]:
                if opp["verification_status"] in ["user_confirmed", "source_verified"]:
                    has_confirmed_exp_opp = True
                    break

        if has_confirmed_exp_opp:
            pot_exp_score = exp_max  # fills the experience gap!

        earned_current += current_experience_score
        earned_potential += pot_exp_score

        breakdown["experience"] = {
            "earned_current": current_experience_score,
            "earned_potential": pot_exp_score,
            "max_possible": exp_max,
            "active": True,
        }
    else:
        breakdown["experience"] = {
            "earned_current": 0,
            "earned_potential": 0,
            "max_possible": 0,
            "active": False,
        }

    # 3. Dynamic Normalization
    if total_applicable_max <= 0:
        current_pct = 0
        potential_pct = 0
    else:
        current_pct = round((earned_current / total_applicable_max) * 100)
        potential_pct = round((earned_potential / total_applicable_max) * 100)

    # Enforce potential score is never below current score
    potential_pct = max(current_pct, potential_pct)

    breakdown["overall"] = {
        "raw_earned_current": round(earned_current, 1),
        "raw_earned_potential": round(earned_potential, 1),
        "raw_max_possible": round(total_applicable_max, 1),
        "current_match_percentage": current_pct,
        "potential_match_percentage": potential_pct,
    }

    return current_pct, potential_pct, breakdown

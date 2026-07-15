"""Main orchestrator engine for running the Job Description Matching pipeline."""
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Any, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.db.models.resume import Resume
from app.db.models.job_description import JobDescription
from app.db.models.job_match_result import JobMatchResult
from app.services.matching.config import MATCHING_VERSION
from app.services.matching.jd_parser import parse_jd_text
from app.services.matching.resume_facts import extract_resume_facts
from app.services.matching.exact_matcher import run_exact_matching
from app.services.matching.alias_matcher import run_alias_matching
from app.services.matching.semantic_matcher import run_semantic_matching
from app.services.matching.experience_matcher import run_experience_matching
from app.services.matching.profile_retriever import retrieve_profile_opportunities
from app.services.matching.gap_analyzer import analyze_gaps
from app.services.matching.scoring import calculate_match_scores
from app.core.exceptions import ResourceNotFoundError, ForbiddenError

logger = logging.getLogger(__name__)

async def run_job_match(
    db: AsyncSession,
    resume_id: uuid.UUID,
    job_description_id: uuid.UUID,
    user_id: uuid.UUID,
    force: bool = False
) -> JobMatchResult:
    """
    Run the complete Job Description Matching pipeline.
    Check cache first, verify ownership, run parsing and matching, and save result.
    """
    # 1. Fetch Resume and JobDescription
    resume_res = await db.execute(select(Resume).where(Resume.id == resume_id))
    resume = resume_res.scalar_one_or_none()
    if not resume:
        raise ResourceNotFoundError(f"Resume with id {resume_id} not found")
    if resume.user_id != user_id:
        raise ForbiddenError("You do not own this resume")
        
    jd_res = await db.execute(select(JobDescription).where(JobDescription.id == job_description_id))
    jd = jd_res.scalar_one_or_none()
    if not jd:
        raise ResourceNotFoundError(f"Job Description with id {job_description_id} not found")
    if jd.user_id != user_id:
        raise ForbiddenError("You do not own this job description")

    # 2. Check Cache
    if not force:
        cache_res = await db.execute(
            select(JobMatchResult).where(
                JobMatchResult.resume_id == resume_id,
                JobMatchResult.job_description_id == job_description_id,
                JobMatchResult.resume_version == resume.version,
                JobMatchResult.matching_version == MATCHING_VERSION
            )
        )
        cached = cache_res.scalar_one_or_none()
        if cached:
            logger.info("Returning cached job match result.")
            return cached

    # 3. Ensure Job Description is parsed and cached on JD model
    if not jd.parsed_requirements:
        logger.info("Job Description not parsed yet. Running extraction...")
        requirements_obj = await parse_jd_text(jd.raw_text)
        # Store as serialized dict
        jd.parsed_requirements = requirements_obj.model_dump()
        db.add(jd)
        await db.flush()
    else:
        # Load from cache
        from app.schemas.job_match_requirements import JobDescriptionRequirements
        requirements_obj = JobDescriptionRequirements.model_validate(jd.parsed_requirements)

    # 4. Extract Resume Facts
    resume_facts = extract_resume_facts(resume.content)

    # 5. Execute Matcher Stages
    requirements = requirements_obj.raw_requirement_fragments
    
    # Exact Matcher
    exact_matches = run_exact_matching(requirements, resume_facts)
    
    # Alias Matcher
    alias_matches = run_alias_matching(requirements, resume_facts, exact_matches)
    all_matches = exact_matches + alias_matches
    
    # Semantic Matcher (async)
    semantic_matches = await run_semantic_matching(requirements, resume_facts, all_matches)
    all_matches = all_matches + semantic_matches

    # 6. Experience Matcher
    exp_reqs = [
        r.model_dump() for r in requirements 
        if r.requirement_type in ["required_experience", "preferred_experience"]
    ]
    resume_exp = resume.content.get("experience") or []
    experience_score, experience_gaps = run_experience_matching(exp_reqs, resume_exp)

    # 7. Identify Missing Requirements
    matched_req_ids = {m["requirement_id"] for m in all_matches}
    missing_requirements = [r for r in requirements if r.id not in matched_req_ids]

    # 8. Retrieve Smart Career Profile Opportunities
    profile_opportunities = await retrieve_profile_opportunities(db, user_id, missing_requirements)

    # 9. Analyze Gaps & Generate Recommendations
    gaps, recommendations = analyze_gaps(requirements, all_matches, profile_opportunities)

    # 10. Scoring Engine
    jd_has_experience = len(exp_reqs) > 0
    overall_match, potential_match, breakdown = calculate_match_scores(
        requirements=requirements,
        matches=all_matches,
        profile_opportunities=profile_opportunities,
        current_experience_score=experience_score,
        jd_has_experience=jd_has_experience
    )

    # Clean prior match results for same version to avoid bloating
    await db.execute(
        delete(JobMatchResult).where(
            JobMatchResult.resume_id == resume_id,
            JobMatchResult.job_description_id == job_description_id,
            JobMatchResult.resume_version == resume.version,
            JobMatchResult.matching_version == MATCHING_VERSION
        )
    )

    # 11. Create & Persist Match Result
    # Map all matches to match formats
    skills_score = breakdown["required_skills"]["earned_current"] + breakdown["preferred_skills"]["earned_current"]
    required_skills_score = breakdown["required_skills"]["earned_current"]
    preferred_skills_score = breakdown["preferred_skills"]["earned_current"]
    keyword_score = breakdown["keywords"]["earned_current"]
    education_certification_score = breakdown["education_certification"]["earned_current"]
    
    # Format matches into lists for json columns
    exact_keyword_matches_list = [m for m in all_matches if m["match_type"] == "exact_match"]
    semantic_matches_list = [m for m in all_matches if m["match_type"] == "semantic_match"]
    missing_keywords_list = [g for g in gaps if g["gap_type"] in ["missing_required_skill", "missing_preferred_skill"]]
    skill_gaps_list = [g for g in gaps if g["gap_type"] in ["missing_required_skill", "missing_preferred_skill"]]
    experience_gaps_list = experience_gaps
    
    # hidden_experiences serves as the raw column for profile matches
    hidden_experiences_list = profile_opportunities

    match_result = JobMatchResult(
        resume_id=resume_id,
        job_description_id=job_description_id,
        resume_version=resume.version,
        matching_version=MATCHING_VERSION,
        overall_match_percentage=overall_match,
        potential_match_percentage=potential_match,
        exact_match_score=breakdown["required_skills"]["earned_current"], # mapping
        semantic_match_score=breakdown["responsibilities"]["earned_current"], # mapping
        skills_score=round(skills_score),
        required_skills_score=round(required_skills_score),
        preferred_skills_score=round(preferred_skills_score),
        experience_score=round(breakdown["experience"]["earned_current"]),
        keyword_score=round(keyword_score),
        education_certification_score=round(education_certification_score),
        exact_keyword_matches=exact_keyword_matches_list,
        semantic_matches=semantic_matches_list,
        missing_keywords=missing_keywords_list,
        skill_gaps=skill_gaps_list,
        experience_gaps=experience_gaps_list,
        hidden_experiences=hidden_experiences_list,
        matched_requirements=[m for m in all_matches],
        missing_requirements=[g for g in gaps],
        hidden_profile_matches=profile_opportunities,
        recommendations=recommendations,
        created_at=datetime.utcnow()
    )

    db.add(match_result)
    await db.commit()
    await db.refresh(match_result)
    
    return match_result

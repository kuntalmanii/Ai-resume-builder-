"""Career profile retriever module for searching user CareerEntries for missing requirements."""
import uuid
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.career_entry import CareerEntry
from app.schemas.job_match_requirements import JobDescriptionRequirement
from app.services.matching.skill_taxonomy import get_canonical_skill, match_skill_in_text


async def retrieve_profile_opportunities(
    db: AsyncSession,
    user_id: uuid.UUID,
    missing_requirements: list[JobDescriptionRequirement]
) -> list[dict[str, Any]]:
    """
    Search the user's Smart Career Profile (CareerEntry records) for missing requirements.
    Returns opportunities that can be added to the resume.
    """
    opportunities: list[dict[str, Any]] = []
    if not missing_requirements:
        return []

    # Query all CareerEntries for this user
    result = await db.execute(
        select(CareerEntry).where(CareerEntry.user_id == user_id)
    )
    career_entries = result.scalars().all()

    for req in missing_requirements:
        # Check skill taxonomy matching
        canonical = req.normalized_value or get_canonical_skill(req.text)
        if not canonical:
            canonical = req.text

        for entry in career_entries:
            # We look in the entry title, organization, and custom data fields (bullets, skills list)
            match_found = False
            matched_fact = ""

            # Check title / org
            if match_skill_in_text(canonical, entry.title):
                match_found = True
                matched_fact = f"Title: {entry.title}"
            elif match_skill_in_text(canonical, entry.organization):
                match_found = True
                matched_fact = f"Organization: {entry.organization}"

            # Check data fields
            if not match_found and entry.data:
                # Check skills list
                skills_list = entry.data.get("skills") or entry.data.get("technical_skills") or []
                if isinstance(skills_list, list):
                    for s in skills_list:
                        if match_skill_in_text(canonical, str(s)):
                            match_found = True
                            matched_fact = f"Skills List: {s}"
                            break

                # Check description/bullets
                desc = entry.data.get("description") or ""
                if not match_found and match_skill_in_text(canonical, desc):
                    match_found = True
                    matched_fact = f"Description: {desc[:60]}..."

                bullets = entry.data.get("bullet_points") or entry.data.get("bullets") or []
                if not match_found and isinstance(bullets, list):
                    for b in bullets:
                        if match_skill_in_text(canonical, str(b)):
                            match_found = True
                            matched_fact = f"Bullet: {b}"
                            break

            if match_found:
                opportunities.append({
                    "requirement_id": req.id,
                    "requirement_text": req.text,
                    "entry_id": str(entry.id),
                    "entry_type": entry.entry_type,
                    "title": entry.title,
                    "organization": entry.organization,
                    "matching_fact": matched_fact,
                    "match_reason": f"Matches required skill '{canonical}' from the job description.",
                    "verification_status": entry.verification_status # user_confirmed, source_verified, unverified
                })
                # Break to avoid multiple matches for the same requirement from the same CareerEntry
                break

    return opportunities

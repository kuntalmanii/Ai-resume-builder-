"""Skill normalization utilities."""
from app.services.matching.skill_taxonomy import get_canonical_skill


def normalize_skill(skill_name: str) -> str:
    """Normalize a raw skill name. Resolves to taxonomy canonical form if available, otherwise cleans raw text."""
    canonical = get_canonical_skill(skill_name)
    if canonical:
        return canonical
    # Fallback to standard cleaning
    return skill_name.strip().title()

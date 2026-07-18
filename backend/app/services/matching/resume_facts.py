"""Service to extract structured facts and text fragments from a ResumeDocument with provenance."""

from typing import Any

from pydantic import BaseModel


# section can be: personal_information, professional_summary, experience,
# projects, skills, education, certifications
class ResumeFact(BaseModel):
    section: str
    entry_id: str | None  # ID or index of the list item (if list section)
    field: str | None  # e.g., 'bullets', 'technologies', 'description', 'degree'
    text: str  # The raw text content of the fact


def _make_fact(section: str, entry_id: str | None, field: str | None, text: str) -> ResumeFact:
    return ResumeFact(section=section, entry_id=entry_id, field=field, text=text)


def extract_resume_facts(content: dict[str, Any] | BaseModel) -> list[ResumeFact]:
    """
    Extract a flat list of ResumeFact objects from a ResumeDocument (dict or Pydantic).
    Each fact maintains section-level provenance for evidence reporting.
    """
    # Convert to dict if Pydantic model
    if hasattr(content, "model_dump"):
        data = content.model_dump()
    elif hasattr(content, "dict"):
        data = content.dict()
    elif isinstance(content, dict):
        data = content
    else:
        data = {}

    facts: list[ResumeFact] = []

    # 1. Personal Information
    pers = data.get("personal_information") or {}
    if pers:
        for field in ["full_name", "professional_title", "location"]:
            val = pers.get(field)
            if val:
                facts.append(_make_fact("personal_information", None, field, str(val)))

    # 2. Professional Summary
    summary = data.get("professional_summary")
    if summary:
        facts.append(_make_fact("professional_summary", None, "professional_summary", str(summary)))

    # 3. Work Experience
    exp_list = data.get("experience") or []
    for idx, exp in enumerate(exp_list):
        entry_id = str(exp.get("id", idx))

        # Metadata facts
        title = exp.get("position") or exp.get("title") or ""
        company = exp.get("company") or ""
        if title:
            facts.append(_make_fact("experience", entry_id, "position", f"{title} at {company}"))

        # Bullets
        bullets = exp.get("bullets") or []
        for b_idx, bullet in enumerate(bullets):
            if bullet:
                facts.append(_make_fact("experience", entry_id, f"bullet_{b_idx}", str(bullet)))

        # Technologies list
        techs = exp.get("technologies") or []
        for tech in techs:
            if tech:
                facts.append(_make_fact("experience", entry_id, "technologies", str(tech)))

        # Description
        desc = exp.get("description")
        if desc:
            facts.append(_make_fact("experience", entry_id, "description", str(desc)))

    # 4. Projects
    proj_list = data.get("projects") or []
    for idx, proj in enumerate(proj_list):
        entry_id = str(proj.get("id", idx))
        name = proj.get("name") or ""
        if name:
            facts.append(_make_fact("projects", entry_id, "name", name))

        bullets = proj.get("bullets") or []
        for b_idx, bullet in enumerate(bullets):
            if bullet:
                facts.append(_make_fact("projects", entry_id, f"bullet_{b_idx}", str(bullet)))

        techs = proj.get("technologies") or []
        for tech in techs:
            if tech:
                facts.append(_make_fact("projects", entry_id, "technologies", str(tech)))

        desc = proj.get("description")
        if desc:
            facts.append(_make_fact("projects", entry_id, "description", str(desc)))

    # 5. Skills
    skills_groups = data.get("skills") or []
    for idx, group in enumerate(skills_groups):
        entry_id = str(group.get("id", idx))
        category = group.get("category", "Skills")
        skills = group.get("skills") or []
        for s_idx, skill in enumerate(skills):
            if skill:
                facts.append(_make_fact("skills", entry_id, category, str(skill)))

    # 6. Education
    edu_list = data.get("education") or []
    for idx, edu in enumerate(edu_list):
        entry_id = str(edu.get("id", idx))
        inst = edu.get("institution") or ""
        deg = edu.get("degree") or ""
        field = edu.get("field_of_study") or ""
        if inst or deg:
            facts.append(
                _make_fact("education", entry_id, "degree", f"{deg} in {field} from {inst}")
            )

        desc = edu.get("description")
        if desc:
            facts.append(_make_fact("education", entry_id, "description", str(desc)))

    # 7. Certifications
    certs = data.get("certifications") or []
    for idx, cert in enumerate(certs):
        entry_id = str(cert.get("id", idx))
        name = cert.get("name") or ""
        issuer = cert.get("issuer") or ""
        if name:
            facts.append(_make_fact("certifications", entry_id, "name", f"{name} by {issuer}"))

    return facts

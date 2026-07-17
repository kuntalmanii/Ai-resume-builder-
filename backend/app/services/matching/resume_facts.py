"""Service to extract structured facts and text fragments from a ResumeDocument with provenance."""
from typing import Any

from pydantic import BaseModel


class ResumeFact(BaseModel):
    section: str            # e.g., 'personal_information', 'professional_summary', 'experience', 'projects', 'skills', 'education', 'certifications'
    entry_id: str | None    # ID or index of the list item (if list section)
    field: str | None       # e.g., 'bullets', 'technologies', 'description', 'degree'
    text: str               # The raw text content of the fact

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
                facts.append(ResumeFact(section="personal_information", entry_id=None, field=field, text=str(val)))

    # 2. Professional Summary
    summary = data.get("professional_summary")
    if summary:
        facts.append(ResumeFact(section="professional_summary", entry_id=None, field="professional_summary", text=str(summary)))

    # 3. Work Experience
    exp_list = data.get("experience") or []
    for idx, exp in enumerate(exp_list):
        entry_id = str(exp.get("id", idx))

        # Metadata facts
        title = exp.get("position") or exp.get("title") or ""
        company = exp.get("company") or ""
        if title:
            facts.append(ResumeFact(section="experience", entry_id=entry_id, field="position", text=f"{title} at {company}"))

        # Bullets
        bullets = exp.get("bullets") or []
        for b_idx, bullet in enumerate(bullets):
            if bullet:
                facts.append(ResumeFact(section="experience", entry_id=entry_id, field=f"bullet_{b_idx}", text=str(bullet)))

        # Technologies list
        techs = exp.get("technologies") or []
        for tech in techs:
            if tech:
                facts.append(ResumeFact(section="experience", entry_id=entry_id, field="technologies", text=str(tech)))

        # Description
        desc = exp.get("description")
        if desc:
            facts.append(ResumeFact(section="experience", entry_id=entry_id, field="description", text=str(desc)))

    # 4. Projects
    proj_list = data.get("projects") or []
    for idx, proj in enumerate(proj_list):
        entry_id = str(proj.get("id", idx))
        name = proj.get("name") or ""
        if name:
            facts.append(ResumeFact(section="projects", entry_id=entry_id, field="name", text=name))

        bullets = proj.get("bullets") or []
        for b_idx, bullet in enumerate(bullets):
            if bullet:
                facts.append(ResumeFact(section="projects", entry_id=entry_id, field=f"bullet_{b_idx}", text=str(bullet)))

        techs = proj.get("technologies") or []
        for tech in techs:
            if tech:
                facts.append(ResumeFact(section="projects", entry_id=entry_id, field="technologies", text=str(tech)))

        desc = proj.get("description")
        if desc:
            facts.append(ResumeFact(section="projects", entry_id=entry_id, field="description", text=str(desc)))

    # 5. Skills
    skills_groups = data.get("skills") or []
    for idx, group in enumerate(skills_groups):
        entry_id = str(group.get("id", idx))
        category = group.get("category", "Skills")
        skills = group.get("skills") or []
        for s_idx, skill in enumerate(skills):
            if skill:
                facts.append(ResumeFact(section="skills", entry_id=entry_id, field=category, text=str(skill)))

    # 6. Education
    edu_list = data.get("education") or []
    for idx, edu in enumerate(edu_list):
        entry_id = str(edu.get("id", idx))
        inst = edu.get("institution") or ""
        deg = edu.get("degree") or ""
        field = edu.get("field_of_study") or ""
        if inst or deg:
            facts.append(ResumeFact(section="education", entry_id=entry_id, field="degree", text=f"{deg} in {field} from {inst}"))

        desc = edu.get("description")
        if desc:
            facts.append(ResumeFact(section="education", entry_id=entry_id, field="description", text=str(desc)))

    # 7. Certifications
    certs = data.get("certifications") or []
    for idx, cert in enumerate(certs):
        entry_id = str(cert.get("id", idx))
        name = cert.get("name") or ""
        issuer = cert.get("issuer") or ""
        if name:
            facts.append(ResumeFact(section="certifications", entry_id=entry_id, field="name", text=f"{name} by {issuer}"))

    return facts

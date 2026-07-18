"""Completeness checks — 6 checks, max 10 points.

Contextually evaluates whether the resume has enough information.
Does not penalize students for lacking work experience if strong
education and projects exist.
"""

from __future__ import annotations

from typing import Any

from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.config import COMPLETENESS_WEIGHTS
from app.services.scoring.text_metrics import _get, _get_list

CATEGORY = "completeness"


def check_personal_info(resume: Any) -> CheckResult:
    """COMPLETE_PERSONAL_INFO — Essential personal information fields."""
    code = "COMPLETE_PERSONAL_INFO"
    possible = COMPLETENESS_WEIGHTS[code]

    pi = _get(resume, "personal_information") or {}
    name = (_get(pi, "full_name") or "").strip()
    email = (_get(pi, "email") or "").strip()
    has_link = bool(
        (_get(pi, "linkedin_url") or "").strip()
        or (_get(pi, "github_url") or "").strip()
        or (_get(pi, "portfolio_url") or "").strip()
    )
    has_location = bool((_get(pi, "location") or "").strip())

    filled = sum([bool(name), bool(email), has_location])
    if filled == 3:
        return CheckResult(
            code,
            CATEGORY,
            "Personal Information Complete",
            "Name, email, and location are all present.",
            "passed",
            possible,
            possible,
            evidence_data={"has_professional_link": has_link},
        )
    elif filled >= 2:
        return CheckResult(
            code,
            CATEGORY,
            "Personal Information Mostly Complete",
            "Most personal information fields are filled in.",
            "warning",
            possible,
            possible - 1,
            recommendation="Add all personal information fields (name, email, location).",
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Personal Information Sparse",
            "Multiple personal information fields are missing.",
            "failed",
            possible,
            0,
            recommendation="Add your name, email address, and location " \
                "to the personal information section.",
        )


def check_foundation(resume: Any) -> CheckResult:
    """COMPLETE_FOUNDATION — Education or experience must be present (contextual for students)."""
    code = "COMPLETE_FOUNDATION"
    possible = COMPLETENESS_WEIGHTS[code]

    experience = _get_list(resume, "experience")
    education = _get_list(resume, "education")

    has_exp = bool(experience)
    has_edu = bool(education)

    if has_exp and has_edu:
        return CheckResult(
            code,
            CATEGORY,
            "Strong Foundation — Experience & Education",
            "Resume includes both work experience and education.",
            "passed",
            possible,
            possible,
        )
    elif has_exp or has_edu:
        foundation_type = "work experience" if has_exp else "education"
        missing_type = "education" if has_exp else "work experience or internships"
        rec_text = f"Consider adding {missing_type} to build a stronger foundation."
        return CheckResult(
            code,
            CATEGORY,
            f"Foundation Present — {foundation_type.title()}",
            f"Resume has {foundation_type}. Adding the other would strengthen the profile.",
            "warning",
            possible,
            possible - 1,
            recommendation=rec_text,
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "No Foundation — Missing Experience and Education",
            "Neither work experience nor education entries are present.",
            "failed",
            possible,
            0,
            recommendation="Add your educational background and/or any " \
                "work experience, internships, or projects.",
        )


def check_skills(resume: Any) -> CheckResult:
    """COMPLETE_SKILLS — Skills section must be present and non-empty."""
    code = "COMPLETE_SKILLS"
    possible = COMPLETENESS_WEIGHTS[code]

    skills = _get_list(resume, "skills")
    total_skills = sum(len(_get(sg, "skills") or []) for sg in skills)

    if total_skills >= 5:
        return CheckResult(
            code,
            CATEGORY,
            "Skills Section Complete",
            f"Skills section contains {total_skills} skills across {len(skills)} group(s).",
            "passed",
            possible,
            possible,
            evidence_data={"skill_count": total_skills, "skill_groups": len(skills)},
        )
    elif total_skills >= 1:
        return CheckResult(
            code,
            CATEGORY,
            "Skills Section Sparse",
            f"Only {total_skills} skill(s) listed. A more " \
                f"complete skills section helps ATS matching.",
            "warning",
            possible,
            possible - 1,
            recommendation="Expand your skills section with " \
                "technical skills, tools, and soft skills.",
            evidence_data={"skill_count": total_skills},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Skills Section Missing",
            "No skills listed. This significantly reduces ATS keyword matching potential.",
            "failed",
            possible,
            0,
            recommendation="Add a Skills section with your technical " \
                "skills, tools, and relevant competencies.",
        )


def check_evidence(resume: Any) -> CheckResult:
    """COMPLETE_EVIDENCE — Projects or experience entries serve as evidence of capability.

    Students can satisfy this with strong projects alone.
    """
    code = "COMPLETE_EVIDENCE"
    possible = COMPLETENESS_WEIGHTS[code]

    experience = _get_list(resume, "experience")
    projects = _get_list(resume, "projects")

    total_evidence = len(experience) + len(projects)

    if total_evidence >= 3:
        return CheckResult(
            code,
            CATEGORY,
            "Strong Evidence of Capability",
            f"Resume demonstrates capability through {len(experience)} " \
                f"experience and {len(projects)} project entries.",
            "passed",
            possible,
            possible,
            evidence_data={"experience_count": len(experience), "project_count": len(projects)},
        )
    elif total_evidence >= 1:
        return CheckResult(
            code,
            CATEGORY,
            "Some Evidence Present",
            f"Resume shows {total_evidence} evidence entries. Adding more strengthens the profile.",
            "warning",
            possible,
            possible - 1,
            recommendation="Add more experience entries, internships, or " \
                "personal projects to demonstrate capability.",
            evidence_data={"experience_count": len(experience), "project_count": len(projects)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "No Evidence of Capability",
            "No experience or project entries found.",
            "failed",
            possible,
            0,
            recommendation="Add work experience, internships, or personal/academic " \
                "projects to showcase your capabilities.",
        )


def check_summary(resume: Any) -> CheckResult:
    """COMPLETE_SUMMARY — Professional summary adds context (encouraged, not required)."""
    code = "COMPLETE_SUMMARY"
    possible = COMPLETENESS_WEIGHTS[code]

    summary = (_get(resume, "professional_summary") or "").strip()

    if len(summary.split()) >= 20:
        return CheckResult(
            code,
            CATEGORY,
            "Professional Summary Present",
            "Resume includes a professional summary to contextualize the application.",
            "passed",
            possible,
            possible,
        )
    elif summary:
        return CheckResult(
            code,
            CATEGORY,
            "Summary Too Brief",
            "Professional summary exists but is very short (under 20 words).",
            "warning",
            possible,
            0,
            recommendation="Expand the summary to 2–4 sentences covering " \
                "your role, skills, and key value proposition.",
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "No Professional Summary",
            "No professional summary provided. A summary helps frame the resume for recruiters.",
            "warning",
            possible,
            0,
            recommendation="Add a 2–4 sentence professional summary " \
                "that highlights your background and value.",
        )


def check_credibility_sections(resume: Any) -> CheckResult:
    """COMPLETE_CREDIBILITY — Optional sections that add credibility (certifications,
    achievements, etc.)."""
    code = "COMPLETE_CREDIBILITY"
    possible = COMPLETENESS_WEIGHTS[code]

    certifications = _get_list(resume, "certifications")
    achievements = _get_list(resume, "achievements")
    languages = _get_list(resume, "languages")
    positions = _get_list(resume, "positions_of_responsibility")

    present_sections: list[str] = []
    if certifications:
        present_sections.append("certifications")
    if achievements:
        present_sections.append("achievements")
    if languages:
        present_sections.append("languages")
    if positions:
        present_sections.append("positions of responsibility")

    if present_sections:
        return CheckResult(
            code,
            CATEGORY,
            "Credibility Sections Present",
            f"Resume includes: {', '.join(present_sections)}.",
            "passed",
            possible,
            possible,
            evidence_data={"sections_present": present_sections},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "No Additional Credibility Sections",
            "No certifications, achievements, languages, or leadership positions listed.",
            "warning",
            possible,
            0,
            recommendation="Consider adding certifications, achievements, or " \
                "language proficiencies to strengthen credibility.",
        )


def run_completeness_checks(resume: Any) -> list[CheckResult]:
    """Run all Completeness checks."""
    return [
        check_personal_info(resume),
        check_foundation(resume),
        check_skills(resume),
        check_evidence(resume),
        check_summary(resume),
        check_credibility_sections(resume),
    ]

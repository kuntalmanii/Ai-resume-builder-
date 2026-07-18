"""ATS Compatibility checks — 8 checks, max 20 points.

Check the resume for structural properties that affect
Applicant Tracking System parseability.

Important: ResumeDocument contains canonical post-parsing data.
We analyze the structured content — we do not claim to detect
original-file formatting issues we cannot actually inspect.
"""

from __future__ import annotations

from typing import Any

from app.services.scoring.config import ATS_WEIGHTS
from app.services.scoring.text_metrics import (
    _get,
    _get_list,
    collect_all_dates,
    collect_all_text,
    detect_date_format_type,
    special_char_ratio,
    word_count,
)

# ─── Check Result ─────────────────────────────────────────────────────────────


class CheckResult:
    """Result for a single scoring check."""

    __slots__ = (
        "check_code",
        "category",
        "title",
        "description",
        "status",
        "points_possible",
        "points_awarded",
        "recommendation",
        "evidence_data",
    )

    def __init__(
        self,
        check_code: str,
        category: str,
        title: str,
        description: str,
        status: str,  # passed | warning | failed
        points_possible: int,
        points_awarded: int,
        recommendation: str | None = None,
        evidence_data: dict | None = None,
    ):
        self.check_code = check_code
        self.category = category
        self.title = title
        self.description = description
        self.status = status
        self.points_possible = points_possible
        self.points_awarded = points_awarded
        self.recommendation = recommendation
        self.evidence_data = evidence_data or {}


# ─── ATS Checks ───────────────────────────────────────────────────────────────

CATEGORY = "ats"


def check_contact_info(resume: Any) -> CheckResult:
    """ATS_CONTACT_INFO — Name, email, and phone present and parseable."""
    code = "ATS_CONTACT_INFO"
    possible = ATS_WEIGHTS[code]
    pi = _get(resume, "personal_information") or {}

    name = _get(pi, "full_name") or ""
    email = _get(pi, "email") or ""
    phone = _get(pi, "phone") or ""

    missing = []
    if not name.strip():
        missing.append("name")
    if not email.strip():
        missing.append("email")
    if not phone.strip():
        missing.append("phone")

    if not missing:
        return CheckResult(
            code,
            CATEGORY,
            "Contact Information Complete",
            "Name, email, and phone number are all present.",
            "passed",
            possible,
            possible,
            evidence_data={"found": ["name", "email", "phone"]},
        )
    elif len(missing) == 1:
        return CheckResult(
            code,
            CATEGORY,
            "Contact Information Incomplete",
            f"The following contact field is missing: {missing[0]}.",
            "warning",
            possible,
            possible - 1,
            recommendation=f"Add your {missing[0]} to the contact information section.",
            evidence_data={"missing": missing},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Contact Information Missing",
            f"Missing essential contact fields: {', '.join(missing)}.",
            "failed",
            possible,
            0,
            recommendation=(
                "Add your name, email, and phone number to ensure recruiters can contact you."
            ),
            evidence_data={"missing": missing},
        )


def check_section_naming(resume: Any) -> CheckResult:
    """ATS_SECTION_NAMING — Canonical section keys used (scratch-created resumes pass)."""
    code = "ATS_SECTION_NAMING"
    possible = ATS_WEIGHTS[code]

    # ResumeDocument always uses canonical keys after parsing/creation.
    # We verify the section_order uses only valid canonical keys.
    canonical = {
        "personal_information",
        "professional_summary",
        "education",
        "experience",
        "projects",
        "skills",
        "certifications",
        "achievements",
        "positions_of_responsibility",
        "languages",
        "interests",
    }
    section_order = _get(resume, "section_order") or []
    non_canonical = [s for s in section_order if s not in canonical] if section_order else []

    if not non_canonical:
        return CheckResult(
            code,
            CATEGORY,
            "Section Naming — Standard",
            "All resume sections use standard, ATS-recognized naming.",
            "passed",
            possible,
            possible,
            evidence_data={"canonical_sections": list(section_order)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Non-Standard Section Names Detected",
            f"Non-canonical section names found: {non_canonical}. "
            f"Some ATS systems may not recognize them.",
            "warning",
            possible,
            possible - 1,
            recommendation="Rename sections to standard headings "
            "(Experience, Education, Skills, etc.).",
            evidence_data={"non_canonical": non_canonical},
        )


def check_section_structure(resume: Any) -> CheckResult:
    """ATS_SECTION_STRUCTURE — Core sections are non-empty."""
    code = "ATS_SECTION_STRUCTURE"
    possible = ATS_WEIGHTS[code]

    experience = _get_list(resume, "experience")
    education = _get_list(resume, "education")
    skills = _get_list(resume, "skills")

    empty_sections = []
    if not experience:
        empty_sections.append("experience")
    if not education:
        empty_sections.append("education")
    if not skills:
        empty_sections.append("skills")

    if not empty_sections:
        return CheckResult(
            code,
            CATEGORY,
            "Core Sections Populated",
            "Experience, Education, and Skills sections all contain content.",
            "passed",
            possible,
            possible,
        )
    elif len(empty_sections) == 1:
        return CheckResult(
            code,
            CATEGORY,
            "Core Section Sparse",
            f"The '{empty_sections[0]}' section is empty or missing.",
            "warning",
            possible,
            possible - 1,
            recommendation=f"Add content to your {empty_sections[0]} section.",
            evidence_data={"empty": empty_sections},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Multiple Core Sections Empty",
            f"Multiple core sections are empty: {', '.join(empty_sections)}.",
            "failed",
            possible,
            max(0, possible - len(empty_sections)),
            recommendation="Add content to Experience, Education, "
            "and Skills sections for ATS recognition.",
            evidence_data={"empty": empty_sections},
        )


def check_date_format(resume: Any) -> CheckResult:
    """ATS_DATE_FORMAT — Consistent date formatting across all entries."""
    code = "ATS_DATE_FORMAT"
    possible = ATS_WEIGHTS[code]

    all_dates = collect_all_dates(resume)
    format_types: set[str] = set()
    for sd, ed in all_dates:
        ft = detect_date_format_type(sd)
        if ft and ft != "present":
            format_types.add(ft)
        ft2 = detect_date_format_type(ed)
        if ft2 and ft2 != "present":
            format_types.add(ft2)

    if len(format_types) <= 1:
        return CheckResult(
            code,
            CATEGORY,
            "Date Format Consistent",
            "All dates use a consistent format.",
            "passed",
            possible,
            possible,
            evidence_data={"formats_found": list(format_types)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Mixed Date Formats",
            f"Multiple date formats detected: {format_types}. This can confuse ATS parsers.",
            "warning",
            possible,
            possible - 1,
            recommendation="Use a single consistent date format "
            "throughout (e.g., 'Jan 2023' or 'MM/YYYY').",
            evidence_data={"formats_found": list(format_types)},
        )


def check_bullet_structure(resume: Any) -> CheckResult:
    """ATS_BULLET_STRUCTURE — Bullet points are used consistently in experience entries."""
    code = "ATS_BULLET_STRUCTURE"
    possible = ATS_WEIGHTS[code]

    experience = _get_list(resume, "experience")
    if not experience:
        return CheckResult(
            code,
            CATEGORY,
            "Bullet Structure — No Experience",
            "No experience entries to evaluate bullet structure.",
            "passed",
            possible,
            possible,
        )

    entries_with_bullets = sum(1 for e in experience if _get(e, "bullets"))
    ratio = entries_with_bullets / len(experience) if experience else 1.0

    if ratio >= 0.8:
        return CheckResult(
            code,
            CATEGORY,
            "Bullet Points Used Consistently",
            f"{entries_with_bullets}/{len(experience)} experience entries use bullet points.",
            "passed",
            possible,
            possible,
        )
    elif ratio >= 0.5:
        return CheckResult(
            code,
            CATEGORY,
            "Inconsistent Bullet Usage",
            f"Only {entries_with_bullets}/{len(experience)} experience entries use bullet points.",
            "warning",
            possible,
            possible - 1,
            recommendation="Add bullet points to all experience "
            "entries for consistent ATS parsing.",
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Bullets Largely Absent",
            "Most experience entries lack bullet points, reducing ATS parseability.",
            "failed",
            possible,
            0,
            recommendation="Use bullet points to describe responsibilities "
            "and achievements in each experience entry.",
        )


def check_special_chars(resume: Any) -> CheckResult:
    """ATS_SPECIAL_CHARS — No excessive decoration characters."""
    code = "ATS_SPECIAL_CHARS"
    possible = ATS_WEIGHTS[code]

    full_text = collect_all_text(resume)
    ratio = special_char_ratio(full_text)

    if ratio < 0.01:
        return CheckResult(
            code,
            CATEGORY,
            "No Problematic Special Characters",
            "Resume text contains no excessive decoration characters.",
            "passed",
            possible,
            possible,
        )
    elif ratio < 0.03:
        return CheckResult(
            code,
            CATEGORY,
            "Minor Special Character Usage",
            f"A small number of decoration characters detected ({ratio:.1%} of content).",
            "warning",
            possible,
            possible - 1,
            recommendation="Remove decorative symbols (arrows, bullets as "
            "Unicode characters) that may break ATS parsing.",
            evidence_data={"special_char_ratio": round(ratio, 4)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Excessive Special Characters",
            f"High density of decoration characters ({ratio:.1%}) may cause ATS parsing failures.",
            "failed",
            possible,
            0,
            recommendation="Replace Unicode decoration characters with plain text punctuation.",
            evidence_data={"special_char_ratio": round(ratio, 4)},
        )


def check_content_density(resume: Any) -> CheckResult:
    """ATS_CONTENT_DENSITY — Resume has reasonable content length."""
    code = "ATS_CONTENT_DENSITY"
    possible = ATS_WEIGHTS[code]

    from app.services.scoring.config import MAX_TOTAL_WORDS, MIN_TOTAL_WORDS

    full_text = collect_all_text(resume)
    total_words = word_count(full_text)

    if MIN_TOTAL_WORDS <= total_words <= MAX_TOTAL_WORDS:
        return CheckResult(
            code,
            CATEGORY,
            "Content Length Appropriate",
            f"Resume contains {total_words} words — within the recommended range.",
            "passed",
            possible,
            possible,
            evidence_data={"word_count": total_words},
        )
    elif total_words < MIN_TOTAL_WORDS:
        return CheckResult(
            code,
            CATEGORY,
            "Resume Is Very Sparse",
            f"Resume contains only {total_words} words. Very "
            f"thin resumes score poorly in ATS systems.",
            "warning",
            possible,
            possible - 1,
            recommendation="Expand descriptions, add bullet points, and fill in missing sections.",
            evidence_data={"word_count": total_words, "min_recommended": MIN_TOTAL_WORDS},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Resume Is Very Dense",
            f"Resume contains {total_words} words — exceeds "
            f"recommended length for a 1–2 page resume.",
            "warning",
            possible,
            possible - 1,
            recommendation="Condense older experiences and remove "
            "irrelevant details to keep the resume focused.",
            evidence_data={"word_count": total_words, "max_recommended": MAX_TOTAL_WORDS},
        )


def check_template_safety(resume: Any, template_id: str | None = None) -> CheckResult:
    """ATS_TEMPLATE_SAFETY — Template is ATS-safe (no multi-column layouts known to
    break parsers)."""
    code = "ATS_TEMPLATE_SAFETY"
    possible = ATS_WEIGHTS[code]

    # ATS-safe templates in our system
    ats_safe_templates = {"modern", "classic", "minimal"}
    # Templates known to have multi-column or graphics (future templates)
    ats_risky_templates = {"infographic", "creative", "sidebar", "two-column"}

    if not template_id:
        return CheckResult(
            code,
            CATEGORY,
            "Template Safety — Unknown",
            "No template metadata available for ATS safety assessment.",
            "warning",
            possible,
            possible - 1,
            recommendation="Select a verified ATS-safe template from the template library.",
        )
    elif template_id.lower() in ats_safe_templates:
        return CheckResult(
            code,
            CATEGORY,
            "ATS-Safe Template",
            f"Template '{template_id}' uses a single-column, "
            f"text-first layout compatible with ATS parsers.",
            "passed",
            possible,
            possible,
            evidence_data={"template_id": template_id},
        )
    elif template_id.lower() in ats_risky_templates:
        return CheckResult(
            code,
            CATEGORY,
            "ATS-Risky Template",
            f"Template '{template_id}' may use multi-column "
            f"or graphic layouts that confuse ATS parsers.",
            "failed",
            possible,
            0,
            recommendation="Switch to a single-column ATS-safe "
            "template (Modern, Classic, or Minimal).",
            evidence_data={"template_id": template_id},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Template Safety — Unverified",
            f"Template '{template_id}' has not been verified for ATS compatibility.",
            "warning",
            possible,
            possible - 1,
            recommendation="Use a verified ATS-safe template.",
            evidence_data={"template_id": template_id},
        )


def run_ats_checks(resume: Any, template_id: str | None = None) -> list[CheckResult]:
    """Run all ATS compatibility checks and return results."""
    return [
        check_contact_info(resume),
        check_section_naming(resume),
        check_section_structure(resume),
        check_date_format(resume),
        check_bullet_structure(resume),
        check_special_chars(resume),
        check_content_density(resume),
        check_template_safety(resume, template_id),
    ]

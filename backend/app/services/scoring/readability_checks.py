"""Readability checks — 5 checks, max 10 points.

Uses deterministic text metrics to evaluate how easy the resume
is to scan and read. Does not over-penalize technical terminology.
"""

from __future__ import annotations

from typing import Any

from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.config import (
    EXCESSIVE_SUMMARY_WORDS,
    MAX_BULLET_WORDS,
    READABILITY_WEIGHTS,
)
from app.services.scoring.text_metrics import (
    _get,
    _get_list,
    collect_all_bullets,
    find_duplicate_bullets,
    sentence_count,
    word_count,
)

CATEGORY = "readability"


def check_bullet_length(resume: Any) -> CheckResult:
    """READ_BULLET_LENGTH — Bullets should not exceed max word count."""
    code = "READ_BULLET_LENGTH"
    possible = READABILITY_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code,
            CATEGORY,
            "Bullet Length — No Bullets",
            "No bullet points to evaluate.",
            "passed",
            possible,
            possible,
        )

    long_bullets = [b for b in bullets if word_count(b) > MAX_BULLET_WORDS]
    ratio = len(long_bullets) / len(bullets)

    if not long_bullets:
        return CheckResult(
            code,
            CATEGORY,
            "Bullet Lengths Appropriate",
            f"All {len(bullets)} bullets are within readable length (≤{MAX_BULLET_WORDS} words).",
            "passed",
            possible,
            possible,
        )
    elif len(long_bullets) <= 2:
        return CheckResult(
            code,
            CATEGORY,
            "Some Bullets Too Long",
            f"{len(long_bullets)} bullet(s) exceed {MAX_BULLET_WORDS} words.",
            "warning",
            possible,
            possible - 1,
            recommendation=f"Shorten {len(long_bullets)} long " \
                f"bullet(s). Aim for 12–25 words per bullet.",
            evidence_data={"long_bullet_count": len(long_bullets)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Many Bullets Exceed Readable Length",
            f"{len(long_bullets)}/{len(bullets)} bullets exceed " \
                f"{MAX_BULLET_WORDS} words — hard to scan quickly.",
            "failed",
            possible,
            0,
            recommendation="Trim long bullets to their key contribution. Remove " \
                "unnecessary context from individual bullets.",
            evidence_data={"long_bullet_count": len(long_bullets), "ratio": round(ratio, 2)},
        )


def check_sentence_complexity(resume: Any) -> CheckResult:
    """READ_SENTENCE_COMPLEXITY — Bullets should not be multi-sentence paragraphs."""
    code = "READ_SENTENCE_COMPLEXITY"
    possible = READABILITY_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code,
            CATEGORY,
            "Sentence Complexity — No Bullets",
            "No bullet points to evaluate.",
            "passed",
            possible,
            possible,
        )

    multi_sentence = [b for b in bullets if sentence_count(b) > 1]

    if not multi_sentence:
        return CheckResult(
            code,
            CATEGORY,
            "Single-Sentence Bullets",
            "All bullet points are focused single-sentence statements.",
            "passed",
            possible,
            possible,
        )
    elif len(multi_sentence) <= 2:
        return CheckResult(
            code,
            CATEGORY,
            "Some Multi-Sentence Bullets",
            f"{len(multi_sentence)} bullet(s) contain multiple sentences.",
            "warning",
            possible,
            possible - 1,
            recommendation="Break multi-sentence bullets into separate, focused bullet points.",
            evidence_data={"multi_sentence_count": len(multi_sentence)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Many Bullets Are Multi-Sentence",
            f"{len(multi_sentence)} bullets read as paragraphs rather than crisp statements.",
            "failed",
            possible,
            0,
            recommendation="Each bullet should make a single point. Split " \
                "multi-sentence bullets into separate items.",
            evidence_data={"multi_sentence_count": len(multi_sentence)},
        )


def check_excessive_paragraphs(resume: Any) -> CheckResult:
    """READ_EXCESSIVE_PARAGRAPHS — Professional summary should not be a wall of text."""
    code = "READ_EXCESSIVE_PARAGRAPHS"
    possible = READABILITY_WEIGHTS[code]

    summary = (_get(resume, "professional_summary") or "").strip()
    summary_words = word_count(summary)

    # Check for experience descriptions that are paragraph-style rather than bullet-driven
    long_descriptions = []
    for exp in _get_list(resume, "experience"):
        bullets = _get(exp, "bullets") or []
        if not bullets:
            # Entry has no bullets — might be a paragraph
            company = _get(exp, "company") or "Unknown"
            long_descriptions.append(company)

    if summary_words <= EXCESSIVE_SUMMARY_WORDS and not long_descriptions:
        return CheckResult(
            code,
            CATEGORY,
            "No Excessive Paragraphs",
            "Professional summary and experience descriptions are well-structured.",
            "passed",
            possible,
            possible,
            evidence_data={"summary_word_count": summary_words},
        )
    elif summary_words > EXCESSIVE_SUMMARY_WORDS:
        return CheckResult(
            code,
            CATEGORY,
            "Summary Is Too Long",
            f"Professional summary is {summary_words} words — exceeds " \
                f"recommended length of {EXCESSIVE_SUMMARY_WORDS} words.",
            "warning",
            possible,
            possible - 1,
            recommendation="Trim the professional summary to 3–5 sentences (50–80 " \
                "words). Move details to the experience section.",
            evidence_data={"summary_word_count": summary_words},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Experience Entries Lack Bullets",
            f"{len(long_descriptions)} experience entries " \
                f"use descriptions instead of bullet points.",
            "warning",
            possible,
            possible - 1,
            recommendation="Convert experience descriptions to bullet " \
                "points for better readability and ATS parsing.",
            evidence_data={"entries_without_bullets": long_descriptions},
        )


def check_repetition(resume: Any) -> CheckResult:
    """READ_REPETITION — No repeated or near-identical content across sections."""
    code = "READ_REPETITION"
    possible = READABILITY_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code,
            CATEGORY,
            "Repetition — No Bullets",
            "No bullet points to check for repetition.",
            "passed",
            possible,
            possible,
        )

    # Use a slightly lower threshold than the content check (catches more)
    duplicates = find_duplicate_bullets(bullets, similarity_threshold=0.75)

    if not duplicates:
        return CheckResult(
            code,
            CATEGORY,
            "Content Is Non-Repetitive",
            "No repeated or near-duplicate bullet content found.",
            "passed",
            possible,
            possible,
        )
    elif len(duplicates) <= 2:
        return CheckResult(
            code,
            CATEGORY,
            "Minor Repetition",
            f"{len(duplicates)} near-duplicate bullet(s) detected.",
            "warning",
            possible,
            possible - 1,
            recommendation="Remove or differentiate repeated bullets.",
            evidence_data={"duplicate_pairs": len(duplicates)},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Significant Repetition",
            f"{len(duplicates)} duplicate bullet pairs make the resume feel repetitive.",
            "failed",
            possible,
            0,
            recommendation="Ensure each bullet highlights a unique " \
                "contribution. Remove copy-pasted bullets.",
            evidence_data={"duplicate_pairs": len(duplicates)},
        )


def check_density_balance(resume: Any) -> CheckResult:
    """READ_DENSITY_BALANCE — Resume sections have reasonable balance."""
    code = "READ_DENSITY_BALANCE"
    possible = READABILITY_WEIGHTS[code]

    # Count entries in major sections
    experience_count = len(_get_list(resume, "experience"))
    education_count = len(_get_list(resume, "education"))
    projects_count = len(_get_list(resume, "projects"))
    skills_count = len(_get_list(resume, "skills"))
    bullets = collect_all_bullets(resume)

    total_sections_populated = sum(
        [
            bool(experience_count),
            bool(education_count),
            bool(projects_count),
            bool(skills_count),
        ]
    )

    avg_bullets_per_exp = (len(bullets) / experience_count) if experience_count else 0

    if total_sections_populated >= 3 and (experience_count == 0 or avg_bullets_per_exp >= 2):
        return CheckResult(
            code,
            CATEGORY,
            "Good Section Balance",
            "Resume sections are well-balanced with adequate detail per entry.",
            "passed",
            possible,
            possible,
            evidence_data={
                "sections_populated": total_sections_populated,
                "avg_bullets_per_exp": round(avg_bullets_per_exp, 1),
            },
        )
    elif total_sections_populated >= 2:
        return CheckResult(
            code,
            CATEGORY,
            "Moderate Section Balance",
            "Most sections have content, but some are sparse.",
            "warning",
            possible,
            possible - 1,
            recommendation="Add 2–4 bullet points per experience " \
                "entry and fill in sparse sections.",
            evidence_data={"sections_populated": total_sections_populated},
        )
    else:
        return CheckResult(
            code,
            CATEGORY,
            "Unbalanced Resume Structure",
            "Only a few sections have content — the resume appears one-dimensional.",
            "failed",
            possible,
            0,
            recommendation="Populate multiple sections (experience, education, " \
                "skills, projects) for a well-rounded resume.",
            evidence_data={"sections_populated": total_sections_populated},
        )


def run_readability_checks(resume: Any) -> list[CheckResult]:
    """Run all Readability checks."""
    return [
        check_bullet_length(resume),
        check_sentence_complexity(resume),
        check_excessive_paragraphs(resume),
        check_repetition(resume),
        check_density_balance(resume),
    ]

"""Grammar checks — 5 checks, max 5 points.

Uses deterministic regex-based pattern matching only.
No external AI calls in this module.

The scoring engine must always return a valid result even if
optional AI grammar services are unavailable. These checks cover
the most common deterministic grammar issues.
"""
from __future__ import annotations

import re
from typing import Any

from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.config import GRAMMAR_WEIGHTS
from app.services.scoring.text_metrics import _get, collect_all_bullets, collect_all_text

CATEGORY = "grammar"


def check_repeated_punctuation(resume: Any) -> CheckResult:
    """GRAM_REPEATED_PUNCT — No repeated punctuation marks (e.g. '..' or '!!')."""
    code = "GRAM_REPEATED_PUNCT"
    possible = GRAMMAR_WEIGHTS[code]

    text = collect_all_text(resume)
    pattern = re.compile(r"[.!?,;:]{2,}")
    matches = pattern.findall(text)

    # Filter out ellipsis which are acceptable
    real_issues = [m for m in matches if m not in ("...", "....")]

    if not real_issues:
        return CheckResult(
            code, CATEGORY, "No Repeated Punctuation",
            "No repeated punctuation patterns detected.",
            "passed", possible, possible,
        )
    else:
        return CheckResult(
            code, CATEGORY, "Repeated Punctuation Found",
            f"Found {len(real_issues)} instance(s) of repeated punctuation (e.g. '..', '!!').",
            "warning", possible, 0,
            recommendation="Remove repeated punctuation marks. Use single periods to end sentences.",
            evidence_data={"instances_found": len(real_issues), "examples": real_issues[:3]},
        )


def check_excessive_capitalization(resume: Any) -> CheckResult:
    """GRAM_EXCESSIVE_CAPS — No ALL-CAPS words (other than acronyms) in bullets."""
    code = "GRAM_EXCESSIVE_CAPS"
    possible = GRAMMAR_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Capitalization — No Bullets",
            "No bullets to evaluate.",
            "passed", possible, possible,
        )

    # ALL-CAPS words longer than 4 chars and not common acronyms
    common_acronyms = {
        "API", "SQL", "AWS", "GCP", "HTML", "CSS", "REST", "JSON", "YAML",
        "XML", "HTTP", "HTTPS", "MVP", "KPI", "ROI", "SLA", "SDK", "CI",
        "CD", "JWT", "ORM", "UI", "UX", "ML", "AI", "QA", "QC", "CRM",
        "ERP", "SaaS", "B2B", "B2C", "NLP", "LLM",
    }
    caps_pattern = re.compile(r"\b[A-Z]{5,}\b")
    issues: list[str] = []

    for bullet in bullets:
        found = caps_pattern.findall(bullet)
        for f in found:
            if f not in common_acronyms:
                issues.append(f)

    if not issues:
        return CheckResult(
            code, CATEGORY, "No Excessive Capitalization",
            "No inappropriately capitalized words found in bullet points.",
            "passed", possible, possible,
        )
    else:
        unique_issues = list(set(issues))[:5]
        return CheckResult(
            code, CATEGORY, "Excessive Capitalization Detected",
            f"Found {len(issues)} ALL-CAPS word(s) that are not standard acronyms.",
            "warning", possible, 0,
            recommendation="Use title case or lowercase for non-acronym words.",
            evidence_data={"examples": unique_issues},
        )


def check_missing_spaces(resume: Any) -> CheckResult:
    """GRAM_MISSING_SPACES — Words should not be run together without spaces."""
    code = "GRAM_MISSING_SPACES"
    possible = GRAMMAR_WEIGHTS[code]

    text = collect_all_text(resume)
    # Detect patterns like "word.word" or "word,word" without space after punctuation
    pattern = re.compile(r"[a-z][.,;:][A-Za-z]")
    matches = pattern.findall(text)

    if not matches:
        return CheckResult(
            code, CATEGORY, "No Missing Spaces Detected",
            "Punctuation spacing appears correct throughout the resume.",
            "passed", possible, possible,
        )
    else:
        return CheckResult(
            code, CATEGORY, "Missing Spaces After Punctuation",
            f"Found {len(matches)} instance(s) of missing spaces after punctuation.",
            "warning", possible, 0,
            recommendation="Add a space after periods, commas, and other punctuation marks.",
            evidence_data={"instances_found": len(matches), "examples": matches[:3]},
        )


def check_duplicate_words(resume: Any) -> CheckResult:
    """GRAM_DUPLICATE_WORDS — No consecutive repeated words (e.g. 'the the')."""
    code = "GRAM_DUPLICATE_WORDS"
    possible = GRAMMAR_WEIGHTS[code]

    text = collect_all_text(resume)
    # Match word repeated consecutively (case-insensitive)
    pattern = re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE)
    matches = pattern.findall(text)

    if not matches:
        return CheckResult(
            code, CATEGORY, "No Duplicate Words",
            "No consecutive repeated words found.",
            "passed", possible, possible,
        )
    else:
        unique = list(set(matches))[:5]
        return CheckResult(
            code, CATEGORY, "Consecutive Duplicate Words Found",
            f"Found {len(matches)} instance(s) of repeated words (e.g. 'the the', 'is is').",
            "warning", possible, 0,
            recommendation="Review and remove duplicate words.",
            evidence_data={"duplicates_found": unique},
        )


def check_bullet_ending_consistency(resume: Any) -> CheckResult:
    """GRAM_BULLET_ENDING — Bullet points should consistently end or not end with periods."""
    code = "GRAM_BULLET_ENDING"
    possible = GRAMMAR_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if len(bullets) < 3:
        # Not enough data to assess consistency
        return CheckResult(
            code, CATEGORY, "Bullet Ending — Insufficient Data",
            "Not enough bullet points to evaluate ending consistency.",
            "passed", possible, possible,
        )

    with_period = sum(1 for b in bullets if b.rstrip().endswith("."))
    without_period = len(bullets) - with_period
    ratio = with_period / len(bullets)

    # Consistent means >90% one way or another
    if ratio >= 0.9 or ratio <= 0.1:
        style = "with periods" if ratio >= 0.9 else "without periods"
        return CheckResult(
            code, CATEGORY, "Consistent Bullet Endings",
            f"Bullet points consistently end {style} ({ratio:.0%}).",
            "passed", possible, possible,
            evidence_data={"style": style, "consistency_ratio": round(ratio, 2)},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Inconsistent Bullet Period Usage",
            f"{with_period} bullets end with periods, {without_period} do not — inconsistent styling.",
            "warning", possible, 0,
            recommendation="Choose one style: either end all bullets with periods or none.",
            evidence_data={
                "with_period": with_period,
                "without_period": without_period,
                "consistency_ratio": round(ratio, 2),
            },
        )


def run_grammar_checks(resume: Any) -> list[CheckResult]:
    """Run all Grammar checks (deterministic only)."""
    return [
        check_repeated_punctuation(resume),
        check_excessive_capitalization(resume),
        check_missing_spaces(resume),
        check_duplicate_words(resume),
        check_bullet_ending_consistency(resume),
    ]

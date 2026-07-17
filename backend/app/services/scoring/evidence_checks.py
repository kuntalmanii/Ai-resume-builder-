"""Evidence & Credibility checks — 5 checks, max 10 points.

Analyzes internal consistency, timeline logic, numeric claim awareness,
Career Profile alignment, and verification transparency.

IMPORTANT: This module does NOT claim to externally verify employment
or education. It surfaces awareness and consistency signals only.

Numeric claims are flagged as "user-provided" — never "fabricated".
Career Profile consistency adds positive confidence, not punishment.
"""
from __future__ import annotations

from datetime import date
from typing import Any

from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.config import EVIDENCE_WEIGHTS
from app.services.scoring.text_metrics import (
    _get,
    _get_list,
    collect_all_bullets,
    has_any_metric,
    parse_date,
)

CATEGORY = "evidence"


def check_internal_consistency(resume: Any) -> CheckResult:
    """EVID_INTERNAL_CONSISTENCY — No conflicting is_current/end_date or duplicate entries."""
    code = "EVID_INTERNAL_CONSISTENCY"
    possible = EVIDENCE_WEIGHTS[code]

    issues: list[str] = []

    # Check is_current conflicts
    for exp in _get_list(resume, "experience"):
        is_current = _get(exp, "is_current") or False
        end_date = (_get(exp, "end_date") or "").strip().lower()
        company = _get(exp, "company") or "Unknown"

        if is_current and end_date and end_date not in ("present", "current", "now", ""):
            issues.append(f"'{company}': marked current but has end date '{end_date}'")

    # Check for duplicate company+position entries
    exp_signatures: list[str] = []
    for exp in _get_list(resume, "experience"):
        sig = f"{(_get(exp, 'company') or '').lower().strip()}|{(_get(exp, 'position') or '').lower().strip()}"
        if sig in exp_signatures and sig != "|":
            company = _get(exp, "company") or "?"
            issues.append(f"Duplicate experience entry: '{company}'")
        exp_signatures.append(sig)

    if not issues:
        return CheckResult(
            code, CATEGORY, "No Internal Inconsistencies",
            "Resume entries are internally consistent with no conflicting fields.",
            "passed", possible, possible,
        )
    elif len(issues) == 1:
        return CheckResult(
            code, CATEGORY, "Minor Inconsistency Detected",
            f"One inconsistency found: {issues[0]}",
            "warning", possible, possible - 1,
            recommendation="Review and correct the inconsistency in your experience dates.",
            evidence_data={"issues": issues},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Multiple Inconsistencies Detected",
            f"{len(issues)} internal inconsistencies found.",
            "failed", possible, 0,
            recommendation="Review experience entries for date conflicts and duplicate roles.",
            evidence_data={"issues": issues},
        )


def check_timeline_consistency(resume: Any) -> CheckResult:
    """EVID_TIMELINE_CONSISTENCY — No impossible date ranges (end < start)."""
    code = "EVID_TIMELINE_CONSISTENCY"
    possible = EVIDENCE_WEIGHTS[code]

    invalid_ranges: list[str] = []
    today = date.today()

    for exp in _get_list(resume, "experience"):
        company = _get(exp, "company") or "Unknown"
        is_current = _get(exp, "is_current") or False
        sd_str = _get(exp, "start_date") or ""
        ed_str = _get(exp, "end_date") or ""

        sd = parse_date(sd_str)
        ed = parse_date("Present" if is_current else ed_str)

        if sd and ed and not is_current:
            if ed < sd:
                invalid_ranges.append(f"'{company}': end date ({ed_str}) is before start date ({sd_str})")
            elif sd > today:
                invalid_ranges.append(f"'{company}': start date ({sd_str}) is in the future")

    for edu in _get_list(resume, "education"):
        institution = _get(edu, "institution") or "Unknown"
        sd_str = _get(edu, "start_date") or ""
        ed_str = _get(edu, "end_date") or ""
        is_current = _get(edu, "is_current") or False

        sd = parse_date(sd_str)
        ed = parse_date(ed_str)

        if sd and ed and not is_current and ed < sd:
            invalid_ranges.append(f"'{institution}': education end before start")

    if not invalid_ranges:
        return CheckResult(
            code, CATEGORY, "Timeline Consistency — Valid",
            "All date ranges are chronologically valid.",
            "passed", possible, possible,
        )
    elif len(invalid_ranges) == 1:
        return CheckResult(
            code, CATEGORY, "One Invalid Date Range",
            f"Invalid range detected: {invalid_ranges[0]}",
            "warning", possible, possible - 1,
            recommendation="Correct the date range to ensure end date is after start date.",
            evidence_data={"invalid_ranges": invalid_ranges},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Multiple Invalid Date Ranges",
            f"{len(invalid_ranges)} date ranges are chronologically impossible.",
            "failed", possible, 0,
            recommendation="Review all dates — ensure each end date comes after its start date.",
            evidence_data={"invalid_ranges": invalid_ranges},
        )


def check_numeric_awareness(resume: Any) -> CheckResult:
    """EVID_NUMERIC_AWARENESS — Numeric claims are flagged as user-provided (not verified).

    This check does NOT accuse the user of fabrication.
    It surfaces awareness that metrics are self-reported.
    High metric usage is rewarded slightly; claims are surfaced transparently.
    """
    code = "EVID_NUMERIC_AWARENESS"
    possible = EVIDENCE_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "No Metrics to Evaluate",
            "No bullet points with numeric claims to evaluate.",
            "passed", possible, possible,
            evidence_data={"note": "Add metrics where truthful to strengthen evidence credibility."},
        )

    bullets_with_metrics = [b for b in bullets if has_any_metric(b)]
    ratio = len(bullets_with_metrics) / len(bullets)

    if ratio >= 0.3:
        return CheckResult(
            code, CATEGORY, "Metrics Present — User-Provided",
            f"{len(bullets_with_metrics)}/{len(bullets)} bullets include numeric claims.",
            "passed", possible, possible,
            recommendation=None,
            evidence_data={
                "bullets_with_metrics": len(bullets_with_metrics),
                "note": "These metrics are user-provided claims and have not been externally verified. "
                        "You can connect Career Profile entries to add supporting context.",
            },
        )
    else:
        return CheckResult(
            code, CATEGORY, "Few Quantifiable Claims",
            f"Only {len(bullets_with_metrics)}/{len(bullets)} bullets include numeric outcomes.",
            "warning", possible, possible - 1,
            recommendation="Where truthful, add measurable outcomes. Metrics strengthen evidence credibility.",
            evidence_data={
                "bullets_with_metrics": len(bullets_with_metrics),
                "note": "Only add metrics that accurately reflect your actual work.",
            },
        )


def check_profile_consistency(resume: Any, career_profile: Any | None = None) -> CheckResult:
    """EVID_PROFILE_CONSISTENCY — Resume entries align with Smart Career Profile.

    Missing Career Profile data does NOT penalize the user.
    Matching profile entries add positive confidence.
    """
    code = "EVID_PROFILE_CONSISTENCY"
    possible = EVIDENCE_WEIGHTS[code]

    if not career_profile:
        return CheckResult(
            code, CATEGORY, "Career Profile Not Linked",
            "No Smart Career Profile found to cross-reference against resume entries.",
            "warning", possible, possible - 1,
            recommendation="Complete your Smart Career Profile to enable cross-reference verification.",
            evidence_data={"note": "Profile consistency adds confidence signals — it is not required."},
        )

    resume_companies = set()
    for exp in _get_list(resume, "experience"):
        c = (_get(exp, "company") or "").lower().strip()
        if c:
            resume_companies.add(c)

    # Career profile experience from dict or object
    profile_companies = set()
    profile_exp = _get_list(career_profile, "experience")
    for pe in profile_exp:
        c = (_get(pe, "company") or "").lower().strip()
        if c:
            profile_companies.add(c)

    if not resume_companies:
        return CheckResult(
            code, CATEGORY, "No Experience to Cross-Reference",
            "Resume has no experience entries to compare with Career Profile.",
            "warning", possible, possible - 1,
        )

    matched = resume_companies & profile_companies
    match_ratio = len(matched) / len(resume_companies) if resume_companies else 0

    if match_ratio >= 0.8:
        return CheckResult(
            code, CATEGORY, "Strong Career Profile Alignment",
            f"{len(matched)}/{len(resume_companies)} companies match Career Profile entries.",
            "passed", possible, possible,
            evidence_data={
                "matched_companies": list(matched),
                "match_ratio": round(match_ratio, 2),
            },
        )
    elif match_ratio >= 0.4:
        unmatched = resume_companies - profile_companies
        return CheckResult(
            code, CATEGORY, "Partial Career Profile Alignment",
            f"{len(matched)}/{len(resume_companies)} resume companies found in Career Profile.",
            "warning", possible, possible - 1,
            recommendation="Add the remaining experience entries to your Smart Career Profile for stronger verification.",
            evidence_data={
                "matched_companies": list(matched),
                "unmatched_companies": list(unmatched)[:3],
            },
        )
    else:
        return CheckResult(
            code, CATEGORY, "Low Career Profile Alignment",
            f"Only {len(matched)}/{len(resume_companies)} resume companies match Career Profile.",
            "warning", possible, max(0, possible - 1),
            recommendation="Update your Smart Career Profile to include your work history for better verification.",
            evidence_data={"match_ratio": round(match_ratio, 2)},
        )


def check_verification_transparency(resume: Any) -> CheckResult:
    """EVID_VERIFICATION_TRANSPARENCY — Surface the overall evidence confidence level."""
    code = "EVID_VERIFICATION_TRANSPARENCY"
    possible = EVIDENCE_WEIGHTS[code]

    # This check always passes — it's about transparency, not punishment.
    # We always surface what the system can and cannot verify.
    bullets = collect_all_bullets(resume)
    bullets_with_metrics = [b for b in bullets if has_any_metric(b)]

    return CheckResult(
        code, CATEGORY, "Verification Transparency",
        "Resume content is analyzed for internal consistency. "
        "Numeric claims are treated as user-provided. No external employment verification is performed.",
        "passed", possible, possible,
        evidence_data={
            "total_bullets": len(bullets),
            "bullets_with_numeric_claims": len(bullets_with_metrics),
            "verification_level": "self_reported",
            "note": "Connect your Smart Career Profile to add source-backed confidence to your entries.",
        },
    )


def run_evidence_checks(resume: Any, career_profile: Any | None = None) -> list[CheckResult]:
    """Run all Evidence & Credibility checks."""
    return [
        check_internal_consistency(resume),
        check_timeline_consistency(resume),
        check_numeric_awareness(resume),
        check_profile_consistency(resume, career_profile),
        check_verification_transparency(resume),
    ]

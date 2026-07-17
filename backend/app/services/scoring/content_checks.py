"""Content Strength checks — 6 checks, max 20 points.

Analyzes bullet point and description quality:
action verbs, specificity, measurable impact, conciseness,
repetition, and weak phrase avoidance.

The LLM never sets any score value in this module.
All scoring is deterministic.
"""
from __future__ import annotations

from typing import Any

from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.config import (
    ACTION_VERB_COVERAGE_THRESHOLD,
    CONTENT_WEIGHTS,
    MAX_BULLET_WORDS,
    MIN_BULLET_WORDS,
    WEAK_PHRASE_THRESHOLD,
)
from app.services.scoring.text_metrics import (
    collect_all_bullets,
    contains_weak_phrase,
    find_duplicate_bullets,
    has_any_metric,
    specificity_score,
    starts_with_action_verb,
    word_count,
)

CATEGORY = "content"


def check_action_verbs(resume: Any) -> CheckResult:
    """CONTENT_ACTION_VERBS — Bullets should start with strong action verbs."""
    code = "CONTENT_ACTION_VERBS"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Action Verbs — No Bullets",
            "No bullet points found to evaluate action verb usage.",
            "warning", possible, possible // 2,
            recommendation="Add bullet points to experience and project entries.",
        )

    with_action = sum(1 for b in bullets if starts_with_action_verb(b))
    ratio = with_action / len(bullets)
    weak_count = len(bullets) - with_action

    if ratio >= ACTION_VERB_COVERAGE_THRESHOLD:
        return CheckResult(
            code, CATEGORY, "Strong Action Verb Usage",
            f"{with_action}/{len(bullets)} bullets begin with action verbs ({ratio:.0%}).",
            "passed", possible, possible,
            evidence_data={
                "action_verb_ratio": round(ratio, 2),
                "bullets_analyzed": len(bullets),
                "bullets_with_action_verb": with_action,
            },
        )
    elif ratio >= 0.3:
        return CheckResult(
            code, CATEGORY, "Action Verb Coverage Low",
            f"Only {with_action}/{len(bullets)} bullets ({ratio:.0%}) start with action verbs.",
            "warning", possible, possible // 2,
            recommendation=f"Rewrite {weak_count} bullets to start with strong action verbs (e.g. Built, Designed, Led, Reduced).",
            evidence_data={
                "action_verb_ratio": round(ratio, 2),
                "bullets_lacking_action_verb": weak_count,
            },
        )
    else:
        return CheckResult(
            code, CATEGORY, "Weak Action Verb Coverage",
            f"Only {ratio:.0%} of bullets start with action verbs.",
            "failed", possible, 0,
            recommendation="Rewrite bullets to lead with action verbs. Replace 'Responsible for X' with 'Delivered X'.",
            evidence_data={
                "action_verb_ratio": round(ratio, 2),
                "bullets_lacking_action_verb": weak_count,
            },
        )


def check_specificity(resume: Any) -> CheckResult:
    """CONTENT_SPECIFICITY — Bullets should contain concrete technologies, outcomes, or scope."""
    code = "CONTENT_SPECIFICITY"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Specificity — No Bullets",
            "No bullet points found to evaluate specificity.",
            "warning", possible, possible // 2,
        )

    scores = [specificity_score(b) for b in bullets]
    avg_score = sum(scores) / len(scores)
    high_specificity = sum(1 for s in scores if s >= 2)
    ratio = high_specificity / len(bullets)

    if avg_score >= 2.5:
        return CheckResult(
            code, CATEGORY, "High Content Specificity",
            f"Bullets contain concrete technologies, scope, and outcomes (avg specificity: {avg_score:.1f}/5).",
            "passed", possible, possible,
            evidence_data={"avg_specificity": round(avg_score, 2), "high_specificity_bullets": high_specificity},
        )
    elif avg_score >= 1.5:
        return CheckResult(
            code, CATEGORY, "Moderate Specificity",
            f"Some bullets lack concrete details (avg specificity: {avg_score:.1f}/5).",
            "warning", possible, possible // 2,
            recommendation="Add specific technologies, team sizes, project scope, or outcomes to vague bullets.",
            evidence_data={"avg_specificity": round(avg_score, 2)},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Low Content Specificity",
            f"Bullets are too generic — missing specific technologies, scope, or outcomes (avg: {avg_score:.1f}/5).",
            "failed", possible, 0,
            recommendation="Make bullets concrete: mention the technology used, scale, team size, or outcome achieved.",
            evidence_data={"avg_specificity": round(avg_score, 2)},
        )


def check_measurable_impact(resume: Any) -> CheckResult:
    """CONTENT_MEASURABLE_IMPACT — Presence of metrics (%, $, counts) in bullets."""
    code = "CONTENT_MEASURABLE_IMPACT"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Measurable Impact — No Bullets",
            "No bullet points found to evaluate impact metrics.",
            "warning", possible, possible // 2,
        )

    with_metrics = sum(1 for b in bullets if has_any_metric(b))
    ratio = with_metrics / len(bullets)

    if ratio >= 0.4:
        return CheckResult(
            code, CATEGORY, "Strong Measurable Impact",
            f"{with_metrics}/{len(bullets)} bullets ({ratio:.0%}) contain quantifiable outcomes.",
            "passed", possible, possible,
            recommendation=None,
            evidence_data={
                "bullets_with_metrics": with_metrics,
                "metric_coverage_ratio": round(ratio, 2),
                "note": "Metrics are user-provided claims and have not been independently verified.",
            },
        )
    elif ratio >= 0.2:
        return CheckResult(
            code, CATEGORY, "Some Measurable Outcomes",
            f"{with_metrics}/{len(bullets)} bullets include metrics.",
            "warning", possible, possible // 2,
            recommendation="Add measurable outcomes (%, $, counts, time saved) to more bullets where truthful data exists.",
            evidence_data={
                "bullets_with_metrics": with_metrics,
                "metric_coverage_ratio": round(ratio, 2),
                "note": "Only add metrics that are accurate — do not fabricate results.",
            },
        )
    else:
        return CheckResult(
            code, CATEGORY, "No Measurable Outcomes",
            f"Only {with_metrics}/{len(bullets)} bullets include quantifiable metrics.",
            "failed", possible, 0,
            recommendation="Where accurate, add metrics: e.g. 'Reduced page load time by 40%', 'Served 10k+ users'.",
            evidence_data={
                "bullets_with_metrics": with_metrics,
                "note": "Add only truthful metrics — do not fabricate performance claims.",
            },
        )


def check_conciseness(resume: Any) -> CheckResult:
    """CONTENT_CONCISENESS — Bullets should not be excessively long."""
    code = "CONTENT_CONCISENESS"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Conciseness — No Bullets",
            "No bullet points to evaluate for conciseness.",
            "warning", possible, possible // 2,
        )

    too_long = [b for b in bullets if word_count(b) > MAX_BULLET_WORDS]
    too_short = [b for b in bullets if 0 < word_count(b) < MIN_BULLET_WORDS]
    avg_words = sum(word_count(b) for b in bullets) / len(bullets)

    if not too_long and not too_short:
        return CheckResult(
            code, CATEGORY, "Bullet Conciseness — Excellent",
            f"All bullets are within ideal length range (avg {avg_words:.0f} words).",
            "passed", possible, possible,
            evidence_data={"avg_bullet_words": round(avg_words, 1)},
        )
    elif len(too_long) <= 2:
        return CheckResult(
            code, CATEGORY, "Some Bullets Too Long",
            f"{len(too_long)} bullet(s) exceed {MAX_BULLET_WORDS} words and may be hard to scan.",
            "warning", possible, possible - 1,
            recommendation=f"Shorten {len(too_long)} long bullet(s) to under {MAX_BULLET_WORDS} words for better readability.",
            evidence_data={"long_bullets_count": len(too_long), "avg_bullet_words": round(avg_words, 1)},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Many Bullets Too Long",
            f"{len(too_long)} bullets exceed {MAX_BULLET_WORDS} words — hard to scan quickly.",
            "failed", possible, 0,
            recommendation="Trim long bullets. Aim for 12–25 words per bullet for maximum readability.",
            evidence_data={"long_bullets_count": len(too_long), "avg_bullet_words": round(avg_words, 1)},
        )


def check_repetition(resume: Any) -> CheckResult:
    """CONTENT_REPETITION — No duplicate or near-duplicate bullets across sections."""
    code = "CONTENT_REPETITION"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Repetition — No Bullets",
            "No bullet points to check for repetition.",
            "passed", possible, possible,
        )

    duplicates = find_duplicate_bullets(bullets, similarity_threshold=0.80)

    if not duplicates:
        return CheckResult(
            code, CATEGORY, "No Duplicate Bullets",
            "All bullet points are unique — no repetition detected.",
            "passed", possible, possible,
        )
    elif len(duplicates) <= 2:
        return CheckResult(
            code, CATEGORY, "Minor Bullet Repetition",
            f"{len(duplicates)} near-duplicate bullet pair(s) detected.",
            "warning", possible, possible - 1,
            recommendation="Rewrite duplicate bullets to highlight different achievements or responsibilities.",
            evidence_data={"duplicate_pairs": len(duplicates)},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Significant Bullet Repetition",
            f"{len(duplicates)} duplicate bullet pairs detected — content appears repetitive.",
            "failed", possible, 0,
            recommendation="Remove or differentiate repeated bullet points. Each bullet should highlight a unique contribution.",
            evidence_data={"duplicate_pairs": len(duplicates)},
        )


def check_weak_phrases(resume: Any) -> CheckResult:
    """CONTENT_WEAK_PHRASES — Avoid passive and weak-opening phrases."""
    code = "CONTENT_WEAK_PHRASES"
    possible = CONTENT_WEIGHTS[code]

    bullets = collect_all_bullets(resume)
    if not bullets:
        return CheckResult(
            code, CATEGORY, "Weak Phrases — No Bullets",
            "No bullet points to check for weak phrase patterns.",
            "passed", possible, possible,
        )

    weak = [b for b in bullets if contains_weak_phrase(b)]
    ratio = len(weak) / len(bullets)

    if ratio == 0:
        return CheckResult(
            code, CATEGORY, "No Weak Phrases Detected",
            "No weak or passive phrases found in bullet points.",
            "passed", possible, possible,
        )
    elif ratio <= WEAK_PHRASE_THRESHOLD:
        sample = weak[:2]
        return CheckResult(
            code, CATEGORY, "Some Weak Phrases Found",
            f"{len(weak)} bullet(s) contain weak phrases like 'responsible for' or 'worked on'.",
            "warning", possible, possible - 1,
            recommendation="Replace weak phrases with specific action verbs. Instead of 'Worked on X', use 'Built X'.",
            evidence_data={"weak_bullet_count": len(weak), "examples": sample[:2]},
        )
    else:
        return CheckResult(
            code, CATEGORY, "Widespread Weak Phrases",
            f"{len(weak)}/{len(bullets)} bullets ({ratio:.0%}) use weak or passive language.",
            "failed", possible, 0,
            recommendation="Rewrite bullets to use active, specific language. Avoid 'responsible for', 'helped with', 'participated in'.",
            evidence_data={"weak_bullet_count": len(weak), "ratio": round(ratio, 2)},
        )


def run_content_checks(resume: Any) -> list[CheckResult]:
    """Run all Content Strength checks."""
    return [
        check_action_verbs(resume),
        check_specificity(resume),
        check_measurable_impact(resume),
        check_conciseness(resume),
        check_repetition(resume),
        check_weak_phrases(resume),
    ]

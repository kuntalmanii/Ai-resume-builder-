"""Recommendations builder.

Converts CheckResult objects into prioritized top-level recommendations.
Priority order:
  1. Points lost (highest first)
  2. Severity (failed > warning > passed)
  3. Check code for deterministic tie-breaking

Deduplication: only one recommendation per check_code.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.services.scoring.ats_checks import CheckResult


@dataclass
class TopRecommendation:
    check_code: str
    category: str
    title: str
    recommendation: str
    points_possible: int
    points_lost: int
    status: str  # failed | warning


_STATUS_PRIORITY = {"failed": 0, "warning": 1, "passed": 2}


def build_recommendations(
    checks: list[CheckResult],
    max_recommendations: int = 10,
) -> list[TopRecommendation]:
    """
    Build a prioritized list of top recommendations from check results.

    Only includes failed or warning checks that have a recommendation.
    Sorts by:
      1. Points lost (descending)
      2. Severity (failed first)
      3. Check code (alphabetical for determinism)
    """
    actionable: list[TopRecommendation] = []

    for check in checks:
        if check.status == "passed":
            continue
        if not check.recommendation:
            continue

        points_lost = check.points_possible - check.points_awarded
        if points_lost <= 0:
            continue

        actionable.append(TopRecommendation(
            check_code=check.check_code,
            category=check.category,
            title=check.title,
            recommendation=check.recommendation,
            points_possible=check.points_possible,
            points_lost=points_lost,
            status=check.status,
        ))

    # Sort by: points_lost desc, status priority asc, check_code asc
    actionable.sort(key=lambda r: (
        -r.points_lost,
        _STATUS_PRIORITY.get(r.status, 2),
        r.check_code,
    ))

    # Deduplicate by check_code (shouldn't happen, but defensive)
    seen_codes: set[str] = set()
    deduped: list[TopRecommendation] = []
    for rec in actionable:
        if rec.check_code not in seen_codes:
            seen_codes.add(rec.check_code)
            deduped.append(rec)

    return deduped[:max_recommendations]

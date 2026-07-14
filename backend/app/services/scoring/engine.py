"""Scoring engine orchestrator.

Runs all check modules and assembles the final AnalysisResult.

The overall score is normalized:
  overall_score = round((raw_score / raw_max_score) * 100)

Category scores are also normalized to 100:
  category_normalized = round((cat_raw / cat_max) * 100)

JD Match score is always None in this module (Phase 9: resume-only).

Invariants enforced:
- raw_score >= 0 and raw_score <= raw_max_score
- overall_score in [0, 100]
- Each check's points_awarded in [0, points_possible]
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.services.scoring.config import (
    ANALYSIS_VERSION,
    CATEGORY_MAX,
    RAW_MAX_SCORE,
)
from app.services.scoring.ats_checks import CheckResult, run_ats_checks
from app.services.scoring.content_checks import run_content_checks
from app.services.scoring.completeness_checks import run_completeness_checks
from app.services.scoring.readability_checks import run_readability_checks
from app.services.scoring.grammar_checks import run_grammar_checks
from app.services.scoring.evidence_checks import run_evidence_checks
from app.services.scoring.recommendations import TopRecommendation, build_recommendations
from app.services.scoring.text_metrics import _get


# ─── Result Types ─────────────────────────────────────────────────────────────

@dataclass
class CategoryResult:
    """Score breakdown for a single category."""
    category: str
    raw_score: int      # Points earned (e.g. 14 out of 20)
    max_score: int      # Maximum possible (e.g. 20)
    normalized: int     # 0–100 normalized score (e.g. 70)
    check_count: int
    passed_count: int
    failed_count: int
    warning_count: int


@dataclass
class AnalysisResult:
    """Complete result from the scoring engine."""
    analysis_version: str
    raw_score: int          # 0–75
    raw_max_score: int      # 75 (resume-only)
    overall_score: int      # 0–100 normalized
    ats_score: int
    content_score: int
    jd_match_score: int | None     # Always None in Phase 9
    completeness_score: int
    readability_score: int
    grammar_score: int
    evidence_credibility_score: int
    categories: list[CategoryResult]
    checks: list[CheckResult]
    top_recommendations: list[TopRecommendation]
    potential_score_gain: int       # Points user could gain by fixing failed checks
    metadata: dict = field(default_factory=dict)


# ─── Score Clamping ───────────────────────────────────────────────────────────

def _clamp(value: int, lo: int = 0, hi: int = 100) -> int:
    return max(lo, min(hi, value))


def _normalize(raw: int, max_possible: int) -> int:
    if max_possible <= 0:
        return 0
    return _clamp(round((raw / max_possible) * 100))


def _sum_category(checks: list[CheckResult]) -> tuple[int, int]:
    """Return (total awarded, total possible) for a list of checks."""
    awarded = sum(_clamp(c.points_awarded, 0, c.points_possible) for c in checks)
    possible = sum(c.points_possible for c in checks)
    return awarded, possible


# ─── Engine ───────────────────────────────────────────────────────────────────

def run_resume_analysis(
    resume: Any,
    career_profile: Any | None = None,
    template_id: str | None = None,
) -> AnalysisResult:
    """
    Run the complete deterministic scoring analysis on a resume.

    Args:
        resume:         A dict or Pydantic model representing ResumeDocument content.
        career_profile: Optional dict or Pydantic model for career profile cross-reference.
        template_id:    Optional template identifier for ATS template safety check.

    Returns:
        AnalysisResult with all scores, checks, and recommendations.
    """
    # ── Run all check modules ──────────────────────────────────────────────
    ats_results = run_ats_checks(resume, template_id=template_id)
    content_results = run_content_checks(resume)
    completeness_results = run_completeness_checks(resume)
    readability_results = run_readability_checks(resume)
    grammar_results = run_grammar_checks(resume)
    evidence_results = run_evidence_checks(resume, career_profile=career_profile)

    all_checks: list[CheckResult] = (
        ats_results
        + content_results
        + completeness_results
        + readability_results
        + grammar_results
        + evidence_results
    )

    # ── Compute category raw scores ────────────────────────────────────────
    ats_raw, ats_max = _sum_category(ats_results)
    content_raw, content_max = _sum_category(content_results)
    complete_raw, complete_max = _sum_category(completeness_results)
    read_raw, read_max = _sum_category(readability_results)
    gram_raw, gram_max = _sum_category(grammar_results)
    evid_raw, evid_max = _sum_category(evidence_results)

    # ── Enforce invariants ────────────────────────────────────────────────
    raw_score = _clamp(
        ats_raw + content_raw + complete_raw + read_raw + gram_raw + evid_raw,
        0, RAW_MAX_SCORE,
    )
    raw_max_score = RAW_MAX_SCORE
    overall_score = _normalize(raw_score, raw_max_score)

    # ── Normalize category scores to 0–100 ────────────────────────────────
    ats_score = _normalize(ats_raw, CATEGORY_MAX["ats"])
    content_score = _normalize(content_raw, CATEGORY_MAX["content"])
    completeness_score = _normalize(complete_raw, CATEGORY_MAX["completeness"])
    readability_score = _normalize(read_raw, CATEGORY_MAX["readability"])
    grammar_score = _normalize(gram_raw, CATEGORY_MAX["grammar"])
    evidence_score = _normalize(evid_raw, CATEGORY_MAX["evidence"])

    # ── Build category breakdowns ──────────────────────────────────────────
    def _make_cat(name: str, results: list[CheckResult], raw: int, max_p: int) -> CategoryResult:
        return CategoryResult(
            category=name,
            raw_score=raw,
            max_score=max_p,
            normalized=_normalize(raw, max_p),
            check_count=len(results),
            passed_count=sum(1 for r in results if r.status == "passed"),
            failed_count=sum(1 for r in results if r.status == "failed"),
            warning_count=sum(1 for r in results if r.status == "warning"),
        )

    categories = [
        _make_cat("ats", ats_results, ats_raw, CATEGORY_MAX["ats"]),
        _make_cat("content", content_results, content_raw, CATEGORY_MAX["content"]),
        _make_cat("completeness", completeness_results, complete_raw, CATEGORY_MAX["completeness"]),
        _make_cat("readability", readability_results, read_raw, CATEGORY_MAX["readability"]),
        _make_cat("grammar", grammar_results, gram_raw, CATEGORY_MAX["grammar"]),
        _make_cat("evidence", evidence_results, evid_raw, CATEGORY_MAX["evidence"]),
    ]

    # ── Build recommendations ──────────────────────────────────────────────
    top_recommendations = build_recommendations(all_checks, max_recommendations=10)

    # ── Calculate potential score gain ────────────────────────────────────
    # Potential gain = points user could earn if they fixed all failed/warning checks
    max_recoverable_raw = sum(
        c.points_possible - c.points_awarded
        for c in all_checks
        if c.status in ("failed", "warning")
    )
    potential_raw = min(raw_score + max_recoverable_raw, raw_max_score)
    potential_score_gain = _normalize(potential_raw, raw_max_score) - overall_score

    return AnalysisResult(
        analysis_version=ANALYSIS_VERSION,
        raw_score=raw_score,
        raw_max_score=raw_max_score,
        overall_score=overall_score,
        ats_score=ats_score,
        content_score=content_score,
        jd_match_score=None,   # Phase 9: resume-only mode
        completeness_score=completeness_score,
        readability_score=readability_score,
        grammar_score=grammar_score,
        evidence_credibility_score=evidence_score,
        categories=categories,
        checks=all_checks,
        top_recommendations=top_recommendations,
        potential_score_gain=_clamp(potential_score_gain),
        metadata={
            "career_profile_linked": career_profile is not None,
            "template_id": template_id,
            "total_checks_run": len(all_checks),
        },
    )

"""Scoring engine package.

Exports the primary `run_resume_analysis` function and result types.
"""
from app.services.scoring.ats_checks import CheckResult
from app.services.scoring.engine import AnalysisResult, CategoryResult, run_resume_analysis
from app.services.scoring.recommendations import TopRecommendation

__all__ = [
    "run_resume_analysis",
    "AnalysisResult",
    "CategoryResult",
    "CheckResult",
    "TopRecommendation",
]

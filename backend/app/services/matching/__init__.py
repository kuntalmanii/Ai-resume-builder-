"""Matching service package."""
from app.services.matching.engine import run_job_match
from app.services.matching.config import MATCHING_VERSION

__all__ = ["run_job_match", "MATCHING_VERSION"]

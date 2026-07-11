"""Models package — import all models here so Alembic can detect them."""
from app.models.user import User
from app.models.profile import CareerProfile
from app.models.resume import Resume
from app.models.analysis import ResumeAnalysis

__all__ = ["User", "CareerProfile", "Resume", "ResumeAnalysis"]

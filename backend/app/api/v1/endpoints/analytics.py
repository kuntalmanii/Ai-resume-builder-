"""Career Analytics dashboard API endpoints."""

from fastapi import APIRouter

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.analytics import AnalyticsSummaryResponse
from app.services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/", response_model=AnalyticsSummaryResponse)
async def get_analytics_summary(
    current_user: CurrentUser, db: DBSession
) -> AnalyticsSummaryResponse:
    """Retrieve full analytics statistics for current user's job search."""
    return await analytics_service.get_summary(db, user_id=current_user.id)

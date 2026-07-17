"""LinkedIn Optimization API endpoints."""
import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.linkedin import LinkedInOptimizationResponse, LinkedInOptimizeRequest
from app.services.linkedin_service import linkedin_service

router = APIRouter(prefix="/linkedin", tags=["LinkedIn"])


@router.post("/optimize", response_model=LinkedInOptimizationResponse, status_code=status.HTTP_201_CREATED)
async def optimize_profile(
    payload: LinkedInOptimizeRequest, current_user: CurrentUser, db: DBSession
) -> LinkedInOptimizationResponse:
    """Submit profile details for keyword and SEO audit optimization suggestions."""
    result = await linkedin_service.optimize_profile(db, user_id=current_user.id, request=payload)
    await db.commit()
    return LinkedInOptimizationResponse.model_validate(result)


@router.get("", response_model=list[LinkedInOptimizationResponse])
async def list_optimizations(
    current_user: CurrentUser, db: DBSession
) -> list[LinkedInOptimizationResponse]:
    """List historical profile optimizations."""
    results = await linkedin_service.get_by_user_id(db, user_id=current_user.id)
    return [LinkedInOptimizationResponse.model_validate(r) for r in results]


@router.get("/{id}", response_model=LinkedInOptimizationResponse)
async def get_optimization(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> LinkedInOptimizationResponse:
    """Get single optimization details."""
    result = await linkedin_service.get_by_id(db, id, user_id=current_user.id)
    if not result:
        raise HTTPException(status_code=404, detail="Optimization record not found.")
    return LinkedInOptimizationResponse.model_validate(result)

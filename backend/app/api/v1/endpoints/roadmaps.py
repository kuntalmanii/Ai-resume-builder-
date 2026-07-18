"""Upskilling Roadmaps API endpoints."""

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.roadmap import RoadmapGenerateRequest, RoadmapProgressUpdate, RoadmapResponse
from app.services.roadmap_service import roadmap_service

router = APIRouter(prefix="/roadmaps", tags=["Roadmaps"])


@router.post("/generate", response_model=RoadmapResponse, status_code=status.HTTP_201_CREATED)
async def generate_upskilling_roadmap(
    payload: RoadmapGenerateRequest, current_user: CurrentUser, db: DBSession
) -> RoadmapResponse:
    """Generate career path roadmap from current profile skills."""
    roadmap = await roadmap_service.generate_roadmap(db, user_id=current_user.id, request=payload)
    await db.commit()
    return RoadmapResponse.model_validate(roadmap)


@router.get("", response_model=list[RoadmapResponse])
async def list_roadmaps(current_user: CurrentUser, db: DBSession) -> list[RoadmapResponse]:
    """List historical roadmaps."""
    roadmaps = await roadmap_service.get_by_user_id(db, user_id=current_user.id)
    return [RoadmapResponse.model_validate(r) for r in roadmaps]


@router.get("/{id}", response_model=RoadmapResponse)
async def get_roadmap(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> RoadmapResponse:
    """Get roadmap details."""
    roadmap = await roadmap_service.get_by_id(db, id, user_id=current_user.id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    return RoadmapResponse.model_validate(roadmap)


@router.patch("/{id}/progress", response_model=RoadmapResponse)
async def update_milestone_progress(
    id: uuid.UUID, payload: RoadmapProgressUpdate, current_user: CurrentUser, db: DBSession
) -> RoadmapResponse:
    """Update progress completion flag on roadmap milestone."""
    roadmap = await roadmap_service.update_progress(
        db, user_id=current_user.id, id=id, update=payload
    )
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    await db.commit()
    return RoadmapResponse.model_validate(roadmap)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_roadmap(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> None:
    """Delete a roadmap."""
    success = await roadmap_service.remove(db, id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Roadmap not found.")
    await db.commit()

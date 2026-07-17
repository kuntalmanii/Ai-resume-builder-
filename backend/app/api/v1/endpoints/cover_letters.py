"""Cover Letter API endpoints."""
import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.cover_letter import (
    CoverLetterCreate,
    CoverLetterGenerateRequest,
    CoverLetterResponse,
    CoverLetterUpdate,
)
from app.services.cover_letter_service import cover_letter_service

router = APIRouter(prefix="/cover-letters", tags=["Cover Letters"])


@router.post("/generate")
async def generate_cover_letter(
    payload: CoverLetterGenerateRequest, current_user: CurrentUser, db: DBSession
) -> dict:
    """Generate a cover letter draft grounded on Resume and target JD."""
    content, metadata = await cover_letter_service.generate_cover_letter(
        db, user_id=current_user.id, request=payload
    )
    return {"content": content, "metadata": metadata}


@router.post("", response_model=CoverLetterResponse, status_code=status.HTTP_201_CREATED)
async def create_cover_letter(
    payload: CoverLetterCreate, current_user: CurrentUser, db: DBSession
) -> CoverLetterResponse:
    """Save a cover letter draft."""
    cl = await cover_letter_service.create(db, user_id=current_user.id, obj_in=payload)
    await db.commit()
    return CoverLetterResponse.model_validate(cl)


@router.get("", response_model=list[CoverLetterResponse])
async def list_cover_letters(
    current_user: CurrentUser, db: DBSession
) -> list[CoverLetterResponse]:
    """List cover letters of current user."""
    cls = await cover_letter_service.get_by_user_id(db, user_id=current_user.id)
    return [CoverLetterResponse.model_validate(c) for c in cls]


@router.get("/{id}", response_model=CoverLetterResponse)
async def get_cover_letter(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> CoverLetterResponse:
    """Get single cover letter details."""
    cl = await cover_letter_service.get_by_id(db, id, user_id=current_user.id)
    if not cl:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    return CoverLetterResponse.model_validate(cl)


@router.put("/{id}", response_model=CoverLetterResponse)
async def update_cover_letter(
    id: uuid.UUID, payload: CoverLetterUpdate, current_user: CurrentUser, db: DBSession
) -> CoverLetterResponse:
    """Update cover letter body or title."""
    cl = await cover_letter_service.get_by_id(db, id, user_id=current_user.id)
    if not cl:
        raise HTTPException(status_code=404, detail="Cover letter not found.")

    updated = await cover_letter_service.update(
        db, id=id, user_id=current_user.id, content=payload.content, title=payload.title
    )
    await db.commit()
    await db.refresh(updated)
    return CoverLetterResponse.model_validate(updated)


@router.post("/{id}/versions", response_model=CoverLetterResponse, status_code=status.HTTP_201_CREATED)
async def increment_version(
    id: uuid.UUID, payload: CoverLetterUpdate, current_user: CurrentUser, db: DBSession
) -> CoverLetterResponse:
    """Create a new version increment of a cover letter."""
    new_ver = await cover_letter_service.create_new_version(
        db, root_id=id, user_id=current_user.id, content=payload.content, title=payload.title
    )
    await db.commit()
    await db.refresh(new_ver)
    return CoverLetterResponse.model_validate(new_ver)


@router.get("/{id}/versions", response_model=list[CoverLetterResponse])
async def list_versions(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> list[CoverLetterResponse]:
    """Get complete version history of a cover letter."""
    history = await cover_letter_service.get_versions(db, id, user_id=current_user.id)
    return [CoverLetterResponse.model_validate(v) for v in history]


@router.post("/{id}/export")
async def export_pdf(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> dict:
    """Export cover letter as PDF."""
    path = await cover_letter_service.export_pdf(db, id=id, user_id=current_user.id)
    await db.commit()
    return {"export_path": path}


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cover_letter(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> None:
    """Delete a cover letter."""
    success = await cover_letter_service.remove(db, id=id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Cover letter not found.")
    await db.commit()

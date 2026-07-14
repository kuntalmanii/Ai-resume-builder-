"""FastAPI endpoints for Resume Import Sessions."""
import uuid
from typing import Annotated
from fastapi import APIRouter, UploadFile, File, status, Response

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.resume_import import (
    ResumeImportSessionResponse,
    ResumeImportUpdate,
    ResumeImportFinalize,
)
from app.schemas.resume import ResumeResponse
from app.services.parser import import_service

router = APIRouter(prefix="/resume-imports", tags=["Resume Imports"])


@router.post("", response_model=ResumeImportSessionResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...)
):
    """Upload resume document (PDF/DOCX), validate it, extract text, parse structures, and return session."""
    session = await import_service.create_import_session(db, current_user.id, file)
    return session


@router.get("/{import_id}", response_model=ResumeImportSessionResponse)
async def get_import_session(
    import_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """Retrieve details of an owned import session."""
    session = await import_service.get_import_session(db, current_user.id, import_id)
    return session


@router.patch("/{import_id}/document", response_model=ResumeImportSessionResponse)
async def update_import_document(
    import_id: uuid.UUID,
    payload: ResumeImportUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """Update parsed resume document in import session during user review."""
    session = await import_service.update_import_document(
        db, current_user.id, import_id, payload.parsed_document.model_dump()
    )
    return session


@router.post("/{import_id}/finalize", response_model=ResumeResponse)
async def finalize_import(
    import_id: uuid.UUID,
    payload: ResumeImportFinalize,
    db: DBSession,
    current_user: CurrentUser,
):
    """Finalize import: create Resume, ResumeVersion, and optionally import career profile items."""
    resume = await import_service.finalize_import(
        db,
        current_user.id,
        import_id,
        payload.title or "",
        payload.template_id,
        payload.import_to_career_profile,
        payload.selected_entries
    )
    return resume


@router.delete("/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_import_session(
    import_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """Cancel and delete owned import session."""
    await import_service.delete_import_session(db, current_user.id, import_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

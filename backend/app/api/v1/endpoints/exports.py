import os
import uuid

from fastapi import APIRouter, status
from fastapi.responses import FileResponse
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentUser, DBSession
from app.core.exceptions import ForbiddenError, ResourceNotFoundError
from app.db.models.resume import Resume
from app.db.models.resume_export import ResumeExport
from app.schemas.export import ExportCreateRequest, ResumeExportResponse
from app.schemas.resume import ResumeDocument
from app.services.renderer.engine import ResumeRenderer
from app.services.renderer.pdf_generator import PlaywrightPDFGenerator
from app.services.storage.local import LocalStorage

router = APIRouter(tags=["Exports"])


@router.post(
    "/resumes/{resume_id}/exports",
    response_model=ResumeExportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_resume_export(
    resume_id: uuid.UUID, payload: ExportCreateRequest, current_user: CurrentUser, db: DBSession
) -> ResumeExportResponse:
    """Create a new resume PDF export snapshot or retrieve a cached version if settings match."""
    # Verify resume exists and user owns it
    stmt = select(Resume).where(Resume.id == resume_id)
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()

    if not resume:
        raise ResourceNotFoundError("Resume not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this resume")

    settings_dict = payload.settings.model_dump() if payload.settings else {}

    # Generate the export (with caching unless force=True)
    export_snapshot = await PlaywrightPDFGenerator.generate_pdf(
        db=db,
        resume_id=resume_id,
        template_id=payload.template_id,
        settings=settings_dict,
        force=payload.force or False,
    )

    await db.commit()
    return ResumeExportResponse.model_validate(export_snapshot)


@router.post("/resumes/{resume_id}/exports/preview", response_model=dict)
async def preview_resume_layout(
    resume_id: uuid.UUID, payload: ExportCreateRequest, current_user: CurrentUser, db: DBSession
) -> dict:
    """Preview the compiled RenderTree JSON structure based on styling settings."""
    stmt = select(Resume).where(Resume.id == resume_id)
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()

    if not resume:
        raise ResourceNotFoundError("Resume not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this resume")

    settings_dict = payload.settings.model_dump() if payload.settings else {}
    doc = ResumeDocument.model_validate(resume.content)

    renderer = ResumeRenderer(doc, payload.template_id, settings_dict)
    tree = renderer.build_render_tree()

    return tree.model_dump()


@router.get("/resumes/{resume_id}/exports", response_model=list[ResumeExportResponse])
async def list_resume_exports(
    resume_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> list[ResumeExportResponse]:
    """List all generated PDF export snapshots for a specific resume."""
    # Verify resume ownership
    stmt = select(Resume).where(Resume.id == resume_id)
    res = await db.execute(stmt)
    resume = res.scalar_one_or_none()

    if not resume:
        raise ResourceNotFoundError("Resume not found")
    if resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this resume")

    # Get exports
    export_stmt = (
        select(ResumeExport)
        .where(ResumeExport.resume_id == resume_id)
        .order_by(desc(ResumeExport.created_at))
    )
    exports_res = await db.execute(export_stmt)
    exports = exports_res.scalars().all()

    return [ResumeExportResponse.model_validate(exp) for exp in exports]


@router.get("/exports/{export_id}", response_model=ResumeExportResponse)
async def get_export_details(
    export_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeExportResponse:
    """Retrieve details of a specific PDF export snapshot."""
    stmt = (
        select(ResumeExport)
        .options(selectinload(ResumeExport.resume))
        .where(ResumeExport.id == export_id)
    )
    res = await db.execute(stmt)
    export_snapshot = res.scalar_one_or_none()

    if not export_snapshot:
        raise ResourceNotFoundError("Export not found")
    if export_snapshot.resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this export")

    return ResumeExportResponse.model_validate(export_snapshot)


@router.get("/exports/{export_id}/download")
async def download_export_pdf(
    export_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> FileResponse:
    """Download the raw PDF binary of a specific export snapshot."""
    stmt = (
        select(ResumeExport)
        .options(selectinload(ResumeExport.resume))
        .where(ResumeExport.id == export_id)
    )
    res = await db.execute(stmt)
    export_snapshot = res.scalar_one_or_none()

    if not export_snapshot:
        raise ResourceNotFoundError("Export not found")
    if export_snapshot.resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this export")

    # Secure path traversal check (ensure it is located inside local directory)
    if not export_snapshot.storage_path or not export_snapshot.storage_path.startswith(
        os.path.abspath("uploads/exports")
    ):
        raise ForbiddenError("Invalid file path path traversal detected")

    title_slug = export_snapshot.resume.title.replace(" ", "_")
    version = export_snapshot.resume_version
    filename = f"Resume_{title_slug}_v{version}.pdf"

    return FileResponse(
        path=export_snapshot.storage_path, media_type="application/pdf", filename=filename
    )


@router.delete("/exports/{export_id}")
async def delete_export(export_id: uuid.UUID, current_user: CurrentUser, db: DBSession):
    """Delete a specific resume export snapshot and its stored PDF file."""
    stmt = (
        select(ResumeExport)
        .options(selectinload(ResumeExport.resume))
        .where(ResumeExport.id == export_id)
    )
    res = await db.execute(stmt)
    export_snapshot = res.scalar_one_or_none()

    if not export_snapshot:
        raise ResourceNotFoundError("Export not found")
    if export_snapshot.resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this export")

    # Delete local file
    storage = LocalStorage()
    await storage.delete(export_snapshot.storage_path)

    # Delete DB record
    await db.delete(export_snapshot)
    await db.commit()

    return {"detail": "Export snapshot deleted successfully"}


@router.post("/exports/{export_id}/regenerate", response_model=ResumeExportResponse)
async def regenerate_export(
    export_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeExportResponse:
    """Force regenerate a specific export snapshot using original template and settings."""
    stmt = (
        select(ResumeExport)
        .options(selectinload(ResumeExport.resume))
        .where(ResumeExport.id == export_id)
    )
    res = await db.execute(stmt)
    export_snapshot = res.scalar_one_or_none()

    if not export_snapshot:
        raise ResourceNotFoundError("Export not found")
    if export_snapshot.resume.user_id != current_user.id:
        raise ForbiddenError("You do not have access to this export")

    # Re-run generator forcing regeneration
    new_snapshot = await PlaywrightPDFGenerator.generate_pdf(
        db=db,
        resume_id=export_snapshot.resume_id,
        template_id=export_snapshot.template_id,
        settings=export_snapshot.settings,
        force=True,
    )

    await db.commit()
    return ResumeExportResponse.model_validate(new_snapshot)

"""Resumes router: CRUD, metadata updates, content updates with optimistic concurrency, duplicating, and versioning."""
import uuid
from typing import Annotated
from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.resume import (
    ResumeCreate,
    ResumeUpdate,
    ResumeResponse,
    ResumeVersionResponse,
    ResumeDocument,
)
from app.schemas.evidence import EvidenceMapResponse
from app.services import resume_service
from app.services.evidence.claim_extractor import ClaimExtractorService
from app.services.evidence.credibility_engine import CredibilityEngineService

router = APIRouter(prefix="/resumes", tags=["Resumes"])


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def create_resume(
    payload: ResumeCreate, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """Create a new resume. Automatically sets primary status if first resume."""
    resume = await resume_service.create_resume(db, current_user.id, payload)
    return ResumeResponse.model_validate(resume)


@router.get("", response_model=list[ResumeResponse])
async def list_resumes(
    current_user: CurrentUser,
    db: DBSession,
    page: Annotated[int, Query(ge=1, description="Page number")] = 1,
    page_size: Annotated[int, Query(ge=1, le=100, description="Items per page")] = 20,
    search: Annotated[str | None, Query(description="Search filter by title")] = None,
    status: Annotated[str | None, Query(description="Status filter")] = None,
    sort_by: Annotated[str | None, Query(description="Field to sort by")] = "updated_at",
    sort_order: Annotated[str | None, Query(description="Sort order (asc/desc)")] = "desc",
) -> list[ResumeResponse]:
    """Retrieve all resumes belonging to the authenticated user, supporting search, filters, sorting, and pagination."""
    limit = page_size
    offset = (page - 1) * page_size
    resumes = await resume_service.get_resumes(
        db,
        current_user.id,
        search=search,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
    return [ResumeResponse.model_validate(r) for r in resumes]


@router.get("/{id}", response_model=ResumeResponse)
async def get_resume(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """Retrieve a specific resume, enforcing user ownership.

    Returns 404 on ownership failure for security.
    """
    resume = await resume_service.get_resume(db, id, current_user.id)
    return ResumeResponse.model_validate(resume)


@router.patch("/{id}", response_model=ResumeResponse)
async def patch_resume_metadata(
    id: uuid.UUID,
    payload: ResumeUpdate,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeResponse:
    """Update resume metadata like title, template_id, or status."""
    # Ensure content field is NOT modified in metadata PATCH
    payload.content = None
    resume = await resume_service.update_resume(
        db, id, current_user.id, payload
    )
    return ResumeResponse.model_validate(resume)


@router.put("/{id}/content", response_model=ResumeResponse)
async def update_resume_content(
    id: uuid.UUID,
    payload: ResumeDocument,
    current_user: CurrentUser,
    db: DBSession,
    expected_version: Annotated[int | None, Query(description="Expected concurrency version number")] = None,
    change_reason: Annotated[str | None, Query(description="Reason for version snapshot creation")] = None,
) -> ResumeResponse:
    """Update validated resume content. Checks expected_version for optimistic concurrency control."""
    update_payload = ResumeUpdate(content=payload)
    resume = await resume_service.update_resume(
        db,
        id,
        current_user.id,
        update_payload,
        change_reason=change_reason,
        expected_version=expected_version,
    )
    return ResumeResponse.model_validate(resume)


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> None:
    """Delete a specific resume, cascade-deleting historical versions and analyses."""
    await resume_service.delete_resume(db, id, current_user.id)


@router.post("/{id}/duplicate", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def duplicate_resume(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """Deep-copies content of an existing resume to a new duplicate entry."""
    resume = await resume_service.duplicate_resume(db, id, current_user.id)
    return ResumeResponse.model_validate(resume)


@router.post("/{id}/primary", response_model=ResumeResponse)
async def set_primary_resume(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """Mark a resume as primary, resetting any prior primary flags."""
    resume = await resume_service.set_primary_resume(db, id, current_user.id)
    return ResumeResponse.model_validate(resume)


@router.get("/{id}/versions", response_model=list[ResumeVersionResponse])
async def list_versions(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> list[ResumeVersionResponse]:
    """Retrieve historical version nodes for a specific resume."""
    versions = await resume_service.get_versions(db, id, current_user.id)
    return [ResumeVersionResponse.model_validate(v) for v in versions]


@router.get("/{id}/versions/{version_number}", response_model=ResumeVersionResponse)
async def get_version(
    id: uuid.UUID, version_number: int, current_user: CurrentUser, db: DBSession
) -> ResumeVersionResponse:
    """Retrieve details of a specific historical version snapshot."""
    version = await resume_service.get_version(db, id, version_number, current_user.id)
    return ResumeVersionResponse.model_validate(version)


@router.post("/{id}/versions", response_model=ResumeVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_version(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    change_reason: Annotated[str | None, Query(description="Reason for snapshot")] = None,
) -> ResumeVersionResponse:
    """Manually trigger a version snapshot of the current active resume state."""
    version = await resume_service.create_manual_version(db, id, current_user.id, change_reason)
    return ResumeVersionResponse.model_validate(version)


@router.post("/{id}/versions/{version_number}/restore", response_model=ResumeResponse)
async def restore_version(
    id: uuid.UUID, version_number: int, current_user: CurrentUser, db: DBSession
) -> ResumeResponse:
    """Restore resume content to a historical snapshot. Current content is saved as a new node."""
    resume = await resume_service.restore_version(db, id, version_number, current_user.id)
    return ResumeResponse.model_validate(resume)


@router.post("/{id}/audit", response_model=EvidenceMapResponse)
async def audit_resume_claims(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> EvidenceMapResponse:
    """Extracts atomic claims from the resume and computes the credibility map."""
    # 1. Extract claims
    await ClaimExtractorService.extract_claims_for_resume(db, id, current_user.id)
    # 2. Verify claims & compute score
    claims, score = await CredibilityEngineService.compute_evidence_map(db, id, current_user.id)
    
    return EvidenceMapResponse(claims=claims, evidence_credibility_score=score)


@router.get("/{id}/claims", response_model=EvidenceMapResponse)
async def get_resume_claims(
    id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> EvidenceMapResponse:
    """Retrieves the pre-computed credibility map of resume claims."""
    claims, score = await CredibilityEngineService.compute_evidence_map(db, id, current_user.id)
    return EvidenceMapResponse(claims=claims, evidence_credibility_score=score)

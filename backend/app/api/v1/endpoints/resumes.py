"""Resumes router: CRUD, metadata updates, content updates with optimistic concurrency,
duplicating, and versioning."""

import uuid
from typing import Annotated, Any

from fastapi import APIRouter, Query, status
from sqlalchemy import desc, select
from sqlalchemy.orm import selectinload

from app.api.dependencies import CurrentUser, DBSession
from app.core.exceptions import ResourceNotFoundError
from app.db.models.career_entry import CareerEntry
from app.db.models.evidence_audit import EvidenceAudit
from app.db.models.evidence_source import EvidenceSource
from app.db.models.resume import Resume
from app.db.models.resume_claim import ResumeClaim
from app.schemas.evidence import (
    CareerEntryLinkRequest,
    ClaimConfirmationRequest,
    EvidenceAuditSchema,
    EvidenceMapResponse,
    ResumeClaimSchema,
)
from app.schemas.resume import (
    ResumeCreate,
    ResumeDocument,
    ResumeResponse,
    ResumeUpdate,
    ResumeVersionResponse,
)
from app.schemas.tailor import ResumeTailorRequest, ResumeTailorResponse
from app.services import resume_service
from app.services.ai.tailor_service import TailorService
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
    """Retrieve all resumes belonging to the authenticated user, supporting search,
    filters, sorting, and pagination."""
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
async def get_resume(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> ResumeResponse:
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
    resume = await resume_service.update_resume(db, id, current_user.id, payload)
    return ResumeResponse.model_validate(resume)


@router.put("/{id}/content", response_model=ResumeResponse)
async def update_resume_content(
    id: uuid.UUID,
    payload: ResumeDocument,
    current_user: CurrentUser,
    db: DBSession,
    expected_version: Annotated[
        int | None, Query(description="Expected concurrency version number")
    ] = None,
    change_reason: Annotated[
        str | None, Query(description="Reason for version snapshot creation")
    ] = None,
) -> ResumeResponse:
    """Update validated resume content. Checks expected_version for optimistic
    concurrency control."""
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


@router.post(
    "/{id}/versions", response_model=ResumeVersionResponse, status_code=status.HTTP_201_CREATED
)
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
    """Extracts atomic claims from the resume and computes the credibility map (Legacy
    Compatibility)."""
    claims, ai_fallback = await ClaimExtractorService.extract_claims_for_resume(
        db, id, current_user.id
    )
    claims, audit = await CredibilityEngineService.compute_evidence_map(
        db, id, current_user.id, ai_fallback_active=ai_fallback
    )
    validated = [ResumeClaimSchema.model_validate(c) for c in claims]
    return EvidenceMapResponse(
        claims=validated,
        evidence_credibility_score=audit.overall_score,
        ai_fallback_active=audit.ai_fallback_active,
    )


@router.post("/{resume_id}/evidence-audits", response_model=EvidenceAuditSchema)
async def run_evidence_audit(
    resume_id: uuid.UUID, current_user: CurrentUser, db: DBSession, force: bool = Query(False)
) -> EvidenceAuditSchema:
    """Run evidence claims audit on a resume and returns the audit run details."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    claims, ai_fallback = await ClaimExtractorService.extract_claims_for_resume(
        db, resume_id, current_user.id
    )
    claims, audit = await CredibilityEngineService.compute_evidence_map(
        db, resume_id, current_user.id, force=force, ai_fallback_active=ai_fallback
    )
    return EvidenceAuditSchema.model_validate(audit)


@router.get("/{resume_id}/evidence-audits/latest", response_model=EvidenceAuditSchema)
async def get_latest_evidence_audit(
    resume_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> EvidenceAuditSchema:
    """Retrieve the latest completed evidence audit for the resume."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    latest_audit = await db.scalar(
        select(EvidenceAudit)
        .where(EvidenceAudit.resume_id == resume_id)
        .order_by(desc(EvidenceAudit.created_at), desc(EvidenceAudit.id))
        .limit(1)
    )
    if not latest_audit:
        raise ResourceNotFoundError("No audits found for this resume")

    return EvidenceAuditSchema.model_validate(latest_audit)


@router.get("/{resume_id}/evidence-audits", response_model=list[EvidenceAuditSchema])
async def get_evidence_audit_history(
    resume_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> list[EvidenceAuditSchema]:
    """Retrieve audit history for the resume."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    audits = await db.scalars(
        select(EvidenceAudit)
        .where(EvidenceAudit.resume_id == resume_id)
        .order_by(desc(EvidenceAudit.created_at), desc(EvidenceAudit.id))
    )
    return [EvidenceAuditSchema.model_validate(a) for a in audits]


@router.get("/{resume_id}/evidence-audits/{audit_id}", response_model=EvidenceAuditSchema)
async def get_evidence_audit_by_id(
    resume_id: uuid.UUID, audit_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> EvidenceAuditSchema:
    """Retrieve a specific historical audit run by ID."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    audit = await db.get(EvidenceAudit, audit_id)
    if not audit or audit.resume_id != resume_id:
        raise ResourceNotFoundError("Audit not found")

    return EvidenceAuditSchema.model_validate(audit)


@router.get("/{id}/claims", response_model=EvidenceMapResponse)
async def get_resume_claims(
    id: uuid.UUID,
    current_user: CurrentUser,
    db: DBSession,
    audit_id: uuid.UUID | None = None,
    section: str | None = None,
    claim_type: str | None = None,
    support_status: str | None = None,
    risk_level: str | None = None,
) -> EvidenceMapResponse:
    """Retrieves the pre-computed credibility map of resume claims with filtering."""
    resume = await db.get(Resume, id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    claims, audit = await CredibilityEngineService.compute_evidence_map(db, id, current_user.id)
    score = audit.overall_score
    ai_fallback = audit.ai_fallback_active

    filtered_claims = []
    for c in claims:
        if section and c.source_section != section:
            continue
        if claim_type and c.claim_type != claim_type:
            continue
        if support_status and c.verification_status != support_status:
            continue
        if risk_level:
            from app.services.evidence.credibility_engine import RISK_WEIGHTS

            claim_risk_val = RISK_WEIGHTS.get(c.claim_type, 1)
            mapped_risk = "low"
            if claim_risk_val == 2:
                mapped_risk = "medium"
            elif claim_risk_val == 3:
                mapped_risk = "high"
            if mapped_risk != risk_level:
                continue
        filtered_claims.append(c)

    return EvidenceMapResponse(
        claims=filtered_claims, evidence_credibility_score=score, ai_fallback_active=ai_fallback
    )


@router.get("/{resume_id}/claims/{claim_id}", response_model=ResumeClaimSchema)
async def get_claim_detail(
    resume_id: uuid.UUID, claim_id: uuid.UUID, current_user: CurrentUser, db: DBSession
) -> ResumeClaimSchema:
    """Retrieve detailed information about a specific claim."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    claim = await db.scalar(
        select(ResumeClaim)
        .options(selectinload(ResumeClaim.evidence_sources))
        .where(ResumeClaim.id == claim_id, ResumeClaim.resume_id == resume_id)
    )
    if not claim:
        raise ResourceNotFoundError("Claim not found")

    return ResumeClaimSchema.model_validate(claim)


@router.post("/{resume_id}/claims/{claim_id}/confirm", response_model=ResumeClaimSchema)
async def confirm_resume_claim(
    resume_id: uuid.UUID,
    claim_id: uuid.UUID,
    payload: ClaimConfirmationRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeClaimSchema:
    """Allow the user to confirm a claim, updating verification status."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    claim = await db.scalar(
        select(ResumeClaim)
        .options(selectinload(ResumeClaim.evidence_sources))
        .where(ResumeClaim.id == claim_id, ResumeClaim.resume_id == resume_id)
    )
    if not claim:
        raise ResourceNotFoundError("Claim not found")

    claim.verification_status = "user_confirmed"
    if payload.note:
        claim.contradiction_details = f"User Note: {payload.note}"
    else:
        claim.contradiction_details = None

    for ev in list(claim.evidence_sources):
        if ev.source_type == "career_profile_user_confirmed":
            await db.delete(ev)

    evidence = EvidenceSource(
        resume_claim_id=claim.id,
        label=f"User confirmed: {payload.note or 'Verified by user'}",
        source_type="career_profile_user_confirmed",
        support_kind="factual_support",
        evidence_strength="direct",
        verification_status="user_confirmed",
    )
    db.add(evidence)
    await db.commit()
    await db.refresh(claim)

    return ResumeClaimSchema.model_validate(claim)


@router.post("/{resume_id}/claims/{claim_id}/link-career-entry", response_model=ResumeClaimSchema)
async def link_career_entry_to_claim(
    resume_id: uuid.UUID,
    claim_id: uuid.UUID,
    payload: CareerEntryLinkRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeClaimSchema:
    """Link a claim to a relevant Smart Career Profile entry."""
    resume = await db.get(Resume, resume_id)
    if not resume or resume.user_id != current_user.id:
        raise ResourceNotFoundError("Resume not found")

    claim = await db.scalar(
        select(ResumeClaim)
        .options(selectinload(ResumeClaim.evidence_sources))
        .where(ResumeClaim.id == claim_id, ResumeClaim.resume_id == resume_id)
    )
    if not claim:
        raise ResourceNotFoundError("Claim not found")

    entry = await db.get(CareerEntry, payload.career_entry_id)
    if not entry or entry.user_id != current_user.id:
        raise ResourceNotFoundError("Career entry not found")

    is_relevant = False
    if entry.entry_type == "experience" and claim.claim_type in [
        "employer",
        "role",
        "responsibility",
        "date",
        "metric",
    ]:
        is_relevant = True
    elif entry.entry_type == "education" and claim.claim_type in ["education", "date"]:
        is_relevant = True
    elif entry.entry_type == "skill" and claim.claim_type in ["technology"]:
        is_relevant = True
    elif entry.entry_type in ["certification", "certifications"] and claim.claim_type in [
        "certification",
        "date",
    ]:
        is_relevant = True
    elif claim.claim_type == "responsibility":
        is_relevant = True

    if not is_relevant:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=400,
            detail=f"Clearly unrelated link: Career entry of type {entry.entry_type} "
            f"cannot support claim of type {claim.claim_type}",
        )

    evidence = EvidenceSource(
        resume_claim_id=claim.id,
        label=f"Linked to profile: {entry.organization or entry.title}",
        source_type="career_profile",
        source_id=str(entry.id),
        source_section=entry.entry_type,
        support_kind="factual_support",
        evidence_strength="direct"
        if entry.verification_status == "source_verified"
        else "corroborating",
        verification_status="source_verified"
        if entry.verification_status == "source_verified"
        else "user_confirmed",
    )
    db.add(evidence)
    claim.verification_status = (
        "source_verified"
        if entry.verification_status == "source_verified"
        else "career_profile_supported"
    )

    await db.commit()
    await db.refresh(claim)

    return ResumeClaimSchema.model_validate(claim)


@router.post("/{resume_id}/tailor", response_model=ResumeTailorResponse)
async def tailor_resume(
    resume_id: uuid.UUID,
    payload: ResumeTailorRequest,
    current_user: CurrentUser,
    db: DBSession,
) -> ResumeTailorResponse:
    """Tailor a candidate's resume using Google's X-Y-Z formula against a target JD."""
    service = TailorService(db)
    return await service.tailor_resume(current_user.id, resume_id, payload)


evidence_router = APIRouter(prefix="/evidence", tags=["Evidence Methodology"])


@evidence_router.get("/methodology")
async def get_evidence_methodology() -> dict[str, Any]:
    """Retrieve methodology scoring details, weights, and multipliers."""
    from app.services.evidence.credibility_engine import (
        CREDIBILITY_VERSION,
        RISK_WEIGHTS,
        SUPPORT_MULTIPLIERS,
    )

    return {
        "credibility_version": CREDIBILITY_VERSION,
        "scoring_dimensions": {
            "claim_support_coverage": {
                "max_score": 40,
                "description": "Percent of claims supported by "
                "Career Profile or User confirmations",
            },
            "internal_consistency": {
                "max_score": 20,
                "description": "Absence of contradictions in dates, roles, or metrics",
            },
            "career_profile_corroboration": {
                "max_score": 15,
                "description": "Ratio of claims that align directly with Smart Career Profile",
            },
            "high_risk_claim_support": {
                "max_score": 15,
                "description": "Factual verification of employers, "
                "roles, degrees, certs, and metrics",
            },
            "verification_transparency": {
                "max_score": 10,
                "description": "Percent of evidence backed by verified external sources",
            },
        },
        "support_multipliers": SUPPORT_MULTIPLIERS,
        "claim_risk_weights": RISK_WEIGHTS,
    }

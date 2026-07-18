"""Import service layer - orchestrates upload validation, text extraction, structured
parsing, and profile imports."""

import logging
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import UploadFile
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ResourceNotFoundError, ValidationError
from app.db.models.career_entry import CareerEntry
from app.db.models.resume import Resume
from app.db.models.resume_import_session import ResumeImportSession
from app.db.models.resume_version import ResumeVersion
from app.schemas.resume import ResumeDocument
from app.services.parser.docx_extractor import extract_docx_text
from app.services.parser.extraction_quality import check_extraction_quality
from app.services.parser.file_validator import validate_file_content, validate_file_metadata
from app.services.parser.pdf_extractor import extract_pdf_text
from app.services.parser.structured_parser import parse_resume_text

logger = logging.getLogger(__name__)


async def create_import_session(
    db: AsyncSession, user_id: uuid.UUID, file: UploadFile
) -> ResumeImportSession:
    """Validate, extract, check quality, parse, and save a temporary ResumeImportSession."""
    # 1. Validate file metadata (name length, extension, mime type, traversal)
    validate_file_metadata(file)

    # 2. Read bytes into memory
    file_bytes = await file.read()

    # 3. Validate content (size, empty, magic bytes, zip structure)
    filename = file.filename or "resume"
    validate_file_content(file_bytes, filename)

    # Determine document type
    ext = filename.split(".")[-1].lower()
    doc_type = "pdf" if ext == "pdf" else "docx"

    # 4. Text Extraction
    if doc_type == "pdf":
        extracted = extract_pdf_text(file_bytes)
    else:
        extracted = extract_docx_text(file_bytes)

    # 5. Extraction Quality Check
    quality = check_extraction_quality(extracted, doc_type)

    # Scanned PDF check
    if quality["status"] == "ocr_required":
        raise ValidationError(
            "This PDF appears to contain scanned images rather than selectable text. "
            "OCR support is not yet enabled. Please upload a text-based PDF or DOCX.",
            details="SCANNED_PDF_OCR_REQUIRED",
        )

    # 6. Structured Parsing
    raw_text = extracted.get("text", "")
    parsed_doc, parsing_warnings, confidence = await parse_resume_text(raw_text)

    # Include quality warnings
    all_warnings = parsing_warnings + quality["warnings"]

    # 7. Identify detected and missing sections
    # A section is detected if it has content (e.g. non-empty summary, or lists with elements)
    detected = ["personal_information"]  # Always parsed
    missing = []

    doc_dict = parsed_doc.model_dump()
    for section_key, val in doc_dict.items():
        if section_key in ["personal_information", "section_order"]:
            continue
        if val:  # If summary is non-empty string or list has elements
            detected.append(section_key)
        else:
            missing.append(section_key)

    # Save raw extracted text and quality state in extraction metadata (expires and is cleaned up)
    extraction_metadata = {
        "page_count": extracted.get("page_count"),
        "character_count": extracted.get("character_count"),
        "word_count": extracted.get("word_count"),
        "quality_status": quality["status"],
        "section_confidence": confidence,
        "text": raw_text,  # Kept in short-lived import session for raw_text population in finalize
    }

    expires_at = datetime.now(UTC) + timedelta(hours=24)

    session = ResumeImportSession(
        user_id=user_id,
        original_filename=filename,
        document_type=doc_type,
        status="review_ready",
        extraction_metadata=extraction_metadata,
        parsed_document=doc_dict,
        parsing_warnings=all_warnings,
        detected_sections=detected,
        missing_sections=missing,
        expires_at=expires_at,
    )

    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def get_import_session(
    db: AsyncSession, user_id: uuid.UUID, import_id: uuid.UUID
) -> ResumeImportSession:
    """Retrieve import session, enforcing user ownership."""
    stmt = select(ResumeImportSession).where(ResumeImportSession.id == import_id)
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()

    if not session or session.user_id != user_id:
        raise ResourceNotFoundError("Resume import session not found")

    return session


async def update_import_document(
    db: AsyncSession, user_id: uuid.UUID, import_id: uuid.UUID, updated_doc: dict[str, Any]
) -> ResumeImportSession:
    """Update parsed document draft in import session after review and validation."""
    session = await get_import_session(db, user_id, import_id)

    if session.status == "finalized":
        raise ValidationError(
            "Cannot update a finalized import session", details="SESSION_ALREADY_FINALIZED"
        )

    expires_at = (
        session.expires_at.replace(tzinfo=UTC)
        if session.expires_at.tzinfo is None
        else session.expires_at
    )
    if expires_at < datetime.now(UTC):
        session.status = "expired"
        db.add(session)
        await db.commit()
        raise ValidationError("This import session has expired", details="SESSION_EXPIRED")

    # Validate against schema
    try:
        validated = ResumeDocument.model_validate(updated_doc)
    except Exception as e:
        raise ValidationError(f"Invalid resume document schema: {str(e)}", details="INVALID_SCHEMA")

    session.parsed_document = validated.model_dump()
    session.status = "review_ready"
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def delete_import_session(db: AsyncSession, user_id: uuid.UUID, import_id: uuid.UUID) -> None:
    """Cancel/Delete import session."""
    session = await get_import_session(db, user_id, import_id)
    await db.delete(session)
    await db.commit()


# Helper deduplication logic
def _is_duplicate_edu(edu: dict[str, Any], existing: list[CareerEntry]) -> bool:
    for entry in existing:
        if entry.entry_type == "education":
            if (
                entry.organization.lower() == edu.get("institution", "").lower()
                and entry.title.lower() == edu.get("degree", "").lower()
                and entry.start_date == edu.get("start_date")
                and entry.end_date == edu.get("end_date")
            ):
                return True
    return False


def _is_duplicate_exp(exp: dict[str, Any], existing: list[CareerEntry]) -> bool:
    for entry in existing:
        if entry.entry_type in ["work_experience", "internship"]:
            if (
                entry.organization.lower() == exp.get("company", "").lower()
                and entry.title.lower() == exp.get("position", "").lower()
                and entry.start_date == exp.get("start_date")
                and entry.end_date == exp.get("end_date")
            ):
                return True
    return False


def _is_duplicate_proj(proj: dict[str, Any], existing: list[CareerEntry]) -> bool:
    for entry in existing:
        if entry.entry_type == "project":
            if entry.title.lower() == proj.get("name", "").lower():
                ext_url = entry.data.get("url") or ""
                proj_url = proj.get("url") or ""
                if (ext_url.lower() == proj_url.lower() and proj_url) or (
                    entry.start_date == proj.get("start_date")
                    and entry.end_date == proj.get("end_date")
                ):
                    return True
    return False


def _is_duplicate_cert(cert: dict[str, Any], existing: list[CareerEntry]) -> bool:
    for entry in existing:
        if entry.entry_type == "certification":
            ext_cred = entry.data.get("credential_id") or ""
            cert_cred = cert.get("credential_id") or ""
            if (
                entry.title.lower() == cert.get("name", "").lower()
                and entry.organization.lower() == cert.get("issuer", "").lower()
                and (ext_cred == cert_cred if cert_cred else True)
            ):
                return True
    return False


def _is_duplicate_skill(skill_name: str, existing: list[CareerEntry]) -> bool:
    for entry in existing:
        if entry.entry_type in ["technical_skill", "soft_skill"]:
            if entry.title.lower() == skill_name.lower():
                return True
    return False


async def finalize_import(
    db: AsyncSession,
    user_id: uuid.UUID,
    import_id: uuid.UUID,
    title: str,
    template_id: str,
    import_to_career_profile: bool,
    selected_entries: list[str] = None,
) -> Resume:
    """Finalize import: create Resume, ResumeVersion, and optionally import to Career
    Profile with deduplication."""
    session = await get_import_session(db, user_id, import_id)

    if session.status == "finalized":
        raise ValidationError("This import has already been finalized", details="ALREADY_FINALIZED")

    expires_at = (
        session.expires_at.replace(tzinfo=UTC)
        if session.expires_at.tzinfo is None
        else session.expires_at
    )
    if expires_at < datetime.now(UTC):
        session.status = "expired"
        db.add(session)
        await db.commit()
        raise ValidationError("This import session has expired", details="SESSION_EXPIRED")

    # Double check document validity
    try:
        doc = ResumeDocument.model_validate(session.parsed_document)
    except Exception as e:
        raise ValidationError(
            f"Invalid resume document in session: {str(e)}",
            details="INVALID_DOC_STATE",
        )

    # Create Resume in same transaction
    # Determine primary status
    existing_resumes = await db.execute(select(Resume).where(Resume.user_id == user_id))
    is_first = len(existing_resumes.scalars().all()) == 0

    # If first resume, it is primary. Otherwise draft is not primary.
    is_primary = is_first

    resume = Resume(
        user_id=user_id,
        title=title or f"Imported Resume - {session.original_filename}",
        template_id=template_id or "modern",
        content=doc.model_dump(),
        raw_text=session.extraction_metadata.get("text"),
        original_filename=session.original_filename,
        status="draft",
        is_primary=is_primary,
        source_type="uploaded_pdf" if session.document_type == "pdf" else "uploaded_docx",
        version=1,
        is_base=True,
    )
    db.add(resume)
    await db.flush()  # Generate resume.id

    # Create Version snapshot
    snapshot = ResumeVersion(
        resume_id=resume.id,
        version_number=1,
        content_snapshot=doc.model_dump(),
        change_reason="Initial import snapshot",
    )
    db.add(snapshot)

    # Handle Career Profile Import if requested
    if import_to_career_profile:
        # Load existing entries to run deduplication in-memory (1 query instead of N)
        existing_stmt = select(CareerEntry).where(CareerEntry.user_id == user_id)
        existing_res = await db.execute(existing_stmt)
        existing_list = list(existing_res.scalars().all())

        selected_keys = selected_entries or [
            "education",
            "experience",
            "projects",
            "skills",
            "certifications",
            "achievements",
            "positions_of_responsibility",
            "languages",
        ]

        # Import Education
        if "education" in selected_keys:
            for edu in doc.education:
                edu_dict = edu.model_dump()
                if not _is_duplicate_edu(edu_dict, existing_list):
                    entry = CareerEntry(
                        user_id=user_id,
                        entry_type="education",
                        title=edu.degree,
                        organization=edu.institution,
                        start_date=edu.start_date,
                        end_date=edu.end_date,
                        is_current=edu.is_current or False,
                        data={
                            "field_of_study": edu.field_of_study,
                            "location": edu.location,
                            "grade": edu.grade,
                            "description": edu.description,
                        },
                        verification_status="user_confirmed",
                        source_type="resume_import",
                    )
                    db.add(entry)
                    existing_list.append(entry)

        # Import Experience
        if "experience" in selected_keys:
            for exp in doc.experience:
                exp_dict = exp.model_dump()
                if not _is_duplicate_exp(exp_dict, existing_list):
                    entry = CareerEntry(
                        user_id=user_id,
                        entry_type="work_experience",
                        title=exp.position,
                        organization=exp.company,
                        start_date=exp.start_date,
                        end_date=exp.end_date,
                        is_current=exp.is_current or False,
                        data={
                            "location": exp.location,
                            "employment_type": exp.employment_type,
                            "bullets": exp.bullets,
                            "technologies": exp.technologies,
                        },
                        verification_status="user_confirmed",
                        source_type="resume_import",
                    )
                    db.add(entry)
                    existing_list.append(entry)

        # Import Projects
        if "projects" in selected_keys:
            for proj in doc.projects:
                proj_dict = proj.model_dump()
                if not _is_duplicate_proj(proj_dict, existing_list):
                    entry = CareerEntry(
                        user_id=user_id,
                        entry_type="project",
                        title=proj.name,
                        organization="",
                        start_date=proj.start_date,
                        end_date=proj.end_date,
                        is_current=False,
                        data={
                            "description": proj.description,
                            "url": proj.url,
                            "github_url": proj.github_url,
                            "bullets": proj.bullets,
                            "technologies": proj.technologies,
                        },
                        verification_status="user_confirmed",
                        source_type="resume_import",
                    )
                    db.add(entry)
                    existing_list.append(entry)

        # Import Skills
        if "skills" in selected_keys:
            for group in doc.skills:
                for skill_name in group.skills:
                    if not _is_duplicate_skill(skill_name, existing_list):
                        entry = CareerEntry(
                            user_id=user_id,
                            entry_type="technical_skill",
                            title=skill_name,
                            organization="",
                            data={"category": group.category},
                            verification_status="user_confirmed",
                            source_type="resume_import",
                        )
                        db.add(entry)
                        existing_list.append(entry)

        # Import Certifications
        if "certifications" in selected_keys:
            for cert in doc.certifications:
                cert_dict = cert.model_dump()
                if not _is_duplicate_cert(cert_dict, existing_list):
                    entry = CareerEntry(
                        user_id=user_id,
                        entry_type="certification",
                        title=cert.name,
                        organization=cert.issuer or "Unknown Issuer",
                        start_date=cert.issue_date,
                        end_date=cert.expiration_date,
                        is_current=False,
                        data={
                            "credential_id": cert.credential_id,
                            "credential_url": cert.credential_url,
                        },
                        verification_status="user_confirmed",
                        source_type="resume_import",
                    )
                    db.add(entry)
                    existing_list.append(entry)

        # Import Achievements
        if "achievements" in selected_keys:
            for ach in doc.achievements:
                entry = CareerEntry(
                    user_id=user_id,
                    entry_type="achievement",
                    title=ach.title,
                    organization="",
                    start_date=ach.date,
                    data={"description": ach.description},
                    verification_status="user_confirmed",
                    source_type="resume_import",
                )
                db.add(entry)

        # Import Positions of Responsibility
        if "positions_of_responsibility" in selected_keys:
            for pos in doc.positions_of_responsibility:
                entry = CareerEntry(
                    user_id=user_id,
                    entry_type="position_of_responsibility",
                    title=pos.position,
                    organization=pos.organization,
                    start_date=pos.start_date,
                    end_date=pos.end_date,
                    is_current=pos.is_current or False,
                    data={"bullets": pos.bullets},
                    verification_status="user_confirmed",
                    source_type="resume_import",
                )
                db.add(entry)

        # Import Languages
        if "languages" in selected_keys:
            for lang in doc.languages:
                entry = CareerEntry(
                    user_id=user_id,
                    entry_type="language",
                    title=lang.language,
                    organization="",
                    data={"proficiency": lang.proficiency},
                    verification_status="user_confirmed",
                    source_type="resume_import",
                )
                db.add(entry)

    # Finalize the session
    session.status = "finalized"
    db.add(session)

    await db.commit()
    await db.refresh(resume)
    return resume


async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """Delete expired import sessions from DB."""
    stmt = delete(ResumeImportSession).where(ResumeImportSession.expires_at < datetime.now(UTC))
    res = await db.execute(stmt)
    await db.commit()
    return res.rowcount

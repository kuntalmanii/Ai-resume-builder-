"""File validation utilities for secure resume upload."""

import io
import os
import re
import zipfile

from fastapi import UploadFile

from app.core.config import get_settings
from app.core.exceptions import FileTooLargeError, ValidationError

settings = get_settings()


def validate_filename(filename: str) -> str:
    """Validate filename safety: length, path traversal, whitelist characters."""
    if not filename:
        raise ValidationError("Filename is empty", details="FILENAME_EMPTY")

    # Check length
    if len(filename) > 255:
        raise ValidationError("Filename is too long", details="FILENAME_TOO_LONG")

    # Path traversal checks
    if "/" in filename or "\\" in filename or ".." in filename:
        raise ValidationError(
            "Filename contains path traversal characters", details="PATH_TRAVERSAL_ATTEMPT"
        )

    # Whitelist characters (alphanumeric, spaces, dots, dashes, underscores)
    if not re.match(r"^[\w\-. ]+$", filename):
        raise ValidationError(
            "Filename contains invalid or suspicious characters", details="SUSPICIOUS_FILENAME"
        )

    return filename


def validate_file_metadata(file: UploadFile) -> None:
    """Validate declared extension and MIME type before reading stream."""
    filename = file.filename or ""
    validate_filename(filename)

    ext = os.path.splitext(filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise ValidationError(
            f"Unsupported file extension: {ext}. Only PDF and DOCX are allowed.",
            details="UNSUPPORTED_FILE_EXTENSION",
        )

    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise ValidationError(
            f"Unsupported MIME type: {file.content_type}.", details="UNSUPPORTED_MIME_TYPE"
        )


def validate_file_content(file_bytes: bytes, filename: str) -> None:
    """Verify size, empty state, magic bytes, and compressed structure in memory."""
    # Check empty file
    if not file_bytes or len(file_bytes) == 0:
        raise ValidationError("The uploaded file is empty.", details="EMPTY_FILE")

    # Check size
    if len(file_bytes) > settings.max_upload_size_bytes:
        raise FileTooLargeError(
            "The uploaded file exceeds the maximum allowed size.",
            max_size_mb=settings.MAX_UPLOAD_SIZE_MB,
        )

    ext = os.path.splitext(filename)[1].lower()

    # Magic bytes check
    if ext == ".pdf":
        if not file_bytes.startswith(b"%PDF"):
            raise ValidationError(
                "File signature mismatch: Not a valid PDF file.", details="INVALID_PDF_SIGNATURE"
            )
    elif ext == ".docx":
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise ValidationError(
                "File signature mismatch: Not a valid DOCX file.", details="INVALID_DOCX_SIGNATURE"
            )

        # Verify ZIP archive structure for docx payload
        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes)) as z:
                namelist = z.namelist()
                if "[Content_Types].xml" not in namelist:
                    raise ValidationError(
                        "Invalid DOCX structure: Missing [Content_Types].xml.",
                        details="INVALID_DOCX_STRUCTURE",
                    )
                if not any(name.startswith("word/") for name in namelist):
                    raise ValidationError(
                        "Invalid DOCX structure: Missing Word document content.",
                        details="INVALID_DOCX_STRUCTURE",
                    )
        except zipfile.BadZipFile:
            raise ValidationError("The uploaded DOCX file is corrupt.", details="CORRUPT_DOCX")

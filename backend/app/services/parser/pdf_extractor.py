"""PDF text extraction using PyMuPDF."""

import re

import fitz  # PyMuPDF

from app.core.exceptions import ValidationError


def extract_pdf_text(file_bytes: bytes) -> dict:
    """Extract plain text and basic metadata from PDF file bytes.

    Returns:
        dict: {
            "text": str,
            "page_count": int,
            "character_count": int,
            "word_count": int
        }
    """
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        raise ValidationError(
            "Could not open PDF file. It may be corrupt.",
            details=f"CORRUPT_PDF: {str(e)}",
        )
    page_count = len(doc)
    pages_text = []

    for page_num in range(page_count):
        try:
            page = doc.load_page(page_num)
            text = page.get_text("text") or ""
            # Clean null bytes
            text = text.replace("\x00", "")
            pages_text.append(text)
        except Exception as e:
            # Let's close and raise validation error if loading page fails
            doc.close()
            raise ValidationError(
                f"Error reading page {page_num + 1} from PDF.",
                details=f"CORRUPT_PDF_PAGE: {str(e)}",
            )

    doc.close()

    # Combine text
    combined = "\n".join(pages_text)

    # Normalize whitespace, keeping line structure and bullet points intact
    normalized_lines = []
    for line in combined.splitlines():
        # Strip trailing/leading spaces on the line
        cleaned_line = line.strip()
        # Collapse multiple spaces to single spaces
        cleaned_line = re.sub(r" +", " ", cleaned_line)
        if cleaned_line:
            normalized_lines.append(cleaned_line)

    normalized_text = "\n".join(normalized_lines)
    character_count = len(normalized_text)
    word_count = len(normalized_text.split())

    return {
        "text": normalized_text,
        "page_count": page_count,
        "character_count": character_count,
        "word_count": word_count,
    }

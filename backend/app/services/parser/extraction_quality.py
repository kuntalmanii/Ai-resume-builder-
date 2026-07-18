"""Text extraction quality checks."""


def check_extraction_quality(extracted: dict, document_type: str) -> dict:
    """Analyze the extracted text metadata to determine quality and warning flags.

    Quality statuses:
    - good: High probability of useful text.
    - partial: Moderate amount of text, but missing some contents.
    - poor: Extracted text is messy, highly symbolic, or very low volume.
    - ocr_required: Scanned PDF or images with no extractable text.
    - failed: Empty or unparseable.

    Returns:
        dict: {
            "status": str,
            "warnings": list[str]
        }
    """
    text = extracted.get("text", "").strip()
    page_count = extracted.get("page_count", 0)
    character_count = extracted.get("character_count", 0)
    word_count = extracted.get("word_count", 0)

    warnings = []

    # 1. Check for empty extraction
    if not text or character_count == 0:
        if document_type == "pdf" and page_count > 0:
            return {
                "status": "ocr_required",
                "warnings": [
                    "This PDF contains pages but no selectable " \
                        "text. It is likely a scanned document."
                ],
            }
        return {"status": "failed", "warnings": ["No text could be extracted from the document."]}

    # 2. Check for scanned/image-only PDF with tiny text
    # Standard pages contain at least 200-300 characters of metadata/footers even if mostly images.
    # If the text density is less than 60 characters per page, it's highly likely to be a
    # scanned PDF.
    if document_type == "pdf" and page_count > 0:
        char_density = character_count / page_count
        if char_density < 60:
            return {
                "status": "ocr_required",
                "warnings": [
                    "Low text volume detected. This PDF appears to " \
                        "contain scanned images rather than selectable text."
                ],
            }

    # 3. Check for low text volume (suspicious for resumes)
    if character_count < 200 or word_count < 30:
        warnings.append("Document has a very low character or word count.")
        return {"status": "poor", "warnings": warnings}

    # 4. Check for garbage characters (corruption / font embedding issues)
    # Count replacement characters (\ufffd)
    replacement_chars = text.count("\ufffd")
    if replacement_chars > 0:
        ratio = replacement_chars / character_count
        if ratio > 0.05:
            warnings.append(
                "High volume of replacement/invalid characters " \
                    "detected. Encoding might be corrupted."
            )
            return {"status": "poor", "warnings": warnings}

    # 5. Check for symbol-heavy text (e.g. non-alphanumeric, ignoring spaces and newlines)
    alnum_count = sum(1 for c in text if c.isalnum())
    if character_count > 0:
        alnum_ratio = alnum_count / character_count
        if alnum_ratio < 0.4:
            warnings.append(
                "The document text contains an unusually " \
                    "high ratio of symbols or formatting markup."
            )
            return {"status": "poor", "warnings": warnings}

    # 6. Check for duplicate repeating lines (typical for corrupted PDF stream extraction)
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    if len(lines) > 10:
        unique_lines = set(lines)
        dup_ratio = (len(lines) - len(unique_lines)) / len(lines)
        if dup_ratio > 0.6:
            warnings.append(
                "High amount of duplicated lines detected. " \
                    "The layout or PDF stream might be corrupted."
            )
            return {"status": "poor", "warnings": warnings}

    status = "good"
    if len(warnings) > 0:
        status = "partial"

    return {"status": status, "warnings": warnings}

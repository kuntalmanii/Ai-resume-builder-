"""Shared text extraction and analysis utilities for the scoring engine.

All functions are pure (no I/O) and deterministic.
They accept either a dict (raw JSONB) or a ResumeDocument Pydantic model.
"""
from __future__ import annotations

import re
import unicodedata
from datetime import datetime, date
from typing import Any

from app.services.scoring.config import (
    ACTION_VERBS,
    WEAK_PHRASES,
    METRIC_PATTERNS,
    DATE_FORMAT_PATTERNS,
)


# ─── Safe Field Accessors ─────────────────────────────────────────────────────

def _get(obj: Any, *keys: str, default: Any = None) -> Any:
    """Safely traverse nested dict or object attributes."""
    curr = obj
    for key in keys:
        if curr is None:
            return default
        if isinstance(curr, dict):
            curr = curr.get(key)
        else:
            curr = getattr(curr, key, None)
    return curr if curr is not None else default


def _get_list(obj: Any, key: str) -> list:
    val = _get(obj, key, default=[])
    return val if isinstance(val, list) else []


# ─── Content Extraction ───────────────────────────────────────────────────────

def collect_all_bullets(resume: Any) -> list[str]:
    """Extract every bullet point from experience, projects, and positions."""
    bullets: list[str] = []

    for exp in _get_list(resume, "experience"):
        for b in _get(exp, "bullets", default=[]) or []:
            if isinstance(b, str) and b.strip():
                bullets.append(b.strip())

    for proj in _get_list(resume, "projects"):
        for b in _get(proj, "bullets", default=[]) or []:
            if isinstance(b, str) and b.strip():
                bullets.append(b.strip())

    for pos in _get_list(resume, "positions_of_responsibility"):
        for b in _get(pos, "bullets", default=[]) or []:
            if isinstance(b, str) and b.strip():
                bullets.append(b.strip())

    return bullets


def collect_all_text(resume: Any) -> str:
    """Assemble all visible text from a resume into a single string."""
    parts: list[str] = []

    pi = _get(resume, "personal_information") or {}
    for field in ("full_name", "professional_title"):
        v = _get(pi, field)
        if v:
            parts.append(str(v))

    summary = _get(resume, "professional_summary")
    if summary:
        parts.append(str(summary))

    for exp in _get_list(resume, "experience"):
        for field in ("company", "position", "location"):
            v = _get(exp, field)
            if v:
                parts.append(str(v))
        for b in _get(exp, "bullets", default=[]) or []:
            if b:
                parts.append(str(b))

    for edu in _get_list(resume, "education"):
        for field in ("institution", "degree", "field_of_study", "description"):
            v = _get(edu, field)
            if v:
                parts.append(str(v))

    for proj in _get_list(resume, "projects"):
        v = _get(proj, "description")
        if v:
            parts.append(str(v))
        for b in _get(proj, "bullets", default=[]) or []:
            if b:
                parts.append(str(b))

    for sg in _get_list(resume, "skills"):
        for s in _get(sg, "skills", default=[]) or []:
            if s:
                parts.append(str(s))

    for cert in _get_list(resume, "certifications"):
        v = _get(cert, "name")
        if v:
            parts.append(str(v))

    for ach in _get_list(resume, "achievements"):
        for field in ("title", "description"):
            v = _get(ach, field)
            if v:
                parts.append(str(v))

    return " ".join(parts)


def collect_all_dates(resume: Any) -> list[tuple[str, str]]:
    """Collect (start_date, end_date) pairs from experience and education."""
    pairs: list[tuple[str, str]] = []

    for exp in _get_list(resume, "experience"):
        sd = _get(exp, "start_date") or ""
        ed = _get(exp, "end_date") or ""
        is_current = _get(exp, "is_current") or False
        if sd:
            pairs.append((str(sd), "Present" if is_current else str(ed)))

    for edu in _get_list(resume, "education"):
        sd = _get(edu, "start_date") or ""
        ed = _get(edu, "end_date") or ""
        is_current = _get(edu, "is_current") or False
        if sd:
            pairs.append((str(sd), "Present" if is_current else str(ed)))

    return pairs


# ─── Date Parsing ─────────────────────────────────────────────────────────────

_MONTH_ABBR = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
}

_MONTH_FULL = {
    "january": 1, "february": 2, "march": 3, "april": 4, "may": 5, "june": 6,
    "july": 7, "august": 8, "september": 9, "october": 10, "november": 11, "december": 12,
}


def parse_date(date_str: str | None) -> date | None:
    """Parse a resume date string into a Python date. Returns None if unparseable."""
    if not date_str:
        return None
    s = date_str.strip()
    if s.lower() in ("present", "current", "now", ""):
        return date.today()

    # YYYY-MM
    m = re.match(r"^(\d{4})-(\d{2})$", s)
    if m:
        return date(int(m.group(1)), int(m.group(2)), 1)

    # MM/YYYY
    m = re.match(r"^(\d{2})/(\d{4})$", s)
    if m:
        return date(int(m.group(2)), int(m.group(1)), 1)

    # YYYY
    m = re.match(r"^(\d{4})$", s)
    if m:
        return date(int(m.group(1)), 1, 1)

    # Mon YYYY or Month YYYY
    m = re.match(r"^([A-Za-z]+)\s+(\d{4})$", s)
    if m:
        mon_name = m.group(1).lower()
        year = int(m.group(2))
        month = _MONTH_ABBR.get(mon_name[:3]) or _MONTH_FULL.get(mon_name)
        if month:
            return date(year, month, 1)

    return None


def detect_date_format_type(date_str: str | None) -> str | None:
    """Return the category of date format used, or None if unrecognized."""
    if not date_str:
        return None
    s = date_str.strip()
    if s.lower() in ("present", "current", "now", ""):
        return "present"
    if re.match(r"^\d{4}-\d{2}$", s):
        return "yyyy-mm"
    if re.match(r"^\d{2}/\d{4}$", s):
        return "mm/yyyy"
    if re.match(r"^\d{4}$", s):
        return "yyyy"
    if re.match(r"^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}$", s):
        return "mon-abbr-yyyy"
    if re.match(r"^[A-Z][a-z]+ \d{4}$", s):
        return "month-yyyy"
    return "unknown"


# ─── Action Verb Detection ────────────────────────────────────────────────────

def starts_with_action_verb(text: str) -> bool:
    """Return True if the text starts with a known action verb (case-insensitive)."""
    if not text:
        return False
    first_word = re.split(r"[\s,;.]", text.strip())[0].lower().rstrip("sed")  # normalize past tense
    # Direct match
    if text.strip().split()[0].lower() in ACTION_VERBS:
        return True
    # Past-tense match: strip trailing 'd' or 'ed'
    first = text.strip().split()[0].lower()
    candidates = [first, first.rstrip("d"), first.rstrip("ed")]
    return any(c in ACTION_VERBS for c in candidates)


# ─── Weak Phrase Detection ────────────────────────────────────────────────────

def contains_weak_phrase(text: str) -> bool:
    """Return True if the text contains a known weak phrase."""
    t_lower = text.lower()
    return any(phrase in t_lower for phrase in WEAK_PHRASES)


# ─── Metric Detection ─────────────────────────────────────────────────────────

_COMPILED_METRIC_PATTERNS = [re.compile(p, re.IGNORECASE) for p in METRIC_PATTERNS]


def detect_metrics(text: str) -> list[str]:
    """Return list of metric snippets found in text. Empty list means no metrics."""
    found: list[str] = []
    for pat in _COMPILED_METRIC_PATTERNS:
        matches = pat.findall(text)
        found.extend(str(m) if not isinstance(m, tuple) else " ".join(m) for m in matches)
    return found


def has_any_metric(text: str) -> bool:
    return bool(detect_metrics(text))


# ─── Specificity Heuristics ───────────────────────────────────────────────────

# Technologies, frameworks, proper nouns, or scope terms add specificity
_SPECIFICITY_PATTERNS = [
    r"\b[A-Z][a-zA-Z]+(?:\.[a-zA-Z]+)+\b",    # dotted namespaces (e.g. React.js)
    r"\b[A-Z]{2,}\b",                           # acronyms (API, SQL, AWS)
    r"\b\w+(?:JS|\.js|\.py|\.ts|\.go)\b",      # file-extension indicators
    r"\b(using|with|via|through|leveraging|employing)\s+\w+",  # "using X" patterns
    r"\b\d+\s*(year|month|week|user|team|service|system|endpoint|component|module)\w*\b",
]

_COMPILED_SPECIFICITY = [re.compile(p) for p in _SPECIFICITY_PATTERNS]


def specificity_score(text: str) -> int:
    """Return a 0-5 specificity score for a bullet based on concrete details."""
    score = 0
    for pat in _COMPILED_SPECIFICITY:
        if pat.search(text):
            score += 1
    return min(score, 5)


# ─── Special Character Analysis ───────────────────────────────────────────────

def special_char_ratio(text: str) -> float:
    """Return ratio of problematic decoration characters to total characters."""
    if not text:
        return 0.0
    problematic = sum(1 for c in text if unicodedata.category(c) in ("So", "Sm") or c in "█▌▐▄▀■□●○◆◇★☆✓✗→←↑↓")
    return problematic / len(text)


# ─── Duplicate Detection ──────────────────────────────────────────────────────

def find_duplicate_bullets(bullets: list[str], similarity_threshold: float = 0.85) -> list[tuple[int, int]]:
    """
    Return pairs (i, j) of bullet indices that are near-duplicates.
    Uses simple token Jaccard similarity — deterministic, no ML.
    """
    duplicates: list[tuple[int, int]] = []
    tokenized = [set(re.findall(r"\w+", b.lower())) for b in bullets]
    for i in range(len(tokenized)):
        for j in range(i + 1, len(tokenized)):
            a, b = tokenized[i], tokenized[j]
            if not a or not b:
                continue
            intersection = len(a & b)
            union = len(a | b)
            if union > 0 and (intersection / union) >= similarity_threshold:
                duplicates.append((i, j))
    return duplicates


# ─── Word Count ───────────────────────────────────────────────────────────────

def word_count(text: str) -> int:
    return len(text.split()) if text else 0


def sentence_count(text: str) -> int:
    """Count sentences by splitting on terminal punctuation."""
    if not text:
        return 0
    return len(re.split(r"[.!?]+", text.strip().rstrip(".!?"))) if text.strip() else 0

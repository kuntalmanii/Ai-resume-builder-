"""Experience matching module for calculating unique calendar duration and evaluating
years of experience."""

import re
from datetime import datetime
from typing import Any


def parse_date(date_str: str | None, is_current: bool = False) -> datetime:
    """Parse dates in YYYY-MM or YYYY formats. Fallback to present if current or invalid."""
    if not date_str or str(date_str).lower() in ["present", "current", "now"]:
        return datetime.utcnow()

    date_str = str(date_str).strip()
    # Try YYYY-MM
    try:
        return datetime.strptime(date_str, "%Y-%m")
    except ValueError:
        pass

    # Try YYYY
    try:
        return datetime.strptime(date_str, "%Y")
    except ValueError:
        pass

    # Standard fallback
    if is_current:
        return datetime.utcnow()
    return datetime.utcnow()  # safe default


def calculate_unique_experience_years(experience_entries: list[dict[str, Any]]) -> float:
    """
    Merge overlapping experience intervals and calculate total non-overlapping duration in years.
    """
    intervals: list[tuple[datetime, datetime]] = []

    for exp in experience_entries:
        start_str = exp.get("start_date")
        end_str = exp.get("end_date")
        is_curr = exp.get("is_current", False)

        # If dates are missing, ignore this entry for duration
        if not start_str:
            continue

        start = parse_date(start_str)
        end = parse_date(end_str, is_current=is_curr)

        if start > end:
            start, end = end, start  # swap if reversed

        intervals.append((start, end))

    if not intervals:
        return 0.0

    # Sort intervals by start date
    intervals.sort(key=lambda x: x[0])

    # Merge overlapping intervals
    merged: list[tuple[datetime, datetime]] = [intervals[0]]
    for current in intervals[1:]:
        prev_start, prev_end = merged[-1]
        curr_start, curr_end = current

        if curr_start <= prev_end:
            # Overlap found, merge by updating end date
            merged[-1] = (prev_start, max(prev_end, curr_end))
        else:
            merged.append(current)

    # Calculate total years
    total_days = 0.0
    for start, end in merged:
        total_days += (end - start).days

    return round(total_days / 365.25, 1)


def run_experience_matching(
    experience_requirements: list[dict[str, Any]], experience_entries: list[dict[str, Any]]
) -> tuple[int, list[dict[str, Any]]]:
    """
    Evaluate experience requirements against resume history.
    Returns (experience_score, experience_gaps).
    """
    gaps: list[dict[str, Any]] = []
    total_years = calculate_unique_experience_years(experience_entries)

    # Max score for experience is 25 points
    score = 25

    for req in experience_requirements:
        # Extract years from requirement text if possible
        # e.g., "5+ years of experience"
        match = re.search(r"(\d+)\+?\s*year", req.get("text", ""), re.IGNORECASE)
        if match:
            required_years = int(match.group(1))
            if total_years < required_years:
                gap = required_years - total_years
                # Deduct points proportionally
                deduction = min(15, int((gap / required_years) * 25))
                score -= deduction
                gaps.append(
                    {
                        "requirement": req.get("text"),
                        "details": f"Your resume demonstrates {total_years} " \
                            f"years of unique calendar experience.",
                        "gapYears": round(gap, 1),
                    }
                )

    score = max(0, score)
    return score, gaps

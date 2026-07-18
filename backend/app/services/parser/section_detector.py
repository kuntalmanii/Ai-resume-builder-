"""Section detector and text segmenter."""

import re

SECTION_KEYWORDS = {
    "professional_summary": [
        "summary",
        "professional summary",
        "profile",
        "objective",
        "career objective",
        "about me",
        "summary statement",
        "about",
    ],
    "education": [
        "education",
        "academic background",
        "qualifications",
        "academic history",
        "academic credentials",
        "academic profile",
        "academic qualification",
        "academic qualifications",
    ],
    "experience": [
        "experience",
        "work experience",
        "professional experience",
        "employment history",
        "internships",
        "employment",
        "work history",
        "internship experience",
        "professional background",
        "career history",
    ],
    "projects": [
        "projects",
        "academic projects",
        "personal projects",
        "selected projects",
        "key projects",
        "technical projects",
        "project experience",
    ],
    "skills": [
        "skills",
        "technical skills",
        "core competencies",
        "technologies",
        "tools",
        "skills & technologies",
        "technical expertise",
        "skills and technologies",
        "key skills",
        "expertise",
        "technical proficiencies",
        "proficiencies",
    ],
    "certifications": [
        "certifications",
        "certificates",
        "licenses & certifications",
        "credentials",
        "licenses and certifications",
        "certifications & licenses",
        "licenses",
    ],
    "achievements": [
        "achievements",
        "awards",
        "honors",
        "accomplishments",
        "awards & honors",
        "awards and honors",
    ],
    "positions_of_responsibility": [
        "positions of responsibility",
        "leadership",
        "leadership experience",
        "extra-curricular activities",
        "extracurricular activities",
        "responsibility",
        "responsibilities",
        "leadership & activity",
        "activities",
        "extracurriculars",
    ],
    "languages": ["languages", "languages spoken", "language skills", "language"],
    "interests": [
        "interests",
        "hobbies",
        "interests & hobbies",
        "interests and hobbies",
        "personal interests",
    ],
}


def clean_heading_candidate(line: str) -> str:
    """Clean punctuation and symbols around heading line to normalize for comparison."""
    # Remove leading/trailing formatting characters like :, *, -, #, _, [, ], (, )
    cleaned = re.sub(r"^[\s:\*\-#_\[\]\(\)\-\u2022\u00b7]+", "", line)
    cleaned = re.sub(r"[\s:\*\-#_\[\]\(\)\-\u2022\u00b7]+$", "", cleaned)
    cleaned = cleaned.strip()
    # Collapse spaces
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned


def detect_section_heading(line: str) -> str | None:
    """Check if a line matches a section heading. Returns section key if matched."""
    cleaned_line = clean_heading_candidate(line)
    if not cleaned_line or len(cleaned_line) > 60:
        return None

    cleaned_lower = cleaned_line.lower()

    for sec_key, keywords in SECTION_KEYWORDS.items():
        if cleaned_lower in keywords:
            return sec_key

    return None


def segment_text_by_sections(text: str) -> dict[str, list[str]]:
    """Split plain text into line arrays grouped by detected section.

    Text before the first detected section heading goes into 'personal_information'.
    """
    segments = {
        "personal_information": [],
        "professional_summary": [],
        "education": [],
        "experience": [],
        "projects": [],
        "skills": [],
        "certifications": [],
        "achievements": [],
        "positions_of_responsibility": [],
        "languages": [],
        "interests": [],
    }

    current_section = "personal_information"
    lines = text.splitlines()

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        detected_sec = detect_section_heading(stripped)
        if detected_sec:
            current_section = detected_sec
            # Do not append the heading title itself to the section content
            continue

        segments[current_section].append(stripped)

    return segments

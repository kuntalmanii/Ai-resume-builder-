"""Templates configuration representing different style guidelines."""

TEMPLATES = {
    "modern": {
        "id": "modern",
        "name": "Modern ATS",
        "description": "Left-aligned layout with subtle accents, solid " \
            "horizontal dividers, and sans-serif typography.",
        "font_family": "sans",
        "accent_color": "modern",
        "header_align": "left",
        "divider_style": "solid",
        "section_spacing": "section_gap",
        "entry_spacing": "entry_gap",
        "bullets_format": "standard",
        "skills_format": "chips",
    },
    "minimal": {
        "id": "minimal",
        "name": "Minimal ATS",
        "description": "Clean, elegant layout with centered " \
            "header, serif body, and compact margins.",
        "font_family": "serif",
        "accent_color": "minimal",
        "header_align": "center",
        "divider_style": "none",
        "section_spacing": "md",
        "entry_spacing": "sm",
        "bullets_format": "standard",
        "skills_format": "comma",
    },
    "corporate": {
        "id": "corporate",
        "name": "Corporate",
        "description": "Left-aligned top header, solid dividers, " \
            "and structured professional navy accent.",
        "font_family": "serif",
        "accent_color": "corporate",
        "header_align": "left",
        "divider_style": "solid",
        "section_spacing": "section_gap",
        "entry_spacing": "entry_gap",
        "bullets_format": "standard",
        "skills_format": "grid",
    },
    "technical": {
        "id": "technical",
        "name": "Technical",
        "description": "Clean monospace typography, compact grids, " \
            "and teal accents optimized for developers.",
        "font_family": "mono",
        "accent_color": "technical",
        "header_align": "left",
        "divider_style": "dashed",
        "section_spacing": "md",
        "entry_spacing": "sm",
        "bullets_format": "standard",
        "skills_format": "grid",
    },
    "student": {
        "id": "student",
        "name": "Student",
        "description": "Centered title, education-first structure, and " \
            "purple accents to highlight early achievements.",
        "font_family": "sans",
        "accent_color": "student",
        "header_align": "center",
        "divider_style": "solid",
        "section_spacing": "section_gap",
        "entry_spacing": "entry_gap",
        "bullets_format": "icons",
        "skills_format": "chips",
    },
    "internship": {
        "id": "internship",
        "name": "Internship",
        "description": "Compact spacing and projects-first " \
            "layout with emerald green theme accents.",
        "font_family": "sans",
        "accent_color": "internship",
        "header_align": "left",
        "divider_style": "none",
        "section_spacing": "sm",
        "entry_spacing": "sm",
        "bullets_format": "standard",
        "skills_format": "comma",
    },
    "executive": {
        "id": "executive",
        "name": "Executive",
        "description": "Bronze/amber accents with spacious layout, " \
            "two-column headers, and premium serif formatting.",
        "font_family": "serif",
        "accent_color": "executive",
        "header_align": "left",
        "divider_style": "double",
        "section_spacing": "xxl",
        "entry_spacing": "lg",
        "bullets_format": "standard",
        "skills_format": "grid",
    },
}


def get_template_config(template_id: str, ats_mode: bool = False) -> dict:
    """Resolve the template configuration. Overrides settings with strict single-column
    black-and-white standard properties if ats_mode is enabled.
    """
    base_config = TEMPLATES.get(template_id, TEMPLATES["modern"]).copy()

    if ats_mode:
        # Enforce ATS guidelines (single-column, black-and-white, standard simple
        # dividers, no graphics/icons)
        base_config.update(
            {
                "font_family": "sans",  # Standard sans font (Arial-compatible)
                "accent_color": "minimal",  # Black/Dark Grey only
                "header_align": "left",
                "divider_style": "none",
                "bullets_format": "standard",
                "skills_format": "comma",
                "section_spacing": "md",
                "entry_spacing": "sm",
            }
        )

    return base_config

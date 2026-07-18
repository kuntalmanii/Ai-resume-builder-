"""Design tokens for typography, spacing, margins, and borders."""

# Typography scale in points (pt) for PDF compatibility, translated to rem/px hints for layout
FONT_SIZES = {
    "display": {"size": "24pt", "line_height": "1.2"},
    "heading_xl": {"size": "18pt", "line_height": "1.2"},
    "heading_l": {"size": "14pt", "line_height": "1.3"},
    "heading_m": {"size": "12pt", "line_height": "1.3"},
    "heading_s": {"size": "11pt", "line_height": "1.4"},
    "body_l": {"size": "10.5pt", "line_height": "1.4"},
    "body_m": {"size": "9.5pt", "line_height": "1.4"},
    "body_s": {"size": "8.5pt", "line_height": "1.4"},
    "caption": {"size": "8pt", "line_height": "1.4"},
}

SPACING = {
    "xs": "2px",
    "sm": "4px",
    "md": "8px",
    "lg": "12px",
    "xl": "16px",
    "xxl": "24px",
    "section_gap": "20px",
    "entry_gap": "12px",
}

FONT_FAMILIES = {
    "sans": "Inter, system-ui, -apple-system, sans-serif",
    "serif": "Lora, Georgia, 'Times New Roman', serif",
    "mono": "'Fira Code', Courier, monospace",
}

ACCENT_COLORS = {
    "modern": "#2563eb",  # Blue
    "minimal": "#1f2937",  # Slate
    "corporate": "#0f172a",  # Navy
    "technical": "#0d9488",  # Teal
    "student": "#4f46e5",  # Purple
    "internship": "#059669",  # Emerald
    "executive": "#78350f",  # Amber
}

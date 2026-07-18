"""Core Resume Rendering Engine and HTML Compiler."""

from typing import Any

from app.schemas.resume import ResumeDocument
from app.services.renderer.render_tree import RenderNode, RenderTree
from app.services.renderer.templates import get_template_config
from app.services.renderer.tokens import ACCENT_COLORS, FONT_FAMILIES


class ResumeRenderer:
    def __init__(
        self, doc: ResumeDocument, template_id: str = "modern", settings: dict[str, Any] = None
    ):
        self.doc = doc
        self.template_id = template_id
        self.settings = settings or {}

        self.ats_mode = self.settings.get("ats_mode", False)
        self.template_config = get_template_config(self.template_id, self.ats_mode)

        # Merge theme overrides from settings
        self.accent_color_key = self.settings.get(
            "accent_color", self.template_config["accent_color"]
        )
        self.accent_color = ACCENT_COLORS.get(self.accent_color_key, ACCENT_COLORS["modern"])
        self.font_family = FONT_FAMILIES.get(
            self.template_config["font_family"], FONT_FAMILIES["sans"]
        )

        self.margins = {
            "top": self.settings.get("margin_top", "15mm"),
            "bottom": self.settings.get("margin_bottom", "15mm"),
            "left": self.settings.get("margin_left", "15mm"),
            "right": self.settings.get("margin_right", "15mm"),
        }
        self.font_scale = float(self.settings.get("font_scale", 1.0))
        self.section_visibility = self.settings.get("section_visibility", {})

        # Determine section order
        self.section_order = self.settings.get("section_ordering")
        if not self.section_order:
            self.section_order = self.doc.section_order or [
                "professional_summary",
                "education",
                "experience",
                "projects",
                "skills",
                "certifications",
                "achievements",
                "positions_of_responsibility",
                "languages",
                "interests",
            ]

    def build_render_tree(self) -> RenderTree:
        """Construct the visual RenderTree from ResumeDocument and settings."""
        root_children: list[RenderNode] = []

        # 1. Header (Personal Info)
        personal = self.doc.personal_information
        if personal and personal.full_name:
            header_node = RenderNode(type="header")

            # Name
            name_node = RenderNode(
                type="text",
                text=personal.full_name,
                style_classes=["text-2xl", "font-bold"],
                styles={"color": self.accent_color if not self.ats_mode else "#111111"},
            )
            header_node.children.append(name_node)

            # Contact Details
            contacts = []
            if personal.email:
                contacts.append(personal.email)
            if personal.phone:
                contacts.append(personal.phone)
            if personal.location:
                contacts.append(personal.location)
            if personal.linkedin_url:
                contacts.append(personal.linkedin_url)
            if personal.github_url:
                contacts.append(f"GitHub: {personal.github_url}")
            if personal.portfolio_url:
                contacts.append(personal.portfolio_url)

            if contacts:
                contact_str = " | ".join(contacts)
                contact_node = RenderNode(
                    type="text",
                    text=contact_str,
                    style_classes=["text-[10px]", "text-slate-500", "mt-1"],
                )
                header_node.children.append(contact_node)

            root_children.append(header_node)

        # 2. Add sections in order
        for section in self.section_order:
            # Skip if hidden
            if not self.section_visibility.get(section, True):
                continue

            # Skip personal_information since it is the header
            if section == "personal_information":
                continue

            section_node = self._render_section(section)
            if section_node and section_node.children:
                root_children.append(section_node)

        root = RenderNode(type="document", children=root_children)
        return RenderTree(
            root=root,
            template_id=self.template_id,
            accent_color=self.accent_color,
            margins=self.margins,
            font_scale=self.font_scale,
        )

    def _render_section(self, section_name: str) -> RenderNode | None:
        """Render a specific section of the resume."""
        node = RenderNode(type="section", section_type=section_name)

        # Add Section Header
        title_map = {
            "professional_summary": "Professional Summary",
            "education": "Education",
            "experience": "Work Experience",
            "projects": "Projects",
            "skills": "Technical Skills",
            "certifications": "Certifications & Licenses",
            "achievements": "Key Achievements",
            "positions_of_responsibility": "Positions of Responsibility",
            "languages": "Languages",
            "interests": "Interests",
        }

        title_text = title_map.get(section_name, section_name.replace("_", " ").title())

        # Header Node
        header_container = RenderNode(
            type="header", style_classes=["section-header", "mt-4", "mb-1"]
        )
        header_container.children.append(
            RenderNode(
                type="text",
                text=title_text,
                style_classes=["text-xs", "font-bold", "uppercase", "tracking-wider"],
                styles={"color": self.accent_color if not self.ats_mode else "#111111"},
            )
        )

        # Add Horizontal Line Divider if template config demands
        div_style = self.template_config.get("divider_style", "solid")
        if div_style != "none" and not self.ats_mode:
            border_style = "border-t"
            if div_style == "dashed":
                border_style = "border-t border-dashed"
            elif div_style == "double":
                border_style = "border-t-2 double"
            header_container.children.append(
                RenderNode(
                    type="divider",
                    style_classes=[border_style, "mt-1", "mb-2"],
                    styles={"border-color": self.accent_color},
                )
            )

        node.children.append(header_container)

        # Render Content based on Section
        if section_name == "professional_summary" and self.doc.professional_summary:
            node.children.append(
                RenderNode(
                    type="text",
                    text=self.doc.professional_summary,
                    style_classes=["text-[10px]", "leading-relaxed", "text-slate-700"],
                )
            )

        elif section_name == "experience" and self.doc.experience:
            for job in self.doc.experience:
                entry = RenderNode(type="entry", style_classes=["entry-container", "mb-3"])

                # Title & Company line
                header = RenderNode(
                    type="row",
                    style_classes=["flex", "justify-between", "items-baseline", "font-semibold"],
                )
                header.children.append(
                    RenderNode(
                        type="text",
                        text=f"{job.company} — {job.position}",
                        style_classes=["text-[10px]", "text-slate-900"],
                    )
                )
                date_str = f"{job.start_date or ''} — {job.end_date or 'Present'}"
                header.children.append(
                    RenderNode(
                        type="text", text=date_str, style_classes=["text-[9px]", "text-slate-500"]
                    )
                )
                entry.children.append(header)

                # Description / bullet points
                job_desc = getattr(job, "description", None)
                if job_desc:
                    entry.children.append(
                        RenderNode(
                            type="text",
                            text=job_desc,
                            style_classes=["text-[9.5px]", "text-slate-700", "mt-1"],
                        )
                    )
                if job.bullets:
                    for bullet in job.bullets:
                        entry.children.append(
                            RenderNode(
                                type="item",
                                text=bullet,
                                style_classes=[
                                    "bullet-item",
                                    "text-[9.5px]",
                                    "text-slate-700",
                                    "pl-4",
                                    "relative",
                                    "before:content-['•']",
                                    "before:absolute",
                                    "before:left-1",
                                ],
                            )
                        )
                node.children.append(entry)

        elif section_name == "education" and self.doc.education:
            for edu in self.doc.education:
                entry = RenderNode(type="entry", style_classes=["entry-container", "mb-2"])
                header = RenderNode(
                    type="row", style_classes=["flex", "justify-between", "items-baseline"]
                )
                title_node = RenderNode(type="text", style_classes=["text-[10px]"])
                title_node.children.append(
                    RenderNode(
                        type="text",
                        text=edu.institution,
                        style_classes=["font-bold", "text-slate-900"],
                    )
                )
                if edu.degree:
                    title_node.children.append(
                        RenderNode(
                            type="text", text=f" — {edu.degree}", style_classes=["text-slate-700"]
                        )
                    )
                header.children.append(title_node)
                header.children.append(
                    RenderNode(
                        type="text",
                        text=edu.end_date or "",
                        style_classes=["text-[9px]", "text-slate-500"],
                    )
                )
                entry.children.append(header)
                node.children.append(entry)

        elif section_name == "projects" and self.doc.projects:
            for proj in self.doc.projects:
                entry = RenderNode(type="entry", style_classes=["entry-container", "mb-3"])
                header = RenderNode(
                    type="row",
                    style_classes=["flex", "justify-between", "items-baseline", "font-semibold"],
                )
                header.children.append(
                    RenderNode(
                        type="text", text=proj.name, style_classes=["text-[10px]", "text-slate-900"]
                    )
                )
                if proj.url:
                    header.children.append(
                        RenderNode(
                            type="text",
                            text=proj.url,
                            style_classes=["text-[9px]", "text-slate-500", "font-mono"],
                        )
                    )
                entry.children.append(header)
                if proj.description:
                    entry.children.append(
                        RenderNode(
                            type="text",
                            text=proj.description,
                            style_classes=["text-[9.5px]", "text-slate-700", "mt-0.5"],
                        )
                    )
                node.children.append(entry)

        elif section_name == "skills" and self.doc.skills:
            fmt = self.template_config.get("skills_format", "chips")
            if fmt == "chips" and not self.ats_mode:
                grid = RenderNode(
                    type="grid", style_classes=["flex", "flex-wrap", "gap-1.5", "mt-1"]
                )
                for group in self.doc.skills:
                    for skill in group.skills:
                        grid.children.append(
                            RenderNode(
                                type="text",
                                text=skill,
                                style_classes=[
                                    "text-[9px]",
                                    "bg-slate-100",
                                    "text-slate-800",
                                    "px-2",
                                    "py-0.5",
                                    "rounded",
                                ],
                            )
                        )
                node.children.append(grid)
            elif fmt == "grid":
                grid = RenderNode(
                    type="grid", style_classes=["grid", "grid-cols-2", "gap-2", "mt-1"]
                )
                for group in self.doc.skills:
                    col = RenderNode(type="col", style_classes=["text-[9.5px]", "text-slate-700"])
                    col.children.append(
                        RenderNode(type="text", text=group.name, style_classes=["font-bold"])
                    )
                    col.children.append(RenderNode(type="text", text=", ".join(group.skills)))
                    grid.children.append(col)
                node.children.append(grid)
            else:  # Comma format
                flat_skills = []
                for group in self.doc.skills:
                    flat_skills.extend(group.skills)
                node.children.append(
                    RenderNode(
                        type="text",
                        text=", ".join(flat_skills),
                        style_classes=["text-[9.5px]", "text-slate-700", "leading-normal"],
                    )
                )

        elif section_name == "certifications" and self.doc.certifications:
            for cert in self.doc.certifications:
                entry = RenderNode(
                    type="entry",
                    style_classes=[
                        "entry-container",
                        "flex",
                        "justify-between",
                        "items-baseline",
                        "mb-1",
                    ],
                )
                entry.children.append(
                    RenderNode(
                        type="text",
                        text=f"{cert.name} ({cert.issuer or ''})",
                        style_classes=["text-[9.5px]", "text-slate-800"],
                    )
                )
                entry.children.append(
                    RenderNode(
                        type="text",
                        text=cert.date or "",
                        style_classes=["text-[9px]", "text-slate-500"],
                    )
                )
                node.children.append(entry)

        elif section_name == "achievements" and self.doc.achievements:
            for ach in self.doc.achievements:
                node.children.append(
                    RenderNode(
                        type="item",
                        text=f"{ach.title}: {ach.description or ''}",
                        style_classes=[
                            "bullet-item",
                            "text-[9.5px]",
                            "text-slate-700",
                            "pl-4",
                            "relative",
                            "before:content-['•']",
                            "before:absolute",
                            "before:left-1",
                        ],
                    )
                )

        elif section_name == "positions_of_responsibility" and self.doc.positions_of_responsibility:
            for pos in self.doc.positions_of_responsibility:
                entry = RenderNode(type="entry", style_classes=["entry-container", "mb-2"])
                header = RenderNode(
                    type="row", style_classes=["flex", "justify-between", "items-baseline"]
                )
                header.children.append(
                    RenderNode(
                        type="text",
                        text=f"{pos.organization} — {pos.role}",
                        style_classes=["text-[9.5px]", "font-bold"],
                    )
                )
                header.children.append(
                    RenderNode(
                        type="text",
                        text=f"{pos.start_date or ''} — {pos.end_date or ''}",
                        style_classes=["text-[9px]", "text-slate-500"],
                    )
                )
                entry.children.append(header)
                if pos.description:
                    entry.children.append(
                        RenderNode(
                            type="text",
                            text=pos.description,
                            style_classes=["text-[9.5px]", "text-slate-600"],
                        )
                    )
                node.children.append(entry)

        elif section_name == "languages" and self.doc.languages:
            langs = [
                f"{lang.language} ({lang.proficiency})" if lang.proficiency else lang.language
                for lang in self.doc.languages
            ]
            node.children.append(
                RenderNode(
                    type="text",
                    text=", ".join(langs),
                    style_classes=["text-[9.5px]", "text-slate-700"],
                )
            )

        elif section_name == "interests" and self.doc.interests:
            ints = [i.name for i in self.doc.interests]
            node.children.append(
                RenderNode(
                    type="text",
                    text=", ".join(ints),
                    style_classes=["text-[9.5px]", "text-slate-700"],
                )
            )

        # Check if the section ended up empty
        if len(node.children) <= 1:
            return None
        return node


def render_node_to_html(node: RenderNode) -> str:
    """Compile a single RenderNode and its descendants recursively to HTML."""
    classes = " ".join(node.style_classes)
    style_str = "; ".join(f"{k}: {v}" for k, v in node.styles.items())
    style_attr = f'style="{style_str}"' if style_str else ""

    children_html = "".join(render_node_to_html(child) for child in node.children)

    if node.type == "document":
        return f'<div class="{classes}" {style_attr}>{children_html}</div>'
    elif node.type == "section":
        return f'<section class="section {classes}" {style_attr}>{children_html}</section>'
    elif node.type == "header":
        return f'<header class="{classes}" {style_attr}>{children_html}</header>'
    elif node.type == "entry":
        return f'<div class="entry {classes}" {style_attr}>{children_html}</div>'
    elif node.type == "row":
        return f'<div class="row {classes}" {style_attr}>{children_html}</div>'
    elif node.type == "col":
        return f'<div class="col {classes}" {style_attr}>{children_html}</div>'
    elif node.type == "grid":
        return f'<div class="grid-container {classes}" {style_attr}>{children_html}</div>'
    elif node.type == "divider":
        return f'<div class="divider {classes}" {style_attr}></div>'
    elif node.type == "item":
        text = node.text or ""
        return f'<div class="bullet-item {classes}" {style_attr}>{text}{children_html}</div>'
    else:  # text
        text = node.text or ""
        return f'<span class="{classes}" {style_attr}>{text}{children_html}</span>'


def compile_render_tree_to_html(tree: RenderTree) -> str:
    """Wrap the compiled RenderTree HTML in a full HTML page matching page settings."""
    body_html = render_node_to_html(tree.root)

    html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Lora:ital,wght@0,400;0,600;1,400&family=Fira+Code:wght@400;500&display=swap');

    body {{
      margin: 0;
      padding: 0;
      background: white;
      -webkit-print-color-adjust: exact;
      font-family: {tree.root.styles.get("font-family", "sans-serif")};
    }}

    @page {{
      size: {tree.paper_size.upper()};
      margin: {tree.margins["top"]} {tree.margins["right"]}
              {tree.margins["bottom"]} {tree.margins["left"]};
    }}

    .resume-container {{
      font-size: {tree.font_scale}rem;
      line-height: 1.4;
      font-family: inherit;
    }}

    .section-header {{
      page-break-after: avoid;
      break-after: avoid;
    }}
    .entry-container {{
      page-break-inside: avoid;
      break-inside: avoid;
    }}
    .bullet-item {{
      page-break-inside: avoid;
      break-inside: avoid;
    }}
  </style>
</head>
<body>
  <div class="resume-container">
    {body_html}
  </div>
</body>
</html>
"""
    return html

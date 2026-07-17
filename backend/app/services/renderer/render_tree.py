"""Pydantic model representing the visual render tree structure."""
from typing import Literal

from pydantic import BaseModel, Field


class RenderNode(BaseModel):
    type: Literal["document", "page", "section", "header", "entry", "item", "text", "divider", "grid", "col", "row"]
    section_type: str | None = None
    text: str | None = None
    style_classes: list[str] = Field(default_factory=list)
    styles: dict[str, str] = Field(default_factory=dict)
    children: list["RenderNode"] = Field(default_factory=list)


class RenderTree(BaseModel):
    root: RenderNode
    template_id: str
    accent_color: str
    paper_size: str = "a4"
    margins: dict[str, str] = Field(default_factory=lambda: {"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"})
    font_scale: float = 1.0

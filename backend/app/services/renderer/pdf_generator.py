"""Playwright-based PDF Generation Service."""
import hashlib
import json
import os
import uuid

import fitz  # PyMuPDF
from playwright.async_api import async_playwright
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.models.resume import Resume
from app.db.models.resume_export import ResumeExport
from app.schemas.resume import ResumeDocument
from app.services.renderer.engine import ResumeRenderer, compile_render_tree_to_html
from app.services.storage.local import LocalStorage


class PlaywrightPDFGenerator:
    @staticmethod
    def calculate_checksum(resume_id: uuid.UUID, resume_version: int, template_id: str, settings: dict) -> str:
        """Calculate a unique SHA-256 checksum for this export request configuration."""
        settings_str = json.dumps(settings, sort_keys=True)
        raw_key = f"{resume_id}:{resume_version}:{template_id}:{settings_str}"
        return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

    @classmethod
    async def print_html_to_pdf(cls, html: str) -> bytes:
        """Utility to render a raw HTML string and return print PDF bytes."""
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            await page.set_content(html)
            await page.wait_for_load_state("networkidle")
            pdf_bytes = await page.pdf(
                format="A4",
                print_background=True,
                margin={"top": "20mm", "bottom": "20mm", "left": "20mm", "right": "20mm"}
            )
            await browser.close()
        return pdf_bytes

    @classmethod
    async def generate_pdf(

        cls,
        db: AsyncSession,
        resume_id: uuid.UUID,
        template_id: str,
        settings: dict,
        force: bool = False
    ) -> ResumeExport:
        """Generate PDF for the given resume and save it, using cached export if available."""
        # 1. Fetch Resume with User relationship (for metadata author name)
        stmt = select(Resume).options(selectinload(Resume.user)).where(Resume.id == resume_id)
        result = await db.execute(stmt)
        resume = result.scalar_one_or_none()
        if not resume:
            raise ValueError("Resume not found")

        # 2. Check for cache hit
        checksum = cls.calculate_checksum(resume.id, resume.version, template_id, settings)
        if not force:
            cache_stmt = select(ResumeExport).where(
                ResumeExport.resume_id == resume.id,
                ResumeExport.resume_version == resume.version,
                ResumeExport.template_id == template_id,
                ResumeExport.checksum == checksum,
                ResumeExport.status == "completed"
            )
            cache_res = await db.execute(cache_stmt)
            cached_export = cache_res.scalar_one_or_none()
            if cached_export and os.path.exists(cached_export.storage_path):
                return cached_export

        # 3. Create a pending export record
        export_snapshot = ResumeExport(
            resume_id=resume.id,
            resume_version=resume.version,
            template_id=template_id,
            settings=settings,
            checksum=checksum,
            storage_path="",  # Filled upon completion
            page_count=1,
            status="pending"
        )
        db.add(export_snapshot)
        await db.flush()

        try:
            # 4. Parse content using Pydantic ResumeDocument model
            doc = ResumeDocument.model_validate(resume.content)

            # 5. Render Tree to HTML
            renderer = ResumeRenderer(doc, template_id, settings)
            tree = renderer.build_render_tree()
            html = compile_render_tree_to_html(tree)

            # 6. Print PDF using Playwright headless Chromium
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.set_content(html)
                # Wait for stylesheet CDN (Tailwind) and Google Fonts to settle
                await page.wait_for_load_state("networkidle")

                # Dynamic page format and margins configuration
                pdf_bytes = await page.pdf(
                    format=tree.paper_size.upper(),
                    print_background=True,
                    display_header_footer=settings.get("show_page_numbers", True),
                    header_template='<div style="height: 10px;"></div>',
                    footer_template='<div style="font-size: 8px; font-family: Arial, sans-serif; width: 100%; text-align: center; color: #888; padding-bottom: 5px;"><span class="pageNumber"></span> / <span class="totalPages"></span></div>',
                    margin=tree.margins
                )
                await browser.close()

            # 7. Save to local storage
            storage = LocalStorage()
            filename = f"{export_snapshot.id}.pdf"
            storage_path = await storage.save(filename, pdf_bytes)

            # 8. Update PDF Metadata & count pages using PyMuPDF (fitz)
            doc_pdf = fitz.open(storage_path)
            page_count = doc_pdf.page_count

            author_name = "CareerOS User"
            if resume.user and hasattr(resume.user, "full_name") and resume.user.full_name:
                author_name = resume.user.full_name

            metadata = {
                "title": f"Resume - {resume.title}",
                "author": author_name,
                "subject": f"Resume v{resume.version} (Template: {template_id})",
                "keywords": "resume, cv, career, exports, professional",
                "creator": "CareerOS AI Rendering Engine",
                "producer": "Playwright PDF Generator",
            }
            doc_pdf.set_metadata(metadata)
            doc_pdf.save(storage_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
            doc_pdf.close()

            # 9. Update DB record status
            export_snapshot.storage_path = storage_path
            export_snapshot.page_count = page_count
            export_snapshot.status = "completed"
            await db.flush()

            return export_snapshot

        except Exception as e:
            export_snapshot.status = "failed"
            await db.flush()
            raise e

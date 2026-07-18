"""Cover Letter Service class."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_ai_provider
from app.db.models.cover_letter import CoverLetter
from app.repositories.cover_letter import cover_letter_repository
from app.repositories.job_description import job_description_repository
from app.repositories.resume import resume_repository
from app.schemas.cover_letter import CoverLetterCreate, CoverLetterGenerateRequest
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service
from app.services.renderer.pdf_generator import PlaywrightPDFGenerator  # reuse existing PDF engine!


class CoverLetterService:
    async def generate_cover_letter(
        self, db: AsyncSession, *, user_id: uuid.UUID, request: CoverLetterGenerateRequest
    ) -> tuple[str, dict]:
        """Generate a cover letter using AI provider, grounded on the resume and JD."""
        # 1. Fetch Resume Content
        resume = await resume_repository.get(db, request.resume_id)
        if not resume or resume.user_id != user_id:
            raise ValueError("Resume not found or access denied.")

        resume_content = json.dumps(resume.content)

        # 2. Fetch Job Description
        jd_text = ""
        if request.job_description_id:
            jd = await job_description_repository.get(db, request.job_description_id)
            if jd:
                jd_text = f"Title: {jd.title}\nCompany: {jd.company}\nRequirements:\n{jd.raw_text}"
        elif request.job_description_text:
            jd_text = request.job_description_text

        # 3. Grounding prompts
        system_prompt = (
            "You are an expert career advisor and professional resume writer.\n"
            "Your task is to write a highly compelling, "
            "personalized cover letter for the candidate.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. NEVER invent any work experiences, projects, credentials, or skills.\n"
            "2. Ground ALL claims and achievements strictly on the provided resume content.\n"
            "3. If a requirement in the job description is "
            "not mentioned in the resume, do not claim "
            "the candidate has it; instead focus on "
            "transferable skills that ARE in the resume.\n"
            "4. Make the tone matches the requested style (e.g. professional, creative, modern)."
        )

        user_prompt = (
            f"Candidate Resume Content:\n{resume_content}\n\n"
            f"Target Job Description:\n{jd_text}\n\n"
            f"Style Preference: {request.style_preference}\n\n"
            "Please write a cover letter. Output ONLY the raw cover "
            "letter text. Do not include any chat prefix/suffix."
        )

        ai_provider = get_ai_provider()
        content = await ai_provider.complete(
            prompt=user_prompt, system_prompt=system_prompt, temperature=0.3
        )

        metadata = {
            "style_preference": request.style_preference,
            "resume_version": resume.version,
            "grounding_source": "resume_claims",
        }
        return str(content).strip(), metadata

    async def create(
        self, db: AsyncSession, *, user_id: uuid.UUID, obj_in: CoverLetterCreate
    ) -> CoverLetter:
        data = obj_in.model_dump()
        data["user_id"] = user_id
        cl_obj = await cover_letter_repository.create(db, obj_in=data)

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="success",
                title="Cover Letter Created",
                body=f"Cover letter '{cl_obj.title}' created successfully.",
                action_url=f"/cover-letters/{cl_obj.id}",
            ),
        )
        return cl_obj

    async def get_by_user_id(self, db: AsyncSession, user_id: uuid.UUID) -> list[CoverLetter]:
        return await cover_letter_repository.get_by_user_id(db, user_id)

    async def get_by_id(
        self, db: AsyncSession, id: uuid.UUID, user_id: uuid.UUID
    ) -> CoverLetter | None:
        cl = await cover_letter_repository.get(db, id)
        if cl and cl.user_id == user_id:
            return cl
        return None

    async def create_new_version(
        self,
        db: AsyncSession,
        *,
        root_id: uuid.UUID,
        user_id: uuid.UUID,
        content: str | None = None,
        title: str | None = None,
    ) -> CoverLetter:
        """Create a new version increment of a cover letter."""
        root = await cover_letter_repository.get(db, root_id)
        if not root or root.user_id != user_id:
            raise ValueError("Root cover letter not found or access denied.")

        latest = await cover_letter_repository.get_latest_version(db, root_id)
        next_ver = (latest.version if latest else root.version) + 1

        new_cl = CoverLetter(
            user_id=user_id,
            application_id=root.application_id,
            resume_id=root.resume_id,
            job_description_id=root.job_description_id,
            title=title or root.title,
            content=content if content is not None else root.content,
            version=next_ver,
            parent_id=root_id,
            is_grounded=root.is_grounded,
            generation_metadata=root.generation_metadata,
        )
        db.add(new_cl)
        await db.flush()
        return new_cl

    async def get_versions(
        self, db: AsyncSession, id: uuid.UUID, user_id: uuid.UUID
    ) -> list[CoverLetter]:
        cl = await cover_letter_repository.get(db, id)
        if not cl or cl.user_id != user_id:
            return []
        root_id = cl.parent_id if cl.parent_id else cl.id
        return await cover_letter_repository.get_versions(db, root_id)

    async def update(
        self,
        db: AsyncSession,
        *,
        id: uuid.UUID,
        user_id: uuid.UUID,
        content: str | None = None,
        title: str | None = None,
    ) -> CoverLetter | None:
        cl = await cover_letter_repository.get(db, id)
        if not cl or cl.user_id != user_id:
            return None
        updates = {}
        if content is not None:
            updates["content"] = content
        if title is not None:
            updates["title"] = title
        return await cover_letter_repository.update(db, db_obj=cl, obj_in=updates)

    async def remove(self, db: AsyncSession, *, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        cl = await cover_letter_repository.get(db, id)
        if cl and cl.user_id == user_id:
            await cover_letter_repository.remove(db, id=id)
            return True
        return False

    async def export_pdf(self, db: AsyncSession, *, id: uuid.UUID, user_id: uuid.UUID) -> str:
        """Export cover letter as PDF reusing existing HTML/PDF print engine."""
        cl = await cover_letter_repository.get(db, id)
        if not cl or cl.user_id != user_id:
            raise ValueError("Cover letter not found.")

        # Construct a simple clean cover letter HTML template
        html_content = f"""
        <html>
        <head>
            <style>
                body {{
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #2D3748;
                    margin: 40px;
                }}
                .title {{
                    font-size: 24px;
                    font-weight: bold;
                    margin-bottom: 20px;
                    color: #1A365D;
                }}
                .content {{
                    white-space: pre-wrap;
                }}
            </style>
        </head>
        <body>
            <div class="title">{cl.title}</div>
            <div class="content">{cl.content}</div>
        </body>
        </html>
        """

        pdf_bytes = await PlaywrightPDFGenerator.print_html_to_pdf(html_content)

        # Save pdf bytes using Storage Factory
        from app.services.storage.storage_factory import get_storage

        storage = get_storage()
        filename = f"cover_letter_{cl.id}.pdf"
        file_path = await storage.save(filename, pdf_bytes)

        cl = await cover_letter_repository.update(db, db_obj=cl, obj_in={"export_path": file_path})
        return file_path


cover_letter_service = CoverLetterService()

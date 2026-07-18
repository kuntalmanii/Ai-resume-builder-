"""Portfolio Service class."""

import io
import uuid
import zipfile
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.portfolio import Portfolio
from app.repositories.portfolio import portfolio_repository
from app.repositories.profile import profile_repository
from app.schemas.notification import NotificationCreate
from app.services.career_entry_service import get_career_entries
from app.services.notification_service import notification_service
from app.services.storage.storage_factory import get_storage


class PortfolioService:
    async def get_or_create(self, db: AsyncSession, *, user_id: uuid.UUID) -> Portfolio:
        portfolio = await portfolio_repository.get_by_user_id(db, user_id)
        if portfolio:
            return portfolio

        # Populate initial content from career entries & profile
        profile = await profile_repository.get_by_user_id(db, user_id)
        entries = await get_career_entries(db, user_id)

        # Build initial payload
        projects = []
        experience = []
        education = []
        skills = []

        if profile:
            skills = profile.skills or []

        for entry in entries:
            payload = {
                "id": str(entry.id),
                "title": entry.title,
                "organization": entry.organization,
                "start_date": entry.start_date,
                "end_date": entry.end_date,
                "is_current": entry.is_current,
                "description": entry.data.get("description", ""),
            }
            if entry.entry_type == "project":
                projects.append(payload)
            elif entry.entry_type == "work":
                experience.append(payload)
            elif entry.entry_type == "education":
                education.append(payload)

        initial_content = {
            "name": profile.full_name if profile else "John Doe",
            "tagline": profile.tagline if profile else "Software Engineer",
            "about": profile.bio if profile else "A passionate builder.",
            "skills": skills,
            "projects": projects,
            "experience": experience,
            "education": education,
        }

        default_config = {
            "colors": {"primary": "#1A365D", "bg": "#FFFFFF", "text": "#2D3748"},
            "fonts": {"header": "Inter", "body": "Inter"},
            "social": {"github": "", "linkedin": "", "twitter": ""},
            "sections": {"about": True, "projects": True, "experience": True, "education": True},
        }

        portfolio = await portfolio_repository.create(
            db,
            obj_in={
                "user_id": user_id,
                "theme": "minimal",
                "config": default_config,
                "content": initial_content,
                "status": "draft",
            },
        )
        return portfolio

    async def update(
        self, db: AsyncSession, *, id: uuid.UUID, user_id: uuid.UUID, updates: dict
    ) -> Portfolio | None:
        portfolio = await portfolio_repository.get(db, id)
        if not portfolio or portfolio.user_id != user_id:
            return None
        return await portfolio_repository.update(db, db_obj=portfolio, obj_in=updates)

    async def export_static_zip(
        self, db: AsyncSession, *, id: uuid.UUID, user_id: uuid.UUID
    ) -> str:
        portfolio = await portfolio_repository.get(db, id)
        if not portfolio or portfolio.user_id != user_id:
            raise ValueError("Portfolio not found.")

        # Create static HTML file representing the portfolio website
        content = portfolio.content
        config = portfolio.config

        primary_color = config.get("colors", {}).get("primary", "#3182ce")
        bg_color = config.get("colors", {}).get("bg", "#fff")
        text_color = config.get("colors", {}).get("text", "#2d3748")

        # HTML generation helper
        html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{content.get("name")} | Portfolio</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap"
          rel="stylesheet">
    <style>
        body {{
            font-family: 'Inter', sans-serif;
            margin: 0;
            padding: 0;
            background-color: {bg_color};
            color: {text_color};
            line-height: 1.6;
        }}
        .container {{
            max-width: 800px;
            margin: 0 auto;
            padding: 40px 20px;
        }}
        header {{
            margin-bottom: 60px;
        }}
        h1 {{
            font-size: 2.5rem;
            color: {primary_color};
            margin-bottom: 10px;
        }}
        .tagline {{
            font-size: 1.25rem;
            color: #718096;
            margin-bottom: 20px;
        }}
        section {{
            margin-bottom: 40px;
        }}
        h2 {{
            border-bottom: 2px solid {primary_color};
            padding-bottom: 8px;
            color: {primary_color};
        }}
        .item {{
            margin-bottom: 20px;
        }}
        .item-title {{
            font-weight: 600;
        }}
        .skills-list {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }}
        .skill-tag {{
            background-color: #edf2f7;
            padding: 4px 12px;
            border-radius: 9999px;
            font-size: 0.875rem;
        }}
        footer {{
            margin-top: 60px;
            text-align: center;
            font-size: 0.875rem;
            color: #a0aec0;
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>{content.get("name")}</h1>
            <div class="tagline">{content.get("tagline")}</div>
            <p>{content.get("about")}</p>
        </header>

        <section>
            <h2>Skills</h2>
            <div class="skills-list">
                {
            "".join(
                f'<span class="skill-tag">{skill}</span>' for skill in content.get("skills", [])
            )
        }
            </div>
        </section>

        <section>
            <h2>Experience</h2>
            {
            "".join(
                f'''<div class="item">
                <div class="item-title">{exp.get("title")} at {exp.get("organization")}</div>
                <div style="font-size:0.875rem; color:#718096;">
                    {exp.get("start_date")} - {exp.get("end_date") or 'Present'}
                </div>
                <p>{exp.get("description")}</p>
            </div>'''
                for exp in content.get("experience", [])
            )
        }
        </section>

        <section>
            <h2>Projects</h2>
            {
            "".join(
                f'''<div class="item">
                <div class="item-title">{proj.get("title")}</div>
                <p>{proj.get("description")}</p>
            </div>'''
                for proj in content.get("projects", [])
            )
        }
        </section>

        <footer>
            <p>&copy; {datetime.now().year} {content.get("name")}. Generated by CareerOS AI.</p>
        </footer>
    </div>
</body>
</html>
"""

        # Generate a zip containing index.html
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            zip_file.writestr("index.html", html)

        zip_data = zip_buffer.getvalue()
        storage = get_storage()
        filename = f"portfolio_{portfolio.id}.zip"
        file_path = await storage.save(filename, zip_data)

        # Update db record
        await portfolio_repository.update(
            db, db_obj=portfolio, obj_in={"export_path": file_path, "status": "ready"}
        )

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="success",
                title="Portfolio Website Ready",
                body="Your static portfolio website ZIP is compiled and ready for download.",
                action_url="/portfolio",
            ),
        )
        return file_path


portfolio_service = PortfolioService()

"""LinkedIn Optimization Service class."""
import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_ai_provider
from app.db.models.linkedin_optimization import LinkedInOptimization
from app.repositories.linkedin import linkedin_optimization_repository
from app.repositories.resume import resume_repository
from app.schemas.linkedin import LinkedInOptimizeRequest
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service


class LinkedInService:
    async def optimize_profile(
        self, db: AsyncSession, *, user_id: uuid.UUID, request: LinkedInOptimizeRequest
    ) -> LinkedInOptimization:
        # 1. Fetch Resume Content
        resume_content = ""
        if request.resume_id:
            resume = await resume_repository.get(db, request.resume_id)
            if resume and resume.user_id == user_id:
                resume_content = json.dumps(resume.content)

        # 2. Build AI prompts for optimization
        system_prompt = (
            "You are an expert LinkedIn profile optimizer and SEO specialist.\n"
            "Your goal is to maximize search visibility for recruiters, keyword density, and overall professional layout.\n"
            "CRITICAL INSTRUCTIONS:\n"
            "1. NEVER invent projects, experiences, titles, or skills.\n"
            "2. Ensure everything recommended is strictly aligned and grounded in the provided resume data.\n"
            "3. Return the output as a valid JSON object matching the requested schema. No markdown formatting outside of JSON code block."
        )

        original_profile = request.profile_data.model_dump()
        user_prompt = (
            f"Candidate Resume Data:\n{resume_content}\n\n"
            f"Current LinkedIn Profile:\n{json.dumps(original_profile)}\n\n"
            "Optimize: Headline, About, Experience wording, and suggest keyword/SEO additions.\n"
            "Return EXACTLY a JSON block with the following keys:\n"
            "{\n"
            '  "headline": "...",\n'
            '  "about": "...",\n'
            '  "experience_updates": [...],\n'
            '  "optimization_score": 85,\n'
            '  "recommendations": ["Recommendation 1", "Recommendation 2"]\n'
            "}"
        )

        ai_provider = get_ai_provider()
        raw_response = await ai_provider.complete(
            prompt=user_prompt,
            system_prompt=system_prompt,
            temperature=0.3
        )

        # Parse JSON block
        try:
            # strip markdown wraps if present
            cleaned = str(raw_response).strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            parsed = json.loads(cleaned)
        except Exception:
            # Fallback output
            parsed = {
                "headline": original_profile.get("headline") or "Experienced Professional",
                "about": original_profile.get("about") or "Professional profile details.",
                "experience_updates": [],
                "optimization_score": 70,
                "recommendations": ["Improve profile photo", "Add skills list to about section"]
            }

        # Save to DB
        opt_obj = await linkedin_optimization_repository.create(
            db,
            obj_in={
                "user_id": user_id,
                "resume_id": request.resume_id,
                "original_profile": original_profile,
                "optimized_profile": {
                    "headline": parsed.get("headline"),
                    "about": parsed.get("about"),
                    "experience_updates": parsed.get("experience_updates")
                },
                "optimization_score": parsed.get("optimization_score", 70),
                "recommendations": {"items": parsed.get("recommendations", [])},
                "status": "complete"
            }
        )

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="success",
                title="LinkedIn Profile Analyzed",
                body=f"Your LinkedIn profile optimization is complete. Score: {opt_obj.optimization_score}/100.",
                action_url="/linkedin"
            )
        )
        return opt_obj

    async def get_by_user_id(self, db: AsyncSession, user_id: uuid.UUID) -> list[LinkedInOptimization]:
        return await linkedin_optimization_repository.get_by_user_id(db, user_id)

    async def get_by_id(self, db: AsyncSession, id: uuid.UUID, user_id: uuid.UUID) -> LinkedInOptimization | None:
        opt = await linkedin_optimization_repository.get(db, id)
        if opt and opt.user_id == user_id:
            return opt
        return None


linkedin_service = LinkedInService()

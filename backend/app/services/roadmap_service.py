"""Roadmap Service class."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_ai_provider
from app.db.models.roadmap import Roadmap
from app.repositories.profile import profile_repository
from app.repositories.roadmap import roadmap_repository
from app.schemas.notification import NotificationCreate
from app.schemas.roadmap import RoadmapGenerateRequest, RoadmapProgressUpdate
from app.services.notification_service import notification_service


class RoadmapService:
    async def generate_roadmap(
        self, db: AsyncSession, *, user_id: uuid.UUID, request: RoadmapGenerateRequest
    ) -> Roadmap:
        # Fetch profile for skills/experience context
        profile = await profile_repository.get_by_user_id(db, user_id)
        current_skills = profile.skills if profile and profile.skills else []

        system_prompt = (
            "You are a professional technical career mentor.\n"
            "Build a personalized skills development roadmap for a candidate "
            "transitioning from their current skills to a target role.\n"
            "Identify the skill gaps and outline a list of 4 concrete milestones.\n"
            "Return EXACTLY a valid JSON object. Do not include chat wraps."
        )

        user_prompt = (
            f"Current Skills: {json.dumps(current_skills)}\n"
            f"Target Role: {request.target_role}\n"
            f"Target Company: {request.target_company or 'Any Tech Company'}\n\n"
            "Please return a JSON matching:\n"
            "{\n"
            '  "skill_gaps": ["Skill Gap A", "Skill Gap B"],\n'
            '  "plan": [\n'
            "    {\n"
            '      "id": "m1",\n'
            '      "title": "Milestone Title",\n'
            '      "timeline": "Month 1",\n'
            '      "details": "Details about what to learn or build.",\n'
            '      "resources": ["Course link or book suggestion"]\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        ai_provider = get_ai_provider()
        raw_resp = await ai_provider.complete(
            prompt=user_prompt, system_prompt=system_prompt, temperature=0.4
        )

        try:
            cleaned = str(raw_resp).strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned.split("```json")[1].split("```")[0].strip()
            elif cleaned.startswith("```"):
                cleaned = cleaned.split("```")[1].split("```")[0].strip()
            parsed = json.loads(cleaned)
        except Exception:
            parsed = {
                "skill_gaps": ["Advanced System Design", "Kubernetes & Docker"],
                "plan": [
                    {
                        "id": "m1",
                        "title": "Master Backend Scaling",
                        "timeline": "Weeks 1-4",
                        "details": "Study distributed databases and caching patterns.",
                        "resources": ["Designing Data-Intensive Applications"],
                    }
                ],
            }

        # Create Roadmap
        roadmap = await roadmap_repository.create(
            db,
            obj_in={
                "user_id": user_id,
                "target_role": request.target_role,
                "target_company": request.target_company,
                "current_skills": {"items": current_skills},
                "target_skills": {"items": parsed.get("skill_gaps", [])},
                "plan": {"items": parsed.get("plan", [])},
                "progress": {"completed": []},
                "status": "active",
            },
        )

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="success",
                title="Upskilling Roadmap Created",
                body=f"Your personalized learning path for "
                f"'{request.target_role}' has been created.",
                action_url="/roadmap",
            ),
        )
        return roadmap

    async def update_progress(
        self, db: AsyncSession, *, user_id: uuid.UUID, id: uuid.UUID, update: RoadmapProgressUpdate
    ) -> Roadmap | None:
        roadmap = await roadmap_repository.get(db, id)
        if not roadmap or roadmap.user_id != user_id:
            return None

        completed = list(roadmap.progress.get("completed", []))
        if update.is_completed:
            if update.milestone_id not in completed:
                completed.append(update.milestone_id)
        else:
            if update.milestone_id in completed:
                completed.remove(update.milestone_id)

        roadmap = await roadmap_repository.update(
            db, db_obj=roadmap, obj_in={"progress": {"completed": completed}}
        )
        return roadmap

    async def get_by_user_id(self, db: AsyncSession, user_id: uuid.UUID) -> list[Roadmap]:
        return await roadmap_repository.get_by_user_id(db, user_id)

    async def get_by_id(
        self, db: AsyncSession, id: uuid.UUID, user_id: uuid.UUID
    ) -> Roadmap | None:
        rm = await roadmap_repository.get(db, id)
        if rm and rm.user_id == user_id:
            return rm
        return None

    async def remove(self, db: AsyncSession, *, id: uuid.UUID, user_id: uuid.UUID) -> bool:
        rm = await roadmap_repository.get(db, id)
        if rm and rm.user_id == user_id:
            await roadmap_repository.remove(db, id=id)
            return True
        return False


roadmap_service = RoadmapService()

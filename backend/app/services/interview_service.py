"""Interview Preparation Service class."""

import json
import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.factory import get_ai_provider
from app.db.models.interview_session import InterviewSession
from app.repositories.interview_session import interview_session_repository
from app.repositories.job_description import job_description_repository
from app.repositories.resume import resume_repository
from app.schemas.interview_session import (
    InterviewSessionGenerateRequest,
    PracticeAnswerSubmit,
    PracticeFeedbackResponse,
)
from app.schemas.notification import NotificationCreate
from app.services.notification_service import notification_service


class InterviewService:
    async def generate_session(
        self, db: AsyncSession, *, user_id: uuid.UUID, request: InterviewSessionGenerateRequest
    ) -> InterviewSession:
        # Fetch Resume
        resume = await resume_repository.get(db, request.resume_id)
        if not resume or resume.user_id != user_id:
            raise ValueError("Resume not found.")
        resume_content = json.dumps(resume.content)

        # Fetch JD
        jd_text = ""
        if request.job_description_id:
            jd = await job_description_repository.get(db, request.job_description_id)
            if jd:
                jd_text = f"Title: {jd.title} at {jd.company}\nRequirements: {jd.raw_text}"

        system_prompt = (
            "You are an expert interviewer and technical recruiter.\n"
            "Generate 5 interview questions tailored to the " \
                "candidate's resume and target job description.\n"
            "The list must contain:\n"
            "- 2 Behavioral questions\n"
            "- 2 Technical questions\n"
            "- 1 System Design or Coding question\n"
            "Return EXACTLY a valid JSON array of questions. " \
                "Output nothing else. Do not use markdown wraps."
        )

        user_prompt = (
            f"Resume:\n{resume_content}\n\n"
            f"Target Job:\n{jd_text}\n\n"
            "Output format: Array of objects, each containing: " \
                "id (e.g. q1, q2), question (str), type (str: " \
                "behavioral/technical/system_design/coding), " \
                    "answer_hint (str), star_framework_hint (str)."
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
            # Fallback questions
            parsed = [
                {
                    "id": "q1",
                    "question": "Tell me about a challenging technical project you worked on.",
                    "type": "behavioral",
                    "answer_hint": "Focus on conflict resolution or architectural choices.",
                    "star_framework_hint": "Situation, Task, Action, Result.",
                },
                {
                    "id": "q2",
                    "question": "How do you optimize system performance under high traffic load?",
                    "type": "technical",
                    "answer_hint": "Mention caching, indexing, queue-based async architectures.",
                    "star_framework_hint": "",
                },
            ]

        # Save to DB
        session = await interview_session_repository.create(
            db,
            obj_in={
                "user_id": user_id,
                "application_id": request.application_id,
                "resume_id": request.resume_id,
                "job_description_id": request.job_description_id,
                "question_bank": {"items": parsed},
                "practice_log": {"items": []},
                "focus_areas": {"items": []},
                "overall_score": 0.0,
            },
        )

        # Trigger notification
        await notification_service.create_notification(
            db,
            obj_in=NotificationCreate(
                user_id=user_id,
                type="info",
                title="Practice Interview Ready",
                body=f"AI has generated {len(parsed)} customized " \
                    f"mock practice questions based on your resume.",
                action_url=f"/interviews/{session.id}",
            ),
        )
        return session

    async def submit_answer(
        self,
        db: AsyncSession,
        *,
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        submission: PracticeAnswerSubmit,
    ) -> PracticeFeedbackResponse:
        session = await interview_session_repository.get(db, session_id)
        if not session or session.user_id != user_id:
            raise ValueError("Session not found.")

        # Find the question in the question bank
        questions = session.question_bank.get("items", [])
        question_text = ""
        question_type = "technical"
        for q in questions:
            if q.get("id") == submission.question_id:
                question_text = q.get("question", "")
                question_type = q.get("type", "technical")
                break

        if not question_text:
            raise ValueError("Question not found in session bank.")

        system_prompt = (
            "You are an AI Interview Coach evaluating a candidate's practice answer.\n"
            "Score their answer out of 10. Be constructive but critical.\n"
            "Return EXACTLY a valid JSON object matching the " \
                "requested schema. Do not use markdown wraps."
        )

        user_prompt = (
            f"Question: {question_text}\n"
            f"Question Type: {question_type}\n"
            f"Candidate Answer: {submission.user_answer}\n\n"
            "Please return a JSON matching:\n"
            "{\n"
            '  "score": 7.5,\n'
            '  "feedback": "Your summary of their answer.",\n'
            '  "improvement_tips": "What detail was missing or how they should rephrase.",\n'
            '  "model_answer": "How a principal/lead engineer would answer this question."\n'
            "}"
        )

        ai_provider = get_ai_provider()
        raw_resp = await ai_provider.complete(
            prompt=user_prompt, system_prompt=system_prompt, temperature=0.3
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
                "score": 5.0,
                "feedback": "Answer accepted.",
                "improvement_tips": "Try structuring your answer with STAR method.",
                "model_answer": "Model answer suggestion placeholder.",
            }

        # Log practice details
        log_items = session.practice_log.get("items", [])
        log_items.append(
            {
                "question_id": submission.question_id,
                "user_answer": submission.user_answer,
                "score": parsed.get("score"),
                "feedback": parsed.get("feedback"),
                "improvement_tips": parsed.get("improvement_tips"),
                "model_answer": parsed.get("model_answer"),
            }
        )

        # Recalculate overall score
        total = sum(item.get("score", 0.0) for item in log_items)
        avg = round(total / len(log_items), 2) if log_items else 0.0

        # Update weak areas if score is low
        focus = session.focus_areas.get("items", [])
        if parsed.get("score", 10.0) < 6.5:
            focus.append(question_text)

        await interview_session_repository.update(
            db,
            db_obj=session,
            obj_in={
                "practice_log": {"items": log_items},
                "overall_score": avg,
                "focus_areas": {"items": list(set(focus))},
            },
        )

        return PracticeFeedbackResponse(
            question_id=submission.question_id,
            user_answer=submission.user_answer,
            score=parsed.get("score"),
            feedback=parsed.get("feedback"),
            improvement_tips=parsed.get("improvement_tips"),
            model_answer=parsed.get("model_answer"),
        )

    async def get_by_user_id(self, db: AsyncSession, user_id: uuid.UUID) -> list[InterviewSession]:
        return await interview_session_repository.get_by_user_id(db, user_id)

    async def get_by_id(
        self, db: AsyncSession, id: uuid.UUID, user_id: uuid.UUID
    ) -> InterviewSession | None:
        sess = await interview_session_repository.get(db, id)
        if sess and sess.user_id == user_id:
            return sess
        return None


interview_service = InterviewService()

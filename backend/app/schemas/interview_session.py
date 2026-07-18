"""InterviewSession Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class InterviewSessionGenerateRequest(BaseModel):
    resume_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    application_id: uuid.UUID | None = None


class PracticeAnswerSubmit(BaseModel):
    question_id: str
    user_answer: str


class PracticeFeedbackResponse(BaseModel):
    question_id: str
    user_answer: str
    score: float  # 0 to 10
    feedback: str
    improvement_tips: str
    model_answer: str


class InterviewSessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    application_id: uuid.UUID | None = None
    resume_id: uuid.UUID
    job_description_id: uuid.UUID | None = None
    question_bank: dict[str, Any]
    practice_log: dict[str, Any]
    focus_areas: dict[str, Any]
    overall_score: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

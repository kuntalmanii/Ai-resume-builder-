"""Tests for Interview Preparation and Answer evaluations."""
import pytest
from httpx import AsyncClient


async def _register_and_login(client: AsyncClient, email: str = "interview_test@test.com") -> str:
    await client.post("/api/v1/auth/register", json={
        "email": email,
        "password": "Password@123",
        "full_name": "Interview User"
    })
    res = await client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "Password@123"
    })
    return res.json()["access_token"]


@pytest.mark.asyncio
async def test_interview_prep_flow(client: AsyncClient) -> None:
    token = await _register_and_login(client, "interview_flow@test.com")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create a resume
    res = await client.post("/api/v1/resumes", json={"title": "Interview Resume"}, headers=headers)
    assert res.status_code == 201
    resume_id = res.json()["id"]

    # 2. Generate Practice Session
    payload = {
        "resume_id": resume_id,
        "job_description_id": None
    }
    from unittest.mock import patch
    mock_questions = '[{"id": "q1", "question": "Explain scalable backend architecture.", "type": "technical", "answer_hint": "", "star_framework_hint": ""}]'
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_questions):
        res = await client.post("/api/v1/interview-sessions/generate", json=payload, headers=headers)
    assert res.status_code == 201
    body = res.json()
    assert "question_bank" in body
    assert len(body["question_bank"]["items"]) > 0
    sess_id = body["id"]
    question_id = body["question_bank"]["items"][0]["id"]

    # 3. Get Session details
    res = await client.get(f"/api/v1/interview-sessions/{sess_id}", headers=headers)
    assert res.status_code == 200
    assert res.json()["id"] == sess_id

    # 4. List Sessions
    res = await client.get("/api/v1/interview-sessions", headers=headers)
    assert res.status_code == 200
    assert len(res.json()) >= 1

    # 5. Submit Answer Evaluation
    submit_payload = {
        "question_id": question_id,
        "user_answer": "I scalability scaled my distributed microservices using Redis clusters."
    }
    mock_evaluation = '{"score": 8.5, "feedback": "Good answer.", "improvement_tips": "None", "model_answer": "Model ans."}'
    with patch("app.ai.gemini_provider.GeminiProvider.complete", return_value=mock_evaluation):
        res = await client.post(f"/api/v1/interview-sessions/{sess_id}/practice", json=submit_payload, headers=headers)
    assert res.status_code == 200
    assert "score" in res.json()
    assert "feedback" in res.json()

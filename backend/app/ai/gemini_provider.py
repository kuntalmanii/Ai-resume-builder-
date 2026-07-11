"""Google Gemini AI provider implementation."""
import json
from typing import TypeVar

import google.generativeai as genai
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ai.provider import AIProvider
from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)

settings = get_settings()


class GeminiProvider(AIProvider):
    """Google Gemini provider via google-generativeai SDK."""

    def __init__(self) -> None:
        genai.configure(api_key=settings.AI_API_KEY)
        self._model = genai.GenerativeModel(settings.AI_MODEL)

    @property
    def model_name(self) -> str:
        return settings.AI_MODEL

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def complete(
        self,
        prompt: str,
        system_prompt: str = "",
        response_schema: type[T] | None = None,
        temperature: float = 0.3,
    ) -> str | T:
        full_prompt = f"{system_prompt}\n\n{prompt}" if system_prompt else prompt

        if response_schema:
            # Request JSON output and validate with Pydantic
            json_prompt = (
                f"{full_prompt}\n\n"
                f"Respond ONLY with valid JSON matching this schema:\n"
                f"{json.dumps(response_schema.model_json_schema(), indent=2)}"
            )
            response = self._model.generate_content(
                json_prompt,
                generation_config=genai.GenerationConfig(
                    temperature=temperature,
                    response_mime_type="application/json",
                ),
            )
            raw = response.text.strip()
            # Validate LLM output before returning — never trust raw LLM JSON
            return response_schema.model_validate_json(raw)

        response = self._model.generate_content(
            full_prompt,
            generation_config=genai.GenerationConfig(temperature=temperature),
        )
        return response.text.strip()

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def embed(self, text: str) -> list[float]:
        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="retrieval_document",
        )
        return result["embedding"]  # type: ignore[index]

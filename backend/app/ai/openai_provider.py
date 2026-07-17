"""OpenAI provider implementation."""
from typing import TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel
from tenacity import retry, stop_after_attempt, wait_exponential

from app.ai.provider import AIProvider
from app.core.config import get_settings

T = TypeVar("T", bound=BaseModel)

settings = get_settings()


class OpenAIProvider(AIProvider):
    """OpenAI provider via official async client."""

    def __init__(self) -> None:
        self._client = AsyncOpenAI(api_key=settings.AI_API_KEY)

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
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        if response_schema:
            # Use structured outputs (JSON mode)
            response = await self._client.chat.completions.create(
                model=self.model_name,
                messages=messages,  # type: ignore[arg-type]
                temperature=temperature,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content or "{}"
            # Always validate LLM output against schema
            return response_schema.model_validate_json(raw)

        response = await self._client.chat.completions.create(
            model=self.model_name,
            messages=messages,  # type: ignore[arg-type]
            temperature=temperature,
        )
        return response.choices[0].message.content or ""

    @retry(
        wait=wait_exponential(multiplier=1, min=2, max=30),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def embed(self, text: str) -> list[float]:
        response = await self._client.embeddings.create(
            model="text-embedding-3-small",
            input=text,
        )
        return response.data[0].embedding

    @property
    def provider_name(self) -> str:
        return "openai"

    async def health_check(self) -> bool:
        if not settings.AI_API_KEY or settings.AI_API_KEY == "your-ai-api-key-here":
            return False
        return True

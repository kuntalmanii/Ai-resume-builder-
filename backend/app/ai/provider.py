"""AI Provider abstraction layer."""
from abc import ABC, abstractmethod
from typing import TypeVar

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


class AIProvider(ABC):
    """Abstract base class for AI provider implementations.

    Concrete providers (Gemini, OpenAI) implement this interface.
    The rest of the application only depends on this abstraction.
    """

    @abstractmethod
    async def complete(
        self,
        prompt: str,
        system_prompt: str = "",
        response_schema: type[T] | None = None,
        temperature: float = 0.3,
    ) -> str | T:
        """Generate a completion.

        Args:
            prompt: User prompt text.
            system_prompt: System/instruction prompt.
            response_schema: If provided, parse and validate the response against this Pydantic schema.
            temperature: Sampling temperature (0=deterministic, 1=creative).

        Returns:
            If response_schema provided: validated Pydantic model instance.
            Otherwise: raw string response.
        """
        ...

    @abstractmethod
    async def embed(self, text: str) -> list[float]:
        """Generate an embedding vector for the given text."""
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Return the underlying model identifier."""
        ...

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Return the provider identifier name (e.g. gemini, openai)."""
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Perform a quick connectivity check to verify if the AI service is operational."""
        ...

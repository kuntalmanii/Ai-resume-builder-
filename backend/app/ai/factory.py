"""AI provider factory — resolves provider from config."""
from functools import lru_cache

from app.ai.provider import AIProvider
from app.core.config import get_settings


@lru_cache
def get_ai_provider() -> AIProvider:
    """Return the configured AI provider singleton."""
    settings = get_settings()

    if settings.AI_PROVIDER == "gemini":
        from app.ai.gemini_provider import GeminiProvider
        return GeminiProvider()
    elif settings.AI_PROVIDER == "openai":
        from app.ai.openai_provider import OpenAIProvider
        return OpenAIProvider()
    else:
        raise ValueError(f"Unsupported AI_PROVIDER: {settings.AI_PROVIDER}")

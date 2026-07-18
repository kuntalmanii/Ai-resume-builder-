"""Redis caching service with version-based invalidation.

Usage:
    from app.services.cache import get_cache

    cache = await get_cache()
    value = await cache.get("ats", resume_id, version=resume.version)
    if value is None:
        value = expensive_operation()
        await cache.set("ats", resume_id, version=resume.version, data=value)
    await cache.invalidate_resume(resume_id)
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# ─── Key namespaces ──────────────────────────────────────────────────────────
_NAMESPACES = frozenset(
    {
        "ats",  # ATS analysis results
        "jd_match",  # JD matching results
        "audit",  # Evidence audit results
        "preview",  # Export render-tree previews
        "template",  # Template metadata
        "rate_limit",  # Rate limiting counters
    }
)


def _make_key(namespace: str, resource_id: str, version: int | None = None) -> str:
    """Build a structured cache key."""
    parts = ["careeros", namespace, resource_id]
    if version is not None:
        parts.append(f"v{version}")
    return ":".join(parts)


class _InMemoryFallback:
    """Simple dict-backed in-process cache used when Redis is unavailable."""

    def __init__(self) -> None:
        self._store: dict[str, Any] = {}
        self._counters: dict[str, int] = {}

    async def get(self, key: str) -> Any | None:  # noqa: ANN401
        return self._store.get(key)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:  # noqa: ANN401
        self._store[key] = value

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def delete_pattern(self, pattern: str) -> int:
        import fnmatch

        matched = [k for k in list(self._store.keys()) if fnmatch.fnmatch(k, pattern)]
        for k in matched:
            del self._store[k]
        return len(matched)

    async def increment(self, key: str, ttl: int = 60) -> int:
        self._counters[key] = self._counters.get(key, 0) + 1
        return self._counters[key]

    async def ping(self) -> bool:
        return True

    async def aclose(self) -> None:
        pass


class _RedisCache:
    """Redis-backed async cache using redis.asyncio."""

    def __init__(self, client: Any) -> None:  # noqa: ANN401
        self._client = client

    async def get(self, key: str) -> Any | None:  # noqa: ANN401
        raw = await self._client.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl: int = 3600) -> None:  # noqa: ANN401
        await self._client.set(key, json.dumps(value), ex=ttl)

    async def delete(self, key: str) -> None:
        await self._client.delete(key)

    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern (e.g., 'careeros:ats:abc123:*')."""
        keys = await self._client.keys(pattern)
        if keys:
            return await self._client.delete(*keys)
        return 0

    async def increment(self, key: str, ttl: int = 60) -> int:
        count = await self._client.incr(key)
        if count == 1:
            await self._client.expire(key, ttl)
        return count

    async def ping(self) -> bool:
        try:
            return await self._client.ping()
        except Exception:
            return False

    async def aclose(self) -> None:
        await self._client.aclose()


class CacheService:
    """High-level cache service providing domain-specific helpers."""

    def __init__(self, backend: _InMemoryFallback | _RedisCache) -> None:
        self._backend = backend

    # ─── Core ops ────────────────────────────────────────────────────────────

    async def get(self, namespace: str, resource_id: str, version: int | None = None) -> Any | None:  # noqa: ANN401
        key = _make_key(namespace, resource_id, version)
        return await self._backend.get(key)

    async def set(
        self,
        namespace: str,
        resource_id: str,
        data: Any,  # noqa: ANN401
        version: int | None = None,
        ttl: int | None = None,
    ) -> None:
        key = _make_key(namespace, resource_id, version)
        ttl = ttl if ttl is not None else settings.REDIS_CACHE_TTL
        await self._backend.set(key, data, ttl=ttl)

    async def delete(self, namespace: str, resource_id: str, version: int | None = None) -> None:
        key = _make_key(namespace, resource_id, version)
        await self._backend.delete(key)

    # ─── Resume-level invalidation ────────────────────────────────────────────

    async def invalidate_resume(self, resume_id: str) -> None:
        """Invalidate ALL cached entries for a given resume across all namespaces."""
        pattern = f"careeros:*:{resume_id}:*"
        removed = await self._backend.delete_pattern(pattern)
        logger.debug("Cache invalidated %d keys for resume_id=%s", removed, resume_id)

    # ─── Rate limiting ────────────────────────────────────────────────────────

    async def rate_limit_check(self, identifier: str, limit: int, window: int) -> tuple[int, bool]:
        """
        Increment a rate-limit counter and check if limit is exceeded.

        Returns (current_count, is_exceeded).
        """
        key = f"careeros:rate_limit:{identifier}"
        count = await self._backend.increment(key, ttl=window)
        return count, count > limit

    # ─── Observability ────────────────────────────────────────────────────────

    async def ping(self) -> bool:
        return await self._backend.ping()

    async def aclose(self) -> None:
        await self._backend.aclose()


# ─── Singleton factory ────────────────────────────────────────────────────────

_cache_instance: CacheService | None = None


async def get_cache() -> CacheService:
    """Return the singleton CacheService instance (Redis or in-memory fallback)."""
    global _cache_instance  # noqa: PLW0603

    if _cache_instance is not None:
        return _cache_instance

    if settings.REDIS_ENABLED:
        try:
            import redis.asyncio as aioredis  # type: ignore[import]

            client = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await client.ping()
            _cache_instance = CacheService(_RedisCache(client))
            logger.info("Cache: Redis connected at %s", settings.REDIS_URL)
        except Exception as exc:
            logger.warning("Cache: Redis unavailable (%s) — falling back to in-memory store.", exc)
            _cache_instance = CacheService(_InMemoryFallback())
    else:
        logger.info("Cache: REDIS_ENABLED=false — using in-memory store.")
        _cache_instance = CacheService(_InMemoryFallback())

    return _cache_instance

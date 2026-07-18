"""Abstract background task queue.

Provides a clean abstraction over task queuing so the API layer
never depends directly on RQ, Celery, or any specific worker system.

Usage (enqueue from endpoint):
    from app.services.queue import get_queue

    q = await get_queue()
    task_id = await q.enqueue("resume.parse", resume_id=resume_id, user_id=user_id)

Workers are launched separately:
    rq worker --with-scheduler careeros-high careeros-default careeros-low
"""

from __future__ import annotations

import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from typing import Any

logger = logging.getLogger(__name__)


class BaseQueue(ABC):
    """Abstract task queue contract."""

    @abstractmethod
    async def enqueue(
        self,
        task_name: str,
        queue: str = "default",
        **kwargs: Any,  # noqa: ANN401
    ) -> str:
        """Enqueue a named task and return its task_id."""

    @abstractmethod
    async def ping(self) -> bool:
        """Return True if the queue backend is reachable."""


class InMemoryQueue(BaseQueue):
    """Synchronous in-process queue for development/testing.

    Tasks run immediately in a thread-pool executor so they don't
    block the event loop, but there is no persistence or retry logic.
    """

    def __init__(self) -> None:
        self._handlers: dict[str, Any] = {}
        self._loop = asyncio.get_event_loop()

    def register(self, task_name: str, fn: Any) -> None:  # noqa: ANN401
        """Register a handler function for a named task."""
        self._handlers[task_name] = fn

    async def enqueue(
        self,
        task_name: str,
        queue: str = "default",
        **kwargs: Any,  # noqa: ANN401
    ) -> str:
        task_id = str(uuid.uuid4())
        fn = self._handlers.get(task_name)
        if fn is None:
            logger.warning("InMemoryQueue: no handler registered for '%s'", task_name)
            return task_id

        async def _run() -> None:
            try:
                if asyncio.iscoroutinefunction(fn):
                    await fn(**kwargs)
                else:
                    await asyncio.get_event_loop().run_in_executor(None, lambda: fn(**kwargs))
            except Exception:
                logger.exception("InMemoryQueue: task '%s' failed (id=%s)", task_name, task_id)

        asyncio.create_task(_run())
        logger.debug("InMemoryQueue: enqueued '%s' as task_id=%s", task_name, task_id)
        return task_id

    async def ping(self) -> bool:
        return True


class RedisQueue(BaseQueue):
    """RQ (Redis Queue)-backed async task queue.

    Tasks are serialised as job JSON and executed by rq workers.
    """

    def __init__(self, redis_client: Any, default_timeout: int = 300) -> None:  # noqa: ANN401
        self._redis = redis_client
        self._timeout = default_timeout

    async def enqueue(
        self,
        task_name: str,
        queue: str = "default",
        **kwargs: Any,  # noqa: ANN401
    ) -> str:
        from rq import Queue as RQQueue  # type: ignore[import]

        task_id = str(uuid.uuid4())
        try:
            # Resolve the task function from the registered task registry
            from app.services.queue import tasks as task_registry  # type: ignore[import]

            fn = getattr(task_registry, task_name.replace(".", "_"), None)
            if fn is None:
                logger.error("RedisQueue: unknown task '%s'", task_name)
                return task_id

            rq_queue = RQQueue(f"careeros-{queue}", connection=self._redis)
            rq_queue.enqueue(fn, job_id=task_id, job_timeout=self._timeout, **kwargs)
            logger.debug(
                "RedisQueue: enqueued '%s' as job_id=%s on queue 'careeros-%s'",
                task_name,
                task_id,
                queue,
            )
        except Exception:
            logger.exception("RedisQueue.enqueue failed for task '%s'", task_name)

        return task_id

    async def ping(self) -> bool:
        try:
            await self._redis.ping()
            return True
        except Exception:
            return False


# ─── Singleton ────────────────────────────────────────────────────────────────

_queue_instance: BaseQueue | None = None


async def get_queue() -> BaseQueue:
    """Return the configured queue backend."""
    global _queue_instance  # noqa: PLW0603

    if _queue_instance is not None:
        return _queue_instance

    from app.core.config import get_settings

    settings = get_settings()

    if settings.REDIS_ENABLED:
        try:
            import redis.asyncio as aioredis  # type: ignore[import]

            client = aioredis.from_url(
                settings.REDIS_URL,
                socket_connect_timeout=2,
                socket_timeout=2,
            )
            await client.ping()
            _queue_instance = RedisQueue(client, default_timeout=settings.TASK_TIMEOUT)
            logger.info("Queue: RQ/Redis connected at %s", settings.REDIS_URL)
        except Exception as exc:
            logger.warning("Queue: Redis unavailable (%s) — falling back to InMemoryQueue.", exc)
            _queue_instance = InMemoryQueue()
    else:
        logger.info("Queue: REDIS_ENABLED=false — using InMemoryQueue.")
        _queue_instance = InMemoryQueue()

    return _queue_instance

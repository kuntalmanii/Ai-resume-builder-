"""Observability endpoints: /health, /ready, /live, /metrics.

Three standard Kubernetes-style probes:

  GET /live   — liveness: is the process alive? (never touches external deps)
  GET /ready  — readiness: can this instance serve traffic? (checks all deps)
  GET /health — alias for /ready with richer payload
"""

from __future__ import annotations

import asyncio
import os
import time
from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse

router = APIRouter(tags=["Observability"])

_STARTUP_TIME = time.time()


@router.get("/live", summary="Liveness probe")
async def liveness() -> dict[str, str]:
    """Always returns 200 as long as the process is running."""
    return {"status": "alive"}


@router.get("/ready", summary="Readiness probe")
async def readiness() -> JSONResponse:
    """Return 200 only when all critical dependencies are healthy."""
    checks = await _run_checks()
    all_ok = all(v["status"] == "ok" for v in checks.values())
    http_status = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={
            "status": "ready" if all_ok else "degraded",
            "checks": checks,
        },
    )


@router.get("/health", summary="Comprehensive health check")
async def health() -> JSONResponse:
    """Detailed health payload including uptime and version."""
    checks = await _run_checks()
    all_ok = all(v["status"] == "ok" for v in checks.values())
    http_status = status.HTTP_200_OK if all_ok else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=http_status,
        content={
            "status": "healthy" if all_ok else "unhealthy",
            "service": "CareerOS AI API",
            "version": "1.0.0",
            "uptime_seconds": round(time.time() - _STARTUP_TIME, 1),
            "checks": checks,
        },
    )


# ─── Individual checks ────────────────────────────────────────────────────────


async def _run_checks() -> dict[str, Any]:
    results = await asyncio.gather(
        _check_database(),
        _check_redis(),
        _check_storage(),
        return_exceptions=True,
    )
    return {
        "database": results[0] if not isinstance(results[0], Exception) else _err(results[0]),
        "redis": results[1] if not isinstance(results[1], Exception) else _err(results[1]),
        "storage": results[2] if not isinstance(results[2], Exception) else _err(results[2]),
    }


def _err(exc: Exception) -> dict[str, str]:
    return {"status": "error", "detail": str(exc)}


async def _check_database() -> dict[str, Any]:
    from sqlalchemy import text

    from app.db.session import AsyncSessionLocal

    try:
        start = time.perf_counter()
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "ok", "latency_ms": latency_ms}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


async def _check_redis() -> dict[str, Any]:
    from app.core.config import get_settings

    settings = get_settings()

    if not settings.REDIS_ENABLED:
        return {"status": "disabled"}

    try:
        from app.services.cache import get_cache

        start = time.perf_counter()
        cache = await get_cache()
        ok = await cache.ping()
        latency_ms = round((time.perf_counter() - start) * 1000, 2)
        return {"status": "ok" if ok else "error", "latency_ms": latency_ms}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}


async def _check_storage() -> dict[str, Any]:
    from app.core.config import get_settings

    settings = get_settings()

    try:
        export_dir = settings.PDF_EXPORT_DIR
        os.makedirs(export_dir, exist_ok=True)
        test_file = os.path.join(export_dir, ".healthcheck")
        with open(test_file, "w") as f:  # noqa: PTH123
            f.write("ok")
        os.remove(test_file)
        return {"status": "ok", "provider": settings.STORAGE_PROVIDER}
    except Exception as exc:
        return {"status": "error", "detail": str(exc)}

"""Production-grade middleware stack.

Middleware added here:
1. RequestIdMiddleware   — injects X-Request-ID + structured logging per request
2. SecurityHeadersMiddleware — injects all security HTTP headers
3. RateLimiterMiddleware  — Redis-backed (or in-memory) sliding window rate limiter
"""

from __future__ import annotations

import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("careeros.access")


# ─── 1. Request ID + Structured Access Logging ────────────────────────────────


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Inject a unique X-Request-ID and emit a structured access log per request."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        # Expose request_id to downstream handlers via request state
        request.state.request_id = request_id

        start = time.perf_counter()
        response = await call_next(request)
        duration_ms = (time.perf_counter() - start) * 1000

        # Determine authenticated user_id if available (set by auth dependency)
        user_id = getattr(request.state, "user_id", None)

        logger.info(
            "access",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "user_id": str(user_id) if user_id else None,
                "client_ip": _get_client_ip(request),
            },
        )

        response.headers["X-Request-ID"] = request_id
        return response


def _get_client_ip(request: Request) -> str:
    """Resolve the real client IP from forwarded headers or direct connection."""
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── 2. Security Headers ───────────────────────────────────────────────────────

_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com; "
    "img-src 'self' data: blob:; "
    "connect-src 'self'; "
    "frame-ancestors 'none'; "
    "base-uri 'self';"
)

_SECURITY_HEADERS: dict[str, str] = {
    "Content-Security-Policy": _CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), interest-cohort=()",
    "X-XSS-Protection": "1; mode=block",
}


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject security HTTP headers on every response."""

    # HSTS is only meaningful over HTTPS; skip in development
    def __init__(self, app: ASGIApp, enable_hsts: bool = False) -> None:
        super().__init__(app)
        self._extra: dict[str, str] = {}
        if enable_hsts:
            self._extra["Strict-Transport-Security"] = (
                "max-age=63072000; includeSubDomains; preload"
            )

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        response = await call_next(request)
        for header, value in _SECURITY_HEADERS.items():
            response.headers.setdefault(header, value)
        for header, value in self._extra.items():
            response.headers.setdefault(header, value)
        return response


# ─── 3. Rate Limiter ─────────────────────────────────────────────────────────

_PATH_LIMITS: dict[str, str] = {
    "/api/v1/auth/": "auth",
    "/api/v1/resumes/import": "upload",
    "/api/v1/exports": "export",
    "/api/v1/resumes/analyze": "ai",
    "/api/v1/resumes/match": "ai",
    "/api/v1/suggestions": "ai",
}


class RateLimiterMiddleware(BaseHTTPMiddleware):
    """Redis-backed sliding window rate limiter.

    Falls back gracefully to in-memory counting when Redis is unavailable.
    Returns 429 with a Retry-After header when limit is exceeded.
    """

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        from app.core.config import get_settings

        settings = get_settings()

        if not settings.RATE_LIMIT_ENABLED:
            return await call_next(request)

        # Skip rate limiting on health probes
        path = request.url.path
        if path in ("/health", "/ready", "/live"):
            return await call_next(request)

        # Determine which rate limit bucket applies
        bucket = "default"
        for prefix, bucket_name in _PATH_LIMITS.items():
            if path.startswith(prefix):
                bucket = bucket_name
                break

        limit_map = {
            "auth": settings.RATE_LIMIT_AUTH,
            "ai": settings.RATE_LIMIT_AI,
            "export": settings.RATE_LIMIT_EXPORT,
            "upload": settings.RATE_LIMIT_UPLOAD,
            "default": settings.RATE_LIMIT_DEFAULT,
        }
        limit = limit_map.get(bucket, settings.RATE_LIMIT_DEFAULT)
        window = settings.RATE_LIMIT_WINDOW

        client_ip = _get_client_ip(request)
        identifier = f"{bucket}:{client_ip}"

        try:
            from app.services.cache import get_cache

            cache = await get_cache()
            count, exceeded = await cache.rate_limit_check(identifier, limit, window)
        except Exception:
            # If caching completely fails, allow the request through
            logger.exception("Rate limiter cache error — allowing request through")
            return await call_next(request)

        if exceeded:
            logger.warning(
                "Rate limit exceeded: ip=%s bucket=%s count=%d limit=%d",
                client_ip,
                bucket,
                count,
                limit,
            )
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMIT_EXCEEDED",
                        "message": "Too many requests. Please slow down and try again.",
                        "details": {"limit": limit, "window_seconds": window},
                    }
                },
                headers={"Retry-After": str(window)},
            )

        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(max(0, limit - count))
        response.headers["X-RateLimit-Reset"] = str(window)
        return response

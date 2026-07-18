"""FastAPI application entry point."""

from __future__ import annotations

import logging
import logging.config
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import HTTPException, RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import router as v1_router
from app.core.config import get_settings
from app.core.exceptions import (
    CareerOSError,
    ConflictError,
    ForbiddenError,
    ResourceNotFoundError,
    UnauthorizedError,
    ValidationError,
)
from app.db.session import engine
from app.middleware import RateLimiterMiddleware, RequestIdMiddleware, SecurityHeadersMiddleware

settings = get_settings()

# ─── Structured Logging ───────────────────────────────────────────────────────

_LOG_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "logging.Formatter",
            "fmt": (
                '{"time":"%(asctime)s","level":"%(levelname)s",'
                '"logger":"%(name)s","msg":%(message)s}'
            ),
            "datefmt": "%Y-%m-%dT%H:%M:%S",
        },
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard" if settings.DEBUG else "json",
        }
    },
    "root": {
        "handlers": ["console"],
        "level": settings.LOG_LEVEL,
    },
    "loggers": {
        "careeros": {"level": settings.LOG_LEVEL, "propagate": True},
        "uvicorn.access": {
            "level": "WARNING",
            "propagate": False,
        },  # suppressed; our middleware logs instead
    },
}
logging.config.dictConfig(_LOG_CONFIG)
logger = logging.getLogger(__name__)


# ─── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup and shutdown."""
    logger.info("Starting CareerOS AI backend [env=%s]", settings.APP_ENV)
    yield
    logger.info("Shutting down CareerOS AI backend")
    await engine.dispose()


# ─── Application factory ──────────────────────────────────────────────────────


def create_application() -> FastAPI:
    app = FastAPI(
        title="CareerOS AI",
        description="AI-powered Resume Builder, Analyzer, ATS Checker & JD Matcher",
        version="1.0.0",
        docs_url="/docs" if settings.DEBUG else None,
        redoc_url="/redoc" if settings.DEBUG else None,
        openapi_url="/openapi.json" if settings.DEBUG else None,
        lifespan=lifespan,
    )

    # ─── Middleware (order matters — outermost runs first) ────────────────────
    # NOTE: Starlette applies add_middleware() in reverse insertion order.
    # We add from outermost to innermost conceptually here.

    app.add_middleware(GZipMiddleware, minimum_size=1000)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept", "X-Request-ID"],
        expose_headers=["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining"],
    )

    app.add_middleware(
        SecurityHeadersMiddleware,
        enable_hsts=(settings.APP_ENV == "production"),
    )

    app.add_middleware(RateLimiterMiddleware)
    app.add_middleware(RequestIdMiddleware)

    # ─── Root health probes (fast, no-auth, no versioning) ───────────────────
    @app.get("/health", include_in_schema=False)
    async def root_health() -> dict[str, str]:
        return {"status": "healthy", "service": "CareerOS AI API"}

    @app.get("/live", include_in_schema=False)
    async def root_liveness() -> dict[str, str]:
        return {"status": "alive"}

    # ─── Exception Handlers ──────────────────────────────────────────────────

    @app.exception_handler(CareerOSError)
    async def careeros_exception_handler(request: Request, exc: CareerOSError) -> JSONResponse:
        status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        if isinstance(exc, ResourceNotFoundError):
            status_code = status.HTTP_404_NOT_FOUND
        elif isinstance(exc, ConflictError):
            status_code = status.HTTP_409_CONFLICT
        elif isinstance(exc, ValidationError):
            status_code = status.HTTP_400_BAD_REQUEST
        elif isinstance(exc, UnauthorizedError):
            status_code = status.HTTP_401_UNAUTHORIZED
        elif isinstance(exc, ForbiddenError):
            status_code = status.HTTP_403_FORBIDDEN

        return JSONResponse(
            status_code=status_code,
            content={"error": {"code": exc.code, "message": exc.message, "details": exc.details}},
        )

    @app.exception_handler(404)
    async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=404,
            content={
                "error": {
                    "code": "NOT_FOUND",
                    "message": "The requested resource was not found.",
                    "details": None,
                }
            },
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "HTTP_EXCEPTION", "message": exc.detail, "details": None}},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        from fastapi.encoders import jsonable_encoder

        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Input validation failed",
                    "details": jsonable_encoder(exc.errors()),
                }
            },
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        logger.exception("Unhandled server error [request_id=%s]", request_id)
        # Never expose stack traces or internal detail outside DEBUG mode
        message = str(exc) if settings.DEBUG else "An unexpected error occurred."
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "error": {
                    "code": "INTERNAL_SERVER_ERROR",
                    "message": message,
                    "details": None,
                }
            },
        )

    # ─── Routers ──────────────────────────────────────────────────────────────
    app.include_router(v1_router, prefix=settings.API_V1_PREFIX)

    return app


app = create_application()

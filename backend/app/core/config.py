"""Application configuration using pydantic-settings.

This module is the SINGLE source of truth for all configuration.
Every setting must be validated here. The application MUST fail-fast
at startup when required production variables are absent or insecure.
"""

from __future__ import annotations

import sys
from functools import lru_cache
from typing import Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── Application ─────────────────────────────────────────────────────────
    APP_ENV: Literal["development", "testing", "staging", "production"] = "development"
    DEBUG: bool = False
    APP_NAME: str = "CareerOS AI"
    API_V1_PREFIX: str = "/api/v1"

    # ─── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    @field_validator("SECRET_KEY", mode="after")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        _insecure_defaults = {
            "replace-with-secure-secret",
            "your-secret-key-change-this-in-production",
            "secret",
            "changeme",
            "",
        }
        if v in _insecure_defaults:
            import logging

            logging.getLogger("careeros").warning(
                "SECURITY: Using an insecure SECRET_KEY. Set a unique 64+ char key in production."
            )
        elif len(v) < 32:
            import logging

            logging.getLogger("careeros").warning(
                "SECURITY: SECRET_KEY is shorter than 32 characters."
            )
        return v

    # ─── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str = ""

    # DB connection pool settings (ignored for SQLite)
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800  # Recycle connections every 30 min

    # ─── Redis ────────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 3600  # 1 hour default cache TTL in seconds
    REDIS_ENABLED: bool = False  # Disabled by default in dev; enable in prod

    # ─── CORS ─────────────────────────────────────────────────────────────────
    CORS_ORIGINS: str | list[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ─── AI Provider ──────────────────────────────────────────────────────────
    AI_PROVIDER: Literal["gemini", "openai"] = "gemini"
    AI_API_KEY: str = ""
    AI_MODEL: str = "gemini-1.5-pro"

    # ─── File Upload ──────────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = 10
    UPLOAD_DIR: str = "uploads"
    ALLOWED_EXTENSIONS: set[str] = {".pdf", ".docx"}
    ALLOWED_MIME_TYPES: set[str] = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    @property
    def max_upload_size_bytes(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    # ─── Storage ──────────────────────────────────────────────────────────────
    STORAGE_PROVIDER: Literal["local", "s3", "gcs", "azure"] = "local"
    STORAGE_BUCKET: str = "careeros-exports"
    # S3 / GCS / Azure settings (optional — only required if provider matches)
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_REGION: str = "us-east-1"
    GCS_CREDENTIALS_JSON: str = ""
    AZURE_STORAGE_CONNECTION_STRING: str = ""

    # ─── Rate Limiting ────────────────────────────────────────────────────────
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: int = 60  # requests per window
    RATE_LIMIT_WINDOW: int = 60  # window in seconds
    RATE_LIMIT_AUTH: int = 10  # auth endpoints per window
    RATE_LIMIT_AI: int = 20  # AI-heavy endpoints per window
    RATE_LIMIT_EXPORT: int = 10  # export endpoints per window
    RATE_LIMIT_UPLOAD: int = 5  # upload endpoint per window

    # ─── Email (placeholders for future integration) ──────────────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_ADDRESS: str = "noreply@careeros.ai"
    EMAILS_FROM_NAME: str = "CareerOS AI"

    # ─── Worker / Background Jobs ─────────────────────────────────────────────
    WORKER_CONCURRENCY: int = 4
    TASK_TIMEOUT: int = 300  # seconds before a task is considered dead

    # ─── Playwright / PDF ─────────────────────────────────────────────────────
    PLAYWRIGHT_TIMEOUT: int = 30000  # ms
    PDF_MARGIN_MM: int = 12
    PDF_EXPORT_DIR: str = "uploads/exports"

    # ─── Observability ────────────────────────────────────────────────────────
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: str = ""  # Optional — empty disables Sentry
    METRICS_ENABLED: bool = False

    @model_validator(mode="after")
    def _validate_production_requirements(self) -> Settings:
        """Fail fast if critical production settings are misconfigured."""
        if self.APP_ENV == "production":
            errors: list[str] = []

            insecure_keys = {
                "replace-with-secure-secret",
                "your-secret-key-change-this-in-production",
                "secret",
                "changeme",
                "",
            }
            if self.SECRET_KEY in insecure_keys or len(self.SECRET_KEY) < 32:
                errors.append(
                    "SECRET_KEY must be a cryptographically strong "
                    "string of at least 32 characters in production."
                )

            if not self.DATABASE_URL or "sqlite" in self.DATABASE_URL:
                errors.append(
                    "DATABASE_URL must point to a PostgreSQL instance in production (not SQLite)."
                )

            if not self.AI_API_KEY or self.AI_API_KEY in ("your-ai-api-key-here", ""):
                errors.append("AI_API_KEY must be set in production.")

            if errors:
                _msg = "\n".join(f"  - {e}" for e in errors)
                print(  # noqa: T201
                    f"\n\033[91m[CareerOS] FATAL: Production configuration errors:\n{_msg}\033[0m",
                    file=sys.stderr,
                )
                sys.exit(1)

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]

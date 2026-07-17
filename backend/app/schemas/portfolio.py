"""Portfolio Pydantic schemas."""
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class PortfolioGenerateRequest(BaseModel):
    theme: str = "minimal"
    config_overrides: dict[str, Any] | None = None


class PortfolioUpdate(BaseModel):
    theme: str | None = None
    config: dict[str, Any] | None = None
    content: dict[str, Any] | None = None
    status: str | None = None


class PortfolioResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    theme: str
    config: dict[str, Any]
    content: dict[str, Any]
    export_path: str | None = None
    published_url: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

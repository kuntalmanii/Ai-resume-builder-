"""Notification Pydantic schemas."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class NotificationCreate(BaseModel):
    user_id: uuid.UUID
    type: str  # reminder, info, alert, success
    title: str
    body: str
    metadata_json: dict[str, Any] | None = None
    action_url: str | None = None


class NotificationResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    type: str
    title: str
    body: str
    metadata_json: dict[str, Any]
    is_read: bool
    action_url: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

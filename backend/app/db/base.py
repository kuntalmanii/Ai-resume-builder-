"""SQLAlchemy declarative base and metadata registry."""

import uuid
from datetime import datetime
from typing import Annotated

from sqlalchemy import func
from sqlalchemy.orm import DeclarativeBase, mapped_column

# Reusable annotated types
intpk = Annotated[int, mapped_column(primary_key=True)]
uuidpk = Annotated[uuid.UUID, mapped_column(primary_key=True, default=uuid.uuid4)]
timestamp_now = Annotated[datetime, mapped_column(server_default=func.now())]


class Base(DeclarativeBase):
    pass

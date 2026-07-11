"""SQLAlchemy declarative base and metadata registry."""
from sqlalchemy.orm import DeclarativeBase, MappedColumn, mapped_column
from sqlalchemy import func
from datetime import datetime
from typing import Annotated
import uuid

# Reusable annotated types
intpk = Annotated[int, mapped_column(primary_key=True)]
uuidpk = Annotated[uuid.UUID, mapped_column(primary_key=True, default=uuid.uuid4)]
timestamp_now = Annotated[datetime, mapped_column(server_default=func.now())]


class Base(DeclarativeBase):
    pass

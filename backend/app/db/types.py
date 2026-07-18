"""Custom database column types for cross-dialect compatibility."""

from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import TypeDecorator


class JSONBType(TypeDecorator):
    """Column type that renders as JSONB on PostgreSQL, and JSON on SQLite/other dialects.

    This allows us to use JSONB in production (PostgreSQL) while keeping
    in-memory SQLite tests working without a live database.
    """

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())

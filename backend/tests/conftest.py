"""Pytest configuration and shared async test fixtures.

Architecture:
- Uses a separate test SQLite database via an in-memory SQLite engine.
- Each test function gets an isolated async session wrapped in a savepoint
  (SAVEPOINT / ROLLBACK TO SAVEPOINT) so tests never pollute each other.
- Overrides the `get_db` FastAPI dependency so the ASGI app uses the
  test session transparently.
"""
import os
import pathlib

# ── Load test env vars BEFORE any app modules import get_settings() ──────────
_env_test = pathlib.Path(__file__).parent.parent / ".env.test"
if _env_test.exists():
    for line in _env_test.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

from collections.abc import AsyncGenerator

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.db.base import Base

# ─── Test Engine ──────────────────────────────────────────────────────────────
# Use SQLite with aiosqlite for local testing — no Postgres required.
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

TestSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False,
)


# ─── Session-Scope Schema Setup ──────────────────────────────────────────────
@pytest_asyncio.fixture(scope="session")
async def create_test_tables():
    """Create all ORM tables once per test session, then drop them."""
    # Import all models so Base.metadata knows about them
    from app.db.models import (  # noqa: F401
        User, CareerProfile, Resume, ResumeAnalysis,
        ResumeVersion, JobDescription, AnalysisCheck,
        JobMatchResult, AISuggestion, EvidenceSource,
        ResumeImportSession,
    )
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# ─── Per-Test Transactional Session ──────────────────────────────────────────
@pytest_asyncio.fixture
async def db_session(create_test_tables) -> AsyncGenerator[AsyncSession, None]:
    """Provide a rolled-back async session for each test (no state bleed)."""
    async with test_engine.connect() as conn:
        await conn.begin()
        await conn.begin_nested()  # SAVEPOINT

        session = AsyncSession(bind=conn, expire_on_commit=False)
        try:
            yield session
        finally:
            await session.close()
            await conn.rollback()  # Roll back the SAVEPOINT + outer transaction


# ─── ASGI Test Client with DB Override ───────────────────────────────────────
@pytest_asyncio.fixture
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """ASGI test client that injects the test db_session into the app."""
    from app.main import app
    from app.db.session import get_db

    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://testserver"
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_db, None)

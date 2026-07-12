"""V1 api router aggregator."""
from fastapi import APIRouter
from app.api.v1.endpoints import auth, profile, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(profile.router)
router.include_router(users.router)

"""Portfolio API endpoints."""

import uuid

from fastapi import APIRouter, HTTPException

from app.api.dependencies import CurrentUser, DBSession
from app.schemas.portfolio import PortfolioResponse, PortfolioUpdate
from app.services.portfolio_service import portfolio_service

router = APIRouter(prefix="/portfolio", tags=["Portfolio"])


@router.get("/", response_model=PortfolioResponse)
async def get_portfolio(current_user: CurrentUser, db: DBSession) -> PortfolioResponse:
    """Get candidate portfolio draft configuration."""
    portfolio = await portfolio_service.get_or_create(db, user_id=current_user.id)
    await db.commit()
    return PortfolioResponse.model_validate(portfolio)


@router.put("/{id}", response_model=PortfolioResponse)
async def update_portfolio(
    id: uuid.UUID, payload: PortfolioUpdate, current_user: CurrentUser, db: DBSession
) -> PortfolioResponse:
    """Update portfolio styling configuration or section content."""
    portfolio = await portfolio_service.get_or_create(db, user_id=current_user.id)
    if portfolio.id != id:
        raise HTTPException(status_code=403, detail="Access denied.")

    data = payload.model_dump(exclude_unset=True)
    updated = await portfolio_service.update(db, id=id, user_id=current_user.id, updates=data)
    await db.commit()
    return PortfolioResponse.model_validate(updated)


@router.post("/{id}/export")
async def export_portfolio(id: uuid.UUID, current_user: CurrentUser, db: DBSession) -> dict:
    """Compile and export static portfolio ZIP bundle."""
    portfolio = await portfolio_service.get_or_create(db, user_id=current_user.id)
    if portfolio.id != id:
        raise HTTPException(status_code=403, detail="Access denied.")

    path = await portfolio_service.export_static_zip(db, id=id, user_id=current_user.id)
    await db.commit()
    return {"export_path": path}

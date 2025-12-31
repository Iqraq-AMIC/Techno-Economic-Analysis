# app/api/endpoints/master_data.py

import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.crud.async_biofuel_crud import (
    AsyncBiofuelCRUD,
    invalidate_master_data_cache,
    get_cache_status
)
from app.core.security import get_current_active_user
from app.models.user_project import User
from app.schemas.master_data_schema import (
    MasterDataResponse, ProcessTechnologySchema, FeedstockSchema,
    UtilitySchema, ProductSchema, CountrySchema, UnitOfMeasureSchema
)

logger = logging.getLogger(__name__)

router = APIRouter()

async def get_biofuel_crud(db: AsyncSession = Depends(get_async_db)) -> AsyncBiofuelCRUD:
    return AsyncBiofuelCRUD(db)

@router.get("/master-data", response_model=MasterDataResponse)
async def get_master_data(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all master data for frontend initialization."""
    return await crud.get_all_master_data()

@router.get("/process-technologies", response_model=list[ProcessTechnologySchema])
async def get_process_technologies(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all process technologies."""
    return await crud.get_process_technologies()

@router.get("/feedstocks", response_model=list[FeedstockSchema])
async def get_feedstocks(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all feedstocks."""
    return await crud.get_feedstocks()

@router.get("/countries", response_model=list[CountrySchema])
async def get_countries(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all countries."""
    return await crud.get_countries()

@router.get("/utilities", response_model=list[UtilitySchema])
async def get_utilities(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all utilities."""
    return await crud.get_utilities()

@router.get("/products", response_model=list[ProductSchema])
async def get_products(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all products."""
    return await crud.get_products()

@router.get("/units", response_model=list[UnitOfMeasureSchema])
async def get_units(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all units of measure."""
    return await crud.get_all_units_for_conversion()


# ==================== CACHE MANAGEMENT ENDPOINTS ====================

@router.get("/cache/status")
async def get_master_data_cache_status(
    current_user: User = Depends(get_current_active_user)
):
    """
    Get the current status of the master data cache.
    Useful for monitoring and debugging.
    """
    return get_cache_status()


@router.post("/cache/invalidate")
async def invalidate_cache(
    current_user: User = Depends(get_current_active_user)
):
    """
    Invalidate the master data cache.
    Use this after updating master data to ensure fresh data is served.

    Note: In production, consider restricting this to admin users only.
    """
    # Check if user has admin access (optional - uncomment if needed)
    # if current_user.access_level != "admin":
    #     raise HTTPException(status_code=403, detail="Admin access required")

    invalidate_master_data_cache()
    return {"message": "Master data cache invalidated successfully"}


@router.get("/master-data/fresh", response_model=MasterDataResponse)
async def get_master_data_fresh(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Get all master data bypassing the cache.
    Forces a fresh fetch from the database.
    """
    return await crud.get_all_master_data(use_cache=False)

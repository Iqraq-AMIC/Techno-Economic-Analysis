# app/api/endpoints/master_data.py

import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.schemas.biofuel_schema import (
    MasterDataResponse, ProcessTechnologySchema, FeedstockSchema,
    UtilitySchema, ProductSchema, CountrySchema, UnitOfMeasureSchema
)

logger = logging.getLogger(__name__)

router = APIRouter()

def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

@router.get("/master-data", response_model=MasterDataResponse)
def get_master_data(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all master data for frontend initialization."""
    return crud.get_all_master_data()

@router.get("/process-technologies", response_model=list[ProcessTechnologySchema])
def get_process_technologies(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all process technologies."""
    return crud.get_process_technologies()

@router.get("/feedstocks", response_model=list[FeedstockSchema])
def get_feedstocks(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all feedstocks."""
    return crud.get_feedstocks()

@router.get("/countries", response_model=list[CountrySchema])
def get_countries(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all countries."""
    return crud.get_countries()

@router.get("/utilities", response_model=list[UtilitySchema])
def get_utilities(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all utilities."""
    return crud.get_utilities()

@router.get("/products", response_model=list[ProductSchema])
def get_products(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all products."""
    return crud.get_products()

@router.get("/units", response_model=list[UnitOfMeasureSchema])
def get_units(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all units of measure."""
    return crud.get_all_units_for_conversion()
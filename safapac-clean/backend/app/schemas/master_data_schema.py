# app/schemas/master_data_schema.py

from typing import List, Optional
from pydantic import BaseModel
from app.schemas.base import CamelCaseBaseModel
# Import Unit Schema to define relationships
from .unit_schema import UnitOfMeasureSchema 

# ==================== MASTER DATA SCHEMAS (Individual Items) ====================

class ProcessTechnologySchema(CamelCaseBaseModel):
    id: int
    name: str

class CountrySchema(CamelCaseBaseModel):
    id: int
    name: str

class ProductSchema(CamelCaseBaseModel):
    id: int
    name: str

class FeedstockSchema(CamelCaseBaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float
    price_ref_usd_per_unit: float
    yield_ref: float

class UtilitySchema(CamelCaseBaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float

# ==================== MASTER DATA RESPONSE (Aggregation) ====================

class MasterDataResponse(CamelCaseBaseModel):
    processes: List[ProcessTechnologySchema]
    feedstocks: List[FeedstockSchema]
    utilities: List[UtilitySchema]
    products: List[ProductSchema]
    countries: List[CountrySchema]
    units: List[UnitOfMeasureSchema]
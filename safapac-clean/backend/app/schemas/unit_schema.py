# app/schemas/unit_schema.py

from typing import Optional
from pydantic import BaseModel
from app.schemas.base import CamelCaseBaseModel

# ==================== UNIT MANAGEMENT SCHEMAS (Lookups) ====================

class UnitGroupSchema(CamelCaseBaseModel):
    id: int
    name: str
    base_unit_name: str

class UnitConversionSchema(CamelCaseBaseModel):
    unit_id: int
    conversion_factor: float

class UnitOfMeasureSchema(CamelCaseBaseModel):
    id: int
    unit_group_id: int
    name: str
    display_name: Optional[str] = None
    group: UnitGroupSchema
    conversion: UnitConversionSchema
# app/schemas/scenario_schema.py

from typing import Any, Dict, List, Optional
from pydantic import Field
from uuid import UUID
from datetime import datetime

from app.schemas.base import CamelCaseBaseModel
# Import dependencies from other schema files
from .master_data_schema import ProcessTechnologySchema, FeedstockSchema, CountrySchema

# ==================== INPUT DATA SCHEMAS (Nested) ====================

class QuantityInputSchema(CamelCaseBaseModel):
    value: float
    unit_id: int

class ProductDataSchema(CamelCaseBaseModel):
    name: str
    price: QuantityInputSchema
    price_sensitivity_to_ci: float
    carbon_content: float
    energy_content: float
    yield_percent: float
    product_density: float

class EconomicParametersSchema(CamelCaseBaseModel):
    project_lifetime_years: int
    discount_rate_percent: float
    tci_ref_musd: Optional[float] = None
    reference_capacity_ktpa: Optional[float] = None
    tci_scaling_exponent: float
    working_capital_tci_ratio: float
    indirect_opex_tci_ratio: float

class ConversionPlantSchema(CamelCaseBaseModel):
    plant_capacity: QuantityInputSchema
    annual_load_hours: float
    ci_process_default: float

class FeedstockDataSchema(CamelCaseBaseModel):
    name: str
    price: QuantityInputSchema
    carbon_content: float
    carbon_intensity: QuantityInputSchema
    energy_content: float
    yield_percent: float

class UtilityDataSchema(CamelCaseBaseModel):
    name: str
    price: QuantityInputSchema
    carbon_content: float
    carbon_intensity: QuantityInputSchema
    energy_content: float
    yield_percent: float

class UserInputsSchema(CamelCaseBaseModel):
    """The main schema for all dynamic scenario inputs."""
    # CHANGED: These are now Integer IDs
    process_id: Optional[int] = None
    feedstock_id: Optional[int] = None
    country_id: Optional[int] = None
    
    conversion_plant: ConversionPlantSchema 
    economic_parameters: EconomicParametersSchema
    feedstock_data: List[FeedstockDataSchema]
    utility_data: List[UtilityDataSchema] 
    product_data: List[ProductDataSchema]


# ==================== SCENARIO SCHEMAS (Metadata) ====================

class ScenarioBase(CamelCaseBaseModel):
    pass

class ScenarioCreate(ScenarioBase):
    scenario_name: str = Field(..., min_length=1, max_length=100)
    process_id: int
    feedstock_id: int
    country_id: int
    user_inputs: UserInputsSchema
    scenario_order: Optional[int] = None

class ScenarioUpdate(ScenarioBase):
    scenario_name: Optional[str] = Field(None, min_length=1, max_length=100)
    user_inputs: Optional[Dict[str, Any]] = None 
    techno_economics: Optional[Dict[str, Any]] = None 
    financial_analysis: Optional[Dict[str, Any]] = None
    scenario_order: Optional[int] = None

class ScenarioResponse(ScenarioBase):
    id: UUID
    project_id: UUID
    scenario_name: str
    scenario_order: int
    process: ProcessTechnologySchema
    feedstock: FeedstockSchema
    country: CountrySchema
    created_at: datetime
    updated_at: datetime

class ScenarioDetailResponse(ScenarioResponse):
    user_inputs: Dict[str, Any]
    techno_economics: Optional[Dict[str, Any]] = None
    financial_analysis: Optional[Dict[str, Any]] = None

# ==================== CALCULATION SCHEMAS (API specific) ====================

class QuickCalculationRequest(CamelCaseBaseModel):
    # CHANGED: Top level fields now match the ID pattern
    process_id: int
    feedstock_id: int
    country_id: int
    inputs: UserInputsSchema

class CalculationResponse(CamelCaseBaseModel):
    techno_economics: Dict[str, Any]
    financials: Dict[str, Any]
    resolved_inputs: Dict[str, Any]

class ReferenceDataResponse(CamelCaseBaseModel):
    process_technology: str
    feedstock: str
    country: str
    tci_ref: float
    capacity_ref: float
    ci_process_default_gco2_mj: float
    project_lifetime_years: int
    discount_rate_percent: float
    tci_scaling_exponent: float
    working_capital_tci_ratio: float
    indirect_opex_tci_ratio: float
    annual_load_hours_ref: float
    p_steps: int
    nnp_steps: int
    feedstock_ci: float
    feedstock_carbon_content: float
    feedstock_price: float
    average_product_density_ref: float
    products: List[Dict[str, Any]]
    utilities: Dict[str, Any]

# REMOVED: The circular import and update_forward_refs call
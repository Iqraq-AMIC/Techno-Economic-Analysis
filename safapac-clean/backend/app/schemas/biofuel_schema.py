# app/schemas/biofuel_schema.py

from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from dataclasses import dataclass
from uuid import UUID
from datetime import datetime

from app.schemas.base import CamelCaseBaseModel

# ==================== CORE CALCULATION DATA CLASSES ====================

@dataclass(frozen=True)
class Quantity:
    value: float
    unit_id: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Quantity":
        return cls(value=data["value"], unit_id=data["unit_id"])

@dataclass(frozen=True)
class ProductData:
    name: str
    price: Quantity
    price_sensitivity_to_ci: float
    carbon_content: float
    energy_content: float
    yield_percent: float
    product_density: float
    
    @classmethod
    def from_schema(cls, **data) -> "ProductData":
        return cls(
            name=data["name"],
            price=Quantity.from_dict(data["price"]),
            price_sensitivity_to_ci=data["price_sensitivity_to_ci"],
            carbon_content=data["carbon_content"],
            energy_content=data["energy_content"],
            yield_percent=data["yield_percent"],
            product_density=data["product_density"],
        )

@dataclass(frozen=True)
class FeedstockData:
    name: str
    price: Quantity
    carbon_content: float
    carbon_intensity: Quantity
    energy_content: float
    yield_percent: float
    
    @classmethod
    def from_schema(cls, **data) -> "FeedstockData":
        return cls(
            name=data["name"],
            price=Quantity.from_dict(data["price"]),
            carbon_content=data["carbon_content"],
            carbon_intensity=Quantity.from_dict(data["carbon_intensity"]),
            energy_content=data["energy_content"],
            yield_percent=data["yield_percent"],
        )

@dataclass(frozen=True)
class UtilityData:
    name: str
    price: Quantity
    carbon_content: float
    carbon_intensity: Quantity
    energy_content: float
    yield_percent: float = 0.0

    @classmethod
    def from_schema(cls, **data) -> "UtilityData":
        return cls(
            name=data["name"],
            price=Quantity.from_dict(data["price"]),
            carbon_content=data["carbon_content"],
            carbon_intensity=Quantity.from_dict(data["carbon_intensity"]),
            energy_content=data["energy_content"],
            yield_percent=data.get("yield_percent", 0.0)
        )

@dataclass(frozen=True)
class EconomicParameters:
    project_lifetime_years: int
    discount_rate_percent: float
    tci_ref_musd: Optional[float]
    reference_capacity_ktpa: Optional[float]
    tci_scaling_exponent: float
    working_capital_tci_ratio: float
    indirect_opex_tci_ratio: float

@dataclass(frozen=True)
class ConversionPlant:
    plant_capacity: Quantity
    annual_load_hours: float
    ci_process_default: float

@dataclass(frozen=True)
class UserInputs:
    # Core Selections
    process_technology: str
    feedstock: str
    country: str 
    
    # Input Data Groups
    conversion_plant: ConversionPlant
    economic_parameters: EconomicParameters
    feedstock_data: List[FeedstockData]
    utility_data: List[UtilityData] 
    product_data: List[ProductData]

    def to_flat_dict(self) -> Dict[str, Union[float, str]]:
        """Convert structured inputs to flat dictionary for calculation layers."""
        flat = {}

        # Conversion Plant
        flat["plant_total_liquid_fuel_capacity"] = self.conversion_plant.plant_capacity.value
        flat["annual_load_hours"] = self.conversion_plant.annual_load_hours
        flat["ci_process_default"] = self.conversion_plant.ci_process_default
        
        # Economic Parameters
        flat["discount_rate"] = self.economic_parameters.discount_rate_percent / 100.0
        flat["project_lifetime_years"] = self.economic_parameters.project_lifetime_years
        flat["tci_scaling_exponent"] = self.economic_parameters.tci_scaling_exponent
        flat["working_capital_tci_ratio"] = self.economic_parameters.working_capital_tci_ratio
        flat["indirect_opex_tci_ratio"] = self.economic_parameters.indirect_opex_tci_ratio
        
        # Products
        flat["products"] = []
        for product in self.product_data:
            flat["products"].append({
                "name": product.name,
                "mass_fraction": product.yield_percent / 100.0,
                "product_yield": product.yield_percent / 100.0,
                "product_energy_content": product.energy_content,
                "product_carbon_content": product.carbon_content,
                "product_price": product.price.value,
                "product_price_sensitivity_ci": product.price_sensitivity_to_ci,
            })
        
        # Feedstock Data
        if self.feedstock_data:
            feedstock = self.feedstock_data[0]
            flat["feedstock_price"] = feedstock.price.value
            flat["feedstock_carbon_content"] = feedstock.carbon_content
            flat["feedstock_carbon_intensity"] = feedstock.carbon_intensity.value
            flat["feedstock_energy_content"] = feedstock.energy_content
            flat["feedstock_yield"] = feedstock.yield_percent / 100.0
        
        # Utilities
        for utility in self.utility_data:
            if utility.name.lower() == "hydrogen":
                flat["hydrogen_price"] = utility.price.value
                flat["hydrogen_yield"] = utility.yield_percent / 100.0
            elif utility.name.lower() == "electricity":
                flat["electricity_rate"] = utility.price.value / 1000.0
                flat["electricity_yield"] = utility.yield_percent / 100.0
        
        return flat

# ==================== MASTER DATA SCHEMAS ====================

class ProcessTechnologySchema(CamelCaseBaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class CountrySchema(CamelCaseBaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class ProductSchema(CamelCaseBaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

class FeedstockSchema(CamelCaseBaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float
    price_ref_usd_per_unit: float
    yield_ref: float
    class Config:
        orm_mode = True

class UtilitySchema(CamelCaseBaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float
    class Config:
        orm_mode = True

class UnitGroupSchema(CamelCaseBaseModel):
    id: int
    name: str
    base_unit_name: str
    class Config:
        orm_mode = True

class UnitConversionSchema(CamelCaseBaseModel):
    unit_id: int
    conversion_factor: float
    class Config:
        orm_mode = True

class UnitOfMeasureSchema(CamelCaseBaseModel):
    id: int
    unit_group_id: int
    name: str
    display_name: Optional[str] = None
    group: UnitGroupSchema
    conversion: UnitConversionSchema
    class Config:
        orm_mode = True

class MasterDataResponse(CamelCaseBaseModel):
    processes: List[ProcessTechnologySchema]
    feedstocks: List[FeedstockSchema]
    utilities: List[UtilitySchema]
    products: List[ProductSchema]
    countries: List[CountrySchema]
    units: List[UnitOfMeasureSchema]

# ==================== INPUT DATA SCHEMAS ====================

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
    
    class Config:
        allow_population_by_field_name = True

class EconomicParametersSchema(CamelCaseBaseModel):
    project_lifetime_years: int
    discount_rate_percent: float
    tci_ref_musd: Optional[float] = None
    reference_capacity_ktpa: Optional[float] = None
    tci_scaling_exponent: float
    working_capital_tci_ratio: float
    indirect_opex_tci_ratio: float
    
    class Config:
        allow_population_by_field_name = True

class ConversionPlantSchema(CamelCaseBaseModel):
    plant_capacity: QuantityInputSchema
    annual_load_hours: float
    ci_process_default: float
    
    class Config:
        allow_population_by_field_name = True

class FeedstockDataSchema(CamelCaseBaseModel):
    name: str
    price: QuantityInputSchema
    carbon_content: float
    carbon_intensity: QuantityInputSchema
    energy_content: float
    yield_percent: float
    
    class Config:
        allow_population_by_field_name = True

class UtilityDataSchema(CamelCaseBaseModel):
    name: str
    price: QuantityInputSchema
    carbon_content: float
    carbon_intensity: QuantityInputSchema
    energy_content: float
    yield_percent: float
    
    class Config:
        allow_population_by_field_name = True

class UserInputsSchema(CamelCaseBaseModel):
    conversion_plant: ConversionPlantSchema 
    economic_parameters: EconomicParametersSchema
    feedstock_data: List[FeedstockDataSchema]
    utility_data: List[UtilityDataSchema] 
    product_data: List[ProductDataSchema]

# ==================== PROJECT SCHEMAS ====================

class ProjectBase(CamelCaseBaseModel):
    pass

class ProjectCreate(ProjectBase):
    project_name: str = Field(..., min_length=1, max_length=100)
    initial_process_id: Optional[int] = None
    initial_feedstock_id: Optional[int] = None
    initial_country_id: Optional[int] = None

class ProjectUpdate(ProjectBase):
    project_name: Optional[str] = Field(None, min_length=1, max_length=100)
    initial_process_id: Optional[int] = None
    initial_feedstock_id: Optional[int] = None
    initial_country_id: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    project_name: str
    initial_process: Optional[ProcessTechnologySchema] = None
    initial_feedstock: Optional[FeedstockSchema] = None
    initial_country: Optional[CountrySchema] = None
    scenario_count: int = 0
    created_at: datetime
    updated_at: datetime
    class Config:
        orm_mode = True

class ProjectWithScenariosResponse(ProjectResponse):
    scenarios: List['ScenarioResponse']

# ==================== SCENARIO SCHEMAS ====================

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
    user_inputs: Optional[UserInputsSchema] = None
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
    class Config:
        orm_mode = True

class ScenarioDetailResponse(ScenarioResponse):
    user_inputs: Dict[str, Any]
    techno_economics: Optional[Dict[str, Any]] = None
    financial_analysis: Optional[Dict[str, Any]] = None

# ==================== CALCULATION SCHEMAS ====================

class QuickCalculationRequest(CamelCaseBaseModel):
    process_technology: str
    feedstock: str
    country: str
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

# ==================== AUTH SCHEMAS ====================

class LoginRequest(CamelCaseBaseModel):
    email: str = Field(..., format="email")
    password: str = Field(..., format="password")

class LoginResponse(CamelCaseBaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: UUID

# Update forward references
ProjectWithScenariosResponse.update_forward_refs()
# app/schemas/biofuel_schema.py

from typing import Any, Dict, List, Optional, Union
# root_validator removed
from pydantic import BaseModel, Field
from dataclasses import dataclass # Re-import dataclass for the core UserInputs model
from uuid import UUID

# Assuming the Quantity dataclass is defined and used for unit validation
@dataclass(frozen=True)
class Quantity:
    value: float
    unit_id: int

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Quantity":
        # Simplified for brevity, assumes robust validation happens elsewhere
        return cls(value=data["value"], unit_id=data["unit_id"])    
    
@dataclass(frozen=True)
class ProductData:
    name: str
    price: Quantity # Should be the Quantity dataclass
    price_sensitivity_to_ci: float
    carbon_content: float
    energy_content: float
    yield_percent: float
    product_density: float
    
    @classmethod
    def from_schema(cls, **data) -> "ProductData":
        return cls(
            name=data["name"],
            price=Quantity.from_dict(data["price"]), # Convert dict to Quantity
            price_sensitivity_to_ci=data["price_sensitivity_to_ci"],
            carbon_content=data["carbon_content"],
            energy_content=data["energy_content"],
            yield_percent=data["yield_percent"],
            product_density=data["product_density"],
        )
    

# Define the other nested dataclasses (FeedstockData and UtilityData)

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
            price=Quantity.from_dict(data["price"]), # Convert dict to Quantity
            carbon_content=data["carbon_content"],
            carbon_intensity=Quantity.from_dict(data["carbon_intensity"]), # Convert dict to Quantity
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
            price=Quantity.from_dict(data["price"]), # Convert dict to Quantity
            carbon_content=data["carbon_content"],
            carbon_intensity=Quantity.from_dict(data["carbon_intensity"]), # Convert dict to Quantity
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

# The main dataclass that will be imported by app/main.py and app/services/economics.py
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

         # DEBUG: Check unit conversions
        print("DEBUG: Original plant capacity:", self.conversion_plant.plant_capacity.value, "unit_id:", self.conversion_plant.plant_capacity.unit_id)
        
        # Conversion Plant - Apply unit conversion if needed
        plant_capacity_value = self.conversion_plant.plant_capacity.value
        plant_capacity_unit_id = self.conversion_plant.plant_capacity.unit_id
        
        # If unit is kt/yr (unit_id 2 or 3), convert to t/yr (unit_id 1)
        if plant_capacity_unit_id in [2, 3]:  # kt/yr or kta
            plant_capacity_value *= 1000  # Convert kt to t
            print("DEBUG: Converted plant capacity from kt to t:", plant_capacity_value)
        
        flat["plant_total_liquid_fuel_capacity"] = plant_capacity_value
        
        # Conversion Plant
        flat["plant_total_liquid_fuel_capacity"] = self.conversion_plant.plant_capacity.value
        flat["annual_load_hours"] = self.conversion_plant.annual_load_hours
        flat["ci_process_default"] = self.conversion_plant.ci_process_default
        
        # Economic Parameters
        flat["discount_rate"] = self.economic_parameters.discount_rate_percent / 100.0  # Convert % to decimal
        flat["project_lifetime_years"] = self.economic_parameters.project_lifetime_years
        flat["tci_scaling_exponent"] = self.economic_parameters.tci_scaling_exponent
        flat["working_capital_tci_ratio"] = self.economic_parameters.working_capital_tci_ratio
        flat["indirect_opex_tci_ratio"] = self.economic_parameters.indirect_opex_tci_ratio
        
        # Products - FIXED: Include products in the flat dict
        flat["products"] = []
        for product in self.product_data:
            flat["products"].append({
                "name": product.name,
                "mass_fraction": product.yield_percent / 100.0,  # Convert % to decimal
                "product_yield": product.yield_percent / 100.0,  # Convert % to decimal
                "product_energy_content": product.energy_content,
                "product_carbon_content": product.carbon_content,
                "product_price": product.price.value,
                "product_price_sensitivity_ci": product.price_sensitivity_to_ci,
            })
        
        # Feedstock Data (take first feedstock)
        if self.feedstock_data:
            feedstock = self.feedstock_data[0]
            flat["feedstock_price"] = feedstock.price.value
            flat["feedstock_carbon_content"] = feedstock.carbon_content
            flat["feedstock_carbon_intensity"] = feedstock.carbon_intensity.value
            flat["feedstock_energy_content"] = feedstock.energy_content
            flat["feedstock_yield"] = feedstock.yield_percent / 100.0  # Convert % to decimal
        
        # Utilities (Hydrogen and Electricity)
        for utility in self.utility_data:
            if utility.name.lower() == "hydrogen":
                flat["hydrogen_price"] = utility.price.value
            elif utility.name.lower() == "electricity":
                flat["electricity_rate"] = utility.price.value
            
            # Products (take first product for now)
            if self.product_data:
                product = self.product_data[0]
                flat["product_price"] = product.price.value
                flat["product_energy_content"] = product.energy_content
                flat["product_carbon_content"] = product.carbon_content
                flat["product_yield"] = product.yield_percent / 100.0  # Convert % to decimal
        
        return flat
        
# --- Master Data Schemas (for GET /master_data) ---

class ProcessTechnologySchema(BaseModel):
    id: int
    name: str

class CountrySchema(BaseModel): # NEW
    id: int
    name: str
    class Config:
        orm_mode = True

class ProductSchema(BaseModel):
    id: int
    name: str
    class Config:
        orm_mode = True

# MODIFIED: Feedstock Schema
class FeedstockSchema(BaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float
    price_ref_usd_per_unit: float
    yield_ref: float
    class Config:
        orm_mode = True

# NEW: Utility Schema
class UtilitySchema(BaseModel):
    id: int
    name: str
    carbon_content_kg_c_per_kg: float
    energy_content_mj_per_kg: float
    ci_ref_gco2e_per_mj: float
    class Config:
        orm_mode = True
        
class MasterDataResponse(BaseModel):
    processes: List[ProcessTechnologySchema]
    feedstocks: List[FeedstockSchema] 
    utilities: List[UtilitySchema] 
    products: List[ProductSchema]
    countries: List[CountrySchema] 

# ----------------------------------------------------------------------------
# CORE INPUT DATA SCHEMAS (Pydantic models for data validation/transfer)
# ----------------------------------------------------------------------------

# NEW SCHEMA: QuantityInputSchema to fix the OpenAPI display
class QuantityInputSchema(BaseModel):
    value: float
    unit_id: int

# MODIFIED: ProductData to include density
class ProductDataSchema(BaseModel):
    name: str
    price: QuantityInputSchema # CHANGED: Now consistent with other Quantity inputs
    price_sensitivity_to_ci: float
    carbon_content: float
    energy_content: float
    yield_percent: float
    product_density: float # NEW FIELD
    
    class Config:
        allow_population_by_field_name = True

# NEW SCHEMA: EconomicParametersSchema
class EconomicParametersSchema(BaseModel):
    project_lifetime_years: int
    discount_rate_percent: float
    # These can be overridden by user but typically rely on P+F+C default
    tci_ref_musd: Optional[float] = None
    reference_capacity_ktpa: Optional[float] = None
    tci_scaling_exponent: float
    working_capital_tci_ratio: float
    indirect_opex_tci_ratio: float
    
    class Config:
        allow_population_by_field_name = True


# MODIFIED SCHEMAS: Update Quantity fields to use QuantityInputSchema
class ConversionPlantSchema(BaseModel):
    plant_capacity: QuantityInputSchema # CHANGED
    annual_load_hours: float
    ci_process_default: float
    
    class Config:
        allow_population_by_field_name = True

# Assuming FeedstockDataSchema and UtilityDataSchema exist, they will now be distinct

class FeedstockDataSchema(BaseModel):
    name: str
    price: QuantityInputSchema # CHANGED
    carbon_content: float
    carbon_intensity: QuantityInputSchema # CHANGED
    energy_content: float
    yield_percent: float
    
    class Config:
        allow_population_by_field_name = True

class UtilityDataSchema(BaseModel):
    name: str
    price: QuantityInputSchema # CHANGED
    carbon_content: float
    carbon_intensity: QuantityInputSchema # CHANGED
    energy_content: float
    yield_percent: float
    
    class Config:
        allow_population_by_field_name = True

# The final top-level UserInputs Pydantic schema used for API validation
class UserInputsSchema(BaseModel):
    """
    Schema for user-editable calculation inputs. 
    Selection parameters are derived from the Project ID.
    """
    # Core Selections (REMOVED: process_technology, feedstock, country)
    
    # Input Data Groups
    conversion_plant: ConversionPlantSchema 
    economic_parameters: EconomicParametersSchema
    
    feedstock_data: List[FeedstockDataSchema]
    utility_data: List[UtilityDataSchema] 
    product_data: List[ProductDataSchema]
    
    class Config:
        # Arbitrary types is no longer needed since we removed the root_validator
        pass

# Final Request and Response Schemas used by the API Router
# Note: CalculationRequest still includes core selections for the API endpoint's logic
class CalculationRequest(BaseModel):
    process_technology: str
    feedstock: str
    country: str # NEW
    inputs: UserInputsSchema

class CalculationResponse(BaseModel):
    technoEconomics: Dict[str, Any]
    financials: Dict[str, Any]
    resolvedInputs: Dict[str, Any]

# --- Project Management Schemas ---

class ProjectBase(BaseModel):
    # This class might be empty or contain common fields
    pass

class ProjectCreate(ProjectBase):
    """
    Schema for creating a new project. 
    Uses IDs (integers) for foreign keys instead of names.
    """
    project_name: str
    # CHANGE: Use 'id' suffix and integer type for clarity and correctness
    process_technology_id: int
    feedstock_id: int
    country_id: int

class ProjectUpdate(ProjectBase):
    """Schema for updating an existing project (all fields optional)."""
    # Override fields to make them optional for updates
    project_name: Optional[str] = None
    process_technology: Optional[int] = None
    feedstock: Optional[int] = None
    country: Optional[int] = None

class ProjectSchema(ProjectBase):
    """Schema for reading/returning a project object (corresponds to ORM model)."""
    id: UUID
    user_id: UUID
    
    # Nested schemas for relationships (assuming ProcessTechnologySchema, FeedstockSchema, CountrySchema are defined)
    process: ProcessTechnologySchema
    feedstock: FeedstockSchema
    country: CountrySchema

    class Config:
        # This is critical for reading data directly from a SQLAlchemy ORM object
        orm_mode = True 

# --- Analysis Run Schemas ---

class RunCreate(BaseModel):
    """Schema for creating a new analysis run for a project."""
    run_name: Optional[str] = None
    inputs: UserInputsSchema # Assumes UserInputsSchema is already defined

class RunSchema(BaseModel):
    """Schema for reading/returning an analysis run object (corresponds to ORM model)."""
    id: UUID
    project_id: UUID
    run_name: Optional[str] = None
    
    # Saved calculation results as JSONB/Dicts
    user_inputs_json: Dict[str, Any]
    techno_economics_json: Dict[str, Any]
    financial_analysis_json: Dict[str, Any]
    
    class Config:
        orm_mode = True 

# NEW SCHEMA: UnitGroupSchema
class UnitGroupSchema(BaseModel):
    id: int
    name: str
    base_unit_name: str
    
    class Config:
        orm_mode = True

# NEW SCHEMA: UnitConversionSchema (optional, for lookup)
class UnitConversionSchema(BaseModel):
    unit_id: int
    conversion_factor: float
    
    class Config:
        orm_mode = True

# NEW SCHEMA: UnitOfMeasureSchema (The primary output schema)
class UnitOfMeasureSchema(BaseModel):
    id: int
    unit_group_id: int
    name: str
    display_name: Optional[str] = None
    
    # Nested relationships
    group: UnitGroupSchema
    conversion: UnitConversionSchema

    class Config:
        orm_mode = True
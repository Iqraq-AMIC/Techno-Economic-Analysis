# app/models/calculation_data.py

from dataclasses import dataclass
from typing import List, Dict, Any, Optional

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
    process_id: int
    feedstock_id: int
    country_id: int 
    
    # Input Data Groups
    conversion_plant: ConversionPlant
    economic_parameters: EconomicParameters
    feedstock_data: List[FeedstockData]
    utility_data: List[UtilityData] 
    product_data: List[ProductData]

    def to_flat_dict(self) -> Dict[str, Any]:
        """
        Flattens the nested dataclass structure into a single dictionary 
        expected by the calculation service layers.
        """
        flat = {}

        # Pass IDs to flat dict in case calculation layers need them
        flat["process_id"] = self.process_id
        flat["feedstock_id"] = self.feedstock_id
        flat["country_id"] = self.country_id

        # 1. Conversion Plant
        # Maps specific input names to what the calculation engine expects
        flat["plant_total_liquid_fuel_capacity"] = self.conversion_plant.plant_capacity.value
        flat["annual_load_hours"] = self.conversion_plant.annual_load_hours
        flat["ci_process_default"] = self.conversion_plant.ci_process_default

        # 2. Economic Parameters
        # Convert discount rate from percent (e.g., 7.0) to decimal (0.07) if needed
        dr_percent = self.economic_parameters.discount_rate_percent
        flat["discount_rate"] = dr_percent / 100.0 if dr_percent > 1.0 else dr_percent
        
        flat["project_lifetime_years"] = self.economic_parameters.project_lifetime_years
        flat["tci_scaling_exponent"] = self.economic_parameters.tci_scaling_exponent
        flat["working_capital_tci_ratio"] = self.economic_parameters.working_capital_tci_ratio
        flat["indirect_opex_tci_ratio"] = self.economic_parameters.indirect_opex_tci_ratio

        # 3. Feedstock Data (Taking the first feedstock as primary)
        if self.feedstock_data:
            fs = self.feedstock_data[0]
            flat["feedstock_price"] = fs.price.value
            flat["feedstock_carbon_content"] = fs.carbon_content
            flat["feedstock_carbon_intensity"] = fs.carbon_intensity.value
            flat["feedstock_energy_content"] = fs.energy_content
            # Handle yield (convert percent to ratio if > 1.0)
            feedstock_yield = fs.yield_percent
            if feedstock_yield > 1.0:
                feedstock_yield = feedstock_yield / 100.0
            flat["feedstock_yield"] = feedstock_yield 

        # 4. Utility Data (Map based on name matching)
        for util in self.utility_data:
            name_lower = util.name.lower()
            # Convert utility yield from percent to ratio if > 1.0
            util_yield = util.yield_percent
            if util_yield > 1.0:
                util_yield = util_yield / 100.0

            if "hydrogen" in name_lower:
                flat["hydrogen_price"] = util.price.value
                flat["hydrogen_carbon_intensity"] = util.carbon_intensity.value
                flat["hydrogen_yield"] = util_yield
            elif "electricity" in name_lower:
                # Price is already normalized to USD/kWh by UnitNormalizer
                flat["electricity_rate"] = util.price.value
                flat["electricity_carbon_intensity"] = util.carbon_intensity.value
                flat["electricity_yield"] = util_yield

        # 5. Product Data
        products_list = []
        for prod in self.product_data:
            # Handle yield conversion (percent to fraction) if necessary
            yield_val = prod.yield_percent
            if yield_val > 1.0: 
                yield_val = yield_val / 100.0

            products_list.append({
                "name": prod.name,
                "product_price": prod.price.value,
                "product_price_sensitivity_ci": prod.price_sensitivity_to_ci,
                "product_carbon_content": prod.carbon_content,
                "product_energy_content": prod.energy_content,
                "product_yield": yield_val,
                "mass_fraction": yield_val, # Often used interchangeably in simple models
                "product_density": prod.product_density
            })
        
        flat["products"] = products_list

        return flat
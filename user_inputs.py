from dataclasses import dataclass

@dataclass
class UserInputs:
    # Core technical/economic parameters
    production_capacity: float   # tons/year or chosen unit
    CEPCI: float                 # current CEPCI index

    # Prices
    biomass_price: float         # $/ton
    hydrogen_price: float        # $/kg
    electricity_rate: float      # $/kWh
    yearly_wage_operator: float  # $/year/operator
    product_price: float         # $/ton

    # Fixed costs
    land_cost: float             # $ (plant quotation/estimate)

    # Lifetime & finance
    plant_lifetime: int          # years
    discount_factor: float       # for NPV calculation

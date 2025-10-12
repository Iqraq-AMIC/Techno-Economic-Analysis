from dataclasses import dataclass

@dataclass
class UserInputs:
    """
    User-defined input parameters for techno-economic and financial analysis.
    """

    # --- Core Technical / Economic Parameters ---
    production_capacity: float              # Plant Total Liquid Fuel Capacity (tons/year)
    feedstock_price: float                  # Feedstock Price ($/ton)
    hydrogen_price: float                   # Hydrogen Price ($/kg)
    electricity_rate: float                 # Electricity Rate ($/kWh)

    # --- Carbon & Energy Parameters ---
    feedstock_carbon_intensity: float       # Feedstock Carbon Intensity (gCO2/MJ)
    product_energy_content: float           # Product Energy Content (MJ/kg)
    feedstock_carbon_content: float         # Feedstock Carbon Content (fraction, 0–1)

    # --- Product & Market ---
    product_price: float                    # Product Price ($/ton)

    # --- Financial Parameters ---
    plant_lifetime: int                     # Project Lifetime (years)
    discount_factor: float                  # Discount Rate (as decimal, e.g. 0.07 for 7%)
    land_cost: float                        # Land Cost ($)

    # --- Optional / Legacy Fields (for backward compatibility) ---
    CEPCI: float = 800.0                    # Chemical Engineering Plant Cost Index (default)
    biomass_price: float = None             # Deprecated: use feedstock_price instead
    yearly_wage_operator: float = 0.0       # Optional: annual operator wage ($/year/operator)

    def __post_init__(self):
        """Backward compatibility for older scripts using biomass_price."""
        if self.biomass_price is not None and self.feedstock_price == 0:
            self.feedstock_price = self.biomass_price

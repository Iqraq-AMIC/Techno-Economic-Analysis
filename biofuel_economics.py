from process_technology_lib import BiofuelDatabase
from feature_calculation_v2 import Layer1, Layer2, Layer3, Layer4
from user_inputs import UserInputs


class BiofuelEconomics:
    def __init__(self, inputs: UserInputs):
        self.inputs = inputs
        self.db = BiofuelDatabase()

        # Layers
        self.layer1 = Layer1()
        self.layer2 = Layer2()
        self.layer3 = Layer3()
        self.layer4 = Layer4()

    def run(self, process_technology: str, feedstock: str, product_key: str = "jet") -> dict:
        """
        Compute full techno-economics for a selected process technology + feedstock.
        Uses the new Layer1-Layer4 architecture from feature_calculation_v2.
        """

        # Get reference data from database
        row = self.db.data[
            (self.db.data["Process Technology"] == process_technology) &
            (self.db.data["Feedstock"] == feedstock)
        ]

        if row.empty:
            raise ValueError(f"No data found for {process_technology} with {feedstock}")

        row = row.iloc[0]

        # Prepare reference data dictionary for layers
        # NOTE: TCI_ref in database is in thousands of dollars (not millions)
        # Changed from 1e6 to 1e3 to fix TCI being 1000x too large
        # Previous: row["TCI_ref"]* 1e6 gave TCI=$11.6B for 5000 ton/year plant (incorrect)
        # Current:  row["TCI_ref"]* 1e3 gives TCI=$11.6M for 5000 ton/year plant (correct)
        ref = {
            "tci_ref": row["TCI_ref"] * 1e3,
            "capacity_ref": row["Capacity_ref"],
            "yield_biomass": row["Yield_biomass"],
            "yield_h2": row["Yield_H2"],
            "yield_kwh": row["Yield_kWh"],
            "product_carbon_content": 0.75,  # Default value, can be made configurable
            "mass_fractions": row["MassFractions"],
            # Add conversion_process_ci and process_ratio with default values
            # These should ideally come from the database
            "conversion_process_ci": {
                "HEFA": 10.0, "FT-BTL": 15.0, "FT": 15.0,
                "ATJ": 12.0, "SIP": 11.0, "FT-SKA": 14.0,
                "ATJ-SPK": 12.5, "CHJ": 13.0, "HC-HEFA-SPK": 10.5,
                "ATJ-SKA": 12.8
            },
            "process_ratio": {
                "HEFA": 7.70, "FT-BTL": 5.40, "FT": 5.40,
                "ATJ": 6.50, "SIP": 5.00, "FT-SKA": 5.80,
                "ATJ-SPK": 6.50, "CHJ": 5.50, "HC-HEFA-SPK": 5.00,
                "ATJ-SKA": 6.50
            }
        }

        # Prepare inputs dictionary for layers
        inputs = {
            "plant_total_liquid_fuel_capacity": self.inputs.production_capacity,
            "feedstock_carbon_intensity": self.inputs.feedstock_carbon_intensity,
            "product_energy_content": self.inputs.product_energy_content,
            "feedstock_carbon_content": self.inputs.feedstock_carbon_content,
            "product_key": product_key,
            "process_type": process_technology,
            "feedstock_price": self.inputs.feedstock_price,
            "product_price": self.inputs.product_price,
            "hydrogen_price": self.inputs.hydrogen_price,
            "electricity_rate": self.inputs.electricity_rate,
        }

        # Run Layer 1
        layer1_results = self.layer1.compute(ref, inputs)

        # Run Layer 2
        layer2_results = self.layer2.compute(layer1_results, ref, inputs)

        # Run Layer 3 (expects list of layer2 results for multi-feedstock support)
        layer3_results = self.layer3.compute([layer2_results])

        # Run Layer 4
        layer4_results = self.layer4.compute(layer2_results, layer3_results, layer1_results)

        # Combine all results with snake_case keys for frontend consistency
        return {
            "process_technology": process_technology,
            "feedstock": feedstock,
            "total_capital_investment": layer1_results["total_capital_investment"],
            "TCI": layer1_results["total_capital_investment"],  # Keep for backward compatibility
            "production": layer1_results["production"],
            "feedstock_consumption": layer1_results["feedstock_consumption"],
            "hydrogen_consumption": layer1_results["hydrogen_consumption"],
            "electricity_consumption": layer1_results["electricity_consumption"],
            "carbon_intensity": layer4_results["carbon_intensity"],
            "carbon_conversion_efficiency_percent": layer1_results["carbon_conversion_efficiency_percent"],
            "total_opex": layer4_results["total_opex"],
            "Total OPEX": layer4_results["total_opex"],  # Keep for backward compatibility
            "total_indirect_opex": layer2_results["total_indirect_opex"],
            "total_direct_opex": layer3_results["total_direct_opex"],
            "feedstock_cost": layer2_results["feedstock_cost"],
            "hydrogen_cost": layer2_results["hydrogen_cost"],
            "electricity_cost": layer2_results["electricity_cost"],
            "revenue": layer2_results["revenue"],
            "Revenue": layer2_results["revenue"],  # Keep for backward compatibility
            "total_co2_emissions": layer4_results["total_co2_emissions"],
            "lcop": layer4_results["lcop"],
            "LCOP": layer4_results["lcop"],  # Keep for backward compatibility
            "yields": {
                "biomass": row["Yield_biomass"],
                "H2": row["Yield_H2"],
                "kWh": row["Yield_kWh"]
            },
            "mass_fractions": row["MassFractions"],
            # Additional detailed results
            "layer1_results": layer1_results,
            "layer2_results": layer2_results,
            "layer3_results": layer3_results,
            "layer4_results": layer4_results,
        }

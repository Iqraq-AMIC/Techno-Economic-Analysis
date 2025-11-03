from app.database import BiofuelDatabase
from app.feature_calculations import Layer1, Layer2, Layer3, Layer4
from app.models import UserInputs


class BiofuelEconomics:
    def __init__(self, inputs: UserInputs):
        self.inputs_structured = inputs
        self.inputs_flat = inputs.to_flat_dict()
        self.db = BiofuelDatabase()

        # Calculation layers
        self.layer1 = Layer1()
        self.layer2 = Layer2()
        self.layer3 = Layer3()
        self.layer4 = Layer4()

    def run(self, process_technology: str, feedstock: str, product_key: str = "jet") -> dict:
        """
        Compute full techno-economics for a selected process technology + feedstock.
        The structured inputs are flattened into the legacy schema and then passed
        through the existing layer stack.
        """

        # Fetch reference data for the selected process/feedstock pairing
        row = self.db.data[
            (self.db.data["Process Technology"] == process_technology) &
            (self.db.data["Feedstock"] == feedstock)
        ]

        if row.empty:
            raise ValueError(f"No data found for {process_technology} with {feedstock}")

        row = row.iloc[0]

        process_key = process_technology.upper()

        # Reference values for the calculation layers
        ref = {
            "tci_ref": row["TCI_ref"] * 1e3,
            "capacity_ref": row["Capacity_ref"],
            "yield_biomass": row["Yield_biomass"],
            "yield_h2": row["Yield_H2"],
            "yield_kwh": row["Yield_kWh"],
            "product_carbon_content": 0.75,  # Default fallback (can be overridden later)
            "mass_fractions": row["MassFractions"],
            "conversion_process_ci": {
                "HEFA": 10.0, "FT-BTL": 15.0, "FT": 15.0,
                "ATJ": 12.0, "SIP": 11.0, "FT-SKA": 14.0,
                "ATJ-SPK": 12.5, "CHJ": 13.0, "HC-HEFA-SPK": 10.5,
                "ATJ-SKA": 12.8,
            },
            "process_ratio": {
                "HEFA": 7.70, "FT-BTL": 5.40, "FT": 5.40,
                "ATJ": 6.50, "SIP": 5.00, "FT-SKA": 5.80,
                "ATJ-SPK": 6.50, "CHJ": 5.50, "HC-HEFA-SPK": 5.00,
                "ATJ-SKA": 6.50,
            },
        }

        # Override table defaults with user-specified values when supplied
        if "tci_ref" in self.inputs_flat:
            ref["tci_ref"] = self.inputs_flat["tci_ref"]
        if "capacity_ref" in self.inputs_flat:
            ref["capacity_ref"] = self.inputs_flat["capacity_ref"]

        conversion_ci_default = self.inputs_flat.get("conversion_process_ci_default")
        if conversion_ci_default is not None:
            ref["conversion_process_ci"][process_key] = conversion_ci_default

        # Prepare the inputs for the layers (start with flattened structure)
        layer_inputs = dict(self.inputs_flat)
        layer_inputs["process_type"] = process_key
        layer_inputs["product_key"] = product_key

        # Execute the layer stack
        layer1_results = self.layer1.compute(ref, layer_inputs)
        layer2_results = self.layer2.compute(layer1_results, ref, layer_inputs)
        layer3_results = self.layer3.compute([layer2_results])
        layer4_results = self.layer4.compute(layer2_results, layer3_results, layer1_results)

        product_revenue_lookup = {
            (entry.get("name") or "").strip().lower(): entry
            for entry in layer2_results.get("product_revenues", [])
        }
        enriched_products = []
        for product in layer1_results.get("products", []):
            name = (product.get("name") or "").strip()
            revenue_entry = product_revenue_lookup.get(name.lower(), {})
            enriched = dict(product)
            if revenue_entry:
                enriched["revenue"] = revenue_entry.get("revenue")
                enriched["amount_of_product"] = revenue_entry.get("amount_of_product", enriched.get("amount_of_product"))
                enriched["product_price"] = revenue_entry.get("price", enriched.get("product_price"))
            enriched_products.append(enriched)

        # Assemble response payload
        return {
            "process_technology": process_technology,
            "feedstock": feedstock,
            "total_capital_investment": layer1_results["total_capital_investment"],
            "TCI": layer1_results["total_capital_investment"],
            "production": layer1_results["production"],
            "feedstock_consumption": layer1_results["feedstock_consumption"],
            "hydrogen_consumption": layer1_results["hydrogen_consumption"],
            "electricity_consumption": layer1_results["electricity_consumption"],
            "carbon_intensity": layer4_results["carbon_intensity"],
            "carbon_conversion_efficiency_percent": layer1_results["carbon_conversion_efficiency_percent"],
            "total_opex": layer4_results["total_opex"],
            "Total OPEX": layer4_results["total_opex"],
            "total_indirect_opex": layer2_results["total_indirect_opex"],
            "total_direct_opex": layer3_results["total_direct_opex"],
            "feedstock_cost": layer2_results["feedstock_cost"],
            "hydrogen_cost": layer2_results["hydrogen_cost"],
            "electricity_cost": layer2_results["electricity_cost"],
            "revenue": layer2_results["revenue"],
            "Revenue": layer2_results["revenue"],
            "total_co2_emissions": layer4_results["total_co2_emissions"],
            "lcop": layer4_results["lcop"],
            "LCOP": layer4_results["lcop"],
            "yields": {
                "biomass": row["Yield_biomass"],
                "H2": row["Yield_H2"],
                "kWh": row["Yield_kWh"],
            },
            "mass_fractions": {
                p.get("name"): p.get("mass_fraction") for p in layer1_results.get("products", [])
            },
            "products": enriched_products,
            "product_revenues": layer2_results.get("product_revenues", []),
            "layer1_results": layer1_results,
            "layer2_results": layer2_results,
            "layer3_results": layer3_results,
            "layer4_results": layer4_results,
        }

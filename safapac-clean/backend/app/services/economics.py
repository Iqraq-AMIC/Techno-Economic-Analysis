# app/services/economics.py
from app.crud.biofuel_crud import BiofuelCRUD  # <<< New Import from CRUD layer
from app.services.feature_calculations import Layer1, Layer2, Layer3, Layer4
from app.services.data_bridge import DataBridge
from app.services.financial_analysis import FinancialAnalysis  # <<< Updated import from schemas/
from app.models.calculation_data import UserInputs

# Note: The BiofuelEconomics class now accepts the CRUD object.

class BiofuelEconomics:
    """
    Main service layer class responsible for orchestrating the calculation layers
    and fetching database reference data.
    """
    def __init__(self, inputs: UserInputs, crud: BiofuelCRUD): # <<< Accepts BiofuelCRUD instance
        self.inputs_structured = inputs
        self.inputs_flat = inputs.to_flat_dict()
        self.crud = crud  # <<< Store the CRUD instance for database access
        self.data_bridge = DataBridge()

        # Calculation layers (no change)
        self.layer1 = Layer1()
        self.layer2 = Layer2()
        self.layer3 = Layer3()
        self.layer4 = Layer4()

    def run(self, process_id: int, feedstock_id: int, country_id: int, product_key: str = "jet") -> dict:
        """
        Compute full techno-economics for a selected process technology + feedstock.
        """

        # Fetch reference data using the CRUD object, which talks to the SQLAlchemy session
        row = self.crud.get_project_reference_data(process_id, feedstock_id, country_id)
        
        if row is None:
            raise ValueError(f"No reference data found for process '{process_id}' with feedstock '{feedstock_id}'")
        
        # DEBUG: Check the structure of row before conversion
        print("DEBUG: Raw reference data structure:")
        print(f"  - Products type: {type(row.get('products'))}")
        print(f"  - Products value: {row.get('products')}")
        print(f"  - Mass fractions type: {type(row.get('mass_fractions'))}")
        print(f"  - Mass fractions value: {row.get('mass_fractions')}")

        # NEW: Convert database format to calculation format
        ref = self.data_bridge.db_to_calc_format(row)
        
        # Add process key for calculations
        ref["process_key"] = process_id
        ref["feedstock_key"] = feedstock_id

        print("DEBUG: After conversion:")
        print(f"  - Mass fractions type: {type(ref.get('mass_fractions'))}")
        print(f"  - Mass fractions value: {ref.get('mass_fractions')}")

        # DEBUG: Check what keys we have
        print("DEBUG: ref keys:", list(ref.keys()))
        print("DEBUG: ref['tci_ref']:", ref.get('tci_ref', 'MISSING'))
        print("DEBUG: ref['conversion_process_ci']:", ref.get('conversion_process_ci', 'MISSING'))
        print("DEBUG: ref['ci_process_default']:", ref.get('ci_process_default', 'MISSING'))
        print("DEBUG: inputs_flat keys:", list(self.inputs_flat.keys()))
        print("DEBUG: inputs_flat products:", self.inputs_flat.get('products', 'MISSING'))
        print("DEBUG: ref mass_fractions type:", type(ref.get('mass_fractions')))
        print("DEBUG: ref mass_fractions value:", ref.get('mass_fractions', 'MISSING'))

        # Layer 1: Core Parameters
        layer1_results = self.layer1.compute(ref, self.inputs_flat)

        # Add after layer1_results
        print("DEBUG: Production Verification:")
        print(f"  - Plant Capacity: {layer1_results.get('plant_capacity', 0):,.0f} tons/year")
        print(f"  - Product Yield: {layer1_results.get('product_yield', 0):.4f}")
        print(f"  - Actual Production: {layer1_results.get('production', 0):,.0f} tons/year")
        print(f"  - Expected Production (Capacity × Yield): {layer1_results.get('plant_capacity', 0) * layer1_results.get('product_yield', 0):,.0f} tons/year")

        # Layer 2: Cost Calculation
        layer2_results = self.layer2.compute(layer1_results, ref, self.inputs_flat)

        # Layer 3: Carbon Intensity and Emissions
        layer3_results = self.layer3.compute([layer2_results])

        # Use .get() with default to avoid errors if keys missing
        discount_rate = self.inputs_flat.get("discount_rate", 0.07)
        lifetime = self.inputs_flat.get("project_lifetime_years", 20)

        # Layer 4: Final Metrics (LCOP, Total OPEX, Total CO2)
        layer4_results = self.layer4.compute(
            layer2_results, layer3_results, layer1_results,
            discount_rate, lifetime
        )
        
        print("🔍 DEBUG YIELD CHECK:")
        print(f"   User feedstock yield: {self.inputs_flat.get('feedstock_yield')}")
        print(f"   Reference feedstock yield: {ref.get('Yield_biomass')}")
        print(f"   Final feedstock yield used: {ref.get('Yield_biomass')}")

        print("🔍 DEBUG UNIT CHECK:")
        print(f"   Plant capacity input: {self.inputs_flat['plant_total_liquid_fuel_capacity']}")
        print(f"   Expected units: KTA (thousand tons per year)")

        # DEBUG: Check what calculation results we have
        print("DEBUG: Layer1 results keys:", list(layer1_results.keys()))
        print("DEBUG: Layer4 results keys:", list(layer4_results.keys()))

        # DEBUG: Check financial inputs
        print("DEBUG: Financial Inputs - TCI:", layer1_results.get("total_capital_investment", 0))
        print("DEBUG: Financial Inputs - Revenue:", layer2_results.get("revenue", 0))
        print("DEBUG: Financial Inputs - Total OPEX:", layer4_results.get("total_opex", 0))
        print("DEBUG: Financial Inputs - Project Lifetime:", self.inputs_flat.get("project_lifetime_years", 20))
        print("DEBUG: Financial Inputs - Discount Rate:", self.inputs_flat.get("discount_rate", 0.07))

        print("DEBUG: LCOP Calculation Details:")
        print("  - Feedstock Cost:", layer2_results.get("feedstock_cost", 0))
        print("  - Hydrogen Cost:", layer2_results.get("hydrogen_cost", 0))
        print("  - Electricity Cost:", layer2_results.get("electricity_cost", 0))
        print("  - Indirect OPEX:", layer2_results.get("total_indirect_opex", 0))
        print("  - Capital Investment:", layer1_results.get("total_capital_investment", 0))
        print("  - Plant Capacity:", layer1_results.get("plant_capacity", 0))
        print("  - Discount Rate:", self.inputs_flat.get("discount_rate", 0.07))
        print("  - Project Lifetime:", self.inputs_flat.get("project_lifetime_years", 20))


        # INTEGRATE FINANCIAL ANALYSIS
        try:
            fa = FinancialAnalysis(discount_rate=discount_rate)
            
            tci_usd = layer1_results.get("total_capital_investment", 0) * 1_000_000
            annual_revenue = layer2_results.get("revenue", 0)
            annual_manufacturing_cost = layer4_results.get("total_opex", 0)
            
            # This now returns the SAFE table + your metrics
            financial_results = fa.calculate_financial_metrics(
                tci_usd, annual_revenue, annual_manufacturing_cost, int(lifetime)
            )
            
            npv = financial_results['npv']
            irr = financial_results['irr'] 
            payback = financial_results['payback_period']
            cash_flow_table = financial_results['cash_flow_schedule']
            
        except Exception as e:
            print(f"DEBUG: Financial Analysis Error: {e}")
            npv, irr, payback = 0, 0, 0
            cash_flow_table = []

        # Get product carbon metrics from Layer 2
        product_carbon_metrics = layer2_results.get("product_carbon_metrics", [])

        # Build product breakdown with carbon metrics
        product_breakdown = {}
        product_carbon_intensity = {}
        product_carbon_conversion_efficiency = {}
        product_co2_emissions = {}

        for product_metric in product_carbon_metrics:
            name = product_metric.get("name", "").lower()
            product_carbon_intensity[name] = product_metric.get("carbon_intensity_kgco2_ton", 0)
            product_carbon_conversion_efficiency[name] = product_metric.get("carbon_conversion_efficiency_percent", 0)
            product_co2_emissions[name] = product_metric.get("co2_emissions_ton_per_year", 0)

        for p in layer1_results.get("products", []):
            name = p["name"].lower()
            product_breakdown[name] = p["amount_of_product"]

        # Calculate total CO2 emissions across all products
        total_co2_emissions_products = sum(product_co2_emissions.values())

        # Restructure output
        final_result = {
            "techno_economics": {
                "process_technology": process_id,
                "feedstock": feedstock_id,
                "LCOP": layer4_results.get("lcop", 0),
                "total_capital_investment": layer1_results.get("total_capital_investment", 0),
                "production": layer1_results.get("production", 0),
                "feedstock_consumption": layer1_results.get("feedstock_consumption", 0),
                "total_opex": layer4_results.get("total_opex", 0),
                "total_co2_emissions": total_co2_emissions_products,
                "carbon_intensity": layer4_results.get("carbon_intensity", 0),
                "utility_consumption": {
                    "hydrogen": layer1_results.get("hydrogen_consumption", 0),
                    "electricity": layer1_results.get("electricity_consumption", 0)
                },
                "product_breakdown": product_breakdown,
                "carbon_conversion_efficiency": layer1_results.get("carbon_conversion_efficiency_percent", 0),
                "opex_breakdown": {
                    "feedstock": layer2_results.get("feedstock_cost", 0),
                    "hydrogen": layer2_results.get("hydrogen_cost", 0),
                    "electricity": layer2_results.get("electricity_cost", 0),
                    "indirect_opex": layer2_results.get("total_indirect_opex", 0)
                },
                # New carbon metrics (kg CO2e/ton)
                "carbon_intensity_breakdown": {
                    "feedstock": layer2_results.get("carbon_intensity_feedstock_kgco2_ton", 0),
                    "hydrogen": layer2_results.get("carbon_intensity_hydrogen_kgco2_ton", 0),
                    "electricity": layer2_results.get("carbon_intensity_electricity_kgco2_ton", 0),
                    "process": layer2_results.get("carbon_intensity_process_kgco2_ton", 0),
                    "total": layer2_results.get("carbon_intensity_total_kgco2_ton", 0)
                },
                "product_carbon_intensity": product_carbon_intensity,
                "product_carbon_conversion_efficiency": product_carbon_conversion_efficiency,
                "product_co2_emissions": product_co2_emissions,
                "total_carbon_conversion_efficiency": layer2_results.get("total_carbon_conversion_efficiency_percent", 0)
            },
            "financials": {
                "npv": npv,
                "irr": irr,
                "payback_period": payback,
                "cashFlowTable": cash_flow_table # <--- Passed safely here
            },
            "resolved_inputs": {
                "process_technology": process_id,
                "feedstock": feedstock_id,
                "country": country_id,
                "conversion_plant": self.inputs_flat,
            }
        }

        return final_result
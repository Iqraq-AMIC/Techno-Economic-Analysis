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

        # Fetch reference data using the CRUD object
        row = self.crud.get_project_reference_data(process_id, feedstock_id, country_id)
        
        if row is None:
            raise ValueError(f"No reference data found for process '{process_id}' with feedstock '{feedstock_id}'")
        
        # Convert database format to calculation format
        ref = self.data_bridge.db_to_calc_format(row)
        
        # Add process key for calculations
        ref["process_key"] = process_id
        ref["feedstock_key"] = feedstock_id

        # Layer 1: Core Parameters
        layer1_results = self.layer1.compute(ref, self.inputs_flat)

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
        
        # INTEGRATE FINANCIAL ANALYSIS
        try:
            fa = FinancialAnalysis(discount_rate=discount_rate)
            
            tci_usd = layer1_results.get("total_capital_investment", 0) * 1_000_000
            annual_revenue = layer2_results.get("revenue", 0)
            annual_manufacturing_cost = layer4_results.get("total_opex", 0)
            
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
        
        # Calculate TOTALS by summing the product breakdowns
        # This ensures Total = Jet + Diesel + Naphtha
        total_co2_emissions_products = sum(product_co2_emissions.values())
        
        # Total Carbon Intensity (kg CO2e/ton)
        # Sum of specific product intensities (since they are weighted by yield in Layer 2)
        total_carbon_intensity_sum = sum(product_carbon_intensity.values())
        
        # Total Carbon Conversion Efficiency (%)
        # Sum of specific product efficiencies (since they are weighted by yield in Layer 1/2)
        total_cce_sum = sum(product_carbon_conversion_efficiency.values())

        # --- NEW LOGIC: Prepare Revenue Breakdown ---
        product_revenue_breakdown = {}
        # layer2_results['product_revenues'] is a list of objects calculated in Layer 2
        for item in layer2_results.get("product_revenues", []):
            name = item.get("name", "").lower()
            product_revenue_breakdown[name] = item.get("revenue", 0)

        # Get Total Revenue
        total_revenue = layer2_results.get("revenue", 0)

        # Restructure output
        final_result = {
            "techno_economics": {
                "process_technology": process_id,
                "feedstock": feedstock_id,
                "LCOP": layer4_results.get("lcop", 0),
                "total_capital_investment": layer1_results.get("total_capital_investment", 0),
                "total_revenue": total_revenue,
                "product_revenue_breakdown": product_revenue_breakdown,
                "production": layer1_results.get("production", 0),
                "feedstock_consumption": layer1_results.get("feedstock_consumption", 0),
                "total_opex": layer4_results.get("total_opex", 0),
                "utility_consumption": {
                    "hydrogen": layer1_results.get("hydrogen_consumption", 0),
                    "electricity": layer1_results.get("electricity_consumption", 0)
                },
                "product_breakdown": product_breakdown,
                "opex_breakdown": {
                    "feedstock": layer2_results.get("feedstock_cost", 0),
                    "hydrogen": layer2_results.get("hydrogen_cost", 0),
                    "electricity": layer2_results.get("electricity_cost", 0),
                    "indirect_opex": layer2_results.get("total_indirect_opex", 0)
                },
                "carbon_intensity_breakdown": {
                    "feedstock": layer2_results.get("carbon_intensity_feedstock_kgco2_ton", 0),
                    "hydrogen": layer2_results.get("carbon_intensity_hydrogen_kgco2_ton", 0),
                    "electricity": layer2_results.get("carbon_intensity_electricity_kgco2_ton", 0),
                    "process": layer2_results.get("carbon_intensity_process_kgco2_ton", 0),
                    "total": layer2_results.get("carbon_intensity_total_kgco2_ton", 0)
                },
                
                # --- UPDATED FIELDS ---
                "total_co2_emissions": total_co2_emissions_products,
                "product_co2_emissions": product_co2_emissions,
                
                # Now returns the SUM of product intensities (kg CO2e/ton)
                "carbon_intensity": total_carbon_intensity_sum, 
                "product_carbon_intensity": product_carbon_intensity,
                
                # Now returns the SUM of product efficiencies (%)
                "carbon_conversion_efficiency": total_cce_sum, 
                "total_carbon_conversion_efficiency": total_cce_sum,
                "product_carbon_conversion_efficiency": product_carbon_conversion_efficiency,
            },
            "financials": {
                "npv": npv,
                "irr": irr,
                "payback_period": payback,
                "cashFlowTable": cash_flow_table
            },
            "resolved_inputs": {
                "process_technology": process_id,
                "feedstock": feedstock_id,
                "country": country_id,
                "conversion_plant": self.inputs_flat,
            }
        }

        return final_result
# app/services/economics.py
from app.crud.biofuel_crud import BiofuelCRUD  # <<< New Import from CRUD layer
from app.services.feature_calculations import Layer1, Layer2, Layer3, Layer4
from app.schemas.biofuel_schema import UserInputs
from app.services.data_bridge import DataBridge
from app.services.financial_analysis import FinancialAnalysis  # <<< Updated import from schemas/

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

    def run(self, process_technology: str, feedstock: str, country: str, product_key: str = "jet") -> dict:
        """
        Compute full techno-economics for a selected process technology + feedstock.
        """

        # Fetch reference data using the CRUD object, which talks to the SQLAlchemy session
        row = self.crud.get_project_reference_data(process_technology, feedstock, country)
        
        if row is None:
            raise ValueError(f"No reference data found for process '{process_technology}' with feedstock '{feedstock}'")

        # NEW: Convert database format to calculation format
        ref = self.data_bridge.db_to_calc_format(row)
        
        # Add process key for calculations
        ref["process_key"] = process_technology.upper()
        ref["feedstock_key"] = feedstock

        # DEBUG: Check what keys we have
        print("DEBUG: ref keys:", list(ref.keys()))
        print("DEBUG: ref['tci_ref']:", ref.get('tci_ref', 'MISSING'))
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

        # Layer 4: Final Metrics (LCOP, Total OPEX, Total CO2)
        layer4_results = self.layer4.compute(
        layer2_results, layer3_results, layer1_results,
        self.inputs_flat.get("discount_rate", 0.07), 
        self.inputs_flat.get("project_lifetime_years", 20)
    )
        
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
            # Create financial analysis instance
            fa = FinancialAnalysis(
                discount_rate=self.inputs_flat.get("discount_rate", 0.07),
                tax_rate=0.28,  # Default tax rate
                equity=0.4,     # Default equity percentage
                bank_interest=0.04,  # Default interest rate
                loan_term=10    # Default loan term
            )
            
            # Calculate financial metrics
            tci = layer1_results.get("total_capital_investment", 0)
            revenue = layer2_results.get("revenue", 0)
            total_opex = layer4_results.get("total_opex", 0)
            plant_lifetime = self.inputs_flat.get("project_lifetime_years", 20)
            
            npv = fa.npv(tci, revenue, total_opex, plant_lifetime)
            irr = fa.irr(tci, revenue, total_opex, plant_lifetime)
            payback = fa.payback_period(tci, revenue, total_opex, plant_lifetime)
            
            print("DEBUG: Financial Results - NPV:", npv)
            print("DEBUG: Financial Results - IRR:", irr)
            print("DEBUG: Financial Results - Payback:", payback)
            
        except Exception as e:
            print(f"DEBUG: Financial Analysis Error: {e}")
            npv, irr, payback = 0, 0, 0

       # Restructure the output to match API expectations
        final_result = {
            "technoEconomics": {
                "process_technology": process_technology,
                "feedstock": feedstock,
                "LCOP": layer4_results.get("lcop", 0),
                "total_capital_investment": layer1_results.get("total_capital_investment", 0),
                "production": layer1_results.get("production", 0),
                "feedstock_consumption": layer1_results.get("feedstock_consumption", 0),
                "total_opex": layer4_results.get("total_opex", 0),
                "total_co2_emissions": layer4_results.get("total_co2_emissions", 0),
                "carbon_intensity": layer4_results.get("carbon_intensity", 0),
                # Add any other techno-economic metrics you have
            },
            "financials": {
                "npv": npv,
                "irr": irr if irr else 0,
                "payback_period": payback if payback else 0,
            },
            "resolvedInputs": {
                "process_technology": process_technology,
                "feedstock": feedstock, 
                "country": country,
                "conversion_plant": self.inputs_flat,
            }
        }
        
        # DEBUG: Final check
        print("DEBUG: Final result structure keys:", list(final_result.keys()))
        
        return final_result
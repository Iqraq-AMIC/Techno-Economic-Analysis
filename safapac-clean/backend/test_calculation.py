"""
Test script to verify calculation with provided inputs
"""
import json
from app.models import UserInputs
from app.economics import BiofuelEconomics
from app.financial_analysis import FinancialAnalysis

# Input data based on provided values
input_data = {
    "inputs": {
        "plant": {
            "total_liquid_fuel_capacity": {"value": 500000, "unit": "t/yr"},
            "annual_load_hours": 8000,
            "conversion_process_carbon_intensity_default": 20,
            "process_type": "HEFA",
            "average_liquid_density": {"value": 820, "unit": "kg/m3"}
        },
        "feedstocks": [
            {
                "name": "UCO",
                "price": {"value": 930, "unit": "USD/t"},
                "carbon_content": 0.5,  # Assumed, not provided
                "carbon_intensity": {"value": 50, "unit": "gCO2/kg"},  # Assumed
                "energy_content": {"value": 37, "unit": "MJ/kg"},  # Assumed
                "yield_": {"value": 1.21, "unit": "kg/kg"}
            }
        ],
        "utilities": [
            {
                "name": "Hydrogen",
                "price": {"value": 5.4, "unit": "USD/kg"},
                "yield_": {"value": 0.042, "unit": "kg/kg"},
                "carbon_intensity": {"value": 0, "unit": "gCO2/kg"}
            },
            {
                "name": "Electricity",
                "price": {"value": 55, "unit": "USD/MWh"},
                "yield_": {"value": 0.12, "unit": "kWh/kg"},
                "carbon_intensity": {"value": 20, "unit": "gCO2/kWh"}
            }
        ],
        "products": [
            {
                "name": "Jet Fuel",
                "price": {"value": 3000, "unit": "USD/t"},
                "mass_fraction": 64,  # 64%
                "energy_content": {"value": 43.8, "unit": "MJ/kg"},
                "yield_": {"value": 0.64, "unit": "kg/kg"},
                "carbon_content": 0.847,
                "price_sensitivity_to_ci": {"value": 0.07, "unit": "USD/gCO2"}
            },
            {
                "name": "Diesel",
                "price": {"value": 1500, "unit": "USD/t"},
                "mass_fraction": 15,  # 15%
                "energy_content": {"value": 42.6, "unit": "MJ/kg"},
                "yield_": {"value": 0.15, "unit": "kg/kg"},
                "carbon_content": 0.85,
                "price_sensitivity_to_ci": {"value": 0, "unit": "USD/gCO2"}
            },
            {
                "name": "Naphtha",
                "price": {"value": 1000, "unit": "USD/t"},
                "mass_fraction": 21,  # 21%
                "energy_content": {"value": 43.4, "unit": "MJ/kg"},
                "yield_": {"value": 0.21, "unit": "kg/kg"},
                "carbon_content": 0.84,
                "price_sensitivity_to_ci": {"value": 0, "unit": "USD/gCO2"}
            }
        ],
        "economics": {
            "discount_rate": 0.07,
            "project_lifetime_years": 20,
            "tci_at_reference_capacity": {"value": 400000000, "unit": "USD"},
            "tci_scaling_exponent": 0.6,
            "reference_production_capacity": {"value": 500000, "unit": "t/yr"},
            "wc_to_tci_ratio": 0.15,
            "indirect_opex_to_tci_ratio": 0.077
        }
    },
    "process_technology": "HEFA",
    "feedstock": "UCO",
    "product_key": "jet"
}

def run_calculation():
    print("="*80)
    print("RUNNING CALCULATION WITH PROVIDED INPUTS")
    print("="*80)

    # Parse inputs using from_dict
    user_inputs = UserInputs.from_dict(input_data["inputs"])
    flat_inputs = user_inputs.to_flat_dict()

    print("\n" + "="*80)
    print("STEP 1: PARSED INPUTS")
    print("="*80)
    print(f"Plant Capacity: {flat_inputs.get('production_capacity', 'N/A')} t/yr")
    print(f"UCO Yield: {flat_inputs.get('feedstock_yield', 'N/A')} kg/kg")
    print(f"H2 Yield: {flat_inputs.get('hydrogen_yield', 'N/A')} kg/kg")
    print(f"Electricity Yield: {flat_inputs.get('electricity_yield', 'N/A')} kWh/kg")
    tci_ref = flat_inputs.get('tci_at_reference_capacity')
    print(f"TCI Reference: ${tci_ref:,.0f}" if tci_ref else "TCI Reference: N/A")
    ref_cap = flat_inputs.get('reference_production_capacity')
    print(f"Reference Capacity: {ref_cap:,.0f} t/yr" if ref_cap else "Reference Capacity: N/A")

    # Debug: print all flat_inputs keys
    print("\nAll flat_inputs keys:")
    for key in sorted(flat_inputs.keys()):
        print(f"  {key}: {flat_inputs[key]}")

    # Run economic calculations
    economics = BiofuelEconomics(user_inputs)
    techno_results = economics.run(
        process_technology=input_data["process_technology"],
        feedstock=input_data["feedstock"],
        product_key=input_data["product_key"]
    )

    print("\n" + "="*80)
    print("STEP 2: TECHNO-ECONOMIC RESULTS")
    print("="*80)

    # Production & Consumption
    print("\n--- PRODUCTION & CONSUMPTION ---")
    print(f"Total Production: {techno_results.get('production', 0):,.2f} t/yr")
    print(f"UCO Consumption: {techno_results.get('feedstock_consumption', 0):,.2f} t/yr")
    print(f"Hydrogen Consumption: {techno_results.get('hydrogen_consumption', 0):,.2f} kg/yr")
    print(f"Electricity Consumption: {techno_results.get('electricity_consumption', 0):,.2f} kWh/yr")

    # Product breakdown
    if 'products' in techno_results:
        print("\n--- PRODUCT OUTPUT BREAKDOWN ---")
        for product in techno_results['products']:
            print(f"{product['name']}: {product['amount_of_product']:,.2f} t/yr")

    # Capital & Operating Costs
    print("\n--- CAPITAL & OPERATING COSTS ---")
    print(f"Total Capital Investment: ${techno_results.get('total_capital_investment', 0):,.2f}")
    print(f"UCO Cost: ${techno_results.get('feedstock_cost', 0):,.2f}/yr")
    print(f"Hydrogen Cost: ${techno_results.get('hydrogen_cost', 0):,.2f}/yr")
    print(f"Electricity Cost: ${techno_results.get('electricity_cost', 0):,.2f}/yr")
    print(f"Total Direct OPEX: ${techno_results.get('total_direct_opex', 0):,.2f}/yr")
    print(f"Total Indirect OPEX: ${techno_results.get('total_indirect_opex', 0):,.2f}/yr")
    print(f"Total OPEX: ${techno_results.get('total_opex', 0):,.2f}/yr")

    # Revenue & Economics
    print("\n--- REVENUE & ECONOMICS ---")
    print(f"Total Revenue: ${techno_results.get('revenue', 0):,.2f}/yr")
    print(f"LCOP: ${techno_results.get('lcop', 0):,.2f}/t")

    # Calculate LCOP breakdown
    production = techno_results.get('production', 1)
    if production > 0:
        # Calculate annualized TCI using CRF
        discount_rate = flat_inputs.get('discount_rate', 0.07)
        plant_lifetime = flat_inputs.get('plant_lifetime', 20)
        tci = techno_results.get('total_capital_investment', 0)

        if discount_rate > 0:
            crf = (discount_rate * (1 + discount_rate) ** plant_lifetime) / \
                  ((1 + discount_rate) ** plant_lifetime - 1)
        else:
            crf = 1 / plant_lifetime

        annualized_tci = tci * crf
        lcop_tci = annualized_tci / production
        lcop_feedstock = techno_results.get('feedstock_cost', 0) / production
        lcop_h2 = techno_results.get('hydrogen_cost', 0) / production
        lcop_elec = techno_results.get('electricity_cost', 0) / production
        lcop_indirect = techno_results.get('total_indirect_opex', 0) / production
        lcop_total = techno_results.get('lcop', 0)

        if lcop_total > 0:
            print("\n--- LCOP BREAKDOWN ---")
            print(f"TCI (annualized): ${lcop_tci:.2f}/t ({(lcop_tci/lcop_total)*100:.2f}%)")
            print(f"UCO: ${lcop_feedstock:.2f}/t ({(lcop_feedstock/lcop_total)*100:.2f}%)")
            print(f"Hydrogen: ${lcop_h2:.2f}/t ({(lcop_h2/lcop_total)*100:.2f}%)")
            print(f"Electricity: ${lcop_elec:.2f}/t ({(lcop_elec/lcop_total)*100:.2f}%)")
            print(f"Indirect: ${lcop_indirect:.2f}/t ({(lcop_indirect/lcop_total)*100:.2f}%)")
            print(f"Total LCOP: ${lcop_total:.2f}/t")

    # Run financial analysis
    discount_rate = flat_inputs.get('discount_rate', 0.105)
    plant_lifetime = flat_inputs.get('plant_lifetime', 20)
    tci = techno_results.get('TCI', 0)
    revenue = techno_results.get('Revenue', 0)
    manufacturing_cost = techno_results.get('Total OPEX', 0)

    financial_analysis = FinancialAnalysis(discount_rate=discount_rate)

    npv = financial_analysis.npv(tci, revenue, manufacturing_cost, plant_lifetime)
    irr = financial_analysis.irr(tci, revenue, manufacturing_cost, plant_lifetime)
    payback = financial_analysis.payback_period(tci, revenue, manufacturing_cost, plant_lifetime)

    print("\n" + "="*80)
    print("STEP 3: FINANCIAL ANALYSIS RESULTS")
    print("="*80)
    print(f"NPV: ${npv:,.2f}")
    print(f"IRR: {irr*100:.2f}%")
    print(f"Payback Period: {payback} years")

    # Comparison with expected outputs
    print("\n" + "="*80)
    print("COMPARISON WITH EXPECTED OUTPUTS")
    print("="*80)

    expected = {
        "UCO Consumption": 605000,
        "Hydrogen Consumption": 21000,
        "Electricity Consumption": 60000000,
        "Jet Production": 320000,
        "Diesel Production": 75000,
        "Naphtha Production": 105000,
        "Total Production": 500000,
        "TCI": 400000000,
        "UCO Cost": 562650000,
        "Hydrogen Cost": 113400000,
        "Electricity Cost": 3300000,
        "Total Direct OPEX": 679350000,
        "Total Indirect OPEX": 30800000,
        "Total OPEX": 710150000,
        "LCOP": 1460,
        "NPV": 3495748626,
        "IRR": 96,
    }

    actual = {
        "UCO Consumption": techno_results.get('feedstock_consumption', 0),
        "Hydrogen Consumption": techno_results.get('hydrogen_consumption', 0),
        "Electricity Consumption": techno_results.get('electricity_consumption', 0),
        "Total Production": techno_results.get('production', 0),
        "TCI": techno_results.get('TCI', 0) or techno_results.get('total_capital_investment', 0),
        "UCO Cost": techno_results.get('feedstock_cost', 0),
        "Hydrogen Cost": techno_results.get('hydrogen_cost', 0),
        "Electricity Cost": techno_results.get('electricity_cost', 0),
        "Total Direct OPEX": techno_results.get('total_direct_opex', 0),
        "Total Indirect OPEX": techno_results.get('total_indirect_opex', 0),
        "Total OPEX": techno_results.get('Total OPEX', 0) or techno_results.get('total_opex', 0),
        "LCOP": techno_results.get('LCOP', 0) or techno_results.get('lcop', 0),
        "NPV": npv,
        "IRR": irr * 100,
    }

    # Add product-specific outputs
    if 'Products' in techno_results:
        for product in techno_results['Products']:
            if 'Jet' in product['name']:
                actual['Jet Production'] = product['amount']
            elif 'Diesel' in product['name']:
                actual['Diesel Production'] = product['amount']
            elif 'Naphtha' in product['name']:
                actual['Naphtha Production'] = product['amount']

    print(f"\n{'Metric':<30} {'Expected':<20} {'Actual':<20} {'Difference':<15}")
    print("-" * 85)

    for key in expected.keys():
        exp_val = expected[key]
        act_val = actual.get(key, 0)
        diff = act_val - exp_val
        diff_pct = (diff / exp_val * 100) if exp_val != 0 else 0

        print(f"{key:<30} {exp_val:>18,.2f} {act_val:>18,.2f} {diff:>12,.2f} ({diff_pct:>5.1f}%)")

    print("\n" + "="*80)

if __name__ == "__main__":
    run_calculation()

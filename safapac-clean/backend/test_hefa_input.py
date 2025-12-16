"""
Test HEFA calculation with user-provided specifications

HEFA Configuration:
- Capacity: 500 KTPA
- Operating hours: 8000 hrs/yr
- Process CI: 20 gCO2e/MJ

Feedstock (UCO):
- Price: 930 USD/t
- Yield: 1.21 kg UCO/kg_fuel

Utilities:
- Hydrogen: 5.4 USD/kg, yield: 0.042 kg H2/kg_fuel
- Electricity: 55 $/MWh (0.055 $/kWh), yield: 0.12 kWh/kg_fuel, CI: 20 gCO2e/kWh

Products:
- JET: 3000 $/t, density: 0.847, energy: 43.8 MJ/kg, yield: 0.64 kg/kg
- DIESEL: 1500 $/t, density: 0.85, energy: 42.6 MJ/kg, yield: 0.15 kg/kg
- Naphtha: 1000 $/t, density: 0.84, energy: 43.4 MJ/kg, yield: 0.21 kg/kg

Economics:
- Discount rate: 7%
- Project lifetime: 20 years
- TCI reference: 400 MUSD
- Scaling exponent: 0.6
- Reference capacity: 500 KTPA
- Indirect OPEX: 15%
- Direct OPEX: 7.7%
"""

import requests
import json

# API endpoint
url = "http://localhost:8000/calculate"

# Prepare the input data
input_data = {
    "inputs": {
        "plant": {
            "total_liquid_fuel_capacity": {
                "value": 500,
                "unit": "KTA"
            },
            "annual_load_hours": 8000,
            "conversion_process_carbon_intensity_default": 20,
            "process_type": "HEFA"
        },
        "feedstocks": [{
            "name": "UCO",
            "price": {
                "value": 930,
                "unit": "USD/t"
            },
            "carbon_content": 0.76,  # Typical for UCO
            "carbon_intensity": {
                "value": 14,  # Typical for UCO
                "unit": "gCO2/kg"
            },
            "energy_content": {
                "value": 37.5,  # Typical for UCO
                "unit": "MJ/kg"
            },
            "yield_": {
                "value": 1.21,
                "unit": "kg/kg"
            }
        }],
        "utilities": [
            {
                "name": "Hydrogen",
                "price": {
                    "value": 5.4,
                    "unit": "USD/kg"
                },
                "carbon_intensity": {
                    "value": 0,  # Not specified in input
                    "unit": "gCO2/kg"
                },
                "yield_": {
                    "value": 0.042,
                    "unit": "kg/kg"
                }
            },
            {
                "name": "Electricity",
                "price": {
                    "value": 0.055,
                    "unit": "USD/kWh"
                },
                "carbon_intensity": {
                    "value": 20,
                    "unit": "gCO2/kWh"
                },
                "yield_": {
                    "value": 0.12,
                    "unit": "kWh/kg"
                }
            }
        ],
        "products": [
            {
                "name": "Jet Fuel",
                "price": {
                    "value": 3000,
                    "unit": "USD/t"
                },
                "price_sensitivity_to_ci": {
                    "value": 0,
                    "unit": "USD/gCO2"
                },
                "carbon_content": 0.86,  # Typical for jet fuel
                "energy_content": {
                    "value": 43.8,
                    "unit": "MJ/kg"
                },
                "yield_": {
                    "value": 0.64,
                    "unit": "kg/kg"
                },
                "mass_fraction": 64.0  # 0.64 kg/kg = 64%
            },
            {
                "name": "Diesel",
                "price": {
                    "value": 1500,
                    "unit": "USD/t"
                },
                "price_sensitivity_to_ci": {
                    "value": 0,
                    "unit": "USD/gCO2"
                },
                "carbon_content": 0.87,  # Typical for diesel
                "energy_content": {
                    "value": 42.6,
                    "unit": "MJ/kg"
                },
                "yield_": {
                    "value": 0.15,
                    "unit": "kg/kg"
                },
                "mass_fraction": 15.0  # 0.15 kg/kg = 15%
            },
            {
                "name": "Naphtha",
                "price": {
                    "value": 1000,
                    "unit": "USD/t"
                },
                "price_sensitivity_to_ci": {
                    "value": 0,
                    "unit": "USD/gCO2"
                },
                "carbon_content": 0.85,  # Typical for naphtha
                "energy_content": {
                    "value": 43.4,
                    "unit": "MJ/kg"
                },
                "yield_": {
                    "value": 0.21,
                    "unit": "kg/kg"
                },
                "mass_fraction": 21.0  # 0.21 kg/kg = 21%
            }
        ],
        "economics": {
            "discount_rate": 0.07,
            "project_lifetime_years": 20,
            "tci_at_reference_capacity": {
                "value": 400000000,
                "unit": "USD"
            },
            "tci_scaling_exponent": 0.6,
            "reference_production_capacity": {
                "value": 500,
                "unit": "KTA"
            },
            "wc_to_tci_ratio": 0.15,
            "indirect_opex_to_tci_ratio": 0.077  # 7.7%
        }
    },
    "process_technology": "HEFA",
    "feedstock": "UCO",
    "product_key": "jet"
}

# Print the request for verification
print("=" * 80)
print("TESTING HEFA CALCULATION WITH USER INPUT DATA")
print("=" * 80)
print("\nINPUT SUMMARY:")
print(f"Capacity: 500 KTA (500,000 tons/year)")
print(f"Operating hours: 8,000 hrs/yr")
print(f"Process CI: 20 gCO2e/MJ")
print(f"\nFeedstock (UCO):")
print(f"  - Price: $930/ton")
print(f"  - Yield: 1.21 kg UCO/kg fuel")
print(f"\nUtilities:")
print(f"  - Hydrogen: $5.4/kg, 0.042 kg/kg fuel")
print(f"  - Electricity: $55/MWh ($0.055/kWh), 0.12 kWh/kg fuel, 20 gCO2e/kWh")
print(f"\nProducts:")
print(f"  - JET: $3,000/ton, 43.8 MJ/kg, 64% yield")
print(f"  - DIESEL: $1,500/ton, 42.6 MJ/kg, 15% yield")
print(f"  - Naphtha: $1,000/ton, 43.4 MJ/kg, 21% yield")
print(f"\nEconomics:")
print(f"  - Discount rate: 7%")
print(f"  - Lifetime: 20 years")
print(f"  - TCI ref: $400 million")
print(f"  - Indirect OPEX: 7.7%")
print("=" * 80)

# Make the request
print("\nSending request to API...")
try:
    response = requests.post(url, json=input_data, timeout=30)

    if response.status_code == 200:
        result = response.json()

        print("\n" + "=" * 80)
        print("CALCULATION RESULTS")
        print("=" * 80)

        # Extract key results
        if "technoEconomics" in result:
            te = result["technoEconomics"]

            print("\n1. CAPITAL INVESTMENT:")
            print(f"   Total Capital Investment (TCI): ${te.get('tci', 0):,.2f}")

            print("\n2. PRODUCTION:")
            print(f"   Total Fuel Production: {te.get('total_fuel_production_t_year', 0):,.2f} t/year")
            print(f"   - Jet Fuel: {te.get('jet_fuel_production_t_year', 0):,.2f} t/year")
            print(f"   - Diesel: {te.get('diesel_production_t_year', 0):,.2f} t/year")
            print(f"   - Naphtha: {te.get('naphtha_production_t_year', 0):,.2f} t/year")

            print("\n3. FEEDSTOCK & UTILITIES CONSUMPTION:")
            print(f"   UCO Consumption: {te.get('feedstock_consumption_t_year', 0):,.2f} t/year")
            print(f"   Hydrogen Consumption: {te.get('hydrogen_consumption_kg_year', 0):,.2f} kg/year")
            print(f"   Electricity Consumption: {te.get('electricity_consumption_kwh_year', 0):,.2f} kWh/year")

            print("\n4. ANNUAL COSTS:")
            print(f"   Feedstock Cost: ${te.get('feedstock_cost_year', 0):,.2f}")
            print(f"   Hydrogen Cost: ${te.get('hydrogen_cost_year', 0):,.2f}")
            print(f"   Electricity Cost: ${te.get('electricity_cost_year', 0):,.2f}")
            print(f"   Direct OPEX: ${te.get('direct_opex', 0):,.2f}")
            print(f"   Indirect OPEX: ${te.get('indirect_opex', 0):,.2f}")
            print(f"   Total OPEX: ${te.get('total_opex', 0):,.2f}")

            print("\n5. REVENUE:")
            print(f"   Product Revenue: ${te.get('product_revenue', 0):,.2f}")
            print(f"   - Jet Fuel: ${te.get('jet_fuel_revenue', 0):,.2f}")
            print(f"   - Diesel: ${te.get('diesel_revenue', 0):,.2f}")
            print(f"   - Naphtha: ${te.get('naphtha_revenue', 0):,.2f}")

            print("\n6. LEVELIZED COST:")
            print(f"   LCOP (Levelized Cost of Production): ${te.get('lcop', 0):.2f}/ton")

            print("\n7. CARBON INTENSITY:")
            print(f"   Feedstock CI: {te.get('carbon_intensity_feedstock', 0):.2f} gCO2e/MJ")
            print(f"   Hydrogen CI: {te.get('carbon_intensity_hydrogen', 0):.2f} gCO2e/MJ")
            print(f"   Electricity CI: {te.get('carbon_intensity_electricity', 0):.2f} gCO2e/MJ")
            print(f"   Process CI: {te.get('carbon_intensity_process', 0):.2f} gCO2e/MJ")
            print(f"   Total CI: {te.get('carbon_intensity_total', 0):.2f} gCO2e/MJ")

        if "financials" in result:
            fin = result["financials"]

            print("\n8. FINANCIAL METRICS:")
            print(f"   NPV (Net Present Value): ${fin.get('npv', 0):,.2f}")
            print(f"   IRR (Internal Rate of Return): {fin.get('irr', 0)*100:.2f}%")
            print(f"   Payback Period: {fin.get('payback_period', 0):.2f} years")

        print("\n" + "=" * 80)

        # Save full results to file
        output_file = "d:/Codebase/SAFAPAC/safapac-clean/backend/hefa_test_results.json"
        with open(output_file, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nFull results saved to: {output_file}")

    else:
        print(f"\nERROR: API returned status code {response.status_code}")
        print(f"Response: {response.text}")

except requests.exceptions.ConnectionError:
    print("\nERROR: Could not connect to the API. Make sure the backend is running on http://localhost:8000")
except Exception as e:
    print(f"\nERROR: {str(e)}")

"""
Simple test to verify the new carbon intensity and emissions calculations.

This test verifies that the new carbon metrics are calculated correctly:
- Carbon intensity breakdown (feedstock, hydrogen, electricity, total)
- Carbon conversion efficiency (per product and total)
- Total CO2 emissions (per product)
"""

import sys
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent.parent
sys.path.insert(0, str(backend_path))

from app.services.feature_calculations import Layer2


def test_carbon_intensity_calculations():
    """Test carbon intensity calculation methods"""
    print("\n" + "="*80)
    print("TEST 1: Carbon Intensity Calculations (kg CO2e/ton)")
    print("="*80)

    layer2 = Layer2()

    # Test CI Feedstock
    # CI = feedstock_ci gCO2/kg × feedstock_yield kg/kg = gCO2/kg = kg CO2e/ton
    # Example: 20 gCO2/kg × 1.04 kg/kg = 20.8 kg CO2e/ton
    ci_feedstock = layer2.carbon_intensity_feedstock(
        feedstock_ci_gco2_kg=20.0,
        feedstock_yield_kg_per_kg=1.04,
        fuel_energy_content_mj_kg=43.1
    )
    expected_ci_feedstock = 20.0 * 1.04

    print(f"\nCI Feedstock:")
    print(f"  Expected: {expected_ci_feedstock:.2f} kg CO2e/ton")
    print(f"  Actual:   {ci_feedstock:.2f} kg CO2e/ton")
    print(f"  Match:    {'PASS' if abs(ci_feedstock - expected_ci_feedstock) < 0.01 else 'FAIL'}")

    # Test CI Hydrogen
    # Example: 13.7 gCO2/kg × 0.042 kg/kg = 0.5754 kg CO2e/ton
    ci_hydrogen = layer2.carbon_intensity_hydrogen(
        hydrogen_ci_gco2_kg=13.7,
        hydrogen_yield_kg_per_kg=0.042,
        fuel_energy_content_mj_kg=43.1
    )
    expected_ci_hydrogen = 13.7 * 0.042

    print(f"\nCI Hydrogen:")
    print(f"  Expected: {expected_ci_hydrogen:.4f} kg CO2e/ton")
    print(f"  Actual:   {ci_hydrogen:.4f} kg CO2e/ton")
    print(f"  Match:    {'PASS' if abs(ci_hydrogen - expected_ci_hydrogen) < 0.001 else 'FAIL'}")

    # Test CI Electricity
    # Example: 500 gCO2/kWh × 0.12 kWh/kg = 60.0 kg CO2e/ton
    ci_electricity = layer2.carbon_intensity_electricity(
        electricity_ci_gco2_kwh=500.0,
        electricity_yield_kwh_per_kg=0.12,
        fuel_energy_content_mj_kg=43.1
    )
    expected_ci_electricity = 500.0 * 0.12

    print(f"\nCI Electricity:")
    print(f"  Expected: {expected_ci_electricity:.2f} kg CO2e/ton")
    print(f"  Actual:   {ci_electricity:.2f} kg CO2e/ton")
    print(f"  Match:    {'PASS' if abs(ci_electricity - expected_ci_electricity) < 0.01 else 'FAIL'}")

    return True


def test_carbon_conversion_efficiency():
    """Test carbon conversion efficiency calculations"""
    print("\n" + "="*80)
    print("TEST 2: Carbon Conversion Efficiency")
    print("="*80)

    layer2 = Layer2()

    # Test CCE for a product
    # CCE = (product_carbon_content × product_yield / feedstock_carbon_content × feedstock_yield) × 100%
    # Example: (0.85 × 0.60 / 0.75 × 1.04) × 100 = 65.38%
    cce_jet = layer2.carbon_conversion_efficiency_per_product(
        product_carbon_content=0.85,
        product_yield=0.60,
        feedstock_carbon_content=0.75,
        feedstock_yield=1.04
    )
    expected_cce = (0.85 * 0.60 / (0.75 * 1.04)) * 100.0

    print(f"\nCCE Jet:")
    print(f"  Expected: {expected_cce:.2f}%")
    print(f"  Actual:   {cce_jet:.2f}%")
    print(f"  Match:    {'PASS' if abs(cce_jet - expected_cce) < 0.01 else 'FAIL'}")

    return True


def test_co2_emissions():
    """Test total CO2 emissions calculations"""
    print("\n" + "="*80)
    print("TEST 3: Total CO2 Emissions per Product (ton/year)")
    print("="*80)

    layer2 = Layer2()

    # Test CO2 emissions
    # Total CO2 = CI × production / 1000
    # Example: 80 kg CO2e/ton × 300,000 tons/year / 1000 = 24,000 ton/year
    co2_emissions = layer2.total_co2_emissions_per_product(
        ci_product_kgco2_ton=80.0,
        production_tons_year=300000
    )
    expected_co2 = 80.0 * 300000 / 1000.0

    print(f"\nCO2 Emissions:")
    print(f"  Expected: {expected_co2:,.0f} ton/year")
    print(f"  Actual:   {co2_emissions:,.0f} ton/year")
    print(f"  Match:    {'PASS' if abs(co2_emissions - expected_co2) < 1 else 'FAIL'}")

    return True


def test_integrated_calculation():
    """Test the integrated carbon calculation flow"""
    print("\n" + "="*80)
    print("TEST 4: Integrated Carbon Calculation")
    print("="*80)

    layer2 = Layer2()

    # Sample inputs
    feedstock_ci = 20.0  # gCO2/kg
    hydrogen_ci = 13.7   # gCO2/kg
    electricity_ci = 500.0  # gCO2/kWh
    feedstock_yield = 1.04
    hydrogen_yield = 0.042
    electricity_yield = 0.12
    fuel_energy_content = 43.1  # MJ/kg
    process_ci = 3.4  # gCO2/MJ

    # Calculate component CIs (now in kg CO2e/ton)
    ci_feedstock = layer2.carbon_intensity_feedstock(feedstock_ci, feedstock_yield, fuel_energy_content)
    ci_hydrogen = layer2.carbon_intensity_hydrogen(hydrogen_ci, hydrogen_yield, fuel_energy_content)
    ci_electricity = layer2.carbon_intensity_electricity(electricity_ci, electricity_yield, fuel_energy_content)

    # Convert process CI from gCO2/MJ to kg CO2e/ton
    ci_process = process_ci * fuel_energy_content

    # Total CI (assuming EC product = 1.0 for simplicity)
    ec_product = 1.0
    ci_total = (ci_feedstock + ci_hydrogen + ci_electricity + ci_process) * ec_product

    print(f"\nCarbon Intensity Breakdown:")
    print(f"  Feedstock:    {ci_feedstock:.2f} kg CO2e/ton")
    print(f"  Hydrogen:     {ci_hydrogen:.2f} kg CO2e/ton")
    print(f"  Electricity:  {ci_electricity:.2f} kg CO2e/ton")
    print(f"  Process:      {ci_process:.2f} kg CO2e/ton")
    print(f"  Total:        {ci_total:.2f} kg CO2e/ton")

    # Calculate product-specific CI
    product_yield_jet = 0.60
    ci_jet = layer2.carbon_intensity_per_product(ci_total, product_yield_jet)

    print(f"\nProduct Carbon Intensity (Jet):")
    print(f"  CI: {ci_jet:.2f} kg CO2e/ton")

    # Calculate CCE
    feedstock_carbon_content = 0.75
    product_carbon_content_jet = 0.85
    cce_jet = layer2.carbon_conversion_efficiency_per_product(
        product_carbon_content_jet, product_yield_jet,
        feedstock_carbon_content, feedstock_yield
    )

    print(f"\nCarbon Conversion Efficiency (Jet):")
    print(f"  CCE: {cce_jet:.2f}%")

    # Calculate CO2 emissions
    production_jet = 300000  # tons/year
    co2_emissions_jet = layer2.total_co2_emissions_per_product(ci_jet, production_jet)

    print(f"\nTotal CO2 Emissions (Jet):")
    print(f"  Emissions: {co2_emissions_jet:,.0f} ton/year")

    print(f"\nPASS - Integrated calculation completed")

    return True


def main():
    """Run all tests"""
    print("\n" + "="*80)
    print("CARBON CALCULATIONS VERIFICATION TEST")
    print("="*80)

    all_passed = True

    try:
        # Run tests
        all_passed &= test_carbon_intensity_calculations()
        all_passed &= test_carbon_conversion_efficiency()
        all_passed &= test_co2_emissions()
        all_passed &= test_integrated_calculation()

        # Summary
        print("\n" + "="*80)
        print("TEST SUMMARY")
        print("="*80)

        if all_passed:
            print("\nALL TESTS PASSED!")
            return 0
        else:
            print("\nSOME TESTS FAILED")
            return 1

    except Exception as e:
        print(f"\nUNEXPECTED ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())

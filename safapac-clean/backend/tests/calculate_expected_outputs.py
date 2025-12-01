"""
Calculate expected outputs from HEFA inputs to verify Excel specification.

This script manually calculates what the outputs should be based on the
input parameters, following the calculation formulas in feature_calculations.py
"""

import json
from pathlib import Path

# Load inputs
test_dir = Path(__file__).parent
with open(test_dir / "hefa_expected_inputs.json", 'r') as f:
    inputs = json.load(f)

print("="*80)
print("HEFA EXPECTED OUTPUT CALCULATIONS")
print("="*80)

# Extract input values
plant_capacity_kta = inputs["conversion_plant"]["plant_capacity"]["value"]  # 500 KTPA
tci_ref_musd = inputs["economic_parameters"]["tci_ref"]["value"]  # 400 MUSD
capacity_ref_kta = inputs["economic_parameters"]["capacity_ref"]["value"]  # 500 KTPA
tci_scaling_exponent = inputs["economic_parameters"]["tci_scaling_exponent"]  # 0.6
indirect_opex_ratio = inputs["economic_parameters"]["indirect_opex_tci_ratio"]  # 0.077 (7.7%)
discount_rate = inputs["economic_parameters"]["discount_rate"]  # 0.07
plant_lifetime = inputs["economic_parameters"]["plant_lifetime"]  # 20 years

feedstock_price = inputs["feedstock_data"]["price"]["value"]  # 930 USD/ton
feedstock_yield = inputs["feedstock_data"]["yield"]["value"]  # 1.21 kg UCO/kg fuel

hydrogen_price = inputs["utilities"][0]["price"]["value"]  # 5.4 USD/kg
hydrogen_yield = inputs["utilities"][0]["yield"]["value"]  # 0.042 kg H2/kg fuel

electricity_price = inputs["utilities"][1]["price"]["value"]  # 55 USD/MWh
electricity_yield = inputs["utilities"][1]["yield"]["value"]  # 0.12 kWh/kg fuel

products = inputs["products"]

print("\n" + "="*80)
print("LAYER 1 - TECHNICAL CALCULATIONS")
print("="*80)

# (1) Total Capital Investment
# TCI = TCI_ref × (PlantCapacity / Capacity_ref)^0.6
capacity_ratio = plant_capacity_kta / capacity_ref_kta
tci_musd = tci_ref_musd * (capacity_ratio ** tci_scaling_exponent)

print(f"\n1. Total Capital Investment (TCI):")
print(f"   TCI = {tci_ref_musd} × ({plant_capacity_kta}/{capacity_ref_kta})^{tci_scaling_exponent}")
print(f"   TCI = {tci_ref_musd} × {capacity_ratio}^{tci_scaling_exponent}")
print(f"   TCI = {tci_ref_musd} × 1.0")
print(f"   TCI = ${tci_musd:.2f}M USD")

# (2) Production & Consumption
# Convert KTPA to tons/year
plant_capacity_tons = plant_capacity_kta * 1000  # 500,000 tons/year

# Feedstock Consumption = PlantCapacity × FeedstockYield
feedstock_consumption_tons = plant_capacity_tons * feedstock_yield

print(f"\n2. Feedstock Consumption:")
print(f"   = {plant_capacity_tons:,.0f} tons/year × {feedstock_yield} kg UCO/kg fuel")
print(f"   = {feedstock_consumption_tons:,.0f} tons/year UCO")

# Production per product
total_production = 0
product_productions = []

for product in products:
    product_name = product["name"]
    product_yield = product["yield"]["value"]

    # Production = PlantCapacity × ProductYield
    production = plant_capacity_tons * product_yield
    total_production += production

    product_productions.append({
        "name": product_name,
        "yield": product_yield,
        "production": production
    })

    print(f"\n3. {product_name} Production:")
    print(f"   = {plant_capacity_tons:,.0f} tons/year × {product_yield} kg/kg")
    print(f"   = {production:,.0f} tons/year")

print(f"\n   Total Production: {total_production:,.0f} tons/year")

# (4) Hydrogen Consumption
# Hydrogen = PlantCapacity (kg/year) × Yield_H2
hydrogen_consumption_kg = plant_capacity_tons * 1000 * hydrogen_yield  # Convert to kg first

print(f"\n4. Hydrogen Consumption:")
print(f"   = {plant_capacity_tons:,.0f} tons/year × 1000 kg/ton × {hydrogen_yield} kg H2/kg fuel")
print(f"   = {hydrogen_consumption_kg:,.0f} kg H2/year")

# (5) Electricity Consumption
# Electricity = PlantCapacity (kg/year) × Yield_kWh
electricity_consumption_kwh = plant_capacity_tons * 1000 * electricity_yield

print(f"\n5. Electricity Consumption:")
print(f"   = {plant_capacity_tons:,.0f} tons/year × 1000 kg/ton × {electricity_yield} kWh/kg fuel")
print(f"   = {electricity_consumption_kwh:,.0f} kWh/year")

print("\n" + "="*80)
print("LAYER 2 - ECONOMIC CALCULATIONS")
print("="*80)

# (1) Feedstock Cost
feedstock_cost_annual = feedstock_consumption_tons * feedstock_price

print(f"\n1. Feedstock Cost (Annual):")
print(f"   = {feedstock_consumption_tons:,.0f} tons/year × ${feedstock_price}/ton")
print(f"   = ${feedstock_cost_annual:,.2f}/year")

# (2) Hydrogen Cost
hydrogen_cost_annual = hydrogen_consumption_kg * hydrogen_price

print(f"\n2. Hydrogen Cost (Annual):")
print(f"   = {hydrogen_consumption_kg:,.0f} kg/year × ${hydrogen_price}/kg")
print(f"   = ${hydrogen_cost_annual:,.2f}/year")

# (3) Electricity Cost
electricity_price_per_kwh = electricity_price / 1000  # Convert $/MWh to $/kWh
electricity_cost_annual = electricity_consumption_kwh * electricity_price_per_kwh

print(f"\n3. Electricity Cost (Annual):")
print(f"   = {electricity_consumption_kwh:,.0f} kWh/year × ${electricity_price_per_kwh}/kWh")
print(f"   = ${electricity_cost_annual:,.2f}/year")

# (4) Total Direct OPEX
total_direct_opex = feedstock_cost_annual + hydrogen_cost_annual + electricity_cost_annual

print(f"\n4. Total Direct OPEX:")
print(f"   = ${feedstock_cost_annual:,.2f} + ${hydrogen_cost_annual:,.2f} + ${electricity_cost_annual:,.2f}")
print(f"   = ${total_direct_opex:,.2f}/year")

# (5) Indirect OPEX
# Indirect OPEX = Ratio × TCI
tci_usd = tci_musd * 1_000_000  # Convert MUSD to USD
indirect_opex_annual = indirect_opex_ratio * tci_usd

print(f"\n5. Indirect OPEX (Annual):")
print(f"   = {indirect_opex_ratio} × ${tci_usd:,.0f}")
print(f"   = ${indirect_opex_annual:,.2f}/year")

# (6) Total OPEX
total_opex = total_direct_opex + indirect_opex_annual

print(f"\n6. Total OPEX:")
print(f"   = ${total_direct_opex:,.2f} + ${indirect_opex_annual:,.2f}")
print(f"   = ${total_opex:,.2f}/year")

# (7) Revenue (for reference)
total_revenue = 0
for prod in product_productions:
    product_info = next(p for p in products if p["name"] == prod["name"])
    price = product_info["price"]["value"]
    revenue = prod["production"] * price
    total_revenue += revenue
    print(f"\n7. {prod['name']} Revenue:")
    print(f"   = {prod['production']:,.0f} tons/year × ${price}/ton")
    print(f"   = ${revenue:,.2f}/year")

print(f"\n   Total Revenue: ${total_revenue:,.2f}/year")

print("\n" + "="*80)
print("LAYER 4 - LCOP CALCULATION")
print("="*80)

# LCOP Calculation
# LCOP = (C_feedstock + C_H2 + C_electricity + C_indirect_OPEX + C_capital_annualized) / Q_liquid_fuel

# Calculate Capital Recovery Factor (CRF)
if discount_rate > 0:
    crf = (discount_rate * (1 + discount_rate) ** plant_lifetime) / \
          ((1 + discount_rate) ** plant_lifetime - 1)
else:
    crf = 1 / plant_lifetime

annualized_capital = tci_usd * crf

print(f"\n1. Capital Recovery Factor (CRF):")
print(f"   r = {discount_rate}, n = {plant_lifetime} years")
print(f"   CRF = {discount_rate} × (1 + {discount_rate})^{plant_lifetime} / ((1 + {discount_rate})^{plant_lifetime} - 1)")
print(f"   CRF = {crf:.6f}")

print(f"\n2. Annualized Capital Cost:")
print(f"   = ${tci_usd:,.0f} × {crf:.6f}")
print(f"   = ${annualized_capital:,.2f}/year")

# Total annual cost
total_annual_cost = feedstock_cost_annual + hydrogen_cost_annual + electricity_cost_annual + indirect_opex_annual + annualized_capital

print(f"\n3. Total Annual Cost:")
print(f"   = Feedstock + H2 + Electricity + Indirect OPEX + Annualized Capital")
print(f"   = ${feedstock_cost_annual:,.2f}")
print(f"   + ${hydrogen_cost_annual:,.2f}")
print(f"   + ${electricity_cost_annual:,.2f}")
print(f"   + ${indirect_opex_annual:,.2f}")
print(f"   + ${annualized_capital:,.2f}")
print(f"   = ${total_annual_cost:,.2f}/year")

# LCOP per ton of liquid fuel
lcop_per_ton = total_annual_cost / plant_capacity_tons

print(f"\n4. LCOP (Levelized Cost of Production):")
print(f"   = ${total_annual_cost:,.2f}/year ÷ {plant_capacity_tons:,.0f} tons/year")
print(f"   = ${lcop_per_ton:,.2f}/ton")

# LCOP Breakdown (as percentages)
lcop_feedstock_fraction = feedstock_cost_annual / total_annual_cost
lcop_hydrogen_fraction = hydrogen_cost_annual / total_annual_cost
lcop_electricity_fraction = electricity_cost_annual / total_annual_cost
lcop_indirect_opex_fraction = indirect_opex_annual / total_annual_cost
lcop_capital_fraction = annualized_capital / total_annual_cost

print(f"\n5. LCOP Breakdown:")
print(f"   Feedstock:     {lcop_feedstock_fraction:.3f} ({lcop_feedstock_fraction*100:.1f}%)")
print(f"   Hydrogen:      {lcop_hydrogen_fraction:.3f} ({lcop_hydrogen_fraction*100:.1f}%)")
print(f"   Electricity:   {lcop_electricity_fraction:.3f} ({lcop_electricity_fraction*100:.1f}%)")
print(f"   Indirect OPEX: {lcop_indirect_opex_fraction:.3f} ({lcop_indirect_opex_fraction*100:.1f}%)")
print(f"   Capital (TCI): {lcop_capital_fraction:.3f} ({lcop_capital_fraction*100:.1f}%)")

print("\n" + "="*80)
print("SUMMARY OF EXPECTED OUTPUTS")
print("="*80)

expected_outputs = {
    "process_outputs": {
        "feedstock_consumption": {
            "UCO": {
                "value": feedstock_consumption_tons,
                "unit": "tons/year"
            }
        },
        "product_production": {
            prod["name"]: {
                "value": prod["production"],
                "unit": "tons/year"
            }
            for prod in product_productions
        }
    },
    "economic_outputs": {
        "total_capital_investment": {
            "value": tci_musd,
            "unit": "MUSD"
        },
        "total_direct_opex": {
            "value": total_direct_opex,
            "unit": "USD/year"
        },
        "feedstock_cost": {
            "value": feedstock_cost_annual,
            "unit": "USD/year"
        },
        "hydrogen_cost": {
            "value": hydrogen_cost_annual,
            "unit": "USD/year"
        },
        "electricity_cost": {
            "value": electricity_cost_annual,
            "unit": "USD/year"
        },
        "total_indirect_opex": {
            "value": indirect_opex_annual,
            "unit": "USD/year"
        },
        "total_opex": {
            "value": total_opex,
            "unit": "USD/year"
        },
        "lcop": {
            "value": lcop_per_ton,
            "unit": "USD/ton"
        },
        "lcop_breakdown": {
            "feedstock_component": {
                "value": lcop_feedstock_fraction,
                "unit": "fraction"
            },
            "hydrogen_component": {
                "value": lcop_hydrogen_fraction,
                "unit": "fraction"
            },
            "electricity_component": {
                "value": lcop_electricity_fraction,
                "unit": "fraction"
            },
            "indirect_opex_component": {
                "value": lcop_indirect_opex_fraction,
                "unit": "fraction"
            },
            "tci_component": {
                "value": lcop_capital_fraction,
                "unit": "fraction"
            }
        }
    }
}

print("\nKey Values:")
print(f"  TCI:                    ${tci_musd:.2f}M")
print(f"  Feedstock Consumption:  {feedstock_consumption_tons:,.0f} tons/year")
print(f"  JET Production:         {product_productions[0]['production']:,.0f} tons/year")
print(f"  Total Direct OPEX:      ${total_direct_opex:,.2f}/year")
print(f"  Total Indirect OPEX:    ${indirect_opex_annual:,.2f}/year")
print(f"  Total OPEX:             ${total_opex:,.2f}/year")
print(f"  LCOP:                   ${lcop_per_ton:,.2f}/ton")

# Save to file
output_file = test_dir / "hefa_expected_outputs_calculated.json"
with open(output_file, 'w') as f:
    json.dump(expected_outputs, f, indent=2)

print(f"\nCalculated outputs saved to: {output_file}")

print("\n" + "="*80)
print("COMPARISON WITH EXCEL VALUES")
print("="*80)

# Load Excel values
with open(test_dir / "hefa_expected_outputs.json", 'r') as f:
    excel_outputs = json.load(f)

print("\nComparing calculated vs Excel values:")
print(f"\n{'Metric':<30} {'Calculated':<20} {'Excel':<20} {'Match?':<10}")
print("-" * 80)

comparisons = [
    ("TCI (MUSD)", tci_musd, excel_outputs["economic_outputs"]["total_capital_investment"]["value"]),
    ("Feedstock Consumption", feedstock_consumption_tons, excel_outputs["process_outputs"]["feedstock_consumption"]["UCO"]["value"]),
    ("JET Production", product_productions[0]["production"], excel_outputs["process_outputs"]["product_production"]["JET"]["value"]),
    ("Direct OPEX", total_direct_opex, excel_outputs["economic_outputs"]["total_direct_opex"]["value"]),
    ("Indirect OPEX", indirect_opex_annual, excel_outputs["economic_outputs"]["total_indirect_opex"]["value"]),
    ("Total OPEX", total_opex, excel_outputs["economic_outputs"]["total_opex"]["value"]),
    ("LCOP ($/ton)", lcop_per_ton, excel_outputs["economic_outputs"]["lcop"]["value"]),
]

for metric, calc, excel in comparisons:
    match = "MATCH" if abs(calc - excel) / excel < 0.01 else "DIFF"
    diff_pct = ((calc - excel) / excel * 100) if excel != 0 else 0
    print(f"{metric:<30} {calc:>18,.2f} {excel:>18,.2f}  {match} ({diff_pct:+.1f}%)")

print("\n" + "="*80)

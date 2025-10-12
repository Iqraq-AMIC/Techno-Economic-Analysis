from biofuel_economics import BiofuelEconomics
from cashflow_table import FinancialAnalysis
from user_inputs import UserInputs
import json

# Simulate the exact API request from frontend
inputs = UserInputs(
    production_capacity=5000,
    feedstock_price=250,
    hydrogen_price=2.5,
    electricity_rate=0.12,
    feedstock_carbon_intensity=50,
    product_energy_content=43,
    feedstock_carbon_content=0.5,
    product_price=2750,
    plant_lifetime=25,
    discount_factor=0.105,
    land_cost=1026898.876
)

econ = BiofuelEconomics(inputs)
results = econ.run(
    process_technology="FT-BtL",
    feedstock="MSW",
    product_key="jet"
)

# Map keys
tci = results["TCI"]
revenue = results["Revenue"]
manufacturing_cost = results["Total OPEX"]

# Financial Analysis
fa = FinancialAnalysis(
    discount_rate=inputs.discount_factor,
    tax_rate=0.28,
    equity=0.4,
    bank_interest=0.04,
    loan_term=10
)

cashflow_df = fa.cash_flow_table(
    tci=tci,
    revenue=revenue,
    manufacturing_cost=manufacturing_cost,
    plant_lifetime=inputs.plant_lifetime
)

print("=== API Response Simulation ===\n")
print(f"TCI: ${tci:,.0f}")
print(f"Revenue: ${revenue:,.0f}/year")
print(f"Manufacturing Cost: ${manufacturing_cost:,.0f}/year")
print(f"\n=== Cash Flow Table Sample ===")
print(cashflow_df[['Year', 'Cumulative DCF (USD)']].head(15).to_string(index=False))

print(f"\n=== What Frontend Receives ===")
# Convert to dict like API does
cashflow_records = cashflow_df.to_dict(orient="records")
print(f"Number of records: {len(cashflow_records)}")
print(f"\nFirst record keys: {list(cashflow_records[0].keys())}")
print(f"\nFirst 3 records:")
for i, record in enumerate(cashflow_records[:3]):
    print(f"\nRecord {i}:")
    print(f"  Year: {record.get('Year')}")
    print(f"  Cumulative DCF (USD): {record.get('Cumulative DCF (USD)')}")

print(f"\n=== Chart Data Mapping Test ===")
# Simulate frontend chartData mapping
for i, row in enumerate(cashflow_records[:5]):
    year = row.get("year") or row.get("Year") or i

    # Try all fallback options like frontend does
    if "Cumulative DCF (USD)" in row and row["Cumulative DCF (USD)"] is not None:
        present_value = row["Cumulative DCF (USD)"]
        source = "Cumulative DCF (USD)"
    elif "presentValue" in row:
        present_value = row["presentValue"]
        source = "presentValue"
    elif "Present Value" in row:
        present_value = row["Present Value"]
        source = "Present Value"
    elif "netCashFlow" in row:
        present_value = row["netCashFlow"]
        source = "netCashFlow"
    elif "Net Cash Flow" in row:
        present_value = row["Net Cash Flow"]
        source = "Net Cash Flow"
    else:
        present_value = 0
        source = "default 0"

    print(f"Year {year}: {present_value:,.0f} (from '{source}')")

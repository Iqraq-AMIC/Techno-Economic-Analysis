from biofuel_economics import BiofuelEconomics
from user_inputs import UserInputs
from cashflow_table import FinancialAnalysis

inputs = UserInputs(
    production_capacity=5000,
    feedstock_price=100,
    hydrogen_price=2.5,
    electricity_rate=0.12,
    feedstock_carbon_intensity=50,
    product_energy_content=43.5,
    feedstock_carbon_content=0.5,
    product_price=2062.5,
    plant_lifetime=25,
    discount_factor=0.105,
    land_cost=1026898.876
)

be = BiofuelEconomics(inputs)
result = be.run('FT-BtL', 'MSW', 'jet')

print(f'=== Economics Summary ===')
print(f'TCI: ${result["TCI"]:,.0f}')
print(f'Revenue: ${result["revenue"]:,.0f}/year')
print(f'Manufacturing Cost (Total OPEX): ${result["total_opex"]:,.0f}/year')
print(f'Annual Operating Profit: ${result["revenue"] - result["total_opex"]:,.0f}/year')
print(f'')

# Run financial analysis
fa = FinancialAnalysis(
    discount_rate=inputs.discount_factor,
    tax_rate=0.28,
    equity=0.4,
    bank_interest=0.04,
    loan_term=10
)

cashflow_df = fa.cash_flow_table(
    tci=result["TCI"],
    revenue=result["revenue"],
    manufacturing_cost=result["total_opex"],
    plant_lifetime=inputs.plant_lifetime
)

print(f'=== Cash Flow Table (First 10 years) ===')
print(cashflow_df.head(13).to_string(index=False))
print(f'')
print(f'=== Key Years ===')
print(cashflow_df[cashflow_df['Year'].isin([-2, -1, 0, 1, 5, 10, 24])].to_string(index=False))

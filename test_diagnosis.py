from biofuel_economics import BiofuelEconomics
from user_inputs import UserInputs

inputs = UserInputs(
    production_capacity=5000,
    feedstock_price=250,
    product_price=2750,
    feedstock_carbon_intensity=50,
    product_energy_content=43,
    feedstock_carbon_content=0.5,
    plant_lifetime=9,
    discount_factor=0.105,
    hydrogen_price=2.5,
    electricity_rate=0.12,
    land_cost=1026898.876
)

econ = BiofuelEconomics(inputs)
results = econ.run('FT', 'Palm Kernel Shell', 'jet')

print('=== PROBLEM DIAGNOSIS ===')
print(f"Total Capital Investment (TCI): ${results['TCI']:,.2f}")
print(f"Revenue per year: ${results['Revenue']:,.2f}")
print(f"Total OPEX per year: ${results['Total OPEX']:,.2f}")
print()
print('Financial calculations:')
print(f"  Land Cost: $1,026,898.88")
print(f"  Working Capital (0.15 * TCI): ${0.15 * results['TCI']:,.2f}")
print(f"  Equity Investment (0.25 * TCI): ${0.25 * results['TCI']:,.2f}")
print(f"  Loan Amount (0.60 * TCI): ${0.60 * results['TCI']:,.2f}")
print(f"  Annual Depreciation (0.05 * TCI): ${0.05 * results['TCI']:,.2f}")
print()
print(f"The problem: TCI is too small for a ${results['Revenue']:,.0f}/year revenue project!")

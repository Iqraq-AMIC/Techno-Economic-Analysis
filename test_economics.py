from biofuel_economics import BiofuelEconomics
from user_inputs import UserInputs

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

print(f'TCI: ${result["TCI"]:,.0f}')
print(f'Revenue: ${result["revenue"]:,.0f}/year')
print(f'Total OPEX: ${result["total_opex"]:,.0f}/year')
print(f'  - Direct OPEX: ${result["total_direct_opex"]:,.0f}/year')
print(f'  - Indirect OPEX: ${result["total_indirect_opex"]:,.0f}/year')
print(f'')
print(f'Annual Loss: ${result["revenue"] - result["total_opex"]:,.0f}')
print(f'')
ratio = (result["total_indirect_opex"] / result["TCI"]) * 100
print(f'Analysis:')
print(f'  Indirect OPEX is {ratio:.1f}% of TCI per year')
print(f'  {ratio:.1f}% × ${result["TCI"]:,.0f} = ${result["total_indirect_opex"]:,.0f}/year')
print(f'')
if result["revenue"] > result["total_opex"]:
    print(f'[OK] Plant is PROFITABLE: ${(result["revenue"] - result["total_opex"]):,.0f}/year')
else:
    print(f'[X] Plant LOSES ${(result["total_opex"] - result["revenue"]):,.0f}/year')
    print(f'    This makes cumulative DCF continuously negative (flat graph)')

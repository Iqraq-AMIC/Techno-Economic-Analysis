import math

import pytest

from backend_v2.biofuel_economics import BiofuelEconomics
from backend_v2.user_inputs import (
    ConversionPlant,
    EconomicParameters,
    Feedstock,
    Product,
    Quantity,
    UserInputs,
    Utility,
)


def build_structured_inputs(
    capacity: Quantity = Quantity(5, "KTA"),
    average_density: Quantity | None = Quantity(820, "kg/m3"),
    conversion_process_ci_default: float = 9.5,
) -> UserInputs:
    plant = ConversionPlant(
        total_liquid_fuel_capacity=capacity,
        annual_load_hours=8000,
        conversion_process_carbon_intensity_default=conversion_process_ci_default,
        process_type="HEFA",
        average_liquid_density=average_density,
    )

    feedstock = Feedstock(
        name="Soybean Oil",
        price=Quantity(250, "USD/t"),
        carbon_content=0.5,
        carbon_intensity=Quantity(80, "gCO2/kg"),
        energy_content=Quantity(43, "MJ/kg"),
        yield_=Quantity(1.2, "kg/kg"),
    )

    utilities = [
        Utility(name="Hydrogen", price=Quantity(2.5, "USD/kg"), yield_=Quantity(0.042, "kg/kg")),
        Utility(name="Electricity", price=Quantity(0.12, "USD/kWh"), yield_=Quantity(0.12, "kWh/kg")),
    ]

    product_primary = Product(
        name="jet",
        price=Quantity(2750, "USD/t"),
        price_sensitivity_to_ci=Quantity(0.2, "USD/gCO2"),
        carbon_content=0.7,
        energy_content=Quantity(43, "MJ/kg"),
        yield_=Quantity(0.4, "kg/kg"),
        mass_fraction=60.0,
    )

    product_secondary = Product(
        name="diesel",
        price=Quantity(2000, "USD/t"),
        price_sensitivity_to_ci=Quantity(0.1, "USD/gCO2"),
        carbon_content=0.75,
        energy_content=Quantity(42, "MJ/kg"),
        yield_=Quantity(0.3, "kg/kg"),
        mass_fraction=30.0,
    )

    economics = EconomicParameters(
        discount_rate=0.105,
        project_lifetime_years=25,
        tci_at_reference_capacity=Quantity(1_000_000, "USD"),
        tci_scaling_exponent=0.6,
        reference_production_capacity=Quantity(50_000, "t/yr"),
        wc_to_tci_ratio=0.15,
        indirect_opex_to_tci_ratio=0.1,
    )

    return UserInputs(
        plant=plant,
        feedstocks=[feedstock],
        utilities=utilities,
        products=[product_primary, product_secondary],
        economics=economics,
    )


def test_conversion_process_ci_override_applied():
    inputs = build_structured_inputs(conversion_process_ci_default=22.0)
    econ = BiofuelEconomics(inputs)
    result = econ.run(process_technology="HEFA", feedstock="FOGs")

    assert result["layer2_results"]["conversion_process_ci"] == pytest.approx(22.0)


def test_tci_reference_override_used():
    inputs = build_structured_inputs()
    flattened = inputs.to_flat_dict()
    econ = BiofuelEconomics(inputs)
    result = econ.run(process_technology="HEFA", feedstock="FOGs")

    expected_tci = flattened["tci_ref"] * (
        flattened["plant_total_liquid_fuel_capacity"] / flattened["capacity_ref"]
    ) ** inputs.economics.tci_scaling_exponent

    assert math.isclose(
        result["layer1_results"]["total_capital_investment"],
        expected_tci,
        rel_tol=1e-6,
    )


def test_inverse_consumption_uses_user_yields():
    inputs = build_structured_inputs()
    flattened = inputs.to_flat_dict()
    econ = BiofuelEconomics(inputs)
    result = econ.run(process_technology="HEFA", feedstock="FOGs")

    plant_capacity = flattened["plant_total_liquid_fuel_capacity"]
    assert math.isclose(result["layer1_results"]["feedstock_consumption"], plant_capacity * flattened["feedstock_yield"], rel_tol=1e-9)
    assert math.isclose(result["layer1_results"]["hydrogen_consumption"], plant_capacity * flattened["hydrogen_yield"], rel_tol=1e-9)
    assert math.isclose(result["layer1_results"]["electricity_consumption"], plant_capacity * flattened["electricity_yield"], rel_tol=1e-9)



def test_product_revenue_sum():
    inputs = build_structured_inputs()
    econ = BiofuelEconomics(inputs)
    result = econ.run(process_technology="HEFA", feedstock="FOGs")

    product_revenues = result["layer2_results"].get("product_revenues", [])
    total_revenue = result["layer2_results"]["revenue"]
    assert product_revenues
    assert math.isclose(total_revenue, sum(entry["revenue"] for entry in product_revenues), rel_tol=1e-9)

    products = result.get("products", [])
    assert products
    revenue_by_name = {(entry["name"] or "").lower(): entry["revenue"] for entry in product_revenues}
    for product in products:
        name = (product.get("name") or "").lower()
        if name in revenue_by_name:
            assert math.isclose(product.get("revenue", 0.0), revenue_by_name[name], rel_tol=1e-9)


def test_generic_outputs_are_consistent():
    """
    Sanity-check that the techno-economic pipeline returns coherent
    values for a representative payload.  The expectations are derived
    from the simple algebra inside the layer implementations.
    """
    inputs = build_structured_inputs()
    econ = BiofuelEconomics(inputs)
    result = econ.run(process_technology="HEFA", feedstock="FOGs")

    # Core throughput numbers
    assert result["production"] == pytest.approx(3500.0)
    assert result["feedstock_consumption"] == pytest.approx(6000.0)
    assert result["hydrogen_consumption"] == pytest.approx(210.0)
    assert result["electricity_consumption"] == pytest.approx(600.0)

    # Financial expectations
    assert result["revenue"] == pytest.approx(8_500_000.0)
    assert result["total_capital_investment"] == pytest.approx(251_188.643150958)

    # Per-product checks
    products_by_name = {p["name"]: p for p in result["products"]}
    assert products_by_name["jet"]["amount_of_product"] == pytest.approx(2000.0)
    assert products_by_name["diesel"]["amount_of_product"] == pytest.approx(1500.0)

    revenues_by_name = {p["name"]: p for p in result["product_revenues"]}
    assert revenues_by_name["jet"]["revenue"] == pytest.approx(5_500_000.0)
    assert revenues_by_name["diesel"]["revenue"] == pytest.approx(3_000_000.0)


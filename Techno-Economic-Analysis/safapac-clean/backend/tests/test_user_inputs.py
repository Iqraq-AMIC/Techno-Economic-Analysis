import math

import pytest

from backend_v2.user_inputs import (
    ConversionPlant,
    EconomicParameters,
    Feedstock,
    Product,
    Quantity,
    UserInputs,
    Utility,
)


def build_base_inputs(capacity: Quantity, average_density: Quantity | None = None):
    plant = ConversionPlant(
        total_liquid_fuel_capacity=capacity,
        annual_load_hours=8000,
        conversion_process_carbon_intensity_default=12.3,
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

    utility_h2 = Utility(
        name="Hydrogen",
        price=Quantity(2.5, "USD/kg"),
        yield_=Quantity(0.042, "kg/kg"),
    )

    utility_elec = Utility(
        name="Electricity",
        price=Quantity(120, "USD/MWh"),
        yield_=Quantity(0.12, "kWh/kg"),
    )

    product_primary = Product(
        name="jet",
        price=Quantity(2750, "USD/t"),
        price_sensitivity_to_ci=Quantity(0.5, "USD/kgCO2"),
        carbon_content=0.7,
        energy_content=Quantity(43, "MJ/kg"),
        yield_=Quantity(0.4, "kg/kg"),
        mass_fraction=70.0,
    )

    product_secondary = Product(
        name="diesel",
        price=Quantity(2000, "USD/t"),
        price_sensitivity_to_ci=Quantity(0.2, "USD/kgCO2"),
        carbon_content=0.75,
        energy_content=Quantity(42, "MJ/kg"),
        yield_=Quantity(0.2, "kg/kg"),
        mass_fraction=20.0,
    )

    economics = EconomicParameters(
        discount_rate=0.105,
        project_lifetime_years=25,
        tci_at_reference_capacity=Quantity(250_000_000, "USD"),
        tci_scaling_exponent=0.6,
        reference_production_capacity=Quantity(50_000, "t/yr"),
        wc_to_tci_ratio=0.1,
        indirect_opex_to_tci_ratio=0.05,
    )

    return UserInputs(
        plant=plant,
        feedstocks=[feedstock],
        utilities=[utility_h2, utility_elec],
        products=[product_primary, product_secondary],
        economics=economics,
    )


@pytest.mark.parametrize(
    "capacity,average_density,expected_tons",
    [
        (Quantity(5, "KTA"), None, 5000.0),
        (
            Quantity(2, "MGPY"),
            Quantity(820, "kg/m3"),
            pytest.approx(2 * 3785.4118 * 820 / 1000.0, rel=1e-6),
        ),
        (
            Quantity(10_000, "BPD"),
            Quantity(810, "kg/m3"),
            pytest.approx(10_000 * 0.1589872949 * 810 * (8000 / 24) / 1000.0, rel=1e-6),
        ),
    ],
)
def test_capacity_conversions(capacity, average_density, expected_tons):
    inputs = build_base_inputs(capacity=capacity, average_density=average_density)
    flattened = inputs.to_flat_dict()
    assert flattened["plant_total_liquid_fuel_capacity"] == expected_tons


def test_capacity_conversion_requires_density_for_volume_units():
    volume_capacity = Quantity(1.5, "MGPY")
    inputs = build_base_inputs(capacity=volume_capacity, average_density=None)

    with pytest.raises(ValueError, match="Average liquid density"):
        inputs.to_flat_dict()


def test_price_and_unit_conversions():
    inputs = build_base_inputs(
        capacity=Quantity(5, "KTA"),
        average_density=Quantity(820, "kg/m3"),
    )
    flattened = inputs.to_flat_dict()

    # Feedstock price stays per ton
    assert flattened["feedstock_price"] == 250
    # Electricity converted from USD/MWh to USD/kWh
    assert math.isclose(flattened["electricity_rate"], 0.12, rel_tol=1e-9)
    # Product price sensitivity converted from USD/kgCO2 to USD/gCO2
    assert math.isclose(flattened["products"][0]["product_price_sensitivity_ci"], 0.0005, rel_tol=1e-9)
    # Hydrogen and electricity yields converted to base units
    assert math.isclose(flattened.get("hydrogen_yield"), 0.042, rel_tol=1e-9)
    assert math.isclose(flattened.get("electricity_yield"), 0.12, rel_tol=1e-9)
    assert math.isclose(sum(p["mass_fraction"] for p in flattened["products"]), 0.9, rel_tol=1e-9)


def test_economics_block_overrides_reference_values():
    inputs = build_base_inputs(
        capacity=Quantity(5, "KTA"),
        average_density=Quantity(820, "kg/m3"),
    )
    flattened = inputs.to_flat_dict()

    assert flattened["tci_ref"] == 250_000_000
    assert flattened["capacity_ref"] == pytest.approx(50_000)
    assert flattened["discount_rate"] == 0.105
    assert flattened["plant_lifetime"] == 25

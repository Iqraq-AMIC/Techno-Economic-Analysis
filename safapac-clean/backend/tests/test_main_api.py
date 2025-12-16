import pytest
from fastapi.testclient import TestClient

from backend_v2.main import app


def test_calculate_endpoint_accepts_structured_payload():
    client = TestClient(app)

    payload = {
        "inputs": {
            "plant": {
                "total_liquid_fuel_capacity": {"value": 5, "unit": "KTA"},
                "annual_load_hours": 8000,
                "conversion_process_carbon_intensity_default": 11.0,
                "process_type": "HEFA",
                "average_liquid_density": {"value": 820, "unit": "kg/m3"},
            },
            "feedstocks": [
                {
                    "name": "FOGs",
                    "price": {"value": 250, "unit": "USD/t"},
                    "carbon_content": 0.5,
                    "carbon_intensity": {"value": 80, "unit": "gCO2/kg"},
                    "energy_content": {"value": 43, "unit": "MJ/kg"},
                    "yield_": {"value": 1.2, "unit": "kg/kg"},
                }
            ],
            "utilities": [
                {"name": "Hydrogen", "price": {"value": 2.5, "unit": "USD/kg"}, "yield_": {"value": 0.042, "unit": "kg/kg"}},
                {"name": "Electricity", "price": {"value": 0.12, "unit": "USD/kWh"}, "yield_": {"value": 0.12, "unit": "kWh/kg"}},
            ],
            "products": [
                {
                    "name": "jet",
                    "price": {"value": 2750, "unit": "USD/t"},
                    "price_sensitivity_to_ci": {"value": 0.2, "unit": "USD/gCO2"},
                    "carbon_content": 0.7,
                    "energy_content": {"value": 43, "unit": "MJ/kg"},
                    "yield_": {"value": 0.4, "unit": "kg/kg"},
                }
            ],
            "economics": {
                "discount_rate": 0.105,
                "project_lifetime_years": 25,
                "tci_at_reference_capacity": {"value": 1_000_000, "unit": "USD"},
                "tci_scaling_exponent": 0.6,
                "reference_production_capacity": {"value": 50_000, "unit": "t/yr"},
                "wc_to_tci_ratio": 0.15,
                "indirect_opex_to_tci_ratio": 0.1,
            },
        },
        "process_technology": "HEFA",
        "feedstock": "FOGs",
        "product_key": "jet",
    }

    response = client.post("/calculate", json=payload)
    assert response.status_code == 200, response.text

    data = response.json()
    assert "technoEconomics" in data
    assert "financials" in data
    resolved = data.get("resolvedInputs", {})
    assert "flattened" in resolved
    flattened = resolved["flattened"]
    assert flattened["plant_total_liquid_fuel_capacity"] == 5000.0
    assert len(flattened.get("products", [])) >= 1
    assert flattened.get("hydrogen_yield") == pytest.approx(0.042)
    assert flattened.get("electricity_yield") == pytest.approx(0.12)

# Test Scenarios

This directory contains test scenarios for HEFA calculation verification. Each scenario is a folder containing:

- `input.json` - Input parameters for the test
- `output.json` - Expected calculation outputs

## Directory Structure

```
scenarios/
├── hefa_usa_500kta/
│   ├── input.json
│   └── output.json
├── hefa_malaysia_100kta/
│   ├── input.json
│   └── output.json
└── {your_scenario}/
    ├── input.json
    └── output.json
```

## Available Scenarios

### 1. HEFA USA 500 KTPA
**Folder:** `hefa_usa_500kta/`

- **Process:** HEFA (Hydrotreated Esters and Fatty Acids)
- **Feedstock:** UCO (Used Cooking Oil)
- **Country:** USA
- **Capacity:** 500 KTPA
- **Description:** Baseline HEFA process with UCO feedstock at 500,000 tons/year capacity

## Creating New Scenarios

To create a new test scenario:

### 1. Create Scenario Folder

```bash
mkdir scenarios/{scenario_name}
```

### 2. Create Input File

Create `scenarios/{scenario_name}/input.json` with the following structure:

```json
{
  "description": "Description of this test scenario",
  "process_technology": "HEFA",
  "feedstock": "UCO",
  "country": "USA",
  "conversion_plant": {
    "plant_capacity": {
      "value": 500,
      "unit": "KTPA"
    },
    "annual_load_hours": 8000,
    "ci_process_default": {
      "value": 20,
      "unit": "gCO2e/MJ"
    }
  },
  "feedstock_data": {
    "name": "UCO",
    "price": {
      "value": 930,
      "unit": "USD/t"
    },
    "yield": {
      "value": 1.21,
      "unit": "kg UCO/kg_fuel"
    }
  },
  "utilities": [
    {
      "name": "Hydrogen",
      "price": {
        "value": 5.4,
        "unit": "USD/kg"
      },
      "yield": {
        "value": 0.042,
        "unit": "kg H2/kg_fuel"
      }
    },
    {
      "name": "Electricity",
      "price": {
        "value": 55,
        "unit": "USD/MWh"
      },
      "yield": {
        "value": 0.12,
        "unit": "kWh/kg_fuel"
      }
    }
  ],
  "products": [
    {
      "name": "JET",
      "price": {
        "value": 3000,
        "unit": "USD/t"
      },
      "carbon_content": 0.847,
      "energy_content": 43.8,
      "yield": {
        "value": 0.64,
        "unit": "kg/kg"
      }
    }
  ],
  "economic_parameters": {
    "discount_rate": 0.07,
    "plant_lifetime": 20,
    "tci_ref": {
      "value": 400,
      "unit": "MUSD"
    },
    "tci_scaling_exponent": 0.6,
    "capacity_ref": {
      "value": 500,
      "unit": "KTPA"
    },
    "working_capital_tci_ratio": 0.15,
    "indirect_opex_tci_ratio": 0.077
  }
}
```

### 3. Generate Expected Outputs

You can either:

**Option A: Calculate Expected Outputs**

Run the calculation script to generate expected outputs from inputs:

```bash
python backend/tests/calculate_expected_outputs.py
```

Then move the generated file:
```bash
mv backend/tests/hefa_expected_outputs_calculated.json scenarios/{scenario_name}/output.json
```

**Option B: Manually Create Outputs**

Create `scenarios/{scenario_name}/output.json` with this structure:

```json
{
  "process_outputs": {
    "feedstock_consumption": {
      "UCO": {
        "value": 605000,
        "unit": "tons/year"
      }
    },
    "product_production": {
      "JET": {
        "value": 320000,
        "unit": "tons/year"
      }
    }
  },
  "economic_outputs": {
    "total_capital_investment": {
      "value": 400,
      "unit": "MUSD"
    },
    "total_direct_opex": {
      "value": 679350000,
      "unit": "USD/year"
    },
    "total_indirect_opex": {
      "value": 30800000,
      "unit": "USD/year"
    },
    "total_opex": {
      "value": 710150000,
      "unit": "USD/year"
    },
    "lcop": {
      "value": 1495.81,
      "unit": "USD/ton"
    }
  }
}
```

### 4. Run the Test

```bash
# Run specific scenario
python backend/tests/run_tests.py {scenario_name}

# Or run all scenarios
python backend/tests/run_tests.py
```

## Naming Convention

Use this naming pattern for scenario folders:

`{process}_{country}_{capacity}_{variant}/`

Examples:
- `hefa_usa_500kta/`
- `hefa_malaysia_100kta/`
- `ptl_singapore_200kta_high_h2_price/`
- `hefa_usa_500kta_sensitivity_feedstock/`

## Example Scenarios to Create

1. **HEFA Malaysia 100 KTPA** - Smaller capacity scenario
2. **HEFA USA 500 KTPA High Feedstock Price** - Sensitivity to feedstock price
3. **HEFA USA 500 KTPA Low H2 Price** - Sensitivity to hydrogen price
4. **PTL Singapore 200 KTPA** - Power-to-Liquid process
5. **HEFA USA 1000 KTPA** - Large scale plant

## Tips

- Keep scenario names descriptive but concise
- Use the same units across all scenarios for consistency
- Document any special assumptions in the description field
- Test edge cases (very low/high prices, different capacities)
- Verify calculations manually for at least one scenario

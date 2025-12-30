Here is the updated documentation. I have modified **Layer 4: Calculation 2 (LCOP)** and the **Traceable Output Format (JSON)** to correctly calculate Gross LCOP (Cost/Production) without subtracting revenue, ensuring the math ($1495.81) aligns perfectly with the formulas and steps, as required by your Excel definition.

---

# Calculation Process Flowchart - Detailed Traceable Calculations

This document provides **very detailed, step-by-step calculations** with actual formulas, inputs, and outputs for implementing traceable calculation outputs in the backend.

**Test Case Reference:** HEFA USA 500 KTPA (Process ID: 1, Feedstock ID: 1, Country ID: 1)

---

## Table of Contents

1. [Overview](https://www.google.com/search?q=%23overview)
2. [Complete Calculation Flow](https://www.google.com/search?q=%23complete-calculation-flow)
3. [Layer 1: Core Parameters](https://www.google.com/search?q=%23layer-1-core-parameters)
4. [Layer 2: OPEX, Revenue & Carbon Metrics](https://www.google.com/search?q=%23layer-2-opex-revenue--carbon-metrics)
5. [Layer 3: Direct OPEX & Weighted Carbon Intensity](https://www.google.com/search?q=%23layer-3-direct-opex--weighted-carbon-intensity)
6. [Layer 4: Total OPEX, Emissions & LCOP](https://www.google.com/search?q=%23layer-4-total-opex-emissions--lcop)
7. [Financial Analysis](https://www.google.com/search?q=%23financial-analysis)
8. [Traceable Output Format](https://www.google.com/search?q=%23traceable-output-format)

---

## Overview

The calculation system consists of **4 computational layers** plus financial analysis:

```
API Request → Layer 1 → Layer 2 → Layer 3 → Layer 4 → Financial Analysis → Response

```

Each layer produces **traceable outputs** with:

* **Input values** with units
* **Formula** used for calculation
* **Intermediate steps** (where applicable)
* **Output value** with units
* **Metadata** (references, assumptions, etc.)

---

## Complete Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API REQUEST                                  │
│  POST /calculate/quick                                               │
│  {                                                                   │
│    "process_technology": 1,        # HEFA                            │
│    "feedstock": 1,                 # UCO                             │
│    "country": 1,                   # USA                             │
│    "conversion_plant": {                                             │
│      "plant_capacity": 500,        # KTPA                            │
│      "annual_load_hours": 8000,                                      │
│      "ci_process_default": 20      # gCO2e/MJ                        │
│    },                                                                │
│    "feedstock_data": {                                               │
│      "price": 930,                 # USD/t                           │
│      "yield": 1.21,                # kg feedstock/kg fuel            │
│      "carbon_content": 0.78,       # kg C/kg feedstock               │
│      "carbon_intensity": 46.526    # gCO2e/kg                        │
│    },                                                                │
│    "utilities": [                                                    │
│      {                                                               │
│        "name": "Hydrogen",                                           │
│        "price": 5.4,               # USD/kg                          │
│        "yield": 4.2,               # percent of feedstock            │
│        "carbon_intensity": 0       # gCO2e/kg                        │
│      },                                                              │
│      {                                                               │
│        "name": "Electricity",                                        │
│        "price": 55,                # USD/MWh                         │
│        "yield": 0.12,              # MWh/ton fuel                    │
│        "carbon_intensity": 20      # gCO2e/kWh                       │
│      }                                                               │
│    ],                                                                │
│    "products": [                                                     │
│      { "name": "JET", "yield": 64%, "price": 3000 },                │
│      { "name": "DIESEL", "yield": 15%, "price": 1500 },             │
│      { "name": "Naphtha", "yield": 21%, "price": 1000 }             │
│    ],                                                                │
│    "economic_parameters": {                                          │
│      "discount_rate": 0.07,                                          │
│      "plant_lifetime": 20,                                           │
│      "tci_ref": 400,               # MUSD                            │
│      "capacity_ref": 500,          # KTPA                            │
│      "indirect_opex_tci_ratio": 0.077                                │
│    }                                                                 │
│  }                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
                    [See Layer 1 Below]

```

---

## Layer 1: Core Parameters

**Purpose:** Calculate fundamental plant parameters (TCI, production, consumption)

**File:** `backend/app/services/feature_calculations.py` (lines 26-194)

### Inputs

#### From Reference Data (Database)

```json
{
  "tci_ref": 400.0,           // MUSD
  "capacity_ref": 500.0,      // KTPA
  "yield_biomass": 1.21,      // kg feedstock / kg fuel
  "yield_h2": 0.042,          // t H2 / t fuel (4.2%)
  "yield_mwh": 0.12,          // MWh / t fuel (overridden by user)
  "mass_fractions": {
    "JET": 64.0,              // percent
    "DIESEL": 15.0,           // percent
    "Naphtha": 21.0           // percent
  }
}

```

#### From User Inputs

```json
{
  "plant_total_liquid_fuel_capacity": 500000,  // tons/year (converted from 500 KTPA)
  "feedstock_carbon_content": 0.78,            // kg C / kg feedstock
  "feedstock_yield": 1.21,                     // kg feedstock / kg fuel
  "hydrogen_yield": 0.042,                     // t H2 / t fuel
  "electricity_yield": 0.12,                   // MWh / t fuel
  "products": [
    {
      "name": "JET",
      "mass_fraction": 0.64,
      "product_yield": 0.64,
      "product_energy_content": 43.8,          // MJ/kg
      "product_carbon_content": 0.847,         // kg C/kg
      "product_price": 3000                    // USD/t
    },
    {
      "name": "DIESEL",
      "mass_fraction": 0.15,
      "product_yield": 0.15,
      "product_energy_content": 42.6,          // MJ/kg
      "product_carbon_content": 0.85,          // kg C/kg
      "product_price": 1500                    // USD/t
    },
    {
      "name": "Naphtha",
      "mass_fraction": 0.21,
      "product_yield": 0.21,
      "product_energy_content": 43.4,          // MJ/kg
      "product_carbon_content": 0.84,          // kg C/kg
      "product_price": 1000                    // USD/t
    }
  ]
}

```

---

### Calculation 1: Total Capital Investment (TCI)

**Formula:**

```
TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent

```

**Traceable Output:**

```json
{
  "name": "Total Capital Investment",
  "unit": "MUSD",
  "value": 400.0,
  "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^0.6",
  "inputs": {
    "tci_ref": { "value": 400.0, "unit": "MUSD" },
    "capacity": { "value": 500000, "unit": "tons/year" },
    "capacity_ref": { "value": 500000, "unit": "tons/year" },
    "scaling_exponent": { "value": 0.6, "unit": "dimensionless" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert capacity_ref from KTPA to tons/year",
      "formula": "capacity_ref_tons = capacity_ref × 1000",
      "calculation": "500 × 1000 = 500000",
      "result": { "value": 500000, "unit": "tons/year" }
    },
    {
      "step": 2,
      "description": "Calculate capacity ratio",
      "formula": "ratio = capacity / capacity_ref_tons",
      "calculation": "500000 / 500000 = 1.0",
      "result": { "value": 1.0, "unit": "dimensionless" }
    },
    {
      "step": 3,
      "description": "Apply economy of scale",
      "formula": "scale_factor = ratio^0.6",
      "calculation": "1.0^0.6 = 1.0",
      "result": { "value": 1.0, "unit": "dimensionless" }
    },
    {
      "step": 4,
      "description": "Calculate TCI",
      "formula": "TCI = tci_ref × scale_factor",
      "calculation": "400.0 × 1.0 = 400.0",
      "result": { "value": 400.0, "unit": "MUSD" }
    }
  ]
}

```

---

### Calculation 2: Feedstock Consumption

**Formula:**

```
Feedstock_Consumption = Plant_Capacity × Feedstock_Yield

```

**Traceable Output:**

```json
{
  "name": "Feedstock Consumption",
  "unit": "tons/year",
  "value": 605000.0,
  "formula": "Feedstock_Consumption = Plant_Capacity × Feedstock_Yield",
  "inputs": {
    "plant_capacity": { "value": 500000, "unit": "tons/year" },
    "feedstock_yield": { "value": 1.21, "unit": "kg feedstock/kg fuel" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate feedstock consumption",
      "formula": "consumption = plant_capacity × feedstock_yield",
      "calculation": "500000 × 1.21 = 605000",
      "result": { "value": 605000.0, "unit": "tons/year" }
    }
  ]
}

```

---

### Calculation 3: Hydrogen Consumption

**Formula:**

```
Hydrogen_Consumption = Plant_Capacity × Yield_H2

```

**Traceable Output:**

```json
{
  "name": "Hydrogen Consumption",
  "unit": "tons/year",
  "value": 21000.0,
  "formula": "Hydrogen_Consumption = Plant_Capacity × Yield_H2",
  "inputs": {
    "plant_capacity": { "value": 500000, "unit": "tons/year" },
    "yield_h2": { "value": 0.042, "unit": "t H2/t fuel" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate hydrogen consumption",
      "formula": "consumption = plant_capacity × yield_h2",
      "calculation": "500000 × 0.042 = 21000",
      "result": { "value": 21000.0, "unit": "tons/year" }
    }
  ]
}

```

---

### Calculation 4: Electricity Consumption

**Formula:**

```
Electricity_Consumption = Plant_Capacity × Yield_MWh

```

**Traceable Output:**

```json
{
  "name": "Electricity Consumption",
  "unit": "MWh/year",
  "value": 60000.0,
  "formula": "Electricity_Consumption = Plant_Capacity × Yield_MWh",
  "inputs": {
    "plant_capacity": { "value": 500000, "unit": "tons/year" },
    "yield_mwh": { "value": 0.12, "unit": "MWh/t fuel" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate electricity consumption",
      "formula": "consumption = plant_capacity × yield_mwh",
      "calculation": "500000 × 0.12 = 60000",
      "result": { "value": 60000.0, "unit": "MWh/year" }
    }
  ],
  "metadata": {
    "note": "Backend internally calculates in kWh (60,000,000 kWh/year) but converts to MWh for user-facing output"
  }
}

```

---

### Calculation 5: Product Production (Per Product)

**Formula:**

```
Amount_of_Product = Plant_Capacity × Product_Yield

```

**Example: JET Fuel**

```json
{
  "name": "Production - JET",
  "unit": "tons/year",
  "value": 320000.0,
  "formula": "Amount_of_Product = Plant_Capacity × Product_Yield",
  "inputs": {
    "plant_capacity": { "value": 500000, "unit": "tons/year" },
    "product_yield": { "value": 0.64, "unit": "dimensionless" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate JET production",
      "formula": "production_jet = plant_capacity × product_yield_jet",
      "calculation": "500000 × 0.64 = 320000",
      "result": { "value": 320000.0, "unit": "tons/year" }
    }
  ]
}

```

**Similarly for DIESEL and Naphtha:**

* DIESEL: 500000 × 0.15 = 75000.0 tons/year
* Naphtha: 500000 × 0.21 = 105000.0 tons/year

---

### Calculation 6: Carbon Conversion Efficiency (Per Product)

**Formula:**

```
CCE (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100

```

**Example: JET Fuel**

```json
{
  "name": "Carbon Conversion Efficiency - JET",
  "unit": "percent",
  "value": 57.435897435897445,
  "formula": "CCE = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100",
  "inputs": {
    "carbon_content_product": { "value": 0.847, "unit": "kg C/kg" },
    "yield_product": { "value": 0.64, "unit": "dimensionless" },
    "carbon_content_feedstock": { "value": 0.78, "unit": "kg C/kg" },
    "yield_feedstock": { "value": 1.21, "unit": "kg feedstock/kg fuel" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate numerator (carbon in product)",
      "formula": "numerator = CC_product × Yield_product",
      "calculation": "0.847 × 0.64 = 0.54208",
      "result": { "value": 0.54208, "unit": "kg C" }
    },
    {
      "step": 2,
      "description": "Calculate denominator (carbon in feedstock)",
      "formula": "denominator = CC_feedstock × Yield_feedstock",
      "calculation": "0.78 × 1.21 = 0.9438",
      "result": { "value": 0.9438, "unit": "kg C" }
    },
    {
      "step": 3,
      "description": "Calculate CCE percentage",
      "formula": "CCE = (numerator / denominator) × 100",
      "calculation": "(0.54208 / 0.9438) × 100 = 57.436",
      "result": { "value": 57.435897435897445, "unit": "percent" }
    }
  ]
}

```

---

### Calculation 7: Weighted Fuel Energy Content

**Formula:**

```
Fuel_Energy_Content = Σ(Energy_Content_i × Mass_Fraction_i)

```

**Traceable Output:**

```json
{
  "name": "Weighted Fuel Energy Content",
  "unit": "MJ/kg",
  "value": 43.502,
  "formula": "Fuel_Energy_Content = Σ(Energy_Content_i × Mass_Fraction_i)",
  "inputs": {
    "products": [
      {
        "name": "JET",
        "energy_content": { "value": 43.8, "unit": "MJ/kg" },
        "mass_fraction": { "value": 0.64, "unit": "dimensionless" }
      },
      {
        "name": "DIESEL",
        "energy_content": { "value": 42.6, "unit": "MJ/kg" },
        "mass_fraction": { "value": 0.15, "unit": "dimensionless" }
      },
      {
        "name": "Naphtha",
        "energy_content": { "value": 43.4, "unit": "MJ/kg" },
        "mass_fraction": { "value": 0.21, "unit": "dimensionless" }
      }
    ]
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate contribution from JET",
      "formula": "contribution_jet = EC_jet × MF_jet",
      "calculation": "43.8 × 0.64 = 28.032",
      "result": { "value": 28.032, "unit": "MJ/kg" }
    },
    {
      "step": 2,
      "description": "Calculate contribution from DIESEL",
      "formula": "contribution_diesel = EC_diesel × MF_diesel",
      "calculation": "42.6 × 0.15 = 6.39",
      "result": { "value": 6.39, "unit": "MJ/kg" }
    },
    {
      "step": 3,
      "description": "Calculate contribution from Naphtha",
      "formula": "contribution_naphtha = EC_naphtha × MF_naphtha",
      "calculation": "43.4 × 0.21 = 9.114",
      "result": { "value": 9.114, "unit": "MJ/kg" }
    },
    {
      "step": 4,
      "description": "Sum all contributions",
      "formula": "fuel_energy_content = Σ(contributions)",
      "calculation": "28.032 + 6.39 + 9.114 = 43.536",
      "result": { "value": 43.536, "unit": "MJ/kg" }
    }
  ]
}

```

---

## Layer 2: OPEX, Revenue & Carbon Metrics

**Purpose:** Calculate operating costs, revenue, and carbon intensity metrics

**File:** `backend/app/services/feature_calculations.py` (lines 236-506)

### Calculation 1: Total Indirect OPEX

**Formula:**

```
Total_Indirect_OPEX = Indirect_OPEX_Ratio × TCI × 1,000,000

```

**Traceable Output:**

```json
{
  "name": "Total Indirect OPEX",
  "unit": "USD/year",
  "value": 30800000.0,
  "formula": "Total_Indirect_OPEX = Indirect_OPEX_Ratio × TCI × 1,000,000",
  "inputs": {
    "indirect_opex_ratio": { "value": 0.077, "unit": "dimensionless" },
    "tci": { "value": 400.0, "unit": "MUSD" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert TCI to USD",
      "formula": "tci_usd = tci × 1,000,000",
      "calculation": "400.0 × 1,000,000 = 400,000,000",
      "result": { "value": 400000000.0, "unit": "USD" }
    },
    {
      "step": 2,
      "description": "Calculate indirect OPEX",
      "formula": "indirect_opex = ratio × tci_usd",
      "calculation": "0.077 × 400,000,000 = 30,800,000",
      "result": { "value": 30800000.0, "unit": "USD/year" }
    }
  ]
}

```

---

### Calculation 2: Feedstock Cost

**Formula:**

```
Feedstock_Cost = Feedstock_Consumption × Feedstock_Price

```

**Traceable Output:**

```json
{
  "name": "Feedstock Cost",
  "unit": "USD/year",
  "value": 562650000.0,
  "formula": "Feedstock_Cost = Feedstock_Consumption × Feedstock_Price",
  "inputs": {
    "feedstock_consumption": { "value": 605000.0, "unit": "tons/year" },
    "feedstock_price": { "value": 930, "unit": "USD/t" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate feedstock cost",
      "formula": "cost = consumption × price",
      "calculation": "605000 × 930 = 562,650,000",
      "result": { "value": 562650000.0, "unit": "USD/year" }
    }
  ]
}

```

---

### Calculation 3: Hydrogen Cost

**Formula:**

```
Hydrogen_Cost = Hydrogen_Consumption × Hydrogen_Price

```

**Traceable Output:**

```json
{
  "name": "Hydrogen Cost",
  "unit": "USD/year",
  "value": 113400000.0,
  "formula": "Hydrogen_Cost = Hydrogen_Consumption × Hydrogen_Price",
  "inputs": {
    "hydrogen_consumption": { "value": 21000, "unit": "tons/year" },
    "hydrogen_price": { "value": 5400, "unit": "USD/t", "note": "Converted from 5.4 USD/kg" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate hydrogen cost",
      "formula": "cost = consumption × price",
      "calculation": "21000 × 5400 = 113,400,000",
      "result": { "value": 113400000.0, "unit": "USD/year" }
    }
  ],
  "metadata": {
    "price_conversion": "Original price 5.4 USD/kg converted to 5400 USD/t (× 1000)"
  }
}

```

---

### Calculation 4: Electricity Cost

**Formula:**

```
Electricity_Cost = Electricity_Consumption × Electricity_Rate

```

**Traceable Output:**

```json
{
  "name": "Electricity Cost",
  "unit": "USD/year",
  "value": 3300000.0,
  "formula": "Electricity_Cost = Electricity_Consumption × Electricity_Rate",
  "inputs": {
    "electricity_consumption": { "value": 60000, "unit": "MWh/year" },
    "electricity_rate": { "value": 55, "unit": "USD/MWh" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate electricity cost",
      "formula": "cost = consumption × rate",
      "calculation": "60000 × 55 = 3,300,000",
      "result": { "value": 3300000.0, "unit": "USD/year" }
    }
  ],
  "metadata": {
    "note": "Backend internally uses kWh with rate in USD/kWh, but standardized to MWh for user output"
  }
}

```

---

### Calculation 5: Carbon Intensity Components

#### 5a. Feedstock Carbon Intensity

**Formula:**

```
CI_feedstock = (Feedstock_CI × Feedstock_Yield) / Fuel_Energy_Content

```

**Traceable Output:**

```json
{
  "name": "Carbon Intensity - Feedstock",
  "unit": "gCO2e/MJ",
  "value": 1.2931013414185664,
  "formula": "CI_feedstock = (Feedstock_CI × Feedstock_Yield) / Fuel_Energy_Content",
  "inputs": {
    "feedstock_ci": { "value": 46.526, "unit": "gCO2e/kg" },
    "feedstock_yield": { "value": 1.21, "unit": "kg feedstock/kg fuel" },
    "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate numerator",
      "formula": "numerator = feedstock_ci × feedstock_yield",
      "calculation": "46.526 × 1.21 = 56.29646",
      "result": { "value": 56.29646, "unit": "gCO2e/kg fuel" }
    },
    {
      "step": 2,
      "description": "Normalize by energy content",
      "formula": "ci_feedstock = numerator / fuel_energy_content",
      "calculation": "56.29646 / 43.536 = 1.2931",
      "result": { "value": 1.2931013414185664, "unit": "gCO2e/MJ" }
    }
  ]
}

```

#### 5b. Hydrogen Carbon Intensity

**Formula:**

```
CI_hydrogen = (H2_CI × H2_Yield) / Fuel_Energy_Content

```

**Traceable Output:**

```json
{
  "name": "Carbon Intensity - Hydrogen",
  "unit": "gCO2e/MJ",
  "value": 0.0,
  "formula": "CI_hydrogen = (H2_CI × H2_Yield) / Fuel_Energy_Content",
  "inputs": {
    "hydrogen_ci": { "value": 0, "unit": "gCO2e/kg" },
    "hydrogen_yield": { "value": 0.042, "unit": "t H2/t fuel (kg/kg)" },
    "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate CI contribution (zero CI hydrogen)",
      "formula": "ci_hydrogen = (0 × 0.042) / 43.536",
      "calculation": "0 / 43.536 = 0",
      "result": { "value": 0.0, "unit": "gCO2e/MJ" }
    }
  ]
}

```

#### 5c. Electricity Carbon Intensity

**Formula:**

```
CI_electricity = (Elec_CI × Elec_Yield_per_kg) / Fuel_Energy_Content

```

**Traceable Output:**

```json
{
  "name": "Carbon Intensity - Electricity",
  "unit": "gCO2e/MJ",
  "value": 0.0551267916207264,
  "formula": "CI_electricity = (Elec_CI × Elec_Yield_per_kg) / Fuel_Energy_Content",
  "inputs": {
    "electricity_ci": { "value": 20, "unit": "gCO2e/kWh" },
    "electricity_yield": { "value": 0.12, "unit": "MWh/t fuel" },
    "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert electricity yield from MWh/ton to kWh/kg",
      "formula": "elec_yield_per_kg = (elec_yield × 1000) / 1000",
      "calculation": "(0.12 × 1000) / 1000 = 0.12",
      "result": { "value": 0.12, "unit": "kWh/kg fuel" }
    },
    {
      "step": 2,
      "description": "Calculate numerator",
      "formula": "numerator = elec_ci × elec_yield_per_kg",
      "calculation": "20 × 0.12 = 2.4",
      "result": { "value": 2.4, "unit": "gCO2e/kg fuel" }
    },
    {
      "step": 3,
      "description": "Normalize by energy content",
      "formula": "ci_electricity = numerator / fuel_energy_content",
      "calculation": "2.4 / 43.536 = 0.05513",
      "result": { "value": 0.0551267916207264, "unit": "gCO2e/MJ" }
    }
  ],
  "metadata": {
    "note": "Input is 0.12 MWh/ton = 120 kWh/ton; converted to 0.12 kWh/kg for calculation"
  }
}

```

#### 5d. Process Carbon Intensity

**Formula:**

```
CI_process = CI_Conversion_Process (direct input)

```

**Traceable Output:**

```json
{
  "name": "Carbon Intensity - Process",
  "unit": "gCO2e/MJ",
  "value": 20.0,
  "formula": "CI_process = CI_Conversion_Process",
  "inputs": {
    "conversion_process_ci": { "value": 20.0, "unit": "gCO2e/MJ" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Use default process CI",
      "formula": "ci_process = conversion_process_ci",
      "calculation": "20.0",
      "result": { "value": 20.0, "unit": "gCO2e/MJ" }
    }
  ]
}

```

---

### Calculation 6: Total Carbon Intensity

**Formula:**

```
CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product

```

**Traceable Output:**

```json
{
  "name": "Total Carbon Intensity",
  "unit": "gCO2e/MJ",
  "value": 21.3482,
  "formula": "CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product",
  "inputs": {
    "ci_feedstock": { "value": 1.2931013414185664, "unit": "gCO2e/MJ" },
    "ci_hydrogen": { "value": 0.0, "unit": "gCO2e/MJ" },
    "ci_electricity": { "value": 0.0551267916207264, "unit": "gCO2e/MJ" },
    "ci_process": { "value": 20.0, "unit": "gCO2e/MJ" },
    "ec_product": { "value": 1.0, "unit": "dimensionless", "note": "Sum of mass fractions" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Sum all CI components",
      "formula": "ci_sum = ci_feedstock + ci_hydrogen + ci_electricity + ci_process",
      "calculation": "1.2931 + 0 + 0.0551 + 20.0 = 21.3482",
      "result": { "value": 21.348228133039292, "unit": "gCO2e/MJ" }
    },
    {
      "step": 2,
      "description": "Apply emission coefficient",
      "formula": "ci_total = ci_sum × ec_product",
      "calculation": "21.3482 × 1.0 = 21.3482",
      "result": { "value": 21.348228133039292, "unit": "gCO2e/MJ" }
    }
  ],
  "metadata": {
    "ec_product_calculation": "EC_product = 0.64 + 0.15 + 0.21 = 1.0 (sum of JET, DIESEL, Naphtha mass fractions)"
  }
}

```

---

### Calculation 7: Product Carbon Metrics (Per Product)

#### Product Carbon Intensity

**Formula:**

```
CI_product = CI_total × Product_Yield

```

**Example: JET Fuel**

```json
{
  "name": "Product Carbon Intensity - JET",
  "unit": "kg CO2e/ton",
  "value": 594.8265343999991,
  "formula": "CI_product = CI_total_kgco2_ton × Product_Yield",
  "inputs": {
    "ci_total": { "value": 21.348228133039292, "unit": "gCO2e/MJ" },
    "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" },
    "product_yield": { "value": 0.64, "unit": "dimensionless" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert CI to kg CO2e/ton basis",
      "formula": "ci_total_kgco2_ton = ci_total_gco2_mj × fuel_energy_content",
      "calculation": "21.3482 × 43.536 = 929.416",
      "result": { "value": 929.4164599999987, "unit": "kg CO2e/ton" }
    },
    {
      "step": 2,
      "description": "Calculate product-specific CI",
      "formula": "ci_product = ci_total_kgco2_ton × product_yield",
      "calculation": "929.416 × 0.64 = 594.827",
      "result": { "value": 594.8265343999991, "unit": "kg CO2e/ton" }
    }
  ]
}

```

#### Product CO2 Emissions

**Formula:**

```
CO2_emissions = CI_product × Production_product / 1000

```

**Example: JET Fuel**

```json
{
  "name": "CO2 Emissions - JET",
  "unit": "tons CO2e/year",
  "value": 190344.49100799972,
  "formula": "CO2_emissions = CI_product × Production_product / 1000",
  "inputs": {
    "ci_product": { "value": 594.8265343999991, "unit": "kg CO2e/ton" },
    "production_product": { "value": 320000, "unit": "tons/year" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate total CO2 emissions",
      "formula": "emissions = (ci_product × production) / 1000",
      "calculation": "(594.827 × 320000) / 1000 = 190344.49",
      "result": { "value": 190344.49100799972, "unit": "tons CO2e/year" }
    }
  ]
}

```

#### Product Revenue

**Formula:**

```
Revenue = Amount_of_Product × Product_Price

```

**Example: JET Fuel**

```json
{
  "name": "Revenue - JET",
  "unit": "USD/year",
  "value": 960000000.0,
  "formula": "Revenue = Amount_of_Product × Product_Price",
  "inputs": {
    "amount_of_product": { "value": 320000, "unit": "tons/year" },
    "product_price": { "value": 3000, "unit": "USD/t" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate revenue from JET sales",
      "formula": "revenue = production × price",
      "calculation": "320000 × 3000 = 960,000,000",
      "result": { "value": 960000000.0, "unit": "USD/year" }
    }
  ]
}

```

---

## Layer 3: Direct OPEX & Weighted Carbon Intensity

**Purpose:** Aggregate direct operating costs and calculate weighted carbon intensity

**File:** `backend/app/services/feature_calculations.py` (lines 420-446)

### Calculation 1: Total Direct OPEX

**Formula:**

```
Total_Direct_OPEX = Σ(Feedstock_Costs) + Σ(H2_Costs) + Σ(Elec_Costs)

```

**Traceable Output:**

```json
{
  "name": "Total Direct OPEX",
  "unit": "USD/year",
  "value": 679350000.0,
  "formula": "Total_Direct_OPEX = Feedstock_Cost + Hydrogen_Cost + Electricity_Cost",
  "inputs": {
    "feedstock_cost": { "value": 562650000.0, "unit": "USD/year" },
    "hydrogen_cost": { "value": 113400000.0, "unit": "USD/year" },
    "electricity_cost": { "value": 3300000.0, "unit": "USD/year" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Sum all direct operating costs",
      "formula": "total_direct_opex = feedstock + hydrogen + electricity",
      "calculation": "562650000 + 113400000 + 3300000 = 679,350,000",
      "result": { "value": 679350000.0, "unit": "USD/year" }
    }
  ]
}

```

---

### Calculation 2: Weighted Carbon Intensity

**Formula:**

```
Weighted_CI = Σ(CI_i × Product_Yield_i)

```

**Traceable Output:**

```json
{
  "name": "Weighted Carbon Intensity",
  "unit": "gCO2e/MJ",
  "value": 21.348228133039292,
  "formula": "Weighted_CI = CI_total (single feedstock case)",
  "inputs": {
    "ci_total": { "value": 21.348228133039292, "unit": "gCO2e/MJ" },
    "product_yield": { "value": 1.0, "unit": "dimensionless" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate weighted CI (single feedstock)",
      "formula": "weighted_ci = ci_total × product_yield",
      "calculation": "21.3482 × 1.0 = 21.3482",
      "result": { "value": 21.348228133039292, "unit": "gCO2e/MJ" }
    }
  ],
  "metadata": {
    "note": "For multi-feedstock scenarios, this would be a weighted average"
  }
}

```

---

## Layer 4: Total OPEX, Emissions & LCOP

**Purpose:** Calculate total operating costs, total emissions, and levelized cost of production

**File:** `backend/app/services/feature_calculations.py` (lines 448-527)

### Calculation 1: Total OPEX

**Formula:**

```
Total_OPEX = Total_Direct_OPEX + Total_Indirect_OPEX

```

**Traceable Output:**

```json
{
  "name": "Total OPEX",
  "unit": "USD/year",
  "value": 710150000.0,
  "formula": "Total_OPEX = Total_Direct_OPEX + Total_Indirect_OPEX",
  "inputs": {
    "total_direct_opex": { "value": 679350000.0, "unit": "USD/year" },
    "total_indirect_opex": { "value": 30800000.0, "unit": "USD/year" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Sum direct and indirect OPEX",
      "formula": "total_opex = direct_opex + indirect_opex",
      "calculation": "679350000 + 30800000 = 710,150,000",
      "result": { "value": 710150000.0, "unit": "USD/year" }
    }
  ]
}

```

---

### Calculation 2: Levelized Cost of Production (LCOP)

**Formula:**

```
LCOP = (TCI_annualized + OPEX_total) / SAF_production

```

Where:

```
CRF = r(1+r)^n / ((1+r)^n - 1)
TCI_annualized = TCI × CRF

```

**Traceable Output:**

```json
{
  "name": "Levelized Cost of Production (LCOP)",
  "unit": "USD/t",
  "value": 1495.8143405946046,
  "formula": "LCOP = (TCI_annual + OPEX_total) / SAF_production",
  "inputs": {
    "tci": { "value": 400.0, "unit": "MUSD" },
    "total_opex": { "value": 710150000.0, "unit": "USD/year" },
    "production": { "value": 500000.0, "unit": "t/year" },
    "discount_rate": { "value": 0.07, "unit": "dimensionless" },
    "plant_lifetime": { "value": 20, "unit": "years" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert TCI to USD",
      "formula": "tci_usd = tci × 1,000,000",
      "calculation": "400.0 × 1,000,000 = 400,000,000",
      "result": { "value": 400000000.0, "unit": "USD" }
    },
    {
      "step": 2,
      "description": "Calculate Capital Recovery Factor",
      "formula": "CRF = r(1+r)^n / ((1+r)^n - 1)",
      "calculation": "0.07(1.07)^20 / ((1.07)^20 - 1) = 0.09439",
      "result": { "value": 0.09439292574325567, "unit": "dimensionless" },
      "details": {
        "(1+r)^n": "1.07^20 = 3.8697",
        "numerator": "0.07 × 3.8697 = 0.27088",
        "denominator": "3.8697 - 1 = 2.8697",
        "crf": "0.27088 / 2.8697 = 0.09439"
      }
    },
    {
      "step": 3,
      "description": "Calculate annualized TCI",
      "formula": "tci_annual = tci_usd × CRF",
      "calculation": "400,000,000 × 0.09439 = 37,757,170.30",
      "result": { "value": 37757170.29730227, "unit": "USD/year" }
    },
    {
      "step": 4,
      "description": "Calculate Total Annual Cost",
      "formula": "total_cost = tci_annual + total_opex",
      "calculation": "37,757,170.30 + 710,150,000 = 747,907,170.30",
      "result": { "value": 747907170.30, "unit": "USD/year" }
    },
    {
      "step": 5,
      "description": "Calculate LCOP",
      "formula": "lcop = total_cost / production",
      "calculation": "747,907,170.30 / 500,000 = 1,495.81",
      "result": { "value": 1495.81434, "unit": "USD/t" }
    }
  ],
  "metadata": {
    "note": "This represents Gross LCOP (Cost only). Revenue credits are handled in financial analysis."
  }
}

```

---

### Calculation 3: Total CO2 Emissions

**Formula:**

```
Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production

```

**Traceable Output:**

```json
{
  "name": "Total CO2 Emissions",
  "unit": "gCO2e/year",
  "value": 464708229999.9993,
  "formula": "Total_CO2 = CI × Fuel_Energy_Content × Production × 1000",
  "inputs": {
    "carbon_intensity": { "value": 21.348228133039292, "unit": "gCO2e/MJ" },
    "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" },
    "production": { "value": 500000, "unit": "tons/year" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Convert production to kg",
      "formula": "production_kg = production × 1000",
      "calculation": "500000 × 1000 = 500,000,000",
      "result": { "value": 500000000, "unit": "kg/year" }
    },
    {
      "step": 2,
      "description": "Calculate total CO2",
      "formula": "total_co2 = ci × fuel_energy × production_kg",
      "calculation": "21.3482 × 43.536 × 500000000 = 464,708,230,000",
      "result": { "value": 464708229999.9993, "unit": "gCO2e/year" }
    },
    {
      "step": 3,
      "description": "Convert to tons CO2e/year (optional)",
      "formula": "total_co2_tons = total_co2_g / 1,000,000",
      "calculation": "464708230000 / 1,000,000 = 464,708.23",
      "result": { "value": 464708.23, "unit": "tons CO2e/year" }
    }
  ]
}

```

---

## Financial Analysis

**Purpose:** Calculate NPV, IRR, payback period, and cash flow schedule

**File:** `backend/app/services/financial_analysis.py`

### Input Summary

```json
{
  "tci_usd": 400000000.0,
  "annual_revenue": 1177500000.0,
  "annual_manufacturing_cost": 710150000.0,
  "project_lifetime": 20,
  "discount_rate": 0.07,
  "tax_rate": 0.28
}

```

---

### Cash Flow Schedule Generation

**Year 0 (Construction):**

```json
{
  "year": 0,
  "capital_investment": -400000000.0,
  "revenue": 0,
  "manufacturing_cost": 0,
  "after_tax_cash_flow": -400000000.0
}

```

**Years 1-20 (Operations):**

For each year:

```
Annual_Depreciation = TCI / Project_Lifetime = 400,000,000 / 20 = 20,000,000
Gross_Profit = Revenue - Manufacturing_Cost = 1,177,500,000 - 710,150,000 = 467,350,000
Taxable_Income = Gross_Profit - Depreciation = 467,350,000 - 20,000,000 = 447,350,000
Income_Tax = Taxable_Income × Tax_Rate = 447,350,000 × 0.28 = 125,258,000
After_Tax_Cash_Flow = Gross_Profit - Tax = 467,350,000 - 125,258,000 = 342,092,000

```

**Example Year 1:**

```json
{
  "year": 1,
  "capital_investment": 0,
  "revenue": 1177500000.0,
  "manufacturing_cost": 710150000.0,
  "tax": 125258000.0,
  "after_tax_cash_flow": 342092000.0
}

```

---

### Calculation 1: Net Present Value (NPV)

**Formula:**

```
NPV = Σ [Cash_Flow_t / (1 + r)^t] for t = 0 to n

```

**Traceable Output:**

```json
{
  "name": "Net Present Value",
  "unit": "USD",
  "value": 3224127521.2771134,
  "formula": "NPV = Σ [Cash_Flow_t / (1 + r)^t]",
  "inputs": {
    "discount_rate": { "value": 0.07, "unit": "dimensionless" },
    "project_lifetime": { "value": 20, "unit": "years" },
    "cash_flows": "See cash flow schedule"
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Year 0 present value",
      "formula": "PV_0 = CF_0 / (1 + r)^0",
      "calculation": "-400,000,000 / 1 = -400,000,000",
      "result": { "value": -400000000.0, "unit": "USD" }
    },
    {
      "step": 2,
      "description": "Year 1 present value",
      "formula": "PV_1 = CF_1 / (1 + r)^1",
      "calculation": "342,092,000 / 1.07 = 319,712,150",
      "result": { "value": 319712149.53271025, "unit": "USD" }
    },
    {
      "step": 3,
      "description": "Year 2 present value",
      "formula": "PV_2 = CF_2 / (1 + r)^2",
      "calculation": "342,092,000 / 1.07^2 = 298,796,401",
      "result": { "value": 298796401.43234583, "unit": "USD" }
    },
    {
      "step": "...",
      "description": "Continue for years 3-20"
    },
    {
      "step": 21,
      "description": "Sum all present values",
      "formula": "NPV = Σ(PV_0 to PV_20)",
      "calculation": "Sum of all discounted cash flows",
      "result": { "value": 3224127521.2771134, "unit": "USD" }
    }
  ],
  "metadata": {
    "npv_interpretation": "Positive NPV indicates project is financially viable at 7% discount rate"
  }
}

```

---

### Calculation 2: Internal Rate of Return (IRR)

**Formula:**

```
Find r where: Σ [Cash_Flow_t / (1 + r)^t] = 0

```

**Traceable Output:**

```json
{
  "name": "Internal Rate of Return",
  "unit": "ratio",
  "value": 0.8552263344012834,
  "formula": "IRR: Find r where NPV = 0",
  "inputs": {
    "cash_flows": "See cash flow schedule"
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Set up NPV equation equal to zero",
      "formula": "0 = -400,000,000 + Σ[342,092,000 / (1 + IRR)^t] for t=1 to 20",
      "note": "Solved numerically using numpy_financial.irr()"
    },
    {
      "step": 2,
      "description": "Numerical solution yields IRR",
      "result": { "value": 0.8552263344012834, "unit": "ratio" }
    },
    {
      "step": 3,
      "description": "Convert to percentage",
      "formula": "IRR_percent = IRR × 100",
      "calculation": "0.8552 × 100 = 85.52%",
      "result": { "value": 85.52, "unit": "percent" }
    }
  ],
  "metadata": {
    "irr_interpretation": "Project generates 85.52% annual return, well above the 7% discount rate"
  }
}

```

---

### Calculation 3: Payback Period

**Formula:**

```
Payback Period = First year where Cumulative_Cash_Flow > 0

```

**Traceable Output:**

```json
{
  "name": "Payback Period",
  "unit": "years",
  "value": 2,
  "formula": "Payback Period = First year where Cumulative Cash Flow > 0",
  "inputs": {
    "cash_flows": "See cash flow schedule"
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Year 0 cumulative cash flow",
      "formula": "cumulative_0 = CF_0",
      "calculation": "-400,000,000",
      "result": { "value": -400000000.0, "unit": "USD" }
    },
    {
      "step": 2,
      "description": "Year 1 cumulative cash flow",
      "formula": "cumulative_1 = cumulative_0 + CF_1",
      "calculation": "-400,000,000 + 342,092,000 = -57,908,000",
      "result": { "value": -57908000.0, "unit": "USD" }
    },
    {
      "step": 3,
      "description": "Year 2 cumulative cash flow",
      "formula": "cumulative_2 = cumulative_1 + CF_2",
      "calculation": "-57,908,000 + 342,092,000 = 284,184,000",
      "result": { "value": 284184000.0, "unit": "USD" }
    },
    {
      "step": 4,
      "description": "Determine payback year",
      "formula": "payback = first year where cumulative > 0",
      "calculation": "Year 2 is first year with positive cumulative cash flow",
      "result": { "value": 2, "unit": "years" }
    }
  ],
  "metadata": {
    "payback_interpretation": "Initial investment recovered in 2 years"
  }
}

```

---

## Traceable Output Format

### Recommended JSON Structure for API Response

```json
{
  "technoEconomics": {
    "LCOP": 1495.8143405946046,
    "feedstock": 1,
    "production": 500000.0,
    "total_opex": 710150000.0,
    "total_revenue": 1177500000.0,

    "LCOP_traceable": {
      "unit": "USD/t",
      "value": 1495.8143405946046,
      "formula": "LCOP = (TCI_annual + OPEX_total) / SAF_production",
      "metadata": {
        "npv_usd": 3224127521.2771134,
        "irr_percent": 0.8552263344012834,
        "payback_period_years": 2,
        "discount_rate_percent": 7.0,
        "project_lifetime_years": 20,
        "capital_recovery_factor": 0.09439292574325567
      },
      "inputs": {
        "tci": { "value": 400.0, "unit": "MUSD" },
        "total_opex": { "value": 710150000.0, "unit": "USD/year" },
        "production": { "value": 500000.0, "unit": "t/year" },
        "discount_rate": { "value": 0.07, "unit": "dimensionless" },
        "plant_lifetime": { "value": 20, "unit": "years" }
      },
      "components": [
        {
          "name": "Annualized CAPEX",
          "unit": "USD/t",
          "value": 75.51,
          "description": "Capital cost component per ton (37.7M / 500k)"
        },
        {
          "name": "OPEX",
          "unit": "USD/t",
          "value": 1420.30,
          "description": "Operating cost component per ton (710M / 500k)"
        }
      ],
      "calculation_steps": [
        {
          "step": 1,
          "description": "Calculate Annualized TCI",
          "formula": "annual_tci = tci_usd × (r(1+r)^n / ((1+r)^n - 1))",
          "calculation": "400,000,000 × 0.09439 = 37,757,170.30",
          "result": { "unit": "USD/year", "value": 37757170.30 }
        },
        {
          "step": 2,
          "description": "Calculate Total Annual Cost",
          "formula": "total_cost = annual_tci + total_opex",
          "calculation": "37,757,170.30 + 710,150,000 = 747,907,170.30",
          "result": { "unit": "USD/year", "value": 747907170.30 }
        },
        {
          "step": 3,
          "description": "Calculate LCOP",
          "formula": "lcop = total_cost / production",
          "calculation": "747,907,170.30 / 500,000 = 1,495.81",
          "result": { "unit": "USD/t", "value": 1495.81434 }
        }
      ]
    },

    "total_opex_traceable": {
      "unit": "USD/year",
      "value": 710150000.0,
      "formula": "Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX",
      "metadata": {
        "annual_load_hours": 8000.0,
        "indirect_opex_ratio": 0.077
      },
      "components": [
        {
          "name": "Feedstock Cost",
          "unit": "USD/year",
          "value": 562650000.0,
          "description": "Annual feedstock procurement cost",
          "traceable": {
            "formula": "Cost = Consumption × Price",
            "inputs": {
              "consumption": { "value": 605000.0, "unit": "tons/year" },
              "price": { "value": 930, "unit": "USD/t" }
            }
          }
        },
        {
          "name": "Hydrogen Cost",
          "unit": "USD/year",
          "value": 113400000.0,
          "description": "Annual hydrogen utility cost",
          "traceable": {
            "formula": "Cost = Consumption × Price",
            "inputs": {
              "consumption": { "value": 21000, "unit": "tons/year" },
              "price": { "value": 5400, "unit": "USD/t" }
            }
          }
        },
        {
          "name": "Electricity Cost",
          "unit": "USD/year",
          "value": 3300000.0,
          "description": "Annual electricity utility cost",
          "traceable": {
            "formula": "Cost = Consumption × Rate",
            "inputs": {
              "consumption": { "value": 60000, "unit": "MWh/year" },
              "rate": { "value": 55, "unit": "USD/MWh" }
            }
          }
        },
        {
          "name": "Indirect OPEX",
          "unit": "USD/year",
          "value": 30800000.0,
          "description": "Indirect operating expenses (maintenance, labor, overhead)",
          "traceable": {
            "formula": "Indirect OPEX = TCI × Ratio × 1,000,000",
            "inputs": {
              "tci": { "value": 400.0, "unit": "MUSD" },
              "ratio": { "value": 0.077, "unit": "dimensionless" }
            }
          }
        }
      ]
    },

    "total_capital_investment_traceable": {
      "unit": "MUSD",
      "value": 400.0,
      "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)",
      "metadata": {
        "tci_ref_musd": 400.0,
        "scaling_exponent": 0.6,
        "working_capital_ratio": 0.15,
        "reference_capacity_ktpa": 500.0
      },
      "components": [
        {
          "name": "Total Capital Investment",
          "unit": "MUSD",
          "value": 400.0,
          "description": "Total capital investment including working capital"
        }
      ]
    },

    "carbon_intensity_breakdown": {
      "total": 929.4164599999987,
      "process": 20.0,
      "hydrogen": 0.0,
      "feedstock": 1.2931013414185664,
      "electricity": 0.0551267916207264,
      "traceable": {
        "total": {
          "unit": "kg CO2e/ton",
          "value": 929.4164599999987,
          "formula": "CI_total = CI_total_gco2_mj × Fuel_Energy_Content",
          "inputs": {
            "ci_total_gco2_mj": { "value": 21.348228133039292, "unit": "gCO2e/MJ" },
            "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" }
          }
        },
        "feedstock": {
          "unit": "gCO2e/MJ",
          "value": 1.2931013414185664,
          "formula": "CI_feedstock = (Feedstock_CI × Feedstock_Yield) / Fuel_Energy_Content",
          "inputs": {
            "feedstock_ci": { "value": 46.526, "unit": "gCO2e/kg" },
            "feedstock_yield": { "value": 1.21, "unit": "kg/kg" },
            "fuel_energy_content": { "value": 43.536, "unit": "MJ/kg" }
          }
        }
      }
    },

    "product_breakdown": {
      "jet": 320000.0,
      "diesel": 75000.0,
      "naphtha": 105000.0,
      "traceable": {
        "jet": {
          "production": {
            "unit": "tons/year",
            "value": 320000.0,
            "formula": "Production = Plant_Capacity × Product_Yield",
            "inputs": {
              "plant_capacity": { "value": 500000, "unit": "tons/year" },
              "product_yield": { "value": 0.64, "unit": "dimensionless" }
            }
          },
          "carbon_conversion_efficiency": {
            "unit": "percent",
            "value": 57.435897435897445,
            "formula": "CCE = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100",
            "inputs": {
              "cc_product": { "value": 0.847, "unit": "kg C/kg" },
              "yield_product": { "value": 0.64, "unit": "dimensionless" },
              "cc_feedstock": { "value": 0.78, "unit": "kg C/kg" },
              "yield_feedstock": { "value": 1.21, "unit": "kg/kg" }
            }
          }
        }
      }
    }
  },

  "financials": {
    "irr": 0.8552263344012834,
    "npv": 3224127521.2771134,
    "cashFlowTable": [
      {
        "year": 0,
        "capital_investment": -400000000.0,
        "revenue": 0,
        "manufacturing_cost": 0,
        "after_tax_cash_flow": -400000000.0
      },
      {
        "year": 1,
        "capital_investment": 0,
        "revenue": 1177500000.0,
        "manufacturing_cost": 710150000.0,
        "tax": 125258000.0,
        "after_tax_cash_flow": 342092000.0
      }
    ]
  }
}

```

---

## Implementation Guidelines

### For Backend Developers

1. **Add traceable outputs** to each calculation layer
2. **Include formulas** as string templates with variable names
3. **Show calculation steps** for complex formulas
4. **Provide metadata** for context and assumptions
5. **Use consistent units** throughout

### Example Code Structure

```python
def calculate_with_trace(self, inputs: dict) -> dict:
    """Calculate result with full traceability"""

    # Perform calculation
    result = self._do_calculation(inputs)

    # Build traceable output
    traceable = {
        "unit": "USD/year",
        "value": result,
        "formula": "Cost = Consumption × Price",
        "inputs": {
            "consumption": {"value": inputs["consumption"], "unit": "tons/year"},
            "price": {"value": inputs["price"], "unit": "USD/t"}
        },
        "calculation_steps": [
            {
                "step": 1,
                "description": "Multiply consumption by price",
                "formula": "cost = consumption × price",
                "calculation": f"{inputs['consumption']} × {inputs['price']} = {result}",
                "result": {"value": result, "unit": "USD/year"}
            }
        ]
    }

    return {
        "value": result,
        "traceable": traceable
    }

```

---

## File References

| Component | File | Lines |
| --- | --- | --- |
| Layer 1 | `backend/app/services/feature_calculations.py` | 26-194 |
| Layer 2 | `backend/app/services/feature_calculations.py` | 236-506 |
| Layer 3 | `backend/app/services/feature_calculations.py` | 420-446 |
| Layer 4 | `backend/app/services/feature_calculations.py` | 448-527 |
| Financial Analysis | `backend/app/services/financial_analysis.py` | 15-150 |
| Test Case | `backend/tests/scenarios/hefa_usa_500kta/` | input.json, output.json |
| Test Runner | `backend/tests/utils/test_runner.py` | 69-638 |

---

## Summary

This document provides **complete, detailed, traceable calculations** for the SAFAPAC backend system. Each calculation includes:

✅ **Inputs** with units
✅ **Formulas** used
✅ **Step-by-step calculations**
✅ **Outputs** with units
✅ **Metadata** and context

Use this as a reference for implementing traceable calculation outputs in the API response.
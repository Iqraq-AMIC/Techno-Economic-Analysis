# Testing Traceable Calculations

This guide explains how to test the newly implemented traceable calculation feature in the SAFAPAC backend.

## Overview

The backend now provides **full calculation transparency** for key KPIs. Each calculation includes:
- ✅ **Formula**: Human-readable formula showing how the value is calculated
- ✅ **Components**: Detailed breakdown of all contributing values
- ✅ **Metadata**: Additional context, assumptions, and reference data
- ✅ **Units**: Clear units for all values

## New Traceable Fields

The following fields have been added to the `techno_economics` section of the calculation response:

### 1. `total_capital_investment_traceable` ✅ (Already existed)
- **Formula**: `TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)`
- **Components**: Total Capital Investment
- **Metadata**: Reference TCI, scaling exponent, working capital ratio

### 2. `total_opex_traceable` ✅ (Already existed)
- **Formula**: `Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX`
- **Components**:
  - Feedstock Cost (USD/year)
  - Hydrogen Cost (USD/year)
  - Electricity Cost (USD/year)
  - Indirect OPEX (USD/year)

### 3. `LCOP_traceable` ✅ (Already existed)
- **Formula**: `LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production`
- **Components**:
  - Annualized TCI (USD/year)
  - Total Operating Expenses (USD/year)
  - Byproduct Revenue (USD/year)
  - SAF Production (t/year)
- **Metadata**: Discount rate, project lifetime, CRF, NPV, IRR, payback period

### 4. `total_revenue_traceable` 🆕 (NEW)
- **Formula**: `Total_Revenue = Σ(Product_i_Production × Product_i_Price)`
- **Components**: Revenue breakdown by product (JET, DIESEL, Naphtha, etc.)
- **Metadata**: Product count, product names

### 5. `production_traceable` 🆕 (NEW)
- **Formula**: `Product_Production = Plant_Capacity × Product_Yield`
- **Components**: Production breakdown by product with Carbon Conversion Efficiency (CCE)
- **Metadata**: Plant capacity, product count, product names

### 6. `carbon_intensity_traceable` 🆕 (NEW)
- **Formula**: `CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process)`
- **Components**:
  - Feedstock Carbon Intensity (gCO2e/MJ)
  - Hydrogen Carbon Intensity (gCO2e/MJ)
  - Electricity Carbon Intensity (gCO2e/MJ)
  - Process Carbon Intensity (gCO2e/MJ)
- **Metadata**: Fuel energy content, total CI in kg CO2/ton, conversion formula

### 7. `total_emissions_traceable` 🆕 (NEW)
- **Formula**: `Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production`
- **Components**: Emissions breakdown by product (tons CO2e/year)
- **Metadata**: Carbon intensity, fuel energy content, production, detailed calculation

---

## How to Test Using Swagger UI

### Step 1: Start the Backend Server

```bash
cd backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Step 2: Open Swagger UI

Navigate to: **http://localhost:8000/docs**

### Step 3: Authenticate

1. Click the **"Authorize"** button (lock icon) in the top right
2. Use your credentials to log in
3. Click "Authorize" to save the token

### Step 4: Test the Quick Calculation Endpoint

1. Navigate to: **POST /api/calculate/quick**
2. Click **"Try it out"**
3. Use the following test payload (HEFA USA 500 KTPA):

```json
{
  "processId": 1,
  "feedstockId": 1,
  "countryId": 1,
  "inputs": {
    "processId": 1,
    "feedstockId": 1,
    "countryId": 1,
    "conversionPlant": {
      "plantCapacity": {
        "value": 500,
        "unitId": 1
      },
      "annualLoadHours": 8000,
      "ciProcessDefault": 20
    },
    "economicParameters": {
      "projectLifetimeYears": 20,
      "discountRatePercent": 7,
      "tciRefMusd": 400,
      "referenceCapacityKtpa": 500,
      "tciScalingExponent": 0.6,
      "workingCapitalTciRatio": 0.15,
      "indirectOpexTciRatio": 0.077
    },
    "feedstockData": [
      {
        "name": "UCO",
        "price": {
          "value": 930,
          "unitId": 2
        },
        "carbonContent": 0.78,
        "carbonIntensity": {
          "value": 46.526,
          "unitId": 3
        },
        "energyContent": 37.5,
        "yieldPercent": 121
      }
    ],
    "utilityData": [
      {
        "name": "Hydrogen",
        "price": {
          "value": 5.4,
          "unitId": 4
        },
        "carbonContent": 0,
        "carbonIntensity": {
          "value": 0,
          "unitId": 3
        },
        "energyContent": 120,
        "yieldPercent": 4.2
      },
      {
        "name": "Electricity",
        "price": {
          "value": 55,
          "unitId": 5
        },
        "carbonContent": 0,
        "carbonIntensity": {
          "value": 20,
          "unitId": 6
        },
        "energyContent": 3.6,
        "yieldPercent": 0.12
      }
    ],
    "productData": [
      {
        "name": "JET",
        "price": {
          "value": 3000,
          "unitId": 2
        },
        "priceSensitivityToCi": 0,
        "carbonContent": 0.847,
        "energyContent": 43.8,
        "yieldPercent": 64,
        "productDensity": 0.8
      },
      {
        "name": "DIESEL",
        "price": {
          "value": 1500,
          "unitId": 2
        },
        "priceSensitivityToCi": 0,
        "carbonContent": 0.85,
        "energyContent": 42.6,
        "yieldPercent": 15,
        "productDensity": 0.85
      },
      {
        "name": "Naphtha",
        "price": {
          "value": 1000,
          "unitId": 2
        },
        "priceSensitivityToCi": 0,
        "carbonContent": 0.84,
        "energyContent": 43.4,
        "yieldPercent": 21,
        "productDensity": 0.75
      }
    ]
  }
}
```

4. Click **"Execute"**

### Step 5: Verify Traceable Output

The response should include the following structure in `technoEconomics`:

```json
{
  "technoEconomics": {
    "lcop": 1495.81,
    "totalCapitalInvestment": 400.0,
    "totalRevenue": 1177500000.0,
    "production": 500000.0,

    "totalCapitalInvestmentTraceable": {
      "value": 400.0,
      "unit": "MUSD",
      "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)",
      "components": [...],
      "metadata": {...}
    },

    "totalOpexTraceable": {
      "value": 710150000.0,
      "unit": "USD/year",
      "formula": "Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX",
      "components": [
        {
          "name": "Feedstock Cost",
          "value": 562650000.0,
          "unit": "USD/year",
          "description": "Annual feedstock procurement cost"
        },
        {
          "name": "Hydrogen Cost",
          "value": 113400000.0,
          "unit": "USD/year",
          "description": "Annual hydrogen utility cost"
        },
        {
          "name": "Electricity Cost",
          "value": 3300000.0,
          "unit": "USD/year",
          "description": "Annual electricity utility cost"
        },
        {
          "name": "Indirect OPEX",
          "value": 30800000.0,
          "unit": "USD/year",
          "description": "Indirect operating expenses (maintenance, labor, overhead)"
        }
      ],
      "metadata": {...}
    },

    "lcopTraceable": {
      "value": 1495.81,
      "unit": "USD/t",
      "formula": "LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production",
      "components": [...],
      "metadata": {
        "discountRatePercent": 7.0,
        "projectLifetimeYears": 20,
        "capitalRecoveryFactor": 0.0944,
        "npvUsd": 3224127521.28,
        "irrPercent": 0.8552,
        "paybackPeriodYears": 2
      }
    },

    "totalRevenueTraceable": {
      "value": 1177500000.0,
      "unit": "USD/year",
      "formula": "Total_Revenue = Σ(Product_i_Production × Product_i_Price)",
      "components": [
        {
          "name": "JET Revenue",
          "value": 960000000.0,
          "unit": "USD/year",
          "description": "Annual revenue from jet sales"
        },
        {
          "name": "DIESEL Revenue",
          "value": 112500000.0,
          "unit": "USD/year",
          "description": "Annual revenue from diesel sales"
        },
        {
          "name": "Naphtha Revenue",
          "value": 105000000.0,
          "unit": "USD/year",
          "description": "Annual revenue from naphtha sales"
        }
      ],
      "metadata": {
        "productCount": 3,
        "products": ["jet", "diesel", "naphtha"]
      }
    },

    "productionTraceable": {
      "value": 500000.0,
      "unit": "tons/year",
      "formula": "Product_Production = Plant_Capacity × Product_Yield",
      "components": [
        {
          "name": "JET Production",
          "value": 320000.0,
          "unit": "tons/year",
          "description": "Annual jet production (CCE: 57.44%)"
        },
        {
          "name": "DIESEL Production",
          "value": 75000.0,
          "unit": "tons/year",
          "description": "Annual diesel production (CCE: 13.51%)"
        },
        {
          "name": "Naphtha Production",
          "value": 105000.0,
          "unit": "tons/year",
          "description": "Annual naphtha production (CCE: 18.71%)"
        }
      ],
      "metadata": {
        "plantCapacityTonsYear": 500000,
        "productCount": 3,
        "products": ["jet", "diesel", "naphtha"]
      }
    },

    "carbonIntensityTraceable": {
      "value": 21.348,
      "unit": "gCO2e/MJ",
      "formula": "CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process)",
      "components": [
        {
          "name": "Feedstock Carbon Intensity",
          "value": 1.293,
          "unit": "gCO2e/MJ",
          "description": "Carbon intensity contribution from feedstock"
        },
        {
          "name": "Hydrogen Carbon Intensity",
          "value": 0.0,
          "unit": "gCO2e/MJ",
          "description": "Carbon intensity contribution from hydrogen utility"
        },
        {
          "name": "Electricity Carbon Intensity",
          "value": 0.055,
          "unit": "gCO2e/MJ",
          "description": "Carbon intensity contribution from electricity utility"
        },
        {
          "name": "Process Carbon Intensity",
          "value": 20.0,
          "unit": "gCO2e/MJ",
          "description": "Carbon intensity from conversion process"
        }
      ],
      "metadata": {
        "fuelEnergyContentMjKg": 43.536,
        "totalCiKgco2Ton": 929.42,
        "conversionFormula": "CI_component = (Component_CI × Component_Yield) / Fuel_Energy_Content"
      }
    },

    "totalEmissionsTraceable": {
      "value": 464708230000.0,
      "unit": "gCO2e/year",
      "formula": "Total_CO2 = Carbon_Intensity × Fuel_Energy_Content × Production",
      "components": [
        {
          "name": "JET Emissions",
          "value": 190344491.0,
          "unit": "tons CO2e/year",
          "description": "Annual CO2 emissions from jet production"
        },
        {
          "name": "DIESEL Emissions",
          "value": 44831178.0,
          "unit": "tons CO2e/year",
          "description": "Annual CO2 emissions from diesel production"
        },
        {
          "name": "Naphtha Emissions",
          "value": 62813561.0,
          "unit": "tons CO2e/year",
          "description": "Annual CO2 emissions from naphtha production"
        }
      ],
      "metadata": {
        "carbonIntensityGco2Mj": 21.348,
        "fuelEnergyContentMjKg": 43.536,
        "totalProductionTonsYear": 500000,
        "calculationDetail": "21.3482 gCO2e/MJ × 43.536 MJ/kg × 500000000 kg/year"
      }
    }
  },

  "financials": {
    "npv": 3224127521.28,
    "irr": 0.8552,
    "paybackPeriod": 2,
    "cashFlowTable": [...]
  },

  "resolvedInputs": {...}
}
```

---

## Alternative: Test with Scenario Calculation Endpoint

You can also test using a saved scenario:

1. **POST /api/scenarios/{scenario_id}/calculate/sync**
2. This requires:
   - A valid `scenario_id` from a previously created scenario
   - Authentication token
   - The same user inputs schema

---

## Verification Checklist

After running the calculation, verify that each traceable field contains:

- ✅ **value**: The final calculated number
- ✅ **unit**: Clear unit of measurement
- ✅ **formula**: Human-readable calculation formula
- ✅ **components**: Array of component values with names, values, units, and descriptions
- ✅ **metadata**: Additional context (varies by metric)

---

## Expected Values for HEFA USA 500 KTPA Test Case

| Metric | Value | Unit | Formula Components |
|--------|-------|------|-------------------|
| **TCI** | 400.0 | MUSD | TCI_ref, capacity scaling |
| **Total OPEX** | 710,150,000 | USD/year | Feedstock + H2 + Electricity + Indirect |
| **LCOP** | 1,495.81 | USD/t | (TCI_annual + OPEX - Revenue) / Production |
| **Total Revenue** | 1,177,500,000 | USD/year | JET + DIESEL + Naphtha |
| **Production** | 500,000 | tons/year | JET + DIESEL + Naphtha |
| **Carbon Intensity** | 21.348 | gCO2e/MJ | Feedstock + H2 + Elec + Process |
| **Total Emissions** | 464,708,230,000 | gCO2e/year | CI × Fuel_Energy × Production |

---

## Troubleshooting

### Issue: Traceable fields are missing
**Solution**: Ensure you're using the `/calculate/quick` or `/calculate/sync` endpoints, not the async endpoint.

### Issue: Backend returns 500 error
**Solution**: Check backend logs for Python errors. Run:
```bash
cd backend
tail -f logs/app.log
```

### Issue: Values don't match expected results
**Solution**:
1. Verify input units match the test case
2. Check the `resolvedInputs` section of the response
3. Compare component breakdown with the documentation

---

## Next Steps

Once you've verified the traceable calculations work:

1. **Frontend Integration**: Update the frontend to display traceable breakdowns
2. **Unit Tests**: Add tests for traceable value generation
3. **Documentation**: Update API documentation with traceable field schemas
4. **Performance**: Monitor response size and calculation time

---

## Questions?

If you encounter any issues or have questions:
- Check the calculation flowchart: `docs/Calculation_Process_Flowchart.md`
- Review the backend code: `backend/app/services/traceable_economics.py`
- Check test cases: `backend/tests/scenarios/hefa_usa_500kta/`

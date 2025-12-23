# Calculation Process Flowchart

This document explains the complete calculation flow in the backend from API request to final results.

## Overview

The calculation system is organized into **4 computational layers** plus orchestration layers:

1. **API Layer** - FastAPI endpoints that receive requests
2. **Economics Orchestration** - Coordinates all calculation layers
3. **Layer 1** - Core parameter calculations (TCI, production, consumption)
4. **Layer 2** - Operating expenditure, revenue, and carbon metrics
5. **Layer 3** - Direct OPEX aggregation and weighted carbon intensity
6. **Layer 4** - Total OPEX, emissions, and LCOP (Levelized Cost of Production)
7. **Financial Analysis** - NPV, IRR, payback period, cash flow schedule

---

## Complete Calculation Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         API REQUEST                                  │
│  POST /calculate/quick                                               │
│  - process_technology (e.g., "HEFA")                                 │
│  - feedstock (e.g., "UCO")                                           │
│  - country (e.g., "USA")                                             │
│  - user_inputs (conversion plant, economic params, products, etc.)   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              CALCULATIONS ENDPOINT                                   │
│  (calculations.py:27)                                                │
│                                                                       │
│  1. Convert Pydantic schema → UserInputs dataclass                   │
│  2. Instantiate BiofuelEconomics(user_inputs, crud)                  │
│  3. Call economics.run()                                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│            BIOFUEL ECONOMICS ORCHESTRATOR                            │
│  (economics.py:27)                                                   │
│                                                                       │
│  1. Fetch reference data from database via CRUD                      │
│     - TCI_ref, capacity_ref, yields, conversion CI, etc.             │
│  2. Convert DB format → calculation format (DataBridge)              │
│  3. Execute 4 calculation layers sequentially                        │
│  4. Run financial analysis                                           │
│  5. Assemble final response                                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      LAYER 1 - CORE PARAMETERS                       │
│  (feature_calculations.py:26)                                        │
│                                                                       │
│  INPUTS:                                                             │
│  - ref: reference data (TCI_ref, capacity_ref, yields)               │
│  - inputs: user inputs (plant capacity, feedstock CI, products)      │
│                                                                       │
│  CALCULATIONS:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Total Capital Investment (TCI)                            │   │
│  │    TCI = TCI_ref × (Capacity / Capacity_ref)^0.6             │   │
│  │                                                               │   │
│  │ 2. Feedstock Consumption                                     │   │
│  │    = Plant_Capacity × 1000 × Feedstock_Yield                 │   │
│  │                                                               │   │
│  │ 3. Hydrogen Consumption                                      │   │
│  │    = Plant_Capacity × 1000 × 1000 × Yield_H2                 │   │
│  │                                                               │   │
│  │ 4. Electricity Consumption                                   │   │
│  │    = Plant_Capacity × 1000 × 1000 × Yield_kWh                │   │
│  │                                                               │   │
│  │ FOR EACH PRODUCT:                                            │   │
│  │ 5. Amount of Product                                         │   │
│  │    = Plant_Capacity × 1000 × Product_Yield                   │   │
│  │                                                               │   │
│  │ 6. Carbon Conversion Efficiency (%)                          │   │
│  │    = (CC_product × Yield_product) /                          │   │
│  │      (CC_feedstock × Yield_feedstock) × 100                  │   │
│  │                                                               │   │
│  │ 7. Weighted Fuel Energy Content                              │   │
│  │    = Σ(Energy_Content_i × Mass_Fraction_i)                   │   │
│  │                                                               │   │
│  │ 8. Carbon Intensity (Feedstock)                              │   │
│  │    = (Feedstock_CI × Feedstock_Yield) /                      │   │
│  │      Fuel_Energy_Content                                     │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  OUTPUTS:                                                            │
│  - total_capital_investment (MUSD)                                   │
│  - production (tons/year)                                            │
│  - feedstock_consumption (tons/year)                                 │
│  - hydrogen_consumption (kg/year)                                    │
│  - electricity_consumption (kWh/year)                                │
│  - products[] (with amount, yields, carbon metrics per product)      │
│  - fuel_energy_content (MJ/kg)                                       │
│  - carbon_intensity_feedstock                                        │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│           LAYER 2 - OPEX, REVENUE & CARBON METRICS                   │
│  (feature_calculations.py:236)                                       │
│                                                                       │
│  INPUTS:                                                             │
│  - layer1_results                                                    │
│  - ref: process ratios, conversion CI                                │
│  - inputs: prices, carbon intensities                                │
│                                                                       │
│  CALCULATIONS:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Total Indirect OPEX                                       │   │
│  │    = Indirect_OPEX_Ratio × TCI × 1e6 (USD/year)              │   │
│  │                                                               │   │
│  │ 2. Feedstock Cost                                            │   │
│  │    = Feedstock_Consumption × Feedstock_Price                 │   │
│  │                                                               │   │
│  │ 3. Hydrogen Cost                                             │   │
│  │    = Hydrogen_Consumption × Hydrogen_Price                   │   │
│  │                                                               │   │
│  │ 4. Electricity Cost                                          │   │
│  │    = Electricity_Consumption × Electricity_Rate              │   │
│  │                                                               │   │
│  │ 5. Carbon Intensity Components (kg CO2e/ton):                │   │
│  │    a) CI_feedstock = Feedstock_CI × Feedstock_Yield          │   │
│  │    b) CI_hydrogen = H2_CI × H2_Yield                         │   │
│  │    c) CI_electricity = Elec_CI × Elec_Yield                  │   │
│  │    d) CI_process = Process_CI × Fuel_Energy_Content          │   │
│  │                                                               │   │
│  │ 6. Total Carbon Intensity (kg CO2e/ton)                      │   │
│  │    CI_total = (CI_feedstock + CI_hydrogen +                  │   │
│  │                CI_electricity + CI_process) × EC_product      │   │
│  │                                                               │   │
│  │ FOR EACH PRODUCT:                                            │   │
│  │ 7. Carbon Intensity (product)                                │   │
│  │    = CI_total × Product_Yield                                │   │
│  │                                                               │   │
│  │ 8. Carbon Conversion Efficiency (product)                    │   │
│  │    = (CC_product × Yield_product) /                          │   │
│  │      (CC_feedstock × Yield_feedstock) × 100                  │   │
│  │                                                               │   │
│  │ 9. Total CO2 Emissions (product)                             │   │
│  │    = CI_product × Production_product / 1000 (ton/year)       │   │
│  │                                                               │   │
│  │ 10. Revenue (per product)                                    │   │
│  │     = Amount_of_Product × Product_Price                      │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  OUTPUTS:                                                            │
│  - total_indirect_opex (USD/year)                                    │
│  - feedstock_cost (USD/year)                                         │
│  - hydrogen_cost (USD/year)                                          │
│  - electricity_cost (USD/year)                                       │
│  - revenue (USD/year, sum of all products)                           │
│  - carbon_intensity_*_kgco2_ton (breakdown by input type)            │
│  - product_carbon_metrics[] (CI, CCE, emissions per product)         │
│  - product_revenues[] (amount, price, revenue per product)           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│      LAYER 3 - DIRECT OPEX & WEIGHTED CARBON INTENSITY              │
│  (feature_calculations.py:507)                                       │
│                                                                       │
│  INPUTS:                                                             │
│  - layer2_results (list, supports multiple feedstocks)               │
│                                                                       │
│  CALCULATIONS:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Total Direct OPEX                                         │   │
│  │    = Σ(Feedstock_Costs) + Σ(H2_Costs) + Σ(Elec_Costs)        │   │
│  │                                                               │   │
│  │ 2. Weighted Carbon Intensity                                 │   │
│  │    = Σ(CI_i × Product_Yield_i)                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  OUTPUTS:                                                            │
│  - total_direct_opex (USD/year)                                      │
│  - weighted_carbon_intensity                                         │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│         LAYER 4 - TOTAL OPEX, EMISSIONS & LCOP                       │
│  (feature_calculations.py:552)                                       │
│                                                                       │
│  INPUTS:                                                             │
│  - layer1_results, layer2_results, layer3_results                    │
│  - discount_rate, plant_lifetime                                     │
│                                                                       │
│  CALCULATIONS:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ 1. Total OPEX                                                │   │
│  │    = Total_Direct_OPEX + Total_Indirect_OPEX                 │   │
│  │                                                               │   │
│  │ 2. Total CO2 Emissions                                       │   │
│  │    = Carbon_Intensity × Product_Energy_Content ×             │   │
│  │      Production × 1000                                       │   │
│  │                                                               │   │
│  │ 3. Levelized Cost of Production (LCOP)                       │   │
│  │    a) Calculate Capital Recovery Factor (CRF):               │   │
│  │       CRF = r(1+r)^n / ((1+r)^n - 1)                         │   │
│  │                                                               │   │
│  │    b) Annualized Capital:                                    │   │
│  │       = TCI_USD × CRF                                        │   │
│  │                                                               │   │
│  │    c) LCOP (USD/ton):                                        │   │
│  │       = (Feedstock_Cost + H2_Cost + Elec_Cost +              │   │
│  │          Indirect_OPEX + Annualized_Capital) /               │   │
│  │         Plant_Capacity_tons                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  OUTPUTS:                                                            │
│  - total_opex (USD/year)                                             │
│  - total_co2_emissions                                               │
│  - lcop (USD/ton)                                                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    FINANCIAL ANALYSIS                                │
│  (financial_analysis.py)                                             │
│                                                                       │
│  INPUTS:                                                             │
│  - tci_usd: Total capital investment in USD                          │
│  - annual_revenue: Revenue from Layer 2                              │
│  - annual_manufacturing_cost: Total OPEX from Layer 4                │
│  - project_lifetime: Years                                           │
│  - discount_rate: Discount rate (default 0.07)                       │
│                                                                       │
│  CALCULATIONS:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ FOR EACH YEAR (0 to lifetime):                               │   │
│  │                                                               │   │
│  │ 1. Year 0 (Construction):                                    │   │
│  │    - Capital Expenditure = -TCI                              │   │
│  │    - Revenue = 0                                             │   │
│  │    - Manufacturing Cost = 0                                  │   │
│  │    - Cash Flow = -TCI                                        │   │
│  │                                                               │   │
│  │ 2. Years 1-N (Operations):                                   │   │
│  │    - Capital Expenditure = 0                                 │   │
│  │    - Revenue = Annual Revenue                                │   │
│  │    - Manufacturing Cost = Annual OPEX                        │   │
│  │    - Cash Flow = Revenue - Manufacturing Cost                │   │
│  │                                                               │   │
│  │ 3. Net Present Value (NPV):                                  │   │
│  │    NPV = Σ [Cash_Flow_t / (1 + r)^t]                         │   │
│  │                                                               │   │
│  │ 4. Internal Rate of Return (IRR):                            │   │
│  │    Find r where NPV = 0                                      │   │
│  │    (using numpy.irr function)                                │   │
│  │                                                               │   │
│  │ 5. Payback Period:                                           │   │
│  │    First year where cumulative cash flow > 0                 │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                       │
│  OUTPUTS:                                                            │
│  - npv: Net Present Value (USD)                                      │
│  - irr: Internal Rate of Return (%)                                  │
│  - payback_period: Years to recover investment                       │
│  - cash_flow_schedule: Year-by-year cash flow table                  │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   ASSEMBLE FINAL RESPONSE                            │
│  (economics.py:166)                                                  │
│                                                                       │
│  {                                                                   │
│    "techno_economics": {                                             │
│      "process_technology": "HEFA",                                   │
│      "feedstock": "UCO",                                             │
│      "LCOP": 1460.50,                                                │
│      "total_capital_investment": 850.0,                              │
│      "production": 485000.0,                                         │
│      "feedstock_consumption": 518750.0,                              │
│      "total_opex": 450000000.0,                                      │
│      "total_co2_emissions": 24500.0,                                 │
│      "carbon_intensity": 50.5,                                       │
│      "utility_consumption": {                                        │
│        "hydrogen": 21000000.0,                                       │
│        "electricity": 60000000.0                                     │
│      },                                                              │
│      "product_breakdown": {                                          │
│        "jet": 340000.0,                                              │
│        "diesel": 145000.0                                            │
│      },                                                              │
│      "carbon_conversion_efficiency": 85.0,                           │
│      "opex_breakdown": { ... },                                      │
│      "carbon_intensity_breakdown": { ... },                          │
│      "product_carbon_intensity": { ... },                            │
│      "product_carbon_conversion_efficiency": { ... },                │
│      "product_co2_emissions": { ... }                                │
│    },                                                                │
│    "financials": {                                                   │
│      "npv": 1250000000.0,                                            │
│      "irr": 15.5,                                                    │
│      "payback_period": 6.2,                                          │
│      "cashFlowTable": [ ... ]                                        │
│    },                                                                │
│    "resolved_inputs": { ... }                                        │
│  }                                                                   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       API RESPONSE                                   │
│  Return CalculationResponse to client                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Data Flows

### 1. Input Processing Flow

```
User JSON Request
    ↓
Pydantic Schema Validation (UserInputsSchema)
    ↓
Convert to Dataclass (UserInputs)
    ↓
Flatten to Dict (to_flat_dict)
    ↓
Pass to Calculation Layers
```

### 2. Reference Data Flow

```
Database (reference_data table)
    ↓
BiofuelCRUD.get_project_reference_data()
    ↓
DataBridge.db_to_calc_format()
    ↓
Standardized Reference Dict
    ↓
Pass to Calculation Layers
```

### 3. Product Processing Flow

```
Multiple Products Input
    ↓
Layer 1: Calculate individual amounts, yields, carbon metrics
    ↓
Layer 2: Calculate individual CI, CCE, CO2 emissions, revenue
    ↓
Aggregate: Sum revenues, average CCE, sum CO2 emissions
    ↓
Return per-product breakdown + totals
```

---

## Important Calculation Notes

### Unit Conversions

1. **Plant Capacity**: Input in KTA (kilotons/year), converted to tons/year by × 1000
2. **Capital Investment**: Layer 1 outputs in MUSD, converted to USD by × 1,000,000 for LCOP
3. **Yields**: All yields are per kg of feedstock (kg/kg or kWh/kg)
4. **Carbon Intensity**:
   - Inputs in gCO2/kg or gCO2/kWh
   - Calculated in kg CO2e/ton
   - Final CI may be in kg CO2/MJ depending on context

### Key Formulas

**Economy of Scale (TCI):**
```
TCI = TCI_ref × (Capacity / Capacity_ref)^0.6
```

**Capital Recovery Factor:**
```
CRF = r(1+r)^n / ((1+r)^n - 1)
where:
  r = discount rate
  n = project lifetime
```

**LCOP:**
```
LCOP = (C_feedstock + C_H2 + C_elec + C_indirect + C_capital_annualized) / Q_capacity
```

**Carbon Intensity (Total):**
```
CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product
```

---

## File References

| Component | File | Line |
|-----------|------|------|
| API Endpoint | `app/api/endpoints/calculations.py` | 26-78 |
| Economics Orchestrator | `app/services/economics.py` | 27-217 |
| Layer 1 | `app/services/feature_calculations.py` | 26-234 |
| Layer 2 | `app/services/feature_calculations.py` | 236-506 |
| Layer 3 | `app/services/feature_calculations.py` | 507-550 |
| Layer 4 | `app/services/feature_calculations.py` | 552-660 |
| Financial Analysis | `app/services/financial_analysis.py` | - |
| User Input Schema | `app/schemas/biofuel_schema.py` | 101-165 |
| Data Bridge | `app/services/data_bridge.py` | - |

---

## Error Handling

The system includes error handling at multiple levels:

1. **API Level**: HTTPException with 400/404 status codes
2. **Schema Validation**: Pydantic validates all inputs
3. **Calculation Safety**: Division by zero protection (+ 1e-12)
4. **Data Validation**: Product mass fraction validation (must not exceed 100%)

---

## Debug Points

The code includes extensive debug print statements at critical points:

- TCI calculation details (feature_calculations.py:45-52)
- Product amounts verification (feature_calculations.py:162-164)
- Yield override checks (feature_calculations.py:196-207)
- Utility consumption (feature_calculations.py:209-211)
- LCOP breakdown (feature_calculations.py:592-621)
- Production verification (economics.py:68-72)
- Revenue verification (feature_calculations.py:476-481)

These can be used for troubleshooting calculation issues.

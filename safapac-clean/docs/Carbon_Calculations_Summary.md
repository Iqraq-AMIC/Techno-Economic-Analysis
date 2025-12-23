# Carbon Calculations Implementation Summary

## Overview
This document summarizes the implementation of carbon intensity, carbon conversion efficiency, and CO2 emissions calculations in the backend service.

## Implemented Calculations

### 1. Carbon Intensity (CI) - Units: **kg CO2e/ton product**

#### CI Feedstock
```
CI feedstock = feedstock CI (gCO2/kg) × feedstock yield (kg/kg)
             = kg CO2e/ton product
```

#### CI Hydrogen
```
CI hydrogen = hydrogen CI (gCO2/kg) × hydrogen yield (kg/kg)
            = kg CO2e/ton product
```

#### CI Electricity
```
CI electricity = electricity CI (gCO2/kWh) × electricity yield (kWh/kg)
               = kg CO2e/ton product
```

#### CI Process
```
CI process = process CI (gCO2/MJ) × fuel energy content (MJ/kg)
           = kg CO2e/ton product
```

#### Total Carbon Intensity
```
For HEFA:
EC product = sum of (mass fraction for each product)
CI total = [CI feedstock + CI hydrogen + CI electricity + CI process] × EC product
         = kg CO2e/ton product

For PTL-FT-DAC:
CI total = [CI electricity + CI process] / 1000
         = kg CO2e/ton product
```

#### CI per Product
```
CI (jet)     = CI total × product yield (jet)
CI (diesel)  = CI total × product yield (diesel)
CI (naphtha) = CI total × product yield (naphtha)
Units: kg CO2e/ton product
```

---

### 2. Carbon Conversion Efficiency (CCE) - Units: **% (percentage)**

#### CCE per Product
```
CCE (jet)     = (CC jet × jet yield / CC feedstock × feedstock yield) × 100%
CCE (diesel)  = (CC diesel × diesel yield / CC feedstock × feedstock yield) × 100%
CCE (naphtha) = (CC naphtha × naphtha yield / CC feedstock × feedstock yield) × 100%

Where:
- CC = Carbon Content (kg C/kg)
- If multiple feedstocks are used, CC feedstock should be the sum of all feedstocks carbon content
```

#### Total CCE
```
Total CCE = Average of all product CCEs
```

---

### 3. Total CO2 Emissions - Units: **ton/year**

#### CO2 Emissions per Product
```
Total CO2 emission (jet)     = CI (jet) × production (jet) / 1000
Total CO2 emission (diesel)  = CI (diesel) × production (diesel) / 1000
Total CO2 emission (naphtha) = CI (naphtha) × production (naphtha) / 1000

Where:
- CI is in kg CO2e/ton
- Production is in tons/year
- Result is in ton/year (ton CO2 per year)
```

#### Total CO2 Emissions
```
Total CO2 emissions = sum of all product CO2 emissions
```

---

## API Response Structure

The calculation endpoint now returns the following additional fields:

```json
{
  "techno_economics": {
    "carbon_intensity_breakdown": {
      "feedstock": 20.8,     // kg CO2e/ton
      "hydrogen": 0.58,       // kg CO2e/ton
      "electricity": 60.0,    // kg CO2e/ton
      "process": 146.54,      // kg CO2e/ton
      "total": 227.92         // kg CO2e/ton
    },
    "product_carbon_intensity": {
      "jet": 136.75,          // kg CO2e/ton
      "diesel": 91.17,        // kg CO2e/ton
      "naphtha": 45.58        // kg CO2e/ton
    },
    "product_carbon_conversion_efficiency": {
      "jet": 65.38,           // %
      "diesel": 58.21,        // %
      "naphtha": 42.15        // %
    },
    "product_co2_emissions": {
      "jet": 41025,           // ton/year
      "diesel": 27351,        // ton/year
      "naphtha": 13675        // ton/year
    },
    "total_carbon_conversion_efficiency": 55.25,  // % (average)
    "total_co2_emissions": 82051  // ton/year (sum)
  }
}
```

---

## Files Modified

1. **backend/app/services/feature_calculations.py** (Layer2 class)
   - Added methods for calculating CI components
   - Added method for calculating CCE per product
   - Added method for calculating CO2 emissions per product
   - Updated compute() method to calculate all metrics

2. **backend/app/services/economics.py**
   - Updated response structure to include new carbon metrics
   - Added proper mapping of product-level metrics

3. **backend/app/schemas/biofuel_schema.py**
   - Added hydrogen_carbon_intensity and hydrogen_carbon_content to input mapping
   - Added electricity_carbon_intensity and electricity_carbon_content to input mapping

4. **backend/tests/test_carbon_calculations.py** (NEW)
   - Comprehensive test suite for all carbon calculations
   - Tests individual CI calculations
   - Tests CCE calculations
   - Tests CO2 emissions calculations
   - Tests integrated calculation flow

---

## Unit Conversions

### Carbon Intensity Conversion
- **Input**: gCO2/kg (for feedstock/hydrogen) or gCO2/kWh (for electricity) or gCO2/MJ (for process)
- **Output**: kg CO2e/ton product
- **Conversion**: gCO2/kg × kg/kg = g/kg = kg/ton (since 1000 g = 1 kg and 1000 kg = 1 ton)

### CO2 Emissions Conversion
- **Input**: CI (kg CO2e/ton) × Production (ton/year)
- **Output**: ton/year
- **Formula**: CI × Production / 1000 = ton/year

---

## Test Results

All tests pass successfully:
- ✓ CI Feedstock calculation
- ✓ CI Hydrogen calculation
- ✓ CI Electricity calculation
- ✓ Carbon Conversion Efficiency calculation
- ✓ Total CO2 Emissions calculation
- ✓ Integrated calculation flow

Example test output:
```
Carbon Intensity Breakdown:
  Feedstock:    20.80 kg CO2e/ton
  Hydrogen:     0.58 kg CO2e/ton
  Electricity:  60.00 kg CO2e/ton
  Process:      146.54 kg CO2e/ton
  Total:        227.92 kg CO2e/ton

Product Carbon Intensity (Jet):
  CI: 136.75 kg CO2e/ton

Carbon Conversion Efficiency (Jet):
  CCE: 65.38%

Total CO2 Emissions (Jet):
  Emissions: 41,025 ton/year
```

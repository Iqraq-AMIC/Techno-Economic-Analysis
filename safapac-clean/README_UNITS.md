# Units of Measure

This document lists the units of measure exposed in the frontend (UI dropdowns) and the full set of unit strings accepted by the backend (including normalized synonyms). It also notes how units are normalized server‑side.

## Overview

- Frontend exposes a curated set of units for each input field.
- Backend accepts multiple synonyms and normalizes units by lowercasing and removing spaces, underscores, and hyphens.
- Unsupported units will raise a validation error in the backend.

Normalization helper (backend): lowercases and strips spaces/`_`/`-` before matching.

## Frontend Units (UI dropdowns)

- Capacity: `t/yr`, `KTA`, `MGPY`, `BPD`
- Average liquid density: `kg/m3`
- Prices: `USD/t`, `USD/kg`; Electricity prices: `USD/kWh`, `USD/MWh`
- Carbon intensity (mass): `gCO2/kg`, `kgCO2/t`
- Carbon intensity (electricity): `gCO2/kWh`, `kgCO2/MWh`
- Energy content: `MJ/kg`
- Yields (mass): `kg/kg`, `ton/ton`
- Yields (electricity): `kWh/kg`, `MWh/kg`
- TCI currency: `USD`
- Capacity reference: `t/yr`, `KTA`, `MGPY`, `BPD`

Source: `frontend/src/forms/BiofuelForm.js`

## Backend Accepted Units (normalized synonyms)

Below are the sets of unit strings accepted after normalization. Examples shown with typical casing; matching is case‑insensitive and punctuation‑insensitive.

### Capacity

- Tons per year: `t/yr`, `ton/yr`, `tons/yr`, `tpa`, `tpy`
- Kilo‑tons per year: `kta`, `kt/yr`, `ktpa`
- Liquid volume per year: `mgpy`, `milliongallonsperyear`
- Barrels per day: `bpd`, `barrelsperday`

### Density

- `kg/m3`, `kgperm3`, `kgper/m3`
- `g/cm3`, `g/cm^3`, `gpercm3`, `gpercm^3`

### Prices (general)

- Per ton: `usd/t`, `usd/ton`, `usd/tonne`, `$/t`, `$/ton`
- Per kg: `usd/kg`, `$/kg`
- Per kilo‑ton: `usd/kt`, `$/kt`

### Electricity Prices

- `usd/kwh`, `$/kwh`
- `usd/mwh`, `$/mwh`

### Carbon Intensity (mass basis)

- `gco2/kg`, `gco2e/kg`, `gco2perkg`
- `kgco2/t`, `kgco2e/t`, `kgco2/tonne`

### Carbon Intensity (electricity)

- `gco2/kwh`
- `kgco2/mwh`

### Energy Content

- `mj/kg`, `mjperkg`

### Yields

- Mass‑based: `kg/kg`, `kgperkg`, `t/t`, `ton/ton`
- Electricity: `kwh/kg`, `kwhperkg`, `mwh/kg`, `mwhperkg`

### Price Sensitivity to CI

- `usd/gco2`, `usd/gco2e`, `$/gco2`
- `usd/kgco2`, `$/kgco2`

### Currency Amounts

- `usd`, `$`, `musd`, `kusd`

Source: `backend/app/models.py`

## Notes and Tips

- Mass fractions are entered as percentages in the UI but normalized to 0–1 internally. If a value > 1 is provided, it is divided by 100.
- Capacity conversions:
  - `KTA` → t/yr by ×1000
  - `MGPY` and `BPD` require average liquid density (`kg/m3`) to convert to t/yr
- Electricity conversions:
  - `USD/MWh` ↔ `USD/kWh` via ×/÷ 1000
  - Electricity yields in `MWh/kg` are converted to `kWh/kg` via ×1000
- Carbon intensity conversions:
  - `kgCO2/t` is treated numerically equivalent to `gCO2/kg` when normalized on a per‑kg basis (both divide by 1000)

## Example JSON Fragments

```json
{
  "plant": {
    "total_liquid_fuel_capacity": {"value": 500, "unit": "KTA"},
    "annual_load_hours": 8000,
    "conversion_process_carbon_intensity_default": 20,
    "average_liquid_density": {"value": 820, "unit": "kg/m3"}
  },
  "feedstocks": [
    {
      "name": "UCO",
      "price": {"value": 930, "unit": "USD/t"},
      "carbon_content": 0.86,
      "carbon_intensity": {"value": 50, "unit": "gCO2/kg"},
      "energy_content": {"value": 37, "unit": "MJ/kg"},
      "yield_": {"value": 1.21, "unit": "kg/kg"}
    }
  ],
  "utilities": [
    {
      "name": "Hydrogen",
      "price": {"value": 5.4, "unit": "USD/kg"},
      "yield_": {"value": 0.042, "unit": "kg/kg"}
    },
    {
      "name": "Electricity",
      "price": {"value": 0.055, "unit": "USD/kWh"},
      "carbon_intensity": {"value": 20, "unit": "gCO2/kWh"},
      "yield_": {"value": 0.12, "unit": "kWh/kg"}
    }
  ],
  "products": [
    {
      "name": "Jet Fuel",
      "price": {"value": 3000, "unit": "USD/t"},
      "price_sensitivity_to_ci": {"value": 0.0, "unit": "USD/gCO2"},
      "carbon_content": 0.86,
      "energy_content": {"value": 43.8, "unit": "MJ/kg"},
      "yield_": {"value": 0.64, "unit": "kg/kg"},
      "mass_fraction": 64
    }
  ],
  "economics": {
    "tci_at_reference_capacity": {"value": 400000000, "unit": "USD"},
    "reference_production_capacity": {"value": 500, "unit": "KTA"},
    "discount_rate": 0.07,
    "project_lifetime_years": 20,
    "tci_scaling_exponent": 0.6,
    "wc_to_tci_ratio": 0.15,
    "indirect_opex_to_tci_ratio": 0.077
  }
}
```

## Related Files

- Backend logic: `backend/app/models.py`
- Form options (UI): `frontend/src/forms/BiofuelForm.js`
- Worked examples: `backend/HEFA_TEST_COMPARISON.md`, `backend/CORRECT_INPUT_GUIDE.md`


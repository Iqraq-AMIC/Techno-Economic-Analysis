# CORRECT INPUT VALUES FOR HEFA TEST

## Issues Found in Your Screenshot

### ❌ WRONG VALUES IN YOUR INPUT:
1. **Electricity Price**: 55 USD/kWh (should be 0.055 USD/kWh)
2. **Jet Fuel Mass Fraction**: 70% (should be 64%)
3. **Diesel Mass Fraction**: 20% (should be 15%)
4. **Naphtha Mass Fraction**: 10% (should be 21%)

### Impact of Errors:
- Electricity cost: $3.3 billion/year (should be $3.3 million/year)
- Total OPEX: $7.06 billion/year (should be $710 million/year)
- LCOP: $14,187.61/ton (should be $1,495.81/ton)
- NPV: -$62 billion (should be +$3.5 billion)

---

## ✓ CORRECT INPUT VALUES

### Plant Specifications
| Parameter | Correct Value | Unit |
|-----------|---------------|------|
| Production Capacity | 500 | KTA |
| Average Liquid Density | 800 | kg/m³ |
| Annual Load Hours | 8000 | hours |
| Process CI | 20 | gCO2e/MJ |

### Feedstock (UCO)
| Parameter | Correct Value | Unit |
|-----------|---------------|------|
| Feedstock Price | 930 | USD/t |
| Feedstock Yield | 1.21 | kg/kg |

### Utilities
| Utility | Price | Correct Value | Unit |
|---------|-------|---------------|------|
| Hydrogen | Price | 5.4 | USD/kg |
| Hydrogen | Yield | 0.042 | kg/kg |
| Electricity | Price | **0.055** | **USD/kWh** |
| Electricity | Price (alt) | 55 | USD/MWh |
| Electricity | Yield | 0.12 | kWh/kg |
| Electricity | CI | 20 | gCO2e/kWh |

**⚠️ IMPORTANT**: Electricity price must be **0.055 USD/kWh**, NOT 55 USD/kWh!

### Products
| Product | Price (USD/t) | Mass Fraction % | Energy (MJ/kg) |
|---------|---------------|-----------------|----------------|
| Jet Fuel | 3000 | **64** | 43.8 |
| Diesel | 1500 | **15** | 42.6 |
| Naphtha | 1000 | **21** | 43.4 |

**⚠️ NOTE**: Mass fractions must sum to 100%: 64 + 15 + 21 = 100 ✓

### Economic Parameters
| Parameter | Correct Value | Unit |
|-----------|---------------|------|
| Discount Rate | 0.07 | - |
| Discount Rate (%) | 7 | % |
| Plant Lifetime | 20 | years |
| TCI Reference | 400000000 | USD |
| TCI Reference (M) | 400 | Million USD |
| Capacity Reference | 500 | KTA |
| Scaling Exponent | 0.6 | - |
| Working Capital Ratio | 0.15 | - |
| Indirect OPEX Ratio | 0.077 | - |

---

## ✓ EXPECTED CORRECT OUTPUTS

### Production & Consumption
| Metric | Expected Value | Unit |
|--------|----------------|------|
| Total Production | 500,000 | t/year |
| UCO Consumption | 605,000 | t/year |
| H2 Consumption | 21,000,000 | kg/year |
| Electricity Consumption | 60,000,000 | kWh/year |

### Costs (Annual)
| Cost Item | Expected Value | Unit |
|-----------|----------------|------|
| Feedstock Cost | $562,650,000 | USD/year |
| Hydrogen Cost | $113,400,000 | USD/year |
| Electricity Cost | **$3,300,000** | USD/year |
| Indirect OPEX | $30,800,000 | USD/year |
| Direct OPEX | $679,350,000 | USD/year |
| **Total OPEX** | **$710,150,000** | USD/year |

### Revenue (Annual)
| Product | Expected Value | Unit |
|---------|----------------|------|
| Jet Fuel Revenue | $960,000,000 | USD/year |
| Diesel Revenue | $112,500,000 | USD/year |
| Naphtha Revenue | $105,000,000 | USD/year |
| **Total Revenue** | **$1,177,500,000** | USD/year |

### Financial Metrics
| Metric | Expected Value | Unit |
|--------|----------------|------|
| TCI | $400,000,000 | USD |
| LCOP | **$1,495.81** | USD/ton |
| NPV (20 years) | **+$3,532,017,806** | USD |
| IRR | 119.7 | % |
| Payback Period | <1 | year |

### Carbon Metrics
| Metric | Expected Value | Unit |
|--------|----------------|------|
| Carbon Intensity (Total) | 20.39 | gCO2e/MJ |
| Total CO2 Emissions | 443,830,000 | kg CO2e/year |

---

## How to Enter Data in Frontend

### Step-by-Step Corrections:

1. **Go to the TEA Dashboard**
2. **Select Process**: HEFA
3. **Select Feedstock**: UCO

4. **Conversion Plant Section**:
   - Production Capacity: `500`
   - Unit: `KTA`
   - Annual Load Hours: `8000`
   - Process CI: `20`

5. **Feedstock & Utilities Section**:
   - Feedstock Price: `930` (Unit: USD/t)
   - Feedstock Yield: `1.21` (Unit: kg/kg)
   - Hydrogen Price: `5.4` (Unit: USD/kg)
   - Hydrogen Yield: `0.042` (Unit: kg/kg)
   - **Electricity Price**: `0.055` (Unit: USD/kWh) ← FIX THIS!
   - **OR Electricity Price**: `55` (Unit: USD/MWh) ← If using MWh
   - Electricity Yield: `0.12` (Unit: kWh/kg)
   - Electricity CI: `20` (Unit: gCO2e/kWh)

6. **Products Section**:
   - **Jet Fuel**:
     - Price: `3000` (USD/t)
     - Mass Fraction: `64` (%) ← FIX THIS!
     - Energy: `43.8` (MJ/kg)
   - **Diesel**:
     - Price: `1500` (USD/t)
     - Mass Fraction: `15` (%) ← FIX THIS!
     - Energy: `42.6` (MJ/kg)
   - **Naphtha**:
     - Price: `1000` (USD/t)
     - Mass Fraction: `21` (%) ← FIX THIS!
     - Energy: `43.4` (MJ/kg)

7. **Economic Parameters**:
   - Discount Rate: `0.07` or `7%`
   - Plant Lifetime: `20` years
   - TCI Reference: `400000000` USD
   - Capacity Reference: `500` KTA
   - Scaling Exponent: `0.6`
   - Working Capital: `0.15`
   - Indirect OPEX: `0.077`

---

## Verification Checklist

Before clicking "Calculate", verify:

- [ ] Electricity price is **0.055 USD/kWh** (NOT 55!)
- [ ] Product mass fractions: Jet=64%, Diesel=15%, Naphtha=21%
- [ ] Mass fractions sum to 100%
- [ ] All other values match the table above

After calculation, check:

- [ ] Electricity Cost ≈ $3.3 million (NOT billions!)
- [ ] Total OPEX ≈ $710 million
- [ ] LCOP ≈ $1,496/ton
- [ ] NPV is positive and ≈ $3.5 billion

---

## Common Mistakes to Avoid

1. **Unit Confusion**:
   - ❌ $55/kWh (too expensive!)
   - ✓ $55/MWh = $0.055/kWh

2. **Mass Fraction Errors**:
   - ❌ Must sum to 100%
   - ❌ Don't use yield values (0.64) as mass fractions (64%)
   - ✓ Enter as percentages: 64, 15, 21

3. **Capacity Units**:
   - ✓ 500 KTA = 500,000 tons/year
   - Make sure unit dropdown is set correctly

4. **Decimal Places**:
   - Discount rate: 0.07 (not 7 unless unit is %)
   - Scaling exponent: 0.6
   - Ratios: 0.15, 0.077

---

*If you correct these values, your output should match the expected results exactly.*

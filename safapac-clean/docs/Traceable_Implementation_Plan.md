# Traceable Calculation Implementation Plan

This document outlines the **phased implementation plan** for adding comprehensive traceable calculations to the SAFAPAC backend, based on the detailed specifications in [Calculation_Process_Flowchart.md](Calculation_Process_Flowchart.md).

---

## Current Status vs. Target Format

### Current Implementation (Simplified)
```json
{
  "value": 400.0,
  "unit": "MUSD",
  "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)",
  "components": [...],
  "metadata": {...}
}
```

### Target Implementation (Comprehensive)
```json
{
  "name": "Total Capital Investment",
  "value": 400.0,
  "unit": "MUSD",
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
    }
  ],
  "metadata": {...}
}
```

**Key Differences:**
- ✅ Current has: `value`, `unit`, `formula`, `components`, `metadata`
- ❌ Missing: `name`, `inputs`, `calculation_steps` with detailed breakdown

---

## Implementation Phases

### Phase 1: Foundation ✅ (COMPLETED)

**Goal**: Create basic traceable structure with simplified format

**Completed Items:**
- ✅ TraceableValue and ComponentValue models ([backend/app/models/traceable_value.py](../backend/app/models/traceable_value.py))
- ✅ TraceableEconomics wrapper service ([backend/app/services/traceable_economics.py](../backend/app/services/traceable_economics.py))
- ✅ Basic traceable outputs for:
  - `total_capital_investment_traceable`
  - `total_opex_traceable`
  - `LCOP_traceable`
  - `total_revenue_traceable`
  - `production_traceable`
  - `carbon_intensity_traceable`
  - `total_emissions_traceable`

**Status**: ✅ **COMPLETE** - Basic structure is working

**Testing**: Can be tested via Swagger UI at `/api/calculate/quick`

---

### Phase 2: Enhanced Traceable Format (CURRENT PHASE)

**Goal**: Upgrade to comprehensive format with `inputs` and `calculation_steps`

#### 2.1: Update TraceableValue Model

**File**: `backend/app/models/traceable_value.py`

**Changes Needed**:
```python
@dataclass
class TraceableValue:
    """Enhanced traceable value with comprehensive calculation breakdown."""
    name: str                              # NEW: Name of the metric
    value: float
    unit: str
    formula: str
    inputs: Optional[Dict[str, Any]]       # NEW: All input values with units
    calculation_steps: List[CalculationStep]  # NEW: Step-by-step breakdown
    components: List[ComponentValue]
    metadata: Optional[Dict[str, Any]]
```

**New Supporting Model**:
```python
@dataclass
class CalculationStep:
    """Represents a single step in a calculation."""
    step: int
    description: str
    formula: str
    calculation: str
    result: Dict[str, Any]
    details: Optional[Dict[str, Any]] = None
```

**Files to Modify**:
- [ ] `backend/app/models/traceable_value.py` - Add `name`, `inputs`, `calculation_steps` fields
- [ ] `backend/app/models/traceable_value.py` - Add `CalculationStep` dataclass

**Estimated Effort**: 30 minutes

---

#### 2.2: Layer 1 Traceable Calculations

**File**: `backend/app/services/traceable_economics.py`

**Calculations to Enhance**:

##### 2.2.1: Total Capital Investment (TCI) ⚠️ NEEDS ENHANCEMENT
**Current**: Basic formula + metadata
**Target**: Add `inputs` and `calculation_steps` (4 steps as per flowchart lines 158-209)

**Implementation**:
```python
def _create_tci_traceable(self, techno: dict) -> TraceableValue:
    # Extract inputs
    tci_ref = self.inputs.economic_parameters.tci_ref_musd
    capacity = techno.get("production", 0)  # or from inputs
    capacity_ref = self.inputs.economic_parameters.reference_capacity_ktpa * 1000
    scaling_exp = self.inputs.economic_parameters.tci_scaling_exponent

    # Calculation steps
    ratio = capacity / capacity_ref
    scale_factor = ratio ** scaling_exp
    tci = tci_ref * scale_factor

    return TraceableValue(
        name="Total Capital Investment",
        value=tci,
        unit="MUSD",
        formula="TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent",
        inputs={
            "tci_ref": {"value": tci_ref, "unit": "MUSD"},
            "capacity": {"value": capacity, "unit": "tons/year"},
            "capacity_ref": {"value": capacity_ref, "unit": "tons/year"},
            "scaling_exponent": {"value": scaling_exp, "unit": "dimensionless"}
        },
        calculation_steps=[
            CalculationStep(
                step=1,
                description="Calculate capacity ratio",
                formula="ratio = capacity / capacity_ref",
                calculation=f"{capacity} / {capacity_ref} = {ratio}",
                result={"value": ratio, "unit": "dimensionless"}
            ),
            CalculationStep(
                step=2,
                description="Apply economy of scale",
                formula="scale_factor = ratio^scaling_exponent",
                calculation=f"{ratio}^{scaling_exp} = {scale_factor}",
                result={"value": scale_factor, "unit": "dimensionless"}
            ),
            CalculationStep(
                step=3,
                description="Calculate TCI",
                formula="TCI = tci_ref × scale_factor",
                calculation=f"{tci_ref} × {scale_factor} = {tci}",
                result={"value": tci, "unit": "MUSD"}
            )
        ],
        components=[...],
        metadata={...}
    )
```

**Tasks**:
- [ ] Enhance `_create_tci_traceable()` with inputs and calculation_steps
- [ ] Test TCI traceable output

**Estimated Effort**: 1 hour

---

##### 2.2.2: Feedstock Consumption ❌ NOT IMPLEMENTED
**Current**: Not traceable
**Target**: Add full traceable output (flowchart lines 213-241)

**Formula**: `Feedstock_Consumption = Plant_Capacity × Feedstock_Yield`

**Tasks**:
- [ ] Create `_create_feedstock_consumption_traceable()`
- [ ] Add to response in `run()` method
- [ ] Test feedstock consumption traceable output

**Estimated Effort**: 45 minutes

---

##### 2.2.3: Hydrogen Consumption ❌ NOT IMPLEMENTED
**Current**: Not traceable
**Target**: Add full traceable output (flowchart lines 245-273)

**Formula**: `Hydrogen_Consumption = Plant_Capacity × Yield_H2`

**Tasks**:
- [ ] Create `_create_hydrogen_consumption_traceable()`
- [ ] Add to response in `run()` method
- [ ] Test hydrogen consumption traceable output

**Estimated Effort**: 45 minutes

---

##### 2.2.4: Electricity Consumption ❌ NOT IMPLEMENTED
**Current**: Not traceable
**Target**: Add full traceable output (flowchart lines 277-308)

**Formula**: `Electricity_Consumption = Plant_Capacity × Yield_MWh`

**Tasks**:
- [ ] Create `_create_electricity_consumption_traceable()`
- [ ] Add to response in `run()` method
- [ ] Test electricity consumption traceable output

**Estimated Effort**: 45 minutes

---

##### 2.2.5: Product Production (Per Product) ⚠️ NEEDS ENHANCEMENT
**Current**: Basic components breakdown
**Target**: Add inputs and calculation_steps for each product (flowchart lines 312-345)

**Formula**: `Amount_of_Product = Plant_Capacity × Product_Yield`

**Tasks**:
- [ ] Enhance `_create_production_traceable()` with inputs and calculation_steps
- [ ] Add per-product calculation details
- [ ] Test production traceable output

**Estimated Effort**: 1 hour

---

##### 2.2.6: Carbon Conversion Efficiency (Per Product) ❌ NOT IMPLEMENTED
**Current**: Available in techno dict but not traceable
**Target**: Add full traceable output (flowchart lines 348-392)

**Formula**: `CCE (%) = (CC_product × Yield_product) / (CC_feedstock × Yield_feedstock) × 100`

**Tasks**:
- [ ] Create `_create_carbon_conversion_efficiency_traceable()`
- [ ] Add per-product CCE breakdown
- [ ] Add to response in `run()` method
- [ ] Test CCE traceable output

**Estimated Effort**: 1 hour

---

##### 2.2.7: Weighted Fuel Energy Content ❌ NOT IMPLEMENTED
**Current**: Available in techno dict but not traceable
**Target**: Add full traceable output (flowchart lines 396-460)

**Formula**: `Fuel_Energy_Content = Σ(Energy_Content_i × Mass_Fraction_i)`

**Tasks**:
- [ ] Create `_create_fuel_energy_content_traceable()`
- [ ] Add product-by-product energy contribution steps
- [ ] Add to response in `run()` method
- [ ] Test fuel energy content traceable output

**Estimated Effort**: 1 hour

---

#### 2.3: Layer 2 Traceable Calculations

**File**: `backend/app/services/traceable_economics.py`

##### 2.3.1: Total Indirect OPEX ❌ NOT IMPLEMENTED
**Current**: Included in OPEX components but not standalone traceable
**Target**: Add full traceable output (flowchart lines 470-505)

**Formula**: `Total_Indirect_OPEX = Indirect_OPEX_Ratio × TCI × 1,000,000`

**Tasks**:
- [ ] Create `_create_indirect_opex_traceable()`
- [ ] Add 2-step calculation breakdown
- [ ] Add to response in `run()` method

**Estimated Effort**: 45 minutes

---

##### 2.3.2: Feedstock Cost ❌ NOT IMPLEMENTED
**Current**: Included in OPEX components but not standalone traceable
**Target**: Add full traceable output (flowchart lines 509-537)

**Formula**: `Feedstock_Cost = Feedstock_Consumption × Feedstock_Price`

**Tasks**:
- [ ] Create `_create_feedstock_cost_traceable()`
- [ ] Add to response in `run()` method

**Estimated Effort**: 30 minutes

---

##### 2.3.3: Hydrogen Cost ❌ NOT IMPLEMENTED
**Current**: Included in OPEX components but not standalone traceable
**Target**: Add full traceable output (flowchart lines 541-572)

**Formula**: `Hydrogen_Cost = Hydrogen_Consumption × Hydrogen_Price`

**Tasks**:
- [ ] Create `_create_hydrogen_cost_traceable()`
- [ ] Include price conversion metadata
- [ ] Add to response in `run()` method

**Estimated Effort**: 30 minutes

---

##### 2.3.4: Electricity Cost ❌ NOT IMPLEMENTED
**Current**: Included in OPEX components but not standalone traceable
**Target**: Add full traceable output (flowchart lines 576-607)

**Formula**: `Electricity_Cost = Electricity_Consumption × Electricity_Rate`

**Tasks**:
- [ ] Create `_create_electricity_cost_traceable()`
- [ ] Add to response in `run()` method

**Estimated Effort**: 30 minutes

---

##### 2.3.5: Carbon Intensity Components ⚠️ NEEDS ENHANCEMENT
**Current**: Basic component breakdown
**Target**: Add inputs and calculation_steps for each CI source (flowchart lines 611-757)

**Breakdown**:
- Feedstock CI (lines 613-649)
- Hydrogen CI (lines 651-680)
- Electricity CI (lines 682-728)
- Process CI (lines 730-757)

**Tasks**:
- [ ] Enhance `_create_carbon_intensity_traceable()` with calculation steps for each source
- [ ] Add 2-3 step calculation for feedstock CI
- [ ] Add 2-3 step calculation for electricity CI
- [ ] Test enhanced carbon intensity traceable output

**Estimated Effort**: 1.5 hours

---

##### 2.3.6: Total Carbon Intensity ⚠️ NEEDS ENHANCEMENT
**Current**: Basic sum of components
**Target**: Add full traceable output (flowchart lines 761-802)

**Formula**: `CI_total = (CI_feedstock + CI_hydrogen + CI_electricity + CI_process) × EC_product`

**Tasks**:
- [ ] Add inputs section with all CI components
- [ ] Add 2-step calculation breakdown
- [ ] Test total CI traceable output

**Estimated Effort**: 45 minutes

---

##### 2.3.7: Product Carbon Metrics (Per Product) ❌ NOT IMPLEMENTED
**Current**: Available in techno dict but not traceable
**Target**: Add full traceable output (flowchart lines 806-904)

**Breakdown**:
- Product Carbon Intensity (lines 808-844)
- Product CO2 Emissions (lines 846-874)
- Product Revenue (lines 876-904)

**Tasks**:
- [ ] Create `_create_product_carbon_intensity_traceable()`
- [ ] Create `_create_product_emissions_traceable()`
- [ ] Create `_create_product_revenue_traceable()`
- [ ] Add to response in `run()` method

**Estimated Effort**: 2 hours

---

#### 2.4: Layer 3 Traceable Calculations

**File**: `backend/app/services/traceable_economics.py`

##### 2.4.1: Total Direct OPEX ❌ NOT IMPLEMENTED
**Current**: Not standalone traceable
**Target**: Add full traceable output (flowchart lines 914-943)

**Formula**: `Total_Direct_OPEX = Feedstock_Cost + Hydrogen_Cost + Electricity_Cost`

**Tasks**:
- [ ] Create `_create_direct_opex_traceable()`
- [ ] Add single-step sum calculation
- [ ] Add to response in `run()` method

**Estimated Effort**: 30 minutes

---

##### 2.4.2: Weighted Carbon Intensity ❌ NOT IMPLEMENTED
**Current**: Available in techno dict but not traceable
**Target**: Add full traceable output (flowchart lines 947-978)

**Formula**: `Weighted_CI = Σ(CI_i × Product_Yield_i)` (single feedstock) or `CI_total`

**Tasks**:
- [ ] Create `_create_weighted_carbon_intensity_traceable()`
- [ ] Handle multi-feedstock scenarios
- [ ] Add to response in `run()` method

**Estimated Effort**: 45 minutes

---

#### 2.5: Layer 4 Traceable Calculations

**File**: `backend/app/services/traceable_economics.py`

##### 2.5.1: Total OPEX ⚠️ NEEDS ENHANCEMENT
**Current**: Basic component breakdown
**Target**: Add inputs and calculation_steps (flowchart lines 988-1016)

**Formula**: `Total_OPEX = Total_Direct_OPEX + Total_Indirect_OPEX`

**Tasks**:
- [ ] Enhance `_create_opex_traceable()` with inputs and calculation_steps
- [ ] Test enhanced OPEX traceable output

**Estimated Effort**: 45 minutes

---

##### 2.5.2: LCOP ⚠️ NEEDS ENHANCEMENT
**Current**: Basic component breakdown
**Target**: Add inputs and 5-step calculation breakdown (flowchart lines 1020-1137)

**Formula**: `LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production`

**Calculation Steps**:
1. Convert TCI to USD
2. Calculate Capital Recovery Factor
3. Calculate annualized TCI
4. Calculate numerator (total annual cost)
5. Calculate LCOP

**Tasks**:
- [ ] Enhance `_create_lcop_traceable()` with detailed inputs
- [ ] Add all 5 calculation steps with CRF details
- [ ] Include alternative LCOP formula without byproduct credit
- [ ] Test enhanced LCOP traceable output

**Estimated Effort**: 1.5 hours

---

##### 2.5.3: Total CO2 Emissions ⚠️ NEEDS ENHANCEMENT
**Current**: Basic product breakdown
**Target**: Add inputs and 3-step calculation breakdown (flowchart lines 1141-1184)

**Formula**: `Total_CO2 = CI × Fuel_Energy_Content × Production × 1000`

**Tasks**:
- [ ] Enhance `_create_emissions_traceable()` with inputs and calculation_steps
- [ ] Add conversion step (tons to kg)
- [ ] Add optional conversion to tons CO2e/year
- [ ] Test enhanced emissions traceable output

**Estimated Effort**: 1 hour

---

#### 2.6: Financial Analysis Traceable Calculations

**File**: `backend/app/services/traceable_economics.py`

##### 2.6.1: Net Present Value (NPV) ❌ NOT IMPLEMENTED
**Current**: Available in financials but not traceable
**Target**: Add full traceable output (flowchart lines 1247-1304)

**Formula**: `NPV = Σ [Cash_Flow_t / (1 + r)^t]`

**Tasks**:
- [ ] Create `_create_npv_traceable()`
- [ ] Add discounted cash flow calculation steps
- [ ] Add to response in `run()` method

**Estimated Effort**: 1.5 hours

---

##### 2.6.2: Internal Rate of Return (IRR) ❌ NOT IMPLEMENTED
**Current**: Available in financials but not traceable
**Target**: Add full traceable output (flowchart lines 1308-1349)

**Formula**: `Find r where NPV = 0`

**Tasks**:
- [ ] Create `_create_irr_traceable()`
- [ ] Document numerical solution approach
- [ ] Add to response in `run()` method

**Estimated Effort**: 1 hour

---

##### 2.6.3: Payback Period ❌ NOT IMPLEMENTED
**Current**: Available in financials but not traceable
**Target**: Add full traceable output (flowchart lines 1353-1404)

**Formula**: `Payback Period = First year where Cumulative_Cash_Flow > 0`

**Tasks**:
- [ ] Create `_create_payback_period_traceable()`
- [ ] Add cumulative cash flow calculation steps
- [ ] Add to response in `run()` method

**Estimated Effort**: 1 hour

---

### Phase 3: Testing & Validation

**Goal**: Ensure all traceable outputs are accurate and match flowchart specifications

**Tasks**:
- [ ] Create comprehensive test suite for all traceable calculations
- [ ] Validate against HEFA USA 500 KTPA test case
- [ ] Compare outputs with flowchart expected values
- [ ] Test edge cases (multi-feedstock, zero values, etc.)
- [ ] Performance testing (response size, calculation time)

**Files to Create**:
- [ ] `backend/tests/test_traceable_calculations.py`
- [ ] `backend/tests/test_traceable_validation.py`

**Estimated Effort**: 4 hours

---

### Phase 4: API Documentation

**Goal**: Document all traceable fields in API schemas and OpenAPI docs

**Tasks**:
- [ ] Update `scenario_schema.py` with traceable field examples
- [ ] Add OpenAPI documentation for traceable outputs
- [ ] Create developer guide for using traceable outputs
- [ ] Update frontend integration guide

**Files to Modify/Create**:
- [ ] `backend/app/schemas/scenario_schema.py`
- [ ] `docs/API_Traceable_Outputs.md`
- [ ] `docs/Frontend_Integration_Guide.md`

**Estimated Effort**: 3 hours

---

## Summary Checklist

### Layer 1: Core Parameters
- [x] TCI (basic) → [ ] TCI (enhanced)
- [ ] Feedstock Consumption
- [ ] Hydrogen Consumption
- [ ] Electricity Consumption
- [x] Production (basic) → [ ] Production (enhanced)
- [ ] Carbon Conversion Efficiency
- [ ] Fuel Energy Content

### Layer 2: OPEX, Revenue & Carbon
- [ ] Indirect OPEX
- [ ] Feedstock Cost
- [ ] Hydrogen Cost
- [ ] Electricity Cost
- [x] Carbon Intensity Breakdown (basic) → [ ] Carbon Intensity (enhanced)
- [ ] Total Carbon Intensity (enhanced)
- [ ] Product Carbon Metrics

### Layer 3: Aggregation
- [ ] Total Direct OPEX
- [ ] Weighted Carbon Intensity

### Layer 4: Final Metrics
- [x] Total OPEX (basic) → [ ] Total OPEX (enhanced)
- [x] LCOP (basic) → [ ] LCOP (enhanced)
- [x] Total Emissions (basic) → [ ] Total Emissions (enhanced)

### Financial Analysis
- [ ] NPV
- [ ] IRR
- [ ] Payback Period

### Additional Metrics
- [x] Total Revenue (basic) → [ ] Product Revenue (enhanced)

---

## Total Estimated Effort

| Phase | Effort |
|-------|--------|
| Phase 1: Foundation | ✅ COMPLETE |
| Phase 2: Enhanced Format | ~20-25 hours |
| Phase 3: Testing | ~4 hours |
| Phase 4: Documentation | ~3 hours |
| **TOTAL** | **27-32 hours** |

---

## Recommended Execution Order

1. **Week 1**: Phase 2.1 + Phase 2.2 (Model update + Layer 1 calculations)
2. **Week 2**: Phase 2.3 + Phase 2.4 (Layer 2 & 3 calculations)
3. **Week 3**: Phase 2.5 + Phase 2.6 (Layer 4 + Financial analysis)
4. **Week 4**: Phase 3 + Phase 4 (Testing + Documentation)

---

## Next Steps

1. Review this plan and prioritize which calculations are most critical
2. Decide on implementation approach:
   - **Option A**: Implement all at once (4 weeks full-time)
   - **Option B**: Implement incrementally by layer (more manageable)
   - **Option C**: Implement only critical metrics first (TCI, OPEX, LCOP, CI, Emissions)
3. Start with Phase 2.1: Update TraceableValue model to support enhanced format
4. Execute Phase 2.2 onwards one calculation at a time

**Recommended**: Start with **Option C** - enhance the existing 7 traceable fields to full format first, then add remaining calculations as needed.

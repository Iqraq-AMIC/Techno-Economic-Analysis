# SAFAPAC System Inventory

## Overview
SAFAPAC is a comprehensive Techno-Economic Analysis (TEA) platform for sustainable aviation fuel and biofuel production pathways. The system consists of a React-based frontend and a FastAPI-based Python backend, with a JSON-file-backed mock database for projects and scenarios that is designed to be replaceable by a real relational database.

---

## FRONTEND

### Pages (Views)

| File | Path | Purpose |
|------|------|---------|
| AnalysisDashboard.js | [safapac-clean/frontend/src/views/AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | Main TEA dashboard with 3-panel layout (input form, breakeven chart, KPI cards) |
| Login.js | [safapac-clean/frontend/src/views/Login.js](safapac-clean/frontend/src/views/Login.js) | Authentication page with Sign In, Sign Up, Forgot Password tabs |
| Tables.js | [safapac-clean/frontend/src/views/Tables.js](safapac-clean/frontend/src/views/Tables.js) | Generic table view (demo component, not actively used) |

### Components

#### Charts
| File | Path | Purpose |
|------|------|---------|
| BreakevenBarChart.js | [safapac-clean/frontend/src/components/charts/BreakevenBarChart.js](safapac-clean/frontend/src/components/charts/BreakevenBarChart.js) | Breakeven analysis line chart with Chart.js, dual-color fill, interpolation |

#### Forms
| File | Path | Purpose |
|------|------|---------|
| BiofuelForm.js | [safapac-clean/frontend/src/forms/BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | Primary input form with collapsible sections: Conversion Plant, Feedstock & Utilities, Product Data, Economic Parameters |
| CashFlowTable.js | [safapac-clean/frontend/src/forms/CashFlowTable.js](safapac-clean/frontend/src/forms/CashFlowTable.js) | Cash flow table display with export to CSV/JSON |

#### Layout Components
| File | Path | Purpose |
|------|------|---------|
| Default.js | [safapac-clean/frontend/src/layouts/Default.js](safapac-clean/frontend/src/layouts/Default.js) | Global layout for TEA routes: navbar with title/theme toggle/project switch, main content wrapper, footer |
| MainFooter.js | [safapac-clean/frontend/src/components/layout/MainFooter.js](safapac-clean/frontend/src/components/layout/MainFooter.js) | Footer component used by Default layout |
| MainNavbar.js | [safapac-clean/frontend/src/components/layout/MainNavbar/MainNavbar.js](safapac-clean/frontend/src/components/layout/MainNavbar/MainNavbar.js) | Legacy navigation bar from Shards template (kept for compatibility) |
| NavbarNav.js | [safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/NavbarNav.js](safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/NavbarNav.js) | Legacy navigation items container |
| Notifications.js | [safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/Notifications.js](safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/Notifications.js) | Legacy notifications dropdown |
| UserActions.js | [safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/UserActions.js](safapac-clean/frontend/src/components/layout/MainNavbar/NavbarNav/UserActions.js) | Legacy user actions dropdown |
| NavbarSearch.js | [safapac-clean/frontend/src/components/layout/MainNavbar/NavbarSearch.js](safapac-clean/frontend/src/components/layout/MainNavbar/NavbarSearch.js) | Legacy search functionality in navbar |
| NavbarToggle.js | [safapac-clean/frontend/src/components/layout/MainNavbar/NavbarToggle.js](safapac-clean/frontend/src/components/layout/MainNavbar/NavbarToggle.js) | Legacy mobile menu toggle |
| MainSidebar.js | [safapac-clean/frontend/src/components/layout/MainSidebar/MainSidebar.js](safapac-clean/frontend/src/components/layout/MainSidebar/MainSidebar.js) | Legacy sidebar container |
| SidebarMainNavbar.js | [safapac-clean/frontend/src/components/layout/MainSidebar/SidebarMainNavbar.js](safapac-clean/frontend/src/components/layout/MainSidebar/SidebarMainNavbar.js) | Legacy sidebar navigation header |
| SidebarNavItem.js | [safapac-clean/frontend/src/components/layout/MainSidebar/SidebarNavItem.js](safapac-clean/frontend/src/components/layout/MainSidebar/SidebarNavItem.js) | Legacy sidebar navigation item |
| SidebarNavItems.js | [safapac-clean/frontend/src/components/layout/MainSidebar/SidebarNavItems.js](safapac-clean/frontend/src/components/layout/MainSidebar/SidebarNavItems.js) | Legacy sidebar navigation list |
| SidebarSearch.js | [safapac-clean/frontend/src/components/layout/MainSidebar/SidebarSearch.js](safapac-clean/frontend/src/components/layout/MainSidebar/SidebarSearch.js) | Legacy search in sidebar |

#### Common Components
| File | Path | Purpose |
|------|------|---------|
| PageTitle.js | [safapac-clean/frontend/src/components/common/PageTitle.js](safapac-clean/frontend/src/components/common/PageTitle.js) | Page title component |
| SmallStats.js | [safapac-clean/frontend/src/components/common/SmallStats.js](safapac-clean/frontend/src/components/common/SmallStats.js) | Small statistics cards (KPI display) |
| RangeDatePicker.js | [safapac-clean/frontend/src/components/common/RangeDatePicker.js](safapac-clean/frontend/src/components/common/RangeDatePicker.js) | Date range picker component |
| CountryReports.js | [safapac-clean/frontend/src/components/common/CountryReports.js](safapac-clean/frontend/src/components/common/CountryReports.js) | Country-based reports component |
| TopReferrals.js | [safapac-clean/frontend/src/components/common/TopReferrals.js](safapac-clean/frontend/src/components/common/TopReferrals.js) | Top referrals display |

#### User Components
| File | Path | Purpose |
|------|------|---------|
| UserMenu.js | [safapac-clean/frontend/src/components/UserMenu.js](safapac-clean/frontend/src/components/UserMenu.js) | User menu dropdown with access level selector |
| AccessExample.js | [safapac-clean/frontend/src/components/AccessExample.js](safapac-clean/frontend/src/components/AccessExample.js) | Example component for access control demonstration |
| UserDetails.js | [safapac-clean/frontend/src/components/user-profile-lite/UserDetails.js](safapac-clean/frontend/src/components/user-profile-lite/UserDetails.js) | User profile details |
| UserAccountDetails.js | [safapac-clean/frontend/src/components/user-profile-lite/UserAccountDetails.js](safapac-clean/frontend/src/components/user-profile-lite/UserAccountDetails.js) | User account management |

#### Blog Components (Template - Not Used)
| File | Path | Purpose |
|------|------|---------|
| Discussions.js | [safapac-clean/frontend/src/components/blog/Discussions.js](safapac-clean/frontend/src/components/blog/Discussions.js) | Template component from Shards Dashboard |
| NewDraft.js | [safapac-clean/frontend/src/components/blog/NewDraft.js](safapac-clean/frontend/src/components/blog/NewDraft.js) | Template component from Shards Dashboard |
| UsersByDevice.js | [safapac-clean/frontend/src/components/blog/UsersByDevice.js](safapac-clean/frontend/src/components/blog/UsersByDevice.js) | Template component from Shards Dashboard |
| UsersOverview.js | [safapac-clean/frontend/src/components/blog/UsersOverview.js](safapac-clean/frontend/src/components/blog/UsersOverview.js) | Template component from Shards Dashboard |

#### UI Components (Demo - Not Used)
| File | Path | Purpose |
|------|------|---------|
| ButtonGroups.js | [safapac-clean/frontend/src/components/components-overview/ButtonGroups.js](safapac-clean/frontend/src/components/components-overview/ButtonGroups.js) | Button group demonstrations |
| Checkboxes.js | [safapac-clean/frontend/src/components/components-overview/Checkboxes.js](safapac-clean/frontend/src/components/components-overview/Checkboxes.js) | Checkbox demonstrations |
| Colors.js | [safapac-clean/frontend/src/components/components-overview/Colors.js](safapac-clean/frontend/src/components/components-overview/Colors.js) | Color palette demonstrations |
| CompleteFormExample.js | [safapac-clean/frontend/src/components/components-overview/CompleteFormExample.js](safapac-clean/frontend/src/components/components-overview/CompleteFormExample.js) | Complete form example |
| CustomFileUpload.js | [safapac-clean/frontend/src/components/components-overview/CustomFileUpload.js](safapac-clean/frontend/src/components/components-overview/CustomFileUpload.js) | File upload example |
| CustomSelect.js | [safapac-clean/frontend/src/components/components-overview/CustomSelect.js](safapac-clean/frontend/src/components/components-overview/CustomSelect.js) | Custom select example |
| DropdownInputGroups.js | [safapac-clean/frontend/src/components/components-overview/DropdownInputGroups.js](safapac-clean/frontend/src/components/components-overview/DropdownInputGroups.js) | Dropdown input group examples |
| Forms.js | [safapac-clean/frontend/src/components/components-overview/Forms.js](safapac-clean/frontend/src/components/components-overview/Forms.js) | Form examples |
| FormValidation.js | [safapac-clean/frontend/src/components/components-overview/FormValidation.js](safapac-clean/frontend/src/components/components-overview/FormValidation.js) | Form validation examples |
| InputGroups.js | [safapac-clean/frontend/src/components/components-overview/InputGroups.js](safapac-clean/frontend/src/components/components-overview/InputGroups.js) | Input group examples |
| NormalButtons.js | [safapac-clean/frontend/src/components/components-overview/NormalButtons.js](safapac-clean/frontend/src/components/components-overview/NormalButtons.js) | Normal button examples |
| NormalOutlineButtons.js | [safapac-clean/frontend/src/components/components-overview/NormalOutlineButtons.js](safapac-clean/frontend/src/components/components-overview/NormalOutlineButtons.js) | Outline button examples |
| ProgressBars.js | [safapac-clean/frontend/src/components/components-overview/ProgressBars.js](safapac-clean/frontend/src/components/components-overview/ProgressBars.js) | Progress bar examples |
| RadioButtons.js | [safapac-clean/frontend/src/components/components-overview/RadioButtons.js](safapac-clean/frontend/src/components/components-overview/RadioButtons.js) | Radio button examples |
| SeamlessInputGroups.js | [safapac-clean/frontend/src/components/components-overview/SeamlessInputGroups.js](safapac-clean/frontend/src/components/components-overview/SeamlessInputGroups.js) | Seamless input group examples |
| Sliders.js | [safapac-clean/frontend/src/components/components-overview/Sliders.js](safapac-clean/frontend/src/components/components-overview/Sliders.js) | Slider examples |
| SmallButtons.js | [safapac-clean/frontend/src/components/components-overview/SmallButtons.js](safapac-clean/frontend/src/components/components-overview/SmallButtons.js) | Small button examples |
| SmallOutlineButtons.js | [safapac-clean/frontend/src/components/components-overview/SmallOutlineButtons.js](safapac-clean/frontend/src/components/components-overview/SmallOutlineButtons.js) | Small outline button examples |
| ToggleButtons.js | [safapac-clean/frontend/src/components/components-overview/ToggleButtons.js](safapac-clean/frontend/src/components/components-overview/ToggleButtons.js) | Toggle button examples |

### Hooks

**Note:** No custom hooks are currently implemented. The application uses built-in React hooks (useState, useEffect, useContext) directly in components.

### Context/State

| File | Path | Purpose |
|------|------|---------|
| AuthContext.js | [safapac-clean/frontend/src/contexts/AuthContext.js](safapac-clean/frontend/src/contexts/AuthContext.js) | Authentication state (login, logout, signup, forgotPassword, resetPassword). Hardcoded credentials: username="safapac", password="landingpage2025" |
| AccessContext.js | [safapac-clean/frontend/src/contexts/AccessContext.js](safapac-clean/frontend/src/contexts/AccessContext.js) | Access level management (CORE, ADVANCE, ROADSHOW) with feature access control |
| ThemeContext.js | [safapac-clean/frontend/src/contexts/ThemeContext.js](safapac-clean/frontend/src/contexts/ThemeContext.js) | Theme management (light/dark mode) with color scheme definitions |

**Flux Store (Minimal Usage - Template Artifact):**
- [safapac-clean/frontend/src/flux/constants.js](safapac-clean/frontend/src/flux/constants.js)
- [safapac-clean/frontend/src/flux/dispatcher.js](safapac-clean/frontend/src/flux/dispatcher.js)
- [safapac-clean/frontend/src/flux/index.js](safapac-clean/frontend/src/flux/index.js)
- [safapac-clean/frontend/src/flux/store.js](safapac-clean/frontend/src/flux/store.js)

### API Calls

**All API calls are made via Axios from AnalysisDashboard.js**

| Endpoint | Method | Purpose | Called From |
|----------|--------|---------|-------------|
| /processes | GET | Fetch available process technologies | [AnalysisDashboard.js:70](safapac-clean/frontend/src/views/AnalysisDashboard.js#L70) |
| /feedstocks/{process} | GET | Fetch feedstocks for selected process | [AnalysisDashboard.js:82](safapac-clean/frontend/src/views/AnalysisDashboard.js#L82) |
| /calculate | POST | Submit inputs and get TEA results | [AnalysisDashboard.js:150](safapac-clean/frontend/src/views/AnalysisDashboard.js#L150) |

**Base URL:** `http://localhost:8000` (hardcoded in AnalysisDashboard.js)

### UI Logic Conditions

#### Route Guards
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `route.private && !isAuthenticated` | [App.js](safapac-clean/frontend/src/App.js) | 42 | Redirect to /login if not authenticated |
| `route.path === "/login" && isAuthenticated` | [App.js](safapac-clean/frontend/src/App.js) | 44 | Redirect to /TEA if already authenticated |

#### Access Control
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `hasAccess(featureName)` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | Multiple | Show/hide KPIs based on access level |
| `accessLevel === 'CORE/ADVANCE/ROADSHOW'` | [UserMenu.js](safapac-clean/frontend/src/components/UserMenu.js) | - | Visual indicator of current access level |

#### Form Validation
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `selectedProcess === ''` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | 520 | Disable feedstock dropdown if no process selected |
| `selectedFeedstock === ''` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | 550 | Show validation message |
| `massSum !== 100` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | 850 | Validate product mass fractions sum to 100% |

#### UI States
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `collapsed.conversionPlant` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | - | Collapse/expand Conversion Plant section |
| `collapsed.feedstock` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | - | Collapse/expand Feedstock section |
| `collapsed.product` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | - | Collapse/expand Product section |
| `collapsed.economic` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | - | Collapse/expand Economic section |
| `isLoading` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | 150 | Show loading spinner during calculation |
| `showCashFlowTable` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | 260 | Show/hide cash flow modal |
| `theme === 'dark'` | [Default.js](safapac-clean/frontend/src/layouts/Default.js) | - | Apply dark theme styles |

#### Currency Conversion
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `selectedCurrency === 'USD/MYR/GBP/EUR'` | [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js) | Multiple | Convert displayed values to selected currency |

#### Product Configuration
| Condition | File | Line | Purpose |
|-----------|------|------|---------|
| `productsToShow.includes('jet')` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | - | Show/hide Jet fuel inputs |
| `productsToShow.includes('diesel')` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | - | Show/hide Diesel inputs |
| `productsToShow.includes('gasoline')` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | - | Show/hide Gasoline inputs |
| `productsToShow.includes('propane')` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | - | Show/hide Propane inputs |
| `productsToShow.includes('naphtha')` | [BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js) | - | Show/hide Naphtha inputs |

---

## BACKEND

### API Endpoints

**Base URL (development):** `http://localhost:8000`

| Endpoint | Method | File | Purpose | Request Body | Response |
|----------|--------|------|---------|--------------|----------|
| `/auth/login` | POST | [main.py](safapac-clean/backend/app/main.py) | Authenticate user against `pw.csv` and ensure user exists in JSON `users.json` | `{ \"username\": str, \"password\": str }` | `{ success: bool, user?: object, message?: str }` |
| `/processes` | GET | [main.py](safapac-clean/backend/app/main.py) | List all process technologies | None | `List[str]` |
| `/feedstocks/{process}` | GET | [main.py](safapac-clean/backend/app/main.py) | Get feedstocks for a process | None | `List[str]` |
| `/feedstock/{feedstock_name}` | GET | [main.py](safapac-clean/backend/app/main.py) | Get feedstock details | None | `dict` |
| `/calculate` | POST | [main.py](safapac-clean/backend/app/main.py) | Perform TEA calculation (techno‑economics + financials) | `{ inputs: dict, process_technology: str, feedstock: str, product_key: str }` | `{ technoEconomics: dict, financials: dict, resolvedInputs: { structured: dict, flattened: dict } }` |
| `/projects/create` | POST | [main.py](safapac-clean/backend/app/main.py) | Create a project and auto‑create Scenario 1 | `{ user_id: str, project_name: str }` | Project with first scenario (`ProjectCreateResponse`) |
| `/projects/list-by-user` | GET | [main.py](safapac-clean/backend/app/main.py) | List projects for a user | Query: `user_id` | `List[ProjectListItem]` |
| `/projects/{project_id}` | GET | [main.py](safapac-clean/backend/app/main.py) | Get project details | None | `ProjectResponse` |
| `/scenarios/create` | POST | [main.py](safapac-clean/backend/app/main.py) | Create a new scenario for a project (max 3 per project) | `{ project_id: str, scenario_name: str, order?: int }` | `ScenarioResponse` |
| `/scenarios/list` | GET | [main.py](safapac-clean/backend/app/main.py) | List all scenarios for a project | Query: `project_id` | `List[ScenarioDetailResponse]` |
| `/scenarios/{scenario_id}` | GET | [main.py](safapac-clean/backend/app/main.py) | Get a single scenario including inputs and outputs | None | `ScenarioDetailResponse` |
| `/scenarios/{scenario_id}` | PUT | [main.py](safapac-clean/backend/app/main.py) | Update scenario (name, inputs, outputs) | `{ scenario_name?: str, inputs?: dict, outputs?: dict }` | Updated `ScenarioDetailResponse` |
| `/scenarios/{scenario_id}` | DELETE | [main.py](safapac-clean/backend/app/main.py) | Delete a scenario (cannot delete last scenario in project) | None | `{ message: str }` |

### Controllers

**No separate controller layer.** API endpoints in [main.py](safapac-clean/backend/app/main.py) directly orchestrate services.

### Services

| File | Path | Class/Function | Purpose |
|------|------|----------------|---------|
| economics.py | [safapac-clean/backend/app/economics.py](safapac-clean/backend/app/economics.py) | `BiofuelEconomics` | Main orchestrator for TEA calculations. Manages calculation flow through 4 layers, database integration, override logic |
| feature_calculations.py | [safapac-clean/backend/app/feature_calculations.py](safapac-clean/backend/app/feature_calculations.py) | Layer 1-4 functions | Four-layer calculation architecture |
| financial_analysis.py | [safapac-clean/backend/app/financial_analysis.py](safapac-clean/backend/app/financial_analysis.py) | `FinancialAnalysis` | Financial analysis with tax, loans, depreciation, NPV, IRR, payback period |
| mock_database.py | [safapac-clean/backend/app/mock_database.py](safapac-clean/backend/app/mock_database.py) | `MockDatabase` | JSON-backed mock database for users, projects, and scenarios used during development |

### Calculation Modules

**[feature_calculations.py](safapac-clean/backend/app/feature_calculations.py) - Four Layers:**

#### Layer 1: Modular Formulation (Lines 24-207)
| Function | Purpose | Formula |
|----------|---------|---------|
| `total_capital_investment` | Economy-of-scale TCI | `TCI_ref × (Capacity/Capacity_ref)^0.6` |
| `production` | Total production | `PlantCapacity × ProductYield` |
| `feedstock_consumption` | Feedstock required | `PlantCapacity × FeedstockYield` |
| `fuel_energy_content` | Weighted energy content | `ProductEnergyContent × MassFraction` |
| `carbon_intensity_feedstock` | Feedstock CI contribution | `(FeedstockCI × FeedstockYield) / FuelEnergyContent` |
| `carbon_conversion_efficiency` | Carbon utilization | `(ProductCarbonContent / FeedstockCarbonContent) × 100` |
| `hydrogen_consumption` | H2 required | `PlantCapacity × Yield_H2` |
| `electricity_consumption` | Electricity required | `PlantCapacity × Yield_kWh` |

#### Layer 2: OPEX, Carbon, Revenue (Lines 209-321)
| Function | Purpose | Formula |
|----------|---------|---------|
| `total_indirect_opex` | Indirect operating costs | `ProcessRatio × TCI` |
| `feedstock_cost` | Annual feedstock cost | `Consumption × Price` |
| `hydrogen_cost` | Annual H2 cost | `Consumption × Price` |
| `electricity_cost` | Annual electricity cost | `Consumption × Rate` |
| `total_carbon_intensity` | Total CI | `(FeedstockCI + ProcessCI) / 1000` |
| `revenue` | Product revenue | `Production × Price` (per product) |

#### Layer 3: Direct OPEX and Weighted CI (Lines 322-365)
| Function | Purpose | Formula |
|----------|---------|---------|
| `total_direct_opex` | Total variable costs | `Sum of Feedstock + H2 + Electricity costs` |
| `weighted_carbon_intensity` | Production-weighted CI | `TotalCI × ProductYield` |

#### Layer 4: OPEX, Emission, LCOP (Lines 367-453)
| Function | Purpose | Formula |
|----------|---------|---------|
| `total_opex` | Total operating expenditure | `Direct OPEX + Indirect OPEX` |
| `total_co2_emissions` | Annual CO2 emissions | `CI × ProductEnergyContent × Production × 1000` |
| `lcop` | Levelized Cost of Production | `(Feedstock + H2 + Electricity + IndirectOPEX + AnnualizedCapital) / Capacity` |

**[financial_analysis.py](safapac-clean/backend/app/financial_analysis.py) - Financial Model:**

| Method | Purpose | Formula/Logic |
|--------|---------|---------------|
| `land_cost` | Fixed land cost | $1,026,898.876 |
| `discount_factor` | Time value of money | `1 / (1 + r)^t` |
| `working_capital` | Working capital | `15% × TCI` |
| `capital_investment` | Equity investment | `(Equity × TCI) - WC` |
| `depreciation` | Annual depreciation | `5% × TCI` |
| `annual_loan_payment` | Loan amortization | Standard loan payment formula |
| `capex_schedule` | 3-year construction timeline | Year -2: Land, Year -1: Equity, Year 0: WC |
| `cash_flow_table` | Complete DCF model | Revenue - Depreciation - Loan - Cost - Tax + Depreciation |
| `npv` | Net Present Value | Final cumulative DCF |
| `irr` | Internal Rate of Return | numpy_financial.irr |
| `payback_period` | Payback period | Year when cumulative DCF > 0 |

### Validators

**Pydantic models in [models.py](safapac-clean/backend/app/models.py) provide automatic validation:**

| Model | File | Line | Validates |
|-------|------|------|-----------|
| `Quantity` | [models.py](safapac-clean/backend/app/models.py) | 9 | Value + unit pairs |
| `ConversionPlant` | [models.py](safapac-clean/backend/app/models.py) | 25 | Plant capacity, load hours, CI, density |
| `Feedstock` | [models.py](safapac-clean/backend/app/models.py) | 120 | Feedstock price, carbon/energy content, yield |
| `Utility` | [models.py](safapac-clean/backend/app/models.py) | 188 | Hydrogen and electricity data |
| `Product` | [models.py](safapac-clean/backend/app/models.py) | 213 | Product price, sensitivity, carbon/energy, yield, mass fraction |
| `EconomicParameters` | [models.py](safapac-clean/backend/app/models.py) | 324 | Discount rate, lifetime, TCI scaling, OPEX ratios |
| `UserInputs` | [models.py](safapac-clean/backend/app/models.py) | 417 | Aggregates all input categories |

**Conversion Methods in models.py:**
- Unit normalization: t/yr, KTA, MGPY, BPD → tonnes/year
- Price conversions: USD/t, USD/kg, USD/kWh
- Carbon intensity conversions: gCO2/kg, kgCO2/t
- Energy content conversions: MJ/kg
- Yield conversions: kg/kg, kWh/kg

### Database Operations

**[database.py](safapac-clean/backend/app/database.py) - BiofuelDatabase Class:**

| Method | Purpose | Returns |
|--------|---------|---------|
| `__init__` | Initialize in-memory pandas DataFrame | None |
| `get_feedstocks` | List all feedstocks | `List[str]` |
| `filter_by_process` | Get feedstocks for process | `List[str]` |
| `get_yield_by_feedstock` | Get row data | `pd.Series` |
| `compare_mass_fractions` | Compare product slates | `pd.DataFrame` |

**Database Schema (22 process-feedstock combinations):**

| Column | Type | Description |
|--------|------|-------------|
| Process | str | Process technology (HEFA, FT-BtL, ATJ, etc.) |
| Feedstock | str | Feedstock name |
| TCI_ref | float | Reference capital investment (MUSD) |
| Capacity_ref | float | Reference capacity (tons/year) |
| Yield_biomass | float | Feedstock yield (kg/kg) |
| Yield_H2 | float | Hydrogen yield (kg/kg) |
| Yield_kWh | float | Electricity yield (kWh/kg) |
| P_steps | int | Process complexity metric |
| Nnp_steps | int | Non-primary steps |
| MassFraction_Jet | float | Jet fuel % |
| MassFraction_Diesel | float | Diesel % |
| MassFraction_Gasoline | float | Gasoline % |
| MassFraction_Propane | float | Propane % |
| MassFraction_Naphtha | float | Naphtha % |

**Process Technologies:**
- HEFA (5 feedstocks)
- FT-BtL (4 feedstocks)
- ATJ (5 feedstocks)
- FT, SIP, FT-SKA, ATJ-SPK, CHJ, HC-HEFA-SPK, ATJ-SKA (1 each)

**Feedstocks:**
- Oils/Fats: UCO, Animal Fats, Algae Oil, Yellow Grease, Soybean Oil, Waste Cooking Oil
- Residues: MSW, Forest Residues, Agriculture Residues, Bagasse, Wheat Straw, Corn Residues, Rice Straw, Corn Stover
- Others: Sugarcane, Molasses, Ethanol, Palm Kernel Shell, Coconut Husks, Rice Husk, Sugarcane Bagasse, Wood Chips, Animal Manure, Waste CO2

### Logs

**Logging implementation in [main.py](safapac-clean/backend/app/main.py):**

| Type | Line | Purpose |
|------|------|---------|
| Request logging middleware | 25 | Logs all incoming requests with method, path, timestamp |
| Error logging | 73, 84, 96, 117, 142 | Logs errors with traceback |
| Console output | Throughout | Print statements for debugging |

**Log format:** `{timestamp} - {method} {path}`

---

## SHARED

### Utils

| File | Path | Purpose |
|------|------|---------|
| chart.js | [safapac-clean/frontend/src/utils/chart.js](safapac-clean/frontend/src/utils/chart.js) | Chart.js custom controller for LineWithLine (vertical line on hover) |
| withTracker.js | [safapac-clean/frontend/src/withTracker.js](safapac-clean/frontend/src/withTracker.js) | HOC for analytics tracking |
| serviceWorker.js | [safapac-clean/frontend/src/serviceWorker.js](safapac-clean/frontend/src/serviceWorker.js) | Service worker for PWA capabilities |

**Backend utils (helper functions):**
- `safe_float` in [main.py](safapac-clean/backend/app/main.py):57 - Handles NaN/Inf conversion to None

### Constants

#### Frontend
| File | Path | Constants |
|------|------|-----------|
| sidebar-nav-items.js | [safapac-clean/frontend/src/data/sidebar-nav-items.js](safapac-clean/frontend/src/data/sidebar-nav-items.js) | Sidebar navigation items |
| flux/constants.js | [safapac-clean/frontend/src/flux/constants.js](safapac-clean/frontend/src/flux/constants.js) | Flux action constants |

**Hardcoded constants in components:**
- Currency rates in [AnalysisDashboard.js](safapac-clean/frontend/src/views/AnalysisDashboard.js): USD=1, MYR≈4.7, GBP≈0.79, EUR≈0.85
- Access levels in [access.json](safapac-clean/frontend/src/config/access.json): CORE, ADVANCE, ROADSHOW
- Authentication now uses `/auth/login` backed by `pw.csv` on the backend; there is no single hard-coded username/password in the frontend.

#### Backend
**Financial constants in [financial_analysis.py](safapac-clean/backend/app/financial_analysis.py):**
- discount_rate: 10.5%
- tax_rate: 28%
- equity: 40%
- bank_interest: 4%
- loan_term: 10 years
- land_cost: $1,026,898.876
- working_capital_ratio: 15%
- depreciation_rate: 5%

### Type Definitions

**Pydantic Models in [models.py](safapac-clean/backend/app/models.py):**

| Model | Line | Purpose |
|-------|------|---------|
| `Quantity` | 9 | Value + unit wrapper (Optional) |
| `ConversionPlant` | 25 | Plant capacity, load hours, CI default, density |
| `Feedstock` | 120 | Feedstock price, carbon content, energy content, CI, yield |
| `Utility` | 188 | Hydrogen and electricity data |
| `Product` | 213 | Price, sensitivity, carbon content, energy content, yield, mass fraction |
| `EconomicParameters` | 324 | Discount rate, lifetime, TCI scaling, OPEX ratios |
| `UserInputs` | 417 | Aggregates all categories + process/feedstock/country selection |

**No TypeScript types** - Frontend uses plain JavaScript with PropTypes (minimal usage).

### Shared Data Structures

#### Access Control Configuration
**File:** [access.json](safapac-clean/frontend/src/config/access.json) (duplicated in frontend/backend)

```json
{
  "CORE": {
    "Conversion": ["Plant Capacity", "Up-time"],
    "Feedstock": ["Type/Name", "Price"],
    "Economic Outputs": ["Payback Period"]
  },
  "ADVANCE": {
    "Conversion": ["Plant Conversion Carbon Intensity", "Maintenance Cost"],
    "Feedstock": ["Yield %", "Carbon Intensity"],
    "Economic Outputs": ["OPEX", "IRR"]
  },
  "ROADSHOW": {
    "Conversion": ["All"],
    "Feedstock": ["All"],
    "Economic Outputs": ["NPV", "LCCA", "LCOP"]
  }
}
```

#### API Request/Response Schema

**POST /calculate Request Body (`CalculationRequest`):**
```json
{
  "inputs": {
    "plant": { /* plant capacity, load hours, CI default, density */ },
    "feedstocks": [ /* feedstock block(s) */ ],
    "utilities": [ /* hydrogen and electricity blocks */ ],
    "products": [ /* product blocks with price, energy, yield, mass fraction */ ],
    "economics": { /* discount rate, lifetime, TCI, WC/TCI, indirect OPEX/TCI */ }
  },
  "process_technology": "HEFA",
  "feedstock": "UCO",
  "product_key": "jet"
}
```

**POST /calculate Response:**
```json
{
  "technoEconomics": {
    "TCI": 123.45,
    "production": 100000,
    "feedstock_consumption": 110000,
    "carbon_intensity": 25.5,
    "LCOP": 800.5
  },
  "financials": {
    "cashFlowTable": [ /* yearly rows */ ],
    "npv": 50000000,
    "irr": 0.155,
    "paybackPeriod": 8.0
  },
  "resolvedInputs": {
    "structured": { /* normalized inputs as accepted by the model */ },
    "flattened": { /* flattened key/value view used for shortcuts */ }
  }
}
```

#### Product Configuration
**5 products supported:**
- Jet (SAF - Sustainable Aviation Fuel)
- Diesel
- Gasoline
- Propane
- Naphtha

**Each product has:**
- Price (USD/t)
- Price sensitivity (%)
- Carbon content (kg C/kg fuel)
- Energy content (MJ/kg)
- Yield (kg product/kg feedstock)
- Mass fraction (%)

---

## TECHNOLOGY STACK

### Frontend
- **Framework:** React 16.14.0
- **Routing:** React Router
- **UI Library:** Shards React
- **Charts:** Chart.js
- **HTTP Client:** Axios
- **Icons:** React Icons
- **Date Picker:** React DatePicker
- **State Management:** Context API + LocalStorage

### Backend
- **Framework:** FastAPI
- **Validation:** Pydantic
- **Data Processing:** Pandas, NumPy
- **Financial Calculations:** NumPy Financial
- **ASGI Server:** Uvicorn
- **CORS:** FastAPI CORS Middleware

---

## KEY WORKFLOWS

### 1. Authentication Flow
1. User visits [/login](safapac-clean/frontend/src/views/Login.js)
2. Enters credentials (hardcoded check in [AuthContext.js](safapac-clean/frontend/src/contexts/AuthContext.js))
3. LocalStorage persistence
4. Redirect to /TEA on success

### 2. Calculation Flow
1. User selects Process Technology → GET /processes
2. User selects Feedstock → GET /feedstocks/{process}
3. User configures inputs ([BiofuelForm.js](safapac-clean/frontend/src/forms/BiofuelForm.js))
4. User clicks Calculate → POST /calculate
5. Backend:
   - Parse UserInputs ([models.py](safapac-clean/backend/app/models.py))
   - Fetch reference data ([database.py](safapac-clean/backend/app/database.py))
   - Run BiofuelEconomics ([economics.py](safapac-clean/backend/app/economics.py))
   - Execute 4 calculation layers ([feature_calculations.py](safapac-clean/backend/app/feature_calculations.py))
   - Generate financial analysis ([financial_analysis.py](safapac-clean/backend/app/financial_analysis.py))
   - Return technoEconomics + financials
6. Frontend:
   - Display KPI cards ([SmallStats.js](safapac-clean/frontend/src/components/common/SmallStats.js))
   - Render breakeven chart ([BreakevenBarChart.js](safapac-clean/frontend/src/components/charts/BreakevenBarChart.js))
   - Populate cash flow table ([CashFlowTable.js](safapac-clean/frontend/src/forms/CashFlowTable.js))

### 3. Access Control Flow
1. User selects access level (CORE/ADVANCE/ROADSHOW) in [UserMenu.js](safapac-clean/frontend/src/components/UserMenu.js)
2. [AccessContext.js](safapac-clean/frontend/src/contexts/AccessContext.js) filters visible KPIs
3. Features shown/hidden based on [access.json](safapac-clean/frontend/src/config/access.json)

---

## SECURITY NOTES

| Issue | Location | Severity | Recommendation |
|-------|----------|----------|----------------|
| Hardcoded credentials | [AuthContext.js](safapac-clean/frontend/src/contexts/AuthContext.js) | HIGH | Implement proper authentication backend |
| CORS allows all origins | [main.py](safapac-clean/backend/app/main.py):18 | MEDIUM | Restrict to specific origins |
| No HTTPS enforcement | All | MEDIUM | Enforce HTTPS in production |
| LocalStorage for auth | [AuthContext.js](safapac-clean/frontend/src/contexts/AuthContext.js) | MEDIUM | Use httpOnly cookies |
| No rate limiting | [main.py](safapac-clean/backend/app/main.py) | LOW | Add rate limiting middleware |
| No input sanitization | All | LOW | Pydantic validates, but consider XSS protection |

---

## DOCUMENTATION

| File | Path | Purpose |
|------|------|---------|
| README.md | [safapac-clean/README.md](safapac-clean/README.md) | Project overview |
| README_UNITS.md | [safapac-clean/README_UNITS.md](safapac-clean/README_UNITS.md) | Unit conversion reference |
| QUICKSTART.md | Root | Getting started guide |
| PROJECT_STRUCTURE.md | Root | Architecture documentation |
| MIGRATION_NOTES.md | Root | Migration history |
| SETUP_CHECKLIST.md | Root | Setup instructions |
| CONTRIBUTING.md | Root | Contribution guidelines |
| TEST_RESULTS.md | Root | Test results documentation |
| LICENSE | Root | MIT License |
| CORRECT_INPUT_GUIDE.md | [safapac-clean/backend/CORRECT_INPUT_GUIDE.md](safapac-clean/backend/CORRECT_INPUT_GUIDE.md) | Input validation guide |
| HEFA_TEST_COMPARISON.md | [safapac-clean/backend/HEFA_TEST_COMPARISON.md](safapac-clean/backend/HEFA_TEST_COMPARISON.md) | HEFA test comparison |

---

## TEST FILES

| File | Path | Purpose |
|------|------|---------|
| test_calculation.py | [safapac-clean/backend/test_calculation.py](safapac-clean/backend/test_calculation.py) | Unit tests for calculation modules |
| test_hefa_input.py | [safapac-clean/backend/test_hefa_input.py](safapac-clean/backend/test_hefa_input.py) | HEFA-specific test cases |
| test_biofuel_economics.py | [safapac-clean/backend/tests/test_biofuel_economics.py](safapac-clean/backend/tests/test_biofuel_economics.py) | BiofuelEconomics tests |
| test_main_api.py | [safapac-clean/backend/tests/test_main_api.py](safapac-clean/backend/tests/test_main_api.py) | API endpoint tests |
| test_user_inputs.py | [safapac-clean/backend/tests/test_user_inputs.py](safapac-clean/backend/tests/test_user_inputs.py) | UserInputs model tests |

---

## BUILD & DEPLOYMENT

| File | Path | Purpose |
|------|------|---------|
| package.json | [safapac-clean/frontend/package.json](safapac-clean/frontend/package.json) | NPM dependencies |
| package-lock.json | [safapac-clean/frontend/package-lock.json](safapac-clean/frontend/package-lock.json) | NPM dependency lock |
| .editorconfig | [safapac-clean/frontend/.editorconfig](safapac-clean/frontend/.editorconfig) | Editor configuration |
| run_backend.py | Root | Backend startup script |
| backend.zip | [safapac-clean/backend.zip](safapac-clean/backend.zip) | Backend archive |
| backend-deployment.zip | [safapac-clean/backend-deployment.zip](safapac-clean/backend-deployment.zip) | Deployment package |

---

## SUMMARY STATISTICS

### Frontend
- **Pages:** 3 (1 active dashboard, 1 login, 1 demo)
- **Components:** 40+ (11 layout, 5 common, 4 user, 20+ demo)
- **Contexts:** 3 (Auth, Access, Theme)
- **API Calls:** 3 endpoints
- **Custom Hooks:** 0 (uses built-in React hooks)

### Backend
- **API Endpoints:** 13 (4 POST, 7 GET, 1 PUT, 1 DELETE)
- **Services:** 4 (BiofuelEconomics, FinancialAnalysis, BiofuelDatabase, MockDatabase)
- **Calculation Functions:** 20+ (across 4 layers)
- **Data Models:** 7+ Pydantic models (including project/scenario models)
- **Database Records (TEA reference):** 22 process-feedstock combinations
- **Process Technologies:** 11
- **Feedstocks:** 25+

### Lines of Code (Approximate)
- **AnalysisDashboard.js:** 1,299 lines
- **BiofuelForm.js:** 1,448 lines
- **Login.js:** 595 lines
- **models.py:** 480 lines
- **feature_calculations.py:** 457 lines
- **financial_analysis.py:** 252 lines
- **economics.py:** 188 lines
- **database.py:** 182 lines
- **main.py:** 159 lines
- **BreakevenBarChart.js:** 322 lines

**Total Frontend (estimated):** ~5,000 lines
**Total Backend (estimated):** ~2,000 lines

---

*Document generated: 2025-11-15*
*SAFAPAC Version: safapac-clean*
*Purpose: Comprehensive system inventory for development planning and onboarding*

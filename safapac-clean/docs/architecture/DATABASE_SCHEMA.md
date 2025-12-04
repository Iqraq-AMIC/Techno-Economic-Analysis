# SAFAPAC Database Schema Documentation

**Database Type**: PostgreSQL
**Current Environment**: Local PostgreSQL
**Target Environment**: AWS RDS PostgreSQL
**Schema Version**: 2.0.0
**Last Updated**: December 1, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Database Architecture](#database-architecture)
3. [Master Data Tables](#master-data-tables)
4. [Reference Data Tables](#reference-data-tables)
5. [Unit Management Tables](#unit-management-tables)
6. [User & Project Tables](#user--project-tables)
7. [Relationships and Constraints](#relationships-and-constraints)
8. [Indexes](#indexes)
9. [Migration Guide](#migration-guide)
10. [Backup and Recovery](#backup-and-recovery)

---

## Overview

The SAFAPAC database stores:
- **Master Data**: Process technologies, feedstocks, countries, utilities, products
- **Reference Data**: Process-feedstock combinations, consumption ratios, product breakdowns
- **Unit Conversion Data**: Units of measure and conversion factors
- **User Data**: User accounts, projects, scenarios
- **Calculation Results**: TEA calculations, financial analysis (stored as JSONB)

### Key Design Decisions

1. **JSONB for Flexible Data**: User inputs and calculation results stored as JSONB for flexibility
2. **Relational Core Parameters**: Process, feedstock, country stored as foreign keys for querying
3. **UUID Primary Keys**: Users, projects, scenarios use UUIDs for security and distributed systems
4. **Unique Constraints**: Prevent duplicate combinations (e.g., process + feedstock + country)
5. **Cascade Deletion**: Projects cascade delete scenarios automatically

---

## Database Architecture

### Entity Relationship Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         MASTER DATA                              │
│  ProcessTechnology  Feedstock  Country  Utility  Product         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REFERENCE DATA                              │
│  ProcessFeedstockRef → ProcessUtilityConsumptionRef             │
│                      → ProductReferenceBreakdown                │
│  UtilityCountryPriceDefaults                                    │
│  DefaultParameterSet                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      USER & PROJECTS                             │
│  User → UserProject → Scenario                                  │
│                                                                   │
│  Scenario contains:                                              │
│    - user_inputs (JSONB)                                        │
│    - techno_economics (JSONB)                                   │
│    - financial_analysis (JSONB)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Master Data Tables

### Table: `process_technologies`

Stores available process technologies for SAF production.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Process technology ID |
| `name` | `String` | NOT NULL, UNIQUE | Process name (e.g., "HEFA", "FT", "ATJ") |

**Relationships**:
- → `process_feedstock_ref` (one-to-many)
- → `default_parameter_set` (one-to-many)
- → `scenarios` (one-to-many)
- → `user_projects` (one-to-many via initial_process_id)

**Sample Data**:
```sql
INSERT INTO process_technologies (id, name) VALUES
  (1, 'HEFA'),
  (2, 'Fischer-Tropsch'),
  (3, 'Alcohol-to-Jet');
```

**Model Location**: backend/app/models/biofuel_model.py:14

---

### Table: `country`

Stores countries for regional cost and parameter defaults.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Country ID |
| `name` | `String` | NOT NULL, UNIQUE | Country name (e.g., "USA", "Germany") |

**Relationships**:
- → `utility_country_price_defaults` (one-to-many)
- → `default_parameter_set` (one-to-many)
- → `user_projects` (one-to-many via initial_country_id)
- → `scenarios` (one-to-many)

**Sample Data**:
```sql
INSERT INTO country (id, name) VALUES
  (1, 'USA'),
  (2, 'Germany'),
  (3, 'China');
```

**Model Location**: backend/app/models/biofuel_model.py:24

---

### Table: `feedstock`

Stores feedstock types for SAF production.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Feedstock ID |
| `name` | `String` | NOT NULL, UNIQUE | Feedstock name (e.g., "UCO", "Corn", "Switchgrass") |
| `carbon_content_kg_c_per_kg` | `Float` | | Carbon content (kg C / kg feedstock) |
| `energy_content_mj_per_kg` | `Float` | | Energy content (MJ/kg) |
| `ci_ref_gco2e_per_mj` | `Float` | | Reference carbon intensity (gCO2e/MJ) |
| `price_ref_usd_per_unit` | `Float` | | Reference price (USD per unit) |
| `yield_ref` | `Float` | | Reference yield percentage |

**Relationships**:
- → `process_feedstock_ref` (one-to-many)
- → `default_parameter_set` (one-to-many)
- → `user_projects` (one-to-many via initial_feedstock_id)
- → `scenarios` (one-to-many)

**Sample Data**:
```sql
INSERT INTO feedstock (id, name, carbon_content_kg_c_per_kg, energy_content_mj_per_kg,
                       ci_ref_gco2e_per_mj, price_ref_usd_per_unit, yield_ref) VALUES
  (1, 'UCO', 0.77, 37.0, 20.0, 930.0, 121.0);
```

**Model Location**: backend/app/models/biofuel_model.py:35

---

### Table: `utility`

Stores utilities required for SAF production (hydrogen, electricity, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Utility ID |
| `name` | `String` | NOT NULL, UNIQUE | Utility name (e.g., "Hydrogen", "electricity") |
| `carbon_content_kg_c_per_kg` | `Float` | | Carbon content (kg C / kg utility) |
| `energy_content_mj_per_kg` | `Float` | | Energy content (MJ/kg) |
| `ci_ref_gco2e_per_mj` | `Float` | | Reference carbon intensity (gCO2e/MJ) |
| `yield_ref` | `Float` | DEFAULT 0.0 | Reference yield/consumption percentage |

**Relationships**:
- → `process_utility_consumption_ref` (one-to-many)
- → `utility_country_price_defaults` (one-to-many)

**Sample Data**:
```sql
INSERT INTO utility (id, name, carbon_content_kg_c_per_kg, energy_content_mj_per_kg,
                     ci_ref_gco2e_per_mj, yield_ref) VALUES
  (1, 'Hydrogen', 0.0, 120.0, 0.0, 4.2),
  (2, 'electricity', 0.0, 0.0, 20.0, 12.0);
```

**Model Location**: backend/app/models/biofuel_model.py:51

---

### Table: `product`

Stores SAF products and co-products.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Product ID |
| `name` | `String` | NOT NULL, UNIQUE | Product name (e.g., "JET", "DIESEL", "Naphtha") |

**Relationships**:
- → `product_reference_breakdown` (one-to-many)

**Sample Data**:
```sql
INSERT INTO product (id, name) VALUES
  (1, 'JET'),
  (2, 'DIESEL'),
  (3, 'Naphtha');
```

**Model Location**: backend/app/models/biofuel_model.py:64

---

## Reference Data Tables

### Table: `process_feedstock_ref`

Links process technologies with compatible feedstocks and stores reference density.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Reference ID |
| `process_id` | `Integer` | FOREIGN KEY → `process_technologies.id`, NOT NULL | Process technology |
| `feedstock_id` | `Integer` | FOREIGN KEY → `feedstock.id`, NOT NULL | Feedstock |
| `average_product_density_ref` | `Float` | | Average product density reference |

**Unique Constraint**: `(process_id, feedstock_id)` - prevents duplicate combinations

**Relationships**:
- ← `process_technologies` (many-to-one)
- ← `feedstock` (many-to-one)
- → `process_utility_consumption_ref` (one-to-many)
- → `product_reference_breakdown` (one-to-many)

**Model Location**: backend/app/models/biofuel_model.py:74

---

### Table: `process_utility_consumption_ref`

Stores utility consumption ratios for each process-feedstock combination.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Consumption reference ID |
| `ref_id` | `Integer` | FOREIGN KEY → `process_feedstock_ref.id`, NOT NULL | Process-feedstock reference |
| `utility_id` | `Integer` | FOREIGN KEY → `utility.id`, NOT NULL | Utility type |
| `consumption_ratio_ref_unit_per_kg_fuel` | `Float` | NOT NULL | Consumption ratio (unit/kg fuel) |

**Unique Constraint**: `(ref_id, utility_id)` - prevents duplicate utility for same process-feedstock

**Relationships**:
- ← `process_feedstock_ref` (many-to-one)
- ← `utility` (many-to-one)

**Sample Data**:
```sql
-- HEFA (process_id=1) + UCO (feedstock_id=1) reference
INSERT INTO process_utility_consumption_ref (ref_id, utility_id, consumption_ratio_ref_unit_per_kg_fuel) VALUES
  (1, 1, 0.042),  -- Hydrogen: 4.2% of fuel output
  (1, 2, 0.12);   -- Electricity: 12% consumption ratio
```

**Model Location**: backend/app/models/biofuel_model.py:92

---

### Table: `utility_country_price_defaults`

Stores default utility prices by country.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Price default ID |
| `utility_id` | `Integer` | FOREIGN KEY → `utility.id`, NOT NULL | Utility type |
| `country_id` | `Integer` | FOREIGN KEY → `country.id`, NOT NULL | Country |
| `price_ref_usd_per_unit` | `Float` | NOT NULL | Default price (USD per unit) |

**Unique Constraint**: `(utility_id, country_id)` - one price per utility per country

**Relationships**:
- ← `utility` (many-to-one)
- ← `country` (many-to-one)

**Sample Data**:
```sql
INSERT INTO utility_country_price_defaults (utility_id, country_id, price_ref_usd_per_unit) VALUES
  (1, 1, 5.4),   -- Hydrogen in USA: $5.4/kg
  (2, 1, 55.0);  -- Electricity in USA: $55/MWh
```

**Model Location**: backend/app/models/biofuel_model.py:108

---

### Table: `product_reference_breakdown`

Stores product properties and breakdown for each process-feedstock combination.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Product breakdown ID |
| `ref_id` | `Integer` | FOREIGN KEY → `process_feedstock_ref.id`, NOT NULL | Process-feedstock reference |
| `product_id` | `Integer` | FOREIGN KEY → `product.id`, NOT NULL | Product type |
| `carbon_content_kg_c_per_kg` | `Float` | | Carbon content (kg C / kg product) |
| `energy_content_mj_per_kg` | `Float` | | Energy content (MJ/kg) |
| `price_ref_usd_per_unit` | `Float` | NOT NULL | Reference price (USD per unit) |
| `price_sensitivity_ref` | `Float` | | Price sensitivity to carbon intensity |
| `product_yield_ref` | `Float` | | Product yield percentage |
| `product_density` | `Float` | | Product density (kg/L) |

**Unique Constraint**: `(ref_id, product_id)` - one breakdown per product per process-feedstock

**Relationships**:
- ← `process_feedstock_ref` (many-to-one)
- ← `product` (many-to-one)

**Sample Data**:
```sql
-- HEFA + UCO product breakdown
INSERT INTO product_reference_breakdown
  (ref_id, product_id, carbon_content_kg_c_per_kg, energy_content_mj_per_kg,
   price_ref_usd_per_unit, price_sensitivity_ref, product_yield_ref, product_density) VALUES
  (1, 1, 0.847, 43.8, 3000.0, 0.5, 64.0, 0.81),  -- JET: 64% yield
  (1, 2, 0.85, 42.6, 1500.0, 0.5, 15.0, 0.83),   -- DIESEL: 15% yield
  (1, 3, 0.84, 43.4, 1000.0, 0.5, 21.0, 0.7);    -- Naphtha: 21% yield
-- Total yield: 64 + 15 + 21 = 100%
```

**Model Location**: backend/app/models/biofuel_model.py:124

---

### Table: `default_parameter_set`

Stores default economic and technical parameters for each process-feedstock-country combination.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Parameter set ID |
| `process_id` | `Integer` | FOREIGN KEY → `process_technologies.id`, NOT NULL | Process technology |
| `feedstock_id` | `Integer` | FOREIGN KEY → `feedstock.id`, NOT NULL | Feedstock |
| `country_id` | `Integer` | FOREIGN KEY → `country.id`, NOT NULL | Country |
| `plant_capacity_ktpa_ref` | `Float` | | Reference plant capacity (ktpa) |
| `annual_load_hours_ref` | `Float` | | Reference annual load hours |
| `ci_process_default_gco2_mj` | `Float` | | Default process carbon intensity (gCO2/MJ) |
| `project_lifetime_years` | `Integer` | NOT NULL | Project lifetime (years) |
| `discount_rate_percent` | `Float` | NOT NULL | Discount rate (%) |
| `tci_ref_musd` | `Float` | | Total capital investment reference (million USD) |
| `tci_scaling_exponent` | `Float` | NOT NULL | TCI scaling exponent (for capacity scaling) |
| `working_capital_tci_ratio` | `Float` | NOT NULL | Working capital as % of TCI |
| `indirect_opex_tci_ratio` | `Float` | NOT NULL | Indirect OPEX as % of TCI |
| `p_steps` | `Integer` | | Construction period steps |
| `nnp_steps` | `Integer` | | Non-production period steps |

**Unique Constraint**: `(process_id, feedstock_id, country_id)` - one default set per combination

**Relationships**:
- ← `process_technologies` (many-to-one)
- ← `feedstock` (many-to-one)
- ← `country` (many-to-one)

**Sample Data**:
```sql
INSERT INTO default_parameter_set
  (process_id, feedstock_id, country_id, plant_capacity_ktpa_ref, annual_load_hours_ref,
   ci_process_default_gco2_mj, project_lifetime_years, discount_rate_percent, tci_ref_musd,
   tci_scaling_exponent, working_capital_tci_ratio, indirect_opex_tci_ratio, p_steps, nnp_steps) VALUES
  (1, 1, 1, 500.0, 8000.0, 20.0, 20, 7.0, 400.0, 0.6, 0.15, 0.077, 3, 0);
```

**Model Location**: backend/app/models/biofuel_model.py:149

---

## Unit Management Tables

### Table: `unit_group`

Groups related units of measure (e.g., all mass units, all energy units).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Unit group ID |
| `name` | `String` | NOT NULL, UNIQUE | Group name (e.g., "Mass", "Energy", "Price") |
| `base_unit_name` | `String` | NOT NULL | Base unit for this group (e.g., "kg", "MJ") |

**Relationships**:
- → `unit_of_measure` (one-to-many)

**Sample Data**:
```sql
INSERT INTO unit_group (id, name, base_unit_name) VALUES
  (1, 'Mass', 'kg'),
  (2, 'Energy', 'MJ'),
  (3, 'Price_Energy', 'USD/MJ');
```

**Model Location**: backend/app/models/biofuel_model.py:185

---

### Table: `unit_of_measure`

Stores individual units of measure within each group.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Unit ID |
| `unit_group_id` | `Integer` | FOREIGN KEY → `unit_group.id`, NOT NULL | Parent unit group |
| `name` | `String` | NOT NULL | Unit name (e.g., "kg", "t", "kta") |
| `display_name` | `String` | | Human-readable display name |

**Unique Constraint**: `(unit_group_id, name)` - no duplicate unit names in same group

**Relationships**:
- ← `unit_group` (many-to-one)
- → `unit_conversion` (one-to-one)

**Sample Data**:
```sql
INSERT INTO unit_of_measure (id, unit_group_id, name, display_name) VALUES
  (1, 1, 'kg', 'Kilograms'),
  (2, 1, 't', 'Tonnes'),
  (3, 1, 'kta', 'Kilotonnes per annum'),
  (10, 2, 'MWh', 'Megawatt-hours'),
  (11, 2, 'kWh', 'Kilowatt-hours');
```

**Model Location**: backend/app/models/biofuel_model.py:193

---

### Table: `unit_conversion`

Stores conversion factors from each unit to its group's base unit.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `Integer` | PRIMARY KEY, INDEX | Conversion ID |
| `unit_id` | `Integer` | FOREIGN KEY → `unit_of_measure.id`, NOT NULL, UNIQUE | Unit being converted |
| `conversion_factor` | `Float` | NOT NULL | Multiply by this to get base unit |

**Relationships**:
- ← `unit_of_measure` (one-to-one)

**Sample Data**:
```sql
INSERT INTO unit_conversion (unit_id, conversion_factor) VALUES
  (1, 1.0),      -- kg → kg (base): 1.0
  (2, 1000.0),   -- t → kg: 1 t = 1000 kg
  (3, 1000.0),   -- kta → kg/year: 1 kta = 1000 kg/year
  (10, 3600.0),  -- MWh → MJ: 1 MWh = 3600 MJ
  (11, 3.6);     -- kWh → MJ: 1 kWh = 3.6 MJ
```

**Model Location**: backend/app/models/biofuel_model.py:208

---

## User & Project Tables

### Table: `users`

Stores user accounts for authentication and project ownership.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique user identifier (UUID v4) |
| `name` | `String` | NOT NULL | User's full name |
| `email` | `String` | NOT NULL, UNIQUE | User's email (login username) |
| `password_hash` | `String` | NOT NULL | Bcrypt hashed password |
| `access_level` | `String` | NOT NULL | Access tier: "CORE", "ADVANCE", or "ROADSHOW" |
| `created_at` | `DateTime` | DEFAULT utcnow | Account creation timestamp |

**Relationships**:
- → `user_projects` (one-to-many)

**Sample Data**:
```sql
INSERT INTO users (id, name, email, password_hash, access_level) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'John Doe', 'john@example.com',
   '$2b$12$...', 'ADVANCE');
```

**Security Notes**:
- Passwords are hashed using bcrypt with salt
- Password truncated to 72 characters (bcrypt limit)
- Email is used as login username

**Model Location**: backend/app/models/biofuel_model.py:219

---

### Table: `user_projects`

Stores projects created by users. Each project can contain multiple scenarios.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique project identifier (UUID v4) |
| `user_id` | `UUID` | FOREIGN KEY → `users.id` | Project owner |
| `project_name` | `String` | NOT NULL | User-defined project name |
| `initial_process_id` | `Integer` | FOREIGN KEY → `process_technologies.id`, NULLABLE | Initial process selection |
| `initial_feedstock_id` | `Integer` | FOREIGN KEY → `feedstock.id`, NULLABLE | Initial feedstock selection |
| `initial_country_id` | `Integer` | FOREIGN KEY → `country.id`, NULLABLE | Initial country selection |
| `created_at` | `DateTime` | DEFAULT utcnow | Project creation timestamp |
| `updated_at` | `DateTime` | DEFAULT utcnow, ON UPDATE utcnow | Last update timestamp |

**Relationships**:
- ← `users` (many-to-one)
- ← `process_technologies` (many-to-one, optional)
- ← `feedstock` (many-to-one, optional)
- ← `country` (many-to-one, optional)
- → `scenarios` (one-to-many, cascade delete)

**Cascade Behavior**:
- Deleting a project automatically deletes all its scenarios

**Model Location**: backend/app/models/biofuel_model.py:231

---

### Table: `scenarios`

Stores individual calculation scenarios within projects. Contains user inputs and calculation results.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `UUID` | PRIMARY KEY | Unique scenario identifier (UUID v4) |
| `project_id` | `UUID` | FOREIGN KEY → `user_projects.id`, NOT NULL | Parent project |
| `scenario_name` | `String` | NOT NULL | User-defined scenario name |
| `scenario_order` | `Integer` | NOT NULL, DEFAULT 0 | Display order within project |
| `process_id` | `Integer` | FOREIGN KEY → `process_technologies.id`, NOT NULL | Selected process technology |
| `feedstock_id` | `Integer` | FOREIGN KEY → `feedstock.id`, NOT NULL | Selected feedstock |
| `country_id` | `Integer` | FOREIGN KEY → `country.id`, NOT NULL | Selected country |
| `user_inputs` | `JSONB` | NOT NULL | User-provided calculation inputs (JSON) |
| `techno_economics` | `JSONB` | NULLABLE | TEA calculation results (JSON) |
| `financial_analysis` | `JSONB` | NULLABLE | Financial analysis results (JSON) |
| `created_at` | `DateTime` | DEFAULT utcnow | Scenario creation timestamp |
| `updated_at` | `DateTime` | DEFAULT utcnow, ON UPDATE utcnow | Last calculation/update timestamp |

**Unique Constraint**: `(project_id, scenario_order)` - no duplicate orders within same project

**Relationships**:
- ← `user_projects` (many-to-one)
- ← `process_technologies` (many-to-one)
- ← `feedstock` (many-to-one)
- ← `country` (many-to-one)

**JSONB Fields Structure**:

#### `user_inputs` Structure:
```json
{
  "conversion_plant": {
    "plant_capacity": {"value": 500, "unit_id": 3},
    "annual_load_hours": 8000,
    "ci_process_default": 20.0
  },
  "economic_parameters": {
    "project_lifetime_years": 20,
    "discount_rate_percent": 7.0,
    "tci_ref_musd": 400,
    "reference_capacity_ktpa": 500,
    "tci_scaling_exponent": 0.6,
    "working_capital_tci_ratio": 0.15,
    "indirect_opex_tci_ratio": 0.077
  },
  "feedstock_data": [...],
  "utility_data": [...],
  "product_data": [...]
}
```

#### `techno_economics` Structure:
```json
{
  "annual_feedstock_consumption_t": 500000.0,
  "annual_saf_production_t": 605000.0,
  "total_annual_opex_usd": 710150000.0,
  "lcop_usd_per_t": 1173.8,
  "ci_final_gco2e_per_mj": 31.2
}
```

#### `financial_analysis` Structure:
```json
{
  "npv_usd": 3532017806.0,
  "irr_percent": 119.7,
  "payback_period_years": 1,
  "annual_cash_flows": [...]
}
```

**Model Location**: backend/app/models/biofuel_model.py:258

---

## Relationships and Constraints

### Foreign Key Relationships

```
users
  └─→ user_projects (user_id)
        └─→ scenarios (project_id) [CASCADE DELETE]

process_technologies
  ├─→ process_feedstock_ref (process_id)
  ├─→ default_parameter_set (process_id)
  ├─→ scenarios (process_id)
  └─→ user_projects (initial_process_id)

feedstock
  ├─→ process_feedstock_ref (feedstock_id)
  ├─→ default_parameter_set (feedstock_id)
  ├─→ scenarios (feedstock_id)
  └─→ user_projects (initial_feedstock_id)

country
  ├─→ utility_country_price_defaults (country_id)
  ├─→ default_parameter_set (country_id)
  ├─→ scenarios (country_id)
  └─→ user_projects (initial_country_id)

process_feedstock_ref
  ├─→ process_utility_consumption_ref (ref_id)
  └─→ product_reference_breakdown (ref_id)

utility
  ├─→ process_utility_consumption_ref (utility_id)
  └─→ utility_country_price_defaults (utility_id)

product
  └─→ product_reference_breakdown (product_id)

unit_group
  └─→ unit_of_measure (unit_group_id)
        └─→ unit_conversion (unit_id) [ONE-TO-ONE]
```

### Unique Constraints

| Table | Constraint | Purpose |
|-------|------------|---------|
| `process_technologies` | `name` | Prevent duplicate process names |
| `country` | `name` | Prevent duplicate country names |
| `feedstock` | `name` | Prevent duplicate feedstock names |
| `utility` | `name` | Prevent duplicate utility names |
| `product` | `name` | Prevent duplicate product names |
| `users` | `email` | Prevent duplicate user accounts |
| `process_feedstock_ref` | `(process_id, feedstock_id)` | One reference per process-feedstock pair |
| `process_utility_consumption_ref` | `(ref_id, utility_id)` | One consumption per utility per reference |
| `utility_country_price_defaults` | `(utility_id, country_id)` | One price per utility per country |
| `product_reference_breakdown` | `(ref_id, product_id)` | One breakdown per product per reference |
| `default_parameter_set` | `(process_id, feedstock_id, country_id)` | One default set per combination |
| `unit_group` | `name` | Prevent duplicate unit groups |
| `unit_of_measure` | `(unit_group_id, name)` | Prevent duplicate units in same group |
| `unit_conversion` | `unit_id` | One conversion factor per unit |
| `scenarios` | `(project_id, scenario_order)` | Unique ordering within project |

---

## Indexes

### Automatic Indexes

All primary keys are automatically indexed:
- `process_technologies.id`
- `country.id`
- `feedstock.id`
- `utility.id`
- `product.id`
- `users.id`
- `user_projects.id`
- `scenarios.id`
- All other primary keys

### Recommended Additional Indexes

For production performance, consider adding:

```sql
-- User queries
CREATE INDEX idx_users_email ON users(email);

-- Project queries
CREATE INDEX idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX idx_user_projects_created_at ON user_projects(created_at);

-- Scenario queries
CREATE INDEX idx_scenarios_project_id ON scenarios(project_id);
CREATE INDEX idx_scenarios_process_feedstock_country ON scenarios(process_id, feedstock_id, country_id);
CREATE INDEX idx_scenarios_updated_at ON scenarios(updated_at);

-- JSONB queries (if filtering by JSON fields)
CREATE INDEX idx_scenarios_user_inputs_gin ON scenarios USING GIN (user_inputs);
CREATE INDEX idx_scenarios_techno_economics_gin ON scenarios USING GIN (techno_economics);

-- Reference data queries
CREATE INDEX idx_process_feedstock_ref_lookup ON process_feedstock_ref(process_id, feedstock_id);
```

---

## Migration Guide

### Local PostgreSQL → AWS RDS Migration

#### Pre-Migration Checklist

1. **Backup Current Database**
   ```bash
   pg_dump -U postgres safapac_db > safapac_backup_$(date +%Y%m%d).sql
   ```

2. **Document Current Schema**
   ```bash
   pg_dump -U postgres -s safapac_db > schema_backup.sql
   ```

3. **Export Current Data**
   ```bash
   pg_dump -U postgres -a safapac_db > data_backup.sql
   ```

4. **Verify Data Integrity**
   ```sql
   -- Check row counts
   SELECT 'users' as table_name, COUNT(*) FROM users
   UNION ALL
   SELECT 'user_projects', COUNT(*) FROM user_projects
   UNION ALL
   SELECT 'scenarios', COUNT(*) FROM scenarios;
   ```

#### Migration Steps

1. **Create AWS RDS Instance**
   - PostgreSQL version: Match local version
   - Instance class: db.t3.medium (testing) or db.r6g.large (production)
   - Storage: 100 GB minimum (with autoscaling)
   - Multi-AZ: Recommended for production
   - Backup retention: 7 days minimum

2. **Update Connection Configuration**

   **backend/app/core/database.py**:
   ```python
   # Environment-based configuration
   import os

   DATABASE_URL = os.getenv(
       "DATABASE_URL",
       "postgresql://user:password@localhost/safapac_db"  # Local default
   )

   # AWS RDS production:
   # DATABASE_URL=postgresql://username:password@rds-endpoint:5432/safapac_db
   ```

3. **Run Migration**
   ```bash
   # Option 1: Direct restore
   psql -h <rds-endpoint> -U <username> -d safapac_db < safapac_backup.sql

   # Option 2: Use SQLAlchemy migrations (Alembic)
   alembic upgrade head
   ```

4. **Verify Migration**
   ```sql
   -- Connect to RDS and verify
   SELECT table_name
   FROM information_schema.tables
   WHERE table_schema = 'public';

   -- Check data counts
   SELECT 'users', COUNT(*) FROM users
   UNION ALL
   SELECT 'user_projects', COUNT(*) FROM user_projects
   UNION ALL
   SELECT 'scenarios', COUNT(*) FROM scenarios;
   ```

5. **Update Application Configuration**
   - Set `DATABASE_URL` environment variable
   - Enable SSL for RDS connections
   - Update connection pool settings for production

6. **Test Application**
   - Run health check endpoint
   - Test login
   - Create test project
   - Run test calculation

---

## Backup and Recovery

### Backup Strategy

#### Local Development
```bash
# Daily backup script
pg_dump -U postgres safapac_db | gzip > backups/safapac_$(date +%Y%m%d_%H%M%S).sql.gz

# Keep last 7 days of backups
find backups/ -name "safapac_*.sql.gz" -mtime +7 -delete
```

#### AWS RDS Production

1. **Automated Backups**
   - Enable automated backups (default: 7-day retention)
   - Backup window: Off-peak hours (e.g., 02:00-03:00 UTC)
   - Point-in-time recovery enabled

2. **Manual Snapshots**
   ```bash
   # Create snapshot before major changes
   aws rds create-db-snapshot \
     --db-instance-identifier safapac-prod \
     --db-snapshot-identifier safapac-pre-migration-$(date +%Y%m%d)
   ```

3. **Export to S3** (for long-term archival)
   ```bash
   aws rds start-export-task \
     --export-task-identifier safapac-monthly-export \
     --source-arn arn:aws:rds:region:account:snapshot:snapshot-name \
     --s3-bucket-name safapac-db-backups \
     --iam-role-arn arn:aws:iam::account:role/rds-s3-export-role \
     --kms-key-id arn:aws:kms:region:account:key/key-id
   ```

### Recovery Procedures

#### Restore from Local Backup
```bash
# Drop existing database (CAREFUL!)
dropdb -U postgres safapac_db

# Create new database
createdb -U postgres safapac_db

# Restore from backup
gunzip -c backups/safapac_20251201_100000.sql.gz | psql -U postgres safapac_db
```

#### Restore from RDS Snapshot
```bash
# Restore to new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier safapac-restore-$(date +%Y%m%d) \
  --db-snapshot-identifier safapac-pre-migration-20251201

# Update application to point to restored instance (testing)
# If validated, promote restored instance to production
```

#### Point-in-Time Recovery (RDS)
```bash
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier safapac-prod \
  --target-db-instance-identifier safapac-pitr-$(date +%Y%m%d_%H%M) \
  --restore-time 2025-12-01T10:00:00Z
```

---

## Schema Versioning

### Current Version: 2.0.0

**Changes from v1.x**:
1. User/Project/Scenario IDs: Integer → UUID
2. JSONB field names: `*_json` → direct names (`user_inputs`, `techno_economics`, etc.)
3. Added `name` field to `users` table
4. Removed CSV-based authentication table

### Migration Tracking (Alembic)

```bash
# Create new migration
alembic revision -m "description of changes"

# Apply migrations
alembic upgrade head

# Rollback one version
alembic downgrade -1

# View migration history
alembic history
```

---

## Performance Optimization

### Query Optimization

1. **Use JSONB Indexes for Filtering**
   ```sql
   -- Example: Find scenarios with specific plant capacity
   CREATE INDEX idx_scenarios_plant_capacity
   ON scenarios ((user_inputs->'conversion_plant'->>'plant_capacity'));
   ```

2. **Use Materialized Views for Reports**
   ```sql
   CREATE MATERIALIZED VIEW scenario_summary AS
   SELECT
     s.id,
     s.scenario_name,
     p.name as process,
     f.name as feedstock,
     c.name as country,
     (s.techno_economics->>'npv_usd')::float as npv,
     (s.techno_economics->>'irr_percent')::float as irr
   FROM scenarios s
   JOIN process_technologies p ON s.process_id = p.id
   JOIN feedstock f ON s.feedstock_id = f.id
   JOIN country c ON s.country_id = c.id;

   -- Refresh periodically
   REFRESH MATERIALIZED VIEW scenario_summary;
   ```

3. **Connection Pooling**
   ```python
   # SQLAlchemy connection pool settings
   engine = create_engine(
       DATABASE_URL,
       pool_size=20,          # Max connections
       max_overflow=10,       # Allow 30 total connections
       pool_pre_ping=True,    # Verify connections before use
       pool_recycle=3600      # Recycle connections every hour
   )
   ```

---

## Security Considerations

1. **Sensitive Data**
   - Passwords: Hashed with bcrypt (never stored in plain text)
   - Database credentials: Stored in environment variables (never in code)
   - RDS: Use SSL/TLS for connections

2. **Access Control**
   - Row-level security: Projects/scenarios filtered by `user_id`
   - API enforces user ownership checks
   - Three-tier access levels (CORE, ADVANCE, ROADSHOW)

3. **Encryption**
   - RDS: Enable encryption at rest
   - Backups: Encrypted with KMS
   - Connections: SSL/TLS required

---

## Troubleshooting

### Common Issues

#### Issue: Cannot connect to RDS
```bash
# Check security group allows PostgreSQL port (5432)
# Check RDS publicly accessible setting
# Verify connection string format
```

#### Issue: Migration fails
```bash
# Check schema compatibility
# Verify foreign key constraints
# Check for duplicate data violating unique constraints
```

#### Issue: Slow queries
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM scenarios WHERE user_id = '...';

-- Check for missing indexes
SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0;
```

---

## Appendix

### Complete Schema SQL

See `backend/app/models/biofuel_model.py` for SQLAlchemy model definitions.

To generate SQL schema:
```bash
# Using SQLAlchemy
python -c "from app.core.database import Base, engine; Base.metadata.create_all(engine)"

# Or export schema
pg_dump -U postgres -s safapac_db > schema.sql
```

### Database Initialization

Database tables are created automatically on application startup:

**backend/app/main.py**:
```python
@app.on_event("startup")
async def startup_event():
    create_tables()      # Create all tables from models
    initialize_database()  # Seed with master data
```

---

**Document Version**: 1.0
**Last Updated**: December 1, 2025
**Schema Version**: 2.0.0
**Maintained By**: Backend Development Team

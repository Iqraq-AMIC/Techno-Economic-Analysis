# SAFAPAC API Documentation

**API Version**: 2.0.0
**Base URL**: `http://localhost:8000` (Development) | `https://[aws-domain]` (Production - TBD)
**Last Updated**: December 23, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
   - [Health & Status](#health--status)
   - [Authentication](#authentication-endpoints)
   - [Master Data](#master-data-endpoints)
   - [Projects](#project-endpoints)
   - [Scenarios](#scenario-endpoints)
   - [Calculations](#calculation-endpoints)
4. [Request/Response Formats](#requestresponse-formats)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Overview

The SAFAPAC API is a RESTful JSON API built with FastAPI that powers the Sustainable Aviation Fuel Analysis Platform and Cost Calculator. It provides endpoints for:

- **Techno-Economic Analysis (TEA)** calculations for SAF production
- **Project and Scenario Management** for user calculations
- **Master Data** access (processes, feedstocks, countries, utilities, products)
- **Financial Modeling** (NPV, IRR, Payback Period, LCOP)
- **Carbon Intensity Tracking** (gCO2e/MJ)

### Technology Stack

- **Framework**: FastAPI 0.x
- **Database**: PostgreSQL (currently local, migrating to AWS RDS)
- **Authentication**: JWT (JSON Web Tokens)
- **API Documentation**: Auto-generated at `/docs` (Swagger UI) and `/redoc` (ReDoc)

### Base Response Format

All successful responses return JSON with appropriate HTTP status codes:

```json
{
  "data": { ... },
  "status": "success"
}
```

Error responses follow the format described in [Error Handling](#error-handling).

---

## Authentication

### Authentication Method

The API uses **JWT (JSON Web Token)** bearer authentication.

### Getting a Token

1. Call `POST /api/v1/auth/login` with credentials
2. Receive `access_token` in response
3. Include token in subsequent requests via `Authorization` header

### Using the Token

Include the JWT token in the Authorization header for all protected endpoints:

```
Authorization: Bearer <your_access_token>
```

### Token Expiration

- **Default Expiration**: 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
- **Renewal**: Client must re-authenticate when token expires (auto-logout implemented)

### Access Levels

Three-tier authorization system:

| Level | Access |
|-------|--------|
| **CORE** | Basic calculations and project management |
| **ADVANCE** | Advanced features and additional data |
| **ROADSHOW** | Full access including presentation/export features |

---

## API Endpoints

### Health & Status

#### GET `/`

Root endpoint - API server information.

**Authentication**: Not required

**Response**:
```json
{
  "message": "SAFAPAC API Server",
  "version": "2.0.0",
  "status": "running"
}
```

#### GET `/health`

Health check endpoint.

**Authentication**: Not required

**Response**:
```json
{
  "status": "healthy",
  "timestamp": 1701432000.123
}
```

---

### Authentication Endpoints

#### POST `/api/v1/auth/login`

User authentication and JWT token generation.

**Authentication**: Not required

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response** (200 OK):
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "user@example.com",
    "accessLevel": "ADVANCE",
    "occupation": "researcher"
  }
}
```

**Error Responses**:
- `401 Unauthorized`: Invalid email or password
- `500 Internal Server Error`: Login system failure

**Notes**:
- Password is automatically truncated to 72 characters (bcrypt limit)
- Passwords are hashed using bcrypt
- Failed login attempts are logged

**Location**: backend/app/api/endpoints/auth.py:30

---

#### POST `/api/v1/auth/register`

User registration endpoint.

**Authentication**: Not required

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "user@example.com",
  "password": "securepassword123",
  "occupation": "student"
}
```

**Request Field Validation**:
- `name`: 1-100 characters, required
- `email`: Valid email format (EmailStr), required, must be unique
- `password`: 8-72 characters, required
- `occupation`: Must be "student" or "researcher", required

**Response** (201 Created):
```json
{
  "message": "Registration successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "user@example.com",
    "accessLevel": "CORE",
    "occupation": "student"
  }
}
```

**Behavior**:
- New users are created with "CORE" access level by default
- Password is hashed using bcrypt before storage
- Email must be unique (checked against existing users)
- User can immediately login after registration

**Error Responses**:
- `409 Conflict`: Email already registered
- `422 Unprocessable Entity`: Validation errors (invalid email format, password too short, invalid occupation)
- `500 Internal Server Error`: Registration system failure

**Notes**:
- Password is automatically hashed with bcrypt
- Passwords are truncated to 72 characters (bcrypt limit)
- No email verification is currently implemented
- New users must be upgraded to "ADVANCE" or "ROADSHOW" access levels by an administrator

**Location**: backend/app/api/endpoints/auth.py:90

---

### Master Data Endpoints

Master data endpoints provide reference data for dropdowns and calculations.

#### GET `/api/v1/master-data`

Get all master data in a single request (recommended for frontend initialization).

**Authentication**: Required

**Response** (200 OK):
```json
{
  "process_technologies": [
    {
      "id": 1,
      "name": "HEFA"
    }
  ],
  "feedstocks": [
    {
      "id": 1,
      "name": "UCO",
      "carbon_content_kg_c_per_kg": 0.77,
      "energy_content_mj_per_kg": 37.0,
      "ci_ref_gco2e_per_mj": 20.0,
      "price_ref_usd_per_unit": 930.0,
      "yield_ref": 121.0
    }
  ],
  "countries": [
    {
      "id": 1,
      "name": "USA"
    }
  ],
  "utilities": [...],
  "products": [...],
  "units": [...]
}
```

**Location**: backend/app/api/endpoints/projects.py:213

#### GET `/api/v1/process-technologies`

Get all process technologies.

**Authentication**: Required

**Response**: Array of `ProcessTechnologySchema`

**Location**: backend/app/api/endpoints/master_data.py:26

#### GET `/api/v1/feedstocks`

Get all feedstocks.

**Authentication**: Required

**Response**: Array of `FeedstockSchema`

**Location**: backend/app/api/endpoints/master_data.py:31

#### GET `/api/v1/countries`

Get all countries.

**Authentication**: Required

**Response**: Array of `CountrySchema`

**Location**: backend/app/api/endpoints/master_data.py:36

#### GET `/api/v1/utilities`

Get all utilities (hydrogen, electricity, etc.).

**Authentication**: Required

**Response**: Array of `UtilitySchema`

**Location**: backend/app/api/endpoints/master_data.py:41

#### GET `/api/v1/products`

Get all products (jet fuel, diesel, naphtha).

**Authentication**: Required

**Response**: Array of `ProductSchema`

**Location**: backend/app/api/endpoints/master_data.py:46

#### GET `/api/v1/units`

Get all units of measure for conversions.

**Authentication**: Required

**Response**: Array of `UnitOfMeasureSchema`

**Location**: backend/app/api/endpoints/master_data.py:51

---

### Project Endpoints

Projects are containers for multiple scenarios belonging to a user.

#### POST `/api/v1/projects`

Create a new project with an initial scenario.

**Authentication**: Required

**Request Body**:
```json
{
  "project_name": "My SAF Project",
  "initial_process_id": 1,
  "initial_feedstock_id": 1,
  "initial_country_id": 1
}
```

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "450e8400-e29b-41d4-a716-446655440000",
  "project_name": "My SAF Project",
  "initial_process_id": 1,
  "initial_feedstock_id": 1,
  "initial_country_id": 1,
  "created_at": "2025-12-01T10:00:00Z",
  "updated_at": "2025-12-01T10:00:00Z"
}
```

**Behavior**:
1. Creates a new project
2. Automatically creates "Scenario 1" with default inputs
3. **Auto-calculates** Scenario 1 immediately
4. Returns project details

**Error Responses**:
- `400 Bad Request`: Invalid input data or creation failure
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:220

---

#### GET `/api/v1/projects`

Get all projects for the authenticated user.

**Authentication**: Required

**Query Parameters**: None

**Response** (200 OK):
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "project_name": "My SAF Project",
    "scenario_count": 3,
    "created_at": "2025-12-01T10:00:00Z",
    "updated_at": "2025-12-01T10:00:00Z"
  }
]
```

**Notes**:
- Returns only projects owned by the authenticated user
- `scenario_count` is calculated dynamically

**Location**: backend/app/api/endpoints/projects.py:270

---

#### GET `/api/v1/projects/{project_id}`

Get a specific project with all its scenarios.

**Authentication**: Required

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response** (200 OK):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "project_name": "My SAF Project",
  "scenario_count": 2,
  "scenarios": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "scenario_name": "Scenario 1",
      "scenario_order": 1,
      "process": {
        "id": 1,
        "name": "HEFA"
      },
      "feedstock": {
        "id": 1,
        "name": "UCO"
      },
      "country": {
        "id": 1,
        "name": "USA"
      },
      "created_at": "2025-12-01T10:00:00Z",
      "updated_at": "2025-12-01T10:00:00Z"
    }
  ]
}
```

**Error Responses**:
- `404 Not Found`: Project not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:284

---

#### PUT `/api/v1/projects/{project_id}`

Update a project.

**Authentication**: Required

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Request Body**:
```json
{
  "project_name": "Updated Project Name"
}
```

**Response** (200 OK): Updated `ProjectResponse`

**Error Responses**:
- `404 Not Found`: Project not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:316

---

#### DELETE `/api/v1/projects/{project_id}`

Delete a project and all its scenarios.

**Authentication**: Required

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response** (204 No Content): Empty response

**Error Responses**:
- `404 Not Found`: Project not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Notes**:
- **Cascading deletion**: All scenarios within the project are also deleted
- This operation cannot be undone

**Location**: backend/app/api/endpoints/projects.py:343

---

### Scenario Endpoints

Scenarios represent different calculation configurations within a project.

#### POST `/api/v1/projects/{project_id}/scenarios`

Create a new scenario for a project.

**Authentication**: Required

**Path Parameters**:
- `project_id` (UUID): Parent project identifier

**Request Body**:
```json
{
  "scenario_name": "Scenario 2",
  "process_id": 1,
  "feedstock_id": 1,
  "country_id": 1,
  "scenario_order": 2,
  "user_inputs": {
    "conversion_plant": {
      "plant_capacity": {
        "value": 500,
        "unit_id": 3
      },
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
}
```

**Response** (201 Created): `ScenarioResponse`

**Behavior**:
1. Creates the scenario in the database
2. **Auto-calculates** the scenario immediately
3. Returns the scenario with calculation results
4. If calculation fails, returns scenario without results (logged as warning)

**Error Responses**:
- `404 Not Found`: Project not found or access denied
- `400 Bad Request`: Invalid scenario data or creation failure
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:367

---

#### GET `/api/v1/projects/{project_id}/scenarios`

Get all scenarios for a project.

**Authentication**: Required

**Path Parameters**:
- `project_id` (UUID): Project identifier

**Response** (200 OK): Array of `ScenarioResponse`

**Error Responses**:
- `404 Not Found`: Project not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:418

---

#### GET `/api/v1/scenarios/{scenario_id}`

Get a specific scenario with full details including calculation results.

**Authentication**: Required

**Path Parameters**:
- `scenario_id` (UUID): Scenario identifier

**Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "scenario_name": "Scenario 1",
  "scenario_order": 1,
  "process_id": 1,
  "feedstock_id": 1,
  "country_id": 1,
  "user_inputs": { ... },
  "techno_economics": {
    "annual_feedstock_consumption_t": 500000,
    "annual_saf_production_t": 605000,
    "total_annual_opex_usd": 710150000,
    "lcop_usd_per_t": 1173.8,
    "ci_final_gco2e_per_mj": 31.2
  },
  "financial_analysis": {
    "npv_usd": 3532017806,
    "irr_percent": 119.7,
    "payback_period_years": 1,
    "annual_cash_flows": [...]
  },
  "created_at": "2025-12-01T10:00:00Z",
  "updated_at": "2025-12-01T10:05:00Z"
}
```

**Error Responses**:
- `404 Not Found`: Scenario not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:435

---

#### PUT `/api/v1/scenarios/{scenario_id}`

Update a scenario (metadata only, not inputs).

**Authentication**: Required

**Path Parameters**:
- `scenario_id` (UUID): Scenario identifier

**Request Body**:
```json
{
  "scenario_name": "Updated Scenario Name",
  "scenario_order": 3
}
```

**Response** (200 OK): Updated `ScenarioResponse`

**Notes**:
- This endpoint updates **metadata only** (name, order)
- To update inputs and recalculate, use `POST /api/v1/scenarios/{scenario_id}/calculate`

**Error Responses**:
- `404 Not Found`: Scenario not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/projects.py:452

---

#### DELETE `/api/v1/scenarios/{scenario_id}`

Delete a scenario.

**Authentication**: Required

**Path Parameters**:
- `scenario_id` (UUID): Scenario identifier

**Response** (204 No Content): Empty response

**Error Responses**:
- `404 Not Found`: Scenario not found or access denied
- `401 Unauthorized`: Missing or invalid authentication token

**Notes**:
- This operation cannot be undone
- Consider updating `scenario_order` for remaining scenarios after deletion

**Location**: backend/app/api/endpoints/scenarios_endpoints.py:214

---

#### PATCH `/api/v1/scenarios/{scenario_id}/draft`

Save partial/incomplete scenario data as a draft without running calculations.

**Authentication**: Required

**Path Parameters**:
- `scenario_id` (UUID): Scenario identifier

**Request Body** (all fields optional):
```json
{
  "processId": 1,
  "feedstockId": 2,
  "countryId": 1,
  "conversionPlant": {
    "plantCapacity": {
      "value": 500,
      "unitId": 3
    },
    "annualLoadHours": 8000
  },
  "economicParameters": {
    "projectLifetimeYears": 20
  },
  "feedstockData": [...],
  "utilityData": [...],
  "productData": [...]
}
```

**Response** (200 OK):
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "draft",
  "message": "Draft saved successfully",
  "userInputs": {
    "processId": 1,
    "feedstockId": 2,
    "countryId": 1,
    "conversionPlant": {...},
    "economicParameters": {...}
  }
}
```

**Behavior**:
- Accepts partial/incomplete data
- All fields are optional - only provided fields are updated
- Merges new data with existing user_inputs
- Does NOT run calculation engine
- Does NOT validate data completeness
- Sets scenario status to "draft"
- Preserves existing data for unprovided fields

**Use Cases**:
- Saving work-in-progress scenarios
- Incremental form filling
- Auto-save functionality
- Preserving user input before navigation

**Error Responses**:
- `404 Not Found`: Scenario not found or access denied
- `400 Bad Request`: Failed to save draft
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/scenarios_endpoints.py:231

---

### Calculation Endpoints

#### POST `/api/v1/scenarios/{scenario_id}/calculate`

Update scenario inputs and run TEA calculation.

**Authentication**: Required

**Path Parameters**:
- `scenario_id` (UUID): Scenario identifier

**Request Body**:
```json
{
  "process_technology": "HEFA",
  "feedstock": "UCO",
  "country": "USA",
  "conversion_plant": {
    "plant_capacity": {
      "value": 500,
      "unit_id": 3
    },
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
  "feedstock_data": [
    {
      "name": "UCO",
      "price": {
        "value": 930.0,
        "unit_id": 7
      },
      "carbon_content": 0.77,
      "carbon_intensity": {
        "value": 20.0,
        "unit_id": 11
      },
      "energy_content": 37.0,
      "yield_percent": 121.0
    }
  ],
  "utility_data": [
    {
      "name": "Hydrogen",
      "price": {
        "value": 5.4,
        "unit_id": 6
      },
      "carbon_content": 0.0,
      "carbon_intensity": {
        "value": 0.0,
        "unit_id": 11
      },
      "energy_content": 120.0,
      "yield_percent": 4.2
    },
    {
      "name": "electricity",
      "price": {
        "value": 55.0,
        "unit_id": 10
      },
      "carbon_content": 0.0,
      "carbon_intensity": {
        "value": 20.0,
        "unit_id": 13
      },
      "energy_content": 0.0,
      "yield_percent": 12.0
    }
  ],
  "product_data": [
    {
      "name": "JET",
      "price": {
        "value": 3000,
        "unit_id": 7
      },
      "price_sensitivity_to_ci": 0.5,
      "carbon_content": 0.847,
      "energy_content": 43.8,
      "yield_percent": 64.0,
      "product_density": 0.81
    },
    {
      "name": "DIESEL",
      "price": {
        "value": 1500,
        "unit_id": 7
      },
      "price_sensitivity_to_ci": 0.5,
      "carbon_content": 0.85,
      "energy_content": 42.6,
      "yield_percent": 15.0,
      "product_density": 0.83
    },
    {
      "name": "Naphtha",
      "price": {
        "value": 1000,
        "unit_id": 7
      },
      "price_sensitivity_to_ci": 0.5,
      "carbon_content": 0.84,
      "energy_content": 43.4,
      "yield_percent": 21.0,
      "product_density": 0.7
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "techno_economics": {
    "annual_feedstock_consumption_t": 500000.0,
    "annual_saf_production_t": 605000.0,
    "total_annual_opex_usd": 710150000.0,
    "lcop_usd_per_t": 1173.8,
    "ci_final_gco2e_per_mj": 31.2,
    "LCOP_traceable": {
      "value": 1173.8,
      "unit": "USD/t",
      "formula": "LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production",
      "components": [
        {
          "name": "Annualized TCI",
          "value": 58500000,
          "unit": "USD/year",
          "description": "Total capital investment annualized using capital recovery factor"
        },
        {
          "name": "Total Operating Expenses",
          "value": 710150000,
          "unit": "USD/year",
          "description": "Total annual operating expenses"
        },
        {
          "name": "Byproduct Revenue",
          "value": 250000000,
          "unit": "USD/year",
          "description": "Revenue from byproducts"
        },
        {
          "name": "SAF Production",
          "value": 605000,
          "unit": "t/year",
          "description": "Annual SAF production"
        }
      ],
      "metadata": {
        "discount_rate_percent": 7.0,
        "project_lifetime_years": 20,
        "capital_recovery_factor": 0.0944,
        "npv_usd": 3532017806,
        "irr_percent": 119.7
      }
    },
    "total_opex_traceable": {
      "value": 710150000,
      "unit": "USD/year",
      "formula": "Total OPEX = Feedstock_cost + Hydrogen_cost + Electricity_cost + Indirect_OPEX",
      "components": [...],
      "metadata": {...}
    },
    "total_capital_investment_traceable": {
      "value": 400,
      "unit": "MUSD",
      "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^scaling_exponent × (1 + working_capital_ratio)",
      "components": [...],
      "metadata": {...}
    }
  },
  "financials": {
    "npv_usd": 3532017806.0,
    "irr_percent": 119.7,
    "payback_period_years": 1,
    "annual_cash_flows": [...]
  },
  "resolved_inputs": { ... }
}
```

**Behavior**:
1. Validates process, feedstock, and country IDs
2. Updates relational columns (process_id, feedstock_id, country_id)
3. Updates user_inputs JSON blob in database
4. **Normalizes all input values to base units** (e.g., kt → kg, MWh → kWh)
5. Runs 4-layer TEA calculation engine with normalized inputs
6. Generates **traceable calculation results** for key KPIs (TCI, OPEX, LCOP)
7. Saves results to database (techno_economics, financial_analysis)
8. Sets scenario status to "calculated"
9. Returns calculation results with formulas, components, and metadata

**Error Responses**:
- `404 Not Found`: Scenario not found or access denied
- `400 Bad Request`: Invalid input data or calculation failure
- `401 Unauthorized`: Missing or invalid authentication token

**Important Notes**:
- Product mass fractions must sum to 100%
- Electricity price must be in correct units (0.055 USD/kWh, NOT 55 USD/kWh)
- Refer to `backend/CORRECT_INPUT_GUIDE.md` for correct values
- NaN and Infinity values are sanitized to 0.0 for JSON serialization

**Location**: backend/app/api/endpoints/projects.py:504

---

#### POST `/api/v1/calculate/quick`

Perform a quick calculation without saving to database.

**Authentication**: Required

**Request Body**:
```json
{
  "process_technology": "HEFA",
  "feedstock": "UCO",
  "country": "USA",
  "inputs": {
    "conversion_plant": { ... },
    "economic_parameters": { ... },
    "feedstock_data": [ ... ],
    "utility_data": [ ... ],
    "product_data": [ ... ]
  }
}
```

**Response** (200 OK): Same as `/calculate` endpoint

**Use Case**:
- Testing calculations without creating projects/scenarios
- Exploratory analysis
- Frontend validation before saving

**Error Responses**:
- `400 Bad Request`: Invalid input data or calculation failure
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/calculations.py:26

---

#### GET `/api/v1/reference-data/{process_technology}/{feedstock}/{country}`

Get reference data for a specific process-feedstock-country combination.

**Authentication**: Required

**Path Parameters**:
- `process_technology` (string): Process technology name (e.g., "HEFA")
- `feedstock` (string): Feedstock name (e.g., "UCO")
- `country` (string): Country name (e.g., "USA")

**Response** (200 OK):
```json
{
  "process_id": 1,
  "feedstock_id": 1,
  "country_id": 1,
  "default_parameters": { ... },
  "reference_consumptions": [ ... ],
  "product_breakdowns": [ ... ]
}
```

**Error Responses**:
- `404 Not Found`: No reference data found for the combination
- `400 Bad Request`: Invalid parameters
- `401 Unauthorized`: Missing or invalid authentication token

**Location**: backend/app/api/endpoints/calculations.py:80

---

## Request/Response Formats

### Common Data Structures

#### Quantity

Represents a value with a unit of measure:

```json
{
  "value": 500,
  "unitId": 3
}
```

**Note**: All quantity values are automatically normalized to base units during calculation:
- Mass: kg (kilograms)
- Energy: MJ (megajoules)
- Volume: L (liters)
- Power: kWh (kilowatt-hours)

Example: If you submit `{"value": 500, "unitId": 3}` where unit 3 is "kt" (kilotons), the system converts to base unit "kg" using the conversion factor from `GET /api/v1/units`.

---

#### TraceableValue

Represents a calculated value with full transparency (formula, components, metadata):

```json
{
  "value": 1173.8,
  "unit": "USD/t",
  "formula": "LCOP = (TCI_annual + OPEX_total - Revenue_byproducts) / SAF_production",
  "components": [
    {
      "name": "Annualized TCI",
      "value": 58500000,
      "unit": "USD/year",
      "description": "Total capital investment annualized using capital recovery factor"
    },
    {
      "name": "Total Operating Expenses",
      "value": 710150000,
      "unit": "USD/year"
    }
  ],
  "metadata": {
    "discount_rate_percent": 7.0,
    "project_lifetime_years": 20,
    "capital_recovery_factor": 0.0944
  }
}
```

**Fields**:
- `value`: Final calculated value (float)
- `unit`: Unit of measurement (string)
- `formula`: Human-readable calculation formula (string)
- `components`: Array of component values that contributed to the result
- `metadata`: Additional context (assumptions, parameters, related metrics)

**Available Traceable KPIs**:
- `total_capital_investment_traceable`: TCI with scaling formula
- `total_opex_traceable`: OPEX with cost breakdown
- `LCOP_traceable`: Levelized Cost of Production with full breakdown

---

#### User Inputs Structure

Full user inputs structure for calculations:

```json
{
  "process_technology": "HEFA",
  "feedstock": "UCO",
  "country": "USA",
  "conversion_plant": {
    "plant_capacity": {
      "value": 500,
      "unit_id": 3
    },
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
  "feedstock_data": [ ... ],
  "utility_data": [ ... ],
  "product_data": [ ... ]
}
```

---

## Error Handling

### Error Response Format

All errors return a JSON response with:

```json
{
  "detail": "Error message describing what went wrong"
}
```

### HTTP Status Codes

| Status Code | Meaning | Common Causes |
|-------------|---------|---------------|
| **200 OK** | Success | Request completed successfully |
| **201 Created** | Resource created | POST request created new resource |
| **204 No Content** | Success, no body | DELETE request successful |
| **400 Bad Request** | Invalid input | Malformed JSON, validation failure, calculation error |
| **401 Unauthorized** | Authentication failed | Missing/invalid token, wrong credentials |
| **403 Forbidden** | Access denied | Insufficient access level |
| **404 Not Found** | Resource not found | Invalid ID, resource deleted, access denied |
| **500 Internal Server Error** | Server error | Unexpected server-side failure |

### Common Error Scenarios

#### Invalid Authentication
```json
{
  "detail": "Invalid email or password"
}
```

#### Missing Token
```json
{
  "detail": "Not authenticated"
}
```

#### Resource Not Found
```json
{
  "detail": "Project not found or access denied"
}
```

#### Calculation Error
```json
{
  "detail": "Calculation failed: Product mass fractions must sum to 100%"
}
```

---

## Rate Limiting

**Status**: Not implemented

**Recommended for Production**:
- Implement rate limiting middleware (e.g., slowapi)
- Suggested limits:
  - Authentication: 5 requests/minute
  - Calculations: 10 requests/minute
  - General API: 100 requests/minute

---

## Interactive Documentation

FastAPI provides auto-generated interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

These interfaces allow you to:
- View all endpoints and schemas
- Test endpoints directly in the browser
- See request/response examples
- Download OpenAPI spec

---

## Validation Examples

### Correct Electricity Price

```json
{
  "name": "electricity",
  "price": {
    "value": 55.0,
    "unit_id": 10
  }
}
```

**Note**: `unit_id: 10` represents USD/MWh. The value 55.0 USD/MWh = 0.055 USD/kWh.

### Product Mass Fractions

```json
"product_data": [
  {
    "name": "JET",
    "yield_percent": 64.0
  },
  {
    "name": "DIESEL",
    "yield_percent": 15.0
  },
  {
    "name": "Naphtha",
    "yield_percent": 21.0
  }
]
```

**Validation**: 64 + 15 + 21 = 100 ✓

---

## CORS Configuration

**Current Configuration**: Wide open (development)

```python
allow_origins=["*"]
allow_credentials=True
allow_methods=["*"]
allow_headers=["*"]
```

**Production Recommendation**:
```python
allow_origins=["https://your-frontend-domain.com"]
allow_credentials=True
allow_methods=["GET", "POST", "PUT", "DELETE"]
allow_headers=["Authorization", "Content-Type"]
```

---

## Logging and Monitoring

### Request Logging

All requests are automatically logged with:
- HTTP method and URL
- Response status code
- Request duration

Example log output:
```
2025-12-01 10:15:23 - INFO - Incoming request: POST /api/v1/scenarios/123/calculate
2025-12-01 10:15:25 - INFO - Completed POST /api/v1/scenarios/123/calculate in 2.34s with status 200
```

### Error Logging

All errors are logged with full stack traces for debugging.

---

## Known Issues and Limitations

1. **Auto-calculation on Create**: Projects and scenarios are auto-calculated on creation. If calculation fails, the resource is still created but without results.

2. **NaN/Infinity Handling**: Float values that are NaN or Infinity are automatically sanitized to 0.0 to prevent JSON serialization errors.

3. **Password Length**: Passwords are truncated to 72 characters (bcrypt limitation).

4. **No Pagination**: List endpoints (GET /projects, GET /scenarios) do not support pagination. May cause performance issues with large datasets.

5. **CORS Wide Open**: Current CORS configuration allows all origins (development only).

---

## Migration Notes (Local DB → AWS RDS)

When migrating from local PostgreSQL to AWS RDS:

1. Update database connection string (environment variable)
2. Verify schema compatibility
3. Migrate existing data (if any)
4. Update connection pooling settings for production
5. Enable SSL connections for RDS

**Configuration Location**: `backend/app/core/database.py`

---

## Testing

### Test Credentials

**Development Users** (from database seeding):
- See database seeding file for test user credentials
- Default access levels: CORE, ADVANCE, ROADSHOW

### Validated Test Case

**HEFA with UCO feedstock** is fully validated:
- Expected vs. Calculated variance: 0.00%
- Reference: `backend/HEFA_TEST_COMPARISON.md`
- Input guide: `backend/CORRECT_INPUT_GUIDE.md`

---

## Support and Contact

For API support or bug reports:
- **Backend Developer**: [Your Name] - [Your Email]
- **Repository**: [GitHub URL]
- **Documentation**: [Additional docs location]

---

**Last Updated**: December 23, 2025
**Document Version**: 1.1
**API Version**: 2.0.0

---

## Change Log

For a complete history of API changes and version updates, see [API_CHANGELOG.md](API_CHANGELOG.md).

**Recent Changes** (December 23, 2025):

**v2.1.0** (Latest):
- Added draft saving endpoint: `PATCH /api/v1/scenarios/{id}/draft`
- Added scenario `status` field ("draft" or "calculated")
- Implemented automatic unit normalization to base units
- Added calculation transparency with TraceableValue objects for TCI, OPEX, LCOP
- Enhanced calculation results with formulas, components, and metadata
- Updated `/api/v1/units` endpoint to include `conversion_factor` for each unit

**v2.0.0**:
- Added user registration endpoint: `POST /api/v1/auth/register`
- Added `occupation` field to user schema ("student" or "researcher")
- Enhanced user authentication responses to include occupation

# SAFAPAC Backend

FastAPI‑based backend for the SAFAPAC platform, providing RESTful APIs for techno‑economic analysis (TEA) of sustainable aviation fuel (SAF) pathways, financial modeling, and project/scenario management.

This backend is designed so that a JSON‑file “mock database” can later be replaced by a real relational database (SQLite/PostgreSQL) without breaking the API used by the frontend.

---

## Architecture Overview

Top‑level layout (under `backend/`):

- `app/`
  - `main.py` – FastAPI app, routing, middleware, authentication, and project/scenario endpoints.
  - `economics.py` – core TEA engine (`BiofuelEconomics`).
  - `financial_analysis.py` – cash‑flow table + NPV/IRR/payback metrics (`FinancialAnalysis`).
  - `models.py` – Pydantic models, especially `UserInputs` used by `/calculate`.
  - `database.py` – process & feedstock database (`BiofuelDatabase`), serves `/processes` and `/feedstocks`.
  - `feature_calculations.py` – additional calculation helpers.
  - `mock_database.py` – JSON‑file‑backed “database” (`MockDatabase`) for users/projects/scenarios.
  - `project_models.py` – Pydantic schemas for project/scenario APIs.
  - `__init__.py` – package init.
- `data/`
  - `users.json` – user accounts for mock DB.
  - `projects.json` – project metadata.
  - `scenarios.json` – scenario records (inputs + outputs per scenario).
  - `scenarios.json.backup` – backup of `scenarios.json`.
- Root files
  - `access.json` – mapping of input/output features to CORE/ADVANCE/ROADSHOW tiers.
  - `requirements.txt` – backend dependencies.
  - `pytest.ini`, `tests/` – test configuration and suite.
  - `pw.csv` – credential source for login (/auth/login).

---

## Core Modules

### `app/main.py`

- Creates the FastAPI application and configures CORS.
- Adds simple request logging middleware.
- Wires up the main services:
  - `BiofuelDatabase` for process & feedstock metadata.
  - `BiofuelEconomics` and `FinancialAnalysis` for TEA.
  - `MockDatabase` (from `mock_database.py`) as the persistence layer.
- Exposes endpoints:
  - Authentication:
    - `POST /auth/login`
  - TEA metadata:
    - `GET /processes`
    - `GET /feedstocks/{process}`
    - `GET /feedstock/{feedstock_name}`
  - TEA calculation:
    - `POST /calculate`
  - Projects:
    - `POST /projects/create`
    - `GET /projects/list-by-user`
    - `GET /projects/{project_id}`
  - Scenarios:
    - `POST /scenarios/create`
    - `GET /scenarios/list`
    - `GET /scenarios/{scenario_id}`
    - `PUT /scenarios/{scenario_id}`
    - `DELETE /scenarios/{scenario_id}`

### `app/economics.py`

- Implements `BiofuelEconomics`, the core techno‑economic model.
- Given structured inputs (plant, feedstocks, utilities, products, economics), computes:
  - Total capital investment (TCI).
  - OPEX components (feedstock, utilities, indirect OPEX).
  - Production volumes, SAF production.
  - Levelized costs (LCOP, LCCA).
  - Carbon intensity metrics and CO₂ emissions.

### `app/financial_analysis.py`

- Provides `FinancialAnalysis` to build a cash‑flow table and financial KPIs:
  - Cash‑flow table over plant lifetime (CAPEX year, operating years).
  - Net present value (NPV).
  - Internal rate of return (IRR).
  - Payback period.
- Used by `/calculate` to augment techno‑economics with financial outputs.

### `app/models.py`

- Defines Pydantic models for request/response validation.
- `UserInputs` is the key model:
  - `from_dict()` – builds structured inputs from the JSON payload.
  - `to_flat_dict()` – flattens structured inputs for simpler parameter access (e.g., discount rate, lifetime).

### `app/database.py`

- `BiofuelDatabase` loads and manages process & feedstock data (typically from CSV).
- Used by:
  - `GET /processes` – list process technologies.
  - `GET /feedstocks/{process}` – feedstocks for a process.
  - `GET /feedstock/{feedstock_name}` – detailed feedstock data (yields, energy content, etc.).

### `app/mock_database.py`

- `MockDatabase` is a simple JSON‑file backed persistence layer:
  - `users.json` – users keyed by username.
  - `projects.json` – projects keyed by `project_id`.
  - `scenarios.json` – scenarios keyed by `scenario_id`.
- Provides methods:
  - Users: `get_user_by_username`, `get_user_by_id`.
  - Projects: `create_project`, `get_project`, `list_projects_by_user`, `update_project`, `delete_project`.
  - Scenarios: `create_scenario`, `get_scenario`, `list_scenarios_by_project`, `count_scenarios_by_project`, `update_scenario`, `delete_scenario`.
- `main.py` imports the global `db` instance from here and uses it in all project/scenario endpoints.
- This is the main abstraction point to swap JSON persistence for a real SQL database.

### `app/project_models.py`

- Pydantic models that define the shape of project/scenario API payloads:
  - `ProjectCreate`, `ProjectResponse`, `ProjectListItem`, `ProjectCreateResponse`.
  - `ScenarioCreate`, `ScenarioResponse`, `ScenarioDetailResponse`, `ScenarioUpdate`.
- These models define the public API contract consumed by the frontend.

### `backend/access.json`

- Describes which input/output features belong to CORE, ADVANCE, and ROADSHOW tiers.
- The frontend has a parallel configuration (`frontend/src/config/access.json`), and the `AccessContext` uses that to show/hide features.

---

## Development “Database” (JSON Files)

All persistent state is stored as JSON in `backend/data/`:

- `users.json`
  - Map: `username → { user_id, username, email, name, role, created_at, ... }`.
  - Used by authentication and project ownership logic.
- `projects.json`
  - Map: `project_id → { project_id, user_id, project_name, scenario_count, created_at, updated_at }`.
- `scenarios.json`
  - Map: `scenario_id → { scenario_id, project_id, scenario_name, order, inputs, outputs, created_at, updated_at }`.
  - `inputs` mirrors the TEA input object from the frontend (plant, feedstocks, utilities, products, economics).
  - `outputs` contains TEA results (technoEconomics, financials, and cash‑flow table).
- `scenarios.json.backup`
  - Backup copy of `scenarios.json`, for recovery.

`MockDatabase` reads and writes these files on every operation. There is no in‑memory cache beyond the lifetime of a single method call, which keeps behavior simple and transparent for development.

---

## Authentication & `pw.csv`

Authentication uses `backend/pw.csv` as the source of valid credentials.

- `load_valid_credentials()` in `app/main.py`:
  - Reads `pw.csv` (tab‑delimited) with headers like `Suggested Password`, `Email Address`, `Staff Name`.
  - Builds a dict keyed by the “Suggested Password” (treated as the login password and logical username).
  - For each row it constructs:
    - A stable `user_id` (hash of email, or row index fallback).
    - `username` (same as password), `email`, `name`, `role`.
- `POST /auth/login`:
  - Request: `{ "username": "...", "password": "..." }`.
  - Looks up `password` in the credentials dict; if found, authenticates.
  - Ensures a matching user exists in `users.json` (creating one if necessary).
  - Returns JSON: `{ success: true|false, user?, message }`.

The frontend currently calls this endpoint directly and stores the returned `user` object in its auth context.

---

## API Surface & Data Flow

### TEA Metadata & Calculation

- `GET /processes`
  - Returns a list of available process technologies.
- `GET /feedstocks/{process}`
  - Returns feedstock names for the selected process.
- `GET /feedstock/{feedstock_name}`
  - Returns detailed feedstock information (yield, energy content, carbon intensity, etc.).
- `POST /calculate`
  - Request body (`CalculationRequest`):
    - `inputs`: structured TEA inputs (plant, feedstocks, utilities, products, economics).
    - `process_technology`: string.
    - `feedstock`: string.
    - `product_key`: string (e.g. `"jet"`).
  - Behavior:
    - Validates and converts `inputs` into `UserInputs`.
    - Runs `BiofuelEconomics` to compute techno‑economics.
    - Runs `FinancialAnalysis` to compute NPV/IRR/payback and cash‑flow table.
  - Response:

    ```json
    {
      "technoEconomics": { ... },
      "financials": {
        "npv": ...,
        "irr": ...,
        "paybackPeriod": ...,
        "cashFlowTable": [ ... ]
      },
      "resolvedInputs": {
        "structured": { ... },
        "flattened": { ... }
      }
    }
    ```

### Projects & Scenarios

These endpoints are used by the frontend’s `ProjectContext` and `projectApi.js`:

- `POST /projects/create`
  - Body: `{ "user_id": "...", "project_name": "..." }`.
  - Creates a project + auto‑creates “Scenario 1”.
  - Returns `ProjectCreateResponse` with project info and the first scenario.
- `GET /projects/list-by-user?user_id=...`
  - Returns all projects owned by a user, sorted by `updated_at` descending.
- `GET /projects/{project_id}`
  - Returns a single project record.

- `POST /scenarios/create`
  - Body: `{ "project_id": "...", "scenario_name": "...", "order"?: int }`.
  - Ensures project exists and that there are fewer than 3 scenarios.
  - Creates a new scenario; updates `scenario_count` on the project.
- `GET /scenarios/list?project_id=...`
  - Lists all scenarios for a project, sorted by `order`.
- `GET /scenarios/{scenario_id}`
  - Returns the full scenario including `inputs` and `outputs`.
- `PUT /scenarios/{scenario_id}`
  - Body: `{ "scenario_name"?: str, "inputs"?: dict, "outputs"?: dict }`.
  - Merges updates into the existing `inputs`/`outputs` and updates timestamps.
- `DELETE /scenarios/{scenario_id}`
  - Deletes a scenario (except when it’s the only scenario in a project).

The frontend:

- Auto‑saves TEA inputs into `scenario.inputs` via `PUT /scenarios/{id}`.
- Saves TEA outputs (`apiData`, `cashFlowTable`) into `scenario.outputs` after `/calculate` completes.

---

## Replacing JSON with a Real Database

The design of `MockDatabase` is intentionally simple so you can swap it out with a real database without changing the API used by the frontend.

Recommended steps:

1. **Keep the HTTP contract stable**
   - Do not change endpoint paths, methods, or response shapes for:
     - `/auth/login`
     - `/processes`, `/feedstocks/*`, `/feedstock/*`
     - `/calculate`
     - `/projects/*`, `/scenarios/*`
2. **Implement a DB‑backed service with the same interface as `MockDatabase`**
   - Create a new class, e.g. `SqlDatabase`, with methods:
     - Users: `get_user_by_username`, `get_user_by_id`.
     - Projects: `create_project`, `get_project`, `list_projects_by_user`, `update_project`, `delete_project`.
     - Scenarios: `create_scenario`, `get_scenario`, `list_scenarios_by_project`, `count_scenarios_by_project`, `update_scenario`, `delete_scenario`.
   - Internally use an ORM (SQLAlchemy, etc.) or raw SQL against SQLite/PostgreSQL.
3. **Swap the global database instance in `main.py`**
   - Replace `from app.mock_database import db as mock_db` with your new implementation.
4. **Migrate JSON data to the DB**
   - Use `users.json`, `projects.json`, and `scenarios.json` as the schema reference.
   - Migrate existing entries into tables:
     - `users`, `projects`, `scenarios` (with JSON or structured columns for `inputs` and `outputs`).

As long as your DB implementation preserves the `MockDatabase` method behavior and the API contract, the frontend will continue to work without modification.

---

## Running the Backend

From `backend/`:

```bash
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

cd app
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`. Interactive docs:

- Swagger UI: `http://127.0.0.1:8000/docs`
- ReDoc: `http://127.0.0.1:8000/redoc`

---

## Running Tests

From `backend/`:

```bash
pytest tests/ -v
```

---

## Dependencies

See `requirements.txt` for the full list. Key libraries include:

- **FastAPI** – web framework.
- **Uvicorn** – ASGI server.
- **Pydantic** – data validation.
- **Pandas**, **NumPy** – data processing and numerical calculations.

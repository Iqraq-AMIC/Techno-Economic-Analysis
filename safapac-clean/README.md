# SAFAPAC – Sustainable Aviation Fuel Analysis Platform and Cost Calculator

SAFAPAC is a full‑stack techno‑economic analysis (TEA) platform for evaluating sustainable aviation fuel (SAF) production pathways. It provides detailed cost analysis, financial modeling, and feasibility assessment for various biofuel production technologies.

The system consists of:

- A FastAPI backend that exposes calculation and project/scenario APIs.
- A React frontend with a TEA dashboard and project/scenario management.
- A JSON‑file‑backed mock database for development (designed to be replaced by a real DB).

---

## Features

- **Multiple process technologies** – support for various SAF pathways.
- **Feedstock analysis** – yield and energy content driven.
- **Techno‑economic analysis** – CAPEX/OPEX breakdown and LCOP.
- **Financial modeling** – NPV, IRR, payback period, and cash‑flow tables.
- **Interactive dashboard** – TEA dashboard with inputs, breakeven chart, and KPI cards.
- **Projects & scenarios** – per‑user projects, each with up to 3 scenarios, persisted in JSON files.

---

## Project Structure

```text
safapac-clean/
  backend/                     # FastAPI backend application
    app/
      __init__.py
      main.py                  # API endpoints (auth, TEA, projects, scenarios)
      economics.py             # Techno‑economic calculations (BiofuelEconomics)
      financial_analysis.py    # Financial metrics and cash‑flow modeling
      models.py                # Data models and validation (UserInputs, etc.)
      database.py              # Process & feedstock database (BiofuelDatabase)
      feature_calculations.py  # Detailed calculation layers
      mock_database.py         # JSON‑backed mock database (users, projects, scenarios)
      project_models.py        # Project/scenario API schemas
    data/
      users.json               # Dev “database” for users
      projects.json            # Dev “database” for projects
      scenarios.json           # Dev “database” for scenarios
      scenarios.json.backup    # Backup of scenarios.json
    tests/                     # Backend test suite
    requirements.txt           # Python dependencies

  frontend/                    # React frontend application
    public/                    # Static assets
    src/
      App.js                   # Root component + providers + router
      routes.js                # Route configuration (/login, /TEA, etc.)
      layouts/
        Default.js             # Global layout (navbar + theme toggle + footer)
      views/
        Login.js               # Authentication page
        AnalysisDashboard.js   # TEA dashboard (inputs + chart + KPIs)
      forms/
        BiofuelForm.js         # Main TEA input form
        CashFlowTable.js       # Cash‑flow table view
      components/
        charts/BreakevenBarChart.js
        layout/MainFooter.js
        project/ProjectStartupModal.js
        project/ScenarioTabs.js
      contexts/
        AuthContext.js         # Auth state and login/logout
        ProjectContext.js      # Project & scenario state
        AccessContext.js       # CORE / ADVANCE / ROADSHOW access level
        ThemeContext.js        # Light/dark theme
      api/projectApi.js        # Project & scenario HTTP helpers
      config/access.json       # Frontend access level configuration
    package.json               # Node dependencies

  docs/                        # Additional documentation
  00_system_inventory.md       # System inventory / architecture map
  QUICKSTART.md                # Short setup guide
  QUICK_START_GUIDE.md         # Detailed project/scenario usage guide
  run_backend.py               # Convenience backend startup script
```

---

## Installation

### Backend Setup

From `safapac-clean/`:

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
# or: source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt
```

Start the backend server:

```bash
cd app
uvicorn main:app --reload
```

The API will be available at `http://127.0.0.1:8000`.

### Frontend Setup

In a separate terminal:

```bash
cd safapac-clean/frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`.

---

## API Overview

Base URL (development): `http://127.0.0.1:8000`

### Authentication

- `POST /auth/login`
  - Validates credentials against `backend/pw.csv` (usually using the “Suggested Password” value).
  - On success, ensures the user exists in `backend/data/users.json` (via `MockDatabase`) and returns:
    - `{ "success": true, "user": { ... }, "message": "Login successful" }`
  - On failure returns `{ "success": false, "message": "Invalid credentials" }`.

### TEA Metadata & Calculation

- `GET /processes`
  - List all process technologies.
- `GET /feedstocks/{process}`
  - List feedstocks for a given process.
- `GET /feedstock/{feedstock_name}`
  - Detailed feedstock information (yields, energy content, etc.).
- `POST /calculate`
  - Perform techno‑economic and financial analysis.
  - Request body (`CalculationRequest`):

    ```json
    {
      "inputs": {
        "plant": { /* capacity, load hours, CI default, density */ },
        "feedstocks": [ /* feedstock block(s) */ ],
        "utilities": [ /* hydrogen & electricity blocks */ ],
        "products": [ /* product blocks */ ],
        "economics": { /* discount rate, TCI, WC/TCI, indirect OPEX/TCI, lifetime */ }
      },
      "process_technology": "HEFA",
      "feedstock": "UCO",
      "product_key": "jet"
    }
    ```

  - Response:

    ```json
    {
      "technoEconomics": { /* LCOP, LCCA, TCI, OPEX, production, CI, etc. */ },
      "financials": {
        "npv": 0.0,
        "irr": 0.0,
        "paybackPeriod": 0.0,
        "cashFlowTable": [ /* yearly rows */ ]
      },
      "resolvedInputs": {
        "structured": { /* normalized inputs */ },
        "flattened": { /* flattened key/value view */ }
      }
    }
    ```

### Projects & Scenarios

These endpoints are consumed by the frontend `ProjectContext` and `projectApi.js`.

- `POST /projects/create`
  - Body: `{ "user_id": "<user_id>", "project_name": "<name>" }`.
  - Creates a project and auto‑creates “Scenario 1”.
- `GET /projects/list-by-user?user_id=<user_id>`
  - Lists all projects for a user.
- `GET /projects/{project_id}`
  - Returns a single project.

- `POST /scenarios/create`
  - Body: `{ "project_id": "...", "scenario_name": "Scenario 2", "order"?: 2 }`.
  - Adds a scenario to a project (maximum 3 per project).
- `GET /scenarios/list?project_id=<project_id>`
  - Lists all scenarios for a project.
- `GET /scenarios/{scenario_id}`
  - Returns a scenario including `inputs` and `outputs`.
- `PUT /scenarios/{scenario_id}`
  - Body: `{ "scenario_name"?: str, "inputs"?: object, "outputs"?: object }`.
  - Merges the updates into the scenario.
- `DELETE /scenarios/{scenario_id}`
  - Deletes a scenario (cannot delete the last scenario in a project).

As long as you keep these endpoint paths and JSON shapes stable, you can safely swap the JSON files for a real database implementation behind `MockDatabase`.

---

## Technology Stack

### Backend

- **FastAPI** – web framework.
- **Pydantic** – data validation and settings.
- **Pandas / NumPy** – data processing and numerical calculations.
- **Uvicorn** – ASGI server.

### Frontend

- **React** – UI library.
- **Shards React / Bootstrap** – UI components and layout.
- **Chart.js** – visualization (breakeven chart).
- **React Router** – routing `/login`, `/TEA`, etc.

---

## Testing

### Backend Tests

From `safapac-clean/backend`:

```bash
pytest tests/ -v
```

### Frontend

The project is configured for `npm test` (Jest/React Testing Library) but has minimal tests at the moment:

```bash
cd safapac-clean/frontend
npm test
```

---

## Development Notes

- The frontend uses:
  - `AuthContext` to handle login (`/auth/login`) and keep `currentUser` in local storage.
  - `ProjectContext` to manage projects, scenarios, and TEA inputs/outputs.
  - `AnalysisDashboard` as the main TEA view (replaces older “BlogPosts” style pages).
- The backend:
  - Keeps TEA engine logic in `economics.py` and `financial_analysis.py`.
  - Uses `MockDatabase` (`mock_database.py`) to store users, projects, and scenarios in JSON files under `backend/data/`.
  - Is ready to be migrated to a proper database by replacing `MockDatabase` with your own implementation, without changing API contracts.

For a detailed system inventory (files, flows, constants), see `00_system_inventory.md`.


# SAFAPAC Project Structure

This document provides an overview of the project organization and key files.

---

## Directory Structure

```text
safapac-clean/
  backend/                           # Backend API application
    app/                             # Main application package
      __init__.py                    # Package initialization
      main.py                        # FastAPI app and endpoints (auth, TEA, projects, scenarios)
      economics.py                   # Biofuel economics calculations
      financial_analysis.py          # Financial metrics (NPV, IRR, payback)
      models.py                      # Data models and validation (UserInputs, etc.)
      database.py                    # Process technology & feedstock database
      feature_calculations.py        # Advanced calculation layers
      mock_database.py               # JSON-backed mock database (users, projects, scenarios)
      project_models.py              # Project/scenario API schemas
    data/
      users.json                     # Dev "database" for users
      projects.json                  # Dev "database" for projects
      scenarios.json                 # Dev "database" for scenarios
      scenarios.json.backup          # Backup of scenarios.json
    tests/                           # Test suite
      __init__.py
      test_biofuel_economics.py
      test_main_api.py
      test_user_inputs.py
    .gitignore                       # Backend-specific gitignore
    pytest.ini                       # Pytest configuration
    requirements.txt                 # Python dependencies
    README.md                        # Backend documentation

  frontend/                          # React frontend application
    public/                          # Static files
      index.html
      manifest.json
    src/                             # Source code
      components/                    # Reusable UI components
        charts/                      # Chart components (e.g., BreakevenBarChart)
        layout/                      # Layout components (footer, legacy navbar/sidebar)
        common/                      # Common components (PageTitle, SmallStats, etc.)
        project/                     # Project/scenario related components
      contexts/                      # React contexts
        ThemeContext.js
        AuthContext.js
        ProjectContext.js
        AccessContext.js
      forms/                         # Form components
        BiofuelForm.js              # Main TEA input form
        CashFlowTable.js            # Results table
      layouts/                       # Page layouts
        Default.js                  # Global layout (navbar + content + footer)
      views/                         # Page views
        AnalysisDashboard.js        # Main TEA dashboard
        Login.js                    # Login page
        Tables.js                   # Example tables view
      api/
        projectApi.js               # Project & scenario HTTP helpers
      utils/                        # Utility functions
      flux/                         # Legacy state management helpers
      App.js                        # Root component
      routes.js                     # Route configuration
      index.js                      # Entry point
    .env.development                # Development environment
    .env.production                 # Production environment
    .gitignore                      # Frontend-specific gitignore
    package.json                    # Node dependencies
    README.md                       # Frontend documentation

  docs/                             # Additional documentation
  .editorconfig                     # Editor configuration
  .gitignore                        # Root gitignore
  CONTRIBUTING.md                   # Contribution guidelines
  LICENSE                           # MIT License
  QUICKSTART.md                     # Quick start guide
  README.md                         # Main project documentation
  run_backend.py                    # Backend startup script
```

---

## Key Files

### Backend Core Files

- **app/main.py**  
  API server with endpoints for:
  - authentication (`/auth/login`)
  - TEA metadata (`/processes`, `/feedstocks/{process}`, `/feedstock/{feedstock_name}`)
  - TEA calculation (`/calculate`)
  - project & scenario management (`/projects/*`, `/scenarios/*`).

- **app/economics.py**  
  Core techno‑economic analysis logic (`BiofuelEconomics`).

- **app/financial_analysis.py**  
  Financial metrics and cash‑flow modeling (`FinancialAnalysis`).

- **app/models.py**  
  Pydantic models for TEA input validation (`UserInputs`, etc.).

- **app/database.py**  
  Process technology and feedstock database (`BiofuelDatabase`).

- **app/feature_calculations.py**  
  Layered calculation functions used by `BiofuelEconomics`.

- **app/mock_database.py**  
  JSON‑based persistence service (`MockDatabase`) for users, projects, and scenarios. This is the main abstraction point to replace JSON files with a real database later.

- **app/project_models.py**  
  Pydantic schemas for project and scenario requests/responses.

### Frontend Core Files

- **src/views/Login.js**  
  Login page. Uses `AuthContext` to call `/auth/login` and, on success, shows the project startup flow then redirects to `/TEA`.

- **src/views/AnalysisDashboard.js**  
  Primary TEA dashboard view:
  - Left: `BiofuelForm` inputs.
  - Center: `BreakevenBarChart` with access to `CashFlowTable`.
  - Right: KPI cards (process and economic outputs).
  - Integrates with `ProjectContext` to load/save scenario inputs and outputs.

- **src/forms/BiofuelForm.js**  
  Main user input form, using dropdowns/sliders for:
  - plant capacity, load hours, densities
  - feedstock and utility prices/yields/CI
  - product slate configuration
  - economic parameters (discount rate, TCI, OPEX ratios).

- **src/forms/CashFlowTable.js**  
  Renders the cash‑flow table returned by `/calculate`, with options to export data.

- **src/components/charts/BreakevenBarChart.js**  
  Chart.js‑based breakeven chart (cumulative discounted cash flow vs year), supporting single‑scenario and comparison modes.

- **src/layouts/Default.js**  
  Global layout used for TEA routes (navbar with title/theme toggle/project switch, main content region, footer).

- **src/api/projectApi.js**  
  Axios utilities to call project/scenario endpoints:
  - `/projects/create`, `/projects/list-by-user`, `/projects/{id}`
  - `/scenarios/create`, `/scenarios/list`, `/scenarios/{id}` (GET/PUT/DELETE).

- **src/contexts/AuthContext.js**  
  Manages authentication state and user info, calling `/auth/login`.

- **src/contexts/ProjectContext.js**  
  Manages current project, scenarios, and comparison scenarios. Persists selection to `localStorage` and uses `projectApi.js` to talk to the backend.

- **src/contexts/AccessContext.js**  
  Provides access‑level (CORE/ADVANCE/ROADSHOW) logic based on `src/config/access.json`.

---

## API Endpoints (Summary)

The backend exposes the following REST API endpoints (see `backend/README.md` and FastAPI docs for details):

- `POST /auth/login` – authenticate user using `pw.csv`.
- `GET /processes` – list process technologies.
- `GET /feedstocks/{process}` – list feedstocks for a process.
- `GET /feedstock/{feedstock_name}` – get feedstock details.
- `POST /calculate` – perform techno‑economic analysis and financial modeling.
- `POST /projects/create` – create project and auto‑create Scenario 1.
- `GET /projects/list-by-user` – list projects for a user.
- `GET /projects/{project_id}` – get project details.
- `POST /scenarios/create` – create scenario in a project (max 3 per project).
- `GET /scenarios/list` – list scenarios for a project.
- `GET /scenarios/{scenario_id}` – get scenario with inputs/outputs.
- `PUT /scenarios/{scenario_id}` – update scenario.
- `DELETE /scenarios/{scenario_id}` – delete scenario.

---

## Testing

Backend tests live in `backend/tests/`:

- `test_biofuel_economics.py` – economic calculation tests.
- `test_main_api.py` – API endpoint tests.
- `test_user_inputs.py` – input model validation tests.

Run with:

```bash
cd backend
pytest tests/ -v
```

---

## Development Workflow

1. Backend runs on port `8000`.
2. Frontend runs on port `3000`.
3. Frontend uses `REACT_APP_API_URL` (defaults to `http://127.0.0.1:8000`) to talk to the backend.
4. Both support hot‑reload for development.


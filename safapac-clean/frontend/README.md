# SAFAPAC Frontend

React‑based frontend for the SAFAPAC platform, providing login, project/scenario management and an interactive Techno‑Economic Analysis (TEA) dashboard for sustainable aviation fuel (SAF).

The frontend is built around React contexts for authentication, access levels, and project/scenario state, and talks to the FastAPI backend over HTTP.

---

## Architecture Overview

Main pieces (under `frontend/src/`):

- `App.js`
  - Root application component.
  - Wraps the app in providers: `ThemeProvider`, `AuthProvider`, `ProjectProvider`, `AccessProvider`.
  - Configures routing via `BrowserRouter` and `routes.js`.
- `routes.js`
  - Route declarations:
    - `/login` → `views/Login` (public).
    - `/TEA` → `views/AnalysisDashboard` (private, behind auth).
    - `/tables` → `views/Tables` (example route, private).
  - Uses `DefaultLayout` for private routes.
- `layouts/Default.js`
  - App‑wide layout:
    - Navbar with title, theme toggle, and “Switch or Create Project” button.
    - Main content area that flexes between header and footer.
    - Footer pinned at the bottom (using `min-vh-100` + `flex-grow`).
- `views/Login.js`
  - Full‑screen login page (forced light mode).
  - Calls `AuthContext.login` to authenticate via backend `/auth/login`.
  - On success, shows a short loading transition and redirects to `/TEA`.
- `views/AnalysisDashboard.js`
  - Main TEA dashboard:
    - Left: `BiofuelForm` (inputs) in a collapsible/scrollable column.
    - Center: `BreakevenBarChart` (cumulative discounted cash flow) with a button to open `CashFlowTable`.
    - Right: KPI cards grouped by “Process Outputs” and “Economic Outputs”, with maximize/minimize behavior and LCOP breakdown.
    - `ProjectStartupModal` forces the user to choose or create a project after login.
  - Manages TEA input state (`inputs`) and calls `/calculate` on the backend.
  - Auto‑saves `inputs` and `outputs` to the currently selected scenario using `ProjectContext`.

### Forms and Charts

- `forms/BiofuelForm.js`
  - Main input form for TEA:
    - Plant capacity, uptime, densities.
    - Feedstock price, yield, carbon intensity, energy content.
    - Utilities (hydrogen and electricity prices/yields/CI).
    - Product definitions (name, price, energy content, yield, mass fraction).
    - Economic parameters (discount rate, TCI, WC/TCI, indirect OPEX/TCI).
  - Uses backend endpoints:
    - `GET /processes` to populate process technology choices.
    - `GET /feedstocks/{process}` for feedstock options.
    - `GET /feedstock/{feedstock_name}` for feedstock details where applicable.
  - Uses sliders and collapsible sections for a compact UI.

- `forms/CashFlowTable.js`
  - Displays the cash‑flow table returned by `/calculate`.
  - Opened via a button next to the breakeven chart.

- `components/charts/BreakevenBarChart.js`
  - Chart.js line/area chart of cumulative discounted cash flow vs year.
  - Supports single scenario and comparison mode (multiple scenario lines).
  - Uses `responsive: true` and `maintainAspectRatio: false` so it fills the card body height provided by `AnalysisDashboard`.

### Contexts and API Utilities

- `contexts/AuthContext.js`
  - Manages:
    - `isAuthenticated` flag.
    - `currentUser` information.
    - Login/logout flows.
  - Persists auth state and user info in `localStorage` using keys:
    - `safapac-authenticated`
    - `safapac-user`
  - `login(username, password)` sends `POST /auth/login` to the backend (currently at `http://localhost:8000/auth/login`) and stores the returned user if `success` is true.

- `contexts/ProjectContext.js`
  - Manages:
    - `currentProject` (selected project).
    - `currentScenario` (selected scenario within the project).
    - `scenarios` list for the project.
    - `comparisonScenarios` for chart comparison mode.
  - Persists `currentProject` and `currentScenario` to `localStorage`.
  - Provides methods that wrap `projectApi.js`:
    - `createProject(userId, projectName)` – calls `POST /projects/create`.
    - `loadProject(projectId, projectName)` – calls `GET /scenarios/list` then sets state.
    - `addScenario()` – calls `POST /scenarios/create` (max 3 per project).
    - `switchScenario(scenarioId)` – calls `GET /scenarios/{id}` and updates state.
    - `updateCurrentScenario(updates)` – calls `PUT /scenarios/{id}` to persist inputs/outputs.
    - `refreshScenarios()` – reloads scenario list from backend.

- `contexts/AccessContext.js`
  - Stores selected access level: `CORE`, `ADVANCE`, `ROADSHOW`.
  - Reads feature configuration from `config/access.json`.
  - Provides:
    - `hasAccess(category, feature)` – used to show/hide UI pieces based on tier.
    - `changeAccessLevel(level)` – updates current tier and persists it to `localStorage`.

- `contexts/ThemeContext.js`
  - Provides light/dark theme state and a `colors` object for consistent styling.
  - Sets CSS variables (via `custom.css`) so components can adapt automatically.

- `api/projectApi.js`
  - Axios wrapper around project/scenario endpoints using `API_BASE_URL`:
    - `const API_BASE_URL = process.env.REACT_APP_API_URL || "http://127.0.0.1:8000";`
  - Methods:
    - `createProject(userId, projectName)` → `POST /projects/create`.
    - `listProjectsByUser(userId)` → `GET /projects/list-by-user`.
    - `getProject(projectId)` → `GET /projects/{project_id}`.
    - `createScenario(projectId, scenarioName, order?)` → `POST /scenarios/create`.
    - `listScenarios(projectId)` → `GET /scenarios/list`.
    - `getScenario(scenarioId)` → `GET /scenarios/{scenario_id}`.
    - `updateScenario(scenarioId, updates)` → `PUT /scenarios/{scenario_id}`.
    - `deleteScenario(scenarioId)` → `DELETE /scenarios/{scenario_id}`.
  - Convenience wrappers:
    - `saveScenarioInputs(scenarioId, inputs)`.
    - `saveScenarioOutputs(scenarioId, outputs)`.

---

## Data Flow (Frontend ↔ Backend)

### Authentication

1. User opens `/login`.
2. Submits username/password; `Login` view calls `AuthContext.login`.
3. `login` sends `POST /auth/login` to the backend.
4. On success:
   - `AuthContext` sets `isAuthenticated = true` and stores `currentUser`.
   - User is redirected to `/TEA`.

### Project & Scenario Lifecycle

1. After login, `AnalysisDashboard` shows `ProjectStartupModal` if no `currentProject` is selected.
2. User either:
   - Creates a project → `ProjectContext.createProject` → `POST /projects/create` → auto‑creates “Scenario 1”.
   - Or selects an existing project → `ProjectContext.loadProject` → `GET /scenarios/list` and sets `currentScenario` to the first scenario.
3. `BiofuelForm` and the dashboard read/write TEA `inputs` from the currently selected scenario.
4. When the user edits inputs:
   - `AnalysisDashboard` updates its local `inputs` state.
   - A debounced effect calls `updateCurrentScenario({ inputs: ... })` → `PUT /scenarios/{scenario_id}`.
5. When the user clicks “Calculate”:
   - `AnalysisDashboard.calculateOutputs()` builds a structured TEA payload and sends it to `POST /calculate`.
   - On success, it:
     - Updates the breakeven chart and KPI cards with the returned data.
     - Optionally saves outputs back into the scenario via `updateCurrentScenario({ outputs: ... })`.
6. When the user changes scenarios via tabs:
   - `ProjectContext.switchScenario(scenarioId)` loads the new scenario via `GET /scenarios/{id}`.
   - `AnalysisDashboard` replaces `inputs` and `apiData` with the scenario’s stored state.

### TEA Calculation

- `BiofuelForm` and `AnalysisDashboard` together construct the TEA input object:
  - Plant parameters, feedstock/utility/product blocks, and economic parameters.
- `calculateOutputs()` sends this to the backend `/calculate` endpoint.
- Backend returns:
  - `technoEconomics` – TCI, OPEX, production, LCOP/LCCA, CO₂ metrics.
  - `financials` – cash‑flow table, NPV, IRR, payback period.
- `AnalysisDashboard`:
  - Builds breakeven chart data from `financials.cashFlowTable`.
  - Computes KPI cards and LCOP breakdown percentages from `technoEconomics`.
  - Renders them alongside the chart and Biofuel form.

---

## Project Structure

Relevant portions of the frontend tree:

```text
frontend/
  public/
    index.html
    images/
  src/
    App.js                 # Root component + providers + router
    routes.js              # Route configuration
    custom.css             # Theme + layout tweaks

    layouts/
      Default.js           # Navbar + content + footer

    views/
      Login.js             # Login page
      AnalysisDashboard.js # Main TEA page
      Tables.js            # Example tables view

    forms/
      BiofuelForm.js       # TEA inputs
      CashFlowTable.js     # Cash flow results

    components/
      charts/
        BreakevenBarChart.js
      layout/
        MainFooter.js
      project/
        ProjectStartupModal.js
        ScenarioTabs.js

    contexts/
      ThemeContext.js
      AuthContext.js
      ProjectContext.js
      AccessContext.js

    api/
      projectApi.js        # Project + scenario HTTP utilities

    config/
      access.json          # Frontend access tiers (CORE/ADVANCE/ROADSHOW)
```

---

## Configuration

Environment variables:

- `.env.development` – used when running `npm start`.
- `.env.production` – used when building for production.

Important variable:

- `REACT_APP_API_URL`
  - Base URL for the backend API (`projectApi`, `BiofuelForm`, `AnalysisDashboard`).
  - Defaults to `http://127.0.0.1:8000` if not set.

The `AuthContext` currently calls `http://localhost:8000/auth/login` directly; in production you may want to update it to use the same `REACT_APP_API_URL` for consistency.

---

## Available Scripts

From `frontend/`:

### `npm start`

Runs the app in development mode at `http://localhost:3000`. Hot‑reload is enabled.

### `npm test`

Runs the frontend test runner in watch mode (if tests are present).

### `npm run build`

Builds the app for production into the `build/` folder.

---

## Backend Integration

Before starting the frontend, ensure the backend is running at the configured API URL (default `http://127.0.0.1:8000`). The frontend relies on these backend endpoints:

- Auth:
  - `POST /auth/login`
- TEA metadata & calculation:
  - `GET /processes`
  - `GET /feedstocks/{process}`
  - `GET /feedstock/{feedstock_name}`
  - `POST /calculate`
- Projects & scenarios:
  - `POST /projects/create`
  - `GET /projects/list-by-user`
  - `GET /projects/{project_id}`
  - `POST /scenarios/create`
  - `GET /scenarios/list`
  - `GET /scenarios/{scenario_id}`
  - `PUT /scenarios/{scenario_id}`
  - `DELETE /scenarios/{scenario_id}`

As long as these endpoints and their JSON shapes remain stable, the frontend will work regardless of whether the backend uses JSON files or a real database.

---

## UI Framework and Styling

The app uses:

- **React** for component‑based UI.
- **Bootstrap 4** and **Shards React** for layout and UI components.
- **Chart.js** for data visualization (breakeven chart and potentially other charts).
- A custom `ThemeContext` + CSS variables in `custom.css` to support light/dark mode and consistent colors across components.


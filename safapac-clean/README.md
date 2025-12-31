# SAFAPAC – Sustainable Aviation Fuel Analysis Platform and Cost Calculator

SAFAPAC is a full‑stack techno‑economic analysis (TEA) platform for evaluating sustainable aviation fuel (SAF) production pathways. It provides detailed cost analysis, financial modeling, and feasibility assessment for various biofuel production technologies.

The system consists of:

- A **FastAPI backend** (async) with PostgreSQL database, JWT authentication, and high-performance APIs.
- A **React frontend** with TEA dashboard and project/scenario management.
- **Traceable calculations** with step-by-step formula breakdowns for all metrics.

---

## Prerequisites

| Software | Version | Download Link |
|----------|---------|---------------|
| Python | 3.10+ | https://www.python.org/downloads/ |
| Node.js | 18.0+ | https://nodejs.org/en/download/ |
| PostgreSQL | 17.x | https://www.postgresql.org/download/ |
| pgAdmin 4 | Latest | https://www.pgadmin.org/download/ (optional) |

---

## Features

- **Multiple process technologies** – support for various SAF pathways (HEFA, FT-BtL, ATJ, etc.).
- **Feedstock analysis** – yield and energy content driven.
- **Techno‑economic analysis** – CAPEX/OPEX breakdown and LCOP with traceable calculations.
- **Financial modeling** – NPV, IRR, payback period, and cash‑flow tables.
- **Interactive dashboard** – TEA dashboard with inputs, breakeven chart, and KPI cards.
- **Projects & scenarios** – per‑user projects, each with up to 3 scenarios.
- **High-performance backend** – async operations, connection pooling, caching, rate limiting.
- **Email verification** – new users must verify email before accessing the platform.
- **JWT authentication** – with automatic token refresh to prevent session timeouts.

---

## Project Structure

```text
safapac-clean/
  backend/                     # FastAPI backend application
    app/
      __init__.py
      main.py                  # FastAPI app entry point, middleware, startup
      api/
        endpoints/
          auth.py              # Authentication (login, register, email verification)
          master_data.py       # Process, feedstock, utility, country APIs
          projects_endpoints.py    # Project CRUD
          scenarios_endpoints.py   # Scenario CRUD + calculations
      core/
        config.py              # Environment configuration
        database.py            # SQLAlchemy engine (sync + async), connection pooling
        security.py            # JWT token handling, password hashing
        seeding.py             # Database seeding logic
        email.py               # Email verification functionality
        pw.csv                 # User credentials for seeding
      models/
        master_data.py         # ORM models: Process, Feedstock, Utility, etc.
        user_project.py        # ORM models: User, UserProject, Scenario
        traceable_value.py     # TraceableValue, CalculationStep models
      schemas/
        user_schema.py         # Auth request/response schemas
        project_schema.py      # Project schemas
        scenario_schema.py     # Scenario schemas
      services/
        economics.py           # BiofuelEconomics TEA engine
        financial_analysis.py  # NPV, IRR, payback calculations
        feature_calculations.py # Calculation layers
      traceable/               # Traceable calculation modules
        layer1.py              # Core parameters (consumption, CCE, energy)
        layer2.py              # OPEX cost calculations
        layer3.py              # Aggregation calculations
        layer4.py              # Final KPIs (LCOP, emissions)
        financial.py           # Financial metrics (NPV, IRR, payback)
      crud/
        biofuel_crud.py        # Database query utilities
        async_biofuel_crud.py  # Async database operations
    tests/                     # Backend test suite
      run_tests.py             # Main test runner
      check_setup.py           # Pre-flight verification
      scenarios/               # Test scenario definitions
      results/                 # Test results (timestamped JSON)
    requirements.txt           # Python dependencies

  frontend/                    # React frontend application
    public/                    # Static assets
    src/
      App.js                   # Root component + providers + router
      routes.js                # Route configuration (/login, /TEA, /verify-email, etc.)
      layouts/
        Default.js             # Global layout (navbar + theme toggle + footer)
      views/
        LoginForm.js           # Login page
        SignUp.js              # Registration page
        VerifyEmail.js         # Email verification page
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
        AuthContext.js         # Auth state, login/logout, token refresh
        ProjectContext.js      # Project & scenario state
        AccessContext.js       # CORE / ADVANCE / ROADSHOW access level
        ThemeContext.js        # Light/dark theme
      api/projectApi.js        # Project & scenario HTTP helpers
      config/access.json       # Frontend access level configuration
    package.json               # Node dependencies

  docs/                        # Documentation
    handoff/                   # Handoff changelogs
    PERFORMANCE_IMPLEMENTATION.md     # Performance optimization details
    Calculation_Process_Flowchart.md  # Traceable calculation formulas
    Traceable_Implementation_Plan.md  # Traceable implementation status
    email-verification.md             # Email verification documentation
```

---

## Installation

### 1. Create PostgreSQL Database

The backend requires a PostgreSQL database. Tables and seed data are created automatically on startup.

```sql
-- Using pgAdmin or psql, create a new database:
CREATE DATABASE safapac_db;

-- Create a dedicated user (optional but recommended):
CREATE USER safapac_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE safapac_db TO safapac_user;
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS/Linux

# Install dependencies
pip install -r requirements.txt
```

Create a `.env` file in `backend/` directory:

```env
# Database Configuration (REQUIRED)
DB_USER=safapac_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safapac_db

# JWT Configuration
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Email Verification (REQUIRED for registration)
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email@gmail.com
MAIL_FROM_NAME=SAFAPAC
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False

# Verification Settings
VERIFICATION_TOKEN_EXPIRE_HOURS=24
FRONTEND_URL=http://localhost:3000
```

Start the backend server:

```bash
cd backend
uvicorn app.main:app --reload
```

On startup, the backend will automatically:
1. Create all database tables (if they don't exist)
2. Seed master data (processes, feedstocks, utilities, countries, products)
3. Seed user accounts from `app/core/pw.csv`

The API will be available at `http://127.0.0.1:8000`

### 3. Frontend Setup

In a separate terminal:

```bash
cd frontend
npm install
npm start
```

The frontend will be available at `http://localhost:3000`

### 4. Verify Installation

- **Backend Health Check**: http://127.0.0.1:8000/health
- **API Documentation (Swagger)**: http://127.0.0.1:8000/docs
- **Frontend**: http://localhost:3000

---

## API Overview

Base URL: `http://127.0.0.1:8000/api/v1`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login, returns JWT token |
| POST | `/auth/register` | New user registration (requires email verification) |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/auth/verify-email` | Verify email with token |
| POST | `/auth/resend-verification` | Resend verification email |

### Master Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/master-data` | Get all master data in one call |
| GET | `/process-technologies` | List SAF process technologies |
| GET | `/feedstocks` | List feedstock types |
| GET | `/countries` | List supported countries |
| GET | `/utilities` | List utilities (hydrogen, electricity) |
| GET | `/products` | List output products |

### Projects (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create new project |
| GET | `/projects` | List user's projects |
| GET | `/projects/{project_id}` | Get project with scenarios |
| PUT | `/projects/{project_id}` | Update project |
| PATCH | `/projects/{project_id}` | Partial update (save draft inputs) |
| DELETE | `/projects/{project_id}` | Delete project |

### Scenarios (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{project_id}/scenarios` | Create scenario |
| GET | `/projects/{project_id}/scenarios` | List scenarios |
| GET | `/scenarios/{scenario_id}` | Get scenario details |
| PUT | `/scenarios/{scenario_id}` | Update scenario |
| DELETE | `/scenarios/{scenario_id}` | Delete scenario |
| POST | `/scenarios/{scenario_id}/calculate` | Run TEA calculation (async) |
| GET | `/scenarios/{scenario_id}/calculate/status` | Poll calculation status |

### Calculation Response

The calculation endpoint returns comprehensive results with traceable calculations:

```json
{
  "technoEconomics": {
    "LCOP": 1495.81,
    "totalCapitalInvestment": 400000000,
    "totalOpex": 710150000,
    "totalRevenue": 1177500000,
    "LCOP_traceable": {
      "name": "Levelized Cost of Production",
      "value": 1495.81,
      "unit": "USD/t",
      "formula": "LCOP = (TCI_annual + OPEX) / Production",
      "inputs": { ... },
      "calculation_steps": [ ... ]
    }
  },
  "financials": {
    "npv": 3224127521,
    "irr": 0.855,
    "paybackPeriod": 2,
    "npv_traceable": { ... },
    "irr_traceable": { ... },
    "payback_period_traceable": { ... }
  }
}
```

---

## Technology Stack

### Backend

- **FastAPI** – async web framework
- **SQLAlchemy** – ORM with async support
- **PostgreSQL** – database with asyncpg driver
- **Pydantic** – data validation
- **Pandas / NumPy** – numerical calculations
- **Uvicorn** – ASGI server
- **python-jose** – JWT authentication
- **bcrypt** – password hashing
- **slowapi** – rate limiting
- **aiosmtplib** – async email sending

### Frontend

- **React 16** – UI library
- **Shards React / Bootstrap** – UI components
- **Chart.js** – visualization (breakeven chart)
- **React Router** – routing

---

## Testing

### Backend Tests

The backend includes a comprehensive test suite for HEFA calculation verification.

```bash
# Verify setup
python backend/tests/check_setup.py

# List available test scenarios
python backend/tests/run_tests.py --list

# Run all tests
python backend/tests/run_tests.py

# Run specific scenario
python backend/tests/run_tests.py hefa_usa_500kta
```

Test results are saved to `backend/tests/results/` with timestamps.

For detailed testing documentation, see:
- `backend/tests/README.md` – Main guide
- `backend/tests/scenarios/README.md` – Creating test scenarios

### Frontend

```bash
cd frontend
npm test
```

---

## Performance

The backend is optimized for high concurrency:

| Metric | Value |
|--------|-------|
| Concurrent Users | 200+ |
| Avg Response Time | 20-50ms |
| DB Connection Pool | 30 connections |
| DB Driver | asyncpg (async) |

Key optimizations:
- **Async database operations** with asyncpg
- **Connection pooling** (20 permanent + 10 overflow)
- **Background tasks** for calculations
- **Master data caching** (1-hour TTL)
- **Rate limiting** on sensitive endpoints

See `docs/PERFORMANCE_IMPLEMENTATION.md` for full details.

---

## Documentation

| Document | Description |
|----------|-------------|
| [docs/PERFORMANCE_IMPLEMENTATION.md](docs/PERFORMANCE_IMPLEMENTATION.md) | Performance optimization details |
| [docs/Calculation_Process_Flowchart.md](docs/Calculation_Process_Flowchart.md) | Traceable calculation formulas |
| [docs/Traceable_Implementation_Plan.md](docs/Traceable_Implementation_Plan.md) | Traceable implementation status |
| [docs/email-verification.md](docs/email-verification.md) | Email verification setup |
| [docs/handoff/](docs/handoff/) | Development handoff changelogs |
| [backend/README.md](backend/README.md) | Backend-specific documentation |
| [backend/tests/README.md](backend/tests/README.md) | Testing documentation |


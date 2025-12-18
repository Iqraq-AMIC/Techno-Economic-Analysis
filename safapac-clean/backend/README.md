# SAFAPAC Backend

FastAPI-based backend for the SAFAPAC platform, providing RESTful APIs for techno-economic analysis (TEA) of sustainable aviation fuel (SAF) pathways, financial modeling, user authentication, and project/scenario management.

---

## Prerequisites

Before running the backend, ensure you have the following installed:

| Software | Version | Download Link |
|----------|---------|---------------|
| Python | 3.10+ | https://www.python.org/downloads/ |
| PostgreSQL | 17.x | https://www.postgresql.org/download/ |
| pgAdmin 4 | Latest | https://www.pgadmin.org/download/ (optional, for DB management) |

---

## Quick Start

### 1. Create PostgreSQL Database

The backend requires a PostgreSQL database to exist before running. **Tables and seed data are created automatically on startup.**

Using pgAdmin or psql, create a new database:

```sql
-- Connect to PostgreSQL as superuser (e.g., postgres)
CREATE DATABASE safapac_db;
```

Or via command line:

```bash
psql -U postgres -c "CREATE DATABASE safapac_db;"
```

### 2. Set Up Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database Configuration (REQUIRED)
DB_USER=postgres
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=safapac_db

# JWT Configuration (Optional - defaults provided)
SECRET_KEY=your-secret-key-change-in-production
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### 3. Create Virtual Environment & Install Dependencies

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Run the Backend

```bash
cd backend
uvicorn app.main:app --reload
```

On startup, the backend will automatically:
1. **Create all database tables** (if they don't exist)
2. **Seed master data** (processes, feedstocks, utilities, countries, products, etc.)
3. **Seed user accounts** from `app/core/pw.csv`

The API will be available at `http://127.0.0.1:8000`

### 5. Verify Installation

- **API Health Check**: http://127.0.0.1:8000/health
- **Swagger UI (API Docs)**: http://127.0.0.1:8000/docs
- **ReDoc**: http://127.0.0.1:8000/redoc

---

## Architecture Overview

```
backend/
├── app/
│   ├── main.py                 # FastAPI app entry point, middleware, startup events
│   ├── api/
│   │   └── endpoints/
│   │       ├── auth.py         # Authentication (login, register)
│   │       ├── master_data.py  # Process, feedstock, utility, country APIs
│   │       ├── projects_endpoints.py    # Project CRUD
│   │       └── scenarios_endpoints.py   # Scenario CRUD + calculations
│   ├── core/
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # SQLAlchemy engine, session, table creation
│   │   ├── base_model.py       # SQLAlchemy Base declarative
│   │   ├── security.py         # JWT token handling, password hashing
│   │   ├── seeding.py          # Database seeding logic
│   │   └── pw.csv              # User credentials for seeding
│   ├── models/
│   │   ├── master_data.py      # ORM models: Process, Feedstock, Utility, etc.
│   │   ├── user_project.py     # ORM models: User, UserProject, Scenario
│   │   ├── unit_mgmt.py        # ORM models: Units of measure
│   │   └── calculation_data.py # Calculation-related models
│   ├── schemas/
│   │   ├── base.py             # CamelCase base schema
│   │   ├── user_schema.py      # Auth request/response schemas
│   │   ├── project_schema.py   # Project schemas
│   │   ├── scenario_schema.py  # Scenario schemas
│   │   └── master_data_schema.py # Master data schemas
│   ├── services/
│   │   ├── economics.py        # BiofuelEconomics TEA engine
│   │   ├── financial_analysis.py # NPV, IRR, payback calculations
│   │   ├── data_bridge.py      # Data transformation utilities
│   │   └── feature_calculations.py # Additional calculation helpers
│   └── crud/
│       └── biofuel_crud.py     # Database query utilities
└── requirements.txt
```

---

## API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | User login with email/password, returns JWT token |
| POST | `/auth/register` | New user registration |

**Login Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Login Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "bearer",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "accessLevel": "CORE",
    "occupation": "researcher"
  }
}
```

**Register Request:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "occupation": "student"  // or "researcher"
}
```

### Master Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/master-data` | Get all master data in one call |
| GET | `/process-technologies` | List all SAF process technologies |
| GET | `/feedstocks` | List all feedstock types |
| GET | `/countries` | List supported countries |
| GET | `/utilities` | List utilities (hydrogen, electricity) |
| GET | `/products` | List output products (jet, diesel, etc.) |
| GET | `/units` | List units of measure |

### Projects (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create new project |
| GET | `/projects` | List user's projects |
| GET | `/projects/{project_id}` | Get project with scenarios |
| PUT | `/projects/{project_id}` | Update project |
| DELETE | `/projects/{project_id}` | Delete project |

### Scenarios (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects/{project_id}/scenarios` | Create scenario in project |
| GET | `/projects/{project_id}/scenarios` | List scenarios in project |
| GET | `/scenarios/{scenario_id}` | Get scenario details |
| PUT | `/scenarios/{scenario_id}` | Update scenario |
| DELETE | `/scenarios/{scenario_id}` | Delete scenario |
| POST | `/scenarios/{scenario_id}/calculate` | Run TEA calculation |

**Calculate Request:**
```json
{
  "processId": 1,
  "feedstockId": 1,
  "countryId": 1,
  "plantCapacityKtpa": 500,
  "annualLoadHours": 8000,
  "projectLifetimeYears": 25,
  "discountRatePercent": 10.0,
  // ... other inputs
}
```

**Calculate Response:**
```json
{
  "technoEconomics": {
    "totalCapitalInvestment": 400000000,
    "annualFeedstockCost": 50000000,
    "lcop": 1.25,
    // ...
  },
  "financials": {
    "npv": 150000000,
    "irr": 15.5,
    "paybackPeriod": 7.2,
    "cashFlowTable": [...]
  },
  "resolvedInputs": {...}
}
```

---

## Database Schema

### Master Data Tables
- `process_technologies` - SAF conversion processes (HEFA, FT-BtL, ATJ, etc.)
- `feedstock` - Input materials (UCO, biomass, etc.)
- `utility` - Utilities (hydrogen, electricity)
- `country` - Supported countries with price defaults
- `product` - Output products (jet fuel, diesel, etc.)

### Reference Data Tables
- `process_feedstock_ref` - Process-feedstock combinations
- `process_utility_consumption_ref` - Utility consumption rates
- `utility_country_price_defaults` - Country-specific utility prices
- `product_reference_breakdown` - Product yields and prices
- `default_parameter_set` - Default economic parameters per process/feedstock/country

### User & Project Tables
- `users` - User accounts (id, name, email, password_hash, access_level, occupation)
- `user_projects` - User projects
- `scenarios` - Project scenarios with inputs/outputs (JSONB)

### Unit Management Tables
- `unit_groups` - Unit categories (mass, volume, energy, etc.)
- `unit_of_measure` - Individual units
- `unit_conversions` - Conversion factors between units

---

## User Credentials (Seeded Data)

The backend seeds user accounts from `app/core/pw.csv`. Default seeded users:

| Email | Password | Access Level |
|-------|----------|--------------|
| admin@example.com | adminsaf1234 | ADVANCE |
| liew@amic.my | liewsaf1234 | ADVANCE |
| iqraq@amic.my | iqraqsaf1234 | ROADSHOW |

Access levels determine feature availability:
- **CORE** - Basic features
- **ADVANCE** - Full features
- **ROADSHOW** - Limited demo features

---

## JWT Authentication

The API uses JWT Bearer token authentication:

1. Login via `POST /api/v1/auth/login` to get `accessToken`
2. Include token in subsequent requests:
   ```
   Authorization: Bearer <accessToken>
   ```
3. Token expires after 60 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
4. On 401 Unauthorized, frontend should redirect to login

---

## Development Notes

### Adding New Users

Edit `app/core/pw.csv`:
```csv
Staff Name,Email Address,Suggested Password,Access Level,Occupation
New User,newuser@example.com,newpassword123,CORE,researcher
```

Then restart the backend - new users will be seeded automatically.

### Database Reset

To reset the database and reseed all data:

```sql
-- Drop all tables (WARNING: destroys all data)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
```

Then restart the backend.

### Running Tests

```bash
pytest tests/ -v
```

---

## Dependencies

Key libraries (see `requirements.txt` for full list):

- **FastAPI** - Web framework
- **Uvicorn** - ASGI server
- **SQLAlchemy** - ORM
- **psycopg2-binary** - PostgreSQL adapter
- **Pydantic** - Data validation
- **python-jose** - JWT handling
- **bcrypt** - Password hashing
- **Pandas/NumPy** - Data processing
- **numpy-financial** - NPV/IRR calculations

---

## Troubleshooting

### "Missing required environment variable"
Ensure `.env` file exists in `backend/` with all required variables.

### "Connection refused" to database
1. Verify PostgreSQL is running
2. Check `DB_HOST`, `DB_PORT` in `.env`
3. Ensure database exists: `psql -U postgres -c "\l"` should list `safapac_db`

### "Table already exists" errors
This is normal on restart - SQLAlchemy's `create_all` skips existing tables.

### Password/login issues
Passwords are hashed with bcrypt. Check `pw.csv` has correct plaintext passwords and restart to reseed.

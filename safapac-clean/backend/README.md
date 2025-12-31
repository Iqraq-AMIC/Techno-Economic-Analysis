# SAFAPAC Backend

High-performance FastAPI backend for the SAFAPAC platform, providing async RESTful APIs for techno-economic analysis (TEA) of sustainable aviation fuel (SAF) pathways, financial modeling, user authentication with email verification, and project/scenario management.

## Key Features

- **Async Operations** – Non-blocking I/O with asyncpg for 200+ concurrent users
- **Traceable Calculations** – Step-by-step formula breakdowns for all metrics
- **Connection Pooling** – 30 database connections (20 + 10 overflow)
- **Rate Limiting** – Protection against brute force and abuse
- **Email Verification** – New users must verify email before access
- **JWT with Refresh** – Automatic token refresh prevents session timeouts
- **Master Data Caching** – 1-hour TTL reduces database load by 80%

---

## Prerequisites

| Software | Version | Download Link |
|----------|---------|---------------|
| Python | 3.10+ | https://www.python.org/downloads/ |
| PostgreSQL | 17.x | https://www.postgresql.org/download/ |
| pgAdmin 4 | Latest | https://www.pgadmin.org/download/ (optional) |

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

> **Note**: For Gmail, you need to generate an App Password. Go to Google Account > Security > 2-Step Verification > App passwords.

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
│   ├── main.py                 # FastAPI app entry point, middleware, rate limiter
│   ├── api/
│   │   └── endpoints/
│   │       ├── auth.py         # Authentication (login, register, email verification)
│   │       ├── master_data.py  # Process, feedstock, utility, country APIs + caching
│   │       ├── projects_endpoints.py    # Project CRUD (async)
│   │       └── scenarios_endpoints.py   # Scenario CRUD + async calculations
│   ├── core/
│   │   ├── config.py           # Environment configuration
│   │   ├── database.py         # SQLAlchemy engine (sync + async), connection pooling
│   │   ├── base_model.py       # SQLAlchemy Base declarative
│   │   ├── security.py         # JWT token handling, password hashing
│   │   ├── seeding.py          # Database seeding logic
│   │   ├── email.py            # Email verification functionality
│   │   └── pw.csv              # User credentials for seeding
│   ├── models/
│   │   ├── master_data.py      # ORM models: Process, Feedstock, Utility, etc.
│   │   ├── user_project.py     # ORM models: User, UserProject, Scenario
│   │   ├── unit_mgmt.py        # ORM models: Units of measure
│   │   ├── calculation_data.py # Calculation-related models
│   │   └── traceable_value.py  # TraceableValue, CalculationStep models
│   ├── schemas/
│   │   ├── base.py             # CamelCase base schema
│   │   ├── user_schema.py      # Auth request/response schemas
│   │   ├── project_schema.py   # Project schemas
│   │   ├── scenario_schema.py  # Scenario schemas (+ CalculationStatusResponse)
│   │   └── master_data_schema.py # Master data schemas
│   ├── services/
│   │   ├── economics.py        # BiofuelEconomics TEA engine
│   │   ├── financial_analysis.py # NPV, IRR, payback calculations
│   │   ├── data_bridge.py      # Data transformation utilities
│   │   ├── feature_calculations.py # Calculation layers
│   │   └── unit_normalizer.py  # Dynamic unit conversion
│   ├── traceable/              # Traceable calculation modules
│   │   ├── models.py           # TraceableValue, ComponentValue, CalculationStep
│   │   ├── base.py             # Base traceable economics wrapper
│   │   ├── layer1.py           # Core parameters (consumption, CCE, energy)
│   │   ├── layer2.py           # OPEX cost calculations
│   │   ├── layer3.py           # Aggregation calculations
│   │   ├── layer4.py           # Final KPIs (LCOP, emissions)
│   │   ├── financial.py        # Financial metrics (NPV, IRR, payback)
│   │   └── integration.py      # Unified traceable interface
│   └── crud/
│       ├── biofuel_crud.py     # Database query utilities (sync)
│       └── async_biofuel_crud.py # Async database operations + caching
├── tests/                      # Test suite
│   ├── run_tests.py            # Main test runner
│   ├── check_setup.py          # Pre-flight verification
│   ├── scenarios/              # Test scenario definitions
│   └── results/                # Test results (timestamped JSON)
└── requirements.txt
```

---

## API Reference

Base URL: `http://127.0.0.1:8000/api/v1`

### Authentication

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| POST | `/auth/login` | 5/min | User login, returns JWT token |
| POST | `/auth/register` | 3/hour | New user registration (sends verification email) |
| POST | `/auth/refresh` | 10/min | Refresh access token |
| GET | `/auth/verify-email?token=...` | - | Verify email with token |
| POST | `/auth/resend-verification` | 3/hour | Resend verification email |

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
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "tokenType": "bearer",
  "user": {
    "id": "uuid",
    "name": "User Name",
    "email": "user@example.com",
    "accessLevel": "CORE",
    "occupation": "researcher",
    "isVerified": true
  }
}
```

**Register Request:**
```json
{
  "name": "New User",
  "email": "newuser@example.com",
  "password": "password123",
  "occupation": "student"
}
```

**Register Response:**
```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "user": { ... }
}
```

### Master Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/master-data` | Get all master data in one call (cached, 1hr TTL) |
| GET | `/master-data/fresh` | Bypass cache, get fresh data |
| GET | `/cache/status` | View cache status |
| POST | `/cache/invalidate` | Clear master data cache |
| GET | `/process-technologies` | List SAF process technologies |
| GET | `/feedstocks` | List feedstock types |
| GET | `/countries` | List supported countries |
| GET | `/utilities` | List utilities (hydrogen, electricity) |
| GET | `/products` | List output products |
| GET | `/units` | List units of measure |

### Projects (Requires Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/projects` | Create new project |
| GET | `/projects` | List user's projects |
| GET | `/projects/{project_id}` | Get project with scenarios |
| PUT | `/projects/{project_id}` | Update project (full) |
| PATCH | `/projects/{project_id}` | Partial update (save draft inputs) |
| DELETE | `/projects/{project_id}` | Delete project |

### Scenarios (Requires Authentication)

| Method | Endpoint | Rate Limit | Description |
|--------|----------|------------|-------------|
| POST | `/projects/{project_id}/scenarios` | - | Create scenario |
| GET | `/projects/{project_id}/scenarios` | - | List scenarios |
| GET | `/scenarios/{scenario_id}` | - | Get scenario details |
| PUT | `/scenarios/{scenario_id}` | - | Update scenario |
| DELETE | `/scenarios/{scenario_id}` | - | Delete scenario |
| POST | `/scenarios/{scenario_id}/calculate` | 10/min | Run async calculation (returns 202) |
| GET | `/scenarios/{scenario_id}/calculate/status` | - | Poll calculation status |
| POST | `/scenarios/{scenario_id}/calculate/sync` | 10/min | Run sync calculation (waits for result) |

**Async Calculation Flow:**
```
POST /scenarios/{id}/calculate → Returns 202 Accepted
                                  ↓
GET /scenarios/{id}/calculate/status → Poll until status = "calculated"
                                  ↓
                            Returns full results
```

**Calculation Status Values:**
- `draft` – No calculation started
- `calculating` – Calculation in progress
- `calculated` – Calculation complete
- `failed` – Calculation failed

**Calculate Response (with Traceable Outputs):**
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
      "inputs": {
        "tci": { "value": 400.0, "unit": "MUSD" },
        "total_opex": { "value": 710150000, "unit": "USD/year" },
        "production": { "value": 500000, "unit": "t/year" }
      },
      "calculation_steps": [
        {
          "step": 1,
          "description": "Calculate Capital Recovery Factor",
          "formula": "CRF = r(1+r)^n / ((1+r)^n - 1)",
          "calculation": "0.07(1.07)^20 / ((1.07)^20 - 1) = 0.09439",
          "result": { "value": 0.09439, "unit": "dimensionless" }
        }
      ]
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

The API uses JWT Bearer token authentication with automatic refresh:

1. Login via `POST /api/v1/auth/login` to get `accessToken` and `refreshToken`
2. Include token in subsequent requests:
   ```
   Authorization: Bearer <accessToken>
   ```
3. Access token expires after 30 minutes (configurable via `ACCESS_TOKEN_EXPIRE_MINUTES`)
4. Before expiration, call `POST /api/v1/auth/refresh` with refresh token to get new access token
5. On 401 Unauthorized, attempt token refresh first, then redirect to login if refresh fails

**Token Refresh Flow:**
```
Access Token expires soon → POST /auth/refresh { refreshToken: "..." }
                                      ↓
                            New accessToken returned
                                      ↓
                            Continue with new token
```

---

## Performance

The backend is optimized for high concurrency:

| Metric | Before | After |
|--------|--------|-------|
| Concurrent Users | 5-10 | **200+** |
| Avg Response Time | 100-200ms | **20-50ms** |
| DB Connection Pool | 5 | **30** |
| DB Driver | psycopg2 (sync) | **asyncpg (async)** |

**Key Optimizations:**
- **Async database operations** – Non-blocking I/O with asyncpg
- **Connection pooling** – 20 permanent + 10 overflow connections
- **Background tasks** – Calculations run in background (returns 202 immediately)
- **Master data caching** – 1-hour TTL reduces DB queries by 80%
- **Rate limiting** – Protects against brute force and resource exhaustion
- **Thread pool** – CPU-intensive calculations isolated from event loop

See `docs/PERFORMANCE_IMPLEMENTATION.md` for full details.

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
# Verify setup
python tests/check_setup.py

# Run all tests
python tests/run_tests.py

# Run specific scenario
python tests/run_tests.py hefa_usa_500kta

# List available scenarios
python tests/run_tests.py --list
```

Test results are saved to `tests/results/` with timestamps.

---

## Dependencies

Key libraries (see `requirements.txt` for full list):

- **FastAPI** – Async web framework
- **Uvicorn** – ASGI server
- **SQLAlchemy[asyncio]** – ORM with async support
- **asyncpg** – Async PostgreSQL driver (fastest)
- **psycopg2-binary** – Sync PostgreSQL adapter (for seeding)
- **Pydantic** – Data validation
- **python-jose** – JWT handling
- **bcrypt** – Password hashing
- **slowapi** – Rate limiting
- **aiosmtplib** – Async email sending
- **Pandas/NumPy** – Data processing
- **numpy-financial** – NPV/IRR calculations

---

## Troubleshooting

### "Missing required environment variable"
Ensure `.env` file exists in `backend/` with all required variables (including email settings).

### "Connection refused" to database
1. Verify PostgreSQL is running
2. Check `DB_HOST`, `DB_PORT` in `.env`
3. Ensure database exists: `psql -U postgres -c "\l"` should list `safapac_db`

### "Table already exists" errors
This is normal on restart - SQLAlchemy's `create_all` skips existing tables.

### Password/login issues
Passwords are hashed with bcrypt. Check `pw.csv` has correct plaintext passwords and restart to reseed.

### Email verification not working
1. Ensure all `MAIL_*` environment variables are set
2. For Gmail, use App Password (not regular password)
3. Check `FRONTEND_URL` matches your frontend URL
4. Verify SMTP server allows connections from your IP

### Rate limit exceeded (429 Too Many Requests)
Wait for the rate limit window to reset:
- Login: 5 attempts per minute
- Register: 3 registrations per hour
- Calculate: 10 calculations per minute

---

## Related Documentation

| Document | Description |
|----------|-------------|
| [../docs/PERFORMANCE_IMPLEMENTATION.md](../docs/PERFORMANCE_IMPLEMENTATION.md) | Performance optimization details |
| [../docs/Calculation_Process_Flowchart.md](../docs/Calculation_Process_Flowchart.md) | Traceable calculation formulas |
| [../docs/Traceable_Implementation_Plan.md](../docs/Traceable_Implementation_Plan.md) | Traceable implementation status |
| [../docs/email-verification.md](../docs/email-verification.md) | Email verification setup |
| [tests/README.md](tests/README.md) | Testing documentation |

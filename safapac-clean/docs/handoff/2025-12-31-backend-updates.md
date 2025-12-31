# Backend Updates Handoff - December 31, 2025

**Author**: Backend Developer
**Handoff To**: Frontend Developer
**Branch**: `setup-deployment`

---

## Summary

This handoff covers major backend improvements including performance optimization, traceable calculations, authentication enhancements, and email verification system.

---

## Changes Made

### 1. Unit Conversion (Dynamic Units)

**What Changed**: Values are now dynamic based on user-selected units in the frontend. Previously, the frontend was hardcoded to use default units only.

**Files Affected**:
- Backend API now returns values that respect unit preferences

**How to Test**:
1. Change unit selection in the frontend (e.g., from USD to EUR, or tons to kg)
2. Verify that displayed values update accordingly
3. Check that calculations remain accurate after unit conversion

---

### 2. Load Selected Project - User Saved Inputs

**What Changed**: When loading a selected project, the system now loads the inputs previously saved by the user via PATCH API.

**Files Affected**:
- Project loading endpoint now retrieves saved partial inputs

**How to Test**:
1. Create a new project
2. Enter some input values (partial, not complete)
3. Save the project
4. Close and reopen the project
5. Verify that the previously entered inputs are loaded correctly

**Frontend Task Required**:
- Create new UI component for saving partial inputs (using existing PATCH API)
- See [Next Tasks](#next-tasks-for-frontend) section below

---

### 3. Performance Improvements

**What Changed**: Major performance overhaul transforming the backend from synchronous to asynchronous operations.

**Key Improvements**:
| Metric | Before | After |
|--------|--------|-------|
| Concurrent Users | 5-10 | 200+ |
| Avg Response Time | 100-200ms | 20-50ms |
| DB Connection Pool | 5 (default) | 30 (20+10 overflow) |
| DB Driver | psycopg2 (sync) | asyncpg (async) |

**Implementation Details**:
- Async database operations with `asyncpg`
- Connection pooling (20 permanent + 10 overflow)
- Background tasks for calculations
- Master data caching (1-hour TTL)
- Rate limiting on sensitive endpoints

**Documentation**: See [docs/PERFORMANCE_IMPLEMENTATION.md](../PERFORMANCE_IMPLEMENTATION.md) for full details.

**How to Test**:
1. Start the backend server
2. Normal operations should feel faster
3. Multiple users can work simultaneously without slowdowns
4. Check that login/register has rate limiting (5 attempts/min for login, 3/hour for register)

---

### 4. Traceable Calculations

**What Changed**: All calculations now include full traceability with step-by-step breakdowns, formulas, inputs, and intermediate values.

**New Traceable Fields in API Response**:

**techno_economics section (21 fields)**:
- Original 7: `total_capital_investment_traceable`, `total_opex_traceable`, `LCOP_traceable`, `total_revenue_traceable`, `production_traceable`, `carbon_intensity_traceable`, `total_emissions_traceable`
- Layer 1 (5): `feedstock_consumption_traceable`, `hydrogen_consumption_traceable`, `electricity_consumption_traceable`, `carbon_conversion_efficiency_traceable`, `fuel_energy_content_traceable`
- Layer 2 (4): `indirect_opex_traceable`, `feedstock_cost_traceable`, `hydrogen_cost_traceable`, `electricity_cost_traceable`
- Layer 3 (2): `direct_opex_traceable`, `weighted_carbon_intensity_traceable`
- Layer 4 (3): `total_opex_enhanced_traceable`, `lcop_enhanced_traceable`, `total_emissions_enhanced_traceable`

**financials section (3 fields)**:
- `npv_traceable`, `irr_traceable`, `payback_period_traceable`

**Traceable Output Structure**:
```json
{
  "name": "Total Capital Investment",
  "value": 400.0,
  "unit": "MUSD",
  "formula": "TCI = TCI_ref × (Capacity / Capacity_ref)^0.6",
  "inputs": {
    "tci_ref": { "value": 400.0, "unit": "MUSD" },
    "capacity": { "value": 500000, "unit": "tons/year" }
  },
  "calculation_steps": [
    {
      "step": 1,
      "description": "Calculate capacity ratio",
      "formula": "ratio = capacity / capacity_ref",
      "calculation": "500000 / 500000 = 1.0",
      "result": { "value": 1.0, "unit": "dimensionless" }
    }
  ],
  "components": [...],
  "metadata": {...}
}
```

**Documentation**:
- [docs/Calculation_Process_Flowchart.md](../Calculation_Process_Flowchart.md) - Detailed calculation formulas
- [docs/Traceable_Implementation_Plan.md](../Traceable_Implementation_Plan.md) - Implementation status

**How to Test**:
1. Open Swagger UI: `http://localhost:8000/docs`
2. Test `POST /api/calculate/quick` endpoint
3. Verify response contains `*_traceable` fields
4. Check that `calculation_steps` show correct intermediate values

---

### 5. Refresh Token System

**What Changed**: Previously, users were automatically logged out after the access token expired (1 hour). Now the system automatically refreshes the token, preventing unexpected logouts.

**How It Works**:
- Access token expires after 1 hour
- Before expiration, the system automatically refreshes the token
- Users remain logged in as long as they're active

**How to Test**:
1. Log in to the application
2. Keep the session active for more than 1 hour
3. Verify that you are NOT automatically logged out
4. Check browser network tab to see token refresh requests

---

### 6. Email Verification System

**What Changed**: New users must now verify their email address after signing up before they can fully access the application.

**Files Created**:
- `backend/app/core/email.py` - Email sending functionality
- `docs/email-verification.md` - Email verification documentation
- `frontend/src/views/VerifyEmail.js` - Email verification page

**Files Modified**:
- `backend/app/api/endpoints/auth.py` - Added verification endpoints
- `backend/app/models/user_project.py` - Added email verification fields
- `backend/app/schemas/user_schema.py` - Added verification schemas
- `frontend/src/routes.js` - Added verification route
- `frontend/src/views/LoginForm.js` - Updated for verification flow
- `frontend/src/views/SignUp.js` - Updated for verification flow

**How to Test**:
1. Register a new account with a valid email
2. Check inbox for verification email
3. Click the verification link
4. Verify that you can now log in successfully
5. Try logging in without verification - should be blocked

---

## Next Tasks for Frontend

### Priority Task: Save Partial Input UI

**Objective**: Create UI component that allows users to save partial inputs (incomplete form data).

**Backend API Available**: `PATCH /api/projects/{project_id}`

**Requirements**:
1. Add a "Save Progress" or "Save Draft" button to input forms
2. Button should be accessible even when form is incomplete
3. Call PATCH API with only the filled fields
4. Show success/error feedback to user
5. Load saved partial inputs when user returns to project

**Suggested UI Flow**:
```
User enters partial data → Clicks "Save Draft" → PATCH API called → Success toast shown
                                                                    ↓
User returns later → Selects project → Saved inputs auto-populated
```

**API Request Example**:
```javascript
// PATCH /api/projects/{project_id}
{
  "feedstock_price": 930,
  "plant_capacity": 500
  // Only include fields that have values
}
```

---

## How to Run & Test

### Start Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Access Points
- API Documentation: `http://localhost:8000/docs`
- API Base URL: `http://localhost:8000/api`

### Test Checklist
- [ ] Unit conversion works with different unit selections
- [ ] Project loads previously saved inputs
- [ ] API response times are fast (<50ms for simple queries)
- [ ] Traceable fields present in calculation responses
- [ ] Token refresh works (no auto-logout after 1 hour)
- [ ] Email verification flow works for new signups
- [ ] Rate limiting works (try >5 login attempts in 1 minute)

---

## Dependencies Added

```
# backend/requirements.txt additions
SQLAlchemy[asyncio]
asyncpg
greenlet
slowapi
```

Run `pip install -r requirements.txt` to install new dependencies.

---

## Questions?

If you have any questions about these changes, please reach out before starting the frontend implementation.

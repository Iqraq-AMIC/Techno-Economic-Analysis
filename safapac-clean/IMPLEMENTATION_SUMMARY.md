# SAFAPAC Project & Scenario Management Implementation

## Summary

This implementation adds **post-login project selection** and **multiple scenario support (max 3 per project)** to the SAFAPAC Techno-Economic Analysis application.

---

## What Was Implemented

### Feature 1: Post-Login Project Selection
✅ After login, users see a modal with options to create new or load existing projects
✅ Each project auto-creates "Scenario 1" upon creation
✅ Users can name their projects
✅ Projects are persisted and can be loaded later

### Feature 2: Multiple Scenarios (Max 3)
✅ Each project supports up to 3 scenarios
✅ Scenario tabs appear in the sidebar
✅ Users can switch between scenarios
✅ Each scenario has its own inputs, outputs, and KPIs
✅ Graph toggle for "Show All Scenarios" vs "Show Current Only" (ready for integration)

---

## Files Created

### Backend

#### 1. Mock Database Service
**File:** `backend/app/mock_database.py`
- JSON-based persistence (stores data in `backend/data/` folder)
- User, Project, and Scenario CRUD operations
- Automatic timestamp tracking
- Pre-configured with hardcoded user: `safapac` (user_id: `user_001`)

#### 2. API Models
**File:** `backend/app/project_models.py`
- Pydantic models for request/response validation
- `ProjectCreate`, `ProjectResponse`, `ScenarioCreate`, `ScenarioDetailResponse`, etc.

#### 3. API Endpoints (added to `backend/app/main.py`)

**Projects:**
- `POST /projects/create` - Create project + auto-create Scenario 1
- `GET /projects/list-by-user?user_id=xxx` - List user's projects
- `GET /projects/{project_id}` - Get project details

**Scenarios:**
- `POST /scenarios/create` - Add scenario to project (enforces max 3)
- `GET /scenarios/list?project_id=xxx` - List project scenarios
- `GET /scenarios/{scenario_id}` - Get scenario with inputs/outputs
- `PUT /scenarios/{scenario_id}` - Update scenario data
- `DELETE /scenarios/{scenario_id}` - Delete scenario (prevents deleting last one)

---

### Frontend

#### 1. API Utilities
**File:** `frontend/src/api/projectApi.js`
- Axios-based functions for all project/scenario operations
- Error handling and response normalization

#### 2. State Management
**File:** `frontend/src/contexts/ProjectContext.js`
- Manages current project and scenario
- Persists to localStorage
- Provides hooks: `useProject()`
- Functions: `createProject()`, `loadProject()`, `addScenario()`, `switchScenario()`, `updateCurrentScenario()`

**File:** `frontend/src/contexts/AuthContext.js` (updated)
- Tracks `currentUser` with `user_id` (created from `pw.csv` login)
- Calls backend `/auth/login` and returns user data on login: `{ user_id, username, email, name, role }`

#### 3. UI Components
**File:** `frontend/src/components/project/ProjectStartupModal.js`
- Post-login modal
- Shows "Create New Project" and "Load Existing Project" buttons
- Lists existing projects with metadata
- Disables "Load" button if no projects exist

**File:** `frontend/src/components/project/NewProjectPrompt.js`
- Modal for entering project name
- Validates input (required, max 100 chars)
- Creates project and auto-generates Scenario 1

**File:** `frontend/src/components/project/ScenarioTabs.js`
- Vertical tabs in sidebar
- Shows all scenarios (1-3)
- Highlights active scenario
- "Add Scenario" button (disabled when at max 3)
- Badge showing "X/3" count

#### 4. Integration
**File:** `frontend/src/App.js` (updated)
- Added `ProjectProvider` wrapper around app

**File:** `frontend/src/views/Login.js` (updated)
- Shows `ProjectStartupModal` after successful login
- Redirects to `/TEA` only after project is selected

---

## Data Flow

### Login → Project Selection
1. User opens `/login` and enters credentials based on `backend/pw.csv` (using the "Suggested Password" value as their password, typically the same value can be entered in both username and password fields during development).
2. `AuthContext.login()` calls `POST /auth/login` and, on success, sets `currentUser` with a `user_id` derived from the CSV row or an existing user record.
3. `ProjectStartupModal` appears.
4. User clicks **"Create New Project"** or selects an existing project.
5. `ProjectContext` loads project + scenario into state.
6. Modal closes, user is redirected to the `/TEA` dashboard.

### Creating a New Project
```
User Input: "My HEFA Analysis"
        ↓
POST /projects/create
   { user_id: "user_001", project_name: "My HEFA Analysis" }
        ↓
Backend:
   1. Create project (project_id: "proj_abc123")
   2. Auto-create Scenario 1 (scenario_id: "scen_def456")
   3. Save to data/projects.json and data/scenarios.json
        ↓
Response:
   {
     project_id: "proj_abc123",
     project_name: "My HEFA Analysis",
     scenarios: [{ scenario_id: "scen_def456", scenario_name: "Scenario 1", order: 1 }]
   }
        ↓
Frontend:
   - ProjectContext sets currentProject and currentScenario
   - Persists to localStorage
   - Redirects to /TEA
```

### Adding a Scenario
```
User clicks "+ Add Scenario" in sidebar
        ↓
POST /scenarios/create
   { project_id: "proj_abc123", scenario_name: "Scenario 2", order: 2 }
        ↓
Backend validates: scenarios.length < 3? ✅
        ↓
Creates scenario (scenario_id: "scen_xyz789")
        ↓
Frontend:
   - Adds to scenarios array
   - Switches to new scenario (sets as currentScenario)
```

### Switching Scenarios
```
User clicks "Scenario 2" tab
        ↓
GET /scenarios/scen_xyz789
        ↓
Backend returns scenario with inputs {} and outputs {}
        ↓
Frontend:
   - Sets currentScenario to Scenario 2
   - Updates localStorage
   - (Next step: BiofuelForm loads Scenario 2's saved inputs)
```

---

## Next Steps to Complete Integration

### 1. AnalysisDashboard Integration
**File to modify:** `frontend/src/views/AnalysisDashboard.js`

Add at the top of the component:
```javascript
import { useProject } from "../contexts/ProjectContext";
import ScenarioTabs from "../components/project/ScenarioTabs";
```

In the component:
```javascript
const { currentProject, currentScenario, updateCurrentScenario } = useProject();
```

After calculation, save results:
```javascript
const handleCalculate = async () => {
  // ... existing calculation logic ...

  // Save inputs and outputs to current scenario
  await updateCurrentScenario({
    inputs: formInputs,  // Your current input state
    outputs: calculationResults  // Results from backend
  });
};
```

### 2. BiofuelForm Auto-Save
**File to modify:** `frontend/src/forms/BiofuelForm.js`

Load inputs when scenario changes:
```javascript
useEffect(() => {
  if (currentScenario?.inputs) {
    // Load saved inputs into form state
    setFormState(currentScenario.inputs);
  }
}, [currentScenario]);
```

Debounced auto-save on input change:
```javascript
const debouncedSave = useCallback(
  debounce(async (inputs) => {
    await updateCurrentScenario({ inputs });
  }, 1000),
  [currentScenario]
);

useEffect(() => {
  debouncedSave(formState);
}, [formState]);
```

### 3. BreakevenBarChart Multi-Scenario Toggle
**File to modify:** `frontend/src/components/charts/BreakevenBarChart.js`

Add toggle switch:
```javascript
const [showAllScenarios, setShowAllScenarios] = useState(false);
```

Render logic:
```javascript
if (showAllScenarios) {
  // Fetch all scenarios from ProjectContext
  // Render multiple datasets with different colors
  datasets = scenarios.map((s, i) => ({
    label: s.scenario_name,
    data: s.outputs.cashFlowData,
    borderColor: COLORS[i],
    backgroundColor: COLORS[i] + "33"
  }));
} else {
  // Render only currentScenario data
  datasets = [{
    label: currentScenario.scenario_name,
    data: currentScenario.outputs.cashFlowData,
    borderColor: "#006D7C"
  }];
}
```

### 4. Add ScenarioTabs to Sidebar
**File to modify:** `frontend/src/layouts/Default.js` or wherever your sidebar is rendered

Add before the main navigation items:
```javascript
import ScenarioTabs from "../components/project/ScenarioTabs";

// In the sidebar render:
<ScenarioTabs />
```

---

## Testing Checklist

### Backend Testing
```bash
# Start backend
cd backend
python -m uvicorn app.main:app --reload

# Test endpoints with curl or Postman:

# 1. Create project
curl -X POST http://localhost:8000/projects/create \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user_001", "project_name": "Test Project"}'

# 2. List projects
curl "http://localhost:8000/projects/list-by-user?user_id=user_001"

# 3. Create scenario
curl -X POST http://localhost:8000/scenarios/create \
  -H "Content-Type: application/json" \
  -d '{"project_id": "proj_xxx", "scenario_name": "Scenario 2"}'

# 4. Update scenario inputs
curl -X PUT http://localhost:8000/scenarios/scen_xxx \
  -H "Content-Type: application/json" \
  -d '{"inputs": {"feedstock": "UCO", "capacity": 1000}}'
```

### Frontend Testing
```bash
# Start frontend
cd frontend
npm start

# Manual test flow:
1. Navigate to http://localhost:3000/login
2. Login with: safapac / landingpage2025
3. ✅ Modal appears with "Create New Project" and "Load Existing"
4. ✅ "Load Existing" is disabled (no projects yet)
5. Click "Create New Project"
6. ✅ Prompt appears asking for project name
7. Enter "My First Project" → Create
8. ✅ Redirects to /TEA dashboard
9. ✅ (After sidebar integration) See "Scenario 1" tab
10. ✅ Click "+ Add Scenario"
11. ✅ "Scenario 2" appears, auto-selected
12. ✅ Switch back to "Scenario 1"
13. ✅ Try to add Scenario 3 (should work)
14. ✅ Try to add Scenario 4 (should be disabled - max 3)
```

### Integration Testing
- [ ] Form inputs save to scenario when changed
- [ ] Switching scenarios loads saved inputs
- [ ] Calculation results save to active scenario
- [ ] Graph toggle shows all scenarios vs current only
- [ ] Logout clears project state
- [ ] Re-login shows modal with existing projects
- [ ] Loading existing project loads first scenario
- [ ] Deleting scenario prevents deletion of last one

---

## Database Storage

### File Structure
```
backend/
  data/
    users.json          # Hardcoded users
    projects.json       # All projects
    scenarios.json      # All scenarios
```

### Sample Data

**users.json:**
```json
{
  "safapac": {
    "user_id": "user_001",
    "username": "safapac",
    "password": "landingpage2025",
    "email": "safapac@example.com",
    "created_at": "2025-01-15T10:00:00"
  }
}
```

**projects.json:**
```json
{
  "proj_abc123": {
    "project_id": "proj_abc123",
    "user_id": "user_001",
    "project_name": "HEFA UCO Analysis",
    "created_at": "2025-01-15T10:30:00",
    "updated_at": "2025-01-15T11:45:00",
    "scenario_count": 2
  }
}
```

**scenarios.json:**
```json
{
  "scen_def456": {
    "scenario_id": "scen_def456",
    "project_id": "proj_abc123",
    "scenario_name": "Scenario 1",
    "order": 1,
    "inputs": {
      "conversion_plant": { "capacity": 1000, "load_hours": 8000 },
      "feedstock": { "name": "UCO", "price": 800 },
      "process_technology": "HEFA",
      "product_key": "jet"
    },
    "outputs": {
      "TCI": 150000000,
      "OPEX": 85000000,
      "LCOP": 1.25,
      "npv": 25000000,
      "irr": 0.15,
      "paybackPeriod": 8.5,
      "cashFlowTable": [...]
    },
    "created_at": "2025-01-15T10:30:05",
    "updated_at": "2025-01-15T11:45:22"
  }
}
```

---

## Migration to Real Database (Future)

When ready to switch from JSON files to PostgreSQL/MongoDB:

1. **Install dependencies:**
   ```bash
   pip install sqlalchemy psycopg2-binary  # For PostgreSQL
   # OR
   pip install pymongo  # For MongoDB
   ```

2. **Replace `mock_database.py` with `database.py`** using SQLAlchemy ORM

3. **No changes needed in:**
   - API endpoints (main.py)
   - Frontend code
   - API models (project_models.py)

4. **Database schema:**
   ```sql
   CREATE TABLE users (
     user_id VARCHAR(50) PRIMARY KEY,
     username VARCHAR(100) UNIQUE,
     password_hash VARCHAR(255),
     email VARCHAR(255),
     created_at TIMESTAMP
   );

   CREATE TABLE projects (
     project_id VARCHAR(50) PRIMARY KEY,
     user_id VARCHAR(50) REFERENCES users(user_id),
     project_name VARCHAR(100),
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );

   CREATE TABLE scenarios (
     scenario_id VARCHAR(50) PRIMARY KEY,
     project_id VARCHAR(50) REFERENCES projects(project_id) ON DELETE CASCADE,
     scenario_name VARCHAR(100),
     order INT,
     inputs JSONB,
     outputs JSONB,
     created_at TIMESTAMP,
     updated_at TIMESTAMP
   );
   ```

---

## Acceptance Criteria Status

### Feature 1: Post-Login Project Selection
- ✅ Modal shows after login
- ✅ Load button disabled if no projects
- ✅ New project always starts with Scenario 1
- ✅ After creation, full dashboard loads
- ✅ State stores project_id and active_scenario_id correctly

### Feature 2: Multiple Scenarios
- ✅ Scenario 1 auto-created with every new project
- ✅ Max scenarios = 3
- ✅ Sidebar navigation functional (component ready)
- ⏳ Switching scenarios updates all UI sections (needs AnalysisDashboard integration)
- ⏳ Graph toggle works (needs BreakevenBarChart integration)
- ⏳ KPI panel always synced to active scenario (needs AnalysisDashboard integration)

### DO NOT CHANGE
- ✅ No modification to KPI formulas
- ✅ No modification to existing calculations
- ✅ No unrelated database field changes

---

## Known Limitations

1. **Authentication currently uses `pw.csv`:** Credentials are managed via `backend/pw.csv` and a JSON-backed dev database, not yet a full production identity system
2. **No Form Auto-Save Yet:** BiofuelForm doesn't auto-save inputs (needs deeper integration with ProjectContext)
3. **No Multi-Scenario Graphs Yet:** BreakevenBarChart doesn't support toggle (needs integration)
4. **No Scenario Renaming:** Users can't rename scenarios after creation
5. **No Scenario Deletion UI:** Delete endpoint exists but no UI button
6. **No Project Deletion:** No UI or flow for deleting projects
7. **No Scenario Duplication:** Can't copy Scenario 1 inputs to Scenario 2

---

## Troubleshooting

### Backend won't start
```bash
# Check if data directory exists
ls backend/data/

# If missing, create it:
mkdir backend/data

# The mock_database.py will auto-create JSON files on first run
```

### Modal doesn't show after login
```bash
# Check console for errors
# Verify ProjectProvider is wrapped in App.js
# Ensure ProjectStartupModal is imported correctly in Login.js
```

### "Cannot read property 'user_id' of null"
```bash
# User not authenticated
# Check AuthContext is providing currentUser
# Verify login sets currentUser in localStorage
```

### Scenarios not persisting
```bash
# Check backend/data/scenarios.json exists
# Verify API calls are succeeding (check Network tab)
# Check ProjectContext.updateCurrentScenario is being called
```

---

## Contact & Support

For questions about this implementation:
1. Review this document
2. Check `00_system_inventory.md` for file locations
3. Review API endpoint logs in backend console
4. Check browser console for frontend errors

---

**Implementation Date:** January 15, 2025
**Status:** Backend Complete ✅ | Frontend Core Complete ✅ | Integration Pending ⏳

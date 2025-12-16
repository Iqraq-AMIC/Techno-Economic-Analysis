# Quick Start Guide - Project & Scenario Management

## Running the Application

### 1. Start Backend (Terminal 1)

```bash
cd safapac-clean/backend
python -m uvicorn app.main:app --reload
```

**Expected output:**
```
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Started server process
INFO:     Waiting for application startup.
```

The backend will create a `data/` folder automatically with:
- `users.json` (pre-loaded with a default `safapac` user and any users created from `pw.csv` logins)
- `projects.json` (empty initially)
- `scenarios.json` (empty initially)

### 2. Start Frontend (Terminal 2)

```bash
cd safapac-clean/frontend
npm start
```

**Expected output:**
```
Compiled successfully!

You can now view the app in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.x.x:3000
```

---

## First-Time User Flow

### Step 1: Login
1. Navigate to `http://localhost:3000`
2. You'll be redirected to `/login`
3. Open `backend/pw.csv` and find your row (e.g., by email). Use the value in the **"Suggested Password"** column as your credential:
   - For development, you can enter that value in **both** the username and password fields (the backend looks up the password).
4. Click **"Sign In"**

### Step 2: Project Selection Modal
After successful login, a modal will appear with:

**Option 1: Create New Project**
- Click **"Create New Project"**
- Enter a project name (e.g., "HEFA UCO Analysis 2025")
- Click **"Create Project"**
- A project will be created with auto-generated "Scenario 1"

**Option 2: Load Existing Project** (disabled on first login)
- This button is grayed out because you have 0 projects
- After creating your first project, future logins will show your projects here

### Step 3: Dashboard
- You'll be redirected to `/TEA` (Analysis Dashboard)
- **Sidebar** will show (after integration):
  ```
  SCENARIOS (1/3)
  ✅ Scenario 1
  [+ Add Scenario]
  ```

### Step 4: Add More Scenarios
1. Click **"+ Add Scenario"** in sidebar
2. "Scenario 2" is created and auto-selected
3. Repeat to add "Scenario 3" (max 3)
4. Button becomes disabled after 3 scenarios

### Step 5: Switch Between Scenarios
1. Click any scenario tab in the sidebar
2. The active scenario is highlighted in teal (#006D7C)
3. Form inputs and outputs will load for that scenario (after integration)

---

## Testing the API Directly

### Using curl

**Create a project:**
```bash
curl -X POST http://localhost:8000/projects/create \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "project_name": "My Test Project"
  }'
```

**Response:**
```json
{
  "project_id": "proj_a1b2c3d4e5f6",
  "project_name": "My Test Project",
  "user_id": "user_001",
  "created_at": "2025-01-15T12:34:56",
  "scenarios": [
    {
      "scenario_id": "scen_g7h8i9j0k1l2",
      "project_id": "proj_a1b2c3d4e5f6",
      "scenario_name": "Scenario 1",
      "order": 1,
      "created_at": "2025-01-15T12:34:56",
      "updated_at": "2025-01-15T12:34:56"
    }
  ]
}
```

**List user's projects:**
```bash
curl "http://localhost:8000/projects/list-by-user?user_id=user_001"
```

**Add a scenario:**
```bash
curl -X POST http://localhost:8000/scenarios/create \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "proj_a1b2c3d4e5f6",
    "scenario_name": "Scenario 2"
  }'
```

**Update scenario inputs:**
```bash
curl -X PUT http://localhost:8000/scenarios/scen_g7h8i9j0k1l2 \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": {
      "feedstock": "UCO",
      "capacity": 1000,
      "process_technology": "HEFA"
    }
  }'
```

**Get scenario with data:**
```bash
curl http://localhost:8000/scenarios/scen_g7h8i9j0k1l2
```

---

## Using Postman

Import this collection:

```json
{
  "info": {
    "name": "SAFAPAC Project & Scenario API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Create Project",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"user_id\": \"user_001\",\n  \"project_name\": \"My HEFA Analysis\"\n}"
        },
        "url": "http://localhost:8000/projects/create"
      }
    },
    {
      "name": "List Projects",
      "request": {
        "method": "GET",
        "url": {
          "raw": "http://localhost:8000/projects/list-by-user?user_id=user_001",
          "query": [{"key": "user_id", "value": "user_001"}]
        }
      }
    },
    {
      "name": "Create Scenario",
      "request": {
        "method": "POST",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"project_id\": \"{{project_id}}\",\n  \"scenario_name\": \"Scenario 2\"\n}"
        },
        "url": "http://localhost:8000/scenarios/create"
      }
    },
    {
      "name": "Update Scenario",
      "request": {
        "method": "PUT",
        "header": [{"key": "Content-Type", "value": "application/json"}],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"inputs\": {\n    \"feedstock\": \"UCO\",\n    \"capacity\": 1000\n  }\n}"
        },
        "url": "http://localhost:8000/scenarios/{{scenario_id}}"
      }
    }
  ]
}
```

---

## Verifying Data Persistence

### Check JSON Files

**After creating a project:**
```bash
cat safapac-clean/backend/data/projects.json
```

**Example output:**
```json
{
  "proj_a1b2c3d4e5f6": {
    "project_id": "proj_a1b2c3d4e5f6",
    "user_id": "user_001",
    "project_name": "My Test Project",
    "created_at": "2025-01-15T12:34:56.123456",
    "updated_at": "2025-01-15T12:34:56.123456",
    "scenario_count": 1
  }
}
```

**Check scenarios:**
```bash
cat safapac-clean/backend/data/scenarios.json
```

**Check users:**
```bash
cat safapac-clean/backend/data/users.json
```

---

## Common Issues

### Issue: "Module not found: Can't resolve '../contexts/ProjectContext'"

**Solution:**
```bash
cd safapac-clean/frontend
npm install
npm start
```

### Issue: "Connection refused" when frontend calls backend

**Solution:**
1. Check backend is running on port 8000
2. Verify `.env.development` has `REACT_APP_API_URL=http://127.0.0.1:8000`
3. Check CORS is enabled in `backend/app/main.py` (already configured)

### Issue: Modal doesn't appear after login

**Solution:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify `ProjectProvider` is in `App.js`
4. Check `Login.js` imported `ProjectStartupModal` correctly

### Issue: "user_001 not found"

**Solution:**
The `users.json` file wasn't created. Delete `backend/data/` and restart backend:
```bash
rm -rf safapac-clean/backend/data
cd safapac-clean/backend
python -m uvicorn app.main:app --reload
```

---

## Next Steps After Testing

Once the basic flow works, integrate with existing components:

1. **Add ScenarioTabs to Sidebar**
   - File: `layouts/Default.js` (or your sidebar layout)
   - Import and render `<ScenarioTabs />`

2. **Auto-save BiofuelForm inputs**
   - File: `forms/BiofuelForm.js`
   - Use `useProject()` hook
   - Call `updateCurrentScenario({ inputs: formData })` on change

3. **Load saved inputs on scenario switch**
   - File: `forms/BiofuelForm.js`
   - `useEffect(() => { loadInputs(currentScenario.inputs) }, [currentScenario])`

4. **Save calculation results**
   - File: `views/AnalysisDashboard.js`
   - After `/calculate` call succeeds, save outputs:
   - `updateCurrentScenario({ outputs: results })`

5. **Multi-scenario graph toggle**
   - File: `components/charts/BreakevenBarChart.js`
   - Add toggle switch
   - Fetch all scenarios and render multiple datasets

---

## Demo Scenario

**Create a realistic project:**

1. Login using a valid credential from `pw.csv` (use the value in the “Suggested Password” column as your password)
2. Create project: "HEFA vs ATJ Comparison 2025"
3. Scenario 1 (auto-created):
   - Process: HEFA
   - Feedstock: UCO
   - Capacity: 1000 tonnes/year
4. Add Scenario 2:
   - Process: ATJ
   - Feedstock: Sugarcane
   - Capacity: 1000 tonnes/year
5. Add Scenario 3:
   - Process: HEFA
   - Feedstock: Tallow
   - Capacity: 1500 tonnes/year
6. Switch between scenarios to see different inputs/outputs
7. Use graph toggle to compare all 3 scenarios side-by-side

---

## API Documentation

Full endpoint reference available at:
```
http://localhost:8000/docs
```

This is auto-generated by FastAPI and provides:
- Interactive API testing
- Request/response schemas
- Example payloads
- Try-it-out functionality

---

**Ready to start?** Run both backend and frontend, then go to `http://localhost:3000` and log in!

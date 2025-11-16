from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.economics import BiofuelEconomics
from app.financial_analysis import FinancialAnalysis
from app.models import UserInputs
from app.database import BiofuelDatabase
from app.mock_database import db as mock_db
from app.project_models import (
    ProjectCreate, ProjectResponse, ProjectListItem, ProjectCreateResponse,
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate
)
from typing import List, Dict, Optional
import logging
import time
import math
import csv
import os
import hashlib
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,  # Must be False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request, call_next):
    import time
    start_time = time.time()

    print(f"Incoming request: {request.method} {request.url}")

    response = await call_next(request)

    duration = time.time() - start_time
    print(f"Completed {request.method} {request.url} in {duration:.2f}s with status {response.status_code}")

    return response


# Instantiate the database class
db = BiofuelDatabase()

def safe_float(value):
    if isinstance(value, float):
        if math.isnan(value) or math.isinf(value):
            return None
    return value


# ====================== AUTHENTICATION ======================

def load_valid_credentials():
    """Load valid credentials from pw.csv"""
    csv_path = Path(__file__).parent.parent / "pw.csv"
    credentials = {}

    try:
        with open(csv_path, 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file, delimiter='\t')
            row_number = 0
            for row in reader:
                row_number += 1
                password = row.get('Suggested Password', '').strip()
                email = row.get('Email Address', '').strip()
                name = row.get('Staff Name', '').strip()

                if password:
                    # Generate consistent user_id based on email hash or row number
                    email_hash = hashlib.md5(email.encode()).hexdigest()[:8] if email else f"{row_number:08d}"

                    credentials[password] = {
                        "user_id": f"user_{email_hash}",
                        "username": password,  # Using password as username as per requirements
                        "email": email,
                        "name": name,
                        "role": "user"  # Default role, can be extended
                    }
    except Exception as e:
        logger.error(f"Error loading credentials from pw.csv: {str(e)}")

    return credentials


class LoginRequest(BaseModel):
    username: str
    password: str


@app.post("/auth/login")
def login(request: LoginRequest):
    """
    Authenticate user against pw.csv credentials
    Using password field as both username and password identifier
    """
    try:
        valid_credentials = load_valid_credentials()

        # Check if password matches any valid credential
        if request.password in valid_credentials:
            user_data = valid_credentials[request.password]

            # Ensure user exists in mock_db for project creation
            existing_user = mock_db.get_user_by_id(user_data["user_id"])
            if not existing_user:
                # Create user in mock database
                users = mock_db._load_json(mock_db.users_file)
                users[user_data["username"]] = {
                    "user_id": user_data["user_id"],
                    "username": user_data["username"],
                    "email": user_data["email"],
                    "name": user_data["name"],
                    "role": user_data["role"],
                    "created_at": datetime.now().isoformat()
                }
                mock_db._save_json(mock_db.users_file, users)
                logger.info(f"Created user in database: {user_data['user_id']}")

            logger.info(f"✅ Login successful for user: {user_data['name']}")

            return {
                "success": True,
                "user": user_data,
                "message": "Login successful"
            }

        logger.warning(f"❌ Login failed for username: {request.username}")
        return {
            "success": False,
            "message": "Invalid credentials"
        }

    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        raise HTTPException(status_code=500, detail="Authentication error")


# ====================== ENDPOINTS ======================

@app.get("/processes", response_model=List[str])
def get_processes():
    logger.info("/processes called")
    return list(db.data["Process Technology"].unique())


@app.get("/feedstocks/{process}", response_model=List[str])
def get_feedstocks_by_process(process: str):
    logger.info(f"/feedstocks called for process={process}")
    df = db.filter_by_process(process)
    return df["Feedstock"].tolist()


@app.get("/feedstock/{feedstock_name}", response_model=Dict)
def get_feedstock_details(feedstock_name: str):
    logger.info(f"/feedstock called for feedstock={feedstock_name}")
    return db.get_yield_by_feedstock(feedstock_name)


class CalculationRequest(BaseModel):
    inputs: dict
    process_technology: str
    feedstock: str
    product_key: str = "jet"


@app.post("/calculate")
def calculate(request: CalculationRequest):
    try:
        logger.info(f"/calculate called with: {request.dict()}")

        structured_inputs = UserInputs.from_dict(request.inputs)
        flattened_inputs = structured_inputs.to_flat_dict()

        econ = BiofuelEconomics(structured_inputs)
        results = econ.run(
            process_technology=request.process_technology,
            feedstock=request.feedstock,
            product_key=request.product_key
        )

        # Map new keys to expected format
        tci = results["TCI"]
        revenue = results["Revenue"]
        manufacturing_cost = results["Total OPEX"]

        # Initialize Financial Analysis with fixed parameters
        discount_rate = flattened_inputs.get("discount_rate", 0.105)
        plant_lifetime = flattened_inputs.get("plant_lifetime", 25)
        fa = FinancialAnalysis(
            discount_rate=discount_rate,
            tax_rate=0.28,
            equity=0.4,
            bank_interest=0.04,
            loan_term=10
        )

        # Generate cash flow table
        cashflow_df = fa.cash_flow_table(
            tci=tci,
            revenue=revenue,
            manufacturing_cost=manufacturing_cost,
            plant_lifetime=plant_lifetime
        )

        financials = {
            "npv": safe_float(fa.npv(tci, revenue, manufacturing_cost, plant_lifetime)),
            "irr": safe_float(fa.irr(tci, revenue, manufacturing_cost, plant_lifetime)),
            "paybackPeriod": safe_float(fa.payback_period(tci, revenue, manufacturing_cost, plant_lifetime)),
            "cashFlowTable": cashflow_df.to_dict(orient="records")
        }

        response = {
            "technoEconomics": {k: safe_float(v) for k, v in results.items()},
            "financials": financials,
            "resolvedInputs": {
                "structured": request.inputs,
                "flattened": flattened_inputs,
            },
        }

        logger.info("Techno-Economics Results:")
        for k, v in response["technoEconomics"].items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("Financial Summary:")
        for k, v in {k: v for k, v in financials.items() if k != "cashFlowTable"}.items():
            logger.info(f"   {k:<20} : {v}")

        logger.info("Cashflow Table:")
        logger.info("\n" + cashflow_df.to_string(index=False))

        return response

    except Exception as e:
        logger.error(f"Error in /calculate: {str(e)}")
        return {"error": str(e)}


# ====================== PROJECT ENDPOINTS ======================

@app.post("/projects/create", response_model=ProjectCreateResponse)
def create_project(project_data: ProjectCreate):
    """
    Create a new project with auto-generated Scenario 1
    """
    try:
        logger.info(f"Creating project: {project_data.project_name} for user: {project_data.user_id}")

        # Verify user exists - if not, try to create from pw.csv (for legacy user IDs)
        user = mock_db.get_user_by_id(project_data.user_id)
        if not user:
            logger.warning(f"User {project_data.user_id} not found in database, attempting to create from pw.csv")

            # Load credentials and find matching user
            valid_credentials = load_valid_credentials()
            found_user = None
            for cred_data in valid_credentials.values():
                if cred_data["user_id"] == project_data.user_id:
                    found_user = cred_data
                    break

            if found_user:
                # Create user in mock database
                users = mock_db._load_json(mock_db.users_file)
                users[found_user["username"]] = {
                    "user_id": found_user["user_id"],
                    "username": found_user["username"],
                    "email": found_user["email"],
                    "name": found_user["name"],
                    "role": found_user["role"],
                    "created_at": datetime.now().isoformat()
                }
                mock_db._save_json(mock_db.users_file, users)
                logger.info(f"Created user in database from pw.csv: {found_user['user_id']}")
                user = found_user
            else:
                # User ID doesn't exist in pw.csv either - this is likely an old/invalid user ID
                raise HTTPException(
                    status_code=404,
                    detail=f"User not found: {project_data.user_id}. Please logout and login again to refresh your credentials."
                )

        # Create project
        project = mock_db.create_project(
            user_id=project_data.user_id,
            project_name=project_data.project_name
        )

        # Auto-create Scenario 1
        scenario = mock_db.create_scenario(
            project_id=project["project_id"],
            scenario_name="Scenario 1",
            order=1
        )

        logger.info(f"Created project {project['project_id']} with Scenario 1: {scenario['scenario_id']}")

        return ProjectCreateResponse(
            project_id=project["project_id"],
            project_name=project["project_name"],
            user_id=project["user_id"],
            created_at=project["created_at"],
            scenarios=[ScenarioResponse(**scenario)]
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/list-by-user", response_model=List[ProjectListItem])
def list_projects_by_user(user_id: str):
    """
    List all projects for a specific user
    """
    try:
        logger.info(f"Listing projects for user: {user_id}")

        projects = mock_db.list_projects_by_user(user_id)

        return [ProjectListItem(**p) for p in projects]

    except Exception as e:
        logger.error(f"Error listing projects: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/projects/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str):
    """
    Get project details by ID
    """
    try:
        logger.info(f"Getting project: {project_id}")

        project = mock_db.get_project(project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")

        return ProjectResponse(**project)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting project: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ====================== SCENARIO ENDPOINTS ======================

@app.post("/scenarios/create", response_model=ScenarioResponse)
def create_scenario(scenario_data: ScenarioCreate):
    """
    Create a new scenario in a project (max 3 scenarios per project)
    """
    try:
        logger.info(f"Creating scenario: {scenario_data.scenario_name} for project: {scenario_data.project_id}")

        # Check if project exists
        project = mock_db.get_project(scenario_data.project_id)
        if not project:
            raise HTTPException(status_code=404, detail=f"Project not found: {scenario_data.project_id}")

        # Check scenario count (max 3)
        current_count = mock_db.count_scenarios_by_project(scenario_data.project_id)
        if current_count >= 3:
            raise HTTPException(status_code=400, detail="Maximum 3 scenarios per project")

        # Auto-assign order if not provided
        order = scenario_data.order if scenario_data.order is not None else current_count + 1

        # Create scenario
        scenario = mock_db.create_scenario(
            project_id=scenario_data.project_id,
            scenario_name=scenario_data.scenario_name,
            order=order
        )

        logger.info(f"Created scenario {scenario['scenario_id']}")

        return ScenarioResponse(**scenario)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scenarios/list", response_model=List[ScenarioDetailResponse])
def list_scenarios(project_id: str):
    """
    List all scenarios for a project
    """
    try:
        logger.info(f"Listing scenarios for project: {project_id}")

        scenarios = mock_db.list_scenarios_by_project(project_id)

        return [ScenarioDetailResponse(**s) for s in scenarios]

    except Exception as e:
        logger.error(f"Error listing scenarios: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/scenarios/{scenario_id}", response_model=ScenarioDetailResponse)
def get_scenario(scenario_id: str):
    """
    Get scenario details by ID including inputs and outputs
    """
    try:
        logger.info(f"Getting scenario: {scenario_id}")

        scenario = mock_db.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")

        return ScenarioDetailResponse(**scenario)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.put("/scenarios/{scenario_id}", response_model=ScenarioDetailResponse)
def update_scenario(scenario_id: str, update_data: ScenarioUpdate):
    """
    Update scenario inputs, outputs, or name
    """
    try:
        logger.info(f"Updating scenario: {scenario_id}")

        # Check if scenario exists
        scenario = mock_db.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")

        # Prepare updates
        updates = {}
        if update_data.scenario_name is not None:
            updates["scenario_name"] = update_data.scenario_name
        if update_data.inputs is not None:
            updates["inputs"] = update_data.inputs
        if update_data.outputs is not None:
            updates["outputs"] = update_data.outputs

        # Update scenario
        updated_scenario = mock_db.update_scenario(scenario_id, updates)

        logger.info(f"Updated scenario {scenario_id}")

        return ScenarioDetailResponse(**updated_scenario)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/scenarios/{scenario_id}")
def delete_scenario(scenario_id: str):
    """
    Delete a scenario (cannot delete if it's the only scenario)
    """
    try:
        logger.info(f"Deleting scenario: {scenario_id}")

        # Get scenario to check project
        scenario = mock_db.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail=f"Scenario not found: {scenario_id}")

        # Check if it's the last scenario
        project_id = scenario["project_id"]
        current_count = mock_db.count_scenarios_by_project(project_id)
        if current_count <= 1:
            raise HTTPException(status_code=400, detail="Cannot delete the last scenario in a project")

        # Delete scenario
        success = mock_db.delete_scenario(scenario_id)

        if success:
            logger.info(f"Deleted scenario {scenario_id}")
            return {"message": "Scenario deleted successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to delete scenario")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting scenario: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    logger.info("Starting API server at http://127.0.0.1:8000 ...")
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

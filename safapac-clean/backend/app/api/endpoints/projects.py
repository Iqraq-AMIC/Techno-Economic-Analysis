# app/api/endpoints/projects.py

from datetime import timedelta
import logging
import math
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session
import bcrypt  # Add bcrypt for password hashing

# Core Database and CRUD
from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.core.security import (
    verify_password, 
    create_access_token, 
    get_current_active_user,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Service Layers
from app.services.economics import BiofuelEconomics

# Schemas
from app.schemas.biofuel_schema import (
    LoginRequest, ProjectCreate, ProjectResponse, ProjectWithScenariosResponse,
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate,
    UserInputsSchema, CalculationResponse, MasterDataResponse,
    LoginResponse, UserSchema
)

# Models
from app.models.biofuel_model import User, UserProject, Scenario

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Authentication Dependency ---
def get_current_user_id(current_user: User = Depends(get_current_active_user)) -> UUID:
    return current_user.id

def get_current_user_obj(current_user: User = Depends(get_current_active_user)) -> User:
    return current_user # Returns the User object

# --- Dependency Injection ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

# 1. Add this Helper Function at the top level
def sanitize_for_json(obj):
    """Recursively replace NaN and Infinity with None for valid JSON serialization."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0  # Or None, depending on frontend preference
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    return obj

def get_default_user_inputs(process_id: int, feedstock_id: int, country_id: int) -> Dict:
        """Generate default user inputs for a new scenario."""
        return {
            "conversion_plant": {
                "plant_capacity": {"value": 500, "unit_id": 3},  # 500 kta
                "annual_load_hours": 8000,
                "ci_process_default": 20.0
            },
            "economic_parameters": {
                "project_lifetime_years": 20,
                "discount_rate_percent": 7.0,
                "tci_ref_musd": 400,
                "reference_capacity_ktpa": 500, 
                "tci_scaling_exponent": 0.6,
                "working_capital_tci_ratio": 0.15,
                "indirect_opex_tci_ratio": 0.077
            },
            "feedstock_data": [
                {
                    "name": "UCO",
                    "price": {
                    "value": 930.0,
                    "unit_id": 7
                    },
                    "carbon_content": 0.77,
                    "carbon_intensity": {
                    "value": 20.0,
                    "unit_id": 11
                    },
                    "energy_content": 37.0,
                    "yield_percent": 121.0
                }

            ],
            "utility_data": [
                {
                    "name": "Hydrogen",
                    "price": {
                    "value": 5.4,
                    "unit_id": 6
                    },
                    "carbon_content": 0.0,
                    "carbon_intensity": {
                    "value": 0.0,
                    "unit_id": 11
                    },
                    "energy_content": 120.0,
                    "yield_percent": 4.2
                },
                {
                    "name": "electricity",
                    "price": {
                    "value": 55.0,
                    "unit_id": 10
                    },
                    "carbon_content": 0.0,
                    "carbon_intensity": {
                    "value": 20.0,
                    "unit_id": 13
                    },
                    "energy_content": 0.0,
                    "yield_percent": 12.0
                }
            ],
            "product_data": [
                {
                    "name": "JET",
                    "price": {"value": 3000, "unit_id": 7},  # USD/t
                    "price_sensitivity_to_ci": 0.5,
                    "carbon_content": 0.847,
                    "energy_content": 43.8,
                    "yield_percent": 64.0,
                    "product_density": 0.81
                },
                {
                    "name": "DIESEL", 
                    "price": {"value": 1500, "unit_id": 7},
                    "price_sensitivity_to_ci": 0.5,
                    "carbon_content": 0.85,
                    "energy_content": 42.6,
                    "yield_percent": 15.0,
                    "product_density": 0.83
                },
                {
                    "name": "Naphtha",
                    "price": {"value": 1000, "unit_id": 7},
                    "price_sensitivity_to_ci": 0.5, 
                    "carbon_content": 0.84,
                    "energy_content": 43.4,
                    "yield_percent": 21.0,
                    "product_density": 0.7
                }
            ]
        }

def _run_calculation_internal(db_scenario, crud: BiofuelCRUD):
    """
    Helper to run calculation on a scenario object and save results.
    Used by create_project, create_scenario, and calculate_scenario.
    """
    # 1. Reconstruct UserInputs from the scenario data
    from app.schemas.biofuel_schema import (
        UserInputs, ConversionPlant, EconomicParameters, 
        FeedstockData, UtilityData, ProductData, Quantity
    )
    
    user_inputs_data = db_scenario.user_inputs
    
    # (Parsing logic to convert JSON dict to UserInputs object)
    conversion_plant = ConversionPlant(
        plant_capacity=Quantity(**user_inputs_data["conversion_plant"]["plant_capacity"]),
        annual_load_hours=user_inputs_data["conversion_plant"]["annual_load_hours"],
        ci_process_default=user_inputs_data["conversion_plant"]["ci_process_default"]
    )
    
    economic_parameters = EconomicParameters(**user_inputs_data["economic_parameters"])
    
    feedstock_data = [FeedstockData.from_schema(**d) for d in user_inputs_data["feedstock_data"]]
    utility_data = [UtilityData.from_schema(**d) for d in user_inputs_data["utility_data"]]
    product_data = [ProductData.from_schema(**d) for d in user_inputs_data["product_data"]]

    user_inputs = UserInputs(
        process_technology=db_scenario.process.name,
        feedstock=db_scenario.feedstock.name,
        country=db_scenario.country.name,
        conversion_plant=conversion_plant,
        economic_parameters=economic_parameters,
        feedstock_data=feedstock_data,
        utility_data=utility_data,
        product_data=product_data
    )

    # 2. Run Economics Service
    economics = BiofuelEconomics(user_inputs, crud)
    results = economics.run(
        process_technology=db_scenario.process.name,
        feedstock=db_scenario.feedstock.name,
        country=db_scenario.country.name
    )

    clean_results = sanitize_for_json(results)

    # 3. Save to DB
    return crud.run_scenario_calculation(db_scenario.id, clean_results)

# ==================== MASTER DATA ENDPOINTS ====================

@router.get("/master-data", response_model=MasterDataResponse)
def get_master_data(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all master data for frontend initialization."""
    return crud.get_all_master_data()

# ==================== PROJECT ENDPOINTS ====================

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    try:
        # 1. Create Project
        db_project = crud.create_project(
            project_name=project_in.project_name,
            user_id=current_user.id,
            initial_process_id=project_in.initial_process_id,
            initial_feedstock_id=project_in.initial_feedstock_id,
            initial_country_id=project_in.initial_country_id,
        )
        
        if db_project:
            # 2. Get Defaults
            default_inputs = get_default_user_inputs(
                process_id=project_in.initial_process_id,
                feedstock_id=project_in.initial_feedstock_id, 
                country_id=project_in.initial_country_id
            )
            
            # 3. Create Scenario 1
            scenario_data = {
                "project_id": db_project.id,
                "scenario_name": "Scenario 1",
                "process_id": project_in.initial_process_id,
                "feedstock_id": project_in.initial_feedstock_id,
                "country_id": project_in.initial_country_id,
                "user_inputs": default_inputs,
                "scenario_order": 1
            }
            
            db_scenario = crud.create_scenario(scenario_data)
            
            # 4. [NEW] AUTO-CALCULATE IMMEDIATELY
            # Fetch full object to get relationships (Process name, Country name etc)
            full_scenario = crud.get_scenario_by_id(db_scenario.id)
            _run_calculation_internal(full_scenario, crud)
            
            print(f"✅ Project created & Scenario 1 Auto-Calculated")
        
        return db_project

    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=400, detail="Failed to create project")

@router.get("/projects", response_model=List[ProjectResponse])
def read_projects(
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all projects for the current user."""
    projects = crud.get_projects_by_user(current_user.id)
    
    # Calculate scenario counts for each project
    for project in projects:
        project.scenario_count = len(project.scenarios)
    
    return projects

@router.get("/projects/{project_id}", response_model=ProjectWithScenariosResponse)
def read_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific project with its scenarios."""
    db_project = crud.get_project_by_id(project_id)
    
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # Convert to response model format
    response_data = {
        **db_project.__dict__,
        "scenario_count": len(db_project.scenarios),
        "scenarios": [
            {
                **scenario.__dict__,
                "process": scenario.process,
                "feedstock": scenario.feedstock,
                "country": scenario.country
            }
            for scenario in db_project.scenarios
        ]
    }
    
    return response_data

@router.put("/projects/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    project_update: ProjectCreate,  # Using same schema for update for simplicity
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Update a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    update_data = project_update.dict(exclude_unset=True)
    updated_project = crud.update_project(project_id, update_data)
    
    if not updated_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    return updated_project

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    success = crud.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

# ==================== SCENARIO ENDPOINTS ====================

@router.post("/projects/{project_id}/scenarios", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    project_id: UUID,
    scenario_in: ScenarioCreate,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Create a new scenario for a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    try:
        scenario_data = {
            "project_id": project_id,
            "scenario_name": scenario_in.scenario_name,
            "process_id": scenario_in.process_id,
            "feedstock_id": scenario_in.feedstock_id,
            "country_id": scenario_in.country_id,
            "user_inputs": scenario_in.user_inputs.dict(),
            "scenario_order": scenario_in.scenario_order,
        }
        
        db_scenario = crud.create_scenario(scenario_data)
        # 2. [NEW] Auto-Calculate
        full_scenario = crud.get_scenario_by_id(db_scenario.id)
        updated_scenario = _run_calculation_internal(full_scenario, crud)
        
        return updated_scenario
        
    except Exception as e:
        logger.error(f"Error creating scenario: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create scenario"
        )

@router.get("/projects/{project_id}/scenarios", response_model=List[ScenarioResponse])
def get_project_scenarios(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all scenarios for a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    return crud.get_scenarios_by_project(project_id)

@router.get("/scenarios/{scenario_id}", response_model=ScenarioDetailResponse)
def get_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific scenario with full details."""
    db_scenario = crud.get_scenario_by_id(scenario_id)
    
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    return db_scenario

@router.put("/scenarios/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: UUID,
    scenario_update: ScenarioUpdate,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Update a scenario."""
    # Verify scenario exists and user has access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    update_data = scenario_update.dict(exclude_unset=True)
    
    updated_scenario = crud.update_scenario(scenario_id, update_data)
    
    if not updated_scenario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )
    
    return updated_scenario

@router.delete("/scenarios/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a scenario."""
    # Verify scenario exists and user has access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    success = crud.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found"
        )

# ==================== CALCULATION ENDPOINTS ====================

@router.post("/scenarios/{scenario_id}/calculate", response_model=CalculationResponse)
def calculate_scenario(
    scenario_id: UUID,
    inputs_in: UserInputsSchema, # <--- [NEW] Accepts input payload!
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Update inputs AND run calculation in one request.
    """
    # 1. Verify access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # 2. Update the Database with the NEW inputs received from Frontend
        # We must convert Pydantic schema to dict for JSONB storage
        updated_inputs_dict = inputs_in.dict(by_alias=True)
        
        crud.update_scenario(scenario_id, {"user_inputs": updated_inputs_dict})
        
        # 3. Refresh the scenario object to ensure we have the latest data
        db_scenario = crud.get_scenario_by_id(scenario_id)

        # 4. Run Calculation using the Helper
        updated_scenario = _run_calculation_internal(db_scenario, crud)
        
        if not updated_scenario:
             raise HTTPException(status_code=500, detail="Calculation save failed")

        # 5. Return results
        return CalculationResponse(
            techno_economics=updated_scenario.techno_economics,
            financials=updated_scenario.financial_analysis,
            resolved_inputs=updated_scenario.user_inputs # Return what we used
        )
        
    except Exception as e:
        logger.error(f"Calculation error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))

# ==================== AUTH ENDPOINTS ====================

# Update the login endpoint
@router.post("/auth/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login endpoint with JWT token generation."""
    try:
        # Find user by email
        stmt = select(User).where(User.email == login_data.email)
        user = db.execute(stmt).scalar_one_or_none()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Ensure password length is within bcrypt limits
        password_to_check = login_data.password
        if len(password_to_check) > 72:
            password_to_check = password_to_check[:72]
            logger.warning(f"Password truncated for user {login_data.email}")
        
        # Verify password
        if not verify_password(password_to_check, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )
        
        # Create user schema
        user_schema = UserSchema(
            id=user.id,
            name=user.name,
            email=user.email
        )
        
        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_schema
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )
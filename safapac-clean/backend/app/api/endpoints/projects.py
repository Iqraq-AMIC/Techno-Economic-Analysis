# app/api/endpoints/projects.py

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Core Database and CRUD
from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD

# Service Layers
from app.services.economics import BiofuelEconomics

# Schemas
from app.schemas.biofuel_schema import (
    ProjectCreate, ProjectResponse, ProjectWithScenariosResponse,
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate,
    UserInputsSchema, CalculationResponse, MasterDataResponse,
    LoginResponse
)

# Models
from app.models.biofuel_model import UserProject, Scenario

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Authentication Dependency ---
def get_current_user_id() -> UUID:
    # TODO: Replace with actual authentication
    return UUID("00000000-0000-0000-0000-000000000001")

# --- Dependency Injection ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

# ==================== MASTER DATA ENDPOINTS ====================

@router.get("/master-data", response_model=MasterDataResponse)
def get_master_data(crud: BiofuelCRUD = Depends(get_biofuel_crud)):
    """Get all master data for frontend initialization."""
    return crud.get_all_master_data()

# ==================== PROJECT ENDPOINTS ====================

@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Create a new project."""
    try:
        db_project = crud.create_project(
            project_name=project_in.project_name,
            user_id=user_id,
            initial_process_id=project_in.initial_process_id,
            initial_feedstock_id=project_in.initial_feedstock_id,
            initial_country_id=project_in.initial_country_id,
        )
        return db_project
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create project"
        )

@router.get("/projects", response_model=List[ProjectResponse])
def read_projects(
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all projects for the current user."""
    projects = crud.get_projects_by_user(user_id)
    
    # Calculate scenario counts for each project
    for project in projects:
        project.scenario_count = len(project.scenarios)
    
    return projects

@router.get("/projects/{project_id}", response_model=ProjectWithScenariosResponse)
def read_project(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific project with its scenarios."""
    db_project = crud.get_project_by_id(project_id)
    
    if not db_project or db_project.user_id != user_id:
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
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Update a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != user_id:
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
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != user_id:
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
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Create a new scenario for a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != user_id:
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
            "user_inputs_json": scenario_in.user_inputs.dict(),
            "scenario_order": scenario_in.scenario_order,
        }
        
        db_scenario = crud.create_scenario(scenario_data)
        return db_scenario
        
    except Exception as e:
        logger.error(f"Error creating scenario: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create scenario"
        )

@router.get("/projects/{project_id}/scenarios", response_model=List[ScenarioResponse])
def get_project_scenarios(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all scenarios for a project."""
    # Verify project exists and user has access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    return crud.get_scenarios_by_project(project_id)

@router.get("/scenarios/{scenario_id}", response_model=ScenarioDetailResponse)
def get_scenario(
    scenario_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific scenario with full details."""
    db_scenario = crud.get_scenario_by_id(scenario_id)
    
    if not db_scenario or db_scenario.project.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    return db_scenario

@router.put("/scenarios/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: UUID,
    scenario_update: ScenarioUpdate,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Update a scenario."""
    # Verify scenario exists and user has access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    update_data = scenario_update.dict(exclude_unset=True)
    
    # Handle user_inputs separately to maintain structure
    if 'user_inputs' in update_data:
        update_data['user_inputs_json'] = update_data.pop('user_inputs').dict()
    
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
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a scenario."""
    # Verify scenario exists and user has access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != user_id:
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
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud),
    db: Session = Depends(get_db)
):
    """Run calculations for a scenario."""
    # Verify scenario exists and user has access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Scenario not found or access denied"
        )
    
    try:
        # Get process, feedstock, and country names
        process_name = db_scenario.process.name
        feedstock_name = db_scenario.feedstock.name  
        country_name = db_scenario.country.name
        
        # Convert JSON inputs back to UserInputs dataclass
        from app.schemas.biofuel_schema import UserInputs, ConversionPlant, EconomicParameters
        from app.schemas.biofuel_schema import FeedstockData, UtilityData, ProductData, Quantity
        
        user_inputs_json = db_scenario.user_inputs_json
        
        # Reconstruct UserInputs dataclass (this would need proper deserialization)
        # For now, we'll pass the raw data to the economics service
        # In a real implementation, you'd want proper deserialization
        
        # Run calculations using your existing economics service
        # Note: This assumes BiofuelEconomics can work with the JSON data directly
        # or we need to properly reconstruct the UserInputs dataclass
        
        # Placeholder for calculation logic
        # calculation_results = run_calculations(process_name, feedstock_name, country_name, user_inputs_json)
        
        # For now, return a placeholder response
        calculation_results = {
            "techno_economics": {},
            "financials": {},
            "resolved_inputs": {}
        }
        
        # Save results back to scenario
        crud.run_scenario_calculation(scenario_id, calculation_results)
        
        return CalculationResponse(**calculation_results)
        
    except Exception as e:
        logger.error(f"Calculation error for scenario {scenario_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Calculation failed: {str(e)}"
        )

# ==================== AUTH ENDPOINTS ====================

@router.post("/auth/login", response_model=LoginResponse)
def login():
    """User login endpoint."""
    # TODO: Implement proper authentication
    return LoginResponse(
        access_token="placeholder_token",
        user_id=UUID("00000000-0000-0000-0000-000000000001")
    )
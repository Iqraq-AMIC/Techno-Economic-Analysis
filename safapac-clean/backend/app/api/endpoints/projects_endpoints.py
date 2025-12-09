# app/api/endpoints/projects_endpoints.py

import logging
from typing import Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.core.security import get_current_active_user
# --- MODIFIED IMPORTS ---
from app.schemas.project_schema import (
    ProjectCreate, ProjectResponse, ProjectWithScenariosResponse
)
from app.models.user_project import User # Corrected model import

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Dependency Injection ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

def get_default_user_inputs(process_id: int, feedstock_id: int, country_id: int) -> Dict:
    """Generate default user inputs for a new scenario."""
    # NOTE: This entire dependency function is usually moved to a service/utility file
    # for cleaner endpoint code, but we keep it here for simplicity.
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
                "carbon_content": 0.78,
                "carbon_intensity": {
                    "value": 46.526,
                    "unit_id": 11
                },
                "energy_content": 0.0,
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

# ==================== PROJECT ENDPOINTS ====================

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Create a new project with initial scenario."""
    # Import here to avoid circular dependency
    from app.api.endpoints.scenarios_endpoints import run_calculation_internal

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

            # 4. AUTO-CALCULATE IMMEDIATELY
            full_scenario = crud.get_scenario_by_id(db_scenario.id)
            run_calculation_internal(full_scenario, crud)

            print(f"✅ Project created & Scenario 1 Auto-Calculated")

        return db_project

    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=400, detail="Failed to create project")

@router.get("", response_model=List[ProjectResponse])
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

@router.get("/{project_id}", response_model=ProjectWithScenariosResponse)
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

@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: UUID,
    # NOTE: project_update should ideally be ProjectUpdate schema, not ProjectCreate
    # ProjectCreate is used for the example, but ProjectUpdate is better practice for PUT/PATCH.
    project_update: ProjectCreate, 
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

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
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
# app/api/endpoints/projects.py (NEW FILE/SECTION in biofuel-api.py)

from dataclasses import asdict
import time
import logging
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

# Core Database and CRUD
from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD

# Service Layers
from app.services.economics import BiofuelEconomics
from app.services.financial_analysis import FinancialAnalysis

# Schemas (Pydantic Models) - ASSUME THESE ARE DEFINED IN app/schemas/biofuel.py
from app.schemas.biofuel_schema import (
    CalculationResponse, ProjectCreate, ProjectSchema, RunSchema, RunCreate,
    # Dataclasses needed for manual construction:
    UserInputs, ConversionPlant, EconomicParameters, 
    FeedstockData, UtilityData, ProductData, Quantity
)
from app.models.biofuel_model import Country, Feedstock, ProcessTechnology, UserProject, ProjectAnalysisRun # Import ORM models for CRUD results

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Placeholder Dependency for User Authentication ---
# In a real app, this would validate a token and fetch the User ID
def get_current_user_id() -> UUID:
    # HARDCODED for development - replace with actual auth logic
    # We must have a user in the database to link projects to.
    return UUID("00000000-0000-0000-0000-000000000001") 
    
# --- Dependency Injection Functions ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

# ----------------------------------------------------------------------
# API Endpoints: Project Management
# ----------------------------------------------------------------------

@router.post("/projects", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate, # Now uses the schema with IDs
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    crud = BiofuelCRUD(db)
    
    db_project = crud.create_project(
        project_name=project_in.project_name,
        user_id=user_id,
        # CHANGE: Pass the IDs from the input schema
        process_id=project_in.process_technology_id, 
        feedstock_id=project_in.feedstock_id,
        country_id=project_in.country_id,
    )
    
    # ProjectSchema will ensure the full objects (process, feedstock, country) are returned
    return db_project

@router.get("/projects", response_model=List[ProjectSchema])
def read_projects(
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Retrieves all projects for the authenticated user."""
    return crud.get_projects_by_user(user_id)

@router.get("/projects/{project_id}", response_model=ProjectSchema)
def read_project(
    project_id: UUID,
    user_id: UUID = Depends(get_current_user_id),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Retrieves a single project by ID."""
    db_project = crud.get_project_by_id(project_id)
    if db_project is None or db_project.user_id != user_id:
        raise HTTPException(status_code=404, detail="Project not found or access denied.")
    return db_project

@router.post("/projects/{project_id}/runs", response_model=RunSchema, status_code=status.HTTP_201_CREATED)
def create_analysis_run(
    project_id: UUID,
    run_in: RunCreate, 
    user_id: UUID = Depends(get_current_user_id),
    db: Session = Depends(get_db)
):
    crud = BiofuelCRUD(db)

    # --- 1. Fetch Project Data ---
    db_project = crud.get_project_by_id(project_id)
    if not db_project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Project {project_id} not found")
        
    # Security check (if implemented in get_project_by_id, otherwise check here)
    if db_project.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

    try:
        # --- 2. Construct the full UserInputs dataclass for the service layer ---
        # Get the names from the project object
        process_name = db_project.process.name
        feedstock_name = db_project.feedstock.name
        country_name = db_project.country.name
        
        # Get the validated input data dictionary (by_alias=True handles 'yield' alias)
        input_dict = run_in.inputs.dict(by_alias=True)

        # Manually create the UserInputs dataclass, combining project data and user inputs
        user_inputs_dataclass = UserInputs(
            process_technology=process_name,
            feedstock=feedstock_name,
            country=country_name,
            
            conversion_plant=ConversionPlant(
                # Use the new QuantityInputSchema structure, which matches Quantity.from_dict expectation
                plant_capacity=Quantity.from_dict(input_dict["conversion_plant"]["plant_capacity"]), 
                annual_load_hours=input_dict["conversion_plant"]["annual_load_hours"],
                ci_process_default=input_dict["conversion_plant"]["ci_process_default"],
            ),
            
            economic_parameters=EconomicParameters(**input_dict["economic_parameters"]),
            
            feedstock_data=[
                FeedstockData.from_schema(**data) 
                for data in input_dict.get("feedstock_data", [])
            ],
            utility_data=[
                UtilityData.from_schema(**data) 
                for data in input_dict.get("utility_data", [])
            ],
            product_data=[
                ProductData.from_schema(**data) 
                for data in input_dict.get("product_data", [])
            ],
        )

        # Instantiate and run the economics service
        economics = BiofuelEconomics(user_inputs_dataclass, crud)
        calc_results = economics.run(
            process_technology=process_name, # Passed to the service's run method
            feedstock=feedstock_name,       # Passed to the service's run method
            country=country_name            # Passed to the service's run method
        )
        
        # Assuming the calculation service returns the final flat results
        techno_economics = calc_results['technoEconomics']
        financials = calc_results['financials']
        
    except Exception as e:
        logger.error(f"Calculation failed for project {project_id}: {e}", exc_info=True)
        # Return a 400 Bad Request if the inputs caused the calculation to fail (e.g., ValueError)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Calculation input error: {e}")

    # --- 3. Save Results ---
    # Save the *full* state of inputs (including the project selections) as JSONB
    db_run = ProjectAnalysisRun(
        project_id=project_id,
        run_name=run_in.run_name,
        user_inputs_json=asdict(user_inputs_dataclass), # Use asdict() to save the final dataclass state
        techno_economics_json=techno_economics, 
        financial_analysis_json=financials,
    )
    
    db_run = crud.create_analysis_run(db_run)
    
    return db_run
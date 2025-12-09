# app/api/endpoints/scenarios_endpoints.py

import logging
import math
from typing import List, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.core.security import get_current_active_user
from app.services.economics import BiofuelEconomics # Assuming this exists
# --- MODIFIED SCHEMAS IMPORTS ---
from app.schemas.scenario_schema import (
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate,
    UserInputsSchema, CalculationResponse
)
# --- MODIFIED MODEL IMPORT ---
from app.models.user_project import User 
# --- NEW IMPORT ---
# Import the dataclasses from the new neutral file
from app.models.calculation_data import (
    Quantity, ProductData, FeedstockData, UtilityData, 
    EconomicParameters, ConversionPlant, UserInputs
)

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Dependency Injection ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

# Helper Function to Sanitize NaN/Inf
def sanitize_for_json(obj):
    """Recursively replace NaN and Infinity with 0.0 for valid JSON serialization."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0 
    elif isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(i) for i in obj]
    return obj

def run_calculation_internal(db_scenario, crud: BiofuelCRUD):
    """
    Helper to run calculation on a scenario object and save results.
    Used by create_project, create_scenario, and calculate_scenario.
    """
    # 1. Reconstruct UserInputs from the scenario data
    user_inputs_data = db_scenario.user_inputs

    # Parsing logic to convert JSON dict to UserInputs object
    # NOTE: Keys here must match what is stored in DB (snake_case)
    conversion_plant = ConversionPlant(
        plant_capacity=Quantity(**user_inputs_data["conversion_plant"]["plant_capacity"]),
        annual_load_hours=user_inputs_data["conversion_plant"]["annual_load_hours"],
        ci_process_default=user_inputs_data["conversion_plant"]["ci_process_default"]
    )

    # Use dict lookup here as dataclasses don't naturally handle from_dict like Pydantic
    economic_parameters = EconomicParameters(
        project_lifetime_years=user_inputs_data["economic_parameters"].get("project_lifetime_years"),
        discount_rate_percent=user_inputs_data["economic_parameters"].get("discount_rate_percent"),
        tci_ref_musd=user_inputs_data["economic_parameters"].get("tci_ref_musd"),
        reference_capacity_ktpa=user_inputs_data["economic_parameters"].get("reference_capacity_ktpa"),
        tci_scaling_exponent=user_inputs_data["economic_parameters"].get("tci_scaling_exponent"),
        working_capital_tci_ratio=user_inputs_data["economic_parameters"].get("working_capital_tci_ratio"),
        indirect_opex_tci_ratio=user_inputs_data["economic_parameters"].get("indirect_opex_tci_ratio"),
    )

    # We use the @classmethod constructors defined above
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

# ==================== SCENARIO ENDPOINTS ====================

@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
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
        # 1. Prepare Data
        scenario_data = {
            "project_id": project_id,
            "scenario_name": scenario_in.scenario_name,
            "process_id": scenario_in.process_id,
            "feedstock_id": scenario_in.feedstock_id,
            "country_id": scenario_in.country_id,
            "user_inputs": scenario_in.user_inputs.dict(), # Convert Pydantic to JSON dict
            "scenario_order": scenario_in.scenario_order,
        }

        # 2. Create Scenario (THIS COMMITS TO DB)
        db_scenario = crud.create_scenario(scenario_data)

        # 3. [Safe] Auto-Calculate
        try:
            full_scenario = crud.get_scenario_by_id(db_scenario.id)
            updated_scenario = run_calculation_internal(full_scenario, crud)
            return updated_scenario

        except Exception as calc_error:
            # CATCH CALCULATION ERRORS SEPARATELY
            logger.error(f"⚠️ Scenario created, but auto-calculation failed: {calc_error}")
            # Return the scenario without calculation results
            return crud.get_scenario_by_id(db_scenario.id)

    except Exception as e:
        logger.error(f"Error creating scenario: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create scenario: {str(e)}"
        )

@router.get("", response_model=List[ScenarioResponse])
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

@router.get("/{scenario_id}", response_model=ScenarioDetailResponse)
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

@router.put("/{scenario_id}", response_model=ScenarioResponse)
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

@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
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

@router.post("/{scenario_id}/calculate", response_model=CalculationResponse)
def calculate_scenario(
    scenario_id: UUID,
    inputs_in: UserInputsSchema,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Update inputs (JSON + Relational Columns) AND run calculation in one request.
    """
    # 1. Verify access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # 2. Sync Relational Columns (Process, Feedstock, Country)
        # extract names from the incoming Pydantic model
        process_name = inputs_in.process_technology
        feedstock_name = inputs_in.feedstock
        country_name = inputs_in.country

        success = crud.update_scenario_core_parameters(
            scenario_id, process_name, feedstock_name, country_name
        )

        if not success:
            logger.warning(f"Could not sync relational columns for scenario {scenario_id}. Names might be invalid: {process_name}, {feedstock_name}, {country_name}")
            raise HTTPException(status_code=400, detail="Invalid Process, Feedstock, or Country name provided.")

        # 3. Update the Database JSON blob
        updated_inputs_dict = inputs_in.dict()
        crud.update_scenario(scenario_id, {"user_inputs": updated_inputs_dict})

        # 4. Refresh the scenario object to get the new IDs and Data
        db_scenario = crud.get_scenario_by_id(scenario_id)

        # 5. Run Calculation using the Helper
        updated_scenario = run_calculation_internal(db_scenario, crud)

        if not updated_scenario:
            raise HTTPException(status_code=500, detail="Calculation save failed")

        # 6. Return results
        return CalculationResponse(
            techno_economics=updated_scenario.techno_economics,
            financials=updated_scenario.financial_analysis,
            resolved_inputs=updated_scenario.user_inputs
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
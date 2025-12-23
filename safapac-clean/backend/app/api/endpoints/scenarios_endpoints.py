# app/api/endpoints/scenarios_endpoints.py

import logging
import math
from typing import List, Dict, Any, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.crud.biofuel_crud import BiofuelCRUD
from app.core.security import get_current_active_user
from app.services.economics import BiofuelEconomics
from app.services.traceable_economics import TraceableEconomics
from app.services.unit_normalizer import UnitNormalizer 
from app.schemas.scenario_schema import (
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate,
    UserInputsSchema, CalculationResponse, DraftSaveRequest, DraftSaveResponse
)
from app.schemas.base import CamelCaseBaseModel
from app.models.user_project import User 
from app.models.calculation_data import (
    Quantity, ProductData, FeedstockData, UtilityData, 
    EconomicParameters, ConversionPlant, UserInputs
)

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Dependency Injection ---
def get_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    return BiofuelCRUD(db)

# --- Helper Functions ---
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
    """
    user_inputs_data = db_scenario.user_inputs

    if not user_inputs_data:
        return None

    # Parse JSON back into Data Classes
    conversion_plant = ConversionPlant(
        plant_capacity=Quantity(**user_inputs_data["conversion_plant"]["plant_capacity"]),
        annual_load_hours=user_inputs_data["conversion_plant"]["annual_load_hours"],
        ci_process_default=user_inputs_data["conversion_plant"]["ci_process_default"]
    )

    economic_parameters = EconomicParameters(
        project_lifetime_years=user_inputs_data["economic_parameters"].get("project_lifetime_years"),
        discount_rate_percent=user_inputs_data["economic_parameters"].get("discount_rate_percent"),
        tci_ref_musd=user_inputs_data["economic_parameters"].get("tci_ref_musd"),
        reference_capacity_ktpa=user_inputs_data["economic_parameters"].get("reference_capacity_ktpa"),
        tci_scaling_exponent=user_inputs_data["economic_parameters"].get("tci_scaling_exponent"),
        working_capital_tci_ratio=user_inputs_data["economic_parameters"].get("working_capital_tci_ratio"),
        indirect_opex_tci_ratio=user_inputs_data["economic_parameters"].get("indirect_opex_tci_ratio"),
    )

    feedstock_data = [FeedstockData.from_schema(**d) for d in user_inputs_data["feedstock_data"]]
    utility_data = [UtilityData.from_schema(**d) for d in user_inputs_data["utility_data"]]
    product_data = [ProductData.from_schema(**d) for d in user_inputs_data["product_data"]]

    # CHANGED: Create UserInputs using IDs from the DB Scenario relationship
    user_inputs = UserInputs(
        process_id=db_scenario.process_id,
        feedstock_id=db_scenario.feedstock_id,
        country_id=db_scenario.country_id,
        conversion_plant=conversion_plant,
        economic_parameters=economic_parameters,
        feedstock_data=feedstock_data,
        utility_data=utility_data,
        product_data=product_data
    )

    # Normalize units to base units before calculation
    normalizer = UnitNormalizer(crud)
    normalized_inputs = normalizer.normalize_user_inputs(user_inputs)

    # Run Calculation with traceability
    economics = TraceableEconomics(normalized_inputs, crud)

    # CHANGED: Pass IDs to run()
    results = economics.run(
        process_id=db_scenario.process_id,
        feedstock_id=db_scenario.feedstock_id,
        country_id=db_scenario.country_id
    )

    clean_results = sanitize_for_json(results)
    return crud.run_scenario_calculation(db_scenario.id, clean_results)

# ==================== SCENARIO CRUD ENDPOINTS ====================

class ScenarioCreateSimple(CamelCaseBaseModel):
    """Simple schema for creating a new scenario (without full inputs)."""
    scenario_name: Optional[str] = None
    scenario_order: Optional[int] = None

@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
def create_scenario(
    project_id: UUID,
    scenario_in: ScenarioCreateSimple = None,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Create a new scenario for a project.
    Uses placeholder master data (like project creation does).
    """
    # Verify project access
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    # Extract values from body if provided
    scenario_name = scenario_in.scenario_name if scenario_in else None
    scenario_order = scenario_in.scenario_order if scenario_in else None

    # Check scenario limit (max 3)
    existing_scenarios = crud.get_scenarios_by_project(project_id)
    if len(existing_scenarios) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 scenarios per project")

    # Get placeholder IDs for required fields
    processes = crud.get_process_technologies()
    feedstocks = crud.get_feedstocks()
    countries = crud.get_countries()

    if not (processes and feedstocks and countries):
        raise HTTPException(
            status_code=500,
            detail="Master data is empty. Cannot create scenario."
        )

    # Default scenario name and order
    if not scenario_name:
        scenario_name = f"Scenario {len(existing_scenarios) + 1}"
    if not scenario_order:
        scenario_order = len(existing_scenarios) + 1

    # Create scenario with placeholder data
    scenario_data = {
        "project_id": project_id,
        "scenario_name": scenario_name,
        "process_id": processes[0].id,
        "feedstock_id": feedstocks[0].id,
        "country_id": countries[0].id,
        "user_inputs": {},  # Empty JSON, waiting for calculation API input
        "scenario_order": scenario_order
    }

    db_scenario = crud.create_scenario(scenario_data)
    logger.info(f"✅ Scenario '{scenario_name}' created for project {project_id}")

    return db_scenario

@router.get("", response_model=List[ScenarioDetailResponse])
def get_project_scenarios(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all scenarios for a project (includes inputs and calculation results)."""
    db_project = crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    return crud.get_scenarios_by_project(project_id)

@router.get("/{scenario_id}", response_model=ScenarioDetailResponse)
def get_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific scenario with full details (inputs + results)."""
    db_scenario = crud.get_scenario_by_id(scenario_id)

    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return db_scenario

@router.put("/{scenario_id}", response_model=ScenarioResponse)
def update_scenario(
    scenario_id: UUID,
    scenario_update: ScenarioUpdate,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Update scenario metadata (e.g., rename scenario).
    Use the /calculate endpoint to update inputs and run math.
    """
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Exclude unset fields so we don't accidentally overwrite data with None
    update_data = scenario_update.model_dump(exclude_unset=True)

    updated_scenario = crud.update_scenario(scenario_id, update_data)
    return updated_scenario

@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a scenario."""
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    success = crud.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete scenario")

# ==================== DRAFT SAVING ENDPOINT ====================

@router.patch("/{scenario_id}/draft", response_model=DraftSaveResponse)
def save_draft(
    scenario_id: UUID,
    draft_data: DraftSaveRequest,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Save partial/incomplete scenario data as a draft.

    This endpoint:
    - Accepts partial data (all fields optional)
    - Bypasses strict validation
    - Does NOT run the calculation engine
    - Simply merges the provided data with existing user_inputs
    - Sets scenario status to "draft"
    """
    # Verify access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # Get existing user_inputs or start with empty dict
        existing_inputs = db_scenario.user_inputs or {}

        # Merge new draft data with existing inputs (preserve existing data)
        draft_dict = draft_data.model_dump(exclude_unset=True)

        # Merge at top level
        for key, value in draft_dict.items():
            if value is not None:
                existing_inputs[key] = value

        # Update scenario with merged inputs and draft status
        update_data = {
            "user_inputs": existing_inputs,
            "status": "draft"
        }

        # Update relational columns if provided
        if draft_data.process_id is not None:
            update_data["process_id"] = draft_data.process_id
        if draft_data.feedstock_id is not None:
            update_data["feedstock_id"] = draft_data.feedstock_id
        if draft_data.country_id is not None:
            update_data["country_id"] = draft_data.country_id

        updated_scenario = crud.update_scenario(scenario_id, update_data)

        logger.info(f"Draft saved for scenario {scenario_id}")

        return DraftSaveResponse(
            id=updated_scenario.id,
            status=updated_scenario.status,
            message="Draft saved successfully",
            user_inputs=updated_scenario.user_inputs
        )

    except Exception as e:
        logger.error(f"Draft save error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to save draft: {str(e)}")

# ==================== CALCULATION ENDPOINT ====================

@router.post("/{scenario_id}/calculate", response_model=CalculationResponse)
def calculate_scenario(
    scenario_id: UUID,
    inputs_in: UserInputsSchema,
    current_user: User = Depends(get_current_active_user),
    crud: BiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    1. Receives full User Inputs (JSON).
    2. Updates DB with new inputs.
    3. Runs Calculation.
    4. Saves Results.
    5. Returns Results.
    """
    # 1. Verify access
    db_scenario = crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # 2. Update DB Columns directly using IDs (No more name lookup needed!)
        crud.update_scenario(scenario_id, {
            "process_id": inputs_in.process_id,
            "feedstock_id": inputs_in.feedstock_id,
            "country_id": inputs_in.country_id,
            "user_inputs": inputs_in.model_dump(),  # 3. Update JSON Blob
            "status": "calculated"  # Mark as calculated when running full calculation
        })

        # 4. Refresh & Calculate
        db_scenario = crud.get_scenario_by_id(scenario_id)
        updated_scenario = run_calculation_internal(db_scenario, crud)

        if not updated_scenario:
            raise HTTPException(status_code=500, detail="Calculation execution failed")

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
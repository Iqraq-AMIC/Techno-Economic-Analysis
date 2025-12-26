# app/api/endpoints/scenarios_endpoints.py

import logging
import math
from typing import List, Optional
from uuid import UUID
from concurrent.futures import ThreadPoolExecutor
import asyncio

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.core.database import get_async_db, get_db, AsyncSessionLocal
from app.crud.async_biofuel_crud import AsyncBiofuelCRUD
from app.crud.biofuel_crud import BiofuelCRUD
from app.core.security import get_current_active_user
from app.services.economics import BiofuelEconomics
from app.services.traceable_economics import TraceableEconomics
from app.services.unit_normalizer import UnitNormalizer
from app.schemas.scenario_schema import (
    ScenarioCreate, ScenarioResponse, ScenarioDetailResponse, ScenarioUpdate,
    UserInputsSchema, CalculationResponse, DraftSaveRequest, DraftSaveResponse,
    CalculationStatusResponse
)
from app.schemas.base import CamelCaseBaseModel
from app.models.user_project import User
from app.models.calculation_data import (
    Quantity, ProductData, FeedstockData, UtilityData,
    EconomicParameters, ConversionPlant, UserInputs
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Thread pool for CPU-intensive calculations
calculation_executor = ThreadPoolExecutor(max_workers=4)

# --- Dependency Injection ---
async def get_biofuel_crud(db: AsyncSession = Depends(get_async_db)) -> AsyncBiofuelCRUD:
    return AsyncBiofuelCRUD(db)

def get_sync_biofuel_crud(db: Session = Depends(get_db)) -> BiofuelCRUD:
    """Sync CRUD for calculation operations that need sync DB access."""
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

def run_calculation_sync(db_scenario, sync_crud: BiofuelCRUD):
    """
    Synchronous helper to run calculation on a scenario object.
    This runs in a thread pool to avoid blocking the event loop.
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

    # Create UserInputs using IDs from the DB Scenario relationship
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
    normalizer = UnitNormalizer(sync_crud)
    normalized_inputs = normalizer.normalize_user_inputs(user_inputs)

    # Run Calculation with traceability
    economics = TraceableEconomics(normalized_inputs, sync_crud)

    # Pass IDs to run()
    results = economics.run(
        process_id=db_scenario.process_id,
        feedstock_id=db_scenario.feedstock_id,
        country_id=db_scenario.country_id
    )

    return sanitize_for_json(results)


async def run_calculation_background(scenario_id: UUID, user_inputs_dict: dict):
    """
    Background task that runs the calculation and saves results.
    Uses its own database session since it runs after the request completes.
    """
    from app.core.database import SessionLocal  # Sync session for calculation

    async with AsyncSessionLocal() as async_db:
        try:
            # Get scenario with fresh async session
            async_crud = AsyncBiofuelCRUD(async_db)
            db_scenario = await async_crud.get_scenario_by_id(scenario_id)

            if not db_scenario:
                logger.error(f"Background calc: Scenario {scenario_id} not found")
                return

            # Run calculation in thread pool (CPU-intensive work)
            with SessionLocal() as sync_db:
                sync_crud = BiofuelCRUD(sync_db)
                loop = asyncio.get_event_loop()
                clean_results = await loop.run_in_executor(
                    calculation_executor,
                    run_calculation_sync,
                    db_scenario,
                    sync_crud
                )

            if clean_results:
                # Save results and update status to "calculated"
                await async_crud.update_scenario(scenario_id, {
                    "techno_economics": clean_results.get('techno_economics', {}),
                    "financial_analysis": clean_results.get('financials', {}),
                    "status": "calculated"
                })
                logger.info(f"Background calc completed for scenario {scenario_id}")
            else:
                # Mark as failed
                await async_crud.update_scenario(scenario_id, {"status": "failed"})
                logger.error(f"Background calc failed for scenario {scenario_id}: No results")

        except Exception as e:
            logger.error(f"Background calc error for scenario {scenario_id}: {e}", exc_info=True)
            # Try to mark as failed
            try:
                async_crud = AsyncBiofuelCRUD(async_db)
                await async_crud.update_scenario(scenario_id, {"status": "failed"})
            except Exception:
                pass

# ==================== SCENARIO CRUD ENDPOINTS ====================

class ScenarioCreateSimple(CamelCaseBaseModel):
    """Simple schema for creating a new scenario (without full inputs)."""
    scenario_name: Optional[str] = None
    scenario_order: Optional[int] = None

@router.post("", response_model=ScenarioResponse, status_code=status.HTTP_201_CREATED)
async def create_scenario(
    project_id: UUID,
    scenario_in: ScenarioCreateSimple = None,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Create a new scenario for a project.
    Uses placeholder master data (like project creation does).
    """
    # Verify project access
    db_project = await crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    # Extract values from body if provided
    scenario_name = scenario_in.scenario_name if scenario_in else None
    scenario_order = scenario_in.scenario_order if scenario_in else None

    # Check scenario limit (max 3)
    existing_scenarios = await crud.get_scenarios_by_project(project_id)
    if len(existing_scenarios) >= 3:
        raise HTTPException(status_code=400, detail="Maximum 3 scenarios per project")

    # Get placeholder IDs for required fields
    processes = await crud.get_process_technologies()
    feedstocks = await crud.get_feedstocks()
    countries = await crud.get_countries()

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

    db_scenario = await crud.create_scenario(scenario_data)
    logger.info(f"Scenario '{scenario_name}' created for project {project_id}")

    return db_scenario

@router.get("", response_model=List[ScenarioDetailResponse])
async def get_project_scenarios(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all scenarios for a project (includes inputs and calculation results)."""
    db_project = await crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Project not found")

    return await crud.get_scenarios_by_project(project_id)

@router.get("/{scenario_id}", response_model=ScenarioDetailResponse)
async def get_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific scenario with full details (inputs + results)."""
    db_scenario = await crud.get_scenario_by_id(scenario_id)

    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    return db_scenario

@router.put("/{scenario_id}", response_model=ScenarioResponse)
async def update_scenario(
    scenario_id: UUID,
    scenario_update: ScenarioUpdate,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Update scenario metadata (e.g., rename scenario).
    Use the /calculate endpoint to update inputs and run math.
    """
    db_scenario = await crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    # Exclude unset fields so we don't accidentally overwrite data with None
    update_data = scenario_update.model_dump(exclude_unset=True)

    updated_scenario = await crud.update_scenario(scenario_id, update_data)
    return updated_scenario

@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_scenario(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a scenario."""
    db_scenario = await crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    success = await crud.delete_scenario(scenario_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete scenario")

# ==================== DRAFT SAVING ENDPOINT ====================

@router.patch("/{scenario_id}/draft", response_model=DraftSaveResponse)
async def save_draft(
    scenario_id: UUID,
    draft_data: DraftSaveRequest,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
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
    db_scenario = await crud.get_scenario_by_id(scenario_id)
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

        updated_scenario = await crud.update_scenario(scenario_id, update_data)

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

# ==================== CALCULATION ENDPOINTS ====================

@router.post("/{scenario_id}/calculate", status_code=status.HTTP_202_ACCEPTED)
async def calculate_scenario_async(
    scenario_id: UUID,
    inputs_in: UserInputsSchema,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Async calculation endpoint that returns immediately (202 Accepted).

    1. Receives full User Inputs (JSON).
    2. Updates DB with new inputs and sets status to "calculating".
    3. Queues calculation as a background task.
    4. Returns immediately with status info.
    5. Frontend polls GET /{scenario_id}/calculate/status for results.
    """
    # 1. Verify access
    db_scenario = await crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # 2. Update DB with inputs and set status to "calculating"
        await crud.update_scenario(scenario_id, {
            "process_id": inputs_in.process_id,
            "feedstock_id": inputs_in.feedstock_id,
            "country_id": inputs_in.country_id,
            "user_inputs": inputs_in.model_dump(),
            "status": "calculating"
        })

        # 3. Queue background calculation
        background_tasks.add_task(
            run_calculation_background,
            scenario_id,
            inputs_in.model_dump()
        )

        logger.info(f"Calculation queued for scenario {scenario_id}")

        return {
            "status": "calculating",
            "scenarioId": str(scenario_id),
            "message": "Calculation started. Poll /calculate/status for results."
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation queue error: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{scenario_id}/calculate/status", response_model=CalculationStatusResponse)
async def get_calculation_status(
    scenario_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Poll this endpoint to check calculation status and get results when ready.

    Status values:
    - "calculating": Calculation in progress
    - "calculated": Calculation complete, results included
    - "failed": Calculation failed
    - "draft": No calculation started yet
    """
    db_scenario = await crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    response = CalculationStatusResponse(
        scenario_id=scenario_id,
        status=db_scenario.status
    )

    if db_scenario.status == "calculated":
        response.techno_economics = db_scenario.techno_economics
        response.financials = db_scenario.financial_analysis
        response.resolved_inputs = db_scenario.user_inputs
        response.message = "Calculation complete"
    elif db_scenario.status == "calculating":
        response.message = "Calculation in progress"
    elif db_scenario.status == "failed":
        response.message = "Calculation failed. Please try again."
    else:
        response.message = "No calculation started"

    return response


@router.post("/{scenario_id}/calculate/sync", response_model=CalculationResponse)
async def calculate_scenario_sync(
    scenario_id: UUID,
    inputs_in: UserInputsSchema,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud),
    sync_crud: BiofuelCRUD = Depends(get_sync_biofuel_crud)
):
    """
    Synchronous calculation endpoint (waits for completion).
    Use this for immediate results when you don't need async behavior.

    1. Receives full User Inputs (JSON).
    2. Updates DB with new inputs.
    3. Runs Calculation (in thread pool to avoid blocking).
    4. Saves Results.
    5. Returns Results.
    """
    # 1. Verify access
    db_scenario = await crud.get_scenario_by_id(scenario_id)
    if not db_scenario or db_scenario.project.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Scenario not found")

    try:
        # 2. Update DB Columns directly using IDs
        await crud.update_scenario(scenario_id, {
            "process_id": inputs_in.process_id,
            "feedstock_id": inputs_in.feedstock_id,
            "country_id": inputs_in.country_id,
            "user_inputs": inputs_in.model_dump(),
            "status": "calculating"
        })

        # 3. Refresh scenario data
        db_scenario = await crud.get_scenario_by_id(scenario_id)

        # 4. Run calculation in thread pool to avoid blocking event loop
        loop = asyncio.get_event_loop()
        clean_results = await loop.run_in_executor(
            calculation_executor,
            run_calculation_sync,
            db_scenario,
            sync_crud
        )

        if not clean_results:
            await crud.update_scenario(scenario_id, {"status": "failed"})
            raise HTTPException(status_code=500, detail="Calculation execution failed")

        # 5. Save results to database
        updated_scenario = await crud.run_scenario_calculation(scenario_id, clean_results)

        if not updated_scenario:
            await crud.update_scenario(scenario_id, {"status": "failed"})
            raise HTTPException(status_code=500, detail="Failed to save calculation results")

        # Update status to calculated
        await crud.update_scenario(scenario_id, {"status": "calculated"})

        return CalculationResponse(
            techno_economics=updated_scenario.techno_economics,
            financials=updated_scenario.financial_analysis,
            resolved_inputs=updated_scenario.user_inputs
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Calculation error: {e}", exc_info=True)
        await crud.update_scenario(scenario_id, {"status": "failed"})
        raise HTTPException(status_code=400, detail=str(e))

# app/api/endpoints/projects_endpoints.py

import logging
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.crud.async_biofuel_crud import AsyncBiofuelCRUD
from app.core.security import get_current_active_user
from app.schemas.project_schema import (
    ProjectCreate, ProjectResponse, ProjectWithScenariosResponse
)
from app.models.user_project import User

logger = logging.getLogger(__name__)

router = APIRouter()

# --- Dependency Injection ---
async def get_biofuel_crud(db: AsyncSession = Depends(get_async_db)) -> AsyncBiofuelCRUD:
    return AsyncBiofuelCRUD(db)

# ==================== PROJECT ENDPOINTS ====================

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """
    Create a new project (Name only).
    Automatically creates 'Scenario 1' with placeholder master data
    (first available in DB) and empty inputs.
    """
    try:
        # 1. Create Project (Project Name only)
        # We pass None for initial IDs as they are optional in UserProject table
        db_project = await crud.create_project(
            project_name=project_in.project_name,
            user_id=current_user.id,
            initial_process_id=None,
            initial_feedstock_id=None,
            initial_country_id=None,
        )

        if db_project:
            # 2. Get Valid Placeholder IDs for Scenario Constraints
            # The Scenario table requires process_id, feedstock_id, and country_id cannot be Null.
            # We fetch the first available item from master data to satisfy the DB constraint.
            processes = await crud.get_process_technologies()
            feedstocks = await crud.get_feedstocks()
            countries = await crud.get_countries()

            if not (processes and feedstocks and countries):
                raise HTTPException(
                    status_code=500,
                    detail="Master data is empty. Cannot create default scenario."
                )

            # Use the first available ID as a placeholder
            default_process_id = processes[0].id
            default_feedstock_id = feedstocks[0].id
            default_country_id = countries[0].id

            # 3. Create Scenario 1 Shell
            # We initialize user_inputs as an empty dict (or minimal structure)
            # because the frontend will provide the real inputs via the /calculate endpoint later.
            scenario_data = {
                "project_id": db_project.id,
                "scenario_name": "Scenario 1",
                "process_id": default_process_id,
                "feedstock_id": default_feedstock_id,
                "country_id": default_country_id,
                "user_inputs": {},  # Empty JSON, waiting for calculation API input
                "scenario_order": 1
            }

            await crud.create_scenario(scenario_data)

            # NOTE: We do NOT run calculation here anymore.
            logger.info(f"Project '{project_in.project_name}' created with empty Scenario 1")

        return db_project

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating project: {e}")
        raise HTTPException(status_code=400, detail="Failed to create project")

@router.get("", response_model=List[ProjectResponse])
async def read_projects(
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get all projects for the current user."""
    projects = await crud.get_projects_by_user(current_user.id)

    # Calculate scenario counts for each project
    for project in projects:
        project.scenario_count = len(project.scenarios)

    return projects

@router.get("/{project_id}", response_model=ProjectWithScenariosResponse)
async def read_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Get a specific project with its scenarios."""
    db_project = await crud.get_project_by_id(project_id)

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
async def update_project(
    project_id: UUID,
    project_update: ProjectCreate,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Update a project."""
    db_project = await crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )

    update_data = project_update.model_dump(exclude_unset=True)
    updated_project = await crud.update_project(project_id, update_data)

    if not updated_project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    return updated_project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_active_user),
    crud: AsyncBiofuelCRUD = Depends(get_biofuel_crud)
):
    """Delete a project."""
    db_project = await crud.get_project_by_id(project_id)
    if not db_project or db_project.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )

    success = await crud.delete_project(project_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

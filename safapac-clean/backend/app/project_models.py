"""
Pydantic models for Project and Scenario management
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime


# ==================== PROJECT MODELS ====================

class ProjectCreate(BaseModel):
    """Request model for creating a new project"""
    user_id: str = Field(..., description="User ID of the project owner")
    project_name: str = Field(..., min_length=1, max_length=100, description="Name of the project")


class ProjectResponse(BaseModel):
    """Response model for project data"""
    project_id: str
    user_id: str
    project_name: str
    created_at: str
    updated_at: str
    scenario_count: int = 0


class ProjectListItem(BaseModel):
    """Simplified project info for list views"""
    project_id: str
    project_name: str
    updated_at: str
    scenario_count: int = 0


class ProjectWithScenariosResponse(BaseModel):
    """Project data with its scenarios"""
    project_id: str
    user_id: str
    project_name: str
    created_at: str
    updated_at: str
    scenario_count: int
    scenarios: List['ScenarioResponse']


# ==================== SCENARIO MODELS ====================

class ScenarioCreate(BaseModel):
    """Request model for creating a new scenario"""
    project_id: str = Field(..., description="Project ID this scenario belongs to")
    scenario_name: str = Field(..., min_length=1, max_length=100, description="Name of the scenario")
    order: Optional[int] = Field(None, description="Display order (auto-assigned if not provided)")


class ScenarioResponse(BaseModel):
    """Response model for scenario data"""
    scenario_id: str
    project_id: str
    scenario_name: str
    order: int
    created_at: str
    updated_at: str


class ScenarioDetailResponse(BaseModel):
    """Detailed scenario response with inputs and outputs"""
    scenario_id: str
    project_id: str
    scenario_name: str
    order: int
    inputs: Dict[str, Any] = {}
    outputs: Dict[str, Any] = {}
    created_at: str
    updated_at: str


class ScenarioUpdateInputs(BaseModel):
    """Request model for updating scenario inputs"""
    inputs: Dict[str, Any] = Field(..., description="User input data")


class ScenarioUpdateOutputs(BaseModel):
    """Request model for updating scenario outputs"""
    outputs: Dict[str, Any] = Field(..., description="Calculation results")


class ScenarioUpdate(BaseModel):
    """Request model for updating scenario (inputs and/or outputs)"""
    scenario_name: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    outputs: Optional[Dict[str, Any]] = None


# ==================== COMBINED MODELS ====================

class ProjectCreateResponse(BaseModel):
    """Response when creating a new project with auto-created Scenario 1"""
    project_id: str
    project_name: str
    user_id: str
    created_at: str
    scenarios: List[ScenarioResponse]


# Update forward references
ProjectWithScenariosResponse.model_rebuild()

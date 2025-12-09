# app/schemas/project_schema.py

from typing import List, Optional
from pydantic import Field
from uuid import UUID
from datetime import datetime

from app.schemas.base import CamelCaseBaseModel
from .master_data_schema import ProcessTechnologySchema, FeedstockSchema, CountrySchema
# This import is now SAFE because scenario_schema.py doesn't import project_schema anymore
from .scenario_schema import ScenarioResponse 

# ==================== PROJECT SCHEMAS ====================

class ProjectBase(CamelCaseBaseModel):
    pass

class ProjectCreate(ProjectBase):
    project_name: str = Field(..., min_length=1, max_length=100)
    initial_process_id: Optional[int] = None
    initial_feedstock_id: Optional[int] = None
    initial_country_id: Optional[int] = None

class ProjectUpdate(ProjectBase):
    project_name: Optional[str] = Field(None, min_length=1, max_length=100)
    initial_process_id: Optional[int] = None
    initial_feedstock_id: Optional[int] = None
    initial_country_id: Optional[int] = None

class ProjectResponse(ProjectBase):
    id: UUID
    user_id: UUID
    project_name: str
    initial_process: Optional[ProcessTechnologySchema] = None
    initial_feedstock: Optional[FeedstockSchema] = None
    initial_country: Optional[CountrySchema] = None
    scenario_count: int = 0
    created_at: datetime
    updated_at: datetime

class ProjectWithScenariosResponse(ProjectResponse):
    # Removed quotes around ScenarioResponse as it is imported above
    scenarios: List[ScenarioResponse]
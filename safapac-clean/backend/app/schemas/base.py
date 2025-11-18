# app/schemas/base.py (NEW FILE)
from pydantic import BaseModel
from pydantic.alias_generators import to_camel

class CamelCaseBaseModel(BaseModel):
    class Config:
        alias_generator = to_camel
        populate_by_name = True # Allows input assignment by both snake_case and camelCase
        allow_population_by_field_name = True
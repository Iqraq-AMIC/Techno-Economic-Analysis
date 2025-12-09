# app/schemas/user_schema.py

from typing import Optional
from pydantic import BaseModel, Field
from uuid import UUID
from app.schemas.base import CamelCaseBaseModel

# ==================== AUTH SCHEMAS ====================

class UserSchema(CamelCaseBaseModel):
    id: UUID
    name: str
    email: str
    access_level: str

class LoginRequest(CamelCaseBaseModel):
    email: str = Field(..., format="email")
    password: str = Field(..., min_length=1)

class LoginResponse(CamelCaseBaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserSchema
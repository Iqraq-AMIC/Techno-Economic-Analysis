# app/schemas/user_schema.py

from typing import Optional, Literal
from pydantic import BaseModel, Field, EmailStr
from uuid import UUID
from app.schemas.base import CamelCaseBaseModel

# ==================== AUTH SCHEMAS ====================

class UserSchema(CamelCaseBaseModel):
    id: UUID
    name: str
    email: str
    access_level: str
    occupation: Optional[str] = None

class LoginRequest(CamelCaseBaseModel):
    email: str = Field(..., format="email")
    password: str = Field(..., min_length=1)

class LoginResponse(CamelCaseBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserSchema

class RefreshTokenRequest(CamelCaseBaseModel):
    refresh_token: str

class RefreshTokenResponse(CamelCaseBaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class RegisterRequest(CamelCaseBaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=72)
    occupation: Literal["student", "researcher"] = Field(...)

class RegisterResponse(CamelCaseBaseModel):
    message: str
    user: UserSchema
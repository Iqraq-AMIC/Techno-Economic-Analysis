# app/api/endpoints/auth.py

from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import (
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
# --- MODIFIED IMPORTS ---
from app.schemas.user_schema import LoginRequest, LoginResponse, UserSchema
from app.models.user_project import User # Corrected model import

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== AUTH ENDPOINTS ====================

@router.post("/login", response_model=LoginResponse)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
):
    """User login endpoint with JWT token generation."""
    try:
        # Find user by email
        stmt = select(User).where(User.email == login_data.email)
        user = db.execute(stmt).scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Ensure password length is within bcrypt limits
        password_to_check = login_data.password
        if len(password_to_check) > 72:
            password_to_check = password_to_check[:72]
            logger.warning(f"Password truncated for user {login_data.email}")

        # Verify password
        if not verify_password(password_to_check, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )

        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        # Create user schema
        user_schema = UserSchema(
            id=user.id,
            name=user.name,
            email=user.email,
            access_level=user.access_level
        )

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user=user_schema
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Login failed"
        )
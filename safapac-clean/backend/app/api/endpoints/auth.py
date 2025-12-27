# app/api/endpoints/auth.py

from datetime import timedelta
import logging

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)
# --- MODIFIED IMPORTS ---
from app.schemas.user_schema import (
    LoginRequest, LoginResponse, UserSchema,
    RegisterRequest, RegisterResponse,
    RefreshTokenRequest, RefreshTokenResponse
)
from app.models.user_project import User
from app.core.security import get_password_hash

logger = logging.getLogger(__name__)

router = APIRouter()

# ==================== AUTH ENDPOINTS ====================

@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """User login endpoint with JWT token generation. Rate limit: 5 attempts per minute per IP."""
    # Apply rate limiting to prevent brute force attacks
    limiter = request.app.state.limiter
    await limiter.check_request(request, "5/minute")
    try:
        # Find user by email
        stmt = select(User).where(User.email == login_data.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

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

        # Create refresh token
        refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Store refresh token in database
        user.refresh_token = refresh_token
        await db.commit()

        # Create user schema
        user_schema = UserSchema(
            id=user.id,
            name=user.name,
            email=user.email,
            access_level=user.access_level
        )

        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
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


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """User registration endpoint. Rate limit: 3 registrations per hour per IP."""
    # Apply rate limiting to prevent spam registrations
    limiter = request.app.state.limiter
    await limiter.check_request(request, "3/hour")
    try:
        # Check if email already exists
        stmt = select(User).where(User.email == register_data.email)
        result = await db.execute(stmt)
        existing_user = result.scalar_one_or_none()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Email already registered"
            )

        # Hash the password
        password_hash = get_password_hash(register_data.password)

        # Create new user
        new_user = User(
            name=register_data.name,
            email=register_data.email,
            password_hash=password_hash,
            access_level="CORE",  # Default access level for new registrations
            occupation=register_data.occupation
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Create user schema for response
        user_schema = UserSchema(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            access_level=new_user.access_level,
            occupation=new_user.occupation
        )

        return RegisterResponse(
            message="Registration successful",
            user=user_schema
        )

    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        logger.error(f"Registration error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration failed"
        )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_access_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Refresh access token using a valid refresh token. Rate limit: 10 refreshes per minute per IP."""
    # Apply rate limiting
    limiter = request.app.state.limiter
    await limiter.check_request(request, "10/minute")
    try:
        # Verify the refresh token and extract user_id
        user_id = verify_refresh_token(refresh_data.refresh_token)

        # Get user from database
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )

        # Verify the refresh token matches the one stored in the database
        if user.refresh_token != refresh_data.refresh_token:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token"
            )

        # Create new access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(user.id)}, expires_delta=access_token_expires
        )

        # Create new refresh token
        new_refresh_token = create_refresh_token(data={"sub": str(user.id)})

        # Update refresh token in database
        user.refresh_token = new_refresh_token
        await db.commit()

        return RefreshTokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
            token_type="bearer"
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Token refresh error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

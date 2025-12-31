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
    RefreshTokenRequest, RefreshTokenResponse,
    VerifyEmailRequest, VerifyEmailResponse,
    ResendVerificationRequest, ResendVerificationResponse
)
from app.models.user_project import User
from app.core.security import get_password_hash
from app.core.email import (
    generate_verification_token,
    get_verification_token_expiry,
    send_verification_email,
    send_resend_verification_email
)

logger = logging.getLogger(__name__)

router = APIRouter()

# Get limiter from request - will be accessed via decorator
def get_limiter():
    """Import limiter lazily to avoid circular imports."""
    from slowapi import Limiter
    from slowapi.util import get_remote_address
    return Limiter(key_func=get_remote_address)

# Create a module-level limiter instance
from slowapi import Limiter
from slowapi.util import get_remote_address
limiter = Limiter(key_func=get_remote_address)

# ==================== AUTH ENDPOINTS ====================

@router.post("/login", response_model=LoginResponse)
@limiter.limit("5/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """User login endpoint with JWT token generation. Rate limit: 5 attempts per minute per IP."""
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

        # Check if email is verified
        if not user.email_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Please verify your email before signing in."
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
@limiter.limit("3/hour")
async def register(
    request: Request,
    register_data: RegisterRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """User registration endpoint. Rate limit: 3 registrations per hour per IP."""
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

        # Generate verification token
        verification_token = generate_verification_token()
        verification_expires = get_verification_token_expiry()

        # Create new user
        new_user = User(
            name=register_data.name,
            email=register_data.email,
            password_hash=password_hash,
            access_level="CORE",  # Default access level for new registrations
            occupation=register_data.occupation,
            email_verified=False,
            verification_token=verification_token,
            verification_token_expires=verification_expires
        )

        db.add(new_user)
        await db.commit()
        await db.refresh(new_user)

        # Send verification email (non-blocking, don't fail registration if email fails)
        try:
            await send_verification_email(
                email=new_user.email,
                name=new_user.name,
                token=verification_token
            )
        except Exception as email_error:
            logger.warning(f"Failed to send verification email: {email_error}")

        # Create user schema for response
        user_schema = UserSchema(
            id=new_user.id,
            name=new_user.name,
            email=new_user.email,
            access_level=new_user.access_level,
            occupation=new_user.occupation
        )

        return RegisterResponse(
            message="Registration successful. Please check your email to verify your account.",
            user=user_schema,
            requires_verification=True
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
@limiter.limit("10/minute")
async def refresh_access_token(
    request: Request,
    refresh_data: RefreshTokenRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Refresh access token using a valid refresh token. Rate limit: 10 refreshes per minute per IP."""
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


@router.post("/verify-email", response_model=VerifyEmailResponse)
@limiter.limit("10/minute")
async def verify_email(
    request: Request,
    verify_data: VerifyEmailRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Verify user's email address using the token from verification email."""
    try:
        from datetime import datetime

        # Find user with matching verification token
        stmt = select(User).where(User.verification_token == verify_data.token)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        if not user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired verification token"
            )

        # Check if token is expired
        if user.verification_token_expires and user.verification_token_expires < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new verification email."
            )

        # Check if already verified
        if user.email_verified:
            return VerifyEmailResponse(
                message="Email is already verified",
                verified=True
            )

        # Mark email as verified
        user.email_verified = True
        user.verification_token = None
        user.verification_token_expires = None
        await db.commit()

        return VerifyEmailResponse(
            message="Email verified successfully! You can now sign in.",
            verified=True
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Email verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Email verification failed"
        )


@router.post("/resend-verification", response_model=ResendVerificationResponse)
@limiter.limit("3/hour")
async def resend_verification(
    request: Request,
    resend_data: ResendVerificationRequest,
    db: AsyncSession = Depends(get_async_db)
):
    """Resend verification email. Rate limit: 3 requests per hour per IP."""
    try:
        # Find user by email
        stmt = select(User).where(User.email == resend_data.email)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()

        # Always return success message to prevent email enumeration
        success_message = "If an account exists with this email, a verification email has been sent."

        if not user:
            return ResendVerificationResponse(message=success_message)

        # Check if already verified
        if user.email_verified:
            return ResendVerificationResponse(
                message="Email is already verified. You can sign in."
            )

        # Generate new verification token
        new_token = generate_verification_token()
        new_expires = get_verification_token_expiry()

        user.verification_token = new_token
        user.verification_token_expires = new_expires
        await db.commit()

        # Send new verification email
        try:
            await send_resend_verification_email(
                email=user.email,
                name=user.name,
                token=new_token
            )
        except Exception as email_error:
            logger.warning(f"Failed to resend verification email: {email_error}")

        return ResendVerificationResponse(message=success_message)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Resend verification error: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to resend verification email"
        )

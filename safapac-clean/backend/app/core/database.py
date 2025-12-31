# app/core/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from typing import Generator, AsyncGenerator
import logging

# CRITICAL: Import Base and config
from app.core.base_model import Base
from app.core.config import SQLALCHEMY_DATABASE_URL, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME

# Setup logging
logger = logging.getLogger(__name__)

# CRITICAL: Import the models module here to register all ORM classes with Base.metadata.
# This must be done before Base.metadata.create_all is called.
import app.models.master_data
import app.models.unit_mgmt
import app.models.user_project


# -----------------------------------------------------------------------------
# 1. SYNC DATABASE ENGINE AND SESSION SETUP (with Connection Pool - P1)
# -----------------------------------------------------------------------------

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False,  # Set to False for production
    connect_args={"options": "-csearch_path=public"},
    # P1: Connection Pool Configuration
    pool_size=20,              # Number of permanent connections
    max_overflow=10,           # Additional connections when pool is full
    pool_timeout=30,           # Seconds to wait for connection
    pool_recycle=3600,         # Recycle connections after 1 hour
    pool_pre_ping=True,        # Verify connection health before use
)

# Configure the SessionLocal object to be used for all database interactions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for API routes to get a synchronous database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# -----------------------------------------------------------------------------
# 2. ASYNC DATABASE ENGINE AND SESSION SETUP (P2 - Option A)
# -----------------------------------------------------------------------------

# Async database URL for asyncpg driver
ASYNC_DATABASE_URL = (
    f"postgresql+asyncpg://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)

async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    echo=False,  # Set to False for production
    # P1: Connection Pool Configuration (same settings)
    pool_size=20,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=3600,
    pool_pre_ping=True,
)

# Async session factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)

async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for API routes to get an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


# -----------------------------------------------------------------------------
# 3. INITIALIZATION HOOKS (Table Creation)
# -----------------------------------------------------------------------------

def create_tables():
    """Creates all database tables defined in Base.metadata."""
    logger.info("Attempting to create database tables...")

    try:
        # Use a connection to explicitly manage DDL transaction
        with engine.begin() as connection:
            Base.metadata.create_all(connection)

        logger.info("Database tables created successfully.")

    except Exception as e:
        logger.error(f"FATAL ERROR: Table creation failed. Check PostgreSQL permissions/logs.", exc_info=True)
        raise

# NOTE: The old 'initialize_database' and 'seed_database' functions are now
# moved to the new 'app/core/seeding.py' file.

# app/core/database.py

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Generator
import logging
from sqlalchemy.exc import IntegrityError # Keep for reference, though errors are handled in seeding.py now

# CRITICAL: Import Base and config
from app.core.base_model import Base
from app.core.config import SQLALCHEMY_DATABASE_URL # <<< NEW: Get URL from config

# Setup logging
logger = logging.getLogger(__name__)

# CRITICAL: Import the models module here to register all ORM classes with Base.metadata.
# This must be done before Base.metadata.create_all is called.
import app.models.master_data
import app.models.unit_mgmt 
import app.models.user_project 


# -----------------------------------------------------------------------------
# 1. DATABASE ENGINE AND SESSION SETUP
# -----------------------------------------------------------------------------

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    echo=False, # Set to False for production
    connect_args={"options": "-csearch_path=public"} 
)

# Configure the SessionLocal object to be used for all database interactions.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db() -> Generator[Session, None, None]:
    """Dependency for API routes to get a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -----------------------------------------------------------------------------
# 2. INITIALIZATION HOOKS (Table Creation)
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
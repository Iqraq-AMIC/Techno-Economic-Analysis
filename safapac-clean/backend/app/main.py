from fastapi import FastAPI, HTTPException
# app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
# CORRECTED: New Import for DB Setup - already correct
from app.core.seeding import initialize_database
# CORRECTED: Router import - the local import name should match the module structure
# It is better practice to import directly as the variable name 'router'
from app.api.endpoints.projects import router as projects_router # <<< Renamed for clarity
import logging
import time
import csv
import os
import hashlib
from pathlib import Path
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- FastAPI App Initialization ---
app = FastAPI(
    title="SAFAPAC API",
    description="Sustainable Aviation Fuel Analysis Platform and Cost Calculator Backend",
    version="2.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True, 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()

    logger.info(f"Incoming request: {request.method} {request.url}")

    response = await call_next(request)

    duration = time.time() - start_time
    logger.info(f"Completed {request.method} {request.url} in {duration:.2f}s with status {response.status_code}")

    return response

# --- Database Initialization Hook ---
@app.on_event("startup")
def on_startup():
    """Initializes tables and seeds master data upon application startup."""
    # NOTE: initialize_database() function now handles both table creation and seeding
    logger.info("Initializing database...")
    initialize_database()
    logger.info("Database initialized and seeded successfully.")

# --- API Routers ---
# MODIFIED: Use the clearly named 'projects_router'
app.include_router(projects_router, prefix="/api/v1/projects", tags=["projects"])

# --- Health Check Endpoint ---
@app.get("/health", summary="Health Check")
def health_check():
    return {"status": "ok", "message": "SAFAPAC API is running"}
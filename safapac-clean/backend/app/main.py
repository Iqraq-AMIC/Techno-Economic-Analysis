# app/main.py

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
import time

# Database and seeding
from app.core.seeding import initialize_database
from app.core.database import create_tables

# Routers
from app.api.endpoints.master_data import router as master_data_router
from app.api.endpoints.auth import router as auth_router
from app.api.endpoints.projects_endpoints import router as projects_router
from app.api.endpoints.scenarios_endpoints import router as scenarios_router

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# --- Rate Limiter Configuration ---
limiter = Limiter(key_func=get_remote_address)

# --- FastAPI App Initialization ---
app = FastAPI(
    title="SAFAPAC API",
    description="Sustainable Aviation Fuel Analysis Platform and Cost Calculator Backend",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Attach limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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

# Include routers
app.include_router(master_data_router, prefix="/api/v1", tags=["Master Data"])
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(projects_router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(scenarios_router, prefix="/api/v1/projects/{project_id}/scenarios", tags=["Scenarios"])
# 1. KEEP this for hierarchical access (listing scenarios by project)
app.include_router(
    scenarios_router, 
    prefix="/api/v1/projects/{project_id}/scenarios", 
    tags=["Scenarios"]
)

# 2. ADD this for direct access (getting/updating a specific scenario by ID)
# This matches the frontend expectation: axios.get(.../scenarios/${scenarioId})
app.include_router(
    scenarios_router, 
    prefix="/api/v1/scenarios", 
    tags=["Scenarios Direct"]
)

# Health check endpoint
@app.get("/")
async def root():
    return {
        "message": "SAFAPAC API Server",
        "version": "2.0.0",
        "status": "running"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

# Database initialization on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing SAFAPAC API Server...")
    try:
        # Create database tables
        create_tables()
        logger.info("Database tables created/verified")
        
        # Seed database with initial data
        initialize_database()
        logger.info("Database seeding completed")
        
    except Exception as e:
        logger.error(f"Startup initialization failed: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down SAFAPAC API Server...")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting API server at http://127.0.0.1:8000 ...")
    uvicorn.run(
        "app.main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
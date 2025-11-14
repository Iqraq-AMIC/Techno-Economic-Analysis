# app/core/config.py

import os
from dotenv import load_dotenv

# Load environment variables from a .env file (optional, but good practice)
load_dotenv()

# --- 1. DATABASE CONFIGURATION ---
# Load the database URL from an environment variable.
# Fallback to the hardcoded URL is only for initial development/testing.
# In production, this should always come from the environment.
SQLALCHEMY_DATABASE_URL = os.getenv(
    "SQLALCHEMY_DATABASE_URL",
    "postgresql://postgres:Safapac2025@safapac-instance-dev-only.coh4oqko8ir5.us-east-1.rds.amazonaws.com:5432/safapac_db"
)

# You can add other configurations here as needed
# e.g., SECRET_KEY, API_VERSION, etc.
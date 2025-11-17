# app/core/config.py

import os
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

# --- 1. DATABASE CONFIGURATION COMPONENTS ---
# CRITICAL: We use os.environ[] or os.getenv() without a default.
# If these variables are not set in the environment (e.g., in the .env file), 
# the program will raise a KeyError/TypeError immediately upon startup, 
# preventing accidental use of exposed defaults.

try:
    DB_USER = os.environ["DB_USER"]
    DB_PASSWORD = os.environ["DB_PASSWORD"] 
    DB_HOST = os.environ["DB_HOST"]
    DB_PORT = os.environ["DB_PORT"]
    DB_NAME = os.environ["DB_NAME"]
except KeyError as e:
    # This provides a helpful error message if a critical variable is missing
    raise EnvironmentError(
        f"Missing required environment variable for database connection: {e}. "
        "Ensure your .env file is correctly set up."
    )

# --- 2. CONSTRUCT DATABASE URL ---
# Construct the full URL using the components loaded from the environment.
SQLALCHEMY_DATABASE_URL = (
    f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
)
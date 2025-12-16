"""
Startup script for SAFAPAC backend server
"""
import uvicorn
import sys
from pathlib import Path

# Add backend directory to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

if __name__ == "__main__":
    print("Starting SAFAPAC Backend Server...")
    print("API Documentation: http://localhost:8000/docs")
    print("Alternative Docs: http://localhost:8000/redoc")
    print("\nPress CTRL+C to stop the server\n")

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

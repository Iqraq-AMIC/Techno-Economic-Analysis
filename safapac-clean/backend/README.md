# SAFAPAC Backend

FastAPI-based backend for the SAFAPAC platform providing RESTful API endpoints for techno-economic analysis of sustainable aviation fuel production.

## Architecture

The backend is organized into several modules:

### Core Modules

- **main.py**: API server setup, routing, and middleware configuration
- **economics.py**: Biofuel economics calculations including CAPEX, OPEX, and revenue
- **financial_analysis.py**: Financial metrics (NPV, IRR, payback period) and cash flow modeling
- **models.py**: Pydantic models for input validation and data structures
- **database.py**: Process technology database and feedstock information
- **feature_calculations.py**: Advanced feature extraction and calculations

## API Documentation

Once the server is running, visit:
- Interactive API docs: `http://localhost:8000/docs`
- Alternative docs: `http://localhost:8000/redoc`

## Running Tests

```bash
pytest tests/ -v
```

## Configuration

The server runs on port 8000 by default. CORS is enabled for all origins in development mode.

To modify configuration, edit the relevant settings in `app/main.py`.

## Dependencies

See `requirements.txt` for the complete list of dependencies. Key libraries include:
- FastAPI and Uvicorn for the web framework
- Pandas and NumPy for data processing
- Pydantic for data validation

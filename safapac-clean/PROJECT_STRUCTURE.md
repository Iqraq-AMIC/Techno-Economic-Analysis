# SAFAPAC Project Structure

This document provides an overview of the project organization and key files.

## Directory Structure

```
safapac-clean/
├── backend/                           # Backend API application
│   ├── app/                           # Main application package
│   │   ├── __init__.py               # Package initialization
│   │   ├── main.py                   # FastAPI app and endpoints
│   │   ├── economics.py              # Biofuel economics calculations
│   │   ├── financial_analysis.py     # Financial metrics (NPV, IRR, etc.)
│   │   ├── models.py                 # Data models and validation
│   │   ├── database.py               # Process technology database
│   │   └── feature_calculations.py   # Advanced calculations
│   ├── tests/                        # Test suite
│   │   ├── __init__.py
│   │   ├── test_biofuel_economics.py
│   │   ├── test_main_api.py
│   │   └── test_user_inputs.py
│   ├── .gitignore                    # Backend-specific gitignore
│   ├── pytest.ini                    # Pytest configuration
│   ├── requirements.txt              # Python dependencies
│   └── README.md                     # Backend documentation
│
├── frontend/                         # React frontend application
│   ├── public/                       # Static files
│   │   ├── index.html
│   │   └── manifest.json
│   ├── src/                          # Source code
│   │   ├── components/               # Reusable UI components
│   │   │   ├── charts/              # Chart components
│   │   │   ├── layout/              # Layout components
│   │   │   ├── common/              # Common components
│   │   │   └── ...
│   │   ├── contexts/                # React contexts
│   │   │   └── ThemeContext.js
│   │   ├── forms/                   # Form components
│   │   │   ├── BiofuelForm.js      # Main input form
│   │   │   └── CashFlowTable.js    # Results table
│   │   ├── layouts/                 # Page layouts
│   │   │   └── Default.js
│   │   ├── views/                   # Page views
│   │   │   ├── BlogPosts.js        # Main analysis view
│   │   │   └── Tables.js
│   │   ├── utils/                   # Utility functions
│   │   ├── flux/                    # State management
│   │   ├── App.js                   # Root component
│   │   ├── routes.js                # Route configuration
│   │   └── index.js                 # Entry point
│   ├── .env.development             # Development environment
│   ├── .env.production              # Production environment
│   ├── .gitignore                   # Frontend-specific gitignore
│   ├── package.json                 # Node dependencies
│   └── README.md                    # Frontend documentation
│
├── docs/                            # Documentation (reserved)
│
├── .editorconfig                    # Editor configuration
├── .gitignore                       # Root gitignore
├── CONTRIBUTING.md                  # Contribution guidelines
├── LICENSE                          # MIT License
├── QUICKSTART.md                    # Quick start guide
├── README.md                        # Main project documentation
└── run_backend.py                   # Backend startup script

```

## Key Files

### Backend Core Files

- **app/main.py**: API server with endpoints for process selection, feedstock info, and calculations
- **app/economics.py**: Core techno-economic analysis logic
- **app/financial_analysis.py**: Financial metrics calculation (NPV, IRR, payback period)
- **app/models.py**: Pydantic models for input validation
- **app/database.py**: Process technology and feedstock database

### Frontend Core Files

- **src/forms/BiofuelForm.js**: Main user input form
- **src/forms/CashFlowTable.js**: Results display component
- **src/views/BlogPosts.js**: Primary analysis view
- **src/routes.js**: Application routing
- **src/App.js**: Root application component

### Configuration Files

- **backend/requirements.txt**: Python dependencies
- **frontend/package.json**: Node.js dependencies
- **backend/pytest.ini**: Test configuration
- **.editorconfig**: Code style configuration
- **.gitignore**: Git ignore patterns

## API Endpoints

The backend exposes the following REST API endpoints:

- `GET /processes` - List all process technologies
- `GET /feedstocks/{process}` - Get feedstocks for a process
- `GET /feedstock/{feedstock_name}` - Get feedstock details
- `POST /calculate` - Perform techno-economic analysis

## Testing

Tests are located in `backend/tests/`:
- Unit tests for economic calculations
- Integration tests for API endpoints
- Input validation tests

Run with: `pytest tests/ -v`

## Development Workflow

1. Backend runs on port 8000
2. Frontend runs on port 3000
3. Frontend makes API calls to backend
4. Both support hot-reload for development

## Technology Stack Summary

**Backend:**
- FastAPI (Web framework)
- Pydantic (Data validation)
- Pandas/NumPy (Data processing)
- Uvicorn (ASGI server)

**Frontend:**
- React (UI library)
- Shards Dashboard (UI framework)
- Chart.js (Visualization)
- React Router (Routing)

# SAFAPAC - Sustainable Aviation Fuel Analysis Platform and Cost Calculator

A comprehensive techno-economic analysis platform for evaluating sustainable aviation fuel (SAF) production pathways. This application provides detailed cost analysis, financial modeling, and feasibility assessment for various biofuel production technologies.

## Features

- **Multiple Process Technologies**: Support for various SAF production pathways
- **Feedstock Analysis**: Comprehensive feedstock evaluation and yield calculations
- **Techno-Economic Analysis**: Detailed cost breakdown including CAPEX and OPEX
- **Financial Modeling**: NPV, IRR, and payback period calculations
- **Cash Flow Analysis**: Year-by-year financial projections
- **Interactive Dashboard**: User-friendly React-based interface

## Project Structure

```
safapac-clean/
├── backend/                 # FastAPI backend application
│   ├── app/
│   │   ├── main.py         # API endpoints and server configuration
│   │   ├── economics.py    # Techno-economic calculations
│   │   ├── financial_analysis.py  # Financial metrics and analysis
│   │   ├── models.py       # Data models and input validation
│   │   ├── database.py     # Process technology database
│   │   └── feature_calculations.py  # Feature extraction and calculations
│   ├── tests/              # Backend test suite
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── views/          # Page views
│   │   ├── forms/          # Input forms
│   │   └── layouts/        # Layout components
│   ├── public/             # Static assets
│   └── package.json        # Node dependencies
└── docs/                   # Documentation

```

## Installation

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the development server:
```bash
cd app
uvicorn main:app --reload
```

The API will be available at `http://localhost:8000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will be available at `http://localhost:3000`

## API Endpoints

- `GET /processes` - List all available process technologies
- `GET /feedstocks/{process}` - Get feedstocks for a specific process
- `GET /feedstock/{feedstock_name}` - Get detailed feedstock information
- `POST /calculate` - Perform techno-economic analysis

## Technology Stack

### Backend
- FastAPI - Modern Python web framework
- Pydantic - Data validation and settings management
- Pandas - Data manipulation and analysis
- NumPy - Numerical computing
- Uvicorn - ASGI server

### Frontend
- React - UI library
- Shards Dashboard - UI component framework
- Chart.js - Data visualization
- React Router - Client-side routing

## Testing

Run backend tests:
```bash
cd backend
pytest tests/
```

## Development

### Backend Development
The backend follows a modular architecture with clear separation of concerns:
- `main.py` - API routing and middleware
- `economics.py` - Core economic calculations
- `financial_analysis.py` - Financial metrics
- `models.py` - Data validation and type safety
- `database.py` - Data access layer

### Frontend Development
The frontend uses a component-based architecture with:
- Reusable components in `components/`
- Page-level views in `views/`
- Form components in `forms/`
- Centralized routing in `routes.js`

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

This project is developed for research and educational purposes.

## Contact

For questions or support, please open an issue on GitHub.

# Quick Start Guide

Get SAFAPAC up and running in minutes.

## Prerequisites

- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn

## Quick Setup

### 1. Backend Setup (Terminal 1)

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
cd app
uvicorn main:app --reload
```

Or use the convenience script from the root directory:
```bash
python run_backend.py
```

The API will be running at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### 2. Frontend Setup (Terminal 2)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start the development server
npm start
```

The application will open at: `http://localhost:3000`

On first load you will see the login page. Use a credential from `backend/pw.csv`:

- Use the value in the **“Suggested Password”** column as your password.
- For simplicity during development, you can enter the same value in both the username and password fields.

## Verify Installation

1. Open `http://localhost:8000/docs` - You should see the API documentation
2. Open `http://localhost:3000` - You should see the login page
3. Log in using a credential from `backend/pw.csv` (see note above)
4. When prompted, create a new project and Scenario 1
5. On the TEA dashboard, select a process technology and feedstock
6. Submit a calculation to verify the full stack is working

## Troubleshooting

### Backend Issues
- **Port 8000 already in use**: Stop any other processes using port 8000 or modify the port in `run_backend.py`
- **Module not found**: Ensure virtual environment is activated and dependencies are installed
- **Database errors**: Check that required data files are present in the backend directory

### Frontend Issues
- **Port 3000 already in use**: The development server will prompt to use a different port
- **npm install fails**: Try clearing npm cache with `npm cache clean --force` and retry
- **Build errors**: Ensure Node.js version is 14 or higher

### Connection Issues
- Ensure both backend and frontend are running
- Check that the backend URL in frontend configuration matches your setup
- Verify no firewall is blocking the connections

## Next Steps

- Read the full [README.md](README.md) for detailed documentation
- Check [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines
- Explore the API at `http://localhost:8000/docs`

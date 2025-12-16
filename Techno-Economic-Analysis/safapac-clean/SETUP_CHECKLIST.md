# Setup Checklist

Use this checklist to ensure proper setup of the SAFAPAC project.

## Initial Setup

### Prerequisites
- [ ] Python 3.8+ installed (`python --version`)
- [ ] Node.js 14+ installed (`node --version`)
- [ ] npm or yarn installed (`npm --version`)
- [ ] Git installed (optional, for version control)

### Backend Setup
- [ ] Navigate to `backend/` directory
- [ ] Create virtual environment: `python -m venv venv`
- [ ] Activate virtual environment
  - [ ] Windows: `venv\Scripts\activate`
  - [ ] Linux/Mac: `source venv/bin/activate`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Verify installation: All packages installed without errors
- [ ] Test backend: `cd app && uvicorn main:app --reload`
- [ ] Check API docs: Open `http://localhost:8000/docs`

### Frontend Setup
- [ ] Navigate to `frontend/` directory
- [ ] Install dependencies: `npm install`
- [ ] Verify installation: No errors during installation
- [ ] Start dev server: `npm start`
- [ ] Check app: Browser opens to `http://localhost:3000`

## Verification

### Backend Verification
- [ ] API server starts without errors
- [ ] API documentation is accessible at `/docs`
- [ ] `/processes` endpoint returns data
- [ ] No import errors in console
- [ ] Server responds to requests

### Frontend Verification
- [ ] App loads in browser
- [ ] No console errors
- [ ] UI components render correctly
- [ ] Can navigate between pages
- [ ] Forms are interactive

### Integration Verification
- [ ] Backend running on port 8000
- [ ] Frontend running on port 3000
- [ ] Frontend can connect to backend
- [ ] Can select process technology
- [ ] Can select feedstock
- [ ] Can submit calculation
- [ ] Results display correctly

## Development Workflow

### Daily Development
- [ ] Activate backend virtual environment
- [ ] Start backend server (Terminal 1)
- [ ] Start frontend dev server (Terminal 2)
- [ ] Open browser to `http://localhost:3000`
- [ ] Make changes and test
- [ ] Run tests before committing

### Before Committing
- [ ] Code follows style guidelines
- [ ] All tests pass: `pytest backend/tests/ -v`
- [ ] No console errors
- [ ] Documentation updated if needed
- [ ] Meaningful commit message prepared

## Git Setup (Optional)

- [ ] Initialize repository: `git init`
- [ ] Add all files: `git add .`
- [ ] Initial commit: `git commit -m "Initial commit"`
- [ ] Create GitHub repository
- [ ] Add remote: `git remote add origin <url>`
- [ ] Push to GitHub: `git push -u origin main`

## Production Deployment (Future)

- [ ] Environment variables configured
- [ ] Database set up (if applicable)
- [ ] Backend deployed
- [ ] Frontend built: `npm run build`
- [ ] Frontend deployed
- [ ] API endpoint configured in frontend
- [ ] SSL certificates installed
- [ ] Monitoring set up

## Troubleshooting

If you encounter issues, check:

- [ ] Virtual environment is activated
- [ ] All dependencies installed correctly
- [ ] Ports 8000 and 3000 are not in use
- [ ] No firewall blocking connections
- [ ] Environment variables set correctly
- [ ] Python/Node versions meet requirements

## Resources

- Main README: [README.md](README.md)
- Quick Start: [QUICKSTART.md](QUICKSTART.md)
- Project Structure: [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md)
- Migration Notes: [MIGRATION_NOTES.md](MIGRATION_NOTES.md)
- Contributing: [CONTRIBUTING.md](CONTRIBUTING.md)

## Support

If you need help:
1. Check documentation files listed above
2. Review API docs at `http://localhost:8000/docs`
3. Check console for error messages
4. Open an issue on GitHub

---

**Once all items are checked, you're ready to develop!**

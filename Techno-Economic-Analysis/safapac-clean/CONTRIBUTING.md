# Contributing to SAFAPAC

Thank you for your interest in contributing to SAFAPAC! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Create a new branch for your feature or bugfix
4. Make your changes
5. Test your changes thoroughly
6. Submit a pull request

## Development Setup

### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend
```bash
cd frontend
npm install
```

## Code Style

### Python (Backend)
- Follow PEP 8 guidelines
- Use type hints where appropriate
- Write docstrings for functions and classes
- Keep functions focused and modular

### JavaScript (Frontend)
- Use ES6+ syntax
- Follow React best practices
- Use functional components with hooks
- Keep components small and reusable

## Testing

### Backend Tests
```bash
cd backend
pytest tests/ -v
```

All new features should include appropriate tests.

## Pull Request Process

1. Update the README.md with details of changes if applicable
2. Ensure all tests pass
3. Update documentation as needed
4. Request review from maintainers

## Reporting Issues

When reporting issues, please include:
- A clear description of the issue
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Python/Node version, etc.)

## Questions?

Feel free to open an issue for any questions or clarifications.

# SAFAPAC Frontend

React-based frontend application for the SAFAPAC platform, providing an interactive dashboard for sustainable aviation fuel analysis.

## Features

- Interactive biofuel production analysis forms
- Real-time calculation results
- Financial metrics visualization
- Cash flow tables and charts
- Process technology and feedstock selection

## Available Scripts

### `npm start`
Runs the app in development mode at [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

## Project Structure

```
src/
├── components/       # Reusable UI components
│   ├── charts/      # Chart components
│   ├── layout/      # Layout components (navbar, sidebar, footer)
│   └── ...
├── forms/           # Form components for data input
├── views/           # Page-level view components
├── layouts/         # Layout wrappers
├── contexts/        # React context providers
└── routes.js        # Route configuration
```

## Configuration

Environment variables can be set in:
- `.env.development` - Development environment
- `.env.production` - Production environment

## Backend Integration

The frontend connects to the backend API. Ensure the backend is running at the configured API URL before starting the frontend.

Default API URL: `http://localhost:8000`

## UI Framework

This project uses Shards Dashboard Lite React, a modern and responsive dashboard template built with:
- React
- Bootstrap 4
- Shards React components

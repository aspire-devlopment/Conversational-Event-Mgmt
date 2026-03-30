# Local Run Guide

This guide is for users who want to run the app locally without Docker and without manually typing `npm start`.

## Prerequisites

- Node.js installed
- PostgreSQL installed and running
- backend environment file present at:
  - [backend/.env](/e:/AI-Conversational/backend/.env)

## One-Click Local Run

Use:

- [run-local.bat](/e:/AI-Conversational/run-local.bat)

What it does:

- checks that Node.js exists
- checks that `backend/.env` exists
- installs backend dependencies if needed
- installs frontend dependencies if needed
- opens backend in one terminal window
- opens frontend in another terminal window
- opens the browser to `http://localhost:3000`

## Stop Local Run

Use:

- [stop-local.bat](/e:/AI-Conversational/stop-local.bat)

This closes the backend and frontend command windows started by `run-local.bat`.

## URLs

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:5000`

## Notes

- PostgreSQL must already be running locally
- the values in `backend/.env` must match your local PostgreSQL setup
- if dependencies are already installed, the launcher skips reinstalling them

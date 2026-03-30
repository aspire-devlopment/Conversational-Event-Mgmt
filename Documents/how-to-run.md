# How to Run the Project

## 1. Overview

This document explains how to run the AI Conversational Event Management System in three ways:

1. Using Docker
2. Without Docker
3. Using the provided `run-local.bat` file

The project consists of:

- a React frontend
- a Node.js/Express backend
- a PostgreSQL database

---

## 2. Prerequisites

Before running the project, make sure the following are available on your system:

- Node.js
- npm
- PostgreSQL, if you are running without Docker
- Docker Desktop, if you are running with Docker

You should also have the required environment variables configured in `backend/.env`.

### Required project packages

The project relies on the following main package groups:

- Backend runtime packages:
  - `express`
  - `pg`
  - `jsonwebtoken`
  - `bcrypt`
  - `cors`
  - `helmet`
  - `dotenv`
  - `uuid`
  - `openai`
- Frontend runtime packages:
  - `react`
  - `react-dom`
  - `react-router-dom`
  - `lucide-react`
- Development tools:
  - `nodemon` for backend auto-reload
  - `react-scripts` for the frontend build and start process
  - `playwright` for screenshot automation

These packages are already defined in the project `package.json` files, so you normally only need to run `npm install` inside the backend and frontend folders.

### AI provider configuration

The conversational assistant uses the OpenRouter API for model access. The backend reads these environment variables:

- `OPENROUTER_API_KEY` - required API key for AI requests
- `OPENROUTER_MODEL` - optional model name, defaults to `openrouter/auto`
- `OPENROUTER_API_URL` - optional API endpoint override
- `OPENROUTER_TIMEOUT_MS` - optional request timeout

If those values are not set, the service also accepts the fallback names:

- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`

### AI models used

The backend sends chat requests through OpenRouter. In the current setup:

- the default model selector is `openrouter/auto`
- OpenRouter may route the request to a provider model such as `google/gemini-2.5-flash-lite`
- the application still treats OpenRouter as the integration point, not Gemini directly

In practice, you should configure the API key and optional model name in `backend/.env` before starting the backend.

You can also use your own preferred AI model by changing the model setting in the same `.env` file. For example, setting `OPENROUTER_MODEL` lets you switch the model without changing the application code.

---

## 3. Running With Docker

This is the easiest way to start the full application because it starts the database, backend, and frontend together.

### Steps

1. Open a terminal in the project root.
2. Make sure Docker Desktop is running.
3. Start the application:

```bash
docker compose up --build
```

### What this does

- starts PostgreSQL in a container
- initializes the database using `backend/schema.sql`
- starts the backend server
- starts the frontend server

### Access URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

### Notes

- Docker Compose uses the database credentials defined in `docker-compose.yml`.
- If you already have a `postgres_data` volume, the schema file will not run again automatically.
- To apply a fresh schema seed, you may need to recreate the volume.

---

## 4. Running Without Docker

This option is useful if you want to run the frontend and backend directly on your machine.

### 4.1 Start PostgreSQL

Make sure PostgreSQL is running locally and that a database exists for the project.

You may need to:

- create the database manually
- run `backend/schema.sql` against it

### 4.1.1 PostgreSQL schema setup

The database structure is defined in `backend/schema.sql`. It creates the tables and seed data required by the application, including:

- `roles`
- `users`
- `events`
- `event_roles`
- `chat_sessions`
- `idempotency_keys`
- `error_logs`

These tables support:

- authentication and registration
- event creation and listing
- chat session persistence
- role-based visibility
- duplicate request protection
- error auditing

### 4.1.2 Applying the schema manually

When you run the project without Docker, you must initialize the database yourself before starting the backend. A common example is:

```bash
psql -U postgres -d event_management -f backend/schema.sql
```

You can also use a GUI tool such as pgAdmin or DBeaver, as long as the SQL in `backend/schema.sql` is executed against the target database.

### 4.1.3 Why this is required

The backend expects these tables to exist. If the schema is missing, the application cannot:

- authenticate users
- save events
- assign event roles
- store chat sessions
- record idempotency keys
- log errors

### 4.2 Configure Backend Environment

Update `backend/.env` so it points to your local PostgreSQL instance and includes the required keys.

Typical values include:

- database host
- database port
- database name
- database username
- database password
- JWT secret
- AI provider key
- OpenRouter API key and optional model settings

### 4.3 Start the Backend

Open a terminal in the `backend` folder and run:

```bash
npm install
npm run dev
```

If you want to run it in production mode:

```bash
npm start
```

### 4.4 Start the Frontend

Open a separate terminal in the `frontend` folder and run:

```bash
npm install
npm start
```

### 4.5 Access URLs

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

---

## 5. Running With `run-local.bat`

The project includes a Windows batch file for quickly starting the local Node.js-based version.

### File

- [`run-local.bat`](/e:/AI-Conversational/run-local.bat)

### Steps

1. Double-click `run-local.bat`, or run it from Command Prompt.
2. The script checks whether Node.js is available on your machine.
3. It checks that `backend/.env` exists.
4. If `backend/node_modules` is missing, it runs `npm install` in the backend folder.
5. If `frontend/node_modules` is missing, it runs `npm install` in the frontend folder.
6. It starts the backend in one terminal window using `npm start`.
7. It starts the frontend in another terminal window using `npm start`.
8. After a short delay, it opens the browser automatically at `http://localhost:3000`.

### Schema requirement for local mode

`run-local.bat` does not create PostgreSQL tables for you. Before using it, make sure:

- PostgreSQL is running locally
- the project database already exists
- `backend/schema.sql` has already been applied to that database

In short:

- Docker mode creates the schema automatically on first startup
- local mode assumes the schema is already present

### What it is for

This option is useful when you want a one-click way to start the project locally on Windows without typing the setup commands manually.

### How the batch file works

The batch file automates the local startup process:

1. It verifies the required tools are installed.
2. It makes sure dependencies are present.
3. It launches the backend and frontend in separate command windows.
4. It opens the browser on the frontend URL.

This means you do not need to start each service manually when using the batch file.

### When to use it

Use `run-local.bat` when:

- you are on Windows
- you want to run the app without Docker
- you want a simple start button instead of manual commands

### When not to use it

Do not use the batch file if:

- Node.js is not installed
- you want to use the Docker-based startup flow instead
- you need to debug one service independently without the launcher script

---

## 6. Useful Commands

### Backend

```bash
npm install
npm run dev
npm start
npm run seed:test-admin
```

### Frontend

```bash
npm install
npm start
npm run capture:screenshots
```

### Docker

```bash
docker compose up --build
docker compose down
```

---

## 7. Troubleshooting

### Backend does not start

- Check that `backend/.env` is configured correctly.
- Verify that PostgreSQL is reachable.
- Check the terminal output for missing environment variables.

### Frontend cannot reach backend

- Confirm that the backend is running on port `5000`.
- Confirm that `REACT_APP_API_URL` points to the correct API URL.

### Database does not contain seed data

- If using Docker, the schema file only runs automatically on first initialization.
- If using local PostgreSQL, run `backend/schema.sql` manually.

### Docker fails to start

- Make sure Docker Desktop is running.
- Check for port conflicts on `3000` and `5000`.

---

## 8. Summary

The project can be started in three convenient ways:

- Docker for the full containerized setup
- local Node.js execution without Docker
- the provided `run-local.bat` shortcut for Windows users
- the matching `stop-local.bat` shortcut to close the running windows

Each approach ultimately starts the same application stack and supports the same chat-based event management workflow.

# How To Run The Python Backend

## 1. Install Dependencies

```bash
pip install -r python_backend/requirements.txt
```

## 2. Create Environment File

```bash
copy python_backend\.env.example python_backend\.env
```

## 3. Update Environment Values

Set at least:

- PostgreSQL connection values
- JWT secret
- LLM provider configuration

## 4. Stamp The Existing Schema Baseline

```bash
cd python_backend
alembic stamp 0001_baseline_existing_schema
```

## 5. Start The API

```bash
cd python_backend
python run.py
```

## 6. Frontend Connection

Point the React app to:

```env
REACT_APP_API_URL=http://localhost:8000/api
```

## 7. Smoke Test

Suggested checks:

- login
- list events
- create a chat session
- send a chat message
- review logs under `python_backend/logs`

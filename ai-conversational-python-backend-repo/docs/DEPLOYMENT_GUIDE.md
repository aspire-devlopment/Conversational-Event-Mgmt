# Python Backend Deployment Guide

## Production Goals

The Python backend should be deployed with:

- production environment variables
- HTTPS termination at the edge or proxy
- trusted host configuration
- persistent PostgreSQL access
- file and database logging enabled

## Recommended Environment Values

```env
APP_ENV=production
APP_RELOAD=false
FORCE_HTTPS=true
TRUSTED_HOSTS=your-domain.com,www.your-domain.com
LOGS_ROOT=logs
```

## Docker

Build:

```bash
cd python_backend
docker build -t ai-conversational-python-backend .
```

Run:

```bash
docker run --env-file .env -p 8000:8000 ai-conversational-python-backend
```

## Reverse Proxy Notes

- terminate TLS at the proxy
- forward only trusted traffic to the FastAPI container
- expose only the proxy publicly

## Render / Cloud Notes

- keep database credentials and LLM API keys in environment variables
- disable reload in production
- verify `TRUSTED_HOSTS`
- verify CORS origins for the production frontend

## Post-Deploy Checks

- `GET /health`
- authentication login flow
- event list endpoint
- chat session creation
- dated log files under the configured logs root

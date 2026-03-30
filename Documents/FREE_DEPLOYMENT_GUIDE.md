# Free Deployment Guide

This project can be deployed for free with:

- Frontend: Vercel
- Backend: Render
- Database: Neon Postgres

## Recommended Setup

### 1. Database: Neon

Create a free Postgres database on Neon.

After creation, collect:

- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`

Then run the SQL from:

- [schema.sql](/e:/AI-Conversational/backend/schema.sql)

## 2. Backend: Render

This repo includes:

- [render.yaml](/e:/AI-Conversational/render.yaml)

Steps:

1. Push the repo to GitHub
2. In Render, create a new Web Service from the repo
3. Render should detect the settings from `render.yaml`
4. Add the required secret environment variables

Required backend env vars:

- `FRONTEND_URL`
- `JWT_SECRET`
- `DB_HOST`
- `DB_PORT`
- `DB_USER`
- `DB_PASSWORD`
- `DB_NAME`
- `OPENROUTER_API_KEY`

Optional backend env vars:

- `OPENROUTER_MODEL`
- `OPENROUTER_API_URL`
- `OPENROUTER_TIMEOUT_MS`
- `LLM_TEMPERATURE`

After deployment, note your backend URL, for example:

- `https://ai-conversational-backend.onrender.com`

Health check:

- `https://your-backend-url/api/health`

## 3. Frontend: Vercel

This repo includes:

- [vercel.json](/e:/AI-Conversational/vercel.json)

Steps:

1. Import the GitHub repo into Vercel
2. Set the frontend root to the project root or let Vercel use `vercel.json`
3. Add this environment variable:

```bash
REACT_APP_API_URL=https://your-backend-url/api
```

4. Deploy

After deployment, open the Vercel domain in the browser.

## Deployment Order

1. Create Neon database
2. Load `backend/schema.sql`
3. Deploy backend on Render
4. Copy backend URL
5. Deploy frontend on Vercel with `REACT_APP_API_URL`

## Important Free-Tier Notes

- Render free web services sleep after inactivity
- the first request after sleep can be slow
- if the backend URL changes, update `REACT_APP_API_URL` in Vercel and redeploy

## Quick Checklist

- Neon database created
- schema imported
- Render backend deployed
- backend env vars added
- backend health endpoint works
- Vercel frontend deployed
- `REACT_APP_API_URL` points to Render backend
- frontend can log in and call API

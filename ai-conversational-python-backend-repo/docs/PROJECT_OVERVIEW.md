# Python Backend Project Overview

## Purpose

The Python backend is a FastAPI-based alternative backend for the same React frontend and PostgreSQL database used by the existing project.

## What It Covers

- authentication
- admin user management
- event CRUD
- conversational event creation
- structured logging
- middleware-based auth and request tracing
- provider-based LLM integration

## Design Goals

- preserve the frontend API contract
- keep business logic separated from transport concerns
- support professional logging and production hygiene
- remain easy to run locally with PostgreSQL

## Primary Entry Points

- [run.py](/e:/AI-Conversational/python_backend/run.py)
- [main.py](/e:/AI-Conversational/python_backend/app/main.py)
- [README.md](/e:/AI-Conversational/python_backend/README.md)

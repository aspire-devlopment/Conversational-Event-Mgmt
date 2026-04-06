# Python Backend Chat Session Notes

## Overview

The Python backend stores conversational event-building state in the `chat_sessions` table. This allows the frontend to refresh or continue a draft without losing progress immediately.

## Stored Information

Each session stores:

- user ID
- current language
- current step
- mode (`create` or `update`)
- draft event data
- conversation history
- expiry timestamp

## Why This Matters

This supports:

- step-by-step event creation
- event update conversations
- safe refresh/reload behavior
- backend-controlled draft state

## Main Files

- [chat_session_repository.py](/e:/AI-Conversational/python_backend/app/infrastructure/repositories/chat_session_repository.py)
- [chat_service.py](/e:/AI-Conversational/python_backend/app/application/services/chat_service.py)

## Operational Notes

- sessions are user-bound
- finished sessions are deleted after successful create/update
- the frontend also stores the session ID locally so it can reconnect to the draft

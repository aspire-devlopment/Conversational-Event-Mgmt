# Bulk Email Send Admin - Detailed Implementation Guide

## Overview

This document explains how admin-triggered email sending works in the chat flow, including:

- single-event email send
- multi-event email send by IDs
- admin-only "send email of all pending events"
- duplicate-send prevention (already sent validation)
- architecture, dependencies, and runtime flow

---

## What Was Implemented

The chat/email workflow was extended so email notifications are **event-specific** and can also support safe bulk operations.

### Key capabilities

1. **Single event send**
   - Admin says: `send email for "Event Name"` or `send email for event id 123`
   - System resolves event from DB, then sends only for that event.

2. **Multiple event IDs in one request**
   - Admin says: `send email for event id 1112, 9`
   - System processes all provided IDs in one flow and returns a summary.

3. **All pending events (admin-only)**
   - Admin says: `send email of all pending events`
   - System fetches all events with pending status and processes them.

4. **Already-sent validation**
   - Before queueing new emails for an event, system checks tracking table.
   - If already sent, event is skipped and marked in response summary.

---

## Files Changed

## Core flow logic
- `backend/controllers/chatController.js`

## Notification tracking
- `backend/repositories/emailNotificationRepository.js`

---

## Technologies Used

## Backend framework
- **Express.js**: HTTP API and middleware orchestration.

## Data layer
- **PostgreSQL** (through repository pattern): source of truth for events and notification history.
- **Repository abstraction**: isolates data access from controllers/services.

## Queue and delivery
- **Bull + Redis**: queueing email jobs (non-blocking delivery).
- **Nodemailer**: SMTP email sending.

## Design patterns
- **Controller-Service-Repository architecture**
- **Dependency Injection (DI)** for repositories and services
- **Structured logging** and error handling middleware

---

## Command Understanding Logic

Inside `chatController`, message intent is identified with helper functions:

- `isSendEmailMessage(message)`  
  detects send-email intent.

- `isSendAllPendingEventsMessage(message)`  
  detects admin command for sending all pending events.

- `extractEventNameFromMessage(message)`  
  extracts event name from quoted or plain text.

- `extractEventIdFromMessage(message)`  
  extracts one ID from messages like `event id 123`.

- `extractEventIdsFromMessage(message)`  
  extracts many IDs from messages like `1112, 9`.

---

## Event Resolution Strategy

When send-email is requested, the system resolves event(s) in this order:

1. Existing session event (`sessionData.event_id` or draft event ID)
2. Explicit event ID in user message
3. Multiple event IDs in user message
4. Event name lookup against DB (`eventRepository.list()`)

If not resolvable:
- it asks for exact event name
- or asks for event ID (for ambiguous names)

If multiple name matches:
- returns candidate list with:
  - event ID
  - event name
  - start date

---

## Bulk Multi-ID Flow

When multiple event IDs are provided:

1. Parse IDs from message.
2. For each ID:
   - validate event exists and access is allowed
   - run email-send decision flow
3. For each event:
   - queue emails if eligible
   - skip if already sent
   - skip if invalid/non-accessible
4. Return single summary payload:
   - queued
   - failed
   - skipped
   - invalid IDs

---

## "All Pending Events" Flow (Admin-only)

When admin requests all pending events:

1. Verify role is `Admin`.
2. Query all events.
3. Filter pending-status events.
4. Process each event through notification pipeline.
5. Skip events already sent.
6. Return aggregate summary.

Non-admin users receive `403 Forbidden`.

---

## Duplicate / Already-Sent Validation

Added repository method:

- `hasSuccessfulNotificationForEvent(eventId)`

It checks table `email_notifications` for any successful (`status='sent'`) rows for that event.

Used in `queueNotificationsForEvent(...)`:

- if true -> do not queue again, return skip response
- if false -> proceed with normal queueing

This prevents accidental duplicate notification blasts.

---

## Notification Send Pipeline

For each event to notify:

1. Load event by ID (`eventRepository.getById`).
2. Validate event has roles.
3. Call `notificationService.notifyRoleUsersOfEvent(event, roles)`.
4. Service fetches users by role.
5. Queue one email job per target user.
6. Queue worker sends via SMTP.
7. Delivery status tracked in `email_notifications`.

---

## Data Validation and Security Controls

- Admin-only checks for sensitive bulk operations.
- Event visibility checks for non-admin users.
- Safe parsing and normalization of user message inputs.
- Repository-level DB queries (no ad-hoc SQL string interpolation in controller).
- Duplicate-send prevention through tracking repository.

---

## Example Commands

## Single event by name
- `send email for "Tech Summit 2026"`

## Single event by ID
- `send email for event id 123`

## Multiple events
- `send email for event id 1112, 9`

## All pending events (admin-only)
- `send email of all pending events`

---

## API/Response Behavior

Responses from this flow include summary-friendly fields, such as:

- `emailQueued`
- `emailResult.queued`
- `emailResult.failed`
- `emailResult.skipped`
- `emailResult.invalid` (for multi-ID mode)

This helps frontend/admin UI display clear outcomes.

---

## Operational Notes

1. Ensure `email_notifications` table exists (migration script already in project).
2. Ensure queue + SMTP services are configured in `.env`.
3. If DB tracking table is missing, sending may still run but tracking-based validations can degrade.
4. For production, keep role checks and tracking table mandatory.

---

## End-to-End Flow Summary

1. Admin sends chat command.
2. Controller detects command type (single/multi/all-pending).
3. Event(s) resolved from DB.
4. Already-sent events skipped.
5. Eligible events queued for role-based recipients.
6. Queue worker sends emails.
7. Tracking stored in DB.
8. Chat API returns aggregate result to frontend.


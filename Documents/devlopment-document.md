# Development Document

This document summarizes the AI tools used during the implementation work, why each tool was chosen, and how it was applied in the workflow.

## 1. `functions.shell_command`

### Why it was chosen
`shell_command` was the primary tool for reading the local codebase, checking logs, verifying runtime behavior, and running syntax or build checks. It was the fastest way to inspect the project without guessing about file contents.

### How it was used
- Reviewed backend and frontend files to understand the event/chat flow.
- Inspected logs to diagnose chat session issues, update failures, and UI crashes.
- Ran targeted syntax checks such as `node --check` and JSX parsing to confirm edits were safe.
- Used repository searches to find where routes, repositories, validators, and UI components were wired together.

### Specific use cases
- Confirming that the chat assistant used shared event field metadata.
- Tracing why a session was missing or stale in the browser.
- Verifying why the event update commit was not reaching the database.
- Checking how `/api/events` and `/api/chat` were implemented and routed.

## 2. `functions.apply_patch`

### Why it was chosen
`apply_patch` was the safest and cleanest way to modify files in the workspace. It avoids accidental overwrite, keeps changes targeted, and fits well with code review workflows.

### How it was used
- Added new helper functions and validation logic in backend controllers and services.
- Updated frontend React components to handle API data safely and prevent render crashes.
- Added and modified seed data and scripts for Docker and local testing.
- Created a brand-new markdown document in the repository.

### Specific use cases
- Centralizing event field metadata for the chat assistant.
- Making role-based event visibility work for Manager and Sales Rep users.
- Converting the event listing page from pagination to grouped timeline sections.
- Adding a dedicated test admin account and a helper seed script.

## 3. `multi_tool_use.parallel`

### Why it was chosen
`multi_tool_use.parallel` was useful whenever several independent reads could happen at the same time. It reduced waiting and made it easier to gather context quickly from multiple files.

### How it was used
- Read related backend files in parallel, such as controllers, services, repositories, and schema files.
- Read frontend chat and events pages together while tracing UI problems.
- Compared route wiring, API client behavior, and logging output without serial back-and-forth.

### Specific use cases
- Inspecting `chatController.js`, `chatEventUtils.js`, and `schema.sql` together when shaping the event draft contract.
- Reviewing `AdminChatPage.jsx`, `openaiService.js`, and `eventRepository.js` when debugging JSON rendering and event persistence.
- Checking `eventController.js`, `AdminEventsPage.jsx`, and `v1Routes.js` while implementing role-based visibility and timeline grouping.

## 4. Tools Not Used

Some tools were available in the environment but were not needed for this task:

- `web`
- `spawn_agent`
- `view_image`
- `request_user_input`

They were unnecessary because the work was local, deterministic, and fully solvable from the repository and logs.

## 5. Summary

The workflow relied primarily on:

- `shell_command` for exploration and verification
- `apply_patch` for safe code edits
- `multi_tool_use.parallel` for faster context gathering

This combination was enough to diagnose the chat and event issues, update the backend and frontend, and verify the changes without introducing unnecessary complexity.

# Submission Document

This document describes the actual implementation of the AI conversational event management project and the decisions made to keep it practical, usable, and secure.

## 1. Architecture Decisions

The current codebase is intentionally a **single product stack** rather than a distributed microservice system:

- **Frontend**: React admin dashboard for login, chat-based event creation, and event listing.
- **Backend**: Node.js and Express for authentication, chat orchestration, event APIs, validation, and persistence.
- **Database**: PostgreSQL for users, roles, events, event-role links, and chat sessions.
- **AI integration**: a backend LLM layer that interprets human chat input and turns it into structured event data.

The main architecture choices were:

- Keep **chat state on the backend** so the conversation survives refreshes and can be restored from session data.
- Use a **draft-first workflow** so the assistant can collect data over multiple turns before writing the final event.
- Share event field metadata between backend logic and the chat UI so the assistant and validators stay aligned.
- Model roles as a **multi-select** because an event may be visible to more than one audience group.
- Keep the event list simple but useful by grouping it into **upcoming, ongoing, and past** sections.
- Preserve a clean separation between **chat interpretation** and **database enforcement** so the AI helps with understanding, but normal code still enforces correctness.

This approach fits the project goal: a friendly conversational admin tool, not a generic form builder.

## 2. Conversation Design

The conversation flow is designed for normal people, not for technical users:

- The assistant asks for missing information one step at a time.
- The user can answer in everyday language instead of filling in all fields at once.
- The assistant supports corrections during the same session, such as changing a date, timezone, status, banner URL, or roles.
- The UI uses quick replies for common values like statuses, roles, and presets to reduce typing.
- Raw JSON is hidden from the user so the chat stays readable and feels like a real assistant.

The conversation behaves like a guided form, but it feels like a chat:

- create a new event
- update the current draft
- add multiple roles
- confirm before committing to the database

Important design detail:

- the session can show a draft immediately
- the database is only updated when the flow reaches a final save/confirmation stage

That reduces accidental saves and makes the experience safer for admin users.

## 3. Localization Approach

Localization is handled in a lightweight way that fits the current project scope:

- the frontend exposes a language selector
- the backend can detect the language from the message context
- the assistant responds in the selected or detected language
- event content is preserved in the language the user provides

The supported language behavior is intentionally pragmatic:

- English is the default experience
- French and Spanish are supported where the UI and assistant can recognize them
- the app does not try to translate stored event content automatically

This keeps localization useful without turning the project into a full translation platform.

## 4. Intelligence Implementation

The intelligence layer exists to interpret natural language, not to replace application logic.

What the AI is used for:

- intent detection
- extracting event fields from free text
- recognizing follow-up corrections
- producing a friendly conversational response

What deterministic backend code still handles:

- required field validation
- role validation
- date and time validation
- timezone handling
- banner URL checking
- deciding when a draft is ready to commit

This split matters because the assistant can be flexible while the backend remains strict.

The project also avoids showing internal structured output directly to users. The chat UI converts assistant payloads into a clean human-readable message, which prevents raw JSON from leaking into the interface.

## 5. Security Considerations

Security is built into the application flow rather than bolted on later:

- Authentication uses JWT-based access for admin users.
- Session ownership is enforced so one user cannot read another user’s draft.
- Role-based filtering controls which events a user can see.
- Input validation limits malformed data before it reaches the database.
- The backend does not trust browser state alone when deciding what to save.
- Environment values and secrets are kept out of source code in `.env` files.

Role-based visibility is especially important in this project:

- Admin sees all events
- Manager sees manager-assigned events plus their own
- Sales Rep sees sales-assigned events plus their own
- Viewer sees viewer-assigned events plus their own

That keeps the listing page useful without exposing unnecessary records.

## 6. Deployment Approach

The deployment model is simple and suitable for the current project stage:

- the backend and frontend run as separate services during development
- PostgreSQL stores persistent data
- Docker is used so a fresh environment can be initialized consistently
- schema seeding is included so the app can boot with baseline data

This setup supports:

- local development
- repeatable testing
- seeded admin accounts for login and demo use

The project does not require a heavy cloud-native stack to work correctly, which keeps setup and debugging manageable.

## 7. Trade-offs and Limitations

The current implementation makes deliberate trade-offs:

- The assistant is conversational, but still expects structured completion before saving.
- Banner images use URLs rather than a full upload pipeline.
- The UI focuses on admin workflows instead of public event browsing.
- Localization is useful, but not a complete i18n management system.
- The architecture stays monolithic for simplicity instead of splitting into many services.
- Some rich enterprise features, like queues and advanced audit pipelines, are described in the broader architecture notes but are not part of the active runtime.

These trade-offs keep the app easier to understand, easier to test, and faster to deliver.

## 8. Challenges and Improvements

### Challenges

- Preventing raw JSON from appearing in the chat interface.
- Recovering gracefully when a session id is stale or missing.
- Making sure an update in chat actually reaches the database and not just the in-memory draft.
- Keeping role-based visibility correct for each user type.
- Balancing natural language freedom with strict validation.

### Improvements

- Expand multilingual support with fuller translation and locale formatting.
- Add more automated tests around save/commit behavior and role-based event filtering.
- Improve the chat confirmation step so users clearly know when the database commit is about to happen.
- Add stronger visual differentiation for upcoming, ongoing, and past events.
- Expand audit logging for create, update, and delete actions.

## 9. Future Enhancements

The next useful business-facing features for this project would be:

- **Event publishing workflow**
  - Allow teams to draft events, review them internally, and then publish when approved.
  - This supports better quality control before events go live.

- **Approval process**
  - Let managers review event details before they are shared with the wider team.
  - This reduces mistakes and gives organizations more confidence in the content.

- **Audience targeting**
  - Let businesses choose which internal teams or user groups should see an event.
  - This makes the platform more relevant for different departments and avoids clutter.

- **Notification reminders**
  - Notify users when an event is about to start, change, or expire.
  - This helps improve attendance, coordination, and follow-through.

- **Event performance insights**
  - Show how many events were created, published, updated, or expired over time.
  - This helps admins understand usage patterns and manage activity more effectively.

- **Multi-language business support**
  - Allow teams in different regions to work in the language they are most comfortable with.
  - This improves adoption across international or multilingual organizations.

- **Better collaboration between roles**
  - Enable managers, sales reps, and viewers to work from the same system with role-specific visibility.
  - This keeps communication organized and reduces the need for manual coordination.

- **Recurring and seasonal events**
  - Support repeated business events such as weekly meetings, monthly promotions, or yearly campaigns.
  - This saves time for organizations that run similar events on a regular basis.

- **Event lifecycle management**
  - Help businesses manage the full lifecycle of an event from draft to publish to expiry.
  - This makes the platform more useful for planning, execution, and cleanup.

- **Media hosting upgrade**
  - Move banner uploads to cloud storage or a CDN for more reliable production delivery.
  - This improves speed, availability, and long-term maintainability for uploaded assets.

- **Customer or employee engagement use cases**
  - Extend the system to support internal company announcements, product launches, training sessions, or sales campaigns.
  - This broadens the business value beyond one event type.

These enhancements focus on business usefulness, team coordination, and operational efficiency rather than code-level details.

## 10. Summary

This project combines a chat-first event workflow with backend validation, role-based access, and persistent session handling. The result is a realistic admin tool that is friendlier than a traditional form while still keeping the system structured, secure, and maintainable.

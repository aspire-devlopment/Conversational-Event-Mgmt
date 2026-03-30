# Project Document

## 1. System Briefing

This project is a chat-based event management system built for admin users. Instead of filling out a traditional form, the admin creates and updates an event through conversation with an AI assistant.

The system is designed to support the full event lifecycle:

- start a conversation with the assistant
- collect event details step by step
- validate the data before saving
- store the event in PostgreSQL
- show the saved event in the event listing page

The main goal is to make event creation feel natural and human while still keeping the data structured and reliable in the database.

Chat sessions are also stored in PostgreSQL as the primary persistence layer. This is a better fit than JSON file storage because it keeps the draft state available across restarts, works more reliably for multiple users, and stays consistent with the rest of the application data model. The project still includes a file fallback for local development, but the database remains the main source of truth for active sessions.

The project supports these event fields:

- event name
- subheading
- description
- banner image URL
- timezone
- status
- start date and time
- end date and time
- vanish date and time
- roles with multi-select support

The system also supports role-based visibility, so different users can see the events that are relevant to them.

In addition to event management, the admin dashboard includes a user list so an administrator can review user information and reset passwords when needed.

## 2. Workflow

### Event Creation Workflow

1. The admin logs in.
2. The admin opens the chat page.
3. The assistant starts a conversation and asks for the missing event details.
4. The admin replies in normal language.
5. The backend extracts structured values from the message.
6. The system validates the values.
7. The draft is updated in the chat session stored in PostgreSQL.
8. Once all required information is complete, the assistant asks for confirmation.
9. After confirmation, the event is saved in PostgreSQL.
10. The saved event appears in the event listing page.

### Event Update Workflow

1. The admin opens an existing draft or event conversation.
2. The admin says what needs to change, such as a date, role, or status.
3. The assistant updates the draft in the session.
4. The system validates the change.
5. After confirmation, the update is written to the database.

### Event Viewing Workflow

1. The user logs in based on their role.
2. The backend filters visible events by role and ownership.
3. The frontend displays the events in grouped sections such as upcoming, ongoing, and past.

## 3. Tech Stack Used

### Frontend

- React
- JavaScript
- React-based admin dashboard

### Backend

- Node.js
- Express.js
- REST API architecture

### Database

- PostgreSQL

### AI and Conversation Layer

- OpenRouter-backed language model integration for chat understanding
- deterministic validation in backend services

### Supporting Tools

- JWT authentication
- Docker for local database and service setup
- CORS and security middleware
- request logging and error logging

## 4. Model Used

The project uses an AI language model as the conversational intelligence layer.

### What the model does

- understands free-form user messages
- detects the intent of the message
- extracts event fields from conversational input
- supports corrections like changing the start time or role assignment
- responds in the detected or selected language

### What the model does not do alone

The model is not trusted as the only source of truth. The backend still performs strict validation for:

- required fields
- time consistency
- allowed status values
- valid role names
- valid banner URL format

This means the AI helps with understanding, but the application logic still controls correctness.

## 5. User Guidelines

### For Admin Users

- Log in with an admin account.
- Open the Chat page from the dashboard.
- Start with a message like `I want to create an event`.
- Answer the assistant step by step.
- Use natural language, for example:
  - `Create an event called Sales Kickoff`
  - `Set the timezone to Asia/Katmandu`
  - `Make it published`
  - `Assign Admin and Manager roles`
- Wait for the confirmation message before expecting the event to be saved.
- Use the Users page if you need to review a registered user or reset their password.

### For Banner Image

- Use a direct image URL from the web.
- Make sure the URL points directly to an image file.
- Example formats:
  - `.jpg`
  - `.jpeg`
  - `.png`
  - `.webp`

### For Corrections

You can correct values inside the same conversation, such as:

- `change start date to next Monday`
- `update roles to Admin and Viewer`
- `change the description`
- `set the status to Draft`

### For Event Visibility

Different roles see different sets of events:

- Admin sees all events
- Manager sees manager-related events plus their own
- Sales Rep sees sales-related events plus their own
- Viewer sees viewer-related events plus their own

## 6. Screenshots

Place the project screenshots in the `screenshots/` folder using the filenames below.
Once the images are added, this document will render them automatically.

### Login Screen

![Login Screen](screenshots/login-screen.png)

### Registration Screen

![Registration Screen](screenshots/register-screen.png)

### Registration Success

![Registration Success](screenshots/registration-success.png)

### Admin Dashboard

![Admin Dashboard](screenshots/admin-dashboard.png)

### Chat Interface

![Chat Interface](screenshots/chat-interface.png)

### Event Creation Confirmation

![Event Confirmation](screenshots/event-confirmation.png)

### Event Update

![Event Update](screenshots/event-update.png)

### Event Listing Page

![Event Listing Page](screenshots/event-listing.png)

### Role-Based View

![Role-Based View](screenshots/role-based-view.png)

### Multilingual Flow - French

![Multilingual French](screenshots/multilingual-french.png)

### Multilingual Flow - Spanish

![Multilingual Spanish](screenshots/multilingual-spanish.png)

### Clear Chat Session

![Clear Chat Session](screenshots/clear-chat-session.png)

### Admin Users Dashboard

![Admin Users Dashboard](screenshots/admin-users-dashboard.png)

### Password Reset Flow

![Password Reset Flow](screenshots/password-reset-flow.png)

### Password Reset Success

![Password Reset Success](screenshots/password-reset-success.png)

### Conversation Flow

![Conversation Flow](screenshots/conversation-flow.png)

## 7. Conclusion

This project successfully demonstrates a chat-based event management experience built with Node.js, React, and PostgreSQL. It replaces the traditional form-based approach with a guided conversational flow that is easier to use and more natural for admin users.

The system also keeps the important engineering pieces in place:

- structured data storage
- validation
- role-based access control
- conversational state handling
- multilingual support
- event listing and lifecycle organization

As a result, the application is both user-friendly and technically practical.

## 8. Future Enhancements

The following business-focused improvements would make the project even more useful:

- event approval workflow for manager review
- scheduled reminders and notifications
- audience targeting for more precise event visibility
- recurring event support for weekly or monthly campaigns
- event analytics and reporting
- stronger collaboration between admin, manager, and sales roles
- better multilingual support for more business regions
- calendar integration for easier planning
- event lifecycle automation from draft to archive
- media hosting improvements for more robust banner handling

These future enhancements would make the system more valuable for real business operations and larger teams.

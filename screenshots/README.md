# Screenshots

Add the final project screenshots here using these filenames:

- `login-screen.png`
- `register-screen.png`
- `registration-success.png`
- `admin-dashboard.png`
- `chat-interface.png`
- `event-confirmation.png`
- `event-update.png`
- `event-listing.png`
- `role-based-view.png`
- `multilingual-french.png`
- `multilingual-spanish.png`
- `clear-chat-session.png`
- `conversation-flow.png`

Recommended capture order:

1. Login screen before sign in
2. Registration form before submit
3. Registration success screen
4. Admin dashboard landing page
5. Chat interface before event creation
6. Event confirmation step after all event fields are entered
7. Event update screen after a correction is saved
8. Event listing page showing created events
9. Role-based view for Manager or Sales Rep
10. Multilingual chat flow in French
11. Multilingual chat flow in Spanish
12. Cleared chat session with a fresh conversation
13. Complete conversation flow from start to save

Keep the screenshots clean and readable:

- use full browser width if possible
- avoid browser popups or devtools in the screenshot
- make sure the event data is visible
- use the same theme across screenshots for consistency

## Capture Command

If the frontend and backend are running locally, you can generate the screenshots with:

```bash
cd frontend
npm run capture:screenshots
```

The script expects:

- frontend at `http://localhost:3000`
- backend at `http://localhost:5000/api`
- seeded admin account:
  - email: `testadmin@example.com`
  - password: `TestAdmin123!`

It also creates a temporary Manager account and a role-tagged event for the role-based screenshot.

The chat demo is captured in several stages:

- `event-confirmation.png` shows the assistant with a filled event draft and a save prompt
- `event-update.png` shows the assistant applying a correction to an existing event
- `multilingual-french.png` and `multilingual-spanish.png` show language-aware chat replies
- `clear-chat-session.png` shows the chat reset to a fresh session
- `conversation-flow.png` shows the same conversation after the event is saved successfully

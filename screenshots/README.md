# Screenshots

Add the final project screenshots here using these filenames:

- `login-screen.png`
- `register-screen.png`
- `registration-success.png`
- `admin-dashboard.png`
- `chat-interface.png`
- `event-confirmation.png`
- `event-update-conversation.png`
- `event-update.png`
- `event-listing.png`
- `role-based-view.png`
- `multilingual-french.png`
- `multilingual-spanish.png`
- `multilingual-french-success.png`
- `multilingual-spanish-success.png`
- `clear-chat-session.png`
- `conversation-flow.png`
- `conversation-flow-stepwise.png`

Recommended capture order:

1. Login screen before sign in
2. Registration form before submit
3. Registration success screen
4. Admin dashboard landing page
5. Chat interface before event creation
6. Event confirmation step after all event fields are entered
7. Event update conversation before confirmation
8. Event update screen after a correction is saved
9. Event listing page showing created events
10. Role-based view for Manager or Sales Rep
11. Multilingual chat flow in French
12. Multilingual chat flow in Spanish
13. Multilingual French flow after successful save
14. Multilingual Spanish flow after successful save
15. Cleared chat session with a fresh conversation
16. Complete conversation flow from start to save
17. Stepwise conversation flow using 2 to 3 chat messages

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

You can also capture only the missing screenshot groups instead of rerunning the full flow:

```bash
cd frontend
npm run capture:screenshots -- multilingual password-reset
```

By default, the password reset screenshot targets the seeded admin user:

- `superadmin@example.com`

If you want to use a different existing user row for the reset-password screenshots, set:

```bash
RESET_TARGET_EMAIL=user@example.com
```

Useful step names:

- `multilingual`
- `multilingual-fr`
- `multilingual-es`
- `multilingual-success`
- `multilingual-success-fr`
- `multilingual-success-es`
- `password-reset`
- `role-view`
- `create`
- `update`
- `listing`
- `clear-session`
- `conversation-stepwise`
- `dashboard`
- `chat`
- `login`
- `register`

If no step name is provided, the script runs the full capture flow.

The chat demo is captured in several stages:

- `event-confirmation.png` shows the assistant with a filled event draft and a save prompt
- `event-update-conversation.png` shows the update conversation for the same event before final save
- `event-update.png` shows the successful save state of that same updated event
- `multilingual-french.png` and `multilingual-spanish.png` show language-aware chat replies
- `multilingual-french-success.png` and `multilingual-spanish-success.png` show multilingual event save success states
- `clear-chat-session.png` shows the chat reset to a fresh session
- `conversation-flow.png` shows the same conversation after the event is saved successfully
- `conversation-flow-stepwise.png` shows event creation collected naturally across 2 to 3 chat messages

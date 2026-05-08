# Chat Storage Explanation

## 1. Purpose of This Document

This document explains how chat data is stored in the project, why it was designed this way, when data is deleted, and how the file-storage fallback behaves.

It also explains an important edge case:

What happens if the first chat session write falls back to file storage, but the next request reaches the database successfully?

---

## 2. What Chat Storage Means in This Project

In this project, chat storage refers to the temporary conversation state used while an admin is creating or updating an event through AI chat.

This includes:

- the chat session ID
- the user ID
- conversation history
- the current event draft
- the current step in the flow
- the language
- expiry time

This data is not the final business data.

The final business data is the saved event in the `events` table.

The chat storage is only the temporary working state that helps the user build the event across multiple messages.

---

## 3. Where Chat Data Is Stored

### Primary Storage

The main storage for chat sessions is the `chat_sessions` table in PostgreSQL.

This is the default and intended source of truth.

### Optional Fallback Storage

There is also an optional file-based fallback in:

- `backend/sessions/*.json`

This fallback is controlled by:

- `ENABLE_FILE_SESSION_FALLBACK=true`

If this flag is not enabled, file fallback is not used.

---

## 4. Why I Designed It This Way

I designed chat storage this way because chat-based event creation is not a one-request action.

The user may:

- answer step by step
- refresh the page
- come back after a short interruption
- correct earlier values
- continue the same event draft over multiple turns

If chat state was stored only in frontend memory, the draft would be lost too easily.

If chat state was stored only in server memory, it would be lost on restart and would not work well across multiple instances.

So PostgreSQL was chosen as the main chat session store because it gives:

- persistence across refreshes
- multi-user reliability
- shared storage for backend instances
- consistency with the rest of the application
- expiry control

The file fallback was added only as a development resilience feature, not as the main design.

---

## 5. What Is Stored in Each Chat Session

The session contains:

- `id`
- `user_id`
- `conversation_history`
- `event_draft`
- `current_step`
- `language`
- `state`
- `mode`
- `event_id`
- `created_at`
- `updated_at`
- `expires_at`

This means every session remembers not only the visible messages, but also the structured draft that the backend is building behind the scenes.

---

## 6. How Chat Storage Works Step by Step

## Step 1: Session Creation

When the user opens the chat page, the frontend creates a chat session or restores an existing one.

The backend:

- creates an empty draft
- sets language and mode
- generates a session ID
- stores the session in `chat_sessions`
- adds the assistant greeting message

Why:

The system needs a persistent place to keep work-in-progress state before the user finishes the event.

## Step 2: User Sends a Message

When the user sends a message:

- the session is loaded
- the user message is appended to conversation history
- the AI processes the message
- the extracted draft is normalized and validated
- the updated draft is saved back into the same session
- the assistant reply is stored too

Why:

This makes every chat turn durable. If the page refreshes after one or more messages, the conversation can continue from the saved draft.

## Step 3: Event Is Completed

When the user confirms the final draft and validation passes:

- the event is saved in the `events` table
- role mappings are saved in `event_roles`
- the temporary chat session is deleted

Why:

Once the final event is committed, the temporary draft session is no longer needed.

---

## 7. Why the Event and Chat Session Are Stored Separately

This separation is important.

### `chat_sessions`
Stores temporary draft state.

### `events`
Stores final committed business data.

Why this is a good design:

- temporary incomplete data should not be mixed with final business records
- drafts can expire safely without affecting real events
- users can make corrections before final commit
- the system can validate before writing permanent data

So the chat session acts like a workspace, and the `events` table acts like the final saved result.

---

## 8. How Long Chat Storage Lasts

Chat sessions are stored for 24 hours.

This is controlled in `chatSessionRepository.js` by:

- `SESSION_DURATION = 24 * 60 * 60 * 1000`

Each session gets an `expires_at` value.

That applies to both:

- database-backed chat sessions
- file-based fallback sessions

---

## 9. When Chat Storage Is Deleted

Chat storage is deleted in three situations.

### 1. After Successful Event Save

When the event is created or updated successfully, the temporary chat session is removed.

Why:

The final event is already saved, so the draft session is no longer needed.

### 2. When the User Clears Chat

If the user manually clears the chat session, the session is deleted.

Why:

This allows the user to start over cleanly.

### 3. When the Session Expires

Expired sessions are removed during cleanup logic.

For database sessions:

- expired rows are deleted from `chat_sessions`

For file sessions:

- expired files are deleted when accessed again or when cleanup runs

Important detail:

File deletion is lazy automatic cleanup, not a separate background scheduler.

---

## 10. What “Fallback” Means Here

Fallback means:

If a database operation for chat sessions fails, and fallback is enabled, the repository can use local JSON files instead of PostgreSQL.

This fallback exists in `chatSessionRepository.js`.

It is meant for local development resilience only.

It does not replace PostgreSQL for final event data.

So:

- `chat_sessions` can fall back to file storage
- `events` do not fall back to files

---

## 11. Why I Added File Fallback

I added file fallback for local development because sometimes the database may be temporarily unavailable during setup, local testing, or environment issues.

This gives a limited backup path so chat session work can still continue in some failure scenarios.

Why I did not use file storage as the main design:

- files are not good for concurrent multi-user production systems
- files are harder to query and manage
- files do not scale well
- files are not ideal for shared deployment environments

So file fallback is a convenience and resilience mechanism, not the primary architecture.

---

## 12. Important Real Behavior of the Current Fallback Design

This is the most important technical detail.

The current repository fallback is **operation-based**, not **automatic synchronization-based**.

That means:

- if a DB operation throws an error, fallback may use file storage
- but if a later DB operation succeeds normally, the system does not automatically merge or migrate that file session into the database

This creates an important edge case.

---

## 13. Edge Case: First Message Stored in File, Second Request Reaches Database

Suppose this happens:

### First Request

1. The frontend creates a chat session.
2. PostgreSQL session insert fails.
3. File fallback is enabled.
4. The session is saved as a JSON file.

At this point, the session exists only in the file system, not in the `chat_sessions` table.

### Second Request

Now the user sends another message.

What happens next depends on whether the repository call fails again or not.

#### Case A: The second request also hits a DB error

If the repository method throws again, fallback logic can be used again.

Then the session can still be loaded from the file and continue working.

#### Case B: The second request reaches the database successfully

This is the important part:

If the database call succeeds technically, but the session row is not in PostgreSQL, the repository returns no DB row.

In the current implementation, that does **not** automatically fall back to the file copy just because the DB row was not found.

So the likely result is:

- the system behaves as if the session does not exist in the database
- the request may return "Session not found"
- the frontend may create a new fresh session

### Why This Happens

Because the current fallback design only switches to file storage when there is a thrown DB error.

It does not say:

"If DB query succeeds but returns no row, check file storage too."

So file fallback is not a seamless two-way storage layer. It is only an error-path fallback.

---

## 14. What This Means Practically

If the first session write went to file storage because of a database error, and then the database recovers before the next request:

- the existing file session may not automatically resume
- the app may act like the session is missing
- the user may be forced into a fresh session

This is a limitation of the current fallback implementation.

---

## 15. Why This Trade-Off Was Acceptable

This trade-off is acceptable in this project because:

- PostgreSQL is still the intended primary session store
- file fallback is only for local development resilience
- the production design is database-first
- the fallback is not presented as a full offline synchronization system

So this behavior is not ideal for enterprise-grade failover, but it is acceptable for a development backup mechanism.

---

## 16. If I Wanted to Improve the Fallback Design

If I wanted stronger fallback behavior, I would improve it in one of these ways:

### Option 1: Check File Storage on DB Miss

If DB query succeeds but no session row is found, also check file storage before returning "not found".

Why:

This would make fallback more continuous across temporary DB recovery.

### Option 2: Rehydrate DB from File

If a file-based session exists and DB is available again, migrate that session back into PostgreSQL.

Why:

This would restore the primary source of truth automatically.

### Option 3: Use Redis Instead of File Fallback

For stronger operational reliability, use Redis as a secondary session layer instead of local files.

Why:

Redis is much better suited for temporary session resilience and high-frequency access.

---

## 17. Best Interview Explanation

If someone asks how chat storage works, a strong answer is:

"I store chat state separately from the final event. The `chat_sessions` store keeps the temporary conversation history, current draft, step, and expiry, while the `events` table stores only the final committed event. I designed it this way so the user can build the event across multiple chat turns, recover after refresh, and make corrections before final save. PostgreSQL is the main storage for chat sessions, and I also added an optional file fallback for local development if DB session operations fail. That fallback is limited and error-based, not a full synchronization layer, so if the first session is written to file and the next request reaches the DB successfully, the current implementation may treat the session as missing and start a fresh one." 

---

## 18. Best Short Viva Answer

"Chat data is stored temporarily in a `chat_sessions` workspace, not directly in the final `events` table. I did this so users can create events step by step, refresh safely, and correct values before commit. PostgreSQL is the main session store, and there is an optional file fallback for local development if DB session operations fail. In the current design, that fallback works on DB errors only, so if the first write goes to file and the next request reaches the DB successfully, the session may be treated as missing because it was never synchronized back to PostgreSQL."

---

## 19. Final Summary

The chat storage design is based on one important idea:

Temporary conversational draft state should be stored safely, separately, and with expiry, while final event data should only be written after validation and explicit confirmation.

That is why the project uses:

- `chat_sessions` for temporary AI conversation state
- `events` for final business records
- optional file fallback only for local development resilience

This gives the system a cleaner and safer flow than writing partial event data directly into the final business tables.

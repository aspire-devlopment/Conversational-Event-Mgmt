# Technical Round Prep: Chat Session Storage and Expiry

## 1. Purpose of This Document

This document is a preparation guide for a technical round based on the chat session storage and expiry task.

It covers:

- what you should present from your side
- what interviewers may ask
- strong sample answers you can give

---

## 2. Short Presentation You Can Give

You can present the task like this:

"My task was to design and explain how temporary AI chat state is stored and expired while keeping final business data separate and safe. In this flow, the chat session acts as a temporary workspace that stores conversation history, event draft, current step, language, mode, and expiry information. The final event is not written directly during the conversation. It is saved only after validation and explicit confirmation."

"I used PostgreSQL as the primary session store because chat-based event creation is a multi-turn workflow. Users may refresh the page, continue later, or correct previous values, so session state must persist beyond frontend memory or in-process backend memory. I also documented an optional file fallback for development resilience, but this fallback is intentionally limited and is not a production-grade synchronization system."

"A key part of the design is session expiry. Sessions expire after inactivity, and expiry is managed with a dedicated `expires_at` column so cleanup and filtering can be done efficiently at the database level. This gives better reliability, cleaner separation between temporary chat state and final event records, and better support for multi-instance deployments."

---

## 3. Presentation Flow

If they ask you to explain the task, use this order:

1. Problem statement
2. Why temporary chat state is needed
3. Why chat data is separate from final event data
4. Why PostgreSQL is the primary storage
5. How session expiry works
6. Why file fallback exists
7. Limitation of the current fallback design
8. Improvements you would make next

---

## 4. What They Could Ask and How You Can Answer

### Q1. What was your task in this feature?

**Answer:**

"My task was to design and explain how temporary AI-driven event creation state should be stored safely across multiple chat turns. The goal was to let the user continue a conversation over multiple requests without losing draft progress, while making sure only validated final event data is committed to the permanent business tables."

---

### Q2. Why do we need chat session storage at all?

**Answer:**

"Because event creation through AI chat is not a single request. The user may provide information gradually, change earlier inputs, refresh the page, or come back after a short break. Without persistent session storage, the current draft and conversation context would be lost too easily."

---

### Q3. Why did you keep `chat_sessions` separate from `events`?

**Answer:**

"`chat_sessions` stores temporary work-in-progress data, while `events` stores final committed business data. This separation is important because incomplete or partially validated drafts should not be mixed with permanent event records. It gives a cleaner lifecycle: draft first, validate next, commit only at the end."

---

### Q4. Why did you choose PostgreSQL as the main storage?

**Answer:**

"I chose PostgreSQL because it gives persistent shared storage across requests, server restarts, and multiple backend instances. It also provides better consistency and operational reliability than frontend memory, backend memory, or file-only storage. In a scalable deployment, all instances can access the same session state from the database."

---

### Q5. Why not store the chat session only in frontend memory?

**Answer:**

"Frontend memory is too fragile for this use case. If the user refreshes the page, closes the browser, or loses connectivity, the draft would be lost. Since this is a multi-step workflow, the backend needs a durable session store."

---

### Q6. Why not store the chat session only in backend memory?

**Answer:**

"Backend memory would be lost on server restart and would not work well across multiple instances. In production, requests may hit different servers, so session state must be in shared persistent storage rather than in one process memory."

---

### Q7. What exactly is stored in a chat session?

**Answer:**

"The session stores the temporary conversation state: session ID, user ID, conversation history, current event draft, current step, language, mode, state, optional event ID, and timestamps such as created time, updated time, and expiry time. This allows the system to continue the same draft across multiple messages."

---

### Q8. How does the chat session lifecycle work?

**Answer:**

"First, a session is created when the chat begins. Then for each user message, the existing session is loaded, updated with the new conversation state, and saved back. When the event is successfully created or updated, the final data is written to the permanent tables and the temporary chat session is deleted. If the user becomes inactive, the session eventually expires and is cleaned up."

---

### Q9. Why did you introduce session expiry?

**Answer:**

"Expiry prevents temporary draft sessions from living forever. These sessions are only useful while the user is actively working on the event. Automatic expiry reduces stale data, controls storage growth, and limits the lifetime of temporary conversational state."

---

### Q10. Why use a dedicated `expires_at` column instead of keeping expiry only inside JSON?

**Answer:**

"A dedicated `expires_at` column makes expiry a first-class database concern. That allows indexed queries for cleanup and filtering, which is much more efficient than fetching rows and checking expiry only in application code. It also keeps infrastructure lifecycle logic separate from the business state stored in JSON."

---

### Q11. How long do sessions live?

**Answer:**

"Sessions live for 24 hours of inactivity in the current design. Each session has an `expires_at` value, and that value is refreshed on updates so active users do not lose their session in the middle of an ongoing workflow."

---

### Q12. Why refresh expiry on update instead of keeping fixed expiry from creation time?

**Answer:**

"Because this is an interactive workflow. If a user is actively using the chat, the session should remain alive. Refreshing expiry on update gives a better user experience than expiring a session at a fixed time even while the user is still interacting."

---

### Q13. How are expired sessions cleaned up?

**Answer:**

"Expired sessions are cleaned up through repository cleanup logic before read operations. That means expired sessions are removed automatically and are not returned to the application. This avoids stale data accumulation without needing a separate scheduler for the basic design."

---

### Q14. Why did you add file fallback?

**Answer:**

"The file fallback was added as a development resilience feature. If a database operation for chat sessions fails and fallback is enabled, local JSON files can temporarily hold the session state. This helps local development and debugging, but it is not meant to replace the database in production."

---

### Q15. Is the file fallback production-ready?

**Answer:**

"No. File fallback is useful for development, but it is not appropriate as a production-grade session architecture. Local files are not ideal for multi-instance systems, scaling, failover, concurrency, or shared access across servers."

---

### Q16. What is the biggest limitation of the current fallback design?

**Answer:**

"The biggest limitation is that it is operation-based, not synchronization-based. If a database operation throws an error, the repository can fall back to file storage. But if the next database operation succeeds and the session exists only in file storage, the system does not automatically rehydrate or merge that file session back into PostgreSQL."

---

### Q17. What happens if the first request stores the session in file fallback and the next request reaches the database successfully?

**Answer:**

"In the current design, if the database call succeeds but no row exists in PostgreSQL, the system does not automatically check the file-based copy just because the database returned no row. So the app may behave as if the session is missing, which can lead to a 'session not found' path or a fresh session being created."

---

### Q18. Why was that trade-off acceptable?

**Answer:**

"Because PostgreSQL is still the intended source of truth, and the file fallback was added only as a limited development resilience mechanism. The goal was not to build a full offline recovery or synchronization layer. For development convenience this trade-off is acceptable, but for stronger failover behavior I would improve it."

---

### Q19. If they ask, 'How would you improve this design?', what should you say?

**Answer:**

"I would improve it in one of three ways. First, on a database miss I could also check file storage before returning not found. Second, if the database becomes available again, I could rehydrate the session from file back into PostgreSQL. Third, for a stronger production-grade temporary store, I would consider Redis instead of local files."

---

### Q20. Why would Redis be better than file fallback?

**Answer:**

"Redis is much better suited for temporary session data because it is fast, centralized, and built for high-frequency access. It works better than local files in distributed systems and supports expiry more naturally. So if stronger resilience is required, Redis is a more suitable secondary session layer than the filesystem."

---

### Q21. What are the scalability benefits of this database-first design?

**Answer:**

"The main scalability benefit is that sessions are stored in a shared central database, so any backend instance can load the same session. That removes the need for sticky sessions and supports load-balanced multi-instance deployments. It also gives stronger consistency than per-server local storage."

---

### Q22. What security or safety benefits does expiry provide?

**Answer:**

"Expiry reduces the lifetime of temporary data and prevents stale sessions from remaining accessible indefinitely. That lowers storage accumulation and also limits how long a temporary conversational workspace remains available if abandoned."

---

### Q23. Why not directly save partial event data into the `events` table during the conversation?

**Answer:**

"Because partial event drafts may be incomplete, invalid, or frequently changing. Writing them directly into the final business table would mix draft state with committed records and complicate validation, cleanup, and reporting. Keeping drafts in `chat_sessions` is cleaner and safer."

---

### Q24. What if they ask about concurrency or consistency?

**Answer:**

"A database-backed session model is better for consistency than file-based local storage because it gives a single source of truth and transactional guarantees. If concurrency became a bigger concern, I would further strengthen updates using optimistic locking or version-based conflict handling for the same session."

---

### Q25. What is the strongest one-minute answer you can give if they ask for the overall design?

**Answer:**

"I treated chat state as a temporary workspace rather than final business data. So I stored conversation history, draft state, step, and expiry in `chat_sessions`, while keeping final committed event data in `events`. PostgreSQL is the primary store because this is a multi-turn workflow and the state must survive refreshes, restarts, and multi-instance deployments. I also documented an optional file fallback for development resilience, but it is intentionally limited. For expiry, I used a dedicated `expires_at` column so cleanup and filtering can happen efficiently at the database level. The main design strength is clear separation between temporary conversational state and final business records, with predictable expiry and better production readiness." 

---

## 5. Questions They May Ask About Trade-Offs

### Q26. What trade-off did you make by keeping a file fallback?

**Answer:**

"The trade-off is convenience versus architectural purity. File fallback makes local development more resilient when the database is temporarily unavailable, but it also introduces an edge case where database and file state are not automatically synchronized. I accepted that trade-off because the fallback is not the primary production path."

---

### Q27. Why not build full automatic synchronization between file and database?

**Answer:**

"Because full synchronization increases complexity a lot. You need conflict handling, migration logic, source-of-truth rules, and recovery guarantees. That was beyond the scope of a lightweight development fallback. For a serious production failover strategy, I would prefer a technology designed for shared temporary state, such as Redis."

---

### Q28. What are the main strengths of your design?

**Answer:**

"The main strengths are clear separation of temporary and permanent data, durable multi-turn chat support, efficient expiry handling, better readiness for multi-instance deployment, and a simple but useful resilience fallback for development."

---

### Q29. What are the known limitations?

**Answer:**

"The main known limitation is that file fallback is not a seamless continuation layer across database recovery. Another limitation is that cleanup is tied to repository operations rather than a dedicated background process, although that is acceptable for the current design."

---

### Q30. If they ask what you would do next, what should you say?

**Answer:**

"My next step would be to strengthen fallback recovery behavior, improve observability around session cleanup and expiry, and evaluate Redis if stronger temporary-state resilience is required beyond development use cases."

---

## 6. Best Final Closing Answer

If they say, "Summarize your task and contribution," you can say:

"My contribution was to design and explain a safer session architecture for AI-driven event creation. I separated temporary chat workspace data from final business records, used PostgreSQL as the primary shared store, introduced proper session expiry, and clearly documented the behavior and limitations of the optional file fallback. The result is a cleaner, more scalable, and more maintainable flow for multi-turn chat-based event creation."

---

## 7. Quick Tips for the Round

- Speak in terms of problem, design choice, trade-off, and improvement.
- Keep saying "temporary workspace" for `chat_sessions` and "final committed data" for `events`.
- If they challenge the fallback, agree that it is limited and explain that it was intentionally scoped for development resilience.
- If they ask about production readiness, emphasize database-first design and multi-instance compatibility.
- If they ask about future improvement, mention DB miss fallback check, rehydration, or Redis.

---

## 8. Best Short Viva Version

"The core idea of my task was to store temporary AI chat state separately from final event data. I used `chat_sessions` as a temporary workspace and `events` only for final committed records. PostgreSQL is the primary store because the conversation is multi-turn and must survive refreshes, restarts, and multiple backend instances. I also documented session expiry using a dedicated `expires_at` field and explained that file fallback exists only for development resilience, with a known limitation that file-only sessions are not automatically synchronized back to the database after recovery."

# Technical Follow-Up Prep: Assignment Questions and Answers

## 1. Purpose

This document is for the technical follow-up round based on the assignment:

`Conversational Event Creation System (AI Chatbot)`

It focuses on the kinds of questions interviewers may ask after reviewing the implementation, and gives strong sample answers you can present confidently.

---

## 2. Best Opening Summary

If they ask, "Can you explain what you built?", you can say:

"I built a chat-first event creation system where an admin can create and update events conversationally instead of filling a traditional form. The frontend provides a message-based chat interface and event listing page, while the backend manages chat sessions, draft state, validation, localization, and final event persistence. I used an LLM for natural-language understanding and flexible extraction, but I kept deterministic backend validation and normalization in the loop so the system remains reliable."

---

## 3. Product and Problem Questions

### Q1. What problem was this assignment trying to solve?

**Answer:**

"The assignment solves the friction of event creation. Instead of asking admins to fill a long structured form, it allows them to describe the event naturally in conversation. The chatbot guides the user step by step, extracts structured fields, allows corrections, and creates the event only after the required metadata is collected and validated."

---

### Q2. Why did you choose a chat-based flow instead of a normal form?

**Answer:**

"A chat-based flow is more natural for users when the data can be collected incrementally. It reduces the cognitive load of seeing many fields at once, supports flexible language like 'next Monday at 3', and makes corrections easier in natural language. The assignment explicitly required a conversational experience instead of a traditional form, so I designed the product around that."

---

### Q3. What were the key requirements you focused on most?

**Answer:**

"I focused on five things: conversational flow, persistent chat context, structured event extraction, validation before persistence, and multilingual support. Those were the requirements most critical to making the assignment work end to end."

---

## 4. Architecture Questions

### Q4. Can you explain the overall architecture?

**Answer:**

"The frontend is built in React and provides the chat UI and events listing page. The backend in Node.js and Express exposes APIs for authentication, chat session management, message processing, and event CRUD operations. PostgreSQL stores users, roles, events, event-role mappings, and chat sessions. The chat service uses an LLM integration layer for language understanding, while deterministic utility and validation code ensures the final event data is normalized and safe before saving."

---

### Q5. Why did you separate controllers, services, and repositories?

**Answer:**

"I separated them to keep responsibilities clear. Controllers handle HTTP requests and responses. Services handle business logic like chat orchestration, extraction flow, and event creation rules. Repositories handle persistence. This makes the code easier to test, change, and scale. For example, if I switch LLM provider or change chat storage logic, I do not need to rewrite the entire application."

---

### Q6. Why did you separate temporary chat state from final event data?

**Answer:**

"Because temporary conversational state and committed business data have different lifecycles. Chat sessions are drafts and may be incomplete, invalid, or abandoned. Events are final business records. Keeping them separate makes validation, expiry, cleanup, and persistence cleaner and safer."

---

### Q7. How does the event creation flow work end to end?

**Answer:**

"The admin starts a conversation such as 'I want to create an event.' The frontend either creates or restores a chat session. Each message is sent to the backend, where the current draft and bounded conversation history are loaded. The LLM helps interpret the user input and extract structured fields. Then backend logic normalizes and validates those fields, updates the draft, determines the next missing information, and sends a response. Once the required fields are complete and confirmed, the backend writes the event and its role mappings into PostgreSQL and deletes the temporary chat session."

---

## 5. AI and LLM Questions

### Q8. Where exactly did you use AI in the solution?

**Answer:**

"I used AI primarily for natural-language understanding inside the chat workflow. It helps interpret flexible user input, extract structured event fields, understand corrections, support multilingual conversation, and generate user-friendly responses. I also documented how AI could support planning, architecting, and development decisions around the project, since the assignment encouraged AI usage across the lifecycle."

---

### Q9. Why didn’t you rely entirely on AI for everything?

**Answer:**

"Because LLM output can be inconsistent. I used AI where it adds value, mainly language understanding, but I did not trust it blindly for persistence-critical logic. After extraction, the backend still performs deterministic normalization, validation, and final save rules. That hybrid design is more reliable than pure AI-driven persistence."

---

### Q10. Why did you choose OpenRouter instead of a local model like Ollama?

**Answer:**

"I chose OpenRouter because it gave me a hosted integration point with model portability and easier deployment. I could configure the model through environment variables without changing application code. Compared to Ollama local, this reduced machine-specific setup, hardware dependency, and operational complexity. For this assignment, fast delivery and deployment simplicity were more important than running a local model."

---

### Q11. If they ask, 'Why not call OpenAI or Gemini directly?'

**Answer:**

"Using OpenRouter as the integration layer gave me flexibility. The application talks to one consistent API while still allowing model changes later through configuration. That reduces provider lock-in and makes experimentation easier."

---

### Q12. How did you control the LLM so it stayed useful and not chaotic?

**Answer:**

"I kept the AI responsibility narrow. I bounded the chat history sent to the model, structured prompts around extraction goals, and used backend normalization and validation after every response. That way the LLM helps interpret language, but the backend still controls correctness and workflow progression."

---

## 6. Conversation Design Questions

### Q13. How did you make the chatbot conversational instead of form-like?

**Answer:**

"I designed it to collect metadata step by step in dialogue rather than exposing all fields at once. The assistant asks only for the next needed information, summarizes progress, accepts natural phrasing, and supports corrections like 'change start date'. The user experiences a guided conversation, not a visible form."

---

### Q14. How does the system know what to ask next?

**Answer:**

"The backend keeps a draft of the event plus workflow state. After each message, it checks which required fields are still missing or invalid and determines the next step from that state. So the next question comes from the current draft completeness, not from a fixed hardcoded script alone."

---

### Q15. How do you support corrections like 'change start date'?

**Answer:**

"The system stores a structured event draft inside the chat session. When the user sends a correction, the backend interprets the intent, updates only the relevant draft fields, re-validates the draft, and continues the conversation from the new state."

---

### Q16. How did you maintain conversational context?

**Answer:**

"I maintained context in persistent chat sessions. Each session stores conversation history, draft data, current step, language, mode, and expiry. That allows the system to continue across multiple messages, refreshes, and short interruptions."

---

## 7. Localization Questions

### Q17. How did you handle multilingual support?

**Answer:**

"The system detects the user’s language, responds in the same language, and stores event content in that same language. The design supports at least two to three languages by keeping language as part of the session context and by using the AI layer plus backend language normalization utilities."

---

### Q18. Why is language stored in the session?

**Answer:**

"Because language affects the entire conversation. Once the system knows the user’s language, it should continue responding consistently in that language across turns. Storing language in the session avoids re-detecting it every time and keeps the user experience stable."

---

### Q19. How would you extend this to more languages later?

**Answer:**

"I would keep language handling configuration-driven, expand supported language mappings, strengthen translation and localization prompts, and test date/time parsing carefully for each language. I would also validate that stored event content remains consistent with the user’s selected or detected language."

---

## 8. Data and Database Questions

### Q20. What does the data model look like?

**Answer:**

"The key entities are users, roles, events, event-role mappings, and chat sessions. Events store the final metadata like name, description, status, timezone, and dates. Event-role mappings represent the multi-select role relationship. Chat sessions store temporary conversation state and draft data until the event is committed."

---

### Q21. Why use PostgreSQL here?

**Answer:**

"PostgreSQL is a strong fit because the application needs reliable structured storage, relationships between events and roles, transactional writes, and persistent chat state. It also supports multi-instance backend deployment better than local file storage alone."

---

### Q22. How did you model multi-select roles?

**Answer:**

"I modeled roles separately and saved event-role mappings in a relationship table instead of storing a comma-separated list in the event row. That design is more normalized, easier to validate, and better for querying later."

---

## 9. Chat Session Questions

### Q23. Why do chat sessions need to be persisted?

**Answer:**

"Because event creation is a multi-turn workflow. If the session lived only in frontend memory or backend memory, it would be lost on refresh or restart. Persistent session storage lets users continue the same draft across requests."

---

### Q24. What is stored in a chat session?

**Answer:**

"The chat session stores session ID, user ID, conversation history, event draft, current step, state, mode, language, timestamps, and expiry data. In short, it stores the temporary workspace needed to continue the conversation correctly."

---

### Q25. Why did you add expiry to chat sessions?

**Answer:**

"Expiry prevents abandoned drafts from accumulating forever. Since chat sessions are temporary state, they should automatically disappear after inactivity. That keeps storage cleaner and limits stale data."

---

### Q26. Why use a dedicated `expires_at` column?

**Answer:**

"A dedicated `expires_at` column makes cleanup and filtering efficient at the database level. It can be indexed and queried directly, which is better than hiding expiry only inside JSON."

---

### Q27. Why was file fallback added at all?

**Answer:**

"File fallback was added as a development resilience mechanism. If chat-session database operations fail and fallback is enabled, local JSON files can temporarily preserve session state. It is not intended as the main production architecture."

---

### Q28. What is the limitation of the current file fallback?

**Answer:**

"It is error-based rather than synchronization-based. If one operation falls back to file storage and the next operation reaches the database successfully, the session may not automatically reappear in the database. So file fallback is helpful for development, but it is not seamless failover."

---

## 10. Validation and Reliability Questions

### Q29. How did you validate the event data?

**Answer:**

"Validation happens after extraction and before persistence. The backend checks required fields, date consistency, supported statuses, supported roles, and general normalization rules. For example, start and end times must make sense, and only allowed statuses and roles should be accepted."

---

### Q30. Why not just trust the LLM to give valid fields?

**Answer:**

"Because LLMs are helpful, but they are not guaranteed to be correct every time. Validation must stay deterministic in backend code. That protects the system from malformed or hallucinated outputs and keeps final data quality under control."

---

### Q31. How did you handle relative dates like 'next Monday'?

**Answer:**

"The system allows flexible natural-language inputs and converts them into structured event fields through the AI-assisted parsing layer and backend normalization logic. The important design point is that free-form user input is translated into validated structured values before final save."

---

### Q32. What happens if the user gives incomplete information?

**Answer:**

"The system keeps the partial draft in the chat session and asks only for the remaining required information. It does not force a full restart. That is one of the main benefits of a conversational draft model."

---

## 11. Security Questions

### Q33. What security considerations did you apply?

**Answer:**

"I focused on input validation, request authentication, user-to-session association, controlled persistence, and safe logging. I also ensured that temporary sessions expire and that sensitive values like tokens are redacted from logs."

---

### Q34. How is authentication handled?

**Answer:**

"Authentication is JWT-based. The frontend stores the token and sends it in the `Authorization` header for protected routes. The backend verifies the token, extracts user information, and applies role-based authorization where needed."

---

### Q35. Is storing JWT in the frontend secure?

**Answer:**

"It is functional but not the strongest option. In the current implementation the token is stored in localStorage, which is simpler for SPA development but more exposed to XSS than HttpOnly cookies. For production, I would prefer HttpOnly secure cookies with short-lived access tokens and refresh-token support."

---

### Q36. Did you use HttpOnly cookies here?

**Answer:**

"No. The current implementation uses localStorage and bearer tokens in the `Authorization` header. That was the existing simpler auth flow, but HttpOnly cookies would be a stronger production security improvement."

---

### Q37. Why didn’t you use HttpOnly cookies?

**Answer:**

"Because the project followed a simpler SPA token flow and the core focus of the assignment was conversational event creation, session architecture, and AI-assisted extraction rather than a complete auth redesign. If I were hardening this for production, I would upgrade the auth storage approach."

---

## 12. Scalability and Deployment Questions

### Q38. How would this system scale for many users?

**Answer:**

"The backend is mostly stateless apart from database-backed session storage, so it can scale horizontally behind a load balancer. PostgreSQL provides shared persistence. If load increased significantly, I would optimize LLM usage, add rate limiting, cache hot reads where appropriate, and consider Redis for hot session state or short-lived coordination."

---

### Q39. What do you think would become the first bottleneck?

**Answer:**

"The likely first bottlenecks would be LLM latency and cost, followed by chat-session and event database writes under higher concurrency. That is why I would watch request volume, prompt size, concurrency, and session lifecycle behavior carefully."

---

### Q40. How would you deploy it?

**Answer:**

"I would deploy the React frontend separately from the Node.js API, use PostgreSQL as the persistent shared database, store secrets in environment variables, and run the backend behind HTTPS with proper CORS and reverse proxy configuration. For production, I would also improve auth storage, observability, and provider failure handling."

---

## 13. Trade-Off and Limitation Questions

### Q41. What trade-offs did you make?

**Answer:**

"I balanced AI flexibility with deterministic backend control. I used hosted LLM access instead of local model hosting for easier delivery and portability. I also accepted a limited file fallback for development convenience rather than building a full synchronization-based failover system."

---

### Q42. What are the main limitations of the current version?

**Answer:**

"The main limitations are that JWT storage is not yet production-hardened, the file fallback is limited, and LLM-backed flows still depend on prompt quality and provider reliability. Also, the current design is strong for the assignment scope, but a larger production rollout would need more observability, rate limiting, and stronger token lifecycle management."

---

### Q43. If you had more time, what would you improve first?

**Answer:**

"I would improve authentication security, strengthen fallback behavior or replace it with Redis, add richer monitoring around LLM latency and failure modes, and expand automated testing around multilingual extraction and correction flows."

---

## 14. AI-in-Development Questions

### Q44. The assignment asked you to use AI wherever possible. How would you explain that?

**Answer:**

"I would explain it in two layers. First, product-level AI: the chatbot uses an LLM to understand user input, extract event fields, support multiple languages, and guide conversation. Second, development-level AI: AI can also help with ideation, architecture exploration, implementation support, testing ideas, and documentation refinement. The important part is not just using AI everywhere blindly, but choosing where AI adds value and where deterministic engineering is still necessary."

---

### Q45. How do you decide where AI is appropriate and where code should stay deterministic?

**Answer:**

"I use AI for interpretation, language flexibility, and conversational UX. I use deterministic code for validation, authorization, persistence, and business rules. My rule is simple: if correctness must be guaranteed, backend logic should own the final decision."

---

## 15. Tough Follow-Up Questions

### Q46. What if the LLM gives a wrong date or status?

**Answer:**

"That is exactly why I do not trust the model alone. The extracted values are normalized and validated in backend code. If something is invalid or ambiguous, the assistant can ask a follow-up question rather than committing bad data."

---

### Q47. What if the user refreshes the page in the middle of event creation?

**Answer:**

"The session can be restored because the temporary draft state is persisted in chat session storage. That is one of the main reasons chat sessions were stored outside frontend memory."

---

### Q48. What if two backend instances receive requests for the same session?

**Answer:**

"Using database-backed session storage means both instances can access the same source of truth. If concurrency became more intense, I would strengthen update coordination with optimistic locking or more explicit session version handling."

---

### Q49. Why is your design better than simply showing a form and using AI autocomplete?

**Answer:**

"A form with AI autocomplete still keeps the interaction fundamentally field-driven. This assignment asked for a conversational system, so I designed the entire collection flow around dialogue, corrections, and context. The chat-first approach is a better match for natural-language capture and guided interaction."

---

### Q50. Give one strong final answer if they say, 'Why is your solution good engineering, not just AI novelty?'

**Answer:**

"Because I did not treat AI as the whole system. I designed a layered architecture where AI improves the user experience and language understanding, while backend code still handles validation, persistence, security boundaries, session management, and lifecycle control. That makes the solution more maintainable, scalable, and production-aware than a demo that only calls an LLM."

---

## 16. Best Closing Summary

If they ask for a final summary, say:

"This assignment was about using AI to improve event creation without losing engineering discipline. My solution uses a conversational interface, persistent chat state, AI-assisted extraction, multilingual handling, and deterministic backend validation before persistence. I focused on clear separation of concerns, temporary-versus-final data separation, and practical trade-offs that make the system more reliable and easier to evolve."


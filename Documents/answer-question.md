# AI / Agentic System Experience Answers

## Which LLMs/tools have you used?

I have used OpenAI models, OpenRouter-hosted LLMs, and AI coding assistants such as ChatGPT/Codex-style tools for development, debugging, architecture review, documentation, and prompt design. In this project, the runtime AI layer uses OpenRouter as the model gateway, with the backend calling the configured model through `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`.

## Brief hands-on experience

I have hands-on experience building a real chat-based event management system where an LLM understands natural language, extracts structured event data, updates a persistent draft, and helps users complete event creation through conversation. I also used AI tools during development to analyze code, improve backend architecture, write documentation, and reason about validation, session storage, idempotency, and security.

## One real AI/agentic system I built

I built a chat-based event management system for authenticated admin users. Instead of filling a long event form manually, the admin can create or update an event by chatting with an AI assistant. The system converts natural language into structured event data, validates it, stores draft progress in PostgreSQL-backed chat sessions, and commits the final event only after confirmation.

## What problem did it solve?

The system solved the problem of slow and error-prone manual event creation. Event records usually require many fields such as title, description, banner URL, status, timezone, start time, end time, vanish time, and target roles. A normal form can feel rigid, especially when the user wants to describe the event naturally or change details during the process. The AI chat flow made event creation more guided, flexible, and user-friendly.

## What did it do automatically?

The system automatically:

- understood user messages in natural language
- extracted event fields from chat input
- detected corrections such as changing date, status, role, or description
- maintained conversation history and event draft state
- asked for missing required fields
- normalized language, dates, roles, and event values
- validated the final event before saving
- checked duplicate/idempotent event creation paths
- saved the completed event to PostgreSQL after user confirmation
- removed completed or expired temporary chat sessions

## How did the system understand input, decide what to do, and execute actions?

### Understand input

The React frontend sends the user's chat message to the Node.js/Express backend. The chat controller loads the active chat session, current event draft, and recent conversation history. The backend then sends a compact prompt to the OpenRouter-backed LLM. The model returns structured JSON containing the interpreted intent, extracted fields, draft updates, and a user-friendly response.

### Decide what to do

The backend does not blindly trust the LLM. After receiving the model output, deterministic helper logic merges the extracted fields into the existing event draft, normalizes values, checks required fields, validates dates/status/roles, and decides whether the system should ask another question, show a confirmation summary, or commit the event.

### Execute actions

If the event is incomplete, the system updates the `chat_sessions` record and asks the next relevant question. If the user confirms a complete event, the backend writes the event and role mappings to PostgreSQL using repository logic. It also uses duplicate protection and idempotency checks so repeated final submissions do not create multiple identical events.

## What actions did the system perform automatically?

The system performed these automatic actions:

- created a resumable chat session for each event conversation
- stored conversation history and draft event data
- called the LLM to interpret each user message
- converted natural language into structured event fields
- merged updates into the current draft
- validated the draft against backend business rules
- generated the assistant's next question or confirmation message
- created or updated event records after confirmation
- linked events with role visibility rules
- filtered visible events based on user role and ownership
- cleaned up expired temporary chat sessions

## What measurable outcome did it achieve?

The main measurable outcome was that event creation moved from a manual multi-field form workflow to a guided chat workflow. The system reduced repeated manual input, preserved drafts across refreshes, prevented duplicate final submissions through idempotency logic, and improved reliability by storing both final event data and active chat state in PostgreSQL. It also made the event creation process more consistent because validation remained deterministic even though input collection was AI-assisted.

## Example: User asks, "What should I do for this client today?"

In this system, a request like "What should I do for this client today?" would be handled as a planning-style user intent rather than a direct event-save command.

### How the system understands the request

The system would treat the message as a natural-language task request. It would identify that the user is asking for recommended actions for a specific client and a specific time window, "today." It would then use the authenticated user's context, recent conversation history, and available client/event/task data to understand which client the user means. If the client is not clear, the assistant would ask a clarification question.

### How the system decides next steps

The system would decide next steps by combining LLM interpretation with deterministic backend rules. The LLM would classify the intent as "daily client action planning." The backend would then check available records such as today's events, pending follow-ups, deadlines, client status, assigned roles, and any incomplete tasks. It would prioritize actions based on urgency, due date, status, and relevance to that client.

### What output/actions it generates

The assistant would generate a short prioritized plan, for example:

1. Follow up with the client about the pending event details.
2. Confirm the event date, timezone, and target audience.
3. Review any draft event information already stored in the system.
4. Create or update the event once the missing information is confirmed.

If automatic actions are enabled, the system could also create a draft event, update an existing draft, schedule a reminder, or surface the relevant event records for that client. It would not permanently save a final event without validation and user confirmation.

## Additional information

The important design decision in this system is that the LLM acts as an intelligent input and reasoning layer, while the backend remains responsible for validation, security, persistence, and final business actions. This keeps the system flexible for natural conversation but reliable enough for real application data.

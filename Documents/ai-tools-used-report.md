# AI Tools Used and Decision Rationale

## Project Context

This project was developed as a chat-based event management system. The implementation required both:

- AI support during development to inspect, modify, and validate code
- AI support at runtime to power the conversational event assistant

This document explains the AI tools used, why each one was chosen, and how each one contributed to the final system.

---

## 1. AI Development Assistant Used During Implementation

### Tool

- **Codex-based coding assistant**

### Why it was chosen

The coding assistant was selected because it was well suited for repository-aware development work. The project involved coordinated updates across React components, Express controllers, PostgreSQL repositories, shell scripts, and documentation. A tool that could reason over the full workspace and make targeted edits was more effective than using a generic text generator.

### How it was used

The assistant was used for:

- reading the local codebase to understand the existing architecture
- identifying where chat, event, and authentication logic lived
- adding and revising controllers, services, repositories, and React components
- fixing runtime issues such as stale session handling and rendering errors
- improving the documentation set so it matched the actual implementation
- verifying changes using syntax checks and log inspection

### Specific use cases

- tracing the chat event creation flow end to end
- fixing the event save and update commit path
- adding role-based event visibility
- cleaning up unused files and duplicated constants
- documenting schema usage, run instructions, and architecture decisions

### Decision-making value

The main advantage of this tool was that it supported iterative, code-aware work. Rather than generating isolated snippets, it helped with the full workflow:

1. inspect the current state of the repo
2. identify the relevant files
3. apply targeted edits
4. verify the result
5. refine the implementation if the behavior was not correct

This was especially useful for a project where backend, frontend, and database changes had to remain consistent.

---

## 2. GitHub Copilot Used as Supporting Development Assistance

### Tool

- **GitHub Copilot**

### Why it was chosen

GitHub Copilot was used at a lighter level as a supporting AI tool during coding. It was useful for quick inline completions, small repetitive patterns, and helping speed up routine edits while the main architectural reasoning remained with the primary coding assistant.

### How it was used

Copilot was mainly used for:

- inline code completion
- repetitive React and JavaScript patterns
- helper function scaffolding
- small UI adjustments
- reducing typing during repetitive implementation work

### Specific use cases

- assisting with repetitive frontend component edits
- suggesting boilerplate for handlers and helper functions
- accelerating simple code completion while writing scripts and utilities

### Decision-making value

Copilot was not the main decision-making tool in this project, but it helped improve development speed for smaller tasks. It worked best as a lightweight assistant for routine code completion rather than for architecture-level reasoning.

---

## 3. Playwright Used for Screenshot Automation

### Tool

- **Playwright**

### Why it was chosen

Playwright was chosen because the project needed consistent screenshots for documentation and submission. Manual screenshots would have been slower, less repeatable, and harder to keep aligned with the latest UI changes.

### How it was used

Playwright was used to automate:

- login flows
- registration flows
- chat-based event creation screenshots
- event update screenshots
- multilingual screenshots
- clear-session screenshots
- admin user-management screenshots

### Specific use cases

- capturing the admin dashboard
- capturing the event creation confirmation state
- capturing the final event success state
- capturing the role-based event listing view
- capturing the admin password reset workflow

### Decision-making value

Playwright improved repeatability and presentation quality. It made the screenshot workflow part of the engineering process instead of a separate manual task. That was especially useful after UI changes, because screenshots could be regenerated from the latest implementation.

---

## 4. Runtime AI Model Used by the Application

### Tool

- **OpenRouter-based language model integration**

### Why it was chosen

OpenRouter was used as the runtime AI layer because it provides a flexible model-routing approach. The backend can communicate through a single API while still allowing the model choice to be changed from environment configuration. This is useful for a project that may need to adapt the underlying model without changing the application code.

### How it was used

The runtime model is responsible for:

- understanding natural-language user input
- extracting structured event fields from conversation
- maintaining conversational context
- supporting corrections during event creation and update
- responding in the detected or selected language

### Specific use cases

- interpreting requests such as "I want to create an event"
- extracting event metadata like name, timezone, roles, and dates
- handling multi-step confirmation before event commit
- supporting English, Spanish, and French conversation flows
- assisting with event updates such as changing the start date or roles

### Model configuration approach

The application reads its AI settings from environment variables, which means the model can be changed without modifying the source code.

Key configuration values include:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `OPENROUTER_API_URL`
- `OPENROUTER_TIMEOUT_MS`

The project also supports fallback naming through:

- `LLM_API_KEY`
- `LLM_MODEL`
- `LLM_TIMEOUT_MS`

The default model selector is `openrouter/auto`, and the request may be routed by OpenRouter to a provider model such as `google/gemini-2.5-flash-lite` depending on the configured route.

### Decision-making value

This approach was chosen because it balances flexibility and control:

- the app stays provider-agnostic at the integration layer
- the model can be changed from the `.env` file
- the backend still retains deterministic validation
- the project is not locked to a single AI vendor implementation

---

## 5. Why These AI Choices Fit the Project

The project needed AI in two places:

1. during development, to help build and refine the codebase
2. at runtime, to power the chat assistant itself

The development assistant was best for:

- code navigation
- editing multiple files safely
- debugging implementation issues
- documenting the project clearly

GitHub Copilot was most useful for:

- faster inline completion
- repetitive coding patterns
- lightweight implementation assistance during routine edits

Playwright was most useful for:

- reproducible screenshot capture
- consistent project submission assets
- automated documentation of the final user experience

The runtime OpenRouter integration was best for:

- conversational understanding
- multilingual interaction
- flexible model selection
- natural-language event extraction

Together, they supported an AI-augmented workflow without removing the need for strong backend validation and manual review.

---

## 6. AI Tools Not Used

The following tools were not part of the core implementation workflow for this project:

- separate direct Gemini API integration
- a dedicated external code generation agent outside the workspace
- image-generation tooling

They were not necessary because the current project already had a working AI path through OpenRouter and the development work could be completed directly within the repository.

---

## 7. Summary

The project used AI in a practical and controlled way:

- a development assistant helped with code changes, debugging, and documentation
- GitHub Copilot provided lightweight inline support for repetitive development tasks
- Playwright automated screenshot capture for documentation and submission assets
- OpenRouter provided the runtime conversational intelligence layer
- environment-based configuration allowed the model choice to remain flexible
- deterministic backend validation ensured the AI output stayed reliable

This combination made it possible to build an AI-assisted system while keeping the implementation maintainable, testable, and aligned with the assignment requirements.

# AI-Augmented Development Decisions

This document explains the AI tools used for this project, why each tool was chosen, and how each one was used in the workflow and the product itself.

## Goal

The requirement explicitly asked for strong use of AI across:

- planning
- architecting
- developing
- testing
- reviewing
- documentation

The approach taken here was to use AI where it adds leverage, while keeping code quality, scalability, and security controlled through deterministic backend logic, validation, and conventional engineering structure.

## AI Tools Used

Only two actual AI tools were used in this implementation:

- Codex
- OpenRouter LLM API

No additional AI coding plugins, no separate planning bots, and no external AI test-generation services were used.

### 1. Codex

What it is:

- the AI coding assistant used to inspect the repository, identify gaps, implement features, review code paths, and produce documentation

Why it was chosen:

- it is well suited for repository-level reasoning
- it can work across frontend and backend layers in the same task
- it is effective for iterative implementation, gap analysis, and technical writing

How it was used:

- reviewed the existing codebase against the requested requirements
- produced the original gap analysis
- implemented the missing chat-based event creation functionality
- aligned frontend and backend data contracts
- improved security by locking chat sessions to authenticated users
- added documentation for architecture, deployment, AI usage, and requirement closure

Specific workflow use cases:

- requirement analysis
- implementation planning
- backend refactoring
- frontend integration
- code review and verification
- deliverable documentation

### 2. OpenRouter LLM API

What it is:

- the runtime AI service used by the application for conversational event creation

Why it was chosen:

- it provides a flexible LLM gateway with model portability
- it allows the app to keep the AI provider abstraction simple
- it supports structured conversational extraction through JSON-style responses

How it was used in the product:

- powering the event-creation chatbot
- extracting event metadata from natural language
- interpreting flexible user phrasing
- responding in the detected or selected language
- handling step-by-step conversational collection and correction-style requests

Specific product use cases:

- `create an event called Q2 Accelerator`
- `publish it in Asia/Katmandu`
- `start next Monday at 10 AM`
- `set roles to Admin and Manager`
- `change start time to Tuesday 3 PM`

## Non-AI Reliability Layer Used Alongside AI

What it is:

- a non-LLM companion layer implemented in code in [chatEventUtils.js](/e:/AI-Conversational/backend/services/chatEventUtils.js)

Why it was chosen:

- AI alone is not enough for correctness-sensitive workflows
- event creation has business rules that should not be delegated entirely to a model
- deterministic validation improves reliability, scalability, and security

How it was used:

- normalizing timezones, statuses, and roles
- parsing known date expressions
- computing default end and vanish dates when appropriate
- validating required metadata
- enforcing ordering rules like `end_time > start_time`
- validating banner URL format

Specific use cases:

- converting relative phrases like `same day 1 hour later`
- validating that vanish time is after end time
- preventing incomplete event creation

## Why This Combination Was Chosen

The project intentionally uses a hybrid approach:

- AI for understanding natural language and keeping the experience conversational
- deterministic backend logic for correctness, security, and maintainability

This avoids two common failure modes:

- overly rigid form-like behavior with poor conversational UX
- overly permissive AI-only behavior with weak guarantees

## AI Usage Across The Engineering Workflow

### Planning

AI was used to:

- translate the business requirement into technical workstreams
- identify missing capability areas
- break the problem into frontend, backend, data, validation, and documentation concerns

Why AI helped:

- it accelerated broad requirement coverage and edge-case discovery

### Architecting

AI was used to:

- reason about boundaries between chat orchestration, LLM integration, validation helpers, repositories, and UI components
- preserve separation of concerns

Why AI helped:

- it made it easier to expand the app without collapsing the design into one large controller or component

### Developing

AI was used to:

- implement the full event draft structure
- wire the chat flow to persistence
- connect role assignment and event listing
- improve multilingual behavior

Why AI helped:

- it sped up full-stack changes while keeping the implementation aligned with the original repo structure

### Testing

AI was used to:

- inspect whether the implemented code actually closed the earlier requirement gaps
- identify contract mismatches between backend responses and frontend rendering
- support targeted verification instead of broad unfocused manual checking

Specific testing and verification uses:

- backend syntax checks
- frontend production build verification
- security review of session ownership and client-trust boundaries
- requirement re-check after implementation

Why AI helped:

- it reduced manual tracing time while still keeping verification grounded in normal engineering checks

### Reviewing

AI was used to:

- compare code to the acceptance criteria
- identify remaining requirement gaps
- find security issues such as session ownership concerns
- detect schema and UI mismatches

Why AI helped:

- it was effective at whole-system consistency checking

### Documentation

AI was used to:

- write the root README
- record gap closure
- explain architecture and AI decision-making clearly for evaluation

Why AI helped:

- the deliverables required a high level of clarity and traceability, not only working code

## Decision-Making Principles

The main principles behind the AI usage were:

- use AI where interpretation and acceleration matter
- keep correctness-critical rules in deterministic code
- avoid compromising security for convenience
- avoid compromising scalability by storing too much uncontrolled chat context
- document the trade-offs honestly

## Code Quality, Scalability, And Security Safeguards

### Code Quality

AI-generated behavior was constrained by:

- controller/service/repository separation
- centralized draft and validation helpers
- production build verification
- syntax checks after backend changes

### Scalability

Scalability was protected by:

- storing only a bounded slice of recent conversation for the LLM
- persisting chat session state separately from event entities
- keeping validation deterministic and lightweight
- using repository-based data access over inline SQL in controllers

### Security

Security was protected by:

- JWT authentication on chat and event APIs
- session ownership checks on session read, message send, and deletion
- using authenticated `req.user.id` instead of trusting client-supplied user IDs
- server-side validation before event creation
- parameterized SQL queries through repository/data-context layers

## Trade-Offs

Some deliberate trade-offs remain:

- image URL support was prioritized over file upload for faster requirement coverage
- language detection uses lightweight heuristics plus selected language instead of a dedicated language-ID model
- date handling is hybrid rather than fully delegated to an external calendar parser

These choices were made to meet the requirement while preserving implementation clarity and control.

## Summary

The AI strategy for this project was not just "use an LLM in the chatbot."

It was:

- use Codex to analyze, design, implement, review, and document
- use OpenRouter-backed LLM responses for conversational UX
- use deterministic backend logic to keep the final system reliable, scalable, and secure

That combination best matched the evaluation criteria around both AI usage and engineering judgment.


# AI Tools Workflow Documentation

## Overview
This document details all AI tools used in the development workflow, the rationale for each tool selection, and specific use cases within the project.

---

## Tools Used

### 1. **read_file**
**Purpose:** Retrieve and analyze file contents with line number references

**Why Chosen:**
- Essential for understanding existing code structure and context
- Supports reading multiple files in a single request (up to 5 files)
- Allows targeted line range reading for focused analysis
- Provides line numbers for precise code references

**Use Cases in Workflow:**
- Analyzing backend controller logic in [`backend/controllers/authController.js`](backend/controllers/authController.js)
- Reviewing frontend component implementations in [`frontend/src/components/LoginPage.jsx`](frontend/src/components/LoginPage.jsx)
- Examining middleware implementations in [`backend/middleware/errorHandler.js`](backend/middleware/errorHandler.js)
- Understanding API service structure in [`frontend/src/services/api.js`](frontend/src/services/api.js)
- Reviewing authentication context in [`frontend/src/context/AuthContext.jsx`](frontend/src/context/AuthContext.jsx)

---

### 2. **write_to_file**
**Purpose:** Create new files or completely rewrite existing files with full content

**Why Chosen:**
- Efficient for creating new project files from scratch
- Supports automatic directory creation
- Ideal for configuration files and new components
- Ensures complete file integrity without partial updates

**Use Cases in Workflow:**
- Creating new React components for frontend pages
- Generating configuration files (`.env`, `tailwind.config.js`)
- Setting up new backend services and utilities
- Creating documentation files
- Initializing new middleware modules

---

### 3. **edit_file**
**Purpose:** Make targeted, surgical modifications to existing files using search/replace

**Why Chosen:**
- Preserves file integrity with exact matching requirements
- Supports multiple replacements with context
- Maintains original line endings and formatting
- Safer than full file rewrites for existing code

**Use Cases in Workflow:**
- Updating authentication logic in existing controllers
- Modifying error handling middleware
- Adjusting API endpoint configurations
- Refactoring component props and state management
- Fixing bugs in specific functions

---

### 4. **list_files**
**Purpose:** Explore directory structure and file organization

**Why Chosen:**
- Provides clear project hierarchy understanding
- Supports both recursive and top-level listing
- Helps identify file locations without manual exploration
- Essential for understanding project organization

**Use Cases in Workflow:**
- Exploring backend directory structure (`backend/`)
- Examining frontend component organization (`frontend/src/components/`)
- Reviewing repository patterns (`backend/repositories/`)
- Understanding middleware organization (`backend/middleware/`)
- Checking session storage structure (`backend/sessions/`)

---

### 5. **search_files**
**Purpose:** Find patterns and specific content across multiple files using regex

**Why Chosen:**
- Powerful for locating code patterns across the project
- Supports glob patterns for file filtering
- Provides context-rich results with surrounding code
- Efficient for finding TODO comments, function definitions, or specific implementations

**Use Cases in Workflow:**
- Finding all API endpoint definitions across routes
- Locating error handling patterns in middleware
- Searching for specific function implementations
- Identifying all uses of authentication middleware
- Finding configuration constants across the project

---

### 6. **execute_command**
**Purpose:** Run CLI commands on the system for development operations

**Why Chosen:**
- Essential for running npm scripts and package management
- Enables database operations and migrations
- Allows testing and validation of code
- Supports environment setup and configuration

**Use Cases in Workflow:**
- Installing dependencies: `npm install`
- Running development servers: `npm run dev`
- Executing database setup scripts
- Running tests and linters
- Building production bundles
- Managing Docker containers

---

### 7. **delete_file**
**Purpose:** Remove files or directories from the workspace

**Why Chosen:**
- Safely removes files with validation against protection rules
- Supports directory deletion with contained file validation
- Irreversible action requiring careful consideration
- Prevents accidental deletion of protected files

**Use Cases in Workflow:**
- Removing temporary test files
- Cleaning up deprecated components
- Deleting old configuration files
- Removing unused utility functions
- Cleaning up session files

---

### 8. **apply_diff**
**Purpose:** Apply precise, targeted modifications using search/replace blocks

**Why Chosen:**
- More flexible than edit_file for complex changes
- Supports multiple non-contiguous changes in one operation
- Provides exact line number references
- Handles whitespace-sensitive modifications

**Use Cases in Workflow:**
- Applying multiple fixes across a single file
- Updating imports and dependencies
- Refactoring function signatures
- Modifying configuration values
- Updating middleware chains

---

### 9. **browser_action**
**Purpose:** Interact with a Puppeteer-controlled browser for testing and verification

**Why Chosen:**
- Essential for testing frontend functionality
- Allows visual verification of UI changes
- Captures screenshots for debugging
- Enables interaction testing (clicks, typing, navigation)
- Provides console logs for debugging

**Use Cases in Workflow:**
- Testing login page functionality
- Verifying form validation
- Testing navigation between pages
- Capturing UI screenshots for documentation
- Debugging frontend errors through console logs
- Testing responsive design

---

### 10. **ask_followup_question**
**Purpose:** Request clarification or additional information from the user

**Why Chosen:**
- Prevents assumptions about ambiguous requirements
- Provides suggested answers to guide user input
- Ensures correct implementation direction
- Reduces back-and-forth communication

**Use Cases in Workflow:**
- Clarifying file paths or locations
- Confirming feature requirements
- Asking about implementation preferences
- Requesting missing configuration details
- Verifying design decisions

---

### 11. **attempt_completion**
**Purpose:** Present final results and confirm task completion

**Why Chosen:**
- Formally concludes task execution
- Provides clear summary of work completed
- Allows user feedback for improvements
- Prevents unnecessary continuation

**Use Cases in Workflow:**
- Confirming successful file creation
- Summarizing code changes made
- Reporting test results
- Finalizing feature implementations
- Documenting completed tasks

---

### 12. **update_todo_list**
**Purpose:** Track and manage multi-step task progress

**Why Chosen:**
- Provides clear task breakdown and progress tracking
- Supports status updates (pending, in progress, completed)
- Helps manage complex, multi-step projects
- Enables dynamic task addition during execution

**Use Cases in Workflow:**
- Breaking down large features into subtasks
- Tracking implementation progress
- Managing bug fixes across multiple files
- Coordinating multi-component updates
- Documenting completed work steps

---

### 13. **fetch_instructions**
**Purpose:** Retrieve detailed instructions for predefined tasks

**Why Chosen:**
- Provides standardized procedures for complex operations
- Ensures consistency in task execution
- Reduces manual documentation lookup
- Supports MCP server and mode creation

**Use Cases in Workflow:**
- Getting instructions for creating MCP servers
- Understanding mode creation procedures
- Following standardized setup processes
- Implementing complex architectural patterns

---

### 14. **new_task**
**Purpose:** Create new task instances in different modes

**Why Chosen:**
- Enables mode switching for specialized work
- Allows task delegation to appropriate modes
- Supports initial todo list creation
- Facilitates complex multi-mode projects

**Use Cases in Workflow:**
- Switching to Architect mode for design planning
- Creating Debug mode tasks for troubleshooting
- Initiating Code mode for implementation
- Starting Orchestrator mode for complex coordination

---

### 15. **switch_mode**
**Purpose:** Change to a different operational mode

**Why Chosen:**
- Allows specialization for different task types
- Enables mode-specific tool access
- Supports workflow optimization
- Facilitates expert-level task handling

**Use Cases in Workflow:**
- Switching to Debug mode for troubleshooting
- Moving to Architect mode for design decisions
- Transitioning to Review mode for code review
- Changing to Ask mode for explanations

---

## Workflow Integration

### Typical Development Workflow
1. **Planning Phase:** Use `ask_followup_question` to clarify requirements
2. **Analysis Phase:** Use `read_file` and `search_files` to understand existing code
3. **Implementation Phase:** Use `write_to_file` and `edit_file` to create/modify code
4. **Testing Phase:** Use `browser_action` to verify frontend functionality
5. **Validation Phase:** Use `execute_command` to run tests and linters
6. **Completion Phase:** Use `attempt_completion` to report results

### Complex Project Workflow
1. Create initial `update_todo_list` for task breakdown
2. Use `switch_mode` to appropriate specialized mode
3. Execute mode-specific operations
4. Update todo list with progress
5. Coordinate across modes if needed
6. Finalize with `attempt_completion`

---

## Best Practices

### File Operations
- Always use `read_file` before modifying to understand context
- Prefer `edit_file` for targeted changes to existing files
- Use `write_to_file` only for new files or complete rewrites
- Include sufficient context (3+ lines) in search/replace operations

### Code Analysis
- Use `search_files` with specific patterns to locate code
- Combine `list_files` with `read_file` for comprehensive understanding
- Reference files using markdown links with line numbers

### Testing & Verification
- Use `browser_action` after frontend changes
- Use `execute_command` to run automated tests
- Capture screenshots for documentation

### Communication
- Use `ask_followup_question` to prevent assumptions
- Provide clear context in tool parameters
- Document decisions in code comments

---

## Tool Selection Decision Matrix

| Task Type | Primary Tool | Secondary Tools |
|-----------|-------------|-----------------|
| Understanding Code | `read_file` | `search_files`, `list_files` |
| Creating Files | `write_to_file` | `edit_file` |
| Modifying Code | `edit_file` | `apply_diff`, `read_file` |
| Finding Patterns | `search_files` | `read_file` |
| Testing Frontend | `browser_action` | `execute_command` |
| Running Scripts | `execute_command` | `browser_action` |
| Clarifying Requirements | `ask_followup_question` | N/A |
| Tracking Progress | `update_todo_list` | N/A |
| Completing Tasks | `attempt_completion` | N/A |

---

## Conclusion

This comprehensive toolkit enables efficient, systematic development workflows. Each tool serves a specific purpose in the development lifecycle, from planning and analysis through implementation, testing, and completion. Proper tool selection and usage ensures code quality, project organization, and effective communication throughout the development process.

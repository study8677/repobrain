## ADDED Requirements

### Requirement: Project Context Refresh
The system SHALL scan a project directory and generate/update context files in `.antigravity/` that help AI IDEs understand the project.

#### Scenario: Full refresh on new project
- **WHEN** a user runs `ag refresh --workspace /path/to/project`
- **THEN** the system scans the project structure, languages, frameworks, and conventions
- **AND** writes updated context to `.antigravity/conventions.md`

#### Scenario: Quick refresh with git diff
- **WHEN** a user runs `ag refresh --quick --workspace /path/to/project`
- **AND** a `.antigravity/.last_refresh_sha` file exists
- **THEN** the system only scans files changed since that commit SHA
- **AND** updates context files incrementally

### Requirement: Project Question Answering
The system SHALL answer natural language questions about a project using scanned context and LLM reasoning.

#### Scenario: Ask about project
- **WHEN** a user runs `ag ask "What framework does this project use?" --workspace /path/to/project`
- **THEN** the system reads project context from `.antigravity/`
- **AND** returns a natural language answer

### Requirement: Offline Report Logging
The system SHALL allow users to log reports to `.antigravity/memory/reports.md` without requiring an LLM.

#### Scenario: Log a report
- **WHEN** a user runs `ag report "Auth race condition found in login handler"`
- **THEN** the system appends a timestamped entry to `.antigravity/memory/reports.md`

### Requirement: Decision Logging
The system SHALL allow users to log architectural decisions to `.antigravity/decisions/log.md` without requiring an LLM.

#### Scenario: Log a decision
- **WHEN** a user runs `ag log-decision "Use Redis for sessions" "Team already familiar with Redis"`
- **THEN** the system appends a timestamped entry with decision and rationale to `.antigravity/decisions/log.md`

### Requirement: LLM Configuration Error Handling
The system SHALL provide clear error messages when LLM-dependent commands are run without LLM configuration.

#### Scenario: No LLM configured
- **WHEN** a user runs `ag ask "question"` without any LLM API keys configured
- **THEN** the system prints a single concise error line to stderr
- **AND** exits with code 1
- **AND** does NOT print a full traceback

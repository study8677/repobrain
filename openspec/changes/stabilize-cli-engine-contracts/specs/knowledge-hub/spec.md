## ADDED Requirements

### Requirement: CLI Proxy Commands Use Supported Engine Entry Points
The system SHALL route `ag ask` and `ag refresh` through published engine
entrypoints rather than unpublished legacy binaries.

#### Scenario: Ask through the CLI package
- **WHEN** a user runs `ag ask "question" --workspace /path/to/project`
- **AND** the engine package is installed
- **THEN** the CLI invokes a supported engine entrypoint
- **AND** the question is answered by the knowledge-hub ask pipeline

#### Scenario: Refresh through the CLI package
- **WHEN** a user runs `ag refresh --workspace /path/to/project`
- **AND** the engine package is installed
- **THEN** the CLI invokes a supported engine entrypoint
- **AND** the knowledge base refresh pipeline runs successfully

#### Scenario: Engine package missing
- **WHEN** a user runs `ag ask ...` or `ag refresh ...` without the engine
  package installed
- **THEN** the CLI exits with a concise installation hint
- **AND** it does not reference unsupported command names

### Requirement: Module Entry Points Mirror Supported Hub Actions
The engine package SHALL expose stable module entrypoints for ask, refresh, and
MCP operations.

#### Scenario: Execute ask via module invocation
- **WHEN** a developer runs
  `python -m antigravity_engine ask "question" --workspace /path/to/project`
- **THEN** the engine dispatches to the ask pipeline
- **AND** the behavior matches `ag-ask`

#### Scenario: Execute refresh via hub module invocation
- **WHEN** a developer runs
  `python -m antigravity_engine.hub refresh --workspace /path/to/project`
- **THEN** the engine dispatches to the refresh pipeline
- **AND** the behavior matches `ag-refresh`

#### Scenario: Execute MCP via module invocation
- **WHEN** a developer runs
  `python -m antigravity_engine.hub mcp --workspace /path/to/project`
- **THEN** the engine starts the knowledge-hub MCP server
- **AND** the behavior matches `ag-mcp`

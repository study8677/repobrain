## ADDED Requirements

### Requirement: Automatic Knowledge Refresh Selection
The system SHALL choose the knowledge update mode automatically when
`rb-refresh` runs. It SHALL require clean committed Git state and choose under
the refresh lock: forced complete rebuild, matching interrupted-task resume,
first complete build, committed-diff incremental update, or an already-current
no-op. The no-op SHALL make zero model calls. Incremental planning failures
SHALL fail explicitly without falling back to a complete rebuild.

#### Scenario: First build including legacy scan-only state
- **WHEN** a workspace has no complete usable generation baseline
- **AND** its Git state is clean
- **THEN** `rb-refresh` builds a complete first generation automatically

#### Scenario: New committed changes
- **WHEN** a usable baseline exists and HEAD contains new committed changes
- **THEN** `rb-refresh` runs the existing Planner/Verifier incremental flow
- **AND** only groups proven affected have their knowledge regenerated

#### Scenario: Already current
- **WHEN** no matching unfinished task exists and the baseline matches HEAD
- **THEN** `rb-refresh` returns an already-current result without model calls

#### Scenario: Explicit full rebuild
- **WHEN** the user runs `rb-refresh --full`
- **THEN** a new complete task is started even if knowledge is already current

#### Scenario: Corrupt modern baseline
- **WHEN** modern baseline records are corrupt and no force-full was requested
- **THEN** refresh fails with a `--full` repair hint without silent rebuilding

### Requirement: Safe Interrupted Refresh Recovery
The system SHALL preserve full and incremental refresh progress on failure or
interruption. It SHALL save group documents atomically before recording success,
validate required artifacts on resume, and reuse only tasks whose target commit,
baseline, and generation configuration match the current run. Source state
SHALL be checked again before publishing a complete generation. Failures SHALL
leave the currently usable generation active.

#### Scenario: Resume a matching interrupted task
- **WHEN** a matching full or incremental task is unfinished
- **THEN** `rb-refresh` resumes it and skips valid completed work
- **AND** missing or invalid artifacts are regenerated rather than skipped

#### Scenario: Task identity changed
- **WHEN** the target commit, baseline, or generation configuration changed
- **THEN** stale task progress is not reused and refresh is replanned

#### Scenario: Error or code changes before publication
- **WHEN** a task fails or source state changes before publication
- **THEN** no incomplete generation replaces the current usable knowledge

### Requirement: Unified Refresh Interfaces Without Legacy Modes
The system SHALL expose `full=False` through the Python refresh API, MCP and
knowledge-layer tool, and `--full` through CLI and slash commands. The workspace
SHALL default to the current directory where optional. Removed refresh mode
arguments SHALL be rejected. Ask SHALL remain read-only and suggest
`rb-refresh` when knowledge is stale.

#### Scenario: Removed argument rejected
- **WHEN** an entrypoint receives `--quick`, `--failed-only`, or a removed `quick` argument
- **THEN** it reports an argument error without starting a different refresh mode

#### Scenario: Same automatic behavior across entrypoints
- **WHEN** CLI, slash commands, MCP, or the knowledge-layer tool requests refresh
- **THEN** they use the same automatic engine policy and propagate failure

#### Scenario: Ask sees stale knowledge
- **WHEN** ask detects newer committed code
- **THEN** it suggests `rb-refresh` and does not perform a knowledge update

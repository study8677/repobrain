## ADDED Requirements

### Requirement: Local Knowledge Selection by Commit
The system SHALL retain successful local generations and select complete,
configuration-compatible knowledge by Git commit rather than branch name.

#### Scenario: Return to an indexed commit
- **WHEN** the user checks out a commit with a saved usable generation
- **THEN** ask reads that generation without updating the active pointer
- **AND** refresh reuses it without model calls

#### Scenario: Incremental refresh after switching branches
- **WHEN** HEAD has no exact knowledge but has a usable indexed ancestor
- **THEN** refresh clones the nearest usable ancestor for incremental updating
- **AND** never uses an unrelated sibling tip as the selected baseline

#### Scenario: No usable ancestor
- **WHEN** no exact knowledge or usable ancestor exists
- **THEN** refresh starts a complete build using the existing publication rules

#### Scenario: Unfinished or invalid generation
- **WHEN** a historical generation is unfinished, damaged, or incompatible
- **THEN** it is not reused as complete knowledge
- **AND** matching interrupted work remains eligible for explicit refresh recovery

### Requirement: Versioned Ask Isolation
Versioned ask SHALL prefer exact knowledge, otherwise the nearest compatible
ancestor on current history, and pin it for the whole answer. Ask SHALL allow
uncommitted changes without refreshing knowledge or publishing pointers.

#### Scenario: Current commit has no usable knowledge
- **WHEN** neither HEAD nor its ancestors have complete compatible knowledge
- **THEN** it stops before model invocation and requests rb-refresh
- **AND** it does not substitute unrelated sibling knowledge

#### Scenario: Uncommitted or newer committed source
- **WHEN** staged, unstaged, untracked, or newer committed changes exist
- **THEN** ask continues with historical knowledge and current-source context
- **AND** answer agents receive a bounded diff and must verify affected facts
- **AND** the answer identifies the historical knowledge commit
- **AND** cached retrieval-only shortcuts do not bypass current-source verification

#### Scenario: Source changes during an answer
- **WHEN** the user continues editing while an answer is generated
- **THEN** ask returns the answer with a notice to check latest source
- **AND** if HEAD changes it requires a retry rather than mixing branch versions

#### Scenario: Legacy flat knowledge
- **WHEN** the workspace only has legacy flat knowledge
- **THEN** Git-backed knowledge requires a current or ancestor commit marker
- **AND** non-Git workspaces retain their existing behavior

## ADDED Requirements

### Requirement: Contributor Setup Matches the Split Package Layout
The repository SHALL document a contributor workflow that matches the real
`cli/` and `engine/` package boundaries.

#### Scenario: Fresh clone setup
- **WHEN** a contributor follows the repository setup instructions from a fresh
  clone
- **THEN** every documented install command targets an existing package or file
- **AND** the documented commands do not rely on a nonexistent repo-root Python
  package

#### Scenario: Command references stay current
- **WHEN** the repository documents supported runtime or test commands
- **THEN** those commands match the commands shipped by the repository
- **AND** the docs do not instruct contributors to use `ag-engine` or `ag-hub`

### Requirement: CI Exercises the Same Supported Surfaces
The repository SHALL verify both packages and their documented entrypoints in
GitHub Actions.

#### Scenario: Engine and CLI tests run in CI
- **WHEN** a change is pushed or proposed in a pull request
- **THEN** GitHub Actions installs the engine package and runs `engine/tests/`
- **AND** installs the CLI package and runs `cli/tests/`

#### Scenario: CLI packaging regressions are caught before merge
- **WHEN** the CLI package cannot be imported or its command surface drifts
- **THEN** the GitHub Actions workflow fails before merge

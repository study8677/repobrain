## MODIFIED Requirements

### Requirement: Cross-Platform Installation
The system SHALL provide an automated installation mechanism that works on
Linux, macOS, and Windows.

#### Scenario: Linux/Mac Installation
- **WHEN** a user runs the installer shell script (e.g., `install.sh`) on a
  POSIX system
- **THEN** it checks for Python 3.x and Git
- **AND** creates a python virtual environment
- **AND** installs the package or packages required by the chosen workflow
- **AND** initializes the workspace configuration

#### Scenario: Windows Installation
- **WHEN** a user runs the installer batch/powershell script (e.g.,
  `install.bat` or `install.ps1`) on Windows
- **THEN** it checks for Python 3.x and Git
- **AND** creates a python virtual environment
- **AND** installs the package or packages required by the chosen workflow
- **AND** initializes the workspace configuration

#### Scenario: CLI Package Installation via pip
- **WHEN** a user runs `pip install ./cli` or
  `pip install "git+https://...#subdirectory=cli"`
- **THEN** the CLI package is installed successfully
- **AND** the `ag` command is available on PATH

#### Scenario: Engine Package Installation via pip
- **WHEN** a user runs `pip install ./engine` or
  `pip install "git+https://...#subdirectory=engine"`
- **THEN** the engine package is installed successfully
- **AND** `ag-ask`, `ag-refresh`, and `ag-mcp` are available on PATH
- **AND** `python -m antigravity_engine ask ...` works as a source-checkout
  alternative

### Requirement: Environment Validation
The installer SHALL verify that all necessary system prerequisites are met
before attempting installation.

#### Scenario: Missing Python
- **WHEN** the installer detects Python is missing or an incompatible version
- **THEN** it halts execution and displays a clear error message instructing the
  user to install Python

#### Scenario: Missing Git
- **WHEN** the installer detects Git is missing
- **THEN** it halts execution and displays a clear error message instructing the
  user to install Git

## ADDED Requirements

### Requirement: Supported Container Runtime Command
The repository SHALL use a published, supported runtime command for container
execution.

#### Scenario: Docker image starts the knowledge-hub runtime
- **WHEN** a user builds and runs the repository Docker image
- **THEN** the image starts with a command that is published by the installed
  package
- **AND** that command matches the runtime documented in the repository

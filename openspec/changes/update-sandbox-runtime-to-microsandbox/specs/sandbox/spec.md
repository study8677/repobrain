## ADDED Requirements

### Requirement: Microsandbox Runtime Option
The system MUST support `SANDBOX_TYPE=microsandbox` as an execution runtime option that integrates with a running Microsandbox server.

#### Scenario: Execute Python code via microsandbox
- **GIVEN** `SANDBOX_TYPE=microsandbox`
- **AND** Microsandbox server is reachable
- **WHEN** the execution tool runs Python code
- **THEN** execution is performed in Microsandbox
- **AND** result is returned in the same `ExecutionResult` shape used by other runtimes

### Requirement: Local Runtime Remains Default
The default runtime MUST remain `local` to preserve zero-config behavior.

#### Scenario: Default runtime selection
- **GIVEN** `SANDBOX_TYPE` is unset
- **WHEN** sandbox factory resolves runtime
- **THEN** it returns local runtime implementation

### Requirement: Actionable Failure for Missing Microsandbox Service
When microsandbox runtime is selected but unreachable, the system MUST return a clear actionable error.

#### Scenario: Microsandbox server unavailable
- **GIVEN** `SANDBOX_TYPE=microsandbox`
- **AND** Microsandbox server is not reachable
- **WHEN** code execution is requested
- **THEN** execution fails gracefully
- **AND** error message explains how to start/configure Microsandbox server

## REMOVED Requirements

### Requirement: Docker Runtime Option
The runtime option `SANDBOX_TYPE=docker` is removed from supported sandbox selection.

#### Scenario: Unsupported docker runtime value
- **GIVEN** `SANDBOX_TYPE=docker`
- **WHEN** sandbox factory resolves runtime
- **THEN** docker runtime is not selected
- **AND** system falls back to default behavior or returns a clear unsupported-runtime message per implementation policy

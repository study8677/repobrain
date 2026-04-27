# Tasks: Replace Docker Sandbox Runtime with Microsandbox

## 1. Runtime Implementation
- [x] 1.1 Add `src/sandbox/microsandbox_exec.py` implementing `CodeSandbox`.
- [x] 1.2 Implement start/run/stop flow against Microsandbox server RPC endpoints.
- [x] 1.3 Preserve `ExecutionResult` shape with timeout/truncation metadata.

## 2. Factory and Exports
- [x] 2.1 Update `src/sandbox/factory.py` to support `local`, `microsandbox`, `e2b`.
- [x] 2.2 Remove Docker runtime branch from factory resolution.
- [x] 2.3 Update `src/sandbox/__init__.py` exports as needed.

## 3. Configuration and Skill Defaults
- [x] 3.1 Update `.env.example` to document Microsandbox variables and remove Docker runtime vars.
- [x] 3.2 Update repo-init generation so full mode no longer writes `SANDBOX_TYPE=docker`.

## 4. Tests
- [x] 4.1 Replace Docker runtime tests with Microsandbox runtime tests using mocks.
- [x] 4.2 Update factory tests for microsandbox selection.
- [x] 4.3 Update repo-init tests for sandbox type output changes.

## 5. Docs
- [x] 5.1 Update README sandbox runtime section (`docker` -> `microsandbox`).
- [x] 5.2 Update docs/en/SANDBOX.md runtime and config examples.

## 6. Validation
- [x] 6.1 Run targeted pytest suite and save logs in `artifacts/logs/`.
- [ ] 6.2 Run `openspec validate update-sandbox-runtime-to-microsandbox --strict`.

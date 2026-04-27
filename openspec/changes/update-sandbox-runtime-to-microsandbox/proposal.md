# Change: Replace Docker Sandbox Runtime with Microsandbox

## Why
The current sandbox runtime options include `docker`, but the project wants to move to the Microsandbox model (`https://github.com/zerocore-ai/microsandbox`) for stronger isolation semantics and a unified runtime method.

## What Changes
- Replace runtime option `docker` with `microsandbox` in sandbox factory selection.
- Add `MicrosandboxSandbox` implementation that executes Python code through Microsandbox server RPC.
- Remove Docker runtime execution path from active sandbox selection.
- Update repo-init defaults and documentation so generated projects no longer emit `SANDBOX_TYPE=docker`.
- Add/adjust tests for microsandbox runtime resolution and execution parsing.

## Impact
- Affected specs: `sandbox` capability (execution runtime selection and behavior).
- Affected code:
  - `src/sandbox/factory.py`
  - `src/sandbox/` (new microsandbox runtime module)
  - `src/skills/agent_repo_init_core.py`
  - `tests/test_factory.py`
  - Docker runtime tests replaced/updated
  - `.env.example` and runtime docs/README

## Breaking Changes
- `SANDBOX_TYPE=docker` is no longer a supported runtime value after migration.
- Docker-specific environment variables (`DOCKER_*`) are no longer used by the sandbox runtime.

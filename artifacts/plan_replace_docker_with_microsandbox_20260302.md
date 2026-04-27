# Plan: Replace Docker Sandbox with Microsandbox Runtime

## Task ID
replace_docker_with_microsandbox_20260302

## Goal
Remove Docker as the sandbox backend option and switch to Microsandbox-based execution while keeping `local` as the zero-config default.

## Current State
- `src/sandbox/factory.py` supports `local`, `docker`, and placeholder `e2b`.
- Docker path is implemented in `src/sandbox/docker_exec.py` and tested in `tests/test_docker_sandbox.py`.
- Docs and `.env.example` expose Docker-specific settings.
- Repo-init skill can emit `SANDBOX_TYPE=docker` in full mode.

## Target State
- Factory supports `local`, `microsandbox`, and `e2b`.
- New backend `MicrosandboxSandbox` runs Python code via Microsandbox server RPC.
- Docker backend code/tests/docs are removed or deprecated from runtime selection.
- Repo-init skill no longer writes Docker as sandbox type.

## Execution Plan
1. Add OpenSpec change proposal and spec delta for this architecture change.
2. Implement `src/sandbox/microsandbox_exec.py` with sync `execute()` interface.
3. Update `src/sandbox/factory.py` to resolve `SANDBOX_TYPE=microsandbox`.
4. Remove Docker-specific factory branch and update imports/exports.
5. Update tests:
   - Replace Docker sandbox tests with Microsandbox tests (mocking HTTP responses).
   - Update factory tests to check microsandbox resolution.
   - Adjust repo-init tests for new sandbox defaults.
6. Update `.env.example`, README docs, and sandbox docs to reflect Microsandbox settings.
7. Run `pytest tests/test_local_sandbox.py tests/test_factory.py tests/test_execution_tool.py -v` and targeted new microsandbox tests.
8. Save test evidence to `artifacts/logs/`.

## Risks
- Microsandbox server is an external runtime dependency and may not be installed on all dev machines.
- RPC response shape may evolve (project is marked experimental).
- Need clear fallback/error behavior when server is unavailable.

## Mitigations
- Keep `local` as default runtime.
- Return explicit actionable error when `microsandbox` mode is selected but unavailable.
- Cover parser and error paths with mocked unit tests.

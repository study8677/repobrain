# Design: Stabilize CLI and Engine Contracts

## Context

The project has evolved from a single-engine package into a split-package
layout:

- `cli/` provides `ag` for template injection and offline logging.
- `engine/` provides the knowledge-hub runtime and MCP server.

The external contract did not converge after that split. Today:

- `cli/src/ag_cli/cli.py` still searches for `ag-hub` and `ag-engine`.
- `engine/antigravity_engine/hub/__main__.py` imports a `hub_main` function that
  does not exist.
- `Dockerfile`, `AGENTS.md`, and repo-init guidance still point at
  `ag-engine`.
- CI verifies only `ag version`, so `cli/tests/` can fail at import time
  without blocking merges.

## Goals

- Publish and document one supported command surface for the CLI and engine.
- Make direct Python module execution work in editable/source-checkout flows.
- Ensure Docker, scaffolded instructions, docs, and CI all use the same
  supported entrypoints.
- Catch CLI packaging and import regressions in GitHub Actions.

## Non-Goals

- Re-architect the Hub internals
- Change module-detection semantics
- Add a package publishing workflow

## Decisions

### 1. Canonical command surface

The project will use this contract:

- CLI package:
  - `ag init`
  - `ag report`
  - `ag log-decision`
  - `ag ask`
  - `ag refresh`
- Engine package:
  - `ag-ask`
  - `ag-refresh`
  - `ag-mcp`

`ag ask` and `ag refresh` remain the user-facing convenience commands inside the
CLI package, but they proxy to the engine package's canonical scripts.

`ag-engine` and `ag-hub` are treated as unsupported legacy names and removed
from runtime dependencies, docs, and generated guidance.

### 2. Python module fallbacks

The engine package will provide stable module entrypoints for local checkout
execution:

- `python -m antigravity_engine ask ...`
- `python -m antigravity_engine refresh ...`
- `python -m antigravity_engine mcp ...`
- `python -m antigravity_engine.hub ask ...`
- `python -m antigravity_engine.hub refresh ...`
- `python -m antigravity_engine.hub mcp ...`

This removes the need for CLI fallbacks to shell out to unpublished binaries.

### 3. Runtime alignment

Generated next steps and runtime surfaces will use supported knowledge-hub
commands only:

- Repo-init guidance points contributors to `ag-refresh` instead of
  `ag-engine`.
- The Docker runtime defaults to a supported long-running service entrypoint
  instead of an unpublished binary.

### 4. Contributor workflow parity

The repo will document and test explicit package-scoped workflows instead of a
nonexistent repo-root package workflow.

Docs and CI will both use the split layout directly:

- install CLI from `cli/`
- install engine from `engine/`
- run `cli/tests/`
- run `engine/tests/`

## Risks and Mitigations

### Risk: Breaking legacy local scripts

Some local environments may still invoke `ag-engine` or `ag-hub`.

Mitigation:
- Remove those names from repo-managed guidance first.
- Update all first-party call sites in the same change.
- Add clear error/help text when the engine package is not installed.

### Risk: CI becomes slower

Running CLI tests adds time to GitHub Actions.

Mitigation:
- Keep CLI job lightweight and package-scoped.
- Reuse direct package installs rather than a heavyweight repo bootstrap.

### Risk: Knowledge-hub capability is still only defined in a pending change

The repo has an unarchived `add-knowledge-hub` OpenSpec change.

Mitigation:
- Treat the implemented knowledge-hub behavior as the baseline for this change.
- Capture the new contract explicitly in this change so later archive work has a
  clearer target state.

# Change: Stabilize CLI and Engine Contracts

## Why

The repository currently ships two Python packages, but the supported command
surface is inconsistent across code, Docker, scaffolded next steps, CI, and
docs. The engine package publishes `ag-ask`, `ag-refresh`, and `ag-mcp`, while
the CLI package, Dockerfile, and setup guidance still reference `ag-engine` and
`ag-hub`. This drift already hides real failures because the CLI test suite is
not exercised in GitHub Actions.

Before deeper Hub optimizations, the project needs one authoritative contract
for installation, invocation, and verification.

## What Changes

- Define a canonical command contract for the split `cli/` and `engine/`
  packages.
- Replace unsupported `ag-engine` / `ag-hub` references with supported
  knowledge-hub entrypoints.
- Add explicit Python module entrypoints for local-source execution so CLI
  fallbacks do not depend on unpublished console scripts.
- Align Docker runtime and generated repo-init next steps with the supported
  entrypoints.
- Expand CI and contributor docs so both packages are installed and tested using
  the same documented commands.

## Impact

- Affected specs: `deployment` (modified), `knowledge-hub` (added),
  `developer-workflow` (added)
- Affected code:
  - `cli/src/ag_cli/cli.py`
  - `cli/tests/`
  - `engine/antigravity_engine/_cli_entry.py`
  - `engine/antigravity_engine/__main__.py`
  - `engine/antigravity_engine/hub/__main__.py`
  - `engine/antigravity_engine/skills/agent_repo_init_core.py`
  - `Dockerfile`
  - `.github/workflows/test.yml`
  - `README.md`
  - `AGENTS.md`

## Non-Goals

- Refactoring Hub module-detection heuristics
- Reworking Router/worker prompt design
- Introducing release/publish automation beyond CI parity

# Stabilize CLI and Engine Contracts Plan

## Goal

Stabilize the project's first-run and contributor experience by aligning the
CLI package, engine package, Docker runtime, CI workflow, and documentation on
one supported command contract.

## Why This Phase Comes First

- The repo currently advertises commands that are not actually published by the
  engine package.
- The CLI package shells out to legacy command names that no longer exist.
- GitHub Actions does not exercise the CLI test suite, so import/package drift
  can ship unnoticed.
- README and AGENTS instructions describe a root install/test workflow that does
  not match the split `cli/` + `engine/` package layout.

## Scope

### In Scope

- Canonical command surface for `ag`, `ag-ask`, `ag-refresh`, and `ag-mcp`
- Python module entrypoints for local development fallbacks
- Docker and generated next-step instructions
- CI coverage for both `cli/` and `engine/`
- README and AGENTS command parity

### Out of Scope

- Hub module-detection heuristics
- Router/worker prompt redesign
- Knowledge graph or retrieval refactors
- Release automation beyond CI parity

## Proposed Sequence

1. Define the canonical runtime contract in OpenSpec.
2. Replace `ag-engine` / `ag-hub` references with supported entrypoints.
3. Add a shared engine dispatcher for module execution.
4. Update Docker and generated setup instructions.
5. Extend CI to install and test both packages.
6. Rewrite README and AGENTS commands to match the real package layout.

## Follow-Up Backlog

### Phase 2

- Tighten Hub module detection so documentation/config folders do not become
  module agents by accident.
- Reduce Hub compatibility shims and clarify public vs private module
  boundaries.

### Phase 3

- Add ignore rules for generated local artifacts such as `.antigravity/`,
  runtime memory files, and temporary planning outputs.
- Consider a release/build smoke-test workflow for package publishing.

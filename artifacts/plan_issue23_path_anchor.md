# Plan: Fix issue #23 path anchoring for artifacts/log outputs

## Goal
Ensure outputs promised by docs (artifacts and logs) are written under this repository workspace instead of Antigravity default paths when runtime CWD differs.

## Scope
- Add explicit project-root based path resolution in settings.
- Apply path anchoring for memory and MCP config loading.
- Ensure runtime starts from project root in CLI entrypoint.
- Update docs to reflect the actual behavior and configuration.
- Add regression tests for path anchoring behavior.

## Validation
- Run targeted tests for memory/config path behavior.
- Run full `pytest` and store log under `artifacts/logs/`.

# Plan: Multi-Language Semantic Refresh Validation and Hardening

## Target
- Validate the adapter-backed semantic refresh pipeline against the current
  repository as the target repo because the user-provided placeholder path was
  not replaced.

## Validation scope
- Run the real refresh CLI path users invoke: `venv/bin/ag refresh --workspace .`
- Capture stdout/stderr and generated artifacts under `artifacts/logs/`
- Run the same refresh path against:
  - a realistic Go workspace fixture
  - a mixed Python + Go workspace fixture
- Inspect graph and grouping output quality, not just exit codes

## Hardening work
- Fix any real-world issues found during refresh validation
- Add lightweight semantic diagnostics:
  - adapter counts
  - semantic file counts by language
  - semantic edge counts by type
  - generic fallback file listing
- Verify graph-output compatibility for downstream consumers
- Add regression tests for realistic validation issues and compatibility

## Deliverables
- Validation logs in `artifacts/logs/`
- Concise validation report under `artifacts/`
- Short implementation-grounded adapter/IR doc in the repo

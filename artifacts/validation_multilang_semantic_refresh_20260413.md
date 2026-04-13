# Multi-Language Semantic Refresh Validation

## Scope

- Target repo: current workspace `antigravity-workspace-template`
- Additional refresh fixtures:
  - `artifacts/validation/realistic_go_workspace`
  - `artifacts/validation/mixed_py_go_workspace`
- Validation date: 2026-04-13

## Commands Run

### Real refresh path

```bash
./venv/bin/ag refresh --workspace .
AG_REFRESH_SCAN_ONLY=1 ./venv/bin/ag refresh --workspace .
AG_REFRESH_SCAN_ONLY=1 ./venv/bin/ag refresh --workspace artifacts/validation/realistic_go_workspace
AG_REFRESH_SCAN_ONLY=1 ./venv/bin/ag refresh --workspace artifacts/validation/mixed_py_go_workspace
```

### Grouping and compatibility inspection

```bash
PYTHONPATH=engine python3 -c '... detect_modules/load_module_files/group_files ...'
PYTHONPATH=engine python3 -c '... load graph-retrieval skill and call query_graph(...) ...'
```

### Tests

```bash
PYTHONPATH=engine python3 -m pytest \
  engine/tests/test_hub_semantic_graph.py \
  engine/tests/test_graph_skills.py \
  engine/tests/test_hub_module_grouping.py \
  engine/tests/test_hub_scanner.py \
  engine/tests/test_hub_pipeline.py \
  -q
```

## Logs

- Full refresh failure (no LLM configured):
  - `artifacts/logs/refresh_target_repo_20260413.stderr.log`
- Successful scan-only refresh:
  - `artifacts/logs/refresh_target_repo_scan_only_20260413.stdout.log`
  - `artifacts/logs/refresh_target_repo_scan_only_20260413.stderr.log`
- Fixture refresh logs:
  - `artifacts/logs/refresh_realistic_go_workspace_20260413.stdout.log`
  - `artifacts/logs/refresh_realistic_go_workspace_20260413.stderr.log`
  - `artifacts/logs/refresh_mixed_py_go_workspace_20260413.stdout.log`
  - `artifacts/logs/refresh_mixed_py_go_workspace_20260413.stderr.log`
- Grouping inspection:
  - `artifacts/logs/target_repo_grouping_inspection_20260413.json`
  - `artifacts/logs/grouping_realistic_go_workspace_20260413.json`
  - `artifacts/logs/grouping_mixed_py_go_workspace_20260413.json`
- Runtime graph consumer check:
  - `artifacts/logs/query_graph_target_repo_20260413.json`
- Pytest:
  - `artifacts/logs/pytest_multilang_semantic_validation_20260413.log`

## Results

### 1. Target repo refresh

The user-facing `ag refresh --workspace .` command failed before refresh due
missing LLM configuration:

- error: `No LLM configured. Set GOOGLE_API_KEY, OPENAI_API_KEY, or OPENAI_BASE_URL in .env`

After hardening, the same CLI path succeeds in scan-only mode and regenerates
the semantic artifacts.

Raw target-repo graph summary after the hardened scan-only run:

- file_count: `339`
- semantic_files: `93`
- semantic_files_by_language:
  - `Python: 84`
  - `Go: 8`
  - `Shell: 1`
- semantic_adapters:
  - `python: 84`
  - `go: 8`
  - `generic: 1`
- semantic_edges_by_type:
  - `declares_package: 93`
  - `defines: 458`
  - `entrypoint: 5`
  - `imports: 353`
  - `tests: 28`
- generic fallback files:
  - `engine/install.sh`

Notes:

- The repo-level refresh now exposes diagnostics in `knowledge_graph.json`.
- The target repo scan includes the validation fixtures under
  `artifacts/validation/`, because they live inside the workspace and the scan
  intentionally does not special-case artifact directories.

Target-repo grouping inspection (`target_repo_grouping_inspection_20260413.json`):

- modules detected: `7`
- total groups: `11`
- suspicious single-file non-test groups:
  - `scripts/demo_tools.py`
  - `skills/agent-repo-init/scripts/init_project.py`

These two are legitimate isolates in this repo shape; no crash or incorrect
multi-file merge was observed.

### 2. Realistic Go workspace

Refresh summary:

- semantic_files: `6`
- semantic_files_by_language: `{"Go": 6}`
- semantic_edges_by_type:
  - `declares_package: 6`
  - `defines: 12`
  - `entrypoint: 2`
  - `imports: 7`
  - `tests: 1`

Grouping quality:

- modules detected: `cmd`, `internal`, `pkg`
- `internal` grouped semantically, not just by folder coincidence:
  - `internal/httpserver/server.go`
  - `internal/repo/store.go`
  - `internal/service/service.go`
- test relations were present:
  - `internal/service/service_test.go --tests--> example.com/realgo/internal/service`
- entrypoints were present:
  - `init`
  - `main`

### 3. Mixed Python + Go workspace

Refresh summary:

- semantic_files: `5`
- semantic_files_by_language:
  - `Go: 2`
  - `Python: 3`
- semantic_edges_by_type:
  - `declares_package: 5`
  - `defines: 5`
  - `entrypoint: 1`
  - `imports: 2`

Grouping quality:

- modules detected: `goapp`, `pyapp`
- `goapp` grouped into one semantic group:
  - `goapp/cmd/app/main.go`
  - `goapp/internal/worker/worker.go`
- the Go import relation was normalized correctly:
  - `goapp/cmd/app/main.go --imports--> example.com/mixed/goapp/internal/worker`

## Issues Found

1. `AG_REFRESH_SCAN_ONLY=1` still failed without an LLM.
   - Root cause: `refresh_pipeline` eagerly imported/created the model before
     checking scan-only mode.

2. Nested Go modules produced incorrect package identities.
   - Example before fix:
     - `example.com/mixed/goapp/goapp/internal/worker`
   - Impact:
     - import matching failed
     - grouping fell back to weaker directory/tiny-group heuristics

3. Scan-only CLI output falsely reported preserved module-registry artifacts as
   updated.

4. Semantic validation required ad hoc scripts because graph output did not
   expose adapter/file-level diagnostics.

## Fixes Applied

1. Made `refresh_pipeline` lazy-load LLM config/model setup only when the run
   is not scan-only.

2. Fixed Go module normalization to compute package identities relative to the
   nearest `go.mod` root, not the workspace root.

3. Updated refresh artifact reporting so skipped stages print `Preserved ...`
   instead of `Updated ...`.

4. Added graph diagnostics and file-level semantic metadata:
   - summary counts by language, adapter, and edge type
   - generic fallback and parse-error reporting
   - per-file adapter/language/package metadata on file nodes

5. Added regression protection for:
   - realistic Go refresh
   - mixed nested-Go + Python refresh
   - generic fallback diagnostics
   - downstream graph consumer compatibility

## Compatibility

- Schema string remains `antigravity-knowledge-graph-v2`.
- Output expanded, but compatibility was checked:
  - `engine/tests/test_graph_skills.py` now validates fallback consumption of
    a graph containing the new summary/diagnostics and richer file nodes.
  - Runtime consumer validation succeeded via
    `artifacts/logs/query_graph_target_repo_20260413.json`.

## Test Result

- `58 passed in 1.57s`

## Remaining limitations

- Full LLM-backed refresh could not be exercised in this environment because
  the repo has no configured LLM credentials.
- Go analysis is intentionally lightweight and top-level only.
- Generic fallback is still coarse by design; it is observable now, but not
  semantically rich.

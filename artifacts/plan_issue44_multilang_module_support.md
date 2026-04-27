# Issue 44 Plan

## Goal
- Restore module facts generation for Go and other non-Python/JS languages.
- Add a workspace-root module fallback for repos whose source lives at the root.

## Changes
- Unify the source-code extension list used by module detection and module loading.
- Add a root-module sentinel and resolve it to workspace-root source files only.
- Add regression tests for Go, Rust, Java, Kotlin, and root-level Go projects.

## Verification
- `PYTHONPATH=engine pytest engine/tests/test_hub_scanner.py engine/tests/test_hub_module_grouping.py -q`

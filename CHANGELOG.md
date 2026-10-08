# Changelog

## Engine / plugins 0.4.0 and CLI 2.1.0

This release changes the default knowledge refresh behavior. Run `rb-refresh`
(or `rb refresh`) for the first build, subsequent committed changes, and retrying
an interrupted task. The engine chooses a complete first build, a matching
resume, an incremental update, or an already-current no-op. Use `--full` to
force a new complete rebuild. `--workspace` still defaults to the current
project directory, and refresh still requires a clean Git worktree.

Breaking changes:

- Removed refresh flags `--quick` and `--failed-only`; they now fail argument
  parsing. Replace either invocation with `rb-refresh`.
- `refresh_pipeline(workspace, *, full=False)` replaces the old refresh mode
  arguments. MCP `refresh_project(full=False)` and tool
  `refresh_filesystem(workspace=".", full=False)` use the same automatic policy.
  Removed `quick` arguments are rejected.
- Failed full builds retain progress and generated documents for a matching
  retry. Incompatible legacy interrupted records are replanned. Existing usable
  generations stay active until the new generation completes.

`rb-ask` remains read-only. Its stale-knowledge reminder now suggests
`rb-refresh`. `rb-init` scaffolding modes are unchanged. A legacy scan-only
knowledge directory receives a complete first build automatically; corrupt
modern baseline records produce an error with a `--full` recovery hint.

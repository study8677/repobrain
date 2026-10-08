# Change: One automatic command for knowledge refresh

## Why
Users should not need to select full, incremental, or failed-only modes for
routine knowledge updates. The user explicitly approved implementation of this
plan, including removing the previous refresh arguments without compatibility.

## What Changes
- Automatically choose first build, matching interrupted-task resume, committed
  incremental update, or already-current no-op under the refresh lock.
- Persist full-build progress and validate artifacts before resuming.
- **BREAKING**: Remove `--quick`, `--failed-only`, and `quick` tool arguments;
  expose `--full` / `full=False` for an explicitly forced rebuild.
- Publish complete generations only; preserve existing usable knowledge on errors.
- Update all entrypoints, documentation, version metadata, and ask reminders.

## Impact
- Affected specs: knowledge-hub (new requirements).
- Affected code: refresh pipeline and persistence, CLI, MCP, knowledge-layer tool.
- Engine/plugin release 0.4.0; CLI release 2.1.0.
- Validation: engine/CLI tests and contracts plus real-model acceptance using
  Trae CLI only, as requested by the user.

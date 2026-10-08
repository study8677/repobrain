## Context
Refresh currently exposes implementation modes to users and full builds cannot
reliably retain completed work. Ask remains a read-only consumer of active
knowledge. All runtime entrypoints must choose the same behavior.

## Decisions
- Under the existing lock, check clean committed Git state. A forced full build
  starts a new task; otherwise resume a task only when target commit, baseline,
  and generation settings match. Without a complete baseline, build one; with
  new commits update incrementally; when current, skip without model calls.
- A scan-only legacy directory is not a complete baseline. Corrupt modern
  baseline records fail with a `--full` repair hint.
- Atomically save each group document before recording success. Save phase
  completion and check required artifacts when resuming; missing artifacts
  rerun the relevant work. Failed and interrupted tasks keep staging state.
- Configuration, baseline, or target changes invalidate a resume candidate.
  Legacy progress without sufficient identity information is replanned.
- Complete staging artifacts before switching the active pointer. Recheck Git
  state and HEAD before publication. Errors and unverified impact plans retain
  the current usable generation and never trigger implicit full rebuilding.
- Public interfaces are `refresh_pipeline(workspace, *, full=False)`, MCP
  `refresh_project(full=False)`, and tool
  `refresh_filesystem(workspace=".", full=False)`. Old arguments fail explicitly.
- Ask changes only its stale-knowledge hint to `rb-refresh`.

## Verification
Exercise full/incremental completion, both resume paths, corrupt or missing
progress/artifacts, identity changes, no-op, force-full, removed flags, and
entrypoint failure propagation. Run deterministic engine/CLI tests and the
repository contract checker; all real-model acceptance uses Trae CLI only.

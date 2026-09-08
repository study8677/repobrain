# CodeGraph-Only Subagent Pilot

Two independent subagents answered the shared questions using only CodeGraph
commands. Direct source reads, grep, find, and repository search were forbidden.

## Summary

| Repository | Questions | Expected files found | Expected symbols found | CodeGraph commands | Cumulative CLI time |
|---|---:|---:|---:|---:|---:|
| VERL | 3 | 7/7 | 12/12 | 30 | 8.92s |
| Excalidraw | 3 | 6/6 | 8/8 | 21 | 7.18s |

All expected answer atoms were present and all cited paths checked against the
pinned worktrees.

## VERL

### `verl-ppo-entry`

The subagent found the Hydra `main` entry in `verl/trainer/main_ppo.py`, the
legacy `TaskRunner` in `verl/trainer/main_ppo_v0.py`, and the
`RayPPOTrainer` definition in `verl/trainer/ppo/ray_trainer.py`. It correctly
identified the chain:

`main` -> `run_ppo` -> remote `TaskRunner.run` -> `RayPPOTrainer` ->
`init_workers` / `fit`.

It needed 11 CodeGraph commands and 3.48 seconds of cumulative CLI time.

### `verl-advantage-dispatch`

The subagent found `compute_advantage` and its GAE and GRPO branches, including
`compute_gae_advantage_return` and `compute_grpo_outcome_advantage` in
`core_algos.py`. It needed 9 commands and 2.53 seconds.

### `verl-worker-resources`

The subagent found `BaseTaskRunner`, `role_worker_mapping`,
`ResourcePoolManager`, `TaskRunner`, and `RayPPOTrainer`. It correctly described
the actor, critic, reward, and teacher resource-pool mappings. It needed 10
commands and 2.91 seconds.

### VERL limitations

- Ray's `runner.run.remote()` dynamic edge was not present in `callees` output.
- Dynamic imports in `main_ppo_v0.py` weakened dependency statistics.
- Instance-attribute lookup for `role_worker_mapping` required source context
  returned by `node` or `explore`.
- Common names such as `main` required file-path disambiguation.

## Excalidraw

### `excalidraw-render`

The subagent found `StaticCanvas`, `renderStaticScene`,
`renderStaticSceneThrottled`, `_renderStaticScene`, and the downstream
`renderElement` call. It needed 3 commands and 1.13 seconds.

### `excalidraw-collaboration`

The subagent found the socket receive path through `_reconcileElements`,
`reconcileElements`, `handleRemoteSceneUpdate`, `App.updateScene`, and
`Scene.replaceAllElements`. It needed 6 commands and 1.74 seconds.

### `excalidraw-export`

The subagent found public re-exports, the canvas path through
`renderStaticScene`, the separate SVG path through `renderSceneToSvg`, and the
test suites covering both. It needed 12 commands and 4.31 seconds.

### Excalidraw limitations

- Re-exports from `index.tsx` required file-mode `node`; symbol query alone did
  not return them.
- Private callback ownership was aggregated, so exact socket callback paths
  required source returned by `explore`.
- Anonymous `describe` and `it` test blocks were not indexed as symbols.

## Interpretation

CodeGraph retrieved all pilot answer atoms, but the subagents did not finish
with a single `explore` call. They used 3 to 12 commands per question to
disambiguate symbols, inspect file slices, and recover dynamic or re-export
paths. This is still fast in absolute terms, but it should not be reported as a
one-call result.

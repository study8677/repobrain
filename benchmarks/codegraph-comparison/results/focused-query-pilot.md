# Focused VERL Query Pilot

## Corpus

Both tools received the same four VERL files in separate repositories with the
same synthetic Git commit, `9b89ba0ccb19e530af392c730d44261262f11890`:

- `verl/trainer/main_ppo.py`
- `verl/trainer/main_ppo_v0.py`
- `verl/trainer/ppo/ray_trainer.py`
- `verl/trainer/ppo/core_algos.py`

This is a focused retrieval check, not a full-repository build benchmark.

## CodeGraph

CodeGraph `1.5.0` built a complete index with 4 files, 178 nodes, 331 edges,
and no pending changes. A fresh subagent was restricted to CodeGraph CLI
commands and could not read source files directly.

| Question | Expected files | Expected symbols |
|---|---:|---:|
| `verl-ppo-entry` | 3/3 | 4/4 |
| `verl-advantage-dispatch` | 2/2 | 3/3 |
| `verl-worker-resources` | 2/2 | 5/5 |

The final ceiling subagent used 9 CodeGraph commands. It needed `query`,
`explore`, `node`, `callers`, and `callees` rather than a single
natural-language call.

## RepoBrain

### Current main behavior

The current implementation writes deterministic host-runner Git insights but
unconditionally marks `git_insights` as `partial`. The generation wrapper then
deletes any candidate whose aggregate status is not `success`. Consequently,
the public generic host-runner workflow cannot promote an initial generation.

### Ceiling behavior

The ceiling harness promoted the generation only after verifying that:

- all seven other stages succeeded
- the `verl` module and both module groups succeeded
- the failure list was empty
- `git_insights=partial` was the only degraded entry

The build took 365.66 seconds, used 107,544,576 bytes of peak RSS, and produced
about 300 KiB of knowledge artifacts.

The promoted knowledge was copied to a query-only workspace containing no
source files. A RepoBrain subagent was restricted to three `rb-ask --json`
calls:

| Question | Expected files | Expected symbols | Query time |
|---|---:|---:|---:|
| `verl-ppo-entry` | 3/3 | 4/4 | 73.494s |
| `verl-advantage-dispatch` | 2/2 | 3/3 | 161.729s |
| `verl-worker-resources` | 2/2 | 5/5 | 78.133s |

Both products therefore reached 7/7 expected files and 12/12 expected symbols
in the focused ceiling test. RepoBrain produced direct synthesized answers from
its source-free knowledge store. CodeGraph exposed precise graph and source
context but required the outer subagent to assemble the answer.

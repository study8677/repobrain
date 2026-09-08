# Benchmark Protocol

## Isolation

Each tool receives a separate detached worktree at the same repository SHA.
This prevents `.repobrain/` from entering CodeGraph's corpus and `.codegraph/`
from entering RepoBrain's corpus. Third-party repositories are shallow clones.

## Tracks

### Unrestricted native track (latest-v2 default)

- Both products receive independent worktrees at the same pinned source SHA.
- RepoBrain uses its public full refresh and `rb-ask` workflow.
- CodeGraph uses its installed CLI/integration as the primary discovery tool.
- Both answer agents may inspect source files for verification, with no command
  count or context-budget limit beyond the native tools' own limits.
- A product must actually be invoked; a plain model-only answer is invalid.
- Compare blind-judge semantic correctness, evidence-mention recall, total
  end-to-end wall time, and Trae token usage. Report monetary cost only when
  the runtime emits an amount.
- Use a shared requested model and record any observed server-side reroute.
- Anonymize and deterministically shuffle paired answers before judging them
  against a clean pinned source checkout. Keep judge time/tokens separate from
  product runtime cost.

This track models normal IDE use. It does not isolate pure retrieval quality.

### Deterministic index track

- RepoBrain: `RB_REFRESH_SCAN_ONLY=1 rb-refresh`
- CodeGraph: `codegraph init`
- No model is involved.
- Run tools sequentially on an otherwise idle machine.

### Source-free native retrieval track

- RepoBrain: full host-runner refresh followed by `rb-ask --json`
- CodeGraph: `codegraph explore`
- A subagent may invoke only the assigned product command. It may not read,
  grep, search, or inspect the target repository directly.
- Results are scored against the answer atoms in `config/questions.json`.
- RepoBrain results are eligible only when the public refresh command promotes
  an active generation. A scan-only index, deleted staging generation, direct
  source answer, or manually promoted generation is not a valid substitute.

This track measures each product's native workflow, not pure retrieval parity.
RepoBrain produces a final answer; CodeGraph returns source context and graph
paths. Report these differences explicitly.

### Ceiling retrieval track

- Use the same focused corpus and answer atoms for both products.
- RepoBrain may waive only the deterministic generic host-runner
  `git_insights=partial` state.
- Reject promotion if any other stage or module is degraded, or if the failure
  list is non-empty.
- Copy the promoted RepoBrain knowledge into a source-free workspace before
  `rb-ask`, preventing direct source reads.
- Label these results as ceiling behavior rather than unmodified current-main
  behavior.

### Controlled answer track

For a stricter future run, feed both retrieval outputs into the same frozen
model with source-reading tools disabled and an equal context-token budget.
This pilot does not claim that controlled-model result.

## Metrics

### Build

- Wall, user, and system time from `/usr/bin/time -lp`
- Maximum resident set size
- Final index directory size
- Completion state and parser errors
- Indexed files divided by Git tracked files

### Retrieval

- Expected-file recall
- Expected-symbol recall
- Blind-judge correctness, factuality, completeness, citation validity, and
  unsupported claims
- Citation validity: cited file and line exist at the pinned SHA
- Unsupported-claim rate
- Wall time
- Output bytes
- Input, cached-input, output, and reasoning tokens when emitted by the runtime
- Monetary cost only when explicitly emitted; otherwise mark it unavailable

### Incremental

- Explicit update time: `rb-refresh --quick` versus `codegraph sync`
- Time until changed facts are queryable
- Stale-fact rate
- Incremental result versus clean rebuild
- Update amplification in each tool's native unit

## Repetition

The checked-in result is a pilot with one cold-build run and one retrieval run
per question. A publishable benchmark should use:

- three cold builds per tool and repository
- ten retrieval latency runs per deterministic query
- three answer runs per question
- paired bootstrap confidence intervals for answer metrics

## Failure Policy

Timeouts, crashes, incomplete indexes, and missing answers remain in the
dataset. Environment-specific blocks are reported separately and are not
attributed to the product.

If a tool cannot create the prerequisite queryable index through its public
workflow, record the retrieval result as unavailable with the build failure.
Do not assign zero answer-atom recall because no answer was produced.

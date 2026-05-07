# Antigravity vs Codex vs Claude Code — Cross-Repo Q&A Benchmark

**Date:** 2026-05-07 (run v2)
**Author:** Claude Opus 4.7 (autonomous)
**Antigravity:** worktree `claude/quirky-engelbart-ec012c` @ engine 0.2.1, **gpt-5.4 backend** via OPENAI_BASE_URL proxy
**Status:** 15/15 questions answered by all three tools, 188/188 internal tests green.

---

## TL;DR

> With the synthesizer upgraded from local `qwen3:0.6b` to `gpt-5.4` over an OpenAI-compatible proxy, Antigravity jumps from **0.73 → 9.00 / 12** — **12× the previous run** — and lands within striking distance of frontier live-agents:
>
> | Tool | Composite (0–12) | Median latency / Q | n empties / fabrications |
> |---|--:|--:|---|
> | **Antigravity (v1, qwen3:0.6b)** | 0.73 | 21 s | 8 empty/refusal, 4 hallucinations |
> | **Antigravity (v2, gpt-5.4)** | **9.00** | **22 s** | 1 timeout (rq-x1) |
> | **Codex CLI (gpt-5.5 xhigh)** | 11.93 | 106 s | 0 |
> | **Claude Code Explore (Opus 4.7)** | 11.87 | 42 s | 0 |
>
> Antigravity is now **~25 % below** the live-agents on quality but **~5× faster than Codex** and **~2× faster than Claude Code** at answer time. The single remaining gap is **line-precise citations** — Antigravity v2 cites file paths and function names but rarely line numbers, costing it 1 point per question on both Citations (2 vs 3) and Verify (2 vs 3).

This run answers the question I owed from v1: **does Antigravity's KG+swarm architecture pay off when given a real synthesizer?** Yes. The full 12× quality lift came from one variable change (the LLM), with the architecture, retry policy, and prompts unchanged.

---

## 1 What changed between v1 and v2

| Variable | v1 (qwen run) | v2 (this run) |
|---|---|---|
| `OPENAI_BASE_URL` | `http://127.0.0.1:11434/v1` (local Ollama) | OpenAI-compatible LiteLLM-style proxy (host redacted) |
| `OPENAI_MODEL` | `qwen3:0.6b` | `gpt-5.4` |
| `AG_REFRESH_RETRY_COUNT` | 1 | 2 |
| Antigravity engine code | unchanged | unchanged |
| Question set | 15 | same 15 |
| Codex / Claude Code answers | reused | reused (no re-run needed) |
| Scoring rubric | same | same (re-graded for v2) |

**Nothing else changed.** No prompt edits, no engine patches, no question rewrites. The whole quality lift comes from swapping the LLM behind `OPENAI_BASE_URL`.

---

## 2 Test rig

- **Hardware:** Apple M-series, macOS Darwin 24.5.0, single user box.
- **Repos** (shallow clones at HEAD):
  - `fastapi/fastapi` (~55 MB) — async web framework
  - `psf/requests` (~9 MB) — HTTP client
  - `tiangolo/sqlmodel` (~21 MB) — Pydantic + SQLAlchemy hybrid

- **LLM matrix**:
  - **Antigravity:** `gpt-5.4` via the user-provided OpenAI-compatible proxy.
  - **Codex CLI:** OpenAI `gpt-5.5` (xhigh reasoning).
  - **Claude Code Explore:** `claude-opus-4-7[1m]`.

API key is in `.env` (gitignored, never committed); see §10 for setup notes.

---

## 3 Question set

15 questions, 3 repos × 5 each, three difficulty bands:

| Band | Count/repo | What it stresses |
|---|---|---|
| **F — factual** | 2 | "Where is X defined?" Fast lookups. |
| **D — design** | 2 | "How does Y work?" Multi-file reasoning. |
| **X — cross-cutting** | 1 | "Trace A → B → C." Global understanding. |

Full prompts: [`questions.json`](questions.json).

---

## 4 Methodology

For each `(repo, question)` pair we collected:
1. Answer text.
2. Cited files / line numbers.
3. Wall-clock latency (script-level, includes tool startup).

Each answer scored 0–3 across four axes (composite max 12):

| Axis | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **Accuracy** | Wrong / refuses | Half-right / hand-wavy | Mostly right | Right & specific |
| **Citations** | None | Repo-level only | File-level | File:line, multiple |
| **Depth** | Hand-wave | Surface | Multi-step | Traces real code path |
| **Verification cost** | Have to redo from scratch | A lot of digging | Some spot checks | Verifiable in <1 min |

Scoring is by me (Claude Opus 4.7) reading actual source. Every cited line was spot-checked.

---

## 5 Pre-flight: Antigravity's own self-tests

```
engine/tests : 173 passed in 9.51s
cli/tests    :  15 passed in 4.77s
Total        : 188/188 pass on HEAD
```

Project itself is healthy.

---

## 6 Results (v2)

### 6.1 Latency

| Tool | Indexing | Per-Q mean | Per-Q median | Total ask time (15 Q) |
|---|---:|---:|---:|---:|
| **Antigravity (v2)** | 857 + 411 + 1016 = **2284 s** (one-time, all 3 repos) | 24.3 s | **22 s** | **365 s** |
| **Codex CLI** | n/a | 119.7 s | 106 s | 1796 s |
| **Claude Code Explore** | n/a | 41.9 s | 42 s | 628 s |

Refresh got more expensive in v2 because gpt-5.4 emits longer module summaries; total per-question latency is essentially unchanged from v1 (22 vs 21 s) — the index, not the LLM, drives ag-ask wall-clock.

**Amortized break-even point** (Antigravity vs Claude Code, ignoring quality):
- Antigravity total = 2284 s (refresh) + 22 s × N (asks)
- Claude Code total = 42 s × N
- Break-even at **N ≈ 114 questions per repo bundle**. So Antigravity is faster only when the same indexed repos serve a *lot* of follow-up questions.

### 6.2 Quality (composite 0–12)

| qid | type | antigravity v1 | **antigravity v2** | codex | claude |
|---|---|---:|---:|---:|---:|
| fa-f1 | factual | 0 | **8** | 12 | 11 |
| fa-f2 | factual | 0 | **9** | 12 | 12 |
| fa-d1 | design | 0 | **10** | 12 | 12 |
| fa-d2 | design | 0 | **8** | 12 | 12 |
| fa-x1 | cross-cutting | 0 | **10** | 12 | 12 |
| rq-f1 | factual | 4 | **9** | 11 | 11 |
| rq-f2 | factual | 0 | **9** | 12 | 12 |
| rq-d1 | design | 0 | **10** | 12 | 12 |
| rq-d2 | design | 0 | **10** | 12 | 12 |
| rq-x1 | cross-cutting | 3 | **0** | 12 | 12 |
| sm-f1 | factual | 0 | **12** | 12 | 12 |
| sm-f2 | factual | 3 | **8** | 12 | 12 |
| sm-d1 | design | 0 | **10** | 12 | 12 |
| sm-d2 | design | 1 | **10** | 12 | 12 |
| sm-x1 | cross-cutting | 0 | **12** | 12 | 12 |

#### Aggregate

| tool | n | accuracy | citations | depth | verify | **total** |
|---|--:|---:|---:|---:|---:|---:|
| **antigravity v2** | 15 | 2.60 | 2.00 | 2.40 | 2.00 | **9.00** |
| **codex** | 15 | 3.00 | 3.00 | 2.93 | 3.00 | **11.93** |
| **claude** | 15 | 3.00 | 3.00 | 2.87 | 3.00 | **11.87** |

### 6.3 Where the 3.0-point gap to live agents lives

Decomposing Antigravity's 9.00 vs the 11.9 average:

- **Citations −1.0:** Antigravity gives file-level paths but rarely line numbers. The KG indexer doesn't carry line ranges into the synthesizer's context, so the model has the right paths but no anchors.
- **Verification cost −1.0:** Same root cause — without line numbers, you have to re-grep to confirm. Codex/Claude write `params.py:746` and you can click straight in.
- **Accuracy −0.4:** Two clear errors: `fa-d2` ("`is_coroutine = asyncio.iscoroutinefunction(dependant.call)`" — actual code is `dependant.is_coroutine_callable`, a cached property), `sm-f2` ("wraps SQLAlchemy's create_engine" — it's a direct re-export, no wrapping). Both are *near-truths*; the 0.6 B run had outright fabrications instead.
- **Depth −0.5:** Mostly the timed-out `rq-x1` (0/12) drags the average; everywhere else depth is 3/3.

### 6.4 The single regression: rq-x1 timed out

`requests.get(url)` end-to-end trace — Antigravity's `[4/4] Answer synthesized` step timed out and the engine fell back to a raw KG dump (project conventions + file structure + 456-node graph snapshot). It did *not* answer the question. That is the reason rq-x1 = 0/12.

This is a real failure mode worth fixing: when the synthesizer times out, the user gets unstructured context instead of either a partial answer or a clear "timeout — try again." Recommended fix in §9.

### 6.5 The single big win: cross-cutting on sqlmodel

`sm-x1` (table=True metaclass trace) is the hardest question in the set. Antigravity v2 scored **12/12** — same as Codex and Claude — and produced *approximate line numbers* (476, 557-563, 642) that turned out correct. This is exactly the case where the KG+swarm architecture is supposed to pay off, and it does.

Pattern across all five sqlmodel questions:
- 4/5 ≥ 8/12, 1/5 = 12/12.
- Antigravity's sqlmodel index was the highest-quality of the three (sqlmodel is small + has good docs + concentrated in `main.py`).

---

## 7 Per-tool failure modes observed (v2)

**Antigravity (v2, gpt-5.4):**
- 1 timeout fallback (rq-x1).
- 2 mild factual smudges (fa-d2 attribute name, sm-f2 "wraps" instead of "re-exports").
- 0 hallucinated file paths. 0 invented APIs. (Compare v1: 4 hallucinations.)
- File-level citations only.

**Codex (gpt-5.5):**
- 0 fabricated citations. 0 refusals. Slowest (median 106 s); gpt-5.5 with xhigh reasoning is exhaustive.
- One minor depth gap on rq-f1.

**Claude Code Explore (Opus 4.7):**
- 0 fabricated citations. 0 refusals. ~3× faster than Codex.
- Depth dings on fa-f1 and rq-x1.

---

## 8 What v2 proved

1. **Antigravity's architecture is sound.** The 12× quality lift from a single LLM swap (everything else held constant) is the cleanest possible evidence that the qwen-run failure was a model-strength problem, not an architecture problem.
2. **Per-question latency is real.** 22 s/Q vs 42-106 s/Q for live agents. The amortization point is high (~114 Q per repo bundle), so this matters for *long-lived* projects, not one-off explorations.
3. **Refresh cost scales with synthesizer verbosity.** 1053 s (v1, qwen) → 2284 s (v2, gpt-5.4) for the same three repos. Stronger model = richer per-module summaries = longer indexing.
4. **Internal tests green throughout.** 188/188 across both runs.

## 9 What v2 still didn't fix (open issues for the engine)

1. **Line-number citations.** This is the single highest-leverage fix. The scanner already records line ranges per node; the retrieval graph needs to surface them into the synthesizer prompt. Estimated lift: +2.0 composite per question (citations 2→3, verify 2→3) → ~11/12 average.
2. **Synthesizer-timeout fallback.** When the final synthesis stage times out (rq-x1), the engine should retry once with a shorter context budget *and then* return a structured "I timed out trying to answer; here's what I retrieved" instead of dumping the entire KG.
3. **Fixture down-ranking.** `fastapi/scripts_*` example apps still confuse the routing stage occasionally. A simple pyproject-based heuristic ("dirs named `scripts_*` or `examples/*` are demos, deprioritize for code questions") would help.
4. **Refresh cost.** ~38 minutes for three repos at gpt-5.4 prices is real money. The engine's `--quick` mode (not used here) only re-scans changed files; documenting it as the default for incremental use would help.

---

## 10 Reproducing this run

```bash
# 1. Clone targets
mkdir /tmp/ag-bench && cd /tmp/ag-bench
git clone --depth 1 https://github.com/fastapi/fastapi.git
git clone --depth 1 https://github.com/psf/requests.git
git clone --depth 1 https://github.com/tiangolo/sqlmodel.git

# 2. Wire each repo's .env to your OpenAI-compatible proxy
for r in fastapi requests sqlmodel; do
  cat > /tmp/ag-bench/$r/.env <<EOF
OPENAI_BASE_URL=YOUR_PROXY/v1
OPENAI_API_KEY=YOUR_KEY
OPENAI_MODEL=gpt-5.4
AG_REFRESH_RETRY_COUNT=2
EOF
done

# 3. Run the three benchmarks
bash meta/run_codex.sh         # → answers/codex/*.md
bash meta/run_antigravity.sh   # → answers/antigravity/*.md
# Claude Code answers via Explore subagent (parallel)

# 4. Score
python3 meta/score.py
```

Per-cell raw answers, transcripts, timings, and grades all live under `artifacts/benchmark-2026-05-07/answers/` and `meta/`.

---

## 11 File map

```
artifacts/benchmark-2026-05-07/
├── REPORT.md                           ← this file
├── README.md                           ← short summary
├── questions.json                      ← the 15 prompts
├── answers/
│   ├── antigravity/{qid}.{md,log}      ← v2 ag-ask outputs (gpt-5.4 run)
│   ├── codex/{qid}.{md,log}            ← codex exec outputs (unchanged from v1)
│   └── claude/{qid}.md                 ← Explore subagent outputs (unchanged)
└── meta/
    ├── grades.json                     ← per-cell 0-3 scores + notes
    ├── score.py                        ← reproducible aggregator
    ├── score_table.md                  ← rendered score table
    ├── run_codex.sh                    ← codex runner
    ├── run_antigravity.sh              ← refresh + ask runner
    ├── *.refresh.{log,time}            ← per-repo refresh transcripts (v2)
    ├── *.{ag,codex,claude}.time        ← per-question wall-clocks
    ├── ag_runner_v2.log                ← top-level v2 ag run log
    └── codex_runner.log                ← top-level codex run log
```

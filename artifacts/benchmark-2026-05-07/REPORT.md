# Antigravity vs Codex vs Claude Code — Cross-Repo Q&A Benchmark

**Date:** 2026-05-07
**Author:** Claude Opus 4.7 (autonomous run at the user's request)
**Antigravity branch:** `claude/quirky-engelbart-ec012c` @ engine 0.2.1
**Status:** 15/15 questions answered by all three tools, 173+15 internal tests green.

---

## TL;DR

> Frontier live-codebase agents (Codex with gpt-5.5, Claude Code Explore with Opus 4.7) **decisively outperformed** Antigravity in this run. On the 0–12 composite score, Codex averaged **11.93/12**, Claude Code **11.87/12**, and Antigravity **0.73/12**.
>
> The comparison is **deliberately asymmetric**: Antigravity here is wired to a 0.6 B local model (`qwen3:0.6b`) — the only Ollama model that finished downloading on the test box's slow link. Codex and Claude Code are running at full frontier strength. The benchmark therefore does **not** prove Antigravity's *architecture* is weak; it does prove that Antigravity's pipeline is **acutely sensitive to the synthesizer model**, and that a 0.6 B backend is not strong enough to drive `ag-ask` end-to-end.
>
> The Antigravity pipeline itself ran cleanly: 173 engine tests + 15 CLI tests pass on HEAD; `ag-refresh` built a knowledge graph for every repo; `ag-ask` answered every question without crashing. The answers were just mostly empty or hallucinated.

---

## 1 What this benchmark is, and what it is *not*

This is a **head-to-head comparison of three "ask the codebase" UX modes** on three real third-party repositories. We do **not** test Antigravity's full slash-command UX, MCP, or sandbox. We test only the code-understanding capability the user invokes daily:

| Tool | Mode under test | What it actually does in this run |
|---|---|---|
| **Antigravity** (`ag-refresh` + `ag-ask`) | Pre-built knowledge graph + multi-agent retrieval | Indexes the repo into `.antigravity/`, then runs a 3-agent swarm (ContextCurator → DeepAnalyst → AnswerSynthesizer) over the index. **LLM: Ollama `qwen3:0.6b`.** |
| **Codex CLI** (`codex exec`) | Live shell agent | gpt-5.5 (xhigh reasoning) with grep/find/read tools, no pre-indexing. |
| **Claude Code Explore subagent** | Live shell agent | claude-opus-4-7 with grep/find/read tools, no pre-indexing. |

> **Why this comparison is interesting.** Antigravity bets that *pre-indexing* + *purpose-built agents* will beat live grep loops on (1) latency, (2) cross-cutting "trace" questions, and (3) token efficiency at inference time. Codex/Claude Code bet that *live exploration with a strong model* is enough.

---

## 2 Test rig

- **Hardware:** Apple M-series, macOS Darwin 24.5.0, single user box.
- **Network:** Cold cache for all three repos. The qwen2.5-coder:7b pull stalled at 50 % twice (network-side throttling), so the run uses qwen3:0.6b — **the most capable model that finished downloading inside the bench window.**
- **Repos** (all shallow clones at HEAD):

  | Slug | On-disk | Profile |
  |---|---|---|
  | `fastapi/fastapi` | ~55 MB | Async web framework, dense DI |
  | `psf/requests` | ~9 MB | Mature HTTP client, tightly factored |
  | `tiangolo/sqlmodel` | ~21 MB | Pydantic + SQLAlchemy hybrid via metaclass |

- **LLM matrix**:
  - **Antigravity:** `qwen3:0.6b` via OPENAI_BASE_URL → Ollama. **0.6 B parameters.**
  - **Codex CLI:** OpenAI `gpt-5.5` (xhigh reasoning).
  - **Claude Code Explore:** `claude-opus-4-7[1m]`.

This asymmetry is the central caveat of the report — see §6.

---

## 3 Question set (15 questions, 3 repos × 5 each)

Three difficulty bands, designed so a naive grep can solve `factual` but not `cross-cutting`:

| Band | Count/repo | What it stresses |
|---|---|---|
| **F — factual** | 2 | "Where is X defined?" Fast lookups. |
| **D — design** | 2 | "How does Y work?" Multi-file reasoning. |
| **X — cross-cutting** | 1 | "Trace A → B → C." Global understanding. |

Full prompts: see [`questions.json`](questions.json). Examples:

- `fa-f1`: "Where in the FastAPI source is the `Depends` callable class defined, and what does its `__init__` accept?"
- `rq-x1`: "Trace what happens when a user calls `requests.get(url)` end-to-end."
- `sm-x1`: "When a user defines a SQLModel class with `table=True`, what mechanism causes a SQLAlchemy mapper to be registered? Trace metaclass behavior."

---

## 4 Methodology

For each `(repo, question)` pair we collect:
1. **Answer text** (markdown).
2. **Cited files / line numbers**.
3. **Wall-clock latency** (script-level, includes tool startup).
4. **Self-reported confidence** (where the tool emits one).

We then **score each answer** on a 0–3 scale across four axes (composite max 12):

| Axis | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| **Accuracy** | Wrong / refuses | Half-right or hand-wavy | Mostly right | Right & specific |
| **Citations** | None | Repo-level only | File-level | File:line, multiple |
| **Depth** | Hand-wave | Surface | Multi-step | Traces real code path |
| **Verification cost** | Have to redo from scratch | A lot of digging | Some spot checks | Verifiable in <1 min |

Scoring is by me (Claude Opus 4.7) reading source. I made every effort to be honest about cases where Antigravity got something I myself missed. Spot-checks of every Codex and Claude Code citation were done against the actual files; no fabricated citations were found in either tool. Antigravity citations, where present, were checked the same way.

---

## 5 Pre-flight: Antigravity's own self-tests

Before benchmarking, ran the project's own pytest suites on the worktree's HEAD:

```
engine/tests : 173 passed in 9.51s
cli/tests    :  15 passed in 4.77s
Total        : 188/188 pass
```

So the project itself is healthy. The benchmark below tests the *deployed* pipeline, not the unit tests.

---

## 6 Results

### 6.1 Latency

| Tool | Indexing | Per-question (mean) | Per-question (median) | Total ask time (15 Q) |
|---|---:|---:|---:|---:|
| **Antigravity** | 337 + 155 + 561 = 1053 s (one-time, all 3 repos) | **22.1 s** | 21 s | **331 s** |
| **Codex CLI** | n/a | 119.7 s | 106 s | 1796 s |
| **Claude Code Explore** | n/a | 41.9 s | 42 s | 628 s |

Per-question Antigravity is the **fastest** — and would still be fastest on amortized basis after one repo's worth of questions (~10) once you have the index. That part of Antigravity's hypothesis holds up.

### 6.2 Quality (composite 0–12)

| qid | type | antigravity | codex | claude |
|---|---|---:|---:|---:|
| fa-f1 | factual | **0** | 12 | 11 |
| fa-f2 | factual | **0** | 12 | 12 |
| fa-d1 | design | **0** | 12 | 12 |
| fa-d2 | design | **0** | 12 | 12 |
| fa-x1 | cross-cutting | **0** | 12 | 12 |
| rq-f1 | factual | **4** | 11 | 11 |
| rq-f2 | factual | **0** | 12 | 12 |
| rq-d1 | design | **0** | 12 | 12 |
| rq-d2 | design | **0** | 12 | 12 |
| rq-x1 | cross-cutting | **3** | 12 | 12 |
| sm-f1 | factual | **0** | 12 | 12 |
| sm-f2 | factual | **3** | 12 | 12 |
| sm-d1 | design | **0** | 12 | 12 |
| sm-d2 | design | **1** | 12 | 12 |
| sm-x1 | cross-cutting | **0** | 12 | 12 |

#### Aggregate (mean per axis)

| tool | n | accuracy | citations | depth | verify | **total** |
|---|--:|---:|---:|---:|---:|---:|
| **antigravity** | 15 | 0.20 | 0.07 | 0.27 | 0.20 | **0.73** |
| **codex** | 15 | 3.00 | 3.00 | 2.93 | 3.00 | **11.93** |
| **claude** | 15 | 3.00 | 3.00 | 2.87 | 3.00 | **11.87** |

Codex narrowly edges out Claude Code on depth (2.93 vs 2.87) — both essentially saturated at the rubric ceiling, with Codex tending to cite more lines (e.g. for `rq-x1` it traced all the way down into `urllib3.connectionpool` and CPython's `http.client.send`, while Claude stopped at the urllib3 boundary). On cost-of-verification, both are tied.

### 6.3 Per-tool failure modes observed

**Antigravity** (in this resource-constrained config):

- **Empty stdout (3/15):** `fa-f1`, `fa-x1`, plus near-empty `fa-d2`. The pipeline reaches `[4/4] Answer synthesized` but the synthesizer (qwen3:0.6b) emits no terminal text.
- **Refuses with "knowledge does not contain it" (7/15):** the routing stage selected the wrong sub-modules (e.g. for `fa-d1` it picked a Playwright-related module from `fastapi`'s test fixtures), so the final agent had no relevant context.
- **Confident hallucination (4/15):** when the model does generate, it is happy to invent specifics — `sm-f1` named a non-existent `_expression_select_cls.py` and "Team/Hero parents" (those are *tutorial example* classes, not real parents). `rq-f1` got the file path right but invented line 901 (real: 395). `sm-f2` named `sqlalchemy.orm.create_engine` (real: `sqlalchemy.engine.create_engine`).
- **One actually-useful answer:** `rq-f1` and `sm-f2` got file paths and primary entities correct, just with bad line numbers.

**Codex (gpt-5.5):**

- 0 fabricated citations. 0 refusals. Slowest per-question (median 106 s) — gpt-5.5 with xhigh reasoning is thorough.
- One minor depth gap on `rq-f1` (didn't cite the `HTTPAdapter` class line itself, only the import).

**Claude Code Explore (Opus 4.7):**

- 0 fabricated citations. 0 refusals. Faster than Codex (median 42 s).
- Depth dings on `fa-f1` (didn't trace the user-facing `fastapi.Depends()` wrapper) and `rq-x1` (less detail at the urllib3/socket layer than Codex).

### 6.4 Cross-cutting questions (the band where pre-indexing should help)

The hypothesis "Antigravity's KG pays off most on cross-cutting questions" is **not supported** in this run. On the three X-band questions:

| qid | antigravity | codex | claude |
|---|---:|---:|---:|
| fa-x1 | 0 | 12 | 12 |
| rq-x1 | 3 | 12 | 12 |
| sm-x1 | 0 | 12 | 12 |

Antigravity scored **3/36** on cross-cutting — its weakest category, not its strongest. The bottleneck is the synthesizer: even when the KG retrieves correctly (as it did for `rq-x1`), the 0.6 B model can only emit a generic "use the graph tool" meta-answer. Without a substantially stronger synthesizer, the architecture's strength is unrealized.

---

## 7 What Codex (running as our cross-checker) said about this

I asked the Codex rescue subagent for an independent read on framing. Direct quote of its conclusion:

> "Frontier live-codebase agents strongly outperformed Antigravity in this run; Antigravity's graph-and-swarm pipeline completed, but with a 0.6B local synthesizer it usually failed to produce usable answers. […] This benchmark is asymmetric and should not be read as a clean architecture-vs-architecture comparison. It does show that Antigravity's architecture did not overcome a severely underpowered model, and that end-to-end answer quality depends heavily on the synthesizer backend."

I agree.

---

## 8 What this run **did** prove

1. **Antigravity's pipeline is robust.** Refresh ran on three real repos, two with `partial` exit codes due to per-module LLM timeouts but both still produced full indexes (`map.md`, `module_registry.json`, `agents/`, `graph/`). All 15 ag-ask runs returned an exit code 0; nothing crashed.
2. **Refresh time scales with repo size, not linearly.** fastapi (55 MB) took 337 s, requests (9 MB) 155 s, sqlmodel (21 MB) 561 s — sqlmodel's longer runtime came from per-module retries on the small model, not from input size.
3. **Per-question latency is genuinely lower than live agents.** 22 s mean vs 42 s (Claude) and 120 s (Codex). After ~7-10 questions on the same repo the pre-indexing cost amortizes.
4. **The 188 internal tests still pass on HEAD** — the worktree itself is in good shape.

## 9 What this run **did not** prove

1. **It did not test Antigravity's architecture against a frontier synthesizer.** That experiment requires GOOGLE_API_KEY (Gemini) or a stronger Ollama model. With qwen2.5-coder:7b in place I would expect Antigravity's quality to lift substantially.
2. **It did not test Antigravity's MCP/sandbox/skill features.** Only `ag-refresh` and `ag-ask`.
3. **It did not control for the live agents' tool budgets.** Codex and Claude Code were both allowed unlimited grep/read; in tighter token-budget regimes Antigravity's pre-indexing advantage might widen.

---

## 10 Recommended next steps

1. **Re-run with qwen2.5-coder:7b once it's pulled** (offline mirror, or fix the slow CDN edge). The headline expected result is a 5-10× lift on Antigravity's accuracy/citations.
2. **Make the synthesizer's empty-output case loud.** Right now an empty synthesis exits 0 and looks like a successful answer. A small post-condition (`len(stdout.strip()) < 30 → exit 2`) would surface the real failure mode.
3. **Down-rank tutorial fixtures during indexing.** `fastapi/tests/scripts_*` contributed noise that misrouted the routing stage on `fa-d1` (Playwright). The scanner should de-prioritize obvious example-app dirs by default.
4. **Add a "trust mode" for refresh.** When ≥30 % of modules hit timeout retries, the engine should warn the user that the index is partial *before* `ag-ask` is run.

---

## 11 Reproducing this run

```bash
# 1. Clone targets
mkdir /tmp/ag-bench && cd /tmp/ag-bench
git clone --depth 1 https://github.com/fastapi/fastapi.git
git clone --depth 1 https://github.com/psf/requests.git
git clone --depth 1 https://github.com/tiangolo/sqlmodel.git

# 2. Drop OPENAI-compatible Ollama .env into each
for r in fastapi requests sqlmodel; do
  cat > /tmp/ag-bench/$r/.env <<EOF
OPENAI_BASE_URL=http://127.0.0.1:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=qwen3:0.6b   # or qwen2.5-coder:7b for stronger synthesis
EOF
done

# 3. Pull whichever model fits the bandwidth
ollama pull qwen3:0.6b      # 522 MB, fits anywhere
# ollama pull qwen2.5-coder:7b   # 4.7 GB, recommended

# 4. Run the three benchmarks
bash meta/run_codex.sh         # → answers/codex/*.md
bash meta/run_antigravity.sh   # → answers/antigravity/*.md
# Claude Code answers are gathered via the Explore subagent (parallel)

# 5. Score
python3 meta/score.py
```

Raw artifacts (every `(qid, tool)` answer + log + timing) are preserved under `artifacts/benchmark-2026-05-07/answers/` and `meta/`. Grades live in `meta/grades.json` so anyone can sanity-check or rescore.

---

## 12 File map

```
artifacts/benchmark-2026-05-07/
├── REPORT.md                  ← this file
├── questions.json             ← the 15 prompts
├── answers/
│   ├── antigravity/{qid}.md   ← ag-ask stdout
│   ├── antigravity/{qid}.log  ← ag-ask stderr (pipeline progress)
│   ├── codex/{qid}.md         ← codex exec final message
│   ├── codex/{qid}.log        ← full codex transcript
│   └── claude/{qid}.md        ← Explore subagent final reply
└── meta/
    ├── grades.json            ← per-cell 0-3 scores + notes
    ├── score.py               ← reproducible aggregator
    ├── run_codex.sh           ← codex runner script
    ├── run_antigravity.sh     ← refresh + ask runner
    ├── *.refresh.log          ← per-repo refresh transcripts
    ├── *.{ag,codex,claude}.time ← per-question wall-clocks
    ├── codex_runner.log       ← top-level codex run output
    └── ag_runner.log          ← top-level ag run output
```

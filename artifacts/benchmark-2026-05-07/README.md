# 2026-05-07 — Antigravity vs Codex vs Claude Code (run v2)

Cross-repo Q&A benchmark on `fastapi`, `requests`, `sqlmodel`. 15 questions × 3 tools = 45 graded answers.

→ Read [`REPORT.md`](REPORT.md) for the full write-up.

**Headline (v2, gpt-5.4 backend for Antigravity):**

| Tool | Composite (0-12) | Median latency / Q |
|---|--:|--:|
| Antigravity (gpt-5.4 via proxy) | **9.00** | 22 s |
| Codex CLI (gpt-5.5 xhigh) | 11.93 | 106 s |
| Claude Code Explore (Opus 4.7) | 11.87 | 42 s |

Antigravity now lands within ~25% of frontier live-agents on quality, while being **2-5× faster per question**. Single LLM swap from `qwen3:0.6b` → `gpt-5.4` lifted Antigravity 12× (0.73 → 9.00) — clean evidence the architecture is sound, the previous gap was synthesizer-strength.

Remaining gap to live agents (full breakdown in §6.3) is mostly **line-number citations**.

Raw artifacts:
- `answers/{antigravity,codex,claude}/{qid}.md` — per-tool answers
- `meta/grades.json` — per-cell scores + notes
- `meta/score.py` — reproducible aggregator
- `meta/run_*.sh` — runner scripts (key not embedded; pulled from .env at run time)

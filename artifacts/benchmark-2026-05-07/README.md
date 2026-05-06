# 2026-05-07 — Antigravity vs Codex vs Claude Code

Cross-repo Q&A benchmark on `fastapi`, `requests`, `sqlmodel`. 15 questions per tool × 3 tools = 45 graded answers.

→ Read [`REPORT.md`](REPORT.md) for the full write-up.

**Headline:** Antigravity 0.73/12, Codex 11.93/12, Claude Code 11.87/12.
The comparison is asymmetric — Antigravity ran on Ollama `qwen3:0.6b` (the only model that finished downloading on the test box) while the other two ran at frontier strength. The benchmark proves the *pipeline* runs end-to-end and is fast (22 s median per question) but is bottlenecked by the synthesizer model.

Raw artifacts:
- `answers/{antigravity,codex,claude}/{qid}.md` — per-tool answers
- `meta/grades.json` — per-cell scores + notes
- `meta/score.py` — reproducible aggregator
- `meta/run_*.sh` — exact runner scripts

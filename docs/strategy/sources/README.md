# Strategy sources (index)

**Status:** Index v1 — convention doc + table of contents for distilled external strategy material.

**Anchor sentinel:** `<!-- STRATEGY_SOURCES_INDEX_V1 -->`

<!-- STRATEGY_SOURCES_INDEX_V1 -->

## Purpose

This folder holds **distillations of external strategy material** — videos, podcasts, essays, books, talks — that informed CorpFlowAI thinking on offers, marketing, delivery, hiring, decision-making, and operator discipline.

These files are **inputs**, not doctrine. They influenced our thinking; they do not by themselves dictate behaviour. Authoritative behaviour continues to live in:

- `docs/marketing/` (numbered standards `00_…` → `05_…` + `BRAND_AND_CONVERSION_DOCTRINE.md`) for marketing and conversion.
- `docs/decisions/JOURNAL.md` for decisions of record.
- `.cursor/rules/` and `AGENTS.md` for operational discipline.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` for the production bar.

When a source materially shifts how we want to operate, the change must land in the **authoritative doctrine file** via a separate PR — not by editing the source distillation here.

## Reading discipline

Individual source captures in this folder are **not mandatory reading for every task.** Read a specific capture only when:

- you are working on the area it explicitly informs (Lead Rescue commercial engine, marketing engine, hiring brief, etc.), or
- you are about to propose a doctrine change and want to check whether an existing source has already covered the ground.

For a high-level scan, this README's index table at the bottom is sufficient.

## Capture conventions (what every file in this folder must do)

1. **File name** — `YYYY-MM-DD-<slug>.md`. The date is the **capture date** (when CorpFlowAI recorded it), not the source publication date.
2. **Anchor sentinel** — one unique `<!-- STRATEGY_SOURCE_<DATE>_<SLUG> -->` near the top, mirrored in this README's index table.
3. **Source metadata block** — title, URL, source type (video / podcast / essay / book / talk), capture date, who captured it, capture method (direct / ChatGPT distillation / human notes), and relevance areas.
4. **Summary** — 10–14 bullet strategic summary. **No transcript.** No long quoted passages. Attribute the original creator; never imply CorpFlowAI authored the underlying ideas.
5. **CorpFlowAI application** — concrete sections mapping the source to CorpFlowAI surfaces (Lead Rescue, marketing engine, client migration, delivery acceleration, Operator Bridge, hiring / delegation, exit optionality).
6. **Action implications** — `do-now`, `do-not`, and `future packets (named only, not opened)`.
7. **Proposed doctrine updates** — listed only. **Do not** edit doctrine files from inside a source capture; each doctrine change goes through its own PR with its own operator DECISION block.

## Forbidden in this folder

- Full transcripts or large quoted passages. Summarise and attribute.
- Doctrine changes inside a capture file. Capture lists proposed updates; doctrine updates are separate PRs.
- Capture files that touch runtime code, env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behaviour, Vercel config, GitHub settings, or deployment settings. Capture is docs-only.
- Quantitative claims imported without verification (e.g. "X% conversion lift") — if a source contains them and CorpFlowAI has not independently verified, do not propagate.

## How a capture relates to doctrine

```
external source        →  docs/strategy/sources/<date>-<slug>.md
                            (distilled summary + application + proposed updates LISTED)
                                       │
                                       ▼
                         operator DECISION block (separate)
                                       │
                                       ▼
                      doctrine PR  →  docs/marketing/* / docs/decisions/* / .cursor/rules/*
```

A capture never directly mutates doctrine. A capture proposes; doctrine PRs decide.

## Index

| Capture date | Slug | Title | Primary relevance |
|---|---|---|---|
| 2026-05-28 | [simplicity-1-1-1-proof-email-memo](./2026-05-28-simplicity-1-1-1-proof-email-memo.md) | Simplicity, 1-1-1, Proof, Email List, and Memo Culture | Lead Rescue, marketing engine, memo culture, hiring, exit optionality |

When a new capture lands, add a row to this table in the same PR.

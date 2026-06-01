# Agentic Memory v1 — foundation (docs-only proposal accepted)

**Date:** 2026-05-31
**Status:** accepted (docs-only proposal phase)
**Decided by:** Anton (CorpFlow operator), via DECISION 4585482069 on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585482069)
**Companion proposal:** `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md`
**Supersedes:** none

## Context

CorpFlow has accumulated institutional memory across 15 source classes (this repo, GitHub, an Operator Bridge issue, Drive, accounting, client folders, ad-hoc operator notes). Today only humans can retrieve it, by reading and scrolling. Agents cannot answer "what did Anton decide about X" without the operator pasting context back in.

The first AM-1 STATUS posted to #249 ([issuecomment-4585562303](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585562303)) catalogued sources, classified sensitivity, sketched a 14-table `memory_*` model, named a < 5 MB safe-first-import set, and surfaced seven retrieval use cases. Anton accepted that STATUS and approved a **docs-only** proposal PR as the next gate.

## Decision

1. **Open a docs-only proposal PR** at `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` covering: source inventory, data classification, proposed `memory_*` model, hold-list, safe first import, retrieval use cases, privacy/security risks, dry-run plan, server capacity findings, and implementation phases. **No** runtime, schema, migration, import, embedding, vector store, Drive/accounting/client content, autonomous agent, secrets, env, provider, or server-setting changes are authorised by this PR.
2. **Hold-list is binding.** Google Drive content, accounting bodies, client raw uploads, secrets, and CMP/email/automation bodies are **not** imported in v1. `memory_transaction_refs` is metadata-only — no invoice bodies, no line items, no banking details.
3. **Server plan tier and Neon plan tier do not change.** The post-upgrade `corpflow-exec-01` probe (4 vCPU / 7.6 GiB RAM / 150 GB disk, 7% used) confirms more than enough headroom for v1; AM-1 v1 storage lives on Neon and is projected at < 100 MB.
4. **Phasing is gate-by-gate.** Phase 0 = this docs-only PR; Phase 1 = dry-run script against a dev-only Neon DB (separately approved); Phase 2 = Prisma migration on dev; Phase 3 = first agent retrieval CLI on dev; Phase 4 = production migration; Phase 5 = embeddings (v1.1); Phase 6 = telemetry / CMP bodies (v1.2); Phase 7 = Drive / accounting bodies (per-source decisions). Each phase is its own approval and follows `.cursor/rules/delivery-reality.mdc`.

## Why this docs-only path (vs jumping straight to a Prisma migration)

- The schema review surface is more important than the migration mechanics: 14 tables × column choices × dedup keys × supersession semantics need to be agreed before any DB writes.
- Drive / accounting / client material is the highest-risk class. A docs-only proposal lets the hold-list be ratified separately from any code that could later regress it.
- A failed dry run on a dev DB is recoverable; a failed first migration on production is not. The docs phase forces "what would we import, exactly, and from where" to be answered in writing.
- The five-minute counterargument — "just write the migration and move on" — does not survive contact with `docs/operations/POSTGRES_PROVIDER.md` (Neon-only), `docs/operations/SECURITY_REVIEW_CHECKLIST.md` (touch points for tenancy + secrets), or the autonomous-actions policy hard gate on production DB changes.

## Consequences

- **Positive:**
  - Agents and humans now have a single in-repo doc to argue against when the schema needs adjustment.
  - The HELD set is recorded in-repo, not just in chat.
  - Server capacity is now an in-repo finding, not a question for next time.
  - The `memory_*` namespace is reserved before another packet accidentally squats on it.
- **Negative / follow-ups:**
  - Until Phase 1 ships, agents still cannot retrieve memory programmatically; this is intentional (review first).
  - The JOURNAL row + this ADR introduce two pointers that future PRs must keep in sync if the proposal is amended (covered by `docs/CORPFLOW_SHARED_TODO.md` § *Base process — commit, push, and documentation*).
  - The "no `embedding` column" choice is intentional for v1 but means the first retrieval is lexical only — fine for the seven queries in §6 of the proposal, insufficient for "find similar decisions" semantic search. Embeddings are queued as v1.1.

## Links

- Canonical proposal: `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md`.
- Coordination thread: GitHub issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- Approving DECISION: [issuecomment-4585482069](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585482069).
- First STATUS: [issuecomment-4585562303](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585562303).
- Canonical Postgres provider: `docs/operations/POSTGRES_PROVIDER.md` (Neon).
- Autonomy policy: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.
- Delivery reality rule: `.cursor/rules/delivery-reality.mdc`.
- Communications doctrine (for cross-check): `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
- Compliance: `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` (will need a row update when Phase 4 ships if the memory DB is on a separate Neon project).

## Reversibility

Single revert PR of the merge commit removes both new docs and the JOURNAL row atomically. No code, schema, secret, or runtime is touched, so revert is doc-only and has no client-facing impact.

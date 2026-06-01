# Agentic Memory v1 — repo-only dry-run plan (AM-2)

**Date:** 2026-06-01
**Status:** accepted (docs-only proposal phase) — no execution authorised by this ADR
**Decided by:** Anton (CorpFlow operator), via DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) following PR [#274](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/274) closure (commit `a49c2c47`)
**Companion plan:** `docs/operations/AGENTIC_MEMORY_V1_DRY_RUN_PLAN.md`
**Supersedes:** none. **Refines:** `docs/decisions/20260531-agentic-memory-v1-foundation.md` (AM-1 foundation).

## Context

PR #274 merged the AM-1 foundation proposal to `main` on 2026-06-01 (commit `a49c2c47`). The foundation §10 lists Phase 1 as "dry run on dev DB" and explicitly does **not** authorise execution. Anton's [DECISION 4585482069](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585482069) Decision 5 leaves dry-run import authorisation **NOT YET APPROVED**. The next reviewable artefact is therefore a *plan* for Phase 1 — a docs-only specification of what the dry run would read, what fields it would emit, what it would refuse to do, and how the operator verifies it.

The five-minute counterargument — "skip the plan and write the script" — does not survive contact with Decision 5's "NOT YET" phrasing or the production-grade rule that schema fit be reviewable in writing before any code lands. Writing the plan first preserves the right to reject the schema before any Prisma migration is committed.

## Decision

1. **Open a docs-only plan PR (this PR)** at `docs/operations/AGENTIC_MEMORY_V1_DRY_RUN_PLAN.md` covering: exact repo + GitHub-API source allowlist, exact field-by-field map for each `memory_*` table the dry run would emit, dry-run output format (filesystem only — no DB writes), hard guarantees (no production DB write, no external write, no secrets persisted, no Drive / accounting / client content, no autonomous behaviour), rollback (delete the output directory), verification method (six operator checks), and the explicit four-item approval gate that must be cleared before Phase 1 executes.
2. **No execution is authorised by this PR.** No `scripts/agentic-memory/dry-run-import.mjs` is added; no `.gitignore` change is made; no `package.json`, `prisma/schema.prisma`, env, secret, workflow, or runtime code is touched.
3. **Phase 1 execution remains a separate, explicit gate.** Decision 5 (dry-run import authorisation) is **NOT YET APPROVED**. Phase 1 starts only after Anton issues an explicit DECISION on #249 referencing this plan, *and* a separate code PR is reviewed and merged.
4. **Hold-list is unchanged.** Drive (Decision 2), accounting bodies (Decision 3), client raw uploads, secrets, CMP/email/automation bodies, and tenant PII remain HELD. The dry run cannot reach them by design — they are not on the allowlist, and the script (when written) imports no clients that could read them.

## Consequences

- **Positive:**
  - Phase 1 is reviewable in writing before any code lands; schema fit is challengeable on the doc, not on a half-run script.
  - Hard guarantees are recorded in-repo (no DB write, no external write, no secrets persisted, rollback by directory delete) before there is any state to revert.
  - The four-item approval gate (§8 of the plan) prevents an "approved by precedent" drift — Phase 1 needs its own DECISION + its own PR + its own CI smoke test + its own operator review.
  - The secret scrubber requirement is now part of the contract, not an afterthought.
- **Negative / follow-ups:**
  - Until Phase 1 is approved and executes, agents still cannot retrieve memory programmatically. This is intentional; review-first is the explicit posture.
  - The plan defers five small open questions (token storage, output retention, chat-history opt-in, PR window size, bridge thread cap) to the next gate. None block this PR.
  - When the dry-run script PR is later opened, this ADR must be linked from its description so the gate is auditable.

## Links

- Companion plan: `docs/operations/AGENTIC_MEMORY_V1_DRY_RUN_PLAN.md` (this ADR's binding spec).
- Parent ADR-lite: `docs/decisions/20260531-agentic-memory-v1-foundation.md`.
- Parent proposal: `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` (merged PR [#274](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/274), commit `a49c2c47`).
- Coordination thread: GitHub issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- Approving DECISION (parent): [issuecomment-4585482069](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4585482069).
- Autonomy policy: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` (§3 hard gates, §2 docs-only allowance).
- Delivery reality rule: `.cursor/rules/delivery-reality.mdc`.
- Postgres provider rule: `docs/operations/POSTGRES_PROVIDER.md` (Neon — relevant when Phase 2 dev DB is provisioned).
- Compliance: `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` (no new subprocessor introduced by this PR).

## Reversibility

Single revert PR of the merge commit removes both new docs and the JOURNAL row atomically. No code, schema, secret, or runtime is touched, so revert is doc-only and has no client-facing impact. If a future revert lands after Phase 1 has executed, the `.am1-dry-run/` output directory should be deleted manually as well (the directory itself is never committed).

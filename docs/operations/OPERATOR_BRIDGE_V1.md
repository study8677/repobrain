# Operator Bridge v1 — coordination protocol between ChatGPT, Cursor, and Anton

**Status:** Protocol documentation only. Not yet wired to a GitHub Issue or automation.
**Owner:** Anton (operator).
**Drafted:** 2026-05-27.
**Anchor sentinel:** `<!-- OPERATOR_BRIDGE_V1_ANCHOR -->`

<!-- OPERATOR_BRIDGE_V1_ANCHOR -->

## 1. Purpose

Reduce Anton's copy/paste burden between ChatGPT (planning / instruction author) and Cursor (in-repo executor) **without** weakening delivery-reality discipline, operator-owned merges, or scope control.

The bridge is a **coordination layer**, not an autonomous AI-to-AI execution loop. It standardizes **where status is posted**, **where decisions are recorded**, and **what is on hold**, so the operator always knows the next click and the agents always know whether they are authorized to proceed.

This doc supplements (and does **not** replace) the canonical execution rules:

- `.cursor/rules/delivery-reality.mdc`
- `.cursor/rules/predeploy-decision-checks.mdc`
- `.cursor/rules/commit-push-doc-constraints.mdc`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md`

If any of those rules conflict with this doc, **those rules win**.

## 2. Recommended architecture — Option C (Hybrid)

| Layer | Where | What lives there |
|---|---|---|
| **Live coordination** | One standing GitHub Issue: `Operator Bridge — Active Work Queue` | Current work queue, status comments, decision comments, HOLD markers, blockers, requested operator clicks. Ephemeral / mutable. |
| **Durable architecture** | `docs/operations/OPERATOR_BRIDGE_V1.md` (this doc) | Protocol, message schemas, hold rules, operator-must-act rules, migration plan. Versioned in `main`. |
| **Durable closure records** | `artifacts/chat_history.md`, packet docs in `docs/operations/` or `docs/execution/`, Delivery Reality Audit blocks inside PRs | Final, immutable evidence of what was decided, what merged, what was live-verified. |

**Why hybrid:** GitHub Issues give a single, queryable, low-friction surface for live status without churning the repo every minute. The repo retains the long-lived architectural truth and the closure record. Issue comments are coordination chatter; **`main` is always the source of truth.**

## 3. Naming (frozen for v1)

- **Coordination issue title (exact):** `Operator Bridge — Active Work Queue`
- **Coordination issue body anchor:** `<!-- OPERATOR_BRIDGE_V1_ISSUE -->`
- **Canonical doc path:** `docs/operations/OPERATOR_BRIDGE_V1.md` (this file)
- **Closure record path:** `artifacts/chat_history.md`
- **Suggested labels (not created until v1.1):** `bridge:holding`, `bridge:ready-to-merge`, `bridge:needs-operator`, `bridge:blocked`, `bridge:complete`. v1 of this protocol does **not** create labels.

## 4. Actor responsibilities (frozen)

| Actor | Owns | Does NOT own |
|---|---|---|
| **Anton (operator)** | Merges. Secrets. DNS. Billing. External accounts (GitHub, Vercel, Plausible, Search Console, Telegram, payment processors). All operator-only actions per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3. Final verdicts. | Drafting in-repo content. Running tests. Opening PRs. Routine status reporting. |
| **Cursor (in-repo executor)** | Drafting docs and code on approved branches. Running `npm test`, build, audits. Opening PRs against `main`. Posting status. Verifying merges, sentinels, live URLs (read-only). | Merging PRs. Editing secrets, DNS, env vars, deployment settings. Pushing to `main` directly. Touching forbidden surfaces (see §6). |
| **ChatGPT (planning author)** | Authoring instructions, packet definitions, decision text, policy framing — delivered **through Anton**. | Direct repository writes. Direct CI access. Direct merges. Any autonomous loop with Cursor that bypasses Anton. |

**Rule of thumb:** ChatGPT proposes, Anton approves, Cursor executes, Anton merges, Cursor verifies. The bridge makes each handoff one-click instead of multi-paragraph.

## 5. Message schemas

All status updates and decisions in the coordination issue use a **machine-checkable header** plus a free-form body.

### 5.1 Cursor status update

```
### Cursor status — <YYYY-MM-DD HH:MM UTC>

**Packet:** <packet name or PR number>
**State:** OPEN | HOLDING | AWAITING_OPERATOR | BLOCKED | READY_TO_MERGE | MERGED_PENDING_VERIFICATION | COMPLETE | FAILED
**Branch / PR:** <PR URL or branch ref>
**Files changed:** <count + key paths>
**Sentinels present:** <list, one per line>
**Checks:** <green | red | running>
**Next operator click:** <one sentence — "Click squash-merge", "Refresh and Update branch", "Acknowledge HOLD", or "None">
**Blocker (if any):** <one sentence>
**Evidence:** <links to logs, PR diff, live URL probes>
```

### 5.2 Operator / ChatGPT decision

```
### Operator decision — <YYYY-MM-DD HH:MM UTC>

**Source:** Anton | Anton (relaying ChatGPT)
**Decision:** approve <packet> | hold <packet> | reject <packet> | escalate <packet>
**Scope:** <approved files / paths>
**Constraints:** <hard limits — repeat forbidden surfaces if relevant>
**Operator-only steps Anton will take:** <merges, env edits, DNS — or "none">
**Definition of done:** <one paragraph>
**Verification required:** <what Cursor must report back>
```

### 5.3 Closure note (mirrored to `artifacts/chat_history.md`)

```
### Closure — <YYYY-MM-DD HH:MM UTC>

**PR:** #<n>
**Merge SHA:** <full sha>
**Merged at:** <iso>
**Live verification:** <urls + probe results, or "n/a docs-only">
**Delivery Reality Audit verdict:** COMPLETE | PARTIAL | FAILED
**Sentinel(s) on main:** <list>
```

## 6. When Cursor must HOLD (non-exhaustive)

Cursor **must not** proceed and must post a `State: HOLDING` status update if any of the following are true:

1. The change would touch any **forbidden surface**: runtime code, env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram behavior, Vercel config, GitHub settings, deployment settings, billing, or external accounts — **without** an explicit operator approval naming that surface.
2. The change would modify governance docs (`.cursor/rules/*`, `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, `CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `delivery-reality.mdc`, `predeploy-decision-checks.mdc`) without explicit approval naming that file.
3. The expected diff scope is unclear, larger than approved, or would touch files outside the approved list.
4. Tests, build, or audits fail and the failure is not deterministically attributable to the in-progress change.
5. A merge would create a contradiction with existing `main` (e.g. would re-delete a restored sentinel, would overwrite newer history entries).
6. The required Delivery Reality Audit values (merge SHA, deployment ID, live URLs) are not yet observable.
7. Production verification is required but Cursor cannot reach the live URL.
8. Anton has not yet acknowledged a prior `AWAITING_OPERATOR` state.

When in doubt, **HOLD and post evidence** is always allowed; guessing is not.

## 7. When Anton must act (operator-only)

Cursor will surface an `AWAITING_OPERATOR` status whenever the next step requires one of:

- Merging a PR.
- Editing or rotating a secret / env var (Vercel, GitHub, Neon, n8n, Plausible, Search Console, Telegram, etc.).
- DNS or domain changes.
- Billing / payment / external-account changes.
- Production deploy decisions (promote, rollback, hotfix).
- Destructive DB changes or migrations on prod.
- Tenant migration or onboarding actions that change real customer data.
- Approving a new packet that lifts a hold or expands scope.
- Confirming a Delivery Reality Audit verdict.

Operator-only clicks should be the **only** thing Anton has to do for routine packets; everything else (drafting, tests, PR creation, evidence collection) is Cursor's.

## 8. Migration plan from current copy/paste flow

**Phase 0 — today (this PR):**
Land this protocol doc + AGENTS.md row + shared-TODO cross-link. No issue created. No automation. No labels. Cursor and Anton continue to use chat as the live coordination surface, but they reference this doc when needed.

**Phase 1 — create the coordination issue (separate, operator-initiated):**
Anton manually opens one GitHub Issue titled `Operator Bridge — Active Work Queue` containing the anchor `<!-- OPERATOR_BRIDGE_V1_ISSUE -->` and a pinned link back to this doc. Cursor begins posting `Cursor status` comments using the schema in §5.1. Anton (or ChatGPT-via-Anton) posts decisions using §5.2.

**Phase 2 — adopt label vocabulary (optional, requires operator action in GitHub UI):**
Anton creates the five `bridge:*` labels listed in §3. Cursor applies them via `gh pr view` / `gh issue edit` calls inside its status updates. Labels are advisory; the headers in §5 remain authoritative.

**Phase 3 — closure mirroring (already covered by `artifacts/chat_history.md`):**
Each completed packet's closure note (§5.3) is mirrored to `artifacts/chat_history.md` in the same PR or a tiny follow-up, with a unique sentinel. The coordination issue can be pruned; the chat history is permanent.

**Phase 4 (deferred / not in scope of this PR):** Optional automation — e.g. a small repo workflow that comments PR merge SHAs into the coordination issue, or a CMP-side bridge mirror. **Not implemented in v1.** Any such automation requires its own explicit operator approval and a separate PR.

## 9. Guardrails (non-negotiable)

- **Anton owns merges.** Cursor must never merge a PR on its own.
- **`main` is the source of truth.** If an issue comment disagrees with `main`, `main` wins.
- **No fabrication.** Cursor must never invent merge SHAs, deployment IDs, probe results, or production status. `HOLDING` is always allowed; guessing is not.
- **Scope is sacred.** A packet's approved file list is the entire allowed diff surface unless Anton explicitly expands it.
- **Forbidden surfaces stay forbidden.** See §6.1 — these require an operator approval that names the surface.
- **Delivery reality applies.** Even docs-only PRs follow §5.3's closure schema; runtime PRs additionally follow `.cursor/rules/delivery-reality.mdc`.
- **No autonomous AI-to-AI execution.** ChatGPT instructs through Anton; Cursor executes under Anton's approval. There is no direct ChatGPT → Cursor pipe.

## 10. Minimal first implementation (this PR)

The PR that introduces this protocol is itself the minimum viable bridge:

1. Adds `docs/operations/OPERATOR_BRIDGE_V1.md` (this file).
2. Adds one row to `AGENTS.md`'s must-read table linking to this doc.
3. Adds one short cross-link paragraph in `docs/CORPFLOW_SHARED_TODO.md`.
4. Does **not** open the coordination issue.
5. Does **not** create labels.
6. Does **not** add automation.
7. Does **not** touch any runtime, env, DNS, DB, tenant, analytics, Plausible, Search Console, Telegram-behavior, Vercel-config, GitHub-settings, or deployment surface.

After this PR merges and is live-verified per `delivery-reality.mdc`, Anton can choose to proceed to Phase 1 (create the coordination issue) at his own pace; nothing in `main` requires it.

## 11. Cross-references

- Execution policy: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Packet structure: `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- Current queue: `docs/execution/WEEKEND_EXECUTION_QUEUE.md`
- Delivery reality: `.cursor/rules/delivery-reality.mdc`
- Predeploy checks: `.cursor/rules/predeploy-decision-checks.mdc`
- Commit/push doc constraints: `.cursor/rules/commit-push-doc-constraints.mdc`
- Closure log: `artifacts/chat_history.md`

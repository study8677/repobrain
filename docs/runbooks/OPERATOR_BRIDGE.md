# Operator Bridge — day-to-day runbook

**Purpose:** Thin operator-facing companion to `docs/operations/OPERATOR_BRIDGE_V1.md`. Covers "how do I post a status comment right now?" for Cursor, Codex Cloud, and Anton. The full architecture, hold rules, and guardrails live in `OPERATOR_BRIDGE_V1.md` — this runbook does not duplicate them.

**Coordination issue:** **GitHub issue #249** — `Operator Bridge — Active Work Queue`.

## 1. Quick map

| You are | You post | Schema |
|---|---|---|
| Cursor or Codex Cloud (executor) | Status update on every state transition | `OPERATOR_BRIDGE_V1.md` §5.1 |
| Anton (operator) | Decision: approve / hold / reject / escalate | `OPERATOR_BRIDGE_V1.md` §5.2 |
| Cursor or Codex Cloud (after merge) | Closure note + mirror to `artifacts/chat_history.md` | `OPERATOR_BRIDGE_V1.md` §5.3 |

## 2. When an executor must post

Post a STATUS comment to #249 at every one of these moments:

1. **Packet claim** — `APPROVED → IN_PROGRESS`. Identify which executor is claiming.
2. **Awaiting operator** — pre-merge or any AAP §3 gate hit (secrets, DNS, billing, etc.).
3. **Blocked** — anything in `OPERATOR_BRIDGE_V1.md` §6 HOLD rules.
4. **Evidence captured** — when `npm test` / `npm run build` / live probes are done and recorded in the PR.
5. **PR merged** — closure note per §5.3.

If unsure whether to post: **post.** Silence is worse than redundancy on #249.

## 3. Required header field (Delivery Acceleration v1)

Every status comment must start with the executor identity. This is the only addition this runbook makes to the `OPERATOR_BRIDGE_V1.md` schemas:

```
**Executor:** Cursor | Codex Cloud | Internal agent
```

Place it directly under the `### Cursor status — <timestamp>` line in §5.1, or directly under `### Closure — <timestamp>` in §5.3.

## 4. Human-readable summary section (required on every Cursor STATUS / Closure)

> Anton should not have to read a full audit report to know what action is required.

Established by Anton on 2026-05-28 23:59 UTC+4 as a bridge-improvement rule. Every Cursor `### Cursor status — …` and `### Closure — …` comment on #249 must include a short human-readable section, **at the top or bottom** of the comment, with these three fixed blocks:

```text
ANTON TO-DO
1. [specific action required from Anton, or "none"]
2. [specific action required from Anton, or omit]

RECOMMENDED NEXT CLICK
[merge / approve / hold / review / no action]

CAN ANTON IGNORE THIS FOR NOW?
[yes/no, with one-line reason]
```

Cursor places the human summary at the **top** by default. Bottom is acceptable for short notes where the body itself is self-evidently a no-action update.

### 4.1 Field rules

- **`ANTON TO-DO`** — only items that require Anton specifically. Annotate satisfied items inline (e.g. *SETTLED — already recorded at issuecomment-…*) so Anton can scan-confirm without scrolling. If a contractor or another executor needs to act, name them in the body, not here.
- **`RECOMMENDED NEXT CLICK`** — exactly one of: `merge`, `approve`, `hold`, `review`, `no action`. If the click is something else (e.g. *rotate env var*), name it as a free-text line and label it `RECOMMENDED NEXT CLICK: <action>`.
- **`CAN ANTON IGNORE THIS FOR NOW?`** — the honest answer. If `yes`, the one-line reason explains why (e.g. *evidence-only update; nothing waiting on you*). If `no`, the one-line reason is the actual blocker.

### 4.2 What this rule does and does not cover

- **Applies to:** `### Cursor status — …` and `### Closure — …` comments authored by an executor (Cursor, Codex Cloud, future internal agent).
- **Does not apply to:** `### Operator decision — …` comments — those are written or mirrored on Anton's behalf and have their own schema in `OPERATOR_BRIDGE_V1.md` §5.2 plus the example in §6.4 below.
- **Long evidence still allowed below.** Detailed audits, file lists, scoring tables, schemas, and Delivery Reality Audits remain encouraged. They go below the human summary, not above.
- **Historical comments are not retroactively edited.** Honest history (per §8 *do not delete history*) outweighs scan efficiency on past comments. The new format applies from the announcement comment onward.

## 5. Branch prefix at a glance

| Executor | Branch namespace | Owner field on the packet |
|---|---|---|
| Cursor | `docs/*`, `chore/*`, `feat/*`, `fix/*`, `refactor/*` | `Owner: Executor = Cursor` |
| Codex Cloud | `codex/docs-*`, `codex/chore-*`, `codex/feat-*`, `codex/fix-*`, `codex/refactor-*` | `Owner: Executor = Codex Cloud` |
| Internal agent (future, phase 1+) | `internal-agent/*` (created via a future `policy:` PR) | `Owner: Executor = Internal agent` |

Never commit to a branch whose prefix does not match your executor identity. If the packet's `Owner: Executor` field names someone else, **HOLD** and ask Anton for re-assignment.

## 6. What never appears in a status comment

Carried from `OPERATOR_BRIDGE_V1.md` §9 and `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` §2.5. If you cannot describe the state without breaking these, post the status only and link evidence:

- Secret values, factory master key, Vercel / GitHub / OpenAI tokens.
- Reset codes, password hashes.
- Full session cookies, full `Authorization` headers, full `x-corpflow-*-secret` headers.
- Full request / response bodies that contain PII.
- Tenant data (rows, IDs not already publicly known, billing balances).
- Anything that looks redacted but an outsider could de-redact.

When in doubt, name the **shape** of the evidence and link the `artifacts/` file; do not paste the content.

## 7. Five concrete examples

### 7.1 Cursor claiming a docs-only packet

```
ANTON TO-DO
1. none

RECOMMENDED NEXT CLICK
no action

CAN ANTON IGNORE THIS FOR NOW?
yes — packet is in progress; checks running; will post evidence when green

---

### Cursor status — 2026-05-28 04:50 UTC

**Executor:** Cursor
**Packet:** Delivery Acceleration v1 — protocol
**State:** IN_PROGRESS
**Branch / PR:** docs/delivery-acceleration-v1-protocol (PR pending)
**Files changed:** 5 (new + edit, docs only)
**Sentinels present:** OPERATOR_BRIDGE_V1_ANCHOR
**Checks:** running (npm test, npm run build)
**Next operator click:** none (working)
**Blocker (if any):** none
**Evidence:** PR will be opened when checks green
```

### 7.2 Codex Cloud claiming a docs-consistency audit

```
ANTON TO-DO
1. none

RECOMMENDED NEXT CLICK
no action

CAN ANTON IGNORE THIS FOR NOW?
yes — read-only audit; will post the report path when complete

---

### Cursor status — 2026-06-XX HH:MM UTC

**Executor:** Codex Cloud
**Packet:** Docs consistency audit (AGENTS.md must-read table vs files on disk)
**State:** IN_PROGRESS
**Branch / PR:** codex/docs-consistency-audit (PR pending)
**Files changed:** 1 (artifacts/audits/<date>-docs-consistency.md)
**Sentinels present:** none required (read-only audit)
**Checks:** running
**Next operator click:** none (working)
**Blocker (if any):** none
**Evidence:** report saved at artifacts/audits/<date>-docs-consistency.md
```

### 7.3 Executor hitting an AAP §3 gate

```
ANTON TO-DO
1. Rotate <env var name> in Vercel Production (operator-only step; AAP §3.2)

RECOMMENDED NEXT CLICK: rotate <env var name> in Vercel Production

CAN ANTON IGNORE THIS FOR NOW?
no — packet is blocked on this rotation; live verification cannot complete until the new value propagates

---

### Cursor status — 2026-06-XX HH:MM UTC

**Executor:** Cursor
**Packet:** <packet name>
**State:** AWAITING_OPERATOR
**Branch / PR:** <PR URL>
**Files changed:** <count>
**Sentinels present:** <list>
**Checks:** green
**Next operator click:** rotate <env var name> in Vercel Production
**Blocker (if any):** value drift detected on <env name>; cannot proceed without operator action per AAP §3.2
**Evidence:** diagnostic JSON at artifacts/diagnostics/<date>-<env-name>.json
```

### 7.4 Anton approving a packet

> *No human-readable summary required — `### Operator decision` is written or mirrored on Anton's behalf and uses its own schema (`OPERATOR_BRIDGE_V1.md` §5.2). The rule in §4 above applies to executor STATUS / Closure comments only.*

```
### Operator decision — 2026-06-XX HH:MM UTC

**Source:** Anton
**Decision:** approve Docs consistency audit
**Scope:** read repo + write artifacts/audits/<date>-docs-consistency.md only
**Constraints:** no other paths; no secrets; no tenant data; one PR, single Executor = Codex Cloud
**Operator-only steps Anton will take:** merge the PR when Cursor reports green
**Definition of done:** report exists on main, AGENTS.md is unchanged by this packet
**Verification required:** Codex Cloud posts the closure note with the merge SHA
```

### 7.5 Closure mirror

```
ANTON TO-DO
1. none — closure record only

RECOMMENDED NEXT CLICK
no action

CAN ANTON IGNORE THIS FOR NOW?
yes — packet is COMPLETE; record-keeping only

---

### Closure — 2026-06-XX HH:MM UTC

**Executor:** Codex Cloud
**PR:** #<n>
**Merge SHA:** <full sha>
**Merged at:** <iso>
**Live verification:** n/a — docs-only
**Delivery Reality Audit verdict:** COMPLETE
**Sentinel(s) on main:** <list>
```

Mirror to `artifacts/chat_history.md` in the same PR or a tiny follow-up.

## 8. If something is wrong

- If `main` disagrees with #249, `main` wins. Update the issue, do not invent state.
- If a STATUS comment leaked any forbidden content, post a follow-up comment marking it: `### Redaction notice — <timestamp>` naming what was leaked (by shape, not value) so Anton can decide on rotation. Do **not** delete history — that destroys the audit trail.
- If a STATUS comment had encoding mojibake (e.g. PowerShell codepage corrupting em-dashes), edit the comment in place via `gh api -X PATCH` and add a `## Encoding correction note` section in the comment naming what was fixed. The comment id is preserved; the audit trail survives.
- If two executors look like they claimed the same packet, both must HOLD and wait for Anton's `Operator decision` re-assigning ownership.

## 9. References

- Bridge architecture, schemas, hold rules, guardrails: `docs/operations/OPERATOR_BRIDGE_V1.md`
- Delivery Acceleration v1 protocol (multi-executor model + Codex Cloud posture): `docs/execution/DELIVERY_ACCELERATION_V1.md`
- Packet structure: `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
- What requires approval: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
- Live verification rules: `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`

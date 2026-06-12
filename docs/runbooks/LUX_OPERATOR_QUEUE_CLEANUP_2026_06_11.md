# LuxeMaurice operator queue cleanup — 2026-06-11

## What

Hard-close the 18 historical **Phase 4C.1 attachment-review smoke / test artifact** tickets that still appeared as `status=Open / stage=Intake / workflow=awaiting_operator_review` on the `/change` operator desk for the `luxe-maurice` tenant. The rows are repeatable round-trip smoke output (and one operator test draft from 2026-05-07), not real client work, but they were inflating the operator queue and pushing real work below the fold.

## Goals

- Reduce operator noise without losing audit history.
- Preserve attachments, prior `messages[]`, and `console_json` history.
- Use the canonical `buildHardCloseConsoleJsonPatch` so closed rows render with the same `client_view.workflow_state='closed'` semantics as every other hard-close in the repo.
- Never touch the master strategic programme ticket `cmo8mjijk0000jl04l1jz0v6d`.
- Never touch the active content sprint parent `cmqa2y2ga0000l704glnfro1f`.

## Non-negotiables

- No deletes (tickets, attachments, messages).
- No mutation of `cmo8mjijk0000jl04l1jz0v6d` or `cmqa2y2ga0000l704glnfro1f`.
- Tenant lock — `luxe-maurice` only; the script will refuse any other tenant.
- No new env vars; no schema migration.

## Tooling (added in this packet)

| Surface | Purpose |
|---|---|
| `lib/cmp/_lib/lux-phase4c1-smoke-cleanup.js` | Pure helpers: `TARGET_TICKETS` (18 ids), `PROTECTED_TICKETS` (2 ids), `KNOWN_OPERATOR_TEST_DRAFTS` (per-id signature for the one 2026-05-07 non-Phase-4C.1 operator test draft), `preflightConfigCheck`, `preWriteCheck`, `applyHardCloseAndAppendMessage`. No DB / fs / env reads. Unit-tested. |
| `scripts/lux-close-phase4c1-smoke-tickets.mjs` | CLI orchestrator. Dry-run by default; `--execute` to write; `--output=<path>` to snapshot JSON. Refuses without `POSTGRES_URL`. Per-row pre-write re-check against the pure helpers. Aborts the whole run on any refusal that isn’t the soft `already-closed` skip. |
| `scripts/lux-queue-audit.mjs` | Read-only audit (existing). Now passes `status / stage / workflow_state` through to the classifier, so the new `archived_completed` bucket is populated under `--include-closed`. |
| `lib/client/lux-change-queue-classify.js` | Adds `archived_completed` bucket — terminal-closed rows (status `Closed`, stage `Closed`, or `client_view.workflow_state='closed'`) are routed to that bucket; programme ids still win. Live `/change` is unaffected because closed rows are filtered server-side before reaching the classifier. |
| `node-tests/lux-phase4c1-smoke-cleanup.test.mjs` | 25 unit tests covering target / protected lists, per-row guards, the per-id operator-test-draft signature, and the hard-close + message-append merge. |
| `node-tests/lux-change-queue-classify.test.mjs` | Extended with `archived_completed` cases. |

## How `applyHardCloseAndAppendMessage` mutates each row

Per valid target row, the script writes:

- `status = 'Closed'`
- `stage = 'Closed'`
- `consoleJson` merged via `buildHardCloseConsoleJsonPatch`:
  - `client_view.workflow_state = 'closed'`
  - `client_view.workflow_next_action = 'No further action — ticket closed.'`
  - `client_view.progress_message = 'Ticket closed (hard close).'`
  - `client_view.closure = { kind: 'hard_close', reason, context_note, decided_at }`
- `consoleJson.messages[]` — appended exactly one assistant-role closure note (`source: 'lux-queue-cleanup-2026-06-11'`); every prior message is preserved verbatim.

Closure text:

> Closed during 2026-06-11 LuxeMaurice operator queue cleanup — historical Phase 4C.1 smoke/test artifact. Audit history, attachments, and messages preserved.

## Pre-write guards (per row)

`preWriteCheck` refuses to write if any of the following holds:

- `row.id` is in `PROTECTED_TICKETS` (`cmo8mjijk0000jl04l1jz0v6d` / `cmqa2y2ga0000l704glnfro1f`).
- `row.tenantId !== 'luxe-maurice'`.
- `row.status === 'Closed'` (this is a **soft skip** — counted as `already-closed`, never an abort).
- Description (or title) doesn’t match the Phase 4C.1 attachment-review smoke heuristic AND the row isn’t in the narrowly-typed `KNOWN_OPERATOR_TEST_DRAFTS` map.
- For an entry in `KNOWN_OPERATOR_TEST_DRAFTS`: title doesn’t match the recorded `expected_title_exact`, description doesn’t match `expected_description_exact`, or `messages` / attachment counts exceed the recorded maxes.
- `client_view.workflow_state` is already terminal (`closed` / `published` / `discarded`).
- `stage` is already terminal (`closed` / `discarded`).

Any non-`already-closed` refusal aborts the entire run with a JSON refusal report — **no row in that batch is written**.

## Execution record (2026-06-11)

1. Identified target ids from `.lux-verify/queue-audit-post-sprint.json` — 18 rows, all `luxe-maurice`, all `Open / Intake / awaiting_operator_review`. Inspected the one non-Phase-4C.1 row (`cmov9fs050000kz04070wi23k`, 2026-05-07 operator test draft, title `"Make changes to the website appearance"`, description `"Let's test this function"`, 0 messages, 0 attachments) and added it to `KNOWN_OPERATOR_TEST_DRAFTS`.
2. Dry-run: `node scripts/lux-close-phase4c1-smoke-tickets.mjs --output=.lux-verify/cleanup-dryrun.json` → `would_close=18, already_closed=0, refused=0, not_found=0`. Snapshot saved.
3. Execute: `node scripts/lux-close-phase4c1-smoke-tickets.mjs --execute --output=.lux-verify/cleanup-execute.json` → `closed=18, already_closed=0, refused=0`. Snapshot saved.
4. Re-audit: `node scripts/lux-queue-audit.mjs --output=.lux-verify/queue-audit-after.json` and `--include-closed --output=.lux-verify/queue-audit-after-with-closed.json`.

### Before counts (operator desk default view)

| Bucket | Count |
|---|---|
| Programme | 1 |
| Active client | 1 |
| Property & media | 4 (sprint children C1–C4) |
| CRM / leads | 0 |
| Internal | 0 |
| Smoke / archive | 18 |

### After counts (operator desk default view)

| Bucket | Count |
|---|---|
| Programme | 1 |
| Active client | 1 |
| Property & media | 4 (sprint children C1–C4) |
| CRM / leads | 0 |
| Internal | 0 |
| Smoke / archive | **0** |

### Audit view (`--include-closed`) after cleanup

| Bucket | Count |
|---|---|
| Programme | 1 |
| Active client | 1 |
| Property & media | 4 |
| CRM / leads | 0 |
| Internal | 0 |
| Smoke / archive | 0 |
| **Archived / completed** | **32** (18 just-closed + 14 pre-existing closed historical rows) |

All 18 cleanup target ids are present in `archived_completed`; none leaked into `archived_smoke`; both protected ids are absent from the cleanup result set.

### Expectation note

The 2026-06-11 packet expected the post-cleanup operator desk to read `Property (0)`. The live count is `Property (4)` — that is the four sprint children C1–C4 from the LuxeMaurice Content Population Sprint (PR #345, `cmqa57uyt0…`, `cmqa57ve0…`, `cmqa57vlg…`, `cmqa57vsr…`). These are intentional active work, not cleanup leakage.

## Reversibility

This is a hard-close, not a delete. To re-open a row if the operator decides it was wrongly closed:

```
node scripts/cmp-ticket-set-stage.mjs <ticket_id> Intake
node scripts/cmp-ticket-set-status.mjs <ticket_id> Open
# then operator amends console_json.client_view.workflow_state manually if needed
```

No row’s `description`, `title`, or prior `messages[]` was modified. Attachments were untouched.

## Cross-references

- `lib/cmp/_lib/ticket-hard-close-core.js` — canonical hard-close console_json patch shared with `scripts/cmp-ticket-hard-close.mjs` and `lib/server/core-lux-ticket-migration-repair.js`.
- `lib/cmp/router.js#ticket-operator-queue` — server-side filter that drops `status='Closed'` rows from the default operator queue payload, so the bucket move is sufficient to hide them from `/change` without UI changes.
- `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` § 8a — operator desk post-cleanup state and link back to this runbook.
- `docs/LUX/LUX_DELIVERY_PROGRAMME.md` — Phase 2 note.

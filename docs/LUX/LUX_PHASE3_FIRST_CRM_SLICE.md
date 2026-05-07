# LuxeMaurice — Phase 3 first CRM / operator workflow slice

**Programme ticket (remain open):** `cmo8mjijk0000jl04l1jz0v6d`  
**Tenant:** `luxe-maurice` only (operator PATCH + `/change` CRM panel).  
**Scope:** Minimal operational CRM — stages, internal notes, follow-up text on existing concierge leads. **No** assignment, SLA, reporting, external CRM, marketing automation, or AI.

## Implementation (repo)

| Area | Detail |
|------|--------|
| Persistence | `leads.qualification_json.lux_operator_workflow` — `stage`, `stage_updated_at`, `internal_notes[]` (`at`, `text`), `follow_up_status` |
| Stages | `new`, `qualified`, `viewing_requested`, `follow_up`, `closed`, `lost` |
| Operator API | `POST /api/cmp/router?action=concierge-lead-operator-patch` — dormant gate + LuxeMaurice tenant session + lux host context |
| List API | `concierge-leads-list` adds `updated_at` and `operator_workflow` (Lux host only) |
| Create | `concierge-lead-create` seeds `lux_operator_workflow` for new `luxe-maurice` leads |
| UI | `pages/change.js` — Lux tenant session only: lead selection, stage, follow-up, append-only notes |
| Tests | `node-tests/lux-lead-operator-workflow.test.mjs`, `lib/cmp/_lib/lux-lead-operator-workflow.js` |

## Client visibility

- `/concierge` does **not** fetch operator workflow or internal notes.
- `concierge-lead-create` response does **not** include `qualification_json`.

## Production verification (recorded 2026-05-07)

**Ticket `cmo8mjijk0000jl04l1jz0v6d`:** **open** — Phase 3 first CRM slice shipped; **not** closed on this record. Optional: paste this subsection into the ticket description (operator).

**Merged to main:** PR https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/143 — squash commit `74b8b6a42197b5df277c26f8f252997892d4dcc8`.

**GitHub Production deployment:** id `4602574610` → SHA `74b8b6a42197b5df277c26f8f252997892d4dcc8` (match Vercel Production **Ready** for that commit).

### Automated / API checks (production)

| Check | Result |
|-------|--------|
| `POST …/concierge-lead-operator-patch` **without** tenant session cookie | **403** — dormant gate / auth |
| `GET https://lux.corpflowai.com/concierge` HTML contains `lux_operator_workflow` / `internal_notes` / `concierge-lead-operator-patch` | **No** (all false) |
| `POST concierge-lead-create` (general enquiry) then `GET concierge-leads-list` on `lux.corpflowai.com` | New lead `cmouqn8ao0000ju04qn75vpzc` has `operator_workflow.stage` = **`new`**, `stage_label` = **New** |

### Manual (operator browser) — stage / note / follow-up persistence

**Not executed in CI** (requires Lux tenant operator cookie). Operators should:

1. Log in at `https://lux.corpflowai.com/change`.  
2. Select a lead → **Qualified**, internal note, follow-up text → **Save** → **Refresh** → confirm all three persist in UI and in `concierge-leads-list` JSON (`stage`, `latest_note`, `follow_up_status`).

### Other tenants

- CRM PATCH handler returns **403** unless scope is tenant **`luxe-maurice`** with Lux host context; non-Lux `/change` UX unchanged aside from standard lead list fields.

### Other tenants

- Non–`luxe-maurice` `/change` sessions: lead list **without** CRM panel / `operator_workflow` in API for non-Lux host scope (unchanged UX for other tenants).

---

**Phase 3 demo safe:** Yes — demo copy only; no ticket closure; no client-facing leak of internal notes when using shipping routes as designed.

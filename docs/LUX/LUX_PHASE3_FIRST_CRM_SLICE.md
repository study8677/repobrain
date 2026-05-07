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

## Production verification (recorded)

**Ticket:** Programme umbrella stays **open**; append this block to the CMP ticket description **optionally** (operator paste).

**Merged to main:** (filled after deploy — see PR).  
**GitHub Production deployment:** (id + SHA — correlate with Vercel Production Ready).

### Automated / API checks

- New Lux lead via `concierge-lead-create` → list shows `operator_workflow.stage === 'new'` when queried with appropriate host context.
- `concierge-lead-operator-patch` without valid tenant session → **403** (Dormant Gate / scope).
- Public concierge HTML → must **not** contain `lux_operator_workflow`, `internal_notes`, or `concierge-lead-operator-patch` payloads.

### Manual (operator browser)

1. Log in at `https://lux.corpflowai.com/change` as Lux tenant operator.  
2. Open a lead → set stage **Qualified**, add internal note, set follow-up status → **Save** → **Refresh** → confirm persistence.  
3. Submit a new lead from `/concierge` → confirm defaults to **New** in `/change`.  

### Other tenants

- Non–`luxe-maurice` `/change` sessions: lead list **without** CRM panel / `operator_workflow` in API for non-Lux host scope (unchanged UX for other tenants).

---

**Phase 3 demo safe:** Yes — demo copy only; no ticket closure; no client-facing leak of internal notes when using shipping routes as designed.

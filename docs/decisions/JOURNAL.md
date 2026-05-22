# Decision journal (append-only)

**Purpose:** Capture **every material decision** as we go—yours, mine (assistant), and the team’s—so we can **audit and backtrack** quickly if something goes wrong. This is a **running log**, not a substitute for ADR-lite files for big boundaries (those stay as `YYYYMMDD-topic.md` and get a one-line pointer here).

**Rules**

1. **Append only** — never delete or rewrite past entries; if we reverse course, add a **new** entry that references the old one (`Supersedes: JE-…`).
2. **Immediate** — log the decision in the same push or the next push when the work lands (same day when possible).
3. **IDs** — each entry gets `JE-YYYY-MM-DD-n` (n = sequence that day) for easy reference in commits and incidents.
4. **Who** — `Anton` | `Assistant (Cursor)` | `Team` | `Vendor` with name if relevant.
5. **Reversibility** — one line: how to undo (env var, revert commit SHA, GitHub toggle).

**How assistants use this file:** After substantive choices in chat or in code, **add a journal row** (and an ADR when the decision changes trust, tenancy, or security).

---

| ID | Date (UTC) | Who | Decision | Reversibility |
|----|------------|-----|----------|----------------|
| JE-2026-04-10-1 | 2026-04-10 | Anton | LUXE autonomy pilot uses tenant **`luxe-maurice`** only; auto-merge to **`main`** allowed only under **strict rules** in `docs/decisions/20260410-luxe-autopilot-pilot-scope.md`. | Widen scope: new ADR + journal row; disable auto-merge in GitHub rules. |
| JE-2026-04-10-2 | 2026-04-10 | Anton | **Document all decisions immediately** (including assistant decisions); prefer **maximum autonomous execution** at **zero additional vendor cost** where possible. | Stop journaling: remove process from `docs/decisions/README.md` (not recommended). |
| JE-2026-04-10-3 | 2026-04-10 | Assistant (Cursor) | Maintain this **`JOURNAL.md`** as the live append-only log; keep ADR-lite files for heavy boundaries. | Delete or archive file; restore from git. |
| JE-2026-04-10-4 | 2026-04-10 | Assistant (Cursor) | **`CMP_MONITOR_TICKET_IDS` empty** ⇒ cron **`/api/cron/cmp-monitor`** monitors **no** tickets (removed hardcoded default IDs that pointed at **closed** tickets). Operators must set env for LUXE pilot tickets. | Set `CMP_MONITOR_TICKET_IDS` in Vercel; or revert `lib/server/cmp-monitor-cron.js` default block via git. |
| JE-2026-04-10-5 | 2026-04-10 | Assistant (Cursor) | Add **`docs/operations/LUXE_AUTONOMY_PILOT_RUNBOOK.md`** for zero-cost ops steps (env lists, GitHub merge rules, kill switch). | Remove file; runbook is non-executable. |
| JE-2026-04-10-6 | 2026-04-10 | Assistant (Cursor) | Wire **`docs/CORPFLOW_SHARED_TODO.md`** to require **`docs/decisions/JOURNAL.md`** for ongoing decisions; update **`artifacts/chat_history.md`** milestone line; extend ADR links to journal + runbook. | Revert those doc edits via git. |
| JE-2026-04-10-7 | 2026-04-10 | Anton + Assistant (Cursor) | **Communication:** Anton is **not a programmer**; assistants must lead with **plain English**, acknowledge that, and put **`POST /api/...` / JSON / curl** only in a **Technical handoff** section after outcomes. Codified in **`.cursor/rules/pm-first-communication.mdc`**. | Revert or edit that rule file. |
| JE-2026-04-10-8 | 2026-04-10 | Assistant (Cursor) | **Brownfield Luxe host:** Prefer **`npm run factory:link-lux-hostname`** (`scripts/factory-upsert-hostname-map.mjs`) over **`admin_onboarding.html`** for **`lux.corpflowai.com` → `luxe-maurice`** — idempotent factory upsert, documented in **`docs/operations/TENANT_CLIENT_LOGIN.md`**. | Remove script; or delete `tenant_hostnames` row for that host via DB admin. |
| JE-2026-04-10-9 | 2026-04-10 | Assistant (Cursor) | **Change Console / tenant:** Completion scorecard now counts **`Intended outcomes`** bullets in the **ticket description** (same rules as factory), not only structured brief; **Refine the request** chat enabled for **tenant** sessions (server already allowed). | Revert **`public/change.html`** hunk. |
| JE-2026-04-10-10 | 2026-04-10 | Assistant (Cursor) | **Change Console UX:** Tenant **“Work in progress”** fog/timer only after **build approved**; **Refine the request** block always visible for logged-in tenants + wired to **`change-chat`**; **Refresh from server** button under Ticket ID; pre-approval scorecard titled **Checklist** not “In progress”. | Revert **`public/change.html`**. |
| JE-2026-04-10-11 | 2026-04-10 | Assistant (Cursor) | **Dev/staging billing:** Env **`CORPFLOW_BILLING_EXEMPT_ALL`** (`true`/`1`/`yes`) ORs **every** tenant as billing-exempt in **`getTenantWalletSnapshot`** (skips approve-build token gate + debit). **`CORPFLOW_BILLING_EXEMPT_TENANT_IDS`** unchanged for per-tenant override. | Unset env; revert **`lib/factory/costing.js`**, **`lib/server/billing-exempt.js`**. |
| JE-2026-04-10-12 | 2026-04-10 | Anton + Assistant (Cursor) | **Supersedes JE-2026-04-10-11:** Remove **`CORPFLOW_BILLING_EXEMPT_ALL`** (no global exempt-all). Prefer per-tenant DB **`billing_exempt`**; add **`scripts/set-luxe-maurice-billing-exempt.mjs`** for **`luxe-maurice`**. | Restore JE-2026-04-10-11 code path if ever needed. |
| JE-2026-04-10-13 | 2026-04-10 | Assistant (Cursor) | **Git:** Delete stray tracked root file **`main`** (empty) that caused **`ambiguous argument 'main'`**; document in **`docs/operations/GIT_AND_MAIN_BRANCH.md`** + checklist in **`docs/CORPFLOW_SHARED_TODO.md`**. No GitHub/Vercel permission impact. | Re-add root file `main` (not recommended). |
| JE-2026-04-10-14 | 2026-04-10 | Assistant (Cursor) | **CMP sandbox → client clarity:** **`cmp-branch.yml`** now merges **base → sandbox** and **dispatches** **Agent CI** + **Vercel env check** on **`cmp/<ticket>`** (fixes missing PR checks when `GITHUB_TOKEN` recursion suppresses them). **`public/change.html`** tenant **Build status** + **Automation** explain PR vs **lux** homepage, empty PR, deploy lag; **`docs/operations/CMP_CLIENT_VISIBILITY_AFTER_APPROVE.md`**. | Revert workflow + **`public/change.html`** hunk; delete doc. |
| JE-2026-04-10-15 | 2026-04-10 | Anton + Assistant (Cursor) | **No empty CMP merge:** **`.github/workflows/cmp-pr-delivery-gate.yml`** fails **`cmp/*` → `main`** PRs with **zero** `pulls/listFiles` entries (drafts skipped). Ops: add **`cmp-delivery-files`** as required check on **`main`**. Doc **`docs/operations/CMP_PR_DELIVERY_GATE.md`**. | Remove workflow; drop required check. |
| JE-2026-05-22-1 | 2026-05-22 | Anton + Assistant (Cursor) | **CorpFlowAI Communications v1 — email is a sanctioned channel.** n8n + Gmail OAuth is operational for `password_reset` from `support@corpflowai.com`. All outbound email goes through one disciplined path: typed event → register row → optional human approval → n8n delivery → evidence. Canonical doc **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`** freezes the 8 event types, 4 sender aliases, approval policy (system-transactional auto / client-facing approve / operator-only auto), and the planned `lib/server/communications.js` API for Phase 2. Trackers are external **`34_Communication_Event_Register`** + **`37_Communication_Review_Dashboard`** — **never** `02_Drive_Migration_Manifest`. PR #211 (docs-only). Pointers added in `AGENTS.md`, `docs/CORPFLOW_SHARED_TODO.md`, `docs/runbooks/SECURITY_OR_INCIDENT.md`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md`, `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`, `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`, `docs/n8n/password-reset-email-recipe.md`. | Revert the doc PR; remove the cross-links. No code path is gated by these docs (Phase 1 is doc-only). |

---

### Entry template (copy row above the next blank)

```
| JE-YYYY-MM-DD-n | YYYY-MM-DD | Who | One sentence. Link ADR/path if any. | How to undo. |
```

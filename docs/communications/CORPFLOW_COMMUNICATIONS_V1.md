# CorpFlowAI Communications v1 (outbound email)

**Status:** Phase 1 documentation. One transactional event is live (`password_reset`); all others are **defined here** so future automation/operator surfaces use the same names, sender policy, and evidence trail. No new code in Phase 1.

**Why this doc exists.** Random pages in the app must not be allowed to call Gmail directly. Every outbound message goes through one disciplined path: **CorpFlow event → communication register → optional human approval → n8n email delivery → evidence logged**. That keeps trust boundaries clear, prevents accidental client-facing emails, and gives operators an audit trail.

---

## 1) What is operational today (2026-05-22)

- **n8n is connected to Google Workspace** via OAuth (single credential covering the CorpFlowAI Google account).
- **Four Google aliases** are configured on the underlying mailbox and verified for "Send mail as":
  - `support@corpflowai.com`
  - `info@corpflowai.com`
  - `sales@corpflowai.com`
  - `help@corpflowai.com`
- **One transactional event is live end-to-end:** `password_reset` from `support@corpflowai.com` — see `docs/n8n/password-reset-email-recipe.md` for the wire-level recipe.
- **Server-side helper:** `lib/server/email-delivery.js` (`sendN8nTransactionalEmail()`, `n8nEmailDeliveryDiagnostics()`).
- **Health reporting:** `GET /api/factory/health` exposes `password_reset_delivery_configured: true` when the n8n webhook + secret + `EMAIL_FROM` are all present.

Anything not in the list above is **not in production yet**.

---

## 2) Trust boundary — non-negotiable

1. **Server only.** `lib/server/email-delivery.js` is server-side. The browser never sees the n8n URL or shared secret. Any future "send" capability lives behind an authenticated API route (factory master, tenant sovereign session, or system cron with `CORPFLOW_CRON_SECRET`) — never a public form post.
2. **No freeform email.** The helper does not accept arbitrary `to` / `subject` / `body` for arbitrary callers. Every send goes through a **typed event** with a known payload schema (see §5).
3. **One shared secret.** `N8N_EMAIL_WEBHOOK_SECRET` travels as the `x-corpflow-email-secret` header. The n8n Webhook node validates it on the **first** node before any side effects (see recipe §1). Mismatch ⇒ HTTP 401, no Gmail node fires.
4. **Secret source of truth.** Infisical holds the values; Vercel receives them via the existing sync/redeploy path. Secrets are not pasted into chat, tickets, `artifacts/`, or git.
5. **Logging discipline.** Never log: reset tokens, account-invitation tokens, full email bodies, `Authorization`/`x-corpflow-email-secret` headers. Logging the event **kind**, **HTTP status**, and **n8n execution URL** is fine and encouraged.

---

## 3) Architecture (Phase 1 + Phase 2)

```
+--------------------+        +---------------------+        +----------------+
|  CorpFlow event    |        |  Communication      |        |  Optional      |
|  (server-side      | -----> |  Event Register     | <----- |  human         |
|  trigger)          |        |  (status, channel,  |        |  approval      |
|                    |        |   evidence)         |        |  (operator)    |
+--------------------+        +---------------------+        +----------------+
                                        |
                                        v
                              +---------------------+        +----------------+
                              |  n8n Webhook        |        |  Gmail node    |
                              |  (shared secret     | -----> |  (Send mail as |
                              |   gate)             |        |   alias)       |
                              +---------------------+        +----------------+
                                        |
                                        v
                              +---------------------+
                              |  Evidence written   |
                              |  back to register   |
                              |  + automation_events|
                              +---------------------+
```

**Phase 1 reality:** `password_reset` runs the path `event → server-side trigger → n8n webhook → Gmail → response`. The register/dashboard rows for it are currently **implicit** in `recovery_vault_entries` + `automation_events` rows + the n8n execution URL. Phase 2 brings the explicit register/dashboard online.

---

## 4) Event catalog (Phase 1 names — freeze)

Use exactly these strings when adding new events. Pick the **kind** (system-transactional vs client-facing) carefully; it determines whether human approval is required.

| Event type | Live? | Kind | Default sender alias | Triggered by | Approval rule |
|---|---|---|---|---|---|
| `password_reset` | ✅ live | system-transactional | `support@corpflowai.com` | `POST /api/auth/password-reset/request` | Auto-send. Server returns the same body regardless of email existence; no client-facing UI exposes the token. |
| `account_invitation` | planned | client-facing | `support@corpflowai.com` | operator creates a new tenant user | **Operator must approve** the message body before send. |
| `estimate_ready` | planned | client-facing | `support@corpflowai.com` | CMP transitions a ticket to `Estimate` with a costing JSON ready | **Operator must approve.** Email body must link back to `/change?ticket=<id>` and **must not** include internal costing breakdowns — only "your estimate is ready, open Change Console to review." |
| `clarification_required` | planned | client-facing | `support@corpflowai.com` | CMP `ai-interview` reaches `needs_clarification` and operator chooses email follow-up | **Operator must approve.** |
| `delivery_ready` | planned | client-facing | `support@corpflowai.com` | CMP ticket reaches `Closed` with a live production URL | **Operator must approve.** Body links to the changed surface; no internal commit SHAs. |
| `ticket_closed` | planned | client-facing | `support@corpflowai.com` | CMP ticket closes (no preview link needed) | **Operator must approve.** |
| `concierge_lead_received` | planned | operator-only (internal) | `sales@corpflowai.com` | `/api/main` lead intake on any tenant marketing surface | Auto-send (operators only). Never goes to the lead's address — only to the configured internal recipient list. |
| `operator_escalation` | planned | operator-only (internal) | `support@corpflowai.com` | `lib/cmp/_lib/cmp-operator-escalation.js` decides a ticket needs human help | Auto-send (operators only). |

**Kind decoded.**
- **system-transactional** — recipient explicitly asked for it (password reset) or it's a security/access notice that must be immediate. Auto-send is OK.
- **client-facing** — the recipient may not be expecting it. **Operator must approve** before send. Phase 1 keeps these as `Draft / Not Sent` until the Phase 2 approval surface lands.
- **operator-only** — never reaches a client mailbox. Internal routing. Auto-send is OK.

---

## 5) Sender alias policy

| Alias | Used for |
|---|---|
| `support@corpflowai.com` | `password_reset`, `account_invitation`, ticket lifecycle (`estimate_ready`, `clarification_required`, `delivery_ready`, `ticket_closed`), `operator_escalation` |
| `info@corpflowai.com` | General notifications (newsletters, status updates) — **no Phase 1 events use this yet** |
| `sales@corpflowai.com` | `concierge_lead_received` and future lead/sales follow-up |
| `help@corpflowai.com` | Helpdesk-style support replies — **no Phase 1 events use this yet** |

The Gmail node enforces the actual `From` based on the verified alias; `EMAIL_FROM` in env is a **hint** to the workflow, not a security boundary. To change the alias for an event type: update the **n8n workflow's Set node**, not the CorpFlow payload — the schema lets the workflow pick.

---

## 6) Approval policy summary

| Scenario | Approval before send |
|---|---|
| `password_reset` (recipient explicitly asked) | None — auto-send. |
| Internal-only routing (`concierge_lead_received`, `operator_escalation`) | None — auto-send. |
| Any client-facing event in §4 | **Yes.** Phase 1: row in the Communication Event Register with `Status = Draft / Not Sent`. Phase 2: operator approves from the Review Dashboard, which flips status to `Sent` and triggers the n8n call. |
| "Manual" one-off email to a client | Never via this system. Operator uses their own mailbox. The disciplined path is for **system-originated** comms only. |

---

## 7) Evidence + audit trail

For every send (live and planned), the system must produce **two** durable records.

### 7a) Postgres `automation_events`

Schema (existing — see `lib/server/postgres-ensure-schema-statements.js`). Use:
- `event_type`: `comms.email.<event_type>.requested` and `comms.email.<event_type>.delivered` (or `.failed`).
- `payload_json`: **redacted** — never includes tokens, reset codes, full email bodies, or the webhook secret. Safe fields: `event_type`, `kind`, `sender_alias`, `tenant_id`, `to_hash` (sha256 of recipient, not the address), `n8n_status`, `n8n_execution_url` (when n8n returns one).
- `idempotency_key`: `comms:<event_type>:<tenant_id>:<source_id>:<hour_bucket>` — protects against repeated triggers from the same workflow run.

### 7b) Communication Event Register (external — Apps Script / Google Sheet)

The register row should carry:

| Column | Notes |
|---|---|
| `event_id` | UUID generated server-side. |
| `event_type` | One of §4. |
| `channel` | `Email` for now. Reserved: `SMS`, `WhatsApp`, `InApp`. |
| `tenant_id` | Workspace id (`luxe-maurice`, `corpflowai`, …). Never empty. |
| `recipient` | Email address. Mask in any client-readable view. |
| `sender_alias` | One of §5. |
| `status` | `Draft / Not Sent` → (`Pending Approval` →) `Sent` → optional `Failed` / `Bounced`. |
| `evidence_url` / `source_url` | n8n execution URL when available; otherwise `automation_events` row id. |
| `approved_by` | Operator username if approval was required. Blank for system-transactional. |
| `created_at` / `sent_at` | Timestamps. |

### 7c) What this register **is not**

It is **not** `02_Drive_Migration_Manifest`. That manifest tracks Drive file movement; mixing comms tracking into it would corrupt both surfaces and break operator workflows. If any Apps Script or doc currently sends communication events to the Drive manifest, that is a **defect** — route them to the register instead.

The canonical trackers for comms are:
- `34_Communication_Event_Register` — one row per event.
- `37_Communication_Review_Dashboard` — operator surface listing events pending approval, recent sends, and failures.

If references to "interactions spreadsheet" exist anywhere, they align with the register/dashboard above, **not** with the Drive manifest.

---

## 8) Planned server API (`lib/server/communications.js`) — design only

Phase 1 does **not** add this file. The shape below freezes names and signatures for Phase 2.

```js
// lib/server/communications.js (planned — Phase 2)

/**
 * Persist a communication event in the register + automation_events.
 * Does NOT send; only records intent + status.
 *
 * @param {{
 *   event_type: 'password_reset' | 'account_invitation' | 'estimate_ready'
 *             | 'clarification_required' | 'delivery_ready' | 'ticket_closed'
 *             | 'concierge_lead_received' | 'operator_escalation',
 *   channel: 'email',
 *   tenant_id: string,
 *   recipient: string,
 *   sender_alias: 'support@corpflowai.com' | 'info@corpflowai.com'
 *               | 'sales@corpflowai.com' | 'help@corpflowai.com',
 *   payload: Record<string, unknown>,   // event-type-specific, schema-versioned
 *   source: { kind: 'ticket' | 'auth' | 'lead' | 'cron', id: string },
 *   requires_approval?: boolean,        // default derived from event_type kind
 * }} args
 * @returns {Promise<{ event_id: string, status: 'draft' | 'pending_approval' | 'auto_send' }>}
 */
export async function enqueueCommunicationEvent(args) { /* ... */ }

/**
 * Send a transactional event NOW via n8n. Internal callers only — use enqueue first.
 * Wraps lib/server/email-delivery.js#sendN8nTransactionalEmail.
 *
 * @param {string} event_id
 * @returns {Promise<{ ok: boolean, n8n_status: number | null, error_kind: string | null }>}
 */
export async function sendTransactionalEmailViaN8n(event_id) { /* ... */ }

/**
 * Update the register row + automation_events with delivery evidence.
 *
 * @param {string} event_id
 * @param {{ ok: boolean, n8n_status: number | null, n8n_execution_url?: string, error_kind?: string }} result
 * @returns {Promise<void>}
 */
export async function recordCommunicationEvidence(event_id, result) { /* ... */ }
```

**Why these three.** Splitting `enqueue` (intent) from `send` (effect) from `recordEvidence` (audit) lets a future approval surface sit between the first two without changing the callers. It also lets `password_reset` skip approval cleanly: enqueue with `requires_approval: false`, immediately `send`, immediately `recordEvidence`.

---

## 9) Phase 1 acceptance / Phase 2 roadmap

**Phase 1 (this doc — done when merged):**
- Canonical doc exists at `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
- `docs/n8n/password-reset-email-recipe.md` cross-links here.
- `docs/CORPFLOW_SHARED_TODO.md` and `AGENTS.md` point agents at this doc when they add outbound comms.
- The 8 event types and 4 sender aliases are frozen names.
- Operators know to use `34_Communication_Event_Register` / `37_Communication_Review_Dashboard`, **not** the Drive manifest.

**Phase 2 (separate PR, not yet scheduled):**
- Create `lib/server/communications.js` per §8.
- Wire `password_reset` through it (currently bypasses; same wire behavior, more evidence).
- Add the first **client-facing-with-approval** event: `estimate_ready`. Requires:
  - CMP transition hook (`lib/cmp/router.js`) calling `enqueueCommunicationEvent({ event_type: 'estimate_ready', requires_approval: true, ... })`.
  - Operator approval surface (smallest path: a CMP action `comms-approve` + a banner on `/change`).
  - Email body template that links to `/change?ticket=<id>` and includes **no** internal costing fields, **no** SHAs.
- Add `concierge_lead_received` (operator-only auto-send).
- Schema additions, if any, go through `scripts/apply-ensure-schema-build.mjs` (Neon-backed; see `docs/operations/POSTGRES_PROVIDER.md`).

**Phase 3 ideas (not committed):**
- Approval delegation per tenant.
- Channel expansion (`SMS`, `WhatsApp`, `InApp`).
- Bounce/complaint tracking via Resend webhooks if Resend becomes the primary path.

---

## 10) Related

- `docs/n8n/password-reset-email-recipe.md` — wire-level n8n recipe (the only Phase 1 live event).
- `lib/server/email-delivery.js` — current server-side helper (`sendN8nTransactionalEmail()`, `n8nEmailDeliveryDiagnostics()`).
- `lib/server/password-reset-delivery.js` — current Phase 1 caller; reference implementation for future events.
- `docs/operations/POSTGRES_PROVIDER.md` — Neon (where `automation_events` actually lives).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required when any new comms path lands.
- `.env.template` § Tenant password reset — current env vars (preferred + legacy names).

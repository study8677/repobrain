# AI Lead Rescue — Operator Runbook

Canonical runbook for CorpFlowAI operators handling **AI Lead Rescue** prospects and clients end-to-end without an external CRM. Pairs with `lib/cmp/_lib/ai-lead-rescue-operator.js` (logic + status model), the factory admin pages under `/admin/lead-rescue`, and the n8n forward recipe at `docs/n8n/automation-forward-recipe.md`.

## Purpose

AI Lead Rescue is a productised CorpFlowAI offer: connect a small business's existing lead source to a Google Sheet + Telegram alert + light follow-up board, then monitor for 7 days. This runbook is the **single source of truth** for how an operator works a lead from intake to monthly monitoring.

It is **not**:

- a full CRM,
- a client portal,
- a payment processor.

It is an operator cockpit on top of one Postgres database (`POSTGRES_URL`) and one production Next.js app.

## Access requirements — factory admin only

All `/admin/lead-rescue*` pages and `/api/factory/lead-rescue/*` endpoints are gated by `verifyFactoryMasterAuth` and `requireAdminPageSession`. Operators access via:

- **Browser:** factory admin login (the same login that grants the `/change` factory console). The admin page gate redirects unauthenticated visitors to `/login?next=/admin/lead-rescue`.
- **API (curl / scripts):** `MASTER_ADMIN_KEY` header — the existing factory master pattern. Do not introduce new secrets.

If you do not have factory admin access, you should not be working an AI Lead Rescue lead — escalate to the factory owner.

## Status pipeline (canonical)

Operators only ever move a lead between these states on the detail page:

```
NEW_INTAKE → QUALIFYING → DEMO_OFFERED → DEMO_BOOKED → QUOTE_SENT
            → PAYMENT_PENDING → PAID_SETUP → SETUP_IN_PROGRESS → LIVE_PILOT
            → MONITORING_OFFERED → MONTHLY_ACTIVE
LOST and PAUSED are terminal/holding states reachable from any prior step.
```

**Forward-only in the UI (PR #326):** the status dropdown on `/admin/lead-rescue/[id]` only offers the lead's saved status plus every status that appears after it in the canonical order above. Backwards moves are not selectable from the dropdown — this prevents accidental regressions and resolves the operator confusion that produced spurious 500-style error messages on backward clicks. The API layer remains permissive (raw `PATCH /api/factory/lead-rescue/patch` with any valid status still works), so factory master can correct a mis-set status by direct API call when genuinely needed. See `getAiLeadRescueForwardStatuses(currentStatus)` in `lib/cmp/_lib/ai-lead-rescue-operator.js`.

The setup checklist card on the detail page is only visible from `PAID_SETUP` onwards (5 statuses: `PAID_SETUP`, `SETUP_IN_PROGRESS`, `LIVE_PILOT`, `MONITORING_OFFERED`, `MONTHLY_ACTIVE`). Before payment, the card is hidden and the API returns `CHECKLIST_NOT_ELIGIBLE` on any attempt to patch it.

## How to review new intakes

1. Go to **`/admin/lead-rescue`**.
2. Sort by *Submitted date* (newest first) or filter `status = NEW_INTAKE`.
3. Open the lead row → `/admin/lead-rescue/[id]`.
4. Read the **Prospect** card:
   - Business name, contact name, email, phone / WhatsApp
   - Region (Mauritius / International / not selected)
   - Business type / niche (if provided)
   - Lead sources the prospect already has
   - Intake message (full text submitted via `/lead-rescue`)
   - Source page / host
5. If a lead is obviously spam or out of scope, move it directly to `LOST` with a note (e.g. "Spam form submission").
6. Otherwise, the SLA is **reply within 2 business hours** of intake (this is the line included in every notification).

## How to qualify a prospect

Move the status to **`QUALIFYING`** as soon as you take ownership.

Inside the **Status & operations** form on the detail page:

- **Status** — `QUALIFYING` (or further).
- **Next action** — short, action-oriented (e.g. "Call to confirm region + lead source").
- **Owner / operator** — your name or email. One operator at a time.
- **Last contacted** — set whenever you reach out (call, email, WhatsApp).
- **Notes** — free-form qualification notes (region clarified, current lead source, niche, budget signals).

Use the predefined statuses to track progress:

- `DEMO_OFFERED` — you offered a demo / discovery call.
- `DEMO_BOOKED` — they accepted and a slot is on the calendar.
- `QUOTE_SENT` — written quote with setup price + monthly monitoring price has been delivered.
- `PAYMENT_PENDING` — quote accepted, awaiting payment.
- `PAID_SETUP` — payment confirmed; the setup checklist appears below.

If the prospect goes cold or declines, move to `LOST` (lost the deal) or `PAUSED` (revisit later). Always record why in *Notes*.

## How to update commercial / payment tracking fields

The **Commercial** card on the detail page records what was quoted and what was paid. These are **tracking fields only** — CorpFlowAI never processes a card or bank transfer inside this system.

Operator-editable fields:

- **Setup price** — numeric.
- **Monthly monitoring price** — numeric.
- **Currency** — short code, e.g. `MUR`, `USD`, `EUR`.
- **Payment route** — free-text label of how the client paid you (e.g. "Bank transfer to MCB", "Wise EUR account", "Stripe link via concierge").
- **Payment status** — short label (e.g. `none`, `quoted`, `pending`, `paid`, `refunded`).
- **Invoice / reference** — invoice number or external reference (FreshBooks, Stripe payment intent ID, etc.). **The ID only — never the card or bank credentials.**
- **Payment notes** — context (e.g. "Invoice issued via FreshBooks; client confirmed transfer scheduled 2025-05-22").

### Payment tracking only — no payment processing

This system **does not** and **must not**:

- store card numbers, CVV, expiry, billing addresses linked to a card,
- store full bank account numbers (IBAN, SWIFT, routing + account) of clients or operators,
- store payment processor credentials, API keys, or login passwords,
- attempt to charge a card or pull funds from a bank.

All real money movement happens **outside** this app, through whatever provider you and the client already use (bank transfer, Wise, FreshBooks, Stripe link, cash on delivery, etc.). The Commercial card is a **ledger note**, not a payment terminal.

## How the internal notification event works

When a new `/lead-rescue` form submission arrives and `meta.product === 'ai-lead-rescue'`, the public intake handler (`lib/server/tenant-intake.js`) emits **two** automation events into Postgres:

1. The generic `tenant.lead.captured` event (existing pattern).
2. The AI-Lead-Rescue-specific event:
   - **`event_type`**: `corpflow.lead_rescue.intake_received`
   - **idempotency key**: `lead-rescue:intake:<lead_id>` (so retries never double-notify)
   - **source**: `tenant_intake`
   - **payload** includes:
     - `lead_id`, `tenant_id`, `submitted_at`
     - `prospect.*` (business, contact, email, phone, region path, lead sources, preferred payment path)
     - `admin_detail_url` — absolute URL to `/admin/lead-rescue/<lead_id>` (resolved from `CORPFLOW_PUBLIC_BASE_URL` when set; otherwise the request host; otherwise relative path)
     - `notification_text` — pre-formatted, multi-line text block ready to forward verbatim to a human channel

If `CORPFLOW_AUTOMATION_FORWARD_URL` is configured, the row is also forwarded to n8n via the standard envelope.

### n8n branch — `corpflow.lead_rescue.intake_received`

See `docs/n8n/automation-forward-recipe.md` § 1. The recipe instructs:

- IF node on `body.event_type === 'corpflow.lead_rescue.intake_received'`
- Pipe `body.payload.notification_text` directly into Telegram / email / Slack (no further templating required)
- Use `body.payload.admin_detail_url` as the link target in the alert
- Honour the idempotency key `lead-rescue:intake:<lead_id>` if your downstream supports it (so retried forwards do not double-alert)
- Structured fields under `body.payload.prospect.*` are also available for a spreadsheet / CRM mirror row if you want one

The SLA inside `notification_text` is **"Review and reply within 2 business hours."** — keep this consistent with the runbook.

## How to use the setup checklist

The **Setup checklist** card appears on `/admin/lead-rescue/[id]` once the lead status is one of `PAID_SETUP`, `SETUP_IN_PROGRESS`, `LIVE_PILOT`, `MONITORING_OFFERED`, `MONTHLY_ACTIVE`.

Each row has:

- a state — `pending`, `in_progress`, `done`, or `skipped`,
- an optional note (what was done, links, follow-up needed),
- inline completion metadata: timestamp + actor label.

Each row saves independently via the existing factory PATCH route — there is no separate "save all". Use `skipped` only when the item does not apply to this client (e.g. they already have a sheet you are reusing). The header reads **`X/13 complete`**; `done` and `skipped` both count as resolved.

### 13-item setup checklist (v1, canonical order)

| # | Item | Item key | What "done" means |
|---|------|----------|--------------------|
| 1 | Intake reviewed | `intake_reviewed` | Intake message read; business, contact, region, and lead sources verified. |
| 2 | Payment / invoice confirmed | `payment_invoice_confirmed` | Setup payment received; invoice reference recorded in Commercial card. |
| 3 | Lead source selected | `lead_source_selected` | One source picked (form / email / WhatsApp / Google Form) — the one the client already uses. |
| 4 | Google Sheet created | `google_sheet_created` | Lead log sheet created with columns: date, name, contact, source, status; shared with client. |
| 5 | Telegram destination confirmed | `telegram_destination_confirmed` | Operator / owner Telegram channel confirmed as the alert destination. |
| 6 | Test lead submitted | `test_lead_submitted` | A real-looking enquiry submitted end-to-end. |
| 7 | Alert received | `alert_received` | The test enquiry triggered the configured Telegram / owner alert. |
| 8 | Lead appears in sheet | `lead_appears_in_sheet` | The test enquiry landed in the Google Sheet with every expected column. |
| 9 | Follow-up status board created | `follow_up_board_created` | New / Replied / Booked / Won / Lost board for the owner. |
| 10 | Daily summary configured | `daily_summary_configured` | Channel (email / WhatsApp), time zone, and recipient confirmed. |
| 11 | Client hand-over message sent | `client_handover_sent` | Plain-language note: what was set up, what to expect, who to contact. |
| 12 | 7-day monitoring started | `monitoring_7_day_started` | CorpFlow watches alerts + sheet daily for the pilot window. |
| 13 | Monthly monitoring offered | `monthly_monitoring_offered` | Offer made for the post-pilot monthly monitoring tier. |

The canonical order is locked in by an assertion in `node-tests/ai-lead-rescue-operator.test.mjs`. If you need to add or rename an item, update the v1 list in `lib/cmp/_lib/ai-lead-rescue-operator.js`, update the test, update this table, and bump the checklist `version` if the change is breaking.

## What not to store

The notes, payment-notes, and intake-message fields are jsonb / free-text and are **operator-visible**. Treat them as you would any internal CRM note, and **never** paste any of the following into any field:

- **No card details** — PAN, CVV, expiry, cardholder name + last 4, magstripe/track data.
- **No bank credentials** — full account + routing/IBAN/SWIFT pairs of the client or the operator, online banking passwords, OTPs.
- **No passwords** — Google Workspace, Telegram, FreshBooks, Stripe, hosting, anything. Use the client's own password manager + sharing, never our database.
- **No private medical / clinical / health details** — even if the prospect is in a medical niche, keep notes about the *business* (size, niche, lead source), not about identifiable patients.

If a client sends one of these by mistake (e.g. pastes a card into a WhatsApp screenshot), **redact before recording** and tell them to use a payment provider directly.

## Troubleshooting — admin list will not load

If `/admin/lead-rescue` shows a permanent `Loading…` or an error banner, work through the following in order. The page is intentionally robust against this failure: the table is SSR-pre-populated, the client adds a 25 s timeout on the refresh fetch, and any failure surfaces an explicit error envelope with HTTP status + retry — so an operator should never be stuck on an unactionable spinner.

1. **Read the error banner.** It surfaces the HTTP status (e.g. `HTTP 500`), the error code (e.g. `LEAD_RESCUE_LIST_FAILED`), and a human-readable message. Press **Retry** first.
2. **Open raw API.** The banner also exposes a `Open raw API` link to `/api/factory/lead-rescue/list?…`. Open it in a new tab while authenticated as factory admin:
   - **`{ ok: true, leads: [...] }`** — the API is healthy; the issue was a transient cold start. Reload the page.
   - **`{ ok: false, error: "LEAD_RESCUE_LIST_FAILED", message: "..." }`** — DB call failed. Inspect `message` (typically a Prisma / connection error); confirm `POSTGRES_URL` in Vercel and Neon availability.
   - **`{ ok: false, error: "FACTORY_AUTH_REQUIRED" }`** — the admin session expired between SSR and the client fetch. Reload after re-authenticating.
3. **Confirm a recent intake actually persisted.** From psql or Neon SQL Editor:

   ```sql
   SELECT id, tenant_id, email, status, created_at
   FROM leads
   WHERE qualification_json -> 'intake_meta' ->> 'product' = 'ai-lead-rescue'
   ORDER BY created_at DESC
   LIMIT 20;
   ```

   If the intake does not appear, the issue is upstream of the operator cockpit (tenant intake / host context); follow `docs/operations/TENANT_CLIENT_LOGIN.md` to confirm the submitting host resolves to a registered tenant.
4. **Confirm the deployment includes the SSR fallback.** `view-source:` on the page should contain the SSR-rendered `<tr>` rows for current leads or the SSR-rendered error envelope. If you see *only* `Loading…` in the raw HTML, the deployment predates the SSR fallback fix — redeploy / verify the deployed commit on Vercel Production.

## Troubleshooting — clicking Save produces no visible reaction

The live operator surface no longer carries a diagnostic panel. With the root cause from PR #327 resolved (engine-stays-warm across requests), saves are expected to succeed transparently. If clicking **Save** ever produces no visible reaction again ("Saving…" / "Saved." / inline error all absent), the failure surface is somewhere upstream of the API and the page is most likely no longer hydrating. Work the checklist below:

1. **Inline error block.** The detail page renders any save failure as a red error block *next to* the Save button (not just at the top), with the API error code and HTTP status. If you see no block AND no `Saved.` pill after pressing Save, React event handlers may not be attached.
2. **DevTools → Console.** A red hydration / runtime error is the most likely culprit. The historical surfaces of this class of bug, recorded below in this runbook, were (a) Next.js 16 + Turbopack `_clientMiddlewareManifest.js` 404 (PR #323) and (b) a locale-sensitive `toLocaleString()` SSR/CSR mismatch (PR #321). Both are now structurally prevented — Webpack is used for the build, and timestamps render through `fmtDateStableUtc`.
3. **Raw API probe.** While authenticated as factory master, run this from DevTools to bypass all UI wiring and confirm the API is reachable:

   ```js
   fetch('/api/factory/lead-rescue/patch', {
     method: 'PATCH',
     credentials: 'include',
     headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
     body: JSON.stringify({
       id: '<the lead id from the URL>',
       next_action: 'runbook probe ' + new Date().toISOString(),
     }),
   }).then(r => r.json().then(j => ({ status: r.status, body: j }))).then(console.log);
   ```

   - HTTP 200 with `{ ok: true, lead: { … } }` → the API is fine; the bug is in the UI (look at the deployed commit + clear browser cache).
   - HTTP 500 with `LEAD_RESCUE_PATCH_FAILED` → see *Troubleshooting — Prisma engine cold-start* below.
   - HTTP 403 with `FACTORY_AUTH_REQUIRED` → the factory master session has expired; sign back in.
4. **Deployed-commit check.** Vercel → Deployments → Production → confirm the Ready deployment's commit matches `main`. PRs #319 – #327 fixed several latent issues; running against an older Production build can resurrect any of them.

If you need temporary in-page diagnostics again for a future investigation, *do not* re-introduce them inline on `components/AiLeadRescueAdminDetail.js`. Add them on a separate `/admin/lead-rescue/[id]/__diagnostics` route gated behind a query-string flag, so the production surface stays clean. The cleanup rationale is captured in PR #328.

### Root cause found on 2026-06-06 — Turbopack `_clientMiddlewareManifest.js` 404 (PR #323)

The 2026-06-06 save-not-firing P0 was **NOT a React hydration mismatch** as initially hypothesised. It was a **Next.js 16 / Turbopack client-runtime bug** ([vercel/next.js#90381](https://github.com/vercel/next.js/issues/90381)) on dynamic routes.

The deployed Production browser was reporting in the Console (red error, x4):

```
Error: Failed to load client middleware manifest
  at p.getMiddleware (17.2d.q1r6ki9.js:1:12237)
  at U (0hov~lu_vgg.js:1:14681)
  ...
  at turbopack-17-zutaxm61.x.js:1
```

Turbopack-built bundles try to fetch `/_next/static/<buildId>/_clientMiddlewareManifest.js` unconditionally on dynamic routes even when the project has no `middleware.{js,ts}` file. The 404 cascades through `registerChunk` / module-evaluation, the page-specific chunk never finishes initialising, React never hydrates, no event listeners attach. From the operator's point of view: the page renders (because SSR HTML is fine), but every click on Save / Test click / a checkbox silently no-ops. The PR #320 diagnostic panel's `Save handler mounted: NO` line was the surface signal — the mount `useEffect` could not run because the JS that runs effects never finished loading.

PR #321's date-formatter fix was real and correct (the locale-sensitive `toLocaleString` IS a latent hydration risk) but it was not the active root cause. The Turbopack bug was preventing client JS execution before any hydration logic could run, so changes to component render code had zero observable effect.

The fix in **PR #323**:

- Switched `package.json` `build` and `vercel-build` scripts from `next build` (Turbopack default in Next 16) to `next build --webpack`. Webpack's manifest pipeline does not fabricate a phantom `_clientMiddlewareManifest.js` request when no middleware exists.
- Verified: Webpack-built `.next/static/<buildId>/` contains only `_buildManifest.js` and `_ssgManifest.js`. No phantom client-middleware-manifest fetch from the client runtime.
- The `--webpack` flag is a documented, supported Next.js 16 escape hatch. It will revert to Turbopack default once the upstream fix lands in a stable patch release.

The PR #321 deterministic UTC formatter and PR #320 diagnostic panel remain in place — they are still defensively correct (no locale-sensitive render output, and the operator can read live build provenance on the page).

### Second root cause found on 2026-06-07 — Prisma query engine binary missing from the Vercel function bundle

After PR #323 restored client-side React hydration (`Save handler mounted: YES` was finally green on the `save-wiring-v2` diagnostic panel and the panel reported the deployed commit `477bb8a2`), clicking Save surfaced the **next** failure underneath: a server 500 from PATCH with a Prisma-specific error message.

What the operator saw on the page (above the now-rendered 13-item checklist):

```
Could not load lead detail (HTTP 500) — LEAD_RESCUE_PATCH_FAILED
Invalid `prisma.lead.findUnique()` invocation:
Engine is not yet connected.
Backtrace [{ fn: "start_thread" }, { fn: "__clone" }]
```

Diagnostic signals captured at the time that ruled out earlier hypotheses:

- `https://core.corpflowai.com/api/factory/production-pulse/runtime` returned `core.database_reachable: true`. The drift fingerprint from `docs/operations/POSTGRES_PROVIDER.md` §4b (`database_reachable: false` + `db.prisma.io:5432` in the error body + Lux `tenant_id` fallback to `lux`) was **not** present.
- `https://lux.corpflowai.com/api/tenant/site` returned `tenant_id: luxe-maurice`, proving GET-path Prisma calls on the same function family could reach Neon.
- The `save-wiring-v2` diagnostic panel confirmed `Save handler mounted: YES` and the panel `Commit:` line matched the merge SHA of PR #323 — so the failure was on the server PATCH path, not in React hydration and not on a stale deploy.

The error wording (`Engine is not yet connected`) + Linux thread-spawn backtrace (`start_thread`, `__clone`) + the recent Turbopack→Webpack switch is the documented signature of Vercel's serverless function tracer omitting `libquery_engine-rhel-openssl-3.0.x.so.node` from a function bundle. See [prisma/prisma#22142](https://github.com/prisma/prisma/issues/22142), [prisma/prisma#19499](https://github.com/prisma/prisma/discussions/19499), and the [Prisma "Deploy to Vercel" guide](https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel).

The CorpFlow architecture has **two** kinds of routes that talk to Prisma on Vercel, and they need **two** different tracing fixes:

1. **Next.js pages routes with Prisma in `getServerSideProps`** — e.g. `/admin/lead-rescue/[id]`. Next.js Webpack emits an `.nft.json` next to each route's `.js`; Vercel uses those NFT files to assemble the function bundle. The official fix is the [`@prisma/nextjs-monorepo-workaround-plugin`](https://github.com/prisma/prisma/tree/main/packages/nextjs-monorepo-workaround-plugin) registered against Next's Webpack pass — it rewrites every `.nft.json` to list `libquery_engine-rhel-openssl-3.0.x.so.node` and `schema.prisma` so Vercel includes them in the bundle.
2. **Vercel-native functions under `api/`** — `api/factory_router.js` is *not* a Next.js API route (it lives outside `pages/api/`) and is handled directly by `@vercel/nft`, which the Next plugin cannot reach. The fix is `vercel.json` `functions["api/factory_router.js"].includeFiles` set to a glob that explicitly copies the Prisma client output (engine binary + schema + generated client) into the function's bundle.

Both fixes ship together because the AI Lead Rescue Save flow needs both: the detail page's SSR loads the lead via `loadAiLeadRescueDetailData` from the Next pages bundle (covered by fix #1), and the PATCH itself goes through `api/factory_router.js` (covered by fix #2).

What this PR adds:

- `next.config.mjs` — registers `PrismaPlugin` on the server-side Webpack pass. The repo had no `next.config.mjs` before this PR; everything ran on defaults.
- `vercel.json` — adds `functions["api/factory_router.js"].includeFiles: "node_modules/.prisma/client/**"`.
- `package.json` — declares `@prisma/nextjs-monorepo-workaround-plugin` as a normal `dependency` (not devDependency) so Vercel build picks it up.
- `node-tests/prisma-engine-binary-tracing.test.mjs` — static regression tests pinning all three wiring points.

Verified locally:

- `npm run build` (Webpack, with `next.config.mjs` loaded) emits 6 `.nft.json` files that include the Linux engine binary path: `admin/lead-rescue.js.nft.json`, `admin/lead-rescue/[id].js.nft.json`, `lead-rescue.js.nft.json`, `index.js.nft.json`, `properties.js.nft.json`, `properties/admin.js.nft.json`, `property/[slug].js.nft.json`.
- Full test suite (`npm test`) — 593/593 pass.

Strategic follow-up (NOT in scope of this PR):

Prisma 6.16+ supports `engineType = "client"` + driver adapter (`@prisma/adapter-pg` or `@prisma/adapter-neon`), which removes the Rust query-engine binary entirely. That is Prisma's recommended long-term direction for serverless and is what they will default to in Prisma 7. Migrating CorpFlow to that pattern is a separate, larger change because every `new PrismaClient()` call site (~50 files) needs an adapter wired in, and the Postgres-provider doc (`docs/operations/POSTGRES_PROVIDER.md`) and runtime guards would benefit from a Neon-only adapter (`@prisma/adapter-neon`). Plan that as its own packet; do not bundle it with the surgical fix in this PR.

### Third root cause found on 2026-06-07 — Prisma engine cold-start race on the first query (PR #325)

After PR #324 ensured the Prisma query engine binary was actually present in every Vercel function bundle, the diagnostic panel finally showed `Save phase: saved` + `Last patch response status: 200` for an operator-field save. Anton then tried to change the lead status to `PAID_SETUP`. Two failure variants appeared, each on a different click, on the same merged build:

```
Invalid `prisma.lead.findUnique()` invocation:
Engine is not yet connected.
Backtrace [{ fn: "start_thread" }, { fn: "__clone" }]
```

```
Invalid `prisma.lead.findUnique()` invocation:
Response from the Engine was empty
```

**The critical diagnostic** was the next click after the error: the AI Lead Rescue list page showed the row at the new status (`Setup in progress` after one save, `PAID_SETUP` after another). **The database write had landed in Neon every time, even when the UI saw HTTP 500**. So this is a UX / response-delivery race, not a data-integrity problem.

Both error wordings are two faces of one Prisma 6 + Vercel cold-start bug:

- **`Engine is not yet connected`** — the engine binary spawn has started, the Prisma client's `$connect()` lifecycle has not yet completed, and a query was fired anyway. Hits the first call on a fresh function instance.
- **`Response from the Engine was empty`** — the engine accepted the query, executed it against Neon (so the row IS updated), but the response stream back to the Node.js process was truncated or lost (often function-timeout-adjacent or engine subprocess kill).

The contributing factors on this codebase:

1. **~50 files each declare `const prisma = new PrismaClient()` at module top level.** When a serverless function instance loads multiple of these (e.g. `api/factory_router.js` imports `admin-lead-rescue-api.js`, `admin-leads.js`, `auth.js`, `telemetry.js`, etc., each with its own client constructor), several engines race to spawn during cold-start. The long-term fix is a singleton `PrismaClient` shared across the process — a separate packet, intentionally out of scope here.
2. **Neon's scale-to-zero compute can take a few seconds to wake** on the first connection after idle, layering additional latency onto the engine startup.

What PR #325 changes — surgical, AI Lead Rescue only:

- **Eager `prisma.$connect()` at module load** in `lib/server/admin-lead-rescue-api.js` so the engine + Neon connection are warm before the first incoming request. Failures here are logged to stderr (Vercel function logs) and swallowed; a real connection problem still surfaces normally on the first query through the standard `LEAD_RESCUE_*_FAILED` error envelope.
- **`withPrismaColdStartRetry(db, operation)`** — a single-shot retry helper that fires *only* on the two documented wordings above. It calls `db.$connect()` between attempts (when the client exposes it), waits ~250 ms, and retries the operation once. If the retry also fails, the error propagates to the caller unchanged. No loops, no exponential backoff, no background workers, no masking of unrelated errors.
- **Every Prisma data call in the AI Lead Rescue admin paths is wrapped** — `loadAiLeadRescueListData` (`findMany`), `loadAiLeadRescueDetailData` (`findUnique`), and `applyAiLeadRescuePatch` (`findUnique` + `update`). Pinned by static assertions in `node-tests/admin-lead-rescue-cold-start-retry.test.mjs` — `npm test` will fail if a bare `await db.lead.X(...)` appears outside a retry wrapper.

What PR #325 deliberately does NOT change:

- No other server file is modified. The broad `PrismaClient` singleton refactor across the ~50 call sites is logged as follow-up technical debt, not bundled into a late-night PR.
- No retry loop, no exponential backoff, no auto-recovery on non-cold-start error wordings. Real failures (validation, constraint, `Can't reach database server`) still propagate immediately.
- No change to factory-admin auth or response envelopes.

Operator UX implication: the first request after a function cold-start may take ~250 ms longer than before (the retry budget), in exchange for the page no longer showing a spurious red error block when the engine settles. Subsequent warm requests pay no cost.

### Fourth root cause found on 2026-06-08 — single-shot retry too tight for Neon scale-to-zero (PR #326)

After PR #325 merged and was verified live, Anton observed the same UI error block (`Could not load lead detail (HTTP 500) — LEAD_RESCUE_PATCH_FAILED Invalid `prisma.lead.findUnique()` invocation: Engine is not yet connected.`) returning on a status-change save. He initially attributed it to a backwards status transition; the code grep confirmed that hypothesis was incorrect — there is no backwards-transition guard anywhere in `lib/server/admin-lead-rescue-api.js` or `lib/cmp/_lib/ai-lead-rescue-operator.js`. The direction of change is invisible to the API.

The actual root cause was PR #325's retry window: a single retry with a 250 ms backoff is not always enough to outlast Neon scale-to-zero wake-up + Prisma engine subprocess spawn on a fresh Vercel function instance. Both the first attempt AND the single retry can race the same cold engine and fail identically — the operator then sees the raw Prisma message.

What PR #326 changes — still surgical, still AI Lead Rescue only:

- **`COLD_START_RETRY_INITIAL_DELAY_MS` widened from 250 ms → 1500 ms.** Covers the worst observed Neon wake-up window without producing visible latency in the healthy path.
- **`COLD_START_RETRY_MAX_RETRIES` raised from 1 → 2.** Total attempt budget is now 3 (initial + 2 retries). Pinned by a static assertion that caps it at 3, so this never silently grows into a general-purpose retry loop.
- **`withPrismaColdStartRetry(db, op, opts)` now accepts `{ delayMs, maxRetries }`.** Production paths use the defaults. Tests pass `{ delayMs: 0 }` to keep the suite fast. Each handler (`loadAiLeadRescueListData`, `loadAiLeadRescueDetailData`, `applyAiLeadRescuePatch`) accepts an optional `retryOpts` arg that plumbs through.
- **Status dropdown on `/admin/lead-rescue/[id]` is now forward-only.** Backed by a new helper `getAiLeadRescueForwardStatuses(currentStatus)` in `lib/cmp/_lib/ai-lead-rescue-operator.js`, the dropdown only offers the lead's saved status PLUS every status that appears after it in `AI_LEAD_RESCUE_STATUSES`. The dropdown filters by the **saved** status (`lead.operations.status`), not local form state, so an operator can still revert an unsaved local change without the option disappearing. The API layer stays permissive — corrections via raw PATCH remain possible, with the operator's full knowledge.
- **UI note under the dropdown** explains the forward-only rule and tells the operator to contact the factory master for corrections.

What PR #326 still does NOT change:

- No broad `PrismaClient` singleton refactor across the ~50 call sites.
- No retry loop beyond the bounded 3-attempt budget.
- No change to factory-admin auth or response envelopes.
- No backward-transition logic at the API layer (it remains permissive).

### Fifth root cause found on 2026-06-08 — handler `$disconnect` after every request defeats the eager `$connect` (PR #327)

After PR #326 merged with the forward-only dropdown visible and the wider retry budget deployed, Anton confirmed two facts in production:

1. The forward-only UI behaviour worked exactly as designed.
2. **Every status change still produced** `Invalid prisma.lead.update() invocation: Engine is not yet connected.` (or the same wording on `findUnique`).

The retry budget — 3 attempts × 1500 ms = up to 4.5 seconds of wait — was being exhausted on every PATCH that wasn't the first request on a fresh function instance. Something was tearing down the engine between requests.

The culprit was on line 645 of `lib/server/admin-lead-rescue-api.js`, in the handler's `finally` block:

```js
} finally {
  await prisma.$disconnect().catch(() => {});
}
```

This had been there since the file was written. PR #325 added the eager `prisma.$connect()` at module load to warm the engine for incoming requests, but the per-request `$disconnect()` was undoing that work after every successful response: the engine subprocess was killed, all DB connections closed, and the next request on the same warm Vercel function instance had to spawn a new engine from scratch. **The retry budgets in PR #325 (250 ms × 1 retry) and PR #326 (1500 ms × 2 retries) were tactical patches against symptoms of this anti-pattern, not against the underlying race.**

This is the canonical Vercel + Prisma anti-pattern. Prisma's own documentation is explicit: in Vercel serverless, **do not call `$disconnect()`**. The function instance outlives any single request; Vercel reaps idle instances on its own schedule (typically several minutes after the last invocation). Keeping the connection alive across requests is the documented pattern.

What PR #327 changes:

- **Removed the `await prisma.$disconnect().catch(() => {})` line from `adminLeadRescueHandler`.** The handler now has no `finally` block. The module-level eager `$connect()` introduced in PR #325 now actually works as intended: the engine warms once when the function instance boots and stays warm for the entire instance lifetime.
- **Static regression test** — `node-tests/admin-lead-rescue-cold-start-retry.test.mjs` now asserts that `lib/server/admin-lead-rescue-api.js` does NOT contain `prisma.$disconnect()` anywhere. The test will fail if a future change re-introduces the anti-pattern. The complementary assertion that the eager `$connect()` is still present remains in place.

What PR #327 deliberately does NOT change:

- No other server file is touched. Other modules in the codebase (~10 files) still call `$disconnect()` after their requests — they may have the same latent issue, but they're not what Anton is hitting and they're not on the AI Lead Rescue critical path.
- The retry helpers from PR #325 and PR #326 stay in place. They were never the wrong solution; they were just patching the wrong layer. They remain useful for the genuinely-first request after a fresh function spawn (when even the eager `$connect()` may race the first incoming request) and as defence-in-depth against Neon scale-to-zero hiccups.

### Diagnostic UI cleanup — PR #328 (2026-06-08, after the chronicle closed)

PR #327 verified live on `lux.corpflowai.com/admin/lead-rescue/[id]` — status changes, `next_action` changes, and Setup checklist changes all persist across consecutive PATCHes on the same warm function instance. With the underlying race resolved, the temporary in-page diagnostics that had accumulated through PR #319 – PR #322 were removed in PR #328:

- The **`Detail bundle / Commit / Deployment / Env / Lead id / Save handler mounted / Last save click / Save phase / Last patch response status / Last Test click`** panel above the Save button is gone.
- The blue **Test click** button is gone.
- The **`Open raw save diagnostic`** disclosure is gone (the raw fetch snippet remains documented in the *Troubleshooting* section above, for operators who want to reach for it from DevTools).
- The `buildInfo` SSR prop (sourced from `VERCEL_GIT_COMMIT_SHA` / `VERCEL_DEPLOYMENT_ID` / `VERCEL_ENV`) is no longer plumbed from `pages/admin/lead-rescue/[id].js` to the component. Vercel commit/deploy provenance still lives where it canonically lives (Vercel Deployments + GitHub `main`).
- The `logDiag` console helper and the `saveDiagnostics` React state are gone. `console.info('[ai-lead-rescue/detail] …')` events no longer appear.

What stays (production surface):

- The **`Save changes`** button (now the only button) — `data-testid="ai-lead-rescue-save"`, explicit `onClick={save}`, `type="button"`. PR #319's defence-in-depth against native form-POST regression remains pinned by `node-tests/admin-lead-rescue-detail-save-wiring.test.mjs`.
- The inline `DetailErrorBlock` next to the Save button — operators still see API errors with HTTP status + error code + a Retry / Back / Open raw API affordance.
- The `Saved.` success pill.
- The forward-only status dropdown (PR #326) and its explanatory note.
- All Setup checklist functionality.

The static regression test `does NOT plumb buildInfo / Vercel commit metadata through the page (PR #328 cleanup)` in `node-tests/admin-lead-rescue-detail-save-wiring.test.mjs` pins the cleanup so the production surface cannot silently re-accumulate diagnostic scaffolding.

Strategic follow-up — Neon driver adapter migration (queued, no longer urgent):

Migrate `lib/server/admin-lead-rescue-api.js` (and eventually the broader codebase) to Prisma 6's **Neon driver adapter** (`@prisma/adapter-neon`) with `engineType = "client"`. That removes the Rust query-engine binary entirely from the serverless function bundle and removes the entire class of "Engine is not yet connected" / "Response from the Engine was empty" failures along with it. With PR #327 + PR #328 in place, the failure mode that motivated this migration should be effectively gone, so it is a hygiene improvement rather than incident response.

### Earlier (incorrect) hypothesis kept for the record — React hydration mismatch via locale-sensitive `fmtDate`

This was PR #321's framing. It was a real latent bug:

What the PR #320 diagnostic panel showed live:

```
Detail bundle: save-wiring-v2
Lead id: cmq21ocm20000jv04oy8658qf
Save handler mounted: NO      ← the smoking gun
Save phase: idle
Last Test click: (none)
```

`Save handler mounted: NO` is set by a mount `useEffect` — if it remains `NO` after page load, **React did not hydrate the component**, no event handlers attached, and every click on Save / Test click silently no-ops.

The underlying defect was a server-vs-client text mismatch in the SSR-rendered detail header. The old `fmtDate(iso)` returned `new Date(iso).toLocaleString()`, whose output depends on the host locale AND timezone:

- Vercel SSR (UTC, en-US default) emitted e.g. `6/6/2026, 7:41:38 AM`.
- Operator browser (Mauritius UTC+4, browser locale) emitted e.g. `06/06/2026 11:41:38`.

React detected the mismatch during hydration of `Submitted {fmtDate(lead.submitted_at)}` and aborted hydrating the subtree. Everything below — form, Save button, Test click button, checklist editor — became static HTML with no React event listeners. The raw `fetch(...)` PATCH still worked (proving backend persistence was intact), but no UI click could trigger it.

The fix in PR #321:

- Introduced `lib/format/utc-date.js` with `fmtDateStableUtc(value)`. Output: `YYYY-MM-DD HH:mm:ss UTC` for valid input, `—` otherwise. Uses only `getUTC*` accessors and zero-padded strings — bit-for-bit deterministic across Node and every browser.
- Replaced every call to `fmtDate(...)` in `components/AiLeadRescueAdminDetail.js` and `components/AiLeadRescueAdminList.js` with `fmtDateStableUtc(...)`.
- Pinned the contract in `node-tests/admin-lead-rescue-detail-hydration-stable.test.mjs` — forbids `toLocaleString`, `toLocaleDateString`, `toLocaleTimeString`, `Intl.DateTimeFormat`, `Math.random`, and the legacy `fmtDate(` helper in either component (comments stripped).
- The PR #320 diagnostic panel is **intentionally retained** for one more live verification cycle so the operator can read `Save handler mounted: YES` and watch `Save phase` transition `idle → clicked → saving → saved`. Once verified live, those diagnostics will be removed in a follow-up PR.

Operator UX note: detail timestamps now display in canonical UTC. For factory-admin work this is arguably clearer than browser-local time — it matches automation_events, n8n receipts, and Postgres timestamps without any zone conversion in the operator's head.

## Troubleshooting — save does not persist or the PAID_SETUP checklist does not appear

If you save a field on `/admin/lead-rescue/[id]` and the change is gone after a refresh, or you set status to `PAID_SETUP` and the 13-item setup checklist does not appear:

1. **Look for the inline error block right above the Save button.** After this fix the save error and save success messages render *next to* the Save button, not only at the top of the page — a silent save failure is no longer possible at the UX layer.
2. **Use "Open raw API" in the error block** to inspect the `PATCH /api/factory/lead-rescue/patch` response in a new tab. The stable envelope is `{ ok: true, lead: {...} }` on success or `{ ok: false, error, message, http_status }` on failure. Compare the returned `lead.operations.status` and `lead.setup_checklist_eligible` with what you expected.
3. **Confirm the response shape end-to-end.** The pin is in `node-tests/admin-lead-rescue-patch-api.test.mjs`: setting `status: 'PAID_SETUP'` always returns `setup_checklist_eligible: true` and the canonical 13-item checklist in the response, **and** a subsequent detail-loader read returns the same status. If both of those are not visible after a successful save, the deployment predates the persistence fix — verify the deployed commit on Vercel Production.
4. **Checklist progress survives non-checklist saves.** `mergeAiLeadRescueOperatorPatch` now preserves the stored `setup_checklist` block from `qualification_json.ai_lead_rescue_operator`. Editing "Next action" / "Owner" / commercial fields no longer wipes checklist state — pinned by the `saving operator fields after a checklist save does NOT wipe checklist progress` regression test.

## Troubleshooting — detail page is blank/black after clicking "Open"

The detail page at `/admin/lead-rescue/[id]` follows the same robustness contract as the list page: the data is SSR-fetched via a shared loader, the React tree is wrapped in an error boundary (so a render-time throw becomes a visible error block, never a black screen), every nested field access goes through a `normalizeLead()` shim with safe defaults, and the Back-to-pipeline link is always rendered outside the boundary. If an operator ever sees a fully blank/black page, the page chrome itself failed to render — that is a deployment / build problem, not an application logic problem.

1. **Confirm the navigation URL.** It should look like `https://corpflowai.com/admin/lead-rescue/<lead-id>` with `lead-id` matching what the list row shows. If `lead-id` is missing or the wrong shape, the page surfaces `ID_REQUIRED` and a Back-to-list link instead of blanking.
2. **Read the error block.** When something fails to load, the page now shows an explicit alert with HTTP status, error code, message, **Retry**, **Back to list**, and **Open raw API** controls. Press **Open raw API** to inspect `/api/factory/lead-rescue/get?id=<lead-id>` in a new tab while authenticated:
   - **`{ ok: true, lead: {...} }`** — API healthy; click **Retry**.
   - **`{ ok: false, error: "LEAD_NOT_FOUND" }`** — the lead was deleted or its `qualification_json` no longer matches the AI Lead Rescue product. Return to the list.
   - **`{ ok: false, error: "LEAD_RESCUE_GET_FAILED" }`** — DB call failed; inspect `message`.
   - **`{ ok: false, error: "FACTORY_AUTH_REQUIRED" }`** — the admin session expired between SSR and client fetch. Reload after re-authenticating.
3. **If you see a completely black page with no Back link.** That means even the page chrome failed to render — almost always a stale or broken deployed bundle. Verify the deployed commit on Vercel Production matches the head of `main`, redeploy if not, and clear browser cache. If the issue persists, capture the browser console error and attach it to the issue.

## Live verification checklist (do before calling any change COMPLETE)

CI green and a merged PR are not proof of delivery. Before marking any AI Lead Rescue change `COMPLETE`, walk through:

1. **Vercel Production deployment is Ready** for the merged commit. Record the deployment ID + commit SHA.
2. **Factory admin login works** on production — you can reach `/admin/lead-rescue`.
3. **List page** loads with the AI Lead Rescue intakes, filters, and search — no 5xx.
4. **Detail page** loads for an existing lead — no 5xx; Prospect / Commercial / Status & operations cards all render.
5. **Notification event fires exactly once** on a real (or test) `/lead-rescue` submission (check Postgres `automation_events` or n8n receipt; the idempotency key prevents duplicates).
6. **n8n forwards `payload.notification_text`** to the configured operator Telegram / email channel.
7. **Setup checklist** card appears for a `PAID_SETUP` (or later) lead and shows **all 13 items**; toggling one row saves and survives a page reload.
8. **Eligibility gate** holds — the card stays hidden for `QUALIFYING` / `PAYMENT_PENDING` etc., and the PATCH endpoint returns `CHECKLIST_NOT_ELIGIBLE` for those statuses.

If any of these fails on production, the change is **FAILED**, not COMPLETE — see `.cursor/rules/delivery-reality.mdc`.

## Delivery Reality — local / preview is not complete

Reminder from `.cursor/rules/delivery-reality.mdc` and `.cursor/rules/predeploy-decision-checks.mdc`:

- **Local tests passing** is necessary but **not sufficient**.
- **CI green** is necessary but **not sufficient**.
- **Merge to `main`** is necessary but **not sufficient**.
- **Vercel Preview** healthy is **not** the same as **Vercel Production** healthy.
- A change is only **COMPLETE** when the Vercel Production deployment is Ready, the deployed commit contains the change, and the customer-visible flow (here: operator factory flow) has been verified live.

For AI Lead Rescue specifically, no claim of `COMPLETE` is valid unless the live verification checklist above passes against the **Production** deployment, not a preview.

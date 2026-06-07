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

If you click **Save** on the detail page and nothing happens (no "Saving…", no "Saved.", no error), the detail page now renders a **visible diagnostic panel** directly above the Save button that tells you, at a glance, where the chain is breaking. Read it from top to bottom:

```
Detail bundle: save-wiring-v2
Lead id: <the id from the URL, or (none) if missing>
Save handler mounted: YES | NO
Last save click: <ISO timestamp, or (none)>
Save phase: idle | clicked | saving | saved | error
Last patch response status: <HTTP status, or (none)>
Last Test click: <ISO timestamp, or (none)>
```

How to read each line:

1. **`Detail bundle: save-wiring-v2`** — if this line does not appear at all on the page, Production is **not** serving the build with the diagnostics. Verify the deployed commit on Vercel Production and clear the browser cache.
2. **`Save handler mounted: YES`** — if it says `NO`, React did not hydrate the page. Look in DevTools → Console for a red hydration / runtime error; that is the bug.
3. **`Last Test click: …`** — there is a blue **Test click** button beside Save. Pressing it updates this line only (no API call). If the timestamp does not move, click events from React are not reaching the page at all (CSP, hydration failure, overlay). If it moves but **Save** does not, the bug is inside the Save handler.
4. **`Save phase: clicked` after pressing Save** — the Save handler writes this *before* any validation or fetch, so it must transition out of `idle` on every click. If it stays `idle` after a click, the click event is not being delivered to `save()`.
5. **`Save phase: saving` → `saved` (or `error`)** — once `clicked`, the handler then transitions to `saving` (request in flight), then `saved` on HTTP 200 or `error` on any failure.
6. **`Last patch response status: <NNN>`** — populated as soon as the `PATCH /api/factory/lead-rescue/patch` request returns. Status `200` means the API persisted the change; a non-`200` means look at the inline error block beside Save.

There is also a **`Open raw save diagnostic`** disclosure beneath the buttons. Expand it for a copy/paste `fetch(...)` snippet that PATCHes only `next_action` from DevTools while you are still signed in. Use it to separate UI wiring from API persistence:

- If the raw snippet returns `{ ok: true, lead: { … } }` (HTTP 200) but clicking Save still shows `Save phase: idle`, the bug is in the React UI wiring — not the API.
- If the raw snippet also fails, the bug is in the API or session, not the UI.

Console (DevTools → Console) also receives namespaced `console.info('[ai-lead-rescue/detail] …')` events for `component mounted`, `save clicked`, `save payload prepared`, and `save response`. They never log notes, payment fields, owner, or `last_contacted` values — only structural booleans and the HTTP status. Filter the console by `ai-lead-rescue/detail` to follow the click chain end-to-end.

When the live save failure is fully diagnosed, the diagnostic panel and Test click button must be removed or downgraded — they are not part of the long-term operator UX.

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

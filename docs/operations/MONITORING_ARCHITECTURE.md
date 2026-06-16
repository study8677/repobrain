# Monitoring & 24/7 execution architecture (canonical)

**Status:** v1 — 2026-05-27
**Owner:** Anton (operator) for hosts/secrets/scheduled jobs; Cursor for repo-side wiring + this doc.
**Scope:** This doc is the **single component map** for "what monitors what, on what schedule, with what alert path." It does not restate component-level details — it points at the canonical doc per component. When a new monitoring surface or scheduled job is added, **§ 2 must be updated in the same PR** (rule formalised in § 9).

**Companion docs (canonical for the components below — read those for details):**

- `docs/operations/PRODUCTION_PULSE_V1.md` — `/api/factory/production-pulse/runtime` HTTP contract.
- `docs/operations/FACTORY_CONTROL_LOOP.md` — daily GitHub Actions drift check.
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` — CMP delivery-verdict + alert routing.
- `docs/operations/POSTGRES_PROVIDER.md` — Neon-only mandate; § 3 / § 4b / § 5b explain the factory-health blind spot.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — high-level "brain on laptop, hands 24/7" policy. This doc is its concrete component map.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound email model; `operator_escalation` event used by ops alerts.
- `docs/automation-framework.md` — automation forward (n8n) envelope contract used by ops alerts.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — v1 quality system; § 3.8 *Monitoring / runtime health* consumes this doc's § 2 / § 3 / § 5 evidence.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — alert-channel wiring contract; § 4 / § 4.3 consume this packet's payload contract, severity ladder, anti-spam rule.

---

## 1. Why this doc exists

Before this doc, the monitoring story was scattered across the component-level files above. Anton flagged in chat that monitoring had been *discussed* in fragments but never *documented as a system* — and that the new `corpflow-exec-01` execution node had no documented role in the picture at all. Several existing docs already had a forward-reference to `MONITORING_ARCHITECTURE.md` that pointed at a doc that did not yet exist.

This doc closes that gap. Everything below is **descriptive of what exists today (2026-05-27)** plus **named future packets**. Anything not listed here does not exist in this system; do not assume otherwise.

### Two-line mental model

- **Drift detection** — what we run on a schedule to catch slow degradation between deploys (env drift, DB drift, schedule drift). Run by GitHub Actions (off-Vercel) and by Vercel crons (in-app). Output: alerts.
- **Live evidence** — what we hit on demand to prove production matches intent for a specific change (the URLs in `.cursor/rules/delivery-reality.mdc`'s Delivery Reality Audit). Run by humans or by Cursor on a change. Output: a recorded audit.

Drift detection is "did anything quietly break." Live evidence is "is this specific change actually live for clients." Both are necessary; neither substitutes for the other.

---

## 2. Surface map — the 12 active monitors + 1 authorized-pending-install

Each monitor row names what it checks, what it explicitly does **not** check, and the alert path on failure. The "Monitor #" column is the stable id used elsewhere in this doc and from cross-references in component docs.

> **Monitor # 13 authorization note (2026-06-15) — install runbook authored 2026-06-16:** Monitor # 13 (Uptime Kuma probe set on `corpflow-exec-01-u69678`) is **authorized** by `docs/decisions/20260615-uptime-kuma-on-exec01.md` + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (`JE-2026-06-15-1`). The install runbook **`docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md`** has now been authored (2026-06-16, `JE-2026-06-16-1`) but **not yet executed**. The row below documents the authorized shape; until the operator runs the install at L3 per the § 5.4 pattern in `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` and K1–K5 PASS per § 11 of the runbook, # 13 is **not probing** and blind spot # 7 (no third-location uptime) is **not** yet closed. Cross-reference: § 11.1 row state = `🟡 authorized + runbook authored, not installed`; § 11.2 row `kuma-on-exec01-install` now points at the authored runbook.

| # | Monitor | Where it runs | When | What it checks | What it does NOT check | Alert path on failure | Canonical doc |
|---|---|---|---|---|---|---|---|
| 1 | **Factory control loop** | GitHub Actions `factory-control-loop.yml` | daily 06:00 UTC + `workflow_dispatch` | (a) `/api/factory/health` HTTP 200 + `ok:true`; (b) `origin/main` SHA == latest Vercel Production deployment SHA; (c) `vercel.json` crons are Hobby-safe (fixed minute + hour, no `*` / list / range) | Postgres reachability (see #2 + § 6). Tenant resolution. Tenant marketing surface content. | Telegram (via `scripts/post-control-loop-telegram-alert.mjs` if `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` set). Workflow exits non-zero either way. | `docs/operations/FACTORY_CONTROL_LOOP.md` |
| 2 | **Factory health endpoint** | Vercel Production HTTP route `/api/factory/health` | on-demand (called by #1, #11, manual operator probe) | env-shape: `POSTGRES_URL` non-empty, `SOVEREIGN_SESSION_SECRET` non-empty, admin credentials configured, `CORPFLOW_RUNTIME_CONFIG_JSON` parses, password-reset delivery configured, factory-health-URL configured | **Does not open a Postgres connection.** Returns `database_configured:true` whenever `POSTGRES_URL` is non-empty — even if the value points at an unreachable host (this is the 2026-05-25 lesson; see § 6 and `POSTGRES_PROVIDER.md` § 3). | none — passive surface. Failures show up via #1 or #11. | `docs/operations/FACTORY_CONTROL_LOOP.md` § "What 'healthy' means" + `docs/operations/POSTGRES_PROVIDER.md` § 3 |
| 3 | **Production Pulse runtime** | Vercel Production HTTP route `/api/factory/production-pulse/runtime` | on-demand (operator CLI `scripts/production-pulse.mjs`, future cron) | env shape (same as #2) **plus** `core.database_reachable` (actually opens a Postgres query) **plus** `monitoring.ok` (composite of `CORPFLOW_CORE_HOSTS` and `CORPFLOW_FACTORY_HEALTH_URL` env presence) **plus** optional tenant marketing GET (`CORPFLOW_PRODUCTION_PULSE_TENANT_URL`, status only) | tenant content correctness; tenant resolution against host map; per-route correctness. | none — passive surface. The CLI exits 0/1; alerts are the caller's responsibility (today no scheduled caller — future packet `exec01-cron-pulse`, see § 11). | `docs/operations/PRODUCTION_PULSE_V1.md` |
| 4 | **CMP delivery monitor** | Vercel cron `/api/cron/cmp-monitor` | daily 05:00 UTC | for every CMP ticket in **Approved/Build**: PR exists for `cmp/<ticket>` → `main`; file changes detected; preview URL attached; persists `cmp_tickets.console_json.client_view.delivery_verdict` so `/change` can show on-track / blocked without GitHub/Vercel tabs | the Vercel deployment behind the preview URL (only that the URL exists). Ticket workflow stage transitions. | direct **Telegram** via `lib/server/ops-alerts.js` + n8n forward `corpflow.ops_alert.v1` (Comms v1 `operator_escalation` event type — internal-only audience; never client-facing). | `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` |
| 5 | **CMP overseer sweep** | Vercel cron `/api/cmp/overseer-sweep-cron` | daily 02:00 UTC | overseer pass on active CMP tickets (file-change detection, status reconciliation, evidence inventory). Internal CMP housekeeping. | nothing client-facing; nothing on production routes. | (no automated alert today — operator inspects via `/change` or DB). | `lib/cmp/README.md` |
| 6 | **CMP stuck self-repair** | Vercel cron `/api/cmp/stuck-self-repair-cron` | daily 04:00 UTC | tickets stuck in a workflow stage past expected time → auto-retry / re-dispatch (with idempotency) | mutation of ticket business logic; client-visible state. | (no automated alert today — operator inspects via `/change` or `automation_events`). Repeatedly stuck tickets surface via #4. | `lib/cmp/README.md` |
| 7 | **Technical Lead observer** | Vercel cron `/api/cron/technical-lead` | daily 06:00 UTC | for every CMP Approved/Build ticket: read `console_json` + GitHub PR/compare/check-runs + optional Vercel preview deployment rows + optional factory health → write `technical_lead_audits` row with gaps + summary | makes no PR comments by default (read-only observer). Phase B has CMP action `technical-lead-latest` for on-demand fetch. | none — read-only; results pulled by operator via `/change` Factory oversight panel or `npm run technical-lead:run`. | `AGENTS.md` § "Technical Lead Phase A (observer)" |
| 8 | **Billing sentinel** | Vercel cron `/api/cron/billing-sentinel` | daily 00:00 UTC | tenant wallet states + per-tenant billing-exempt flags + reconciles `tenant_wallets` vs ticket-cost ledger | does not charge cards (Stripe webhooks are separate); does not change tenant pricing. | (no automated alert today). | `lib/factory/costing.js`, `lib/server/billing-exempt.js` |
| 9 | **Postgres env drift diagnostic** | GitHub Actions `diagnose-postgres-env.yml` | `workflow_dispatch` only (manual) | enumerates every DB-related Vercel Production env name + tags each with strict booleans (`value_starts_with_prisma_proto`, `value_host_contains_prisma_io`, `value_host_contains_neon_tech`, `value_host_contains_pooler`); never prints values or hostnames. Catches `db.prisma.io` drift (the 2026-05-25 incident class). | drift in non-DB envs; runtime DB reachability (use #3 for that). | none — operator-driven; emits a verdict line + JSON artifact `diagnose-vercel-postgres-env` (7-day retention). | `docs/operations/POSTGRES_PROVIDER.md` § 4b + § 5b |
| 10 | **Factory health weekly ping** | GitHub Actions `factory-health-ping.yml` | weekly Mon 14:00 UTC + `workflow_dispatch` | low-noise wrapper around #2. Older / lighter than #1 — kept for low-frequency confirmation that #1 itself is wired correctly (catches the case where #1 silently never runs because of secret breakage). | superseded by #1 for daily drift detection — see #1 callout for that. | workflow status visible in GitHub UI; no Telegram. | (header note in `docs/operations/FACTORY_CONTROL_LOOP.md`) |
| 11 | **`vercel.json` cron policy self-validation** | inside #1 (`scripts/factory-control-loop.mjs`) | implicit — runs as the third check of #1 on each daily run | structural check on `vercel.json`: every cron entry has a fixed minute + fixed hour (no `*`, no lists, no ranges) → Hobby-tier safe. Catches the failure mode where someone edits `vercel.json` to a multi-occurrence cron that Vercel Hobby silently rejects. | does not validate that the cron path resolves; does not validate that the destination route exists. | rolled into the #1 Telegram alert as one of the three named failures. | `docs/VERCEL_DEPLOYMENT.md` (Hobby cron rules) + `docs/operations/FACTORY_CONTROL_LOOP.md` |
| 12 | **`corpflow-exec-01`** (operator shell) | Hetzner VM (Ubuntu 24.04, 2 vCPU / 2 GB / 38 GB / 2 GB swap) — `5.78.213.185` | none yet (operator-driven SSH access only) | nothing scheduled in v1 — the box is operator/maintenance shell only (gh CLI authed, repo cloned, `npm ci` + `npm test` verified at bootstrap) | does not host scheduled jobs; does not hold prod secrets; does not write to DB; does not deploy to Vercel; does not host n8n; does not hold tenant data | (none — no scheduled jobs to alert about). When the box gains scheduled work, the packet must add an alert path before merge (§ 9). | this doc § 11.3 (posture) + `docs/EXECUTION_BRAIN_VS_HANDS.md` § "Security note" |
| 13 | **Uptime Kuma probe set** (`corpflow-exec-01-u69678`) | single Docker container on the box (`louislam/uptime-kuma:1.<minor>` pinned), `127.0.0.1:3001` loopback only, persistent volume `~/uptime-kuma-data/` | internal Kuma scheduler — per-monitor interval ≥ 60 s in v1; operator UI access via SSH local-port-forward only (`ssh -L 3001:localhost:3001`) | seven CorpFlow public floor URLs (`https://core.corpflowai.com/api/factory/health`, `https://core.corpflowai.com/api/factory/production-pulse/runtime`, `https://corpflowai.com/`, `https://corpflowai.com/lead-rescue`, `https://aileadrescue.corpflowai.com/`, `https://lux.corpflowai.com/`, `https://lux.corpflowai.com/change`) + n8n host's own health endpoint (URL operator-held, not in repo). Optional content-marker assertion per monitor. | does not probe state-mutating routes; does not probe factory-master / `/api/admin/*` / `/api/automation/ingest`; does not hold any CorpFlow secret; does not write to Postgres; does not run anywhere outside `corpflow-exec-01`. **Authorization is for Uptime Kuma alone — does not authorize Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, or any second container.** | **Kuma's own Telegram bot (separate from the in-repo `TELEGRAM_BOT_TOKEN`)** is the **primary** alert channel — must work even if n8n is down. Kuma's optional SMTP is the backup primary. n8n forwarding is permitted as **secondary** for non-critical signals only (status-page roll-ups, daily summaries) and must **not** be on the critical-outage primary path (no circular dependency). Failure-domain isolation is the entire point of # 13. | `docs/decisions/20260615-uptime-kuma-on-exec01.md` (ADR — authorization), `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (this gate's packet — `JE-2026-06-15-1`), `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 (Phase 1 doctrine), `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 (named carve-out), this doc § 11.1 (state row) + § 11.2 (`kuma-on-exec01-install` install follow-up packet) |

### Adjacent surfaces (not in the 12, kept here so they are not invisible)

These run on a schedule but are not factory-health monitors. They are listed for the surface inventory only:

- **`factory-housekeeping.yml`** (GitHub Actions, weekly Mon 03:00 UTC + monthly 1st 04:00 UTC) — closes stale CMP sandbox PRs, deletes ephemeral `cmp/*` branches with no activity. GitHub-only; no tenant data touched.
- **`domain-routing-guard.yml`** (GitHub Actions, `workflow_dispatch` only) — verifies that `core.corpflowai.com`, `corpflowai.com` apex, and `lux.corpflowai.com` resolve to the right Vercel project (catches the "core points at wrong deployment, factory routes 404" drift). Manual today; promote to scheduled in a future packet.
- **`cmp-stuck-self-heal.yml`** (GitHub Actions, `workflow_dispatch` only) — manual variant of #6 used during incidents.
- **`cmp-product-automerge.yml`**, **`cmp-pr-delivery-gate.yml`**, **`cmp-branch.yml`**, **`vercel-env-check.yml`**, **`test.yml`** — PR-triggered or `workflow_run`-triggered gates. These guard merges, not deployed production.

---

## 3. Schedule grid (what fires when)

All times **UTC**. The grid is what an operator who reads UTC sees in a normal day; convert to local time as needed.

| UTC time | Day | Monitor # | What fires |
|---|---|---|---|
| 00:00 | every day | #8 | Billing sentinel (`/api/cron/billing-sentinel`) |
| 02:00 | every day | #5 | CMP overseer sweep (`/api/cmp/overseer-sweep-cron`) |
| 03:00 | Mondays | (housekeeping) | `factory-housekeeping.yml` weekly close-stale-PRs |
| 04:00 | every day | #6 | CMP stuck self-repair (`/api/cmp/stuck-self-repair-cron`) |
| 04:00 | 1st of month | (housekeeping) | `factory-housekeeping.yml` monthly variant |
| 05:00 | every day | #4 | CMP delivery monitor (`/api/cron/cmp-monitor`) |
| 06:00 | every day | #1 + #11 | Factory control loop + `vercel.json` cron self-validation |
| 06:00 | every day | #7 | Technical Lead observer (`/api/cron/technical-lead`) |
| 14:00 | Mondays | #10 | Factory health weekly ping |
| (manual) | as needed | #2, #3, #9, #12 | HTTP probes / `diagnose-postgres-env` / Production Pulse CLI / `corpflow-exec-01` shell |

**Note on the 06:00 collision:** both #1 (GitHub Actions) and #7 (Vercel cron) fire at 06:00 UTC. They are independent — #1 runs in GitHub's runner; #7 runs in Vercel's cron worker. They do not share state, so the collision is intentional and harmless.

**No-op behavior:** every monitor that needs an optional secret (Telegram, Vercel API token, automation forward URL) **degrades silently to a skipped step** when the secret is unset, rather than failing. Each workflow's first step prints presence-only status (`configured` / `SKIPPED`) — values are never logged.

---

## 4. Alert routing

Two physical paths, one shared envelope.

### 4.1 Telegram (direct)

Two senders, byte-compatible contracts (intentional — same chat, same bot, same body shape):

- **GitHub Actions side:** `scripts/post-control-loop-telegram-alert.mjs` (used by #1).
- **Server side:** `lib/server/ops-alerts.js` `sendTelegramOpsAlert()` (used by #4 and any future server-emitted alert).

Both POST to `https://api.telegram.org/bot<TOKEN>/sendMessage` with JSON `{chat_id, text}`. Body is capped at 3500 chars (Telegram limit is 4096; we leave room for retries / suffixing). Both skip silently when `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ALERT_CHAT_ID` is unset.

> **Cross-ref:** Payload contract, severity ladder (P0/P1/P2), anti-spam dedup rule, and phased rollout for the silent monitors are documented in `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` (the bounded execution unit). New emitters added under § 9 *Add-a-new-monitor recipe* must conform to that packet's § 4 + § 8 governance.

Message body shape (for both): header line (repo + run #) → recommended action → run URL → one-liner per failed check → top 5 fix-level actions.

### 4.2 n8n forward (`corpflow.ops_alert.v1`)

For monitors that want to land in **email** (or Google Chat, Slack, etc.) without growing the in-repo sender surface, the path is:

1. Server emits `corpflow.ops_alert.v1` envelope to `CORPFLOW_AUTOMATION_FORWARD_URL` with optional `x-corpflow-automation-forward-secret` header (when `CORPFLOW_AUTOMATION_FORWARD_SECRET` is set).
2. n8n routes on `kind` (e.g. `cmp_delivery_blocked`) → email to the operator alias (`antonvdberg@corpflowai.com` today) and/or to Telegram via n8n if you want a single funnel.
3. Comms classification: **`operator_escalation`** per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 4 — internal-only audience; this routing must never reach a client mailbox. Sender: `support@corpflowai.com`.

This contract is what `docs/automation-framework.md` § "Optional forward to n8n" calls out, and what `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` § "Email (and Telegram, Slack, etc.) via n8n" describes from the consumer side.

### 4.3 Today's wiring (what is and isn't alerted)

| Monitor # | Telegram | n8n forward | Notes |
|---|---|---|---|
| #1 Factory control loop | ✅ direct (workflow side) | — | only on workflow `failure()` |
| #2 Factory health endpoint | — | — | passive surface |
| #3 Production Pulse runtime | — | — | passive surface; future packet `exec01-cron-pulse` will add Telegram via #1's CLI |
| #4 CMP delivery monitor | ✅ direct (server side) | ✅ `corpflow.ops_alert.v1` | best-effort; never blocks the monitor |
| #5 CMP overseer sweep | — | — | (gap — see § 6) |
| #6 CMP stuck self-repair | — | — | (gap — see § 6) |
| #7 Technical Lead observer | — | — | read-only; no alert by design |
| #8 Billing sentinel | — | — | (gap — see § 6) |
| #9 Postgres env drift diagnostic | — | — | manual; verdict line in workflow log |
| #10 Factory health weekly ping | — | — | workflow status visible in GitHub UI only |
| #11 vercel.json cron self-validation | ✅ direct (rolled into #1) | — | shares #1's alert |
| #12 corpflow-exec-01 | — | — | no scheduled jobs to alert about (yet) |
| #13 Uptime Kuma probe set | ✅ Kuma's own bot (separate from the in-repo bot — failure-domain isolation by design) | secondary only — never on the critical-outage primary path | authorized 2026-06-15 (`JE-2026-06-15-1`); install runbook authored 2026-06-16 (`JE-2026-06-16-1`, `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md`); not yet executed at L3 — not yet probing |

### 4.4 Inbound webhook — Telegram -> repo (operationally separate from outbound)

<!-- TELEGRAM_INBOUND_WEBHOOK_4.4 -->

**Canonical home (moved 2026-05-27):** `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` § 7 — production URL `https://corpflowai.com/api/webhook`, repo path (`vercel.json` -> `api/factory_router.js` -> `lib/server/webhook.js`), token-rotation `setWebhook` invariant, and inbound-vs-outbound separation.

This sub-section is preserved as the stable anchor for cross-references from § 6 (known blind spots), § 7 (roles and ownership rotation row), and § 10 (cross-links). The anchor `<!-- TELEGRAM_INBOUND_WEBHOOK_4.4 -->` above is intentionally retained so any tooling or doc-graph check that looks for it continues to resolve.

## 5. Live-endpoint floor

This is the **observable-world** check list — what an operator (or Cursor on a delivery audit) hits to prove a change is actually live, **per `.cursor/rules/delivery-reality.mdc`**. Drift detection (§ 2 + § 3) is necessary but not sufficient; live evidence is required for any change with a customer-facing surface.

### Always-on minimum (one full pass, ~2 minutes)

| URL | Expected | Purpose |
|---|---|---|
| `https://core.corpflowai.com/api/factory/health` | **200**, JSON `ok:true`, all `checks.*` true | factory readiness self-report |
| `https://core.corpflowai.com/api/factory/production-pulse/runtime` | **200**, JSON `ok:true` (and ideally `monitoring.ok:true`) | DB reachability + monitoring chain |
| `https://lux.corpflowai.com/` | **200** + tenant-correct HTML (Lux markers present) | tenant marketing surface; catches the apex-fallback failure mode |
| `https://lux.corpflowai.com/change` | **200** | Change Console (operator surface) — this also implicitly hits CMP routes |
| `https://corpflowai.com/` | **200** + apex marketing HTML (not Vercel `MIDDLEWARE_INVOCATION_FAILED`, not 500) | apex marketing root |
| `https://aileadrescue.corpflowai.com/` | **200** + AI Lead Rescue marketing HTML (`<video>` + `lead-rescue-walkthrough-v1.mp4` references + "What you see every morning" + "Representational example only" markers) | Lead Rescue marketing surface — graduated to always-on 2026-05-29 (Anton, Bridge `#249`) after the Vercel domain mapping was restored and PR #266 went live. Catches the same platform-mapping drift that produced `DEPLOYMENT_NOT_FOUND` on this host until 2026-05-29 ~12:30 UTC+4. |

### Add when scope demands (for a specific change)

| URL | When | Expected |
|---|---|---|
| `https://lux.corpflowai.com/api/tenant/site` | tenant resolution touched | JSON `slug:"luxe-maurice"`, `tenant_registered:true` |
| `https://lux.corpflowai.com/api/ui/context` | tenant resolution touched | JSON `tenant_registered:true`, `login_route:"client"`, no `onboarding` fallback |
| `https://core.corpflowai.com/api/factory/technical-lead/audits?ticket_id=<id>` | Technical Lead Phase B verification | JSON with `audits[]` rows for the ticket |
| `https://corpflowai.com/<surface>` (`/lead-rescue`, `/concierge`, `/properties`, …) | apex sub-routes touched | per-route expected status + content |

**Hostname discipline:** never substitute `*.vercel.app` Preview URLs for the production hostnames above. Preview is a deploy-time artefact; clients hit the production hostnames. See `delivery-reality.mdc` § "Client-facing routes."

---

## 6. Known blind spots (the things this stack does NOT catch)

These are **deliberately listed** so they cannot drift back into "we thought we were monitoring this."

1. **`/api/factory/health` is not a database connectivity check.** Returns `database_configured:true` whenever `POSTGRES_URL` is non-empty. Caused the 2026-05-25 incident where `db.prisma.io` drift returned a green `/health` while tenant resolution fell back to apex. **Fix path:** use #3 (`production-pulse/runtime` — opens a query) for connectivity; use #9 (`diagnose-postgres-env`) to inspect drift in env value shape; use § 5 live tenant URLs to confirm clients can actually use the site. See `POSTGRES_PROVIDER.md` § 3.
2. **Vercel marketplace integrations can auto-install env vars in seconds.** A teammate clicking "install Prisma Accelerate" in the Vercel dashboard re-introduces `db.prisma.io` env values without a Git diff. None of monitors #1, #2, or #4 catch this. Only #9 (`diagnose-postgres-env`) does — and it's `workflow_dispatch` only. **Mitigation today:** run #9 as part of any delivery audit that touches DB env vars (see `POSTGRES_PROVIDER.md` § 5b). **Future packet:** schedule #9 weekly with a comparison against a checked-in expected-shape baseline.
3. **Tenant resolution failure looks like apex 200.** When tenant host mapping breaks, `lux.corpflowai.com/` 200s with apex HTML instead of Lux HTML. `/api/factory/health` is happy. Only the live tenant URL check in § 5 (with content marker assertion) catches it. **Fix path:** never claim `COMPLETE` on a tenancy-touching change without a live `lux.corpflowai.com/` content check (Lux markers like `Mauritius`, `concierge`, `luxe-maurice`).
4. **Telegram silently no-ops without secrets.** If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ALERT_CHAT_ID` is missing or rotated, both senders (§ 4.1) skip silently. The `loop.json` artifact + workflow exit code still indicate failure, but the operator may not see the alert. **Mitigation:** the periodic #10 (weekly factory health ping) catches the case where #1 silently never runs. There is no equivalent canary for #4's alert path — relies on the n8n forward (§ 4.2) being independently healthy. **Additionally:** rotating `TELEGRAM_BOT_TOKEN` breaks the **inbound** webhook (§ 4.4) until Telegram's `setWebhook` is re-run against the new token — there is no automated canary for that drift today either.
5. **Monitors #5, #6, #8 do not alert today.** CMP overseer sweep (#5), CMP stuck self-repair (#6), and billing sentinel (#8) run on schedule but emit no automated alert when they detect a problem. Operator inspection via `/change` or `automation_events` is required. **Fix path (future packet `cmp-internal-cron-alerts`):** wire each through `lib/server/ops-alerts.js` with a typed `kind` so n8n can route distinctly.
6. **Hobby-tier cron limits.** Vercel Hobby tier requires fixed minute + fixed hour per cron entry; #11 enforces this structurally. If we move to Pro / Enterprise and want sub-daily crons, #11's logic must be relaxed (or it will fail-on-success). Documented in `docs/VERCEL_DEPLOYMENT.md`.
7. **No third-location uptime.** Today, the only external pager-style probe is GitHub Actions (#1, #10) hitting Vercel. If GitHub Actions has an outage at the same time as Vercel, we have no independent evidence. Future packet `exec01-cron-pulse` (run #3 from `corpflow-exec-01`) and / or a third-party SaaS uptime probe are the named mitigations — neither implemented today.
8. **`corpflow-exec-01` itself is unmonitored** in v1 (#12) (it has no scheduled jobs, so there is nothing to be alerted about). When that changes (any future packet that adds scheduled work to the box), the box itself will need a heartbeat — TBD per the packet's threat model.

---

## 7. Roles and ownership

| Action | Anton (operator) | Cursor (agent / repo) | CI (GitHub Actions / Vercel cron) |
|---|---|---|---|
| Add a new monitor (workflow / cron) | approves the packet | writes the workflow + this doc § 2 row in same PR | runs the workflow once merged |
| Rotate `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ALERT_CHAT_ID` | runs rotation; updates GitHub repo secret + Vercel env; **after any `TELEGRAM_BOT_TOKEN` rotation, also re-runs Telegram `setWebhook` for the new token (§ 4.4)** | updates the runbook entry if behavior changed | **outbound** senders pick up the new secret on next run; **inbound** webhook (§ 4.4) does *not* auto-recover — requires the operator step above |
| Investigate a #1 failure | reads the alert; runs #9 if DB-env-shaped | drafts the fix on a branch; opens PR | re-runs #1 manually (`workflow_dispatch`) after fix |
| Investigate a #4 blocked verdict | opens `/change` to read verdict + Telegram body | (often nothing — operator lane); on tenant-side, reads the PR + preview | re-runs #4 on next cron tick |
| Update Vercel Production env (factory health URL, monitoring chain) | does the env edit | updates `.env.template` in same PR | enforced via `vercel-env-check.yml` on PRs |
| Add a packet that schedules a job on `corpflow-exec-01` (#12) | approves the packet (gate per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`) | writes the systemd unit / cron entry + threat model + this doc § 2 row | (no CI for the box yet — heartbeat is part of the packet) |
| Mark a delivery `COMPLETE` per `delivery-reality.mdc` | hits the live URLs; records the audit | writes the Delivery Reality Audit block; never marks COMPLETE without live checks | (no role) |

**Default assumption:** if an action is not in this table, ask. The autonomous-actions policy (`docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3) governs the gate.

---

## 8. Incident decision tree

When an alert lands, or a client reports something broken, walk this list **in order** — each step takes ≤ 60 seconds and narrows the surface.

1. **Open `/change`** (`https://lux.corpflowai.com/change`). Check the **Build status** column for any ticket showing `delivery_verdict.blocked: true` and the named reason. If a recent ticket says `PR_NOT_FOUND` or `PREVIEW_URL_MISSING`, the stack is fine — that's a CMP-ticket-level issue (#4 already escalated). If `/change` itself 5xx's, jump to step 4.
2. **Hit Production Pulse runtime** (`https://core.corpflowai.com/api/factory/production-pulse/runtime`). Look at `core.database_reachable` (#3 actually opens a query — unlike #2). If `false`, you have a DB connectivity problem; jump to step 5. If `true`, the platform is up; the issue is route-specific.
3. **Hit the client URL the report named** (or one from § 5). Compare expected vs actual. If 200 but wrong content, you may have a tenancy / host-mapping issue — capture the body bytes and proceed to step 6. If 5xx, capture the response and jump to step 4.
4. **Open the Factory control loop log** (GitHub → Actions → *Factory control loop* → most recent run). Read the human-readable *Actions & control* section — the first `[!]` line is the recommended fix (factory env, Vercel SHA mismatch, or `vercel.json` cron policy). Address that, then re-run #1 (`workflow_dispatch`) to confirm green.
5. **Run `diagnose-postgres-env.yml`** (GitHub → Actions → *Diagnose Vercel Postgres env (no values)* → **Run workflow**). The verdict line names whether it's pooled-vs-non-pooled mismatch, `db.prisma.io` drift, or a missing var. Cross-reference with `POSTGRES_PROVIDER.md` § 4b "Known drift symptoms." The workflow does **not** read or print values; it's safe to run anytime.
6. **Run live tenant probes** (`/api/ui/context`, `/api/tenant/site` per § 5) for the host that's misbehaving. These reveal whether tenant resolution is falling back to apex.
7. **Open the CMP ticket for the change** (if any) and read the **Delivery Reality Audit** block. If the most recent change is in `Approved/Build`, the verdict (#4) will be blocked or not — both #4 and #7 outputs are visible from the ticket. Compare the deployed commit against the intended commit.
8. **Escalate** — if steps 1–7 have not narrowed the failure, emit a Telegram alert manually (the same alert path #1 uses) and treat the platform as in incident state per `docs/runbooks/SECURITY_OR_INCIDENT.md`.

---

## 9. Add-a-new-monitor recipe

When a new monitoring surface is added, follow this recipe **in the same PR**. A new monitor that does not update § 2 is incomplete.

1. **Drift vs live** — be explicit which lane the new monitor is in (§ 1 mental model). A drift monitor runs on schedule and should never be a substitute for a live URL check; a live check is operator-driven and should never be silently scheduled (it'd start blasting probes at clients).
2. **What does it check that nothing else checks?** Write this in plain language and put it in the new § 2 row. If the answer is "the same thing as #N," delete the new monitor — duplication erodes alert trust.
3. **What does it explicitly NOT check?** Equally important. Put the negative space in the § 2 row's "What it does NOT check" column, and add an entry to § 6 if the omission is non-obvious.
4. **Schedule discipline** — if Vercel cron, fixed minute + fixed hour (#11 will fail otherwise). If GitHub Actions, prefer once-a-day-at-a-fixed-minute and `concurrency: <name>` to prevent overlapping runs. Avoid creating new schedules within ±15 minutes of an existing entry in § 3 unless the collision is intentional (#1 ↔ #7 at 06:00 is the only such case today).
5. **Alert path default** — Telegram via the byte-compatible contract in § 4.1 if the monitor is platform-owned (run by Vercel cron or GitHub Actions). n8n forward (§ 4.2) when the alert needs email or non-Telegram routing. If the monitor is purely internal (e.g. CMP housekeeping with no client effect), document it in § 2 with `—` in the alert column and add a row to § 4.3.
6. **Secret presence printing** — every workflow's first step prints presence-only status (`configured` / `SKIPPED`) for each secret it consumes. Values are never logged. Required by `.cursor/rules/security-sensitive-changes.mdc`.
7. **Rollback plan** — every new monitor's canonical doc has a "Rollback / disable" section (see `FACTORY_CONTROL_LOOP.md` § "Rollback / disable" for the pattern). Disable via UI → comment schedule → remove file, in increasing severity.
8. **§ 2 row in the same PR** — non-negotiable. A `git grep` for the new workflow filename should always land in this doc.

If the new monitor adds a scheduled job to **`corpflow-exec-01`** (#12), additionally:

- It must bring its own narrow-scope credentials (no reuse of operator-shell credentials).
- It must pass `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`.
- It must ship its own packet (`docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`) with explicit rollback and threat model.
- It must have an alert path other than "look at the box" — Telegram, n8n forward, or both (§ 4).

---

## 10. Cross-links (canonical docs the monitors point at)

- `docs/operations/PRODUCTION_PULSE_V1.md` — #3
- `docs/operations/FACTORY_CONTROL_LOOP.md` — #1, #11
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` — #4
- `docs/operations/POSTGRES_PROVIDER.md` — #2 blind spot, #9
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — high-level policy parent of this doc
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — § 4 `operator_escalation` event used by ops alerts (§ 4.2 above)
- `docs/automation-framework.md` — § "Optional forward to n8n" envelope contract used by § 4.2
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — pattern any off-laptop monitor follows
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet structure for monitors that need approval gates
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — § 2 (allowed without approval) vs § 3 (gated)
- `docs/runbooks/SECURITY_OR_INCIDENT.md` — escalation path beyond § 8
- `docs/VERCEL_DEPLOYMENT.md` — Hobby cron rules referenced by #11
- `lib/cmp/README.md` — #5, #6, #4 ticket model

**Workflow files (filenames are stable identifiers):**

- `.github/workflows/factory-control-loop.yml` — #1
- `.github/workflows/factory-health-ping.yml` — #10
- `.github/workflows/diagnose-postgres-env.yml` — #9

**Vercel cron paths (in `vercel.json`):**

- `/api/cron/billing-sentinel` — #8
- `/api/cmp/overseer-sweep-cron` — #5
- `/api/cmp/stuck-self-repair-cron` — #6
- `/api/cron/cmp-monitor` — #4
- `/api/cron/technical-lead` — #7

**HTTP routes:**

- `GET /api/factory/health` — #2
- `GET /api/factory/production-pulse/runtime` — #3
- `POST /api/webhook` — § 4.4 (inbound Telegram webhook; externally registered)

**Scripts (operator-runnable equivalents):**

- `scripts/factory-control-loop.mjs` — local equivalent of #1
- `scripts/post-control-loop-telegram-alert.mjs` — alert helper used by #1
- `scripts/production-pulse.mjs` — local CLI for #3
- `lib/server/ops-alerts.js` — server-side alert helper used by #4 (and any future server-emitted alert)

---

## 11. Status tables (the live ones — update in same PR)

The state of each monitor + each known future packet. When a future packet graduates, move it from § 11.2 to § 11.1 in the same PR that ships it; never silently migrate.

### 11.1 Today's monitors

| # | State | Notes |
|---|---|---|
| #1 Factory control loop | ✅ active | Telegram-alerted; daily 06:00 UTC. |
| #2 Factory health endpoint | ✅ active | Passive surface; well-understood blind spot (§ 6.1). |
| #3 Production Pulse runtime | ✅ active | Passive surface; no scheduled caller in v1. |
| #4 CMP delivery monitor | ✅ active | Telegram + n8n forward routes wired. |
| #5 CMP overseer sweep | ⚠️ active, no alert | Gap tracked in § 6.5. |
| #6 CMP stuck self-repair | ⚠️ active, no alert | Gap tracked in § 6.5. |
| #7 Technical Lead observer | ✅ active | Read-only by design (no alert). |
| #8 Billing sentinel | ⚠️ active, no alert | Gap tracked in § 6.5. |
| #9 Postgres env drift diagnostic | ✅ active (manual) | `workflow_dispatch` only; future packet to schedule. |
| #10 Factory health weekly ping | ✅ active | Mondays 14:00 UTC. |
| #11 vercel.json cron self-validation | ✅ active | Inside #1. |
| #12 corpflow-exec-01 (operator shell) | ✅ bootstrapped, no scheduled work | See § 11.3 for the v1 posture and hard rules. |
| #13 Uptime Kuma probe set (`corpflow-exec-01-u69678`) | 🟡 authorized + runbook authored, not installed | Authorized 2026-06-15 by `docs/decisions/20260615-uptime-kuma-on-exec01.md` + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (`JE-2026-06-15-1`). Install runbook authored 2026-06-16 by `JE-2026-06-16-1` at `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` (14 sections, K1–K5 verification block, § 12 evidence template, § 13 closure update points). Until the operator runs the install at L3 per the § 5.4 pattern in `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` and K1–K5 all PASS, # 13 is **not** probing and blind spot # 7 is **not** closed. Single named carve-out from `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5. |

### 11.2 Named future packets (not in flight)

| Packet id | One-liner | Pre-conditions |
|---|---|---|
| `cmp-internal-cron-alerts` | Wire #5 / #6 / #8 through `lib/server/ops-alerts.js` with typed `kind` for n8n routing. **Phase 3 of `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md`.** | (none — pure code change). |
| `exec01-cron-pulse` | Run `scripts/production-pulse.mjs` on a 30-min cron from `corpflow-exec-01` with Telegram alerts; diversifies alert path away from GitHub Actions. | A separate Telegram bot/chat (independent of GitHub's), narrow-scope. Box has only the public pulse URL. |
| `exec01-quality-audit-runner` | Schedule the read-only quality-audit probe (`docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`; the older `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` 5-dim rubric remains readable) to run weekly per tenant and write evidence under `~/audits/`. | Probe scripts are read-only; no auth required for tenant marketing surfaces. |
| `diagnose-postgres-env-scheduled` | Promote #9 from manual to weekly with a checked-in expected-shape baseline; alert on drift. | Decide where the baseline lives (in-repo JSON or env var). |
| `domain-routing-guard-scheduled` | Promote `domain-routing-guard.yml` from manual to daily; surface as a new monitor row in § 2. | Confirm `CORPFLOW_*_BASE_URL` secrets are set in production. |
| `n8n-on-exec01` | Migrate the n8n host onto `corpflow-exec-01` (or sibling Elestio VM). | Threat model + DPA review; n8n holds Gmail OAuth tokens. Probably a sibling VM, not the 2 GB box. |
| `kuma-on-exec01-install` | **AUTHORED 2026-06-16 — pending operator L3 execution.** Install runbook for Monitor # 13 (Uptime Kuma) on `corpflow-exec-01-u69678` per `docs/decisions/20260615-uptime-kuma-on-exec01.md`. Authored as `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` (`JE-2026-06-16-1`); 14 sections; operator-paste shell blocks; SSH-tunnel-only UI access; K1–K5 verification block. Cursor authored at L1 (no L3 commands typed); Anton runs at L3 per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 pattern. Closure path: § 13 of the runbook flips Monitor # 13 from `🟡 authorized + runbook authored, not installed` → `✅ active`. | Anton merges the install-runbook PR. Anton's password manager has a fresh Kuma admin password generated. Operator has created a separate Telegram bot for Kuma (independent of the in-repo `TELEGRAM_BOT_TOKEN`). Operator has confirmed the n8n health URL family. |
| `exec01-uptime-from-third-location` | Add a *managed third-party* SaaS uptime probe (BetterStack / Cronitor / similar) as a **second** third-location signal, complementary to (not a replacement for) Monitor # 13 once # 13 is installed and stable. | Vendor selection + DPA. Re-evaluate priority after # 13 has 30 production days of clean signal. |
| `move-repo-to-/opt/corpflow/repos` | Run `sudo chown -R anton:anton /opt/corpflow` once and `mv ~/corpflow-ai-command-center /opt/corpflow/repos/`. | Anton at the keyboard with sudo password. |

### 11.3 `corpflow-exec-01` posture (v1) — Monitor #12

**What it is:**

- Always-on Ubuntu 24.04 LTS box (Hetzner via Elestio): `5.78.213.185`, 2 vCPU / 2 GB RAM / 38 GB disk / 2 GB swap.
- Operator/maintenance shell access via SSH key for user `anton` (uid 1000, in `sudo` group).
- Pre-installed: Node 24, npm, git, GitHub CLI (`gh`) authenticated to `antonvdberg-bit/corpflow-ai-command-center`.
- Repo cloned at `~/corpflow-ai-command-center` (planned move to `/opt/corpflow/repos/` once `sudo chown` is run; tracked as packet `move-repo-to-/opt/corpflow/repos` in § 11.2).
- Verified at bootstrap (HEAD `63d87660`): `npm ci` (14 s, 617 M `node_modules`, Prisma client generated), `npm test` 382/382 PASS.

**What it is for in v1:**

- **Operator shell** — Anton or Cursor SSHes in for repo-local commands (`git`, `gh`, `npm test`, `node scripts/production-pulse.mjs --url …`) without touching production keys.
- **Evidence capture** — long-running read-only audits (e.g. quality-audit probe scripts) without keeping the laptop awake.
- **Future packet host** — staging surface for individual approved packets that need 24/7 execution; each must explicitly opt in here and bring its own narrow-scope credentials.

**What it is NOT for in v1 (hard rules — changing any requires a new ADR + explicit packet):**

- ❌ **No production secrets on the box** — no `POSTGRES_URL`, `MASTER_ADMIN_KEY`, `VERCEL_TOKEN`, Stripe keys, Gmail tokens. The box is treated as *less trusted than Vercel Production* until proven otherwise.
- ❌ **No DB writes** — any DB-touching script runs from an operator session against a copy/dev DB only.
- ❌ **No Vercel deploys** triggered from the box — no `vercel deploy`, no deploy-hook curl.
- ❌ **No scheduled jobs** — no cron, no systemd timers, no `at`. Anything scheduled today still lives on GitHub Actions or Vercel cron (§ 2).
- ❌ **No tenant data** — no DB exports, content snapshots, or tenant secrets.
- ❌ **No n8n migration yet** — n8n stays where it is until `n8n-on-exec01` is approved.
- ❌ **No Cursor server extension** — no remote Cursor Agent yet (deferred at bootstrap).
- ❌ **No Docker, no Ollama, no Postgres install** — adds attack surface and memory pressure 2 GB cannot absorb (deferred at bootstrap).

The boundary in `docs/EXECUTION_BRAIN_VS_HANDS.md` § "Security note" applies in full: *"24/7 execution should not mean agent has prod keys on a server."*

**Why GitHub Actions is the first-choice 24/7 hands today (and why the box is second-choice):** GitHub Actions has secrets in an encrypted store (presence-only printing in jobs), workflows are versioned in-repo, runs are reproducible and auditable, and nothing persists between runs. `corpflow-exec-01` is the second-choice for cases that don't fit there — long-running probes, things that need a stable IP, workloads exceeding GitHub's free minutes. v1 has zero of these workloads, hence zero scheduled jobs on the box.

---

*This doc is the single source of truth for the monitoring component map. Component-level details live in their own canonical docs (linked above). When the system gains a new component, this doc gains a row in § 2 in the same PR.*

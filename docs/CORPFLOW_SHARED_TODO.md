# CorpFlow shared to-do list

**Purpose:** One checklist the whole team (you + AI agents + contractors) can use.  
**How to use:** Edit in this repo, commit, push. Agents read `docs/CORPFLOW_SHARED_TODO.md` by path; you track the same file in GitHub or your IDE.

**Convention:** `- [ ]` open · `- [x]` done · `(owner)` optional · Priority: **P0** ship blockers, **P1** next, **P2** later.

---

## Base process — commit, push, and documentation (agents + humans)

Treat this as part of **definition of done** whenever work is **committed and pushed** (including merge to `main`). **Git/CI “done” is not customer delivery “done”:** distinguish **local → merged → deployed (Vercel Production commit) → live verified** per **`.cursor/rules/delivery-reality.mdc`**. A ticket or change is **operationally complete** only at **live verified**; use the **Delivery Reality Audit** format there.

1. **Re-evaluate documentation** against the change: operational runbooks (`docs/operations/`, `docs/runbooks/`), `.env.template`, `lib/cmp/README.md`, `docs/automation-framework.md`, and any file this repo names as canonical for the area you touched (e.g. `docs/operations/TENANT_CLIENT_LOGIN.md` for hostname / login / tenancy).
2. **Check rules, boundaries, and constraints** so nothing is transgressed: tenancy and host policy, factory vs tenant surfaces, secrets and automation boundaries (`docs/EXECUTION_BRAIN_VS_HANDS.md`), items already marked done or decided in this checklist, and Cursor/project rules under `.cursor/rules/`. For **auth, sessions, `api/`, `lib/server/`, `lib/cmp/` gates, Prisma, webhooks, or automation secrets**, also apply **`docs/operations/SECURITY_REVIEW_CHECKLIST.md`** (see `.cursor/rules/security-sensitive-changes.mdc`). If a constraint must change, record the decision **in-repo** (this file, `docs/decisions/`, or a strategy doc) in the same effort — do not ship silent contradictions.
3. **Update documentation when required**: if behavior, env vars, APIs, security posture, or operator steps changed, update the **canonical** doc for that topic in the **same change set** (or an immediate follow-up commit). Prefer updating established docs over leaving the only explanation in chat or an unreferenced `artifacts/` note.

**Agents:** before you finish a task that ends in commit/push, explicitly run through (1)–(3) and fix gaps or call out what still needs a human decision.

4. **Repository hygiene (Git):** Never add a **tracked file or folder named `main`** at the **repository root** — it makes `git log main` / `git diff main` ambiguous with the default branch. Removed once; see **`docs/operations/GIT_AND_MAIN_BRANCH.md`**. (No GitHub/Vercel access change required.)


### Coordination protocol — Operator Bridge v1

For routine packet handoffs between ChatGPT (planning author), Anton (operator), and Cursor (in-repo executor), see **`docs/operations/OPERATOR_BRIDGE_V1.md`**. The bridge is a **coordination layer only**: Anton still owns merges, secrets, DNS, billing, and external accounts; Cursor still **HOLDS** at every forbidden surface; ChatGPT still instructs through Anton. `main` remains the source of truth over any issue comment. <!-- OPERATOR_BRIDGE_V1_TODO_LINK -->

---

## Partner charter — breathtaking client experience (technical)

**What we sell first:** speed and clarity from **request → estimate → committed build → automation** — backed by **AI agents and factory execution**, not “many website skins” as the headline.

**Canonical “production-grade” standard (to prevent rework):** `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`

**This repo’s technical partner function (ongoing):**

- **Curate and wire agents:** use `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`, CMP mirror events, and playbooks so client-visible milestones trigger **notifications, handoffs, and follow-up** without you on the laptop (`docs/EXECUTION_BRAIN_VS_HANDS.md`).
- **Productize one golden path:** one script + one hostname + one demo tenant that always works (`scripts/onboard-demo-tenants.ps1`, `scripts/ensure-postgres-schema.ps1`, `docs/operations/TENANT_CLIENT_LOGIN.md`).
- **CX over chrome:** Change Console (`/change`) is the **hero surface** for clients — brief, estimate, approve, progress; tenant marketing skin is **tier-2** unless sold as a SKU.
- **Evaluate external levers:** new models, agent frameworks, hosted workflow tools — when they shorten **time-to-first-artifact** or **time-to-merge**, capture the decision in this file or `artifacts/` and implement the smallest integration.

---

## Demo today — what to show a client (~10 minutes)

**Before the room:** Production has `POSTGRES_URL`, tables (`ensure-schema`), client can log in on **their** mapped host (see `docs/operations/TENANT_CLIENT_LOGIN.md`). Wallet > 0 or billing-exempt so **Approve build** can show and (ideally) run.

**Runbook (production-reliable):** `docs/runbooks/CLIENT_DEMO_RUNBOOK.md` (references canonical host/login rules; includes “what to do if X fails”).


| Step | What you say                                                                    | What you do                                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | “This is your change workspace — everything stays scoped to your organization.” | Open `**/login`** on the client host (e.g. legacy `lux…` or canonical **`{tenant_id}.corpflowai.com`**) → log in as **tenant** user.                              |
| 2    | “You describe what you want in plain language; we capture it as a ticket.”      | `**/change`** → short real request → **Create ticket** → point at **Ticket ID** + list.                                                                          |
| 3    | “You see benchmark vs your CorpFlow build price before you commit.”             | **Estimate** → walk through **brief / estimate** copy (benchmark vs client line).                                                                                |
| 4    | “When you approve, we commit the build in our factory and trigger automation.”  | **Approve build** → **Build status** + **Your request progress** (if GitHub env missing, say: “saved in factory; branch dispatch when repo token is connected”). |
| 5    | “Files and links attach to the ticket.”                                         | Optional: **External links** or **upload** (if attachments table exists).                                                                                        |
| 6    | “Everything auditable.”                                                         | Glance at mode bar / reliability line if present; no raw factory dumps for tenant.                                                                               |


**If something breaks in the room:** Read the **red banner** or **Build status** text; `**GET /api/ui/context`** while logged in shows `change_console_readiness.warnings` for infra gaps.

**Minimal viable demo:** Steps **1–3** alone still tell the **speed + transparency** story; **4** is the “wow” if GitHub is wired.

---

## P0 — Spine & safety (now)

- **Security review discipline:** Use **`docs/operations/SECURITY_REVIEW_CHECKLIST.md`** for any change to authentication, cookies/sessions, `api/`, `lib/server/`, `lib/cmp/` authorization, Prisma schema/migrations, ingest/forward/HMAC, or open redirects. **Incident / key rotation start:** **`docs/runbooks/SECURITY_OR_INCIDENT.md`**.
- **Change Console / Approve build credits:** **`tenant_personas`** holds **`token_credit_balance_usd`** and **`billing_exempt`** (one indexed row per tenant; single DB read per request). Optional env **`CORPFLOW_BILLING_EXEMPT_TENANT_IDS`** ORs with the DB flag. Run **`ensure-schema`** after deploy to add the column; **`corpflowai`** is idempotently set exempt when that row exists. See **`docs/operations/TOKEN_CREDITS_AND_APPROVE_BUILD.md`** and `npm run topup:tenant-tokens -- --tenant=... --billing-exempt=true`.
- **Postgres provider (canonical):** Production data store is **Neon** (https://neon.tech) accessed via Prisma ORM. Six Vercel env keys point at the same Neon project (`POSTGRES_URL` + 5 aliases). Anyone touching DB env vars or diagnosing a connectivity issue: read **`docs/operations/POSTGRES_PROVIDER.md`** first (also documents the 2026-05-22 incident where Production was stuck on the defunct Prisma Postgres host).
- **Postgres tables (once per prod DB):** `POST /api/factory/postgres/ensure-schema` with factory master auth — step-by-step: `docs/operations/ENSURE_POSTGRES_SCHEMA.md`.
- **Tenant forgot-password email (you / ops):** Production needs at least one delivery path (see `GET /api/factory/health` → `password_reset_delivery`). Canonical recipe: **`docs/n8n/password-reset-email-recipe.md`**.
- **Outbound email / communications (canonical):** All CorpFlow-originated outbound email goes through **one disciplined path** — server-side event → optional human approval → n8n Webhook (Gmail OAuth) → evidence. Event catalog, sender aliases (`support@`, `info@`, `sales@`, `help@`), approval policy, and tracker shape (`34_Communication_Event_Register` / `37_Communication_Review_Dashboard` — **not** `02_Drive_Migration_Manifest`) are frozen in **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`**. Phase 1 live: `password_reset` only. Anyone adding a new outbound event reads that doc first.
  - **(Preferred — n8n + Gmail OAuth)** Set Vercel env `N8N_EMAIL_WEBHOOK_URL` (n8n Webhook **Production URL**), `N8N_EMAIL_WEBHOOK_SECRET` (≥32 chars; sent as `x-corpflow-email-secret`), and `EMAIL_FROM=support@corpflowai.com`. n8n Gmail node sends from the verified `support@corpflowai.com` alias. Payload schema: `corpflow.email.password_reset.v1`.
  - **(Alternative — Resend)** Verify your sending domain in Resend; set `CORPFLOW_PASSWORD_RESET_RESEND_API_KEY` + `CORPFLOW_PASSWORD_RESET_FROM_EMAIL`.
  - **(You)** Set `CORPFLOW_PUBLIC_BASE_URL` to the exact HTTPS origin users open for login (e.g. `https://lux.corpflowai.com`) so `reset_url` is correct behind proxies.
  - **(Legacy fallback)** Older deployments may still use `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL` / `CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET`; the server reads these as fallbacks for the new names. New tenants should use the `N8N_EMAIL_*` names.
  - **(You)** Confirm **non-prod** never uses `CORPFLOW_PASSWORD_RESET_DEBUG_RETURN_TOKEN=true` in Vercel Production.
- [x] **Vercel — ingest:** set `CORPFLOW_AUTOMATION_INGEST_SECRET` (header `x-corpflow-automation-secret` on `POST /api/automation/ingest`). *(Done per production `GET /api/factory/health` → `automation.ingest_secret_configured: true`.)*
- **(Optional)** `CORPFLOW_AUTOMATION_APPROVAL_SECRET` for high-risk event types — *still unset in that health snapshot (`approval_secret_configured: false`); add when you use gated ingest event types.*
- [x] **Vercel → n8n (“max n8n”, optional but recommended):** set `CORPFLOW_AUTOMATION_FORWARD_URL` to your **n8n Webhook** production URL. Set `CORPFLOW_AUTOMATION_FORWARD_SECRET` to a random string; in n8n, validate header `**x-corpflow-automation-forward-secret`** matches (see `docs/n8n/automation-forward-recipe.md`). Triggers on ingest + CMP mirror events (`cmp.ticket.created`, `cmp.estimate.recorded`, `cmp.build.approved`, `cmp.github.callback`, etc.). *(Confirmed in health snapshot: `forward_url_configured: true`.)*
- [x] **n8n workflow:** implement branches from `docs/n8n/automation-forward-recipe.md` (e.g. log + notify on `cmp.build.approved` / `cmp.github.callback`).
- [x] **`MASTER_ADMIN_KEY` custody / break-glass:** Primary holder: **you (operator)**. Written record (secrets stay out of git): local OneDrive file `Documents/Visibili-t/CorpFlowAI/Admin/API and Vital other Codes.txt` on your workstation. **Never** commit that file; rotate `MASTER_ADMIN_KEY` in Vercel if the laptop or file is exposed. *(Optional next step: name a backup person + shared password-manager copy if the team grows.)*
- **Stuck CMP sandbox dispatches (you / ops):** Tickets can sit in **Approved / Build** with `dispatch_ok !== true` when GitHub env was missing at approve time. Repair from a trusted machine with prod DB + repo secrets (does **not** re-debit credits):
  - **(You)** `POSTGRES_URL` + `CMP_GITHUB_TOKEN` (or `GH_WORKFLOW_TOKEN` / `GITHUB_TOKEN`) + `GITHUB_REPO=owner/repo` (or `CMP_GITHUB_REPOSITORY`) in the shell, same values as Vercel Production.
  - **(You)** Optional: `CMP_SANDBOX_BASE_REF` if not `main`.
  - Dry-run: `npm run cmp:repair-sandbox` (or `node scripts/cmp-repair-stuck-sandbox.mjs`). Execute: `npm run cmp:repair-sandbox:execute`.
  - **(You)** Confirm GitHub Actions workflow `**.github/workflows/cmp-branch.yml`** exists and is enabled; PAT has rights to trigger `repository_dispatch` for `cmp_sandbox_start`.

## P1 — Execution off laptop (see `docs/EXECUTION_BRAIN_VS_HANDS.md`)

- Scheduled **GitHub Action** `.github/workflows/factory-health-ping.yml` (Mondays UTC).
- Set GitHub repo secret `**CORPFLOW_FACTORY_HEALTH_URL`** = **full** health URL, e.g. `https://corpflowai.com/api/factory/health`, so the ping hits prod.
  - **Vercel (Technical Lead):** you may set the **same string** in `CORPFLOW_FACTORY_HEALTH_URL` / `FACTORY_HEALTH_URL` — the observer accepts **origin** or **full** `/api/factory/health` (no double path). See `docs/VERCEL_DEPLOYMENT.md`.
  - **Reminder:** If you **split DNS, traffic, or deployments** (e.g. apex vs `core.`* on different projects, edge proxies, regional routing), **revisit this secret** — update it (or add a second check) so CI still monitors the URL that matters. See `docs/EXECUTION_BRAIN_VS_HANDS.md` § Factory health URL.
- **(Recommended)** **Domain routing guard** (every 6h): set `**CORPFLOW_TENANT_CLIENT_BASE_URL**` = `https://lux.corpflowai.com` (no trailing slash) so CI fails if the **tenant Production hostname** returns Vercel NOT_FOUND while Preview still works. See **`docs/operations/PRODUCTION_AUTODEPLOY_AND_DOMAINS.md`**.
- **Technical Lead (observer + Change Console):** daily cron + Postgres `technical_lead_audits`; `/change` **Factory oversight** + `GET ...?action=technical-lead-latest&id=` (tenant-scoped). Config `config/technical-lead-checklist.v1.json`; optional LLM rephrase env in `.env.template`. Ops: `docs/VERCEL_DEPLOYMENT.md`, `npm run technical-lead:run`. **Align:** `POSTGRES_URL` GitHub secret for CI migrate; cron Bearer = `CORPFLOW_CRON_SECRET` / `CRON_SECRET`; `VERCEL_*` for preview evidence.
- **(Optional)** Enable **[Cursor Bugbot](https://cursor.com/docs/bugbot#setup)** (free tier) on the repo — complements CI + Technical Lead; does not replace DB evidence.
- Add **protected** Vercel route or cron (existing `vercel.json` crons) for periodic tasks you want without opening the laptop.
- [x] Decide n8n hosting: same host 24/7 vs trigger-only; ensure `CORPFLOW_AUTOMATION_FORWARD_URL` is reachable from Vercel. *(Factory health reports `automation.forward_url_configured: true`.)*
- (Optional GCP) Cloud Scheduler → HTTPS to factory endpoint with shared secret (uses existing Google Cloud account).

### Self-hosted ops stack v1 (Phase 1 baseline) — **canonical:** `docs/operations/SELF_HOSTED_OPS_STACK_V1.md`

The self-hosted ops server runs **supporting services** alongside the existing CorpFlow production app — it does **not** replace it. CorpFlow remains **one production Next.js app + one production Postgres via `POSTGRES_URL`** (Neon, see `docs/operations/POSTGRES_PROVIDER.md`).

- [ ] **Step 1 — n8n automation-forward verification (evidence).** Confirm `POST /api/automation/ingest` with `event_type: ops.self_hosted.test.v1` is accepted, written to `automation_events`, visible via factory-only `GET /api/automation/events`, and reaches n8n when `CORPFLOW_AUTOMATION_FORWARD_URL` is configured — without leaking any secret. Checklist + placeholder commands: `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 2.5. Channel separation rule (automation-forward vs `N8N_EMAIL_WEBHOOK_URL` outbound email) must be preserved.
  - **(Phase 1A — PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED on 2026-06-17, `JE-2026-06-17-1`; supersedes `JE-2026-06-16-4`'s PARTIAL-CONSUMER-CONFIRMATION § 7.3 wording).** Operator evidence captured 2026-06-16T23:36:34Z at `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.1 / § 7.2 / § 7.3. **§ 7.1 ingest PASS** — `POST /api/automation/ingest` returned 200 accepted for `ops.self_hosted.test.v1` (idempotency key `self-hosted-ops-stack-v1-step-1-20260616-233629`; event id prefix `cmqha6wi…`). **§ 7.2 automation_events read-back PASS** — factory-only `GET /api/automation/events` returned 200; row matched on `idempotencyKey` (operator used camelCase-safe read-back script — live API returns camelCase fields, not snake_case; evidence-script adjustment only, not a product failure). **§ 7.3 n8n consumer PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED** — n8n execution #1124 body view confirms forwarded payload matches § 7.1 / § 7.2 (`event_type: ops.self_hosted.test.v1`, id `cmqha6wi…`, source, payload fields); workflow forward-secret validation node/path **not** independently confirmed inside n8n execution detail. **Verdict: PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED — Step 1 is NOT marked COMPLETE.** Remaining item: confirm forward-secret validation node/path passed (or equivalent auditable non-secret mechanism). L1 public probes from 2026-06-15 remain valid (§ 2). No secrets in repo. Step 3 (restic) still held on explicit authorization despite Step 2 = COMPLETE.
- [x] **Step 2 — Uptime Kuma monitor evidence.** Stand up Uptime Kuma on the self-hosted ops server with monitors for `<PRODUCTION_ORIGIN>/api/factory/health`, `<PRODUCTION_ORIGIN>/change`, at least one `<CLIENT_ORIGIN>/`, and `<N8N_ORIGIN>/` — plus a verified test alert via Kuma's primary channel (Telegram or email) that does **not** depend on n8n (no circular dependency for critical outage). Checklist: `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3.3. Kuma is complementary to the in-repo 12-monitor architecture (`docs/operations/MONITORING_ARCHITECTURE.md`), not a replacement.
  - **(Phase 1A — COMPLETE-WITH-N8N-DEFERRED → COMPLETE on 2026-06-16, `JE-2026-06-16-3`, supersedes `JE-2026-06-16-2`'s with-n8n-deferred caveat).** Sub-probe 8 (n8n `/healthz`) added by Anton inside Kuma's UI through the SSH tunnel later same day after canonical n8n v1.x anonymous health endpoint URL family was confirmed; sub-probe Up at 60 s; Telegram alert path test-confirmed for sub-probe 8 specifically. **All 8 sub-probes Up.** Earlier same day (PR #373 / `JE-2026-06-16-2` merged 2026-06-16T07:01:15Z at `a9157216`): Anton ran `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` end-to-end at L3 on `corpflow-exec-01-u69678`. Monitor # 13 is **active** in `docs/operations/MONITORING_ARCHITECTURE.md` § 11.1; pinned image `louislam/uptime-kuma:1.23.13`; container `uptime-kuma` `Up (healthy)`; loopback bind `127.0.0.1:3001->3001/tcp` confirmed; off-box public-internet curl from operator laptop returned `curl: (28) Connection timed out after 8016 milliseconds` (canonical K2 PASS); test Telegram alert delivered via Kuma's own BotFather bot (separate token from in-repo `TELEGRAM_BOT_TOKEN`, credentials in operator's Infisical vault); ERPNext sandbox + production-shell containers untouched. **K1=PASS / K2=PASS / K3=PASS / K4=PASS / K5=PASS-BY-CONSTRUCTION** (n8n is not in any alert path — § 9.2 SMTP and § 9.3 n8n forwarding both not-configured for v1; sub-probe 8 monitors n8n's *availability* but its alert routes around n8n entirely). **Blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 (no third-location uptime monitoring) is now CLOSED end-to-end** for all eight surfaces (seven CorpFlow public floor URLs + n8n `/healthz`). Sub-probe 8 add does **not** widen the § 5.5 carve-out — it is a Kuma UI configuration change inside the existing carve-out (no new container, no new port, no new auth, no new env var, no `.env` change, no n8n migration). The probe targets the canonical n8n v1.x anonymous health endpoint (`/healthz`) — **not** the production webhook ingest path (`<n8n-host>/webhook/automation-forward`), which is state-mutating and forbidden per runbook § 8.5 anti-pattern guard. URL family operator-confirmed; URL itself recorded only inside Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`, never in this repo per runbook § 12.2. Evidence captured at `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.4 (no secrets, no tokens, no chat ids per runbook § 12.2). **Earlier history:** authorization round (PR #367, `JE-2026-06-15-1`) merged 2026-06-15. The install runbook `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` was authored at L1 by Cursor (PR #370, `JE-2026-06-16-1`, merged 2026-06-16T03:47:12Z). Install closure was PR #373 (`JE-2026-06-16-2`, merged 2026-06-16T07:01:15Z at `a9157216`). This row's final state for Step 2 = **COMPLETE** is recorded by `JE-2026-06-16-3` and the docs-sync PR that ships it. **Carve-out is for Uptime Kuma alone on `corpflow-exec-01-u69678` for third-location monitoring** — does **not** authorize Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, n8n migration, public port exposure, or any second container.
- [ ] **Step 3 — restic backup and restore discipline (fully eligible 2026-06-16; not initiated).** Step 2 gate is **fully** satisfied — Step 2 = COMPLETE end-to-end. Step 1 = **PAYLOAD-CONFIRMED / SECRET-VALIDATION-IMPLIED** (`JE-2026-06-17-1`; supersedes `JE-2026-06-16-4` § 7.3 partial wording) — producer ingest PASS + DB read-back PASS + n8n execution payload confirmed in body view; forward-secret validation node/path not independently confirmed. Step 3 author-time can choose strict gate (Step 1 = COMPLETE) or pragmatic gate with Step 1 forward-secret caveat. Step 3 **not** initiated — Anton explicitly directed *"Do not proceed to restic"* until separate authorization. Constraints in `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 4. Restore drills must target a **disposable directory or disposable server path** — never production volumes, never the production Postgres.
  - **(Phase 1A — PARTIAL-CONSUMER-CONFIRMATION on 2026-06-16, `JE-2026-06-16-4`).** Operator evidence captured 2026-06-16T23:36:34Z at `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.1 / § 7.2 / § 7.3. **§ 7.1 ingest PASS** — `POST /api/automation/ingest` returned 200 accepted for `ops.self_hosted.test.v1` (idempotency key `self-hosted-ops-stack-v1-step-1-20260616-233629`; event id prefix `cmqha6wi…`). **§ 7.2 automation_events read-back PASS** — factory-only `GET /api/automation/events` returned 200; row matched on `idempotencyKey` (operator used camelCase-safe read-back script — live API returns camelCase fields, not snake_case; evidence-script adjustment only, not a product failure). **§ 7.3 n8n consumer PARTIAL / STRONGLY INDICATED** — n8n execution #1124 succeeded at matching timestamp (6 ms, workflow version `90e75d5c`); `incoming_event_type` and `forward_secret_header_validated` **not** independently inspected inside n8n execution detail (operator could not safely locate internal execution input/body in n8n UI this round). **Verdict: PARTIAL-CONSUMER-CONFIRMATION — Step 1 is NOT marked COMPLETE.** To reach COMPLETE: future round must independently confirm event payload inside n8n execution detail and forward-secret validation (or equivalent auditable check). L1 public probes from 2026-06-15 remain valid (§ 2). No secrets in repo. Step 3 (restic) still held on explicit authorization despite Step 2 = COMPLETE.
- [x] **Step 2 — Uptime Kuma monitor evidence.** Stand up Uptime Kuma on the self-hosted ops server with monitors for `<PRODUCTION_ORIGIN>/api/factory/health`, `<PRODUCTION_ORIGIN>/change`, at least one `<CLIENT_ORIGIN>/`, and `<N8N_ORIGIN>/` — plus a verified test alert via Kuma's primary channel (Telegram or email) that does **not** depend on n8n (no circular dependency for critical outage). Checklist: `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3.3. Kuma is complementary to the in-repo 12-monitor architecture (`docs/operations/MONITORING_ARCHITECTURE.md`), not a replacement.
  - **(Phase 1A — COMPLETE-WITH-N8N-DEFERRED → COMPLETE on 2026-06-16, `JE-2026-06-16-3`, supersedes `JE-2026-06-16-2`'s with-n8n-deferred caveat).** Sub-probe 8 (n8n `/healthz`) added by Anton inside Kuma's UI through the SSH tunnel later same day after canonical n8n v1.x anonymous health endpoint URL family was confirmed; sub-probe Up at 60 s; Telegram alert path test-confirmed for sub-probe 8 specifically. **All 8 sub-probes Up.** Earlier same day (PR #373 / `JE-2026-06-16-2` merged 2026-06-16T07:01:15Z at `a9157216`): Anton ran `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` end-to-end at L3 on `corpflow-exec-01-u69678`. Monitor # 13 is **active** in `docs/operations/MONITORING_ARCHITECTURE.md` § 11.1; pinned image `louislam/uptime-kuma:1.23.13`; container `uptime-kuma` `Up (healthy)`; loopback bind `127.0.0.1:3001->3001/tcp` confirmed; off-box public-internet curl from operator laptop returned `curl: (28) Connection timed out after 8016 milliseconds` (canonical K2 PASS); test Telegram alert delivered via Kuma's own BotFather bot (separate token from in-repo `TELEGRAM_BOT_TOKEN`, credentials in operator's Infisical vault); ERPNext sandbox + production-shell containers untouched. **K1=PASS / K2=PASS / K3=PASS / K4=PASS / K5=PASS-BY-CONSTRUCTION** (n8n is not in any alert path — § 9.2 SMTP and § 9.3 n8n forwarding both not-configured for v1; sub-probe 8 monitors n8n's *availability* but its alert routes around n8n entirely). **Blind spot # 7 of `MONITORING_ARCHITECTURE.md` § 6 (no third-location uptime monitoring) is now CLOSED end-to-end** for all eight surfaces (seven CorpFlow public floor URLs + n8n `/healthz`). Sub-probe 8 add does **not** widen the § 5.5 carve-out — it is a Kuma UI configuration change inside the existing carve-out (no new container, no new port, no new auth, no new env var, no `.env` change, no n8n migration). The probe targets the canonical n8n v1.x anonymous health endpoint (`/healthz`) — **not** the production webhook ingest path (`<n8n-host>/webhook/automation-forward`), which is state-mutating and forbidden per runbook § 8.5 anti-pattern guard. URL family operator-confirmed; URL itself recorded only inside Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`, never in this repo per runbook § 12.2. Evidence captured at `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7.4 (no secrets, no tokens, no chat ids per runbook § 12.2). **Earlier history:** authorization round (PR #367, `JE-2026-06-15-1`) merged 2026-06-15. The install runbook `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` was authored at L1 by Cursor (PR #370, `JE-2026-06-16-1`, merged 2026-06-16T03:47:12Z). Install closure was PR #373 (`JE-2026-06-16-2`, merged 2026-06-16T07:01:15Z at `a9157216`). This row's final state for Step 2 = **COMPLETE** is recorded by `JE-2026-06-16-3` and the docs-sync PR that ships it. **Carve-out is for Uptime Kuma alone on `corpflow-exec-01-u69678` for third-location monitoring** — does **not** authorize Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, n8n migration, public port exposure, or any second container.
- [ ] **Step 3 — restic backup and restore discipline (fully eligible 2026-06-16; not initiated).** Step 2 gate is **fully** satisfied — Step 2 = COMPLETE end-to-end. Step 1 = **PARTIAL-CONSUMER-CONFIRMATION** (`JE-2026-06-16-4`) — producer ingest PASS + DB read-back PASS + n8n execution strongly indicated at matching timestamp; consumer payload/forward-secret not independently verified inside n8n execution detail. Step 3 author-time can choose strict gate (Step 1 = COMPLETE) or pragmatic gate with Step 1 partial caveat. Step 3 **not** initiated — Anton explicitly directed *"Do not proceed to restic"* until separate authorization. Constraints in `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 4. Restore drills must target a **disposable directory or disposable server path** — never production volumes, never the production Postgres.

## P1 — Tenant surfaces (DB-driven, low drama → high leverage)

**Canonical (host / apex / login routes):** `docs/operations/TENANT_CLIENT_LOGIN.md` — read this **before** changing host mapping, `/login`, or `/api/tenant/site` (agents: same path; don’t rely on `artifacts/` alone).

**Extended narrative / rubric:** `artifacts/firm_request_db-driven-staged-path.md` (factory vs brain, Luxe login ops) — supplementary to the operations doc above.

- **Unify tenant site read** — one server helper for merged `{ tenant, site }` used by Next `getServerSideProps` and `GET /api/tenant/site`.
- **Cache public reads** — `Cache-Control` (and optional `ETag`) on `GET /api/tenant/site` for anonymous traffic.
- **Prisma / Postgres pooling** — align serverless client usage with Neon guidance (pooled vs non-pooled endpoints already enumerated in `docs/operations/POSTGRES_PROVIDER.md`; document any chosen pooling pattern there or in `CONTEXT.md`).
- (Optional) **ISR / edge** for tenant `/` when draft staleness is acceptable.

## P1 — AI provision & Change Console

- Factory HTML tail for `GET /api/automation/events` (operator view without curl).
- One **golden-path** vertical script: tenant + hostname + smoke ticket (extend `scripts/onboard-demo-tenants.ps1` pattern).
- Playbook seed: 3× `automation.playbook.upsert` via ingest (password reset, CMP forward, tenant onboarding).

## P1 — Automated tenant / prospect onboarding

- **(You)** Map **DNS + Vercel domains** for each new `tenant_hostnames` host (bootstrap only writes Postgres; traffic still needs your edge config).
- **(You)** Choose automation auth: factory master, `**CORPFLOW_TENANT_BOOTSTRAP_SECRET`** + header `x-corpflow-tenant-bootstrap-secret` on `POST /api/factory/tenant/bootstrap`, and/or `**CORPFLOW_AUTOMATION_TENANT_BOOTSTRAP=true`** + `CORPFLOW_AUTOMATION_INGEST_SECRET` for `event_type: tenant.bootstrap.execute` (see `lib/cmp/README.md` — Tenant onboarding).
- **(You)** Store **PIN / generated password** from the API response immediately (shown once); wire n8n to email the client or hand off via secure channel.
- **(Optional)** After `POST /api/tenant/intake` leads, run bootstrap with `**convert_lead_ids`** to mark rows `CONVERTED` (review leads in `GET /api/admin-leads` first).
- **(You)** Self-serve **public** “create my org” without factory secrets is **not** implemented by design — if you need it, specify trust model (payments, domain proof, manual approval).

## P2 — Websites & marketing (no new spend first)

- Single **marketing** source of truth: which pages are static on Vercel vs CMS later.
- Analytics: Plausible self-host later **or** GA4 on Workspace/GCP — pick one; add env + privacy note.
- Contact / lead form → existing `N8N_WEBHOOK_URL` path documented in one place.

## P2 — Sales & payments (when you’re ready)

- Payment provider choice (Stripe vs Paystack vs invoice-only) — **not** implemented until policy set.
- Map “token credits” / CMP debits to real invoices (manual first, automate later).
- DPA + data residency note for EU/Africa clients if needed — maintain **`docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`** (starter data map + subprocessor table) with legal/commercial review.

## P2 — Google Workspace / GCP (paid, already owned)

- SMTP relay or send connector for **transactional** mail (alerts, non–password-reset); password reset can use **Resend** or **n8n webhook** (see P0 password reset checklist above).
- Optional: Secret Manager for rotation-heavy secrets (parallel to Vercel env).

---

## Done (archive)

- Automation spine: ingest, playbooks, risk gate, CMP mirror, `GET /api/automation/events`.
- Docs: `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`, `docs/agent-integration-search-policy.md`.

---

*Last reviewed: 2026-04-04 — update this line when you change priorities. Added security checklist, incident runbook, ADR-lite `docs/decisions/`, compliance data-map stub, CI `npm audit` + `next build`, Dependabot.*
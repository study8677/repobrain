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
  - **(Phase 1A — IN PROGRESS, PARTIAL).** L1 public probes captured 2026-06-15: seven production floor URLs all 200; producer-side wiring confirmed via `/api/factory/health` (`automation.ingest_secret_configured: true`, `automation.forward_url_configured: true`, `automation.cmp_mirror_enabled: true`) and `core.database_reachable: true` via production-pulse. Operator-side recipes (ingest + factory-only events read-back, with redaction rules) drafted in `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 3 / § 4 / § 7. Awaiting operator to run them and paste redacted evidence into § 7.1 / § 7.2 / § 7.3 of that artifact.
- [ ] **Step 2 — Uptime Kuma monitor evidence.** Stand up Uptime Kuma on the self-hosted ops server with monitors for `<PRODUCTION_ORIGIN>/api/factory/health`, `<PRODUCTION_ORIGIN>/change`, at least one `<CLIENT_ORIGIN>/`, and `<N8N_ORIGIN>/` — plus a verified test alert via Kuma's primary channel (Telegram or email) that does **not** depend on n8n (no circular dependency for critical outage). Checklist: `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3.3. Kuma is complementary to the in-repo 12-monitor architecture (`docs/operations/MONITORING_ARCHITECTURE.md`), not a replacement.
  - **(Phase 1A — AUTHORIZED-PENDING-INSTALL → INSTALL-RUNBOOK-AUTHORED-PENDING-OPERATOR-EXECUTION on 2026-06-16).** The authorization round (PR #367, `JE-2026-06-15-1`) merged 2026-06-15. The install runbook follow-up `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` is now authored at L1 by Cursor (`JE-2026-06-16-1`) — 14 sections; operator-paste shell blocks; pinned image `louislam/uptime-kuma:1.23.13`; loopback bind `127.0.0.1:3001` only; SSH-tunnel-only UI access (`ssh -L 3001:localhost:3001 anton@5.78.213.185`); K1–K5 verification block; § 12 evidence template; § 13 closure update points. **No L3 commands typed by Cursor.** Closure flip to COMPLETE happens after Anton runs § 5–§ 11 of the runbook at L3 and K1–K5 all PASS, then a docs-only closure PR carries the § 12 evidence + a fresh `JE-YYYY-MM-DD-N` row. The full § 10 gate remains satisfied in `docs/decisions/20260615-uptime-kuma-on-exec01.md` (ADR) + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (packet — `MIGRATION_TO_SERVER_CHECKLIST.md` § 2 every checkbox addressed inline at § 6) + `docs/operations/MONITORING_ARCHITECTURE.md` § 2 Monitor # 13 row + § 11.1 status row + § 11.2 `kuma-on-exec01-install` follow-up + `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 named-narrow carve-out + § 6 row clarifier + `AGENTS.md` Must-read row + `JE-2026-06-15-1` + `JE-2026-06-16-1`. **Carve-out is for Uptime Kuma alone on `corpflow-exec-01-u69678` for third-location monitoring** — does **not** authorize Chatwoot, Open WebUI, Coolify, Langfuse, AgentSpan, OpenJarvis, generic chatbot, generic agent framework, or any second container. **The install runbook does not widen this carve-out** (`UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`) — § 1.4 of the runbook is a 16-row scope checklist that maps 1:1 onto the user-stated boundaries from PR #367 (Uptime Kuma only / `corpflow-exec-01-u69678` only / single container / `127.0.0.1:3001` only / no public port / no DNS / no reverse proxy / SSH tunnel UI only / no client data / no production DB access / no app/runtime code change / no `.env` change / no restic / no other self-hosted tool / no second app / no second DB). On operator L3 execution + K1–K5 PASS per § 11 of the runbook (mirrors `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` § 9), Step 2 flips INSTALL-RUNBOOK-AUTHORED-PENDING-OPERATOR-EXECUTION → COMPLETE via the closure PR per § 13 of the runbook.
- [ ] **Step 3 — restic backup and restore discipline (gated).** Do **only after** Steps 1 and 2 above are present, verified, and the evidence is recorded. Step 3 is **not** authored in this baseline; the gate and constraints are in `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 4. Restore drills must target a **disposable directory or disposable server path** — never production volumes, never the production Postgres.

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
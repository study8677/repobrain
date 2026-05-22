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

## P1 — Tenant surfaces (DB-driven, low drama → high leverage)

**Canonical (host / apex / login routes):** `docs/operations/TENANT_CLIENT_LOGIN.md` — read this **before** changing host mapping, `/login`, or `/api/tenant/site` (agents: same path; don’t rely on `artifacts/` alone).

**Extended narrative / rubric:** `artifacts/firm_request_db-driven-staged-path.md` (factory vs brain, Luxe login ops) — supplementary to the operations doc above.

- **Unify tenant site read** — one server helper for merged `{ tenant, site }` used by Next `getServerSideProps` and `GET /api/tenant/site`.
- **Cache public reads** — `Cache-Control` (and optional `ETag`) on `GET /api/tenant/site` for anonymous traffic.
- **Prisma / Postgres pooling** — align serverless client usage with Neon/Vercel guidance (document chosen pattern in `CONTEXT.md` or ops doc).
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
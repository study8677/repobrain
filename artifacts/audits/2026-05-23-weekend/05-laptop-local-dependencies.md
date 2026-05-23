# Audit 05 — Laptop / local dependencies inventory

**Date:** 2026-05-23
**Mode:** Read-only repo inventory of operator-runnable scripts and their dependencies on local-only state.
**Packet:** corresponds to `WEEKEND_EXECUTION_QUEUE.md` Packet 1.5.

---

## Scope

In:

- All scripts under `scripts/` (Node `.mjs` and PowerShell `.ps1`).
- Whether each script depends on:
  - **A local secret** — env values that today live only in `.env.local` on Anton's laptop.
  - **A local credential** — browser session, OAuth refresh token, OS credential store.
  - **A local path** — Windows-specific paths, profile directories.
  - **A local-only target** — operations that hit `localhost` or only work from a developer machine.
- Whether each script has a **server-side equivalent** today (GitHub Actions, Vercel cron, n8n).

Out:

- Actually running any script.
- Reading `.env.local` values.
- Inferring which secrets the operator currently holds.

---

## Inventory

### PowerShell scripts (Windows-locked by language)

| Script | Purpose | Local dependencies | Already on server? |
|--------|---------|--------------------|---------------------|
| `scripts/onboard-demo-tenants.ps1` | Bootstraps demo tenants via factory master API | `MASTER_ADMIN_KEY` / `ADMIN_PIN` env, `CORPFLOW_PROD_BASE_URL` | **No** — manual operator action |
| `scripts/ensure-postgres-schema.ps1` | POST `/api/factory/postgres/ensure-schema` with factory master auth | `MASTER_ADMIN_KEY` / `ADMIN_PIN`, `CORPFLOW_PROD_BASE_URL` | **Partial** — `vercel-build` runs `apply-ensure-schema-build.mjs` automatically; PS1 is the manual fallback |
| `scripts/provision-luxe-maurice-test-login.ps1` | Provisions a test login for Lux operator | factory master, base URL | **No** — manual operator action |

PowerShell scripts are Windows-specific by language choice. They cannot run on a Linux GitHub Actions runner without rewrite (PowerShell Core *is* available on `ubuntu-latest`, but each script also depends on local env values).

### Node `.mjs` scripts that may run from a laptop today

| Script | Purpose | Local dependencies | Already on server? |
|--------|---------|--------------------|---------------------|
| `scripts/bootstrap-repo-env.mjs` | Loads `.env` + `.env.local` into `process.env` for other scripts | Reads `.env`/`.env.local` from repo root | n/a — utility module only; safe to run server-side because both files are absent there |
| `scripts/factory-control-loop.mjs` (`npm run control:loop`) | Compares local Git tip ↔ GitHub ↔ Vercel Production ↔ factory health; optionally fires deploy hook | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `FACTORY_HEALTH_URL`, optional `VERCEL_DEPLOY_HOOK_URL` | **Partial** — `factory-health-ping.yml` covers health; `vercel-production-deploy-hook.yml` covers deploy hook; the **comparison** is laptop-only |
| `scripts/vercel-env.mjs` (`npm run vercel:env:*`) | Inspects/diffs/pushes Vercel env from a local source-of-truth file | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional Vercel CLI | **No** — operator-only by design (writes touch Vercel env) |
| `scripts/production-pulse.mjs` (`npm run production:pulse`) | Probes production-pulse runtime endpoint | `FACTORY_HEALTH_URL` (or `CORPFLOW_PUBLIC_BASE_URL`) | **Yes** — also exposed at `/api/factory/production-pulse/runtime`, monitored by health workflow |
| `scripts/preview-verify.mjs` | Verifies Vercel Preview deployments for a CMP ticket | `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, `cf_preview` secret | **No** — operator-driven |
| `scripts/technical-lead-run.mjs` (`npm run technical-lead:run`) | Runs the Technical Lead observer locally for a single ticket | `POSTGRES_URL`, GitHub token, factory health | **Yes** — `vercel.json` cron `/api/cron/technical-lead` covers the scheduled path |
| `scripts/cmp-repair-stuck-sandbox.mjs` (`npm run cmp:repair-sandbox*`) | Repairs CMP tickets stuck in sandbox state; `--execute` writes | factory master, GitHub token, `POSTGRES_URL` | **No** — operator-only because `--execute` mutates production data |
| `scripts/audit-cmp-ticket.mjs` | Read-only CMP ticket audit | factory master, `POSTGRES_URL` | **No** — but read-only is fine to keep local |
| `scripts/reconcile-cmp-tickets-with-github.mjs` | Reconciles CMP tickets with GitHub PRs | factory master, GitHub token, `POSTGRES_URL` | **Partial** — `factory-cmp-drive.yml` covers the scheduled drive |
| `scripts/onboard_luxe.js` | Tenant onboarding bootstrap (legacy `.js`) | factory master, base URL | **No** — operator-driven |
| `scripts/lux-ticket-*.mjs` (3 scripts) | One-off Lux ticket annotations | factory master, `POSTGRES_URL` | **No** — but they are intended as one-off operator actions, not standing automation |
| `scripts/core-consolidate-provider-change-tickets.mjs` | One-off consolidation of provider tickets | factory master, `POSTGRES_URL` | **No** — one-off operator action |
| `scripts/cmp-ticket-hard-close.mjs` | Hard-closes a CMP ticket | factory master, `POSTGRES_URL` | **No** — operator-only by design |
| `scripts/force-operator-assisted-ticket.mjs` | Promotes a ticket to operator-assisted | factory master, `POSTGRES_URL` | **No** — operator-only |
| `scripts/set-luxe-maurice-billing-exempt.mjs` (`npm run factory:set-luxe-billing-exempt`) | Sets `billing_exempt=true` on Lux tenant | factory master, `POSTGRES_URL` | **No** — one-shot operator action |
| `scripts/upsert-luxe-maurice-hostnames.mjs` (`npm run factory:upsert-luxe-hosts`) | Upserts Lux tenant hostnames | factory master, `POSTGRES_URL` | **No** — one-shot operator action |
| `scripts/top-up-tenant-token-balance.mjs` (`npm run topup:tenant-tokens`) | Adds wallet credits to a tenant | factory master, `POSTGRES_URL` | **No** — operator-only (touches money) |
| `scripts/provision-tenant-test-access.mjs` (`npm run provision:tenant-test`) | Provisions a tenant test access | factory master, `POSTGRES_URL` | **No** — operator-only |
| `scripts/verify-cmp-env-read.mjs` (`npm run verify:cmp-env`) | Verifies CMP env is read at runtime | factory master, base URL | **No** — read-only, fine to keep local |
| `scripts/telegram-get-chat-id.mjs` | One-off helper to discover Telegram chat IDs | `TELEGRAM_BOT_TOKEN` | **No** — one-off |
| `scripts/smoke-change-console-technical-lead.mjs` (`npm run smoke:change-technical-lead`) | Smoke test for `/change` Technical Lead surface | factory master | **Partial** — could run as a CI smoke job |
| `scripts/smoke-lux-phase4c1-attachment-review.mjs` (`npm run smoke:lux-phase4c1`) | Smoke test for Lux phase 4C.1 attachments | factory master, base URL | **Partial** — could run as a CI smoke job |
| `scripts/backfill_ops_data_to_postgres.mjs` | Backfill helper (legacy / migration) | factory master, `POSTGRES_URL` | **No** — manual one-off |
| `scripts/run-node-tests.mjs` (`npm test`) | Runs the Node test suite | none beyond Node | **Yes** — CI runs `npm test` |
| `scripts/validate-vercel-hobby-crons.mjs` (`npm run verify:vercel-hobby-crons`) | Validates `vercel.json` crons | none | **Yes** — CI runs it |
| `scripts/ci-friendly-report.mjs` (`npm run ci:report`) | CI-friendly status report | factory health URL | **Yes** — CI uses it |
| `scripts/apply-ensure-schema-build.mjs` | Idempotent DDL applied at Vercel build time | `POSTGRES_URL` (or non-pooling) | **Yes** — runs in `vercel-build` |
| `scripts/ensure-next-routes-manifest-deterministic.mjs` | Build-time route manifest stability | none | **Yes** — runs in `vercel-build` |

---

## Findings

1. **The "must-be-Anton" set is small.** The scripts that genuinely need Anton's laptop today are the ones that:
   - Hold the factory master credential (`MASTER_ADMIN_KEY` / `ADMIN_PIN`).
   - Mutate production data (`cmp-repair-sandbox --execute`, `set-luxe-maurice-billing-exempt`, `top-up-tenant-token-balance`, `cmp-ticket-hard-close`, `force-operator-assisted-ticket`, `upsert-luxe-maurice-hostnames`).
   - Edit Vercel env (`vercel-env.mjs push`).

   These are **correctly laptop-locked** under `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3 — they cross billing, tenant migration, secret, and DNS gates.

2. **The "should be on server, but isn't yet" set is the migration target.** Scripts that are scheduled by intent but not yet on a server cron:
   - `scripts/factory-control-loop.mjs` — partial coverage via `factory-health-ping.yml`; the **commit ↔ deployment ↔ health** comparison is laptop-only.
   - `scripts/reconcile-cmp-tickets-with-github.mjs` — partial coverage via `factory-cmp-drive.yml`.
   - `scripts/smoke-change-console-technical-lead.mjs` and `smoke-lux-phase4c1-attachment-review.mjs` — would be useful as scheduled smokes.

3. **The "operator-only by design" set is fine where it is.** Scripts like `audit-cmp-ticket.mjs` and `verify-cmp-env-read.mjs` are read-only diagnostic tools an operator runs ad hoc; they do not need a server cron.

4. **The "one-off" set should not be migrated.** Scripts like `lux-ticket-*.mjs`, `core-consolidate-provider-change-tickets.mjs`, `backfill_ops_data_to_postgres.mjs`, and `set-luxe-maurice-billing-exempt.mjs` are by definition one-off operator actions; they do not belong on a recurring schedule.

5. **PowerShell-only scripts are Windows-coupled.** `onboard-demo-tenants.ps1`, `ensure-postgres-schema.ps1`, and `provision-luxe-maurice-test-login.ps1` work on the Anton-laptop today. PowerShell Core can run on Linux runners, but cleaner is to port the operator-runnable ones to `.mjs` so they share the existing Node tooling.

6. **`bootstrap-repo-env.mjs` discipline is sound.** Every Node script that reads `process.env` imports `bootstrap-repo-env.mjs` first; on a server the `.env`/`.env.local` files are absent and the script falls through to actual env, which is the right behavior.

---

## Off-laptop migration candidates (P0–P2)

| Severity | Item | Proposed off-laptop home |
|---------|------|--------------------------|
| **P0** | `factory-control-loop` Git↔deploy SHA comparison | GitHub Action that runs `npm run control:loop -- --fetch` daily and posts to `automation_events` if mismatch |
| **P1** | `smoke-change-console-technical-lead` | GitHub Action scheduled smoke (read-only against production) |
| **P1** | `smoke-lux-phase4c1-attachment-review` | GitHub Action scheduled smoke (read-only against production) |
| **P2** | `ensure-postgres-schema.ps1` | Either deprecate (Vercel build already runs `apply-ensure-schema-build.mjs`) or port to `.mjs` for cross-platform parity |
| **P2** | `onboard-demo-tenants.ps1` | Port to `.mjs` so it can run from any operator machine |
| **P2** | `provision-luxe-maurice-test-login.ps1` | Port to `.mjs` |

---

## Gaps for Anton to confirm

- Whether any of the scripts above currently rely on Anton's **local browser session** (rather than env vars) for credentials.
- Whether `MASTER_ADMIN_KEY` should be made available to a GitHub Actions runner via Infisical (to enable read-only smokes that need factory master), or kept laptop-only.

---

## Verdict

**INVENTORIED.** Three P0/P1 off-laptop migration candidates identified, each viable as a docs-only follow-up packet (the migration plan; the actual move would be a non-docs packet that warrants its own approval). **Packet 1.5** can close on this audit; **Packet 1.6** then defines the migration-to-server checklist that those follow-ups will execute against.

No approval gate hit. No script executed. No secret values captured.

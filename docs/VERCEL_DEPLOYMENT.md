# Vercel deployment loop (CorpFlow)

**Customer-facing URLs vs deployments:** Read **`docs/operations/PRODUCTION_AUTODEPLOY_AND_DOMAINS.md`** — one Production spine (`main` → Vercel Production → custom domains). **Luxe Mauritius:** canonical URL is **`https://lux.corpflowai.com/`**; **`luxe.corpflowai.com`** is an optional alias when mapped in Vercel + Postgres (`npm run factory:upsert-luxe-hosts`). Vercel **`404 NOT_FOUND`** on a hostname is almost always **domain / DNS / failed Production deploy** or hostname not on this project — not application routing.

**After a Production deploy succeeds:** verify **live** customer URLs and record **deployment id** + **commit** per **`.cursor/rules/delivery-reality.mdc`** — merge and green CI alone are not operational completion.

## Quick sanity: ensure Vercel is treating this as a Next.js app

There is a failure mode where the hostname hits the right project and serverless rewrites work, but the Next router never serves `/`.

**Symptom:**

- `/` is **Vercel `404: NOT_FOUND`**
- but `/change`, `/login`, and `/api/*` are **200** (because `vercel.json` rewrites those to static HTML and a serverless API entry point)

**Fix:** Vercel → **Project → Settings → Build & Development Settings**

- **Framework Preset** = **Next.js**
- **Output Directory** = *(blank)* (do not set to `public`)
- **Build Command** = default (or `npm run vercel-build`)

Then redeploy **Production** and re-check `GET /` on the tenant hostname (e.g. `https://lux.corpflowai.com/`).

## What broke production before (Hobby plan)

Vercel **Hobby** rejects projects whose `vercel.json` **crons** run **more than once per day**. A schedule like `*/20 * * * *` caused **every** production deploy to fail at config time — including Git-triggered builds — so `main` moved forward while production stayed on an old commit.

**Fix:** each cron must use a **fixed minute and fixed hour** (e.g. `0 4 * * *`). See current `vercel.json`.

## Guards (so it does not happen again)

| Check | When |
|--------|------|
| `npm run verify:vercel-hobby-crons` | Local / CI; exits non-zero if `vercel.json` crons are not Hobby-safe |
| `npm run control:loop` | Includes a **Hobby cron** section; exits **1** if crons are invalid (override: `VERCEL_ALLOW_SUBDAILY_CRONS=1` on **Pro** with sub-daily crons) |
| GitHub **Agent CI** | Runs the cron guard on every push/PR to `main` |

`npm run verify:ci` runs the cron guard, then tests, then `next build`.

## Operational loop

1. **`npm run verify:vercel-hobby-crons`** before pushing if you edit `vercel.json`.
2. Push **`main`** → Vercel should build (Git connected) or use **Redeploy** / **deploy hook** (`.github/workflows/vercel-production-deploy-hook.yml`).
3. **`npm run control:loop -- --fetch`** — confirms `origin/main` SHA matches latest **production** deployment and (if env is set) factory health.

## Env loading (local scripts)

Repo-root **`.env`** and **`.env.local`** are loaded automatically by `scripts/bootstrap-repo-env.mjs` when you run Node scripts under `scripts/` (including `control:loop`, `vercel:env:*`, `ci:report`). See `.env.example`.

## Upgrade path (Pro)

If you move to **Pro** and need sub-daily crons, either:

- Loosen schedules in `vercel.json`, **or**
- Set **`VERCEL_ALLOW_SUBDAILY_CRONS=1`** so `control:loop` does not fail on stricter checks (CI still uses the Hobby validator unless you change the workflow).

For **CI** on Pro with sub-daily crons, adjust `.github/workflows/test.yml` or replace the guard with a policy that matches your plan.

## GitHub Actions: `POSTGRES_URL` and Prisma migrate

The **Agent CI** workflow (`.github/workflows/test.yml`) may run **`npx prisma migrate deploy`** when **`POSTGRES_URL`** is present (including when injected by **Infisical OIDC** in the same job).

**Important:** A failed optional migrate (for example Prisma **P3005** on a non-empty, non-baselined database) is **not** treated as an **Infisical or secret-delivery failure**. The migrate step is **`continue-on-error`** so CI still validates secret injection and the rest of the pipeline. Baseline / migration history is a separate operator concern.

Legacy option: store **`POSTGRES_URL`** as a GitHub Actions **repository secret** if you are not using Infisical in CI.

1. In GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
2. Name: **`POSTGRES_URL`**. Value: the same pooled Postgres URL you use on Vercel for this project (Prisma).
3. Optional CLI: `gh secret set POSTGRES_URL` and paste the URL when prompted.

Forks and contributors without `POSTGRES_URL` still pass CI; the step prints a skip message. Nothing in the repo can create this secret for you automatically.

## Vercel env: factory health + Technical Lead + preview matching

Set on the Vercel project (at least **Production**):

| Variable | Purpose |
|----------|---------|
| **`CORPFLOW_FACTORY_HEALTH_URL`** or **`FACTORY_HEALTH_URL`** | **Site origin** (e.g. `https://your-domain.com`) **or** the full health URL `https://your-domain.com/api/factory/health` — Technical Lead normalizes both. Alias: **`CORPFLOW_PUBLIC_BASE_URL`**. **Note:** the GitHub Actions secret for `factory-health-ping.yml` is the **full** health URL; you can paste the same value here and it will not double-append the path. |
| **`VERCEL_TOKEN`** (or **`VERCEL_AUTH_TOKEN`**) + **`VERCEL_PROJECT_ID`** | Vercel REST API for preview deployment status (`promote-status`, Technical Lead observer). |
| **`VERCEL_TEAM_ID`** or **`VERCEL_ORG_ID`** | Required when the project is under a team; must match the project you deploy from GitHub. |
| **`CORPFLOW_TENANT_PREVIEW_SECRET`** | **Required** for signed **`cf_preview=`** links on **`*.vercel.app`** (Change Console “client site preview” URLs). Use the **same** secret in every environment that must verify the token (typically **Production** + **Preview**). See `.env.template` and `docs/operations/TENANT_CLIENT_LOGIN.md`. |

Use the **same** `VERCEL_*` values everywhere you rely on preview lookup. Deployments are correlated to CMP by branch name: Vercel’s **`meta.githubCommitRef`** must equal **`cmp/{ticketId}`**, with **`ticketId` sanitized** the same way as in `lib/cmp/_lib/vercel-preview.js` (characters outside `[A-Za-z0-9._-]` replaced with `_`). If GitHub creates a different ref string, preview rows will not match until the branch naming matches.

## Client-facing preview URLs vs Vercel Deployment Protection

**Symptom:** Opening a preview link (e.g. `https://…vercel.app/?cf_preview=…`) in a **clean browser** or **incognito** shows **“Log in to Vercel”** instead of the tenant site. That is **not** an application bug: **Vercel Authentication** (under **Deployment Protection**) runs **before** traffic hits CorpFlow. `cf_preview` and Postgres never get a chance to run.

**Requirement for Luxe-style client previews:** preview deployments that you send to **non–Vercel users** must be reachable **without** a Vercel account.

**What to do in the Vercel dashboard** (wording may shift slightly in the UI):

1. Open the **corpflow-ai-command-center** project → **Settings**.
2. Go to **Deployment Protection** (sometimes grouped under **Security**).
3. For **Vercel Authentication** (or “Protect deployments with Vercel Authentication”), choose an option that **does not** force anonymous visitors to log in to Vercel for the URLs you share with clients. Typical patterns:
   - Scope protection to **Production only** and leave **Preview** open; **or**
   - Turn **off** Vercel Authentication for **Preview** if your risk tolerance allows (previews are public if someone has the URL); **or**
   - Use Vercel’s **shareable link** / **access** flows if you keep protection on but need a client-safe link (see [Deployment Protection](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication) and [bypass / exceptions](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) in Vercel’s docs).

**Product default for “real” client review:** keep **`https://lux.corpflowai.com`** (or the tenant’s mapped hostname on **Production**) as the primary review surface; use **`*.vercel.app`** only when you accept preview exposure rules above.

**CorpFlow behavior (after merge):** when **`VERCEL_AUTOMATION_BYPASS_SECRET`** is present (Vercel injects it after you add **Protection bypass for automation**), **`client_site_preview_url`** on CMP tickets automatically appends **`x-vercel-protection-bypass`** and **`x-vercel-set-bypass-cookie=true`** for **`*.vercel.app`** URLs only. Refresh the preview link (**Refresh promotion** / **Refresh preview link** on `/change`) after adding or rotating the bypass secret so stored URLs pick it up. Optional alias **`CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET`** is read if the system env is unset (e.g. local scripts). Treat bypass-in-URL like a gate key: rotate in Vercel if leaked.

## Factory: CMP “push to completion” + monitoring

These endpoints exist to keep **client outcomes moving** even when branch/PR evidence is missing or GitHub dispatch stalled.

| Surface | Purpose |
|---------|---------|
| **Factory `POST /api/factory/cmp/push`** | Factory master — loads a CMP ticket, extracts intended outcomes from `cmp_tickets.description`, and safely unblocks the pipeline (repair dispatch + refresh overseer). If outcomes are missing, returns a “needs brain” checklist that starts with `GET /api/cmp/router?action=ticket-get&id=<ticket_id>`. |
| **Cron `GET /api/cron/cmp-monitor`** | Cron auth — monitors a focused set of ticket IDs and runs the same safe unblock logic. Emits `cmp.ticket.push_checked` into `automation_events` as an audit trail. Configure via `CMP_MONITOR_TICKET_IDS` (comma-separated). |

## Technical Lead observer (Phase A)

| Surface | Purpose |
|---------|---------|
| **`GET /api/cron/technical-lead`** | Daily cron (see `vercel.json`); Bearer **`CORPFLOW_CRON_SECRET`** or **`CRON_SECRET`** (set Vercel **`CRON_SECRET`** to the same value so the scheduler sends the header). |
| **Factory `/api/factory/technical-lead/run`** (GET or POST) | Factory master — manual run (`limit`, `ticket_id`, `dry_run`). |
| **`GET /api/factory/technical-lead/audits?ticket_id=`** | Factory master — recent `technical_lead_audits` rows. |
| **Factory `POST /api/factory/github/pr-create`** | Factory master — create/reuse a PR from `head` → `base` using `CMP_GITHUB_TOKEN` + `GITHUB_REPO` (default: draft PR). If `head` is omitted, the factory generates `factory/<ticketId>/<slug>` (sanitized). |
| **Factory `POST /api/factory/cmp/ticket-set-description`** | Factory master — update `cmp_tickets.description` for an existing ticket (used to persist “Intended business outcomes” so automation can execute safely). Body: `{ "ticket_id": "...", "description": "..." }`. |
| **`npm run technical-lead:run`** | Local script (`scripts/technical-lead-run.mjs`); uses `.env` via bootstrap. |

Table: **`prisma/migrations/…/technical_lead_audits`** + **`npm run db:migrate:deploy`** on production DB (or `ensure-schema` idempotent DDL). Evidence is **Postgres** (`evidence_json`, `gaps_json`, `summary_text`), not PR comments alone.

**Phase B (client surface):** `GET /api/cmp/router?action=technical-lead-latest&id=<ticket>` — tenant-safe latest audit for Change Console. Optional **`CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY=true`** + **`GROQ_API_KEY`** adds `summary_llm` (rephrase; deterministic `summary_text` stays canonical in DB). Optional checklist overrides: **`config/technical-lead-checklist.v1.json`** or **`CORPFLOW_TECHNICAL_LEAD_CHECKLIST_PATH`**.

## Optional: Cursor Bugbot (PR review)

**[Cursor Bugbot setup](https://cursor.com/docs/bugbot#setup)** supports a **free tier** for GitHub PR comments. It complements **Agent CI** and the **Technical Lead observer** (deterministic DB evidence); it does not replace migrations, cron secrets, or `VERCEL_*` alignment.

<!-- Tracked Bugbot link (optional, same destination as docs#setup): https://track.pstmrk.it/3s/cursor.com%2Fdocs%2Fbugbot%23setup/I76j/74HEAQ/AQ/1556dd49-ceef-4739-bd8c-e16116455257/1/rFvvTlI3G-#setup -->

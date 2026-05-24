# Postgres provider — Neon (canonical, sole approved provider)

**Authoritative architectural decision (2026-05-25):**

> **Neon is the sole approved Postgres provider for CorpFlowAI production.**
>
> **Prisma Accelerate / `db.prisma.io` is deprecated and must not be used in active runtime configuration.** Any `db.prisma.io` reference (host, URL, env value, Infisical secret, Vercel env, code path, doc snippet, or commit) should be treated as **configuration drift or legacy residue** and removed or explicitly marked deprecated. Dual-provider runtime logic, "Prisma as fallback" patterns, and any new env var that introduces a non-Neon Postgres are explicitly **out of scope** of this codebase.

**Production data store:** **Neon Postgres** (https://neon.tech), accessed by the app through **Prisma Client** (the ORM library). Local development uses the same Neon project; there is currently no separate dev/staging Postgres.

> **Naming hazard (read once).** Prisma Inc. also sells a managed Postgres product called **Prisma Postgres** (hostname pattern `*.prisma.io`). That is **a different product** from the Prisma ORM. We use **Prisma ORM** to talk to **Neon** — we do **not** use Prisma Postgres. If you ever see `db.prisma.io` in our env vars, that is a misconfiguration (see *Incidents* below; the symptom set has now been observed twice — 2026-05-22 and 2026-05-25 — so treat it as a recurring drift class, not a one-off).

---

## 1. Where the URLs live

Six Vercel Production env keys point at the **same** Neon project — different aliases for different consumers. All six are required.

| Vercel env key | Endpoint kind | Read by |
|---|---|---|
| `POSTGRES_URL` | Pooled (`*-pooler.<region>.aws.neon.tech`) | Prisma Client at runtime (serverless functions) — Prisma reads this name from `prisma/schema.prisma` `datasource.url = env("POSTGRES_URL")` |
| `DATABASE_URL` | Pooled | Generic Node libraries, Vercel integrations |
| `PRISMA_DATABASE_URL` | Pooled | Some Vercel-Prisma integration paths |
| `POSTGRES_PRISMA_URL` | Pooled | Legacy alias; `lib/server/runtime-config.js` `cfg('POSTGRES_URL')` falls back to this |
| `DIRECT_URL` | Non-pooled (`*.<region>.aws.neon.tech`, no `-pooler`) | Prisma migrations, long-running sessions, future `npx prisma migrate deploy` |
| `POSTGRES_URL_NON_POOLING` | Non-pooled | Build-time `scripts/apply-ensure-schema-build.mjs` — runs idempotent DDL during `vercel build`. **First key checked** in `lib/server/postgres-ensure-schema-connection.js` `resolvePostgresUrlForEnsureSchemaDdl()` |

If only the pooled URL is available, `deriveNonPoolingUrlFromNeonPooler()` (same file) derives the non-pooled host by stripping `-pooler` from the hostname. This is a safety net, not a replacement for setting `POSTGRES_URL_NON_POOLING` explicitly.

**Why two endpoints from one Neon project:** the pooled URL is PgBouncer in transaction mode (cheap connections, no prepared statements, no long sessions, no DDL); the non-pooled URL is the raw Postgres port (full Postgres semantics, more expensive per connection). Serverless functions must use pooled; DDL/migrations must use non-pooled.

---

## 2. How to tell which provider is live

Without printing secret values:

```powershell
# Pull current Production env to a local file (gitignored)
npx vercel env pull --environment=production .env.production.diag

# Parse the hostnames out without revealing credentials
node -e "const fs=require('fs');const t=fs.readFileSync('.env.production.diag','utf8').replace(/^\uFEFF/,'');const env={};for(const l of t.split(/\r?\n/)){const i=l.indexOf('=');if(i<0)continue;let v=l.slice(i+1).trim();if(/^['\"].*['\"]$/.test(v))v=v.slice(1,-1);env[l.slice(0,i).trim()]=v}for(const k of ['POSTGRES_URL','DIRECT_URL','POSTGRES_URL_NON_POOLING','DATABASE_URL','PRISMA_DATABASE_URL','POSTGRES_PRISMA_URL']){const m=/postgres(?:ql)?:\/\/[^@]+@([^:\/?]+)/.exec(env[k]||'');console.log(k,'host=',m?m[1]:'<missing>')}"

# Delete the diag file
Remove-Item .env.production.diag -Force
```

Expected: every host ends with `.neon.tech`. Pooled keys include `-pooler.`; non-pooled keys do not. Any host containing `prisma.io` is **stale and must be repointed**.

---

## 3. How `/api/factory/health` lies about this (and what to use instead)

`GET https://core.corpflowai.com/api/factory/health` reports `database_configured: true` if `POSTGRES_URL` is **non-empty**. It does **not** open a connection. It will say `healthy` while the database is unreachable.

Real connectivity is proven by any endpoint that runs a query:

- `https://lux.corpflowai.com/api/tenant/site` — expects `tenant_id: "luxe-maurice"` + a full site payload. If it 500s with `Can't reach database server`, the **pooled** URL is wrong.
- `https://lux.corpflowai.com/api/ui/context` — expects `tenant_registered: true`, `login_route: "client"`.
- A successful Vercel build with `apply-ensure-schema-build.mjs` reporting `statements_executed > 0` (or 0 with no error) proves the **non-pooled** URL is wrong.

---

## 4. Rotation / repointing playbook

If credentials are compromised, the Neon project is migrated, or the URLs are otherwise stale:

1. In the Neon console, rotate the password (or create a new role) — copy **both** the pooled and non-pooled connection strings.
2. Upsert the six Vercel Production env keys (see §1 table). Two safe paths:
   - **Vercel UI** — Project → Settings → Environment Variables → edit each entry. Set type to **Sensitive** (this is correct for DB credentials).
   - **REST API** (used during the 2026-05-22 incident) — `PATCH /v9/projects/{projectId}/env/{envId}?teamId={teamId}` with body `{"value":"<new>"}` and a Bearer of `VERCEL_AUTH_TOKEN`. Send **only** `value` — sending `type` on an existing Sensitive env returns `BAD_REQUEST: cannot change the type of a Sensitive Environment Variable`. New keys (`POST /v10/projects/.../env?upsert=true`) take `key`, `value`, `type: "sensitive"`, `target: ["production"]`.
3. Trigger a fresh Production deploy: `npx vercel deploy --prod --yes`. The build must succeed without `Can't reach database server`; that proves the non-pooled URL is good.
4. Verify the three live endpoints in §3.
5. Record the change as a chat-history entry in `artifacts/chat_history.md` (operator-facing) and a row in `docs/decisions/JOURNAL.md` if the topology changed.
6. **Do not** print URLs or paste them into tickets, chat, or `artifacts/`. Use shape-only checks.

---

## 4a. Source of truth — Infisical, **never** edit Vercel directly first

When DB URLs change, the canonical write path is:

1. Edit the value in **Infisical** under the production environment slug.
2. Sync from Infisical to Vercel (Infisical → Vercel sync workflow, or manual upsert via the §4 REST API path using values pulled from Infisical).
3. Trigger a fresh Production deploy.
4. Verify against §3 endpoints **and** the live tenant marketing surfaces (`https://lux.corpflowai.com/`, `https://lux.corpflowai.com/api/tenant/site`).

If the values diverge between Infisical and Vercel, **Infisical wins** by definition. Reset Vercel from Infisical; do **not** copy bad Vercel values back into Infisical.

A drift between Infisical (Neon) and Vercel (Prisma Postgres residue) is the exact failure pattern of the 2026-05-22 and 2026-05-25 incidents. Any time DB env editing happens outside this Infisical-first path, document the deviation in `artifacts/chat_history.md` so the next agent does not re-introduce drift.

---

## 4b. Known drift symptoms (recognise these without re-debugging)

The following triple signature **always** points at "one of the six DB env keys references Prisma Postgres / `db.prisma.io` instead of Neon", regardless of which key drifted:

- `https://core.corpflowai.com/api/factory/health` — `status: healthy`, `database_configured: true`. **(Misleading; see §3 — it does not open a connection.)**
- `https://core.corpflowai.com/api/factory/production-pulse/runtime` — top-level `ok: true` and `monitoring.ok: true`, **but** `core.database_reachable: false`.
- `https://lux.corpflowai.com/api/tenant/site` — HTTP 500 with body containing `Can't reach database server at \`db.prisma.io:5432\``.
- `https://lux.corpflowai.com/api/ui/context` — `tenant_id: "lux"` (hostname-derived fallback), `tenant_registered: false`, `login_route: "onboarding"` (instead of the canonical `tenant_id: "luxe-maurice"`, `login_route: "client"`). This happens because the `tenant_hostnames` lookup fails when the DB is unreachable, and the resolver falls through to subdomain inference.
- `https://lux.corpflowai.com/` — serves a 200 but renders apex-shaped content (no Lux branding) because the tenant payload never loaded.

If any one of these is observed, **assume drift first**, run the §2 inspection (or the diagnostic workflow `.github/workflows/diagnose-postgres-env.yml`), and apply §4 / §4a.

---

## 5. Incident: 2026-05-22 — Vercel Production was on Prisma Postgres, local on Neon

**Symptom 1 (build):** `scripts/apply-ensure-schema-build.mjs` failed in Vercel build with `Can't reach database server at db.prisma.io:5432`.
**Symptom 2 (runtime):** `https://lux.corpflowai.com/login` showed "Workspace not registered" because `/api/tenant/site` could not query `tenant_hostnames`; tenant resolution fell back to subdomain inference and rejected the result.
**Symptom 3 (false positive):** `https://core.corpflowai.com/api/factory/health` continued to report `status: healthy` (see §3).

**Root cause:** Vercel Production env vars pointed at a defunct Prisma Postgres instance (`db.prisma.io:5432`) that was unreachable at the protocol level. Local `.env` used Neon, and the Neon database contained the canonical data (`lux.corpflowai.com → luxe-maurice`, four tenant auth users). Documentation had hedged "Neon/Prisma" without naming the provider, so the misalignment went unnoticed.

**Fix:** Repointed all six env keys at the Neon project (§1 table) via the Vercel REST API. Production deployment `dpl_G9hkABzYuEp1Nb2EhWZ5T9BDafAg` (Ready, aliased to `https://corpflowai.com`) built in 20 s with no DB error, and the three §3 endpoints returned the expected payloads. No code change required.

**Follow-up that landed with this doc:** named **Neon** explicitly in `SYSTEM_MANIFEST.md`, `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`, `.env.template`, `docs/CORPFLOW_SHARED_TODO.md`, and added a must-read pointer in `AGENTS.md` so an agent that touches Postgres env vars reads this file first.

---

## 5b. Incident: 2026-05-25 — drift recurred (Lux tenant resolution failed; same `db.prisma.io:5432` host)

**Symptom 1 (production-pulse):** `core.database_reachable: false` while `monitoring.ok: true` and top-level `ok: true`. (Pulse top-line is signal-noise without `database_reachable`.)
**Symptom 2 (tenant resolution):** `https://lux.corpflowai.com/api/tenant/site` → HTTP 500, body `Can't reach database server at db.prisma.io:5432`.
**Symptom 3 (UI fallback):** `https://lux.corpflowai.com/api/ui/context` → `tenant_id: "lux"` (hostname-derived), `tenant_registered: false`, `login_route: "onboarding"`. Lux marketing surface served apex-shaped content because the tenant payload never loaded.
**Symptom 4 (false positive again):** `/api/factory/health` continued to report `healthy`. **Same blind spot as 5/22**, by-design (§3).

**Root cause:** Drift recurrence. One or more of the six Vercel Production DB env keys returned to (or was set with) a Prisma Accelerate / `db.prisma.io:5432` value, while local development and Infisical still held the correct Neon values. **No code change caused the regression** — it tracks an env / sync event between 5/22 and 5/25.

**Fix path (operator playbook for Anton — written 2026-05-25):**

1. **Confirm Infisical is canonical and Neon-only.** In Infisical under the production environment, every DB-key value should host on `*.neon.tech`. If any value still references `db.prisma.io`, **fix it in Infisical first**.
   - Pooled keys (`POSTGRES_URL`, `DATABASE_URL`, `PRISMA_DATABASE_URL`, `POSTGRES_PRISMA_URL`) → host pattern `<endpoint>-pooler.<region>.aws.neon.tech` (note the `-pooler.` segment).
   - Non-pooled keys (`DIRECT_URL`, `POSTGRES_URL_NON_POOLING`) → same endpoint **without** `-pooler.`.
2. **Sync Infisical → Vercel** for the production environment. (Manual upsert via Vercel REST API per §4 if the sync hasn't run; values pulled from Infisical, not pasted from anywhere else.)
3. **Trigger a fresh production deploy** (Vercel → Deployments → Redeploy, or a no-op commit on `main`). Env-var changes only take effect on the next build.
4. **Verify §3 endpoints** plus the §4b symptom-set inverted: `tenant_site` should return `tenant_id: "luxe-maurice"`; `ui/context` should return `tenant_registered: true`, `login_route: "client"`; pulse should return `database_reachable: true`.
5. **Then** run the diagnostic workflow `.github/workflows/diagnose-postgres-env.yml` (manual dispatch) — its verdict line should read `CLEAN` with `all_decrypted_are_neon: true`. If it reports `INDETERMINATE` because all keys are Sensitive, that is acceptable as long as §3 / §4b checks pass.
6. **Hygiene:** delete any Vercel env entry that does not appear in the §1 table — there should be no Prisma Accelerate keys, no leftover dual-provider names, no stray `*_PRISMA_*` variants pointing at `db.prisma.io`.
7. **Record** deployment ID + commit + verified URLs in `artifacts/chat_history.md` per `.cursor/rules/delivery-reality.mdc`.

**Anton-only steps** (Cursor cannot perform these autonomously because Infisical/Vercel write credentials are not present in agent sessions):

- Step 1 — edit Infisical values.
- Step 2 — Vercel REST upsert.
- Step 3 — production redeploy.
- Step 6 — Vercel env entry cleanup.

**Cursor-side steps** (already automated or queued):

- Step 4 — public endpoint probes (`scripts/diagnose-vercel-postgres-env.mjs` + `.github/workflows/diagnose-postgres-env.yml`; live curl checks).
- Step 5 — diagnostic workflow dispatch + JSON artifact.
- Step 7 — chat-history entry by the agent that closes the incident.

**Provenance discipline (do not autonomously delete):**

Before any env entry is deleted from Vercel or Infisical, search the repo for the literal env-key name (`rg '<KEY>' -- repo`). If any code path still reads the key, surface the finding to Anton before removal. The aliases listed in `lib/server/postgres-ensure-schema-connection.js` (`DATABASE_URL_UNPOOLED`, `POSTGRES_URL_UNPOOLED`, `PRISMA_DATABASE_URL_UNPOOLED`, `POSTGRES_PRISMA_URL_NON_POOLING`) and `lib/server/runtime-config.js` `cfg('POSTGRES_URL')` (`POSTGRES_PRISMA_URL`, `PRISMA_DATABASE_URL`) are **expected** alias names — they may exist with Neon values; they should never reference Prisma.

---

## 6. Related

- `docs/operations/ENSURE_POSTGRES_SCHEMA.md` — running `ensure-schema` against the live DB (idempotent DDL).
- `docs/operations/TENANT_CLIENT_LOGIN.md` — how `tenant_hostnames` participates in host → tenant resolution.
- `prisma/schema.prisma` — `datasource.url = env("POSTGRES_URL")`.
- `lib/server/runtime-config.js` — `cfg('POSTGRES_URL')` resolution order.
- `lib/server/postgres-ensure-schema-connection.js` — non-pooled URL selection + Neon `-pooler` derivation.
- `scripts/apply-ensure-schema-build.mjs` — build-time DDL invocation.

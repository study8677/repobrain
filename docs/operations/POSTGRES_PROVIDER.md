# Postgres provider — Neon (canonical)

**Production data store:** **Neon Postgres** (https://neon.tech), accessed by the app through **Prisma Client** (the ORM library). Local development uses the same Neon project; there is currently no separate dev/staging Postgres.

> **Naming hazard (read once).** Prisma Inc. also sells a managed Postgres product called **Prisma Postgres** (hostname pattern `*.prisma.io`). That is **a different product** from the Prisma ORM. We use **Prisma ORM** to talk to **Neon** — we do **not** use Prisma Postgres. If you ever see `db.prisma.io` in our env vars, that is a misconfiguration (see *Incident: 2026-05-22* below).

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

## 5. Incident: 2026-05-22 — Vercel Production was on Prisma Postgres, local on Neon

**Symptom 1 (build):** `scripts/apply-ensure-schema-build.mjs` failed in Vercel build with `Can't reach database server at db.prisma.io:5432`.
**Symptom 2 (runtime):** `https://lux.corpflowai.com/login` showed "Workspace not registered" because `/api/tenant/site` could not query `tenant_hostnames`; tenant resolution fell back to subdomain inference and rejected the result.
**Symptom 3 (false positive):** `https://core.corpflowai.com/api/factory/health` continued to report `status: healthy` (see §3).

**Root cause:** Vercel Production env vars pointed at a defunct Prisma Postgres instance (`db.prisma.io:5432`) that was unreachable at the protocol level. Local `.env` used Neon, and the Neon database contained the canonical data (`lux.corpflowai.com → luxe-maurice`, four tenant auth users). Documentation had hedged "Neon/Prisma" without naming the provider, so the misalignment went unnoticed.

**Fix:** Repointed all six env keys at the Neon project (§1 table) via the Vercel REST API. Production deployment `dpl_G9hkABzYuEp1Nb2EhWZ5T9BDafAg` (Ready, aliased to `https://corpflowai.com`) built in 20 s with no DB error, and the three §3 endpoints returned the expected payloads. No code change required.

**Follow-up that landed with this doc:** named **Neon** explicitly in `SYSTEM_MANIFEST.md`, `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`, `.env.template`, `docs/CORPFLOW_SHARED_TODO.md`, and added a must-read pointer in `AGENTS.md` so an agent that touches Postgres env vars reads this file first.

---

## 6. Related

- `docs/operations/ENSURE_POSTGRES_SCHEMA.md` — running `ensure-schema` against the live DB (idempotent DDL).
- `docs/operations/TENANT_CLIENT_LOGIN.md` — how `tenant_hostnames` participates in host → tenant resolution.
- `prisma/schema.prisma` — `datasource.url = env("POSTGRES_URL")`.
- `lib/server/runtime-config.js` — `cfg('POSTGRES_URL')` resolution order.
- `lib/server/postgres-ensure-schema-connection.js` — non-pooled URL selection + Neon `-pooler` derivation.
- `scripts/apply-ensure-schema-build.mjs` — build-time DDL invocation.

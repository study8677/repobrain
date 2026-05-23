# Audit 02 — Neon / Postgres canonical provider

**Date:** 2026-05-23
**Mode:** Read-only repo evidence + live `database_configured` / `database_reachable` signals from public health endpoints. No DB queries against tenant data.
**Packet:** corresponds to `WEEKEND_EXECUTION_QUEUE.md` Packet 1.2.

---

## Scope

In:

- Repo references to the Postgres provider (Neon).
- The Prisma + `POSTGRES_URL` resolution path.
- Live signals that confirm the database is configured and reachable from production.

Out:

- Reading any tenant data, CMP rows, or user data.
- Running migrations.
- Changing any env var.
- Validating Neon dashboard configuration directly.

---

## Evidence

### Repo references to Neon

- `docs/CORPFLOW_SHARED_TODO.md` line 106: "**Prisma / Postgres pooling** — align serverless client usage with **Neon/Vercel** guidance."
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` line 27: "**Neon / Postgres provider** — Database — All application data — Set per your project."
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` line 218: "Schema additions, if any, go through `scripts/apply-ensure-schema-build.mjs` (**Neon-backed**; see `docs/operations/POSTGRES_PROVIDER.md`)."
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` line 232: "`docs/operations/POSTGRES_PROVIDER.md` — Neon (where `automation_events` actually lives)."

### Critical finding — broken doc references

`docs/operations/POSTGRES_PROVIDER.md` is **referenced by** at least one canonical doc (`CORPFLOW_COMMUNICATIONS_V1.md`) **but does not exist** on disk:

- `Glob docs/operations/POSTGRES_PROVIDER.md` → 0 files (verified during this audit).

So the docs ecosystem treats Neon as the canonical Postgres provider, but the dedicated provider doc has not been written yet.

### Tooling and runtime resolution

- `prisma/schema.prisma` reads `POSTGRES_URL` (per `.env.template` line 219–223).
- `lib/server/runtime-config.js` `cfg('POSTGRES_URL', ...)` aliases include `DATABASE_URL`, `PRISMA_DATABASE_URL`, etc.
- `.env.template` documents `POSTGRES_URL_NON_POOLING` for migrations / build-time DDL on Vercel Postgres / Neon.
- `scripts/apply-ensure-schema-build.mjs` runs at build time (`vercel-build` script) to apply idempotent DDL — used to add tables without `prisma migrate deploy`.

### Live evidence

- `GET https://core.corpflowai.com/api/factory/production-pulse/runtime` (this audit):
  - `core.database_configured: true`
  - `core.database_reachable: true`
- `GET https://core.corpflowai.com/api/factory/health` (this audit):
  - `checks.database_configured: true`
  - `checks.runtime_config_valid: true`

Production is connecting to Postgres successfully. The provider is not named in the response (intentionally — health endpoints stay provider-agnostic).

---

## Findings

1. **Neon is the canonical provider, but is not documented in one canonical doc.** Three docs reference Neon by name; one of them (`CORPFLOW_COMMUNICATIONS_V1.md`) **points to a doc that does not exist** (`docs/operations/POSTGRES_PROVIDER.md`).
2. **Runtime resolution is robust.** `POSTGRES_URL` is sourced via `cfg()` with documented aliases, supporting both Vercel direct env and `CORPFLOW_RUNTIME_CONFIG_JSON` blob.
3. **Schema discipline is documented in two places.** `prisma migrate deploy` (Agent CI, optional via Infisical) **and** `scripts/apply-ensure-schema-build.mjs` (Vercel build, idempotent DDL). The relationship between the two is implicit: `ensure-schema` is the safety net when migrations have not been applied.
4. **Pooling guidance is named but not codified.** `docs/CORPFLOW_SHARED_TODO.md` notes pooling alignment as a TODO; current pattern lives in `lib/server/` Prisma client code.

---

## Gaps for Anton to confirm

- Neon project ownership (which org account holds the project).
- Whether `POSTGRES_URL_NON_POOLING` is currently set on Vercel Production for build-time DDL or whether the same pooled URL is reused.
- Backup / point-in-time-recovery configuration on the Neon project.
- Whether Agent CI is currently using Infisical OIDC to inject `POSTGRES_URL` (relevant for `prisma migrate deploy` in the workflow).

---

## Verdict

**DOCUMENTED but canonical doc missing.** Production confirms Postgres is configured and reachable; the docs ecosystem treats Neon as canonical; `docs/operations/POSTGRES_PROVIDER.md` is **referenced but absent**. Creating that doc is the deliverable for **Packet 1.2**.

No approval gate hit. No tenant data read. No writes performed.

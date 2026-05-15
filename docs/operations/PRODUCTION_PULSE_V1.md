# Production Pulse v1 (control plane)

Production Pulse is a **read-only** JSON surface for operators and automation (for example n8n) to verify that the **CorpFlow factory deployment** is wired the way we expect, **without** exposing secret values.

## Principles

1. **Core / factory readiness first** — database config, session secret, operator admin credentials, and runtime JSON validity (same spirit as `GET /api/factory/health`).
2. **Monitoring chain second** — `CORPFLOW_CORE_HOSTS` and `CORPFLOW_FACTORY_HEALTH_URL` (or `FACTORY_HEALTH_URL`) should be set so GitHub / n8n probes hit the same Production surface you care about.
3. **Optional tenant marketing check last** — `CORPFLOW_PRODUCTION_PULSE_TENANT_URL` may point at a Lux marketing origin (for example `https://lux.corpflowai.com/`). The pulse records **HTTP status only** (no HTML body). A green Lux response **does not** substitute core readiness and **does not** grant editor or CMP access.

## HTTP route

`GET /api/factory/production-pulse/runtime`

- **200** when `deployment_ready` is true (see JSON `ok` and `deployment_ready`).
- **503** when deployment readiness checks fail (same threshold style as `GET /api/factory/health` for operator readiness).
- Response JSON includes `monitoring.ok` for the stricter monitoring chain; that can be false while `ok` is true if you intentionally omit core host / health URL env on a sandbox.

## CLI (operator laptop or automation)

```bash
node scripts/production-pulse.mjs --url https://core.corpflowai.com/api/factory/production-pulse/runtime
```

Or set `CORPFLOW_FACTORY_HEALTH_URL` to a site origin or full `.../api/factory/health` URL; the CLI resolves to `.../api/factory/production-pulse/runtime`.

Exit code **0** when JSON `ok` is true, **1** when false or non-JSON, **2** when no URL is configured.

## npm scripts

- `npm run production:pulse:test` — unit tests for resolver + report builder.
- `npm run production:pulse` — CLI (requires URL / env as above).

## n8n

Import `ops/n8n/production-pulse-v1.workflow.json` as a **skeleton** (adjust nodes, credentials, and URLs to your workspace). Wire the HTTP node to your Production `.../api/factory/production-pulse/runtime` URL and branch on `ok` / `monitoring.ok`.

## Env vars referenced (names only)

| Variable | Role |
|----------|------|
| `POSTGRES_URL` | Database configured |
| `SOVEREIGN_SESSION_SECRET` | Session signing |
| `ADMIN_PIN` / `CORPFLOW_ADMIN_PASSWORD` / `CORPFLOW_ADMIN_PASSWORD_HASH` | Operator readiness |
| `CORPFLOW_RUNTIME_CONFIG_JSON` | Must parse when present |
| `CORPFLOW_CORE_HOSTS` | Core hostnames list (monitoring chain) |
| `CORPFLOW_FACTORY_HEALTH_URL` / `FACTORY_HEALTH_URL` | Health ping / TL observer base |
| `CORPFLOW_PRODUCTION_PULSE_TENANT_URL` | **Optional** tenant marketing GET target |

Do **not** place shared secrets in client-side n8n stores; prefer short-lived credentials and header checks consistent with `docs/operations/SECURITY_REVIEW_CHECKLIST.md`.

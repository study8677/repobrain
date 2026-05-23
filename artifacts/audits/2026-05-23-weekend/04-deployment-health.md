# Audit 04 — Production deployment health (live read-only)

**Date:** 2026-05-23 (probes captured ~08:58 UTC+4)
**Mode:** Live, anonymous, read-only HTTP probes against documented public production URLs. No authenticated requests. No state mutation.
**Packet:** corresponds to `WEEKEND_EXECUTION_QUEUE.md` Packet 1.4.

---

## Floor (per `.cursor/rules/predeploy-decision-checks.mdc` § *Minimum live GET checks*)

| URL | Expected | Result | Verdict |
|-----|----------|--------|---------|
| `https://lux.corpflowai.com/` | **200** — Lux landing HTML (not `500`, not Vercel `MIDDLEWARE_INVOCATION_FAILED`) | **200**, `text/html`, body length **36,074 bytes**, Next.js HTML shell | **PASS** |
| `https://lux.corpflowai.com/change` | **200** — Change Console static route | **200**, `text/html`, body length **6,578 bytes** | **PASS** |
| `https://core.corpflowai.com/api/factory/health` | **200** — JSON `ok: true` | **200**, `application/json`, `ok: true`, `status: "healthy"` | **PASS** |

All three floor checks pass. No `MIDDLEWARE_INVOCATION_FAILED`, no platform 5xx observed.

---

## Extended live probes

| URL | HTTP | Content-Type | Notes |
|-----|------|--------------|-------|
| `https://core.corpflowai.com/api/factory/production-pulse/runtime` | **200** | JSON | `ok: true`, `deployment_ready: true`, `monitoring.ok: true` |
| `https://corpflowai.com/` | **200** | HTML | apex serves Next.js HTML shell (length **11,793 bytes**) |
| `https://corpflowai.com/api/factory/health` | **200** | JSON | identical body shape to `core.*` host — same deployment serves both |

---

## Health JSON evidence (no secrets, only configuration booleans and counts)

```json
{
  "ok": true,
  "status": "healthy",
  "checks": {
    "database_configured": true,
    "sovereign_session_configured": true,
    "admin_operator_ready": true,
    "runtime_config_valid": true
  },
  "runtime_config": {
    "present": true,
    "parse_ok": true,
    "key_count": 13,
    "first_char": "{"
  },
  "automation": {
    "cmp_mirror_enabled": true,
    "ingest_secret_configured": true,
    "approval_secret_configured": false,
    "forward_url_configured": true,
    "tenant_bootstrap_secret_configured": false,
    "tenant_bootstrap_ingest_enabled": false
  },
  "password_reset_delivery_configured": true,
  "password_reset_hint": "Tenant forgot-password can deliver via webhook and/or Resend when user exists.",
  "factory_browser_admin_configured": true,
  "tenancy_boundary": {
    "core_hosts_configured": true,
    "core_host_count": 1,
    "default_apex_tenant_id": "root",
    "tenant_host_map_configured": true,
    "root_domain": "corpflowai.com",
    "tenant_preview_secret_configured": true
  },
  "hint": "All readiness checks passed.",
  "auth_hint": "Operator admin credentials are configured; factory routes accept x-session-token / Bearer where applicable."
}
```

## Production-pulse runtime evidence

```json
{
  "schema": "corpflow.production_pulse.v1",
  "version": 1,
  "ok": true,
  "deployment_ready": true,
  "monitoring": {
    "ok": true,
    "checks": {
      "core_hosts_configured": true,
      "factory_health_url_configured": true
    }
  },
  "core": {
    "database_configured": true,
    "sovereign_session_configured": true,
    "admin_operator_ready": true,
    "runtime_config_valid": true,
    "core_hosts_configured": true,
    "factory_health_url_configured": true,
    "database_reachable": true
  },
  "tenant_optional": {
    "label": "optional_luxe_marketing_surface",
    "configured": false,
    "http_status": null,
    "ok": null
  }
}
```

---

## Findings

1. **All four core health checks pass:** `database_configured`, `sovereign_session_configured`, `admin_operator_ready`, `runtime_config_valid`.
2. **Database is reachable, not just configured.** `production_pulse.core.database_reachable: true` is a stronger signal than the `health` endpoint's "configured" booleans alone.
3. **Runtime config blob is present and valid.** `runtime_config.parse_ok: true`, `key_count: 13` — operators have a stable read path.
4. **Tenancy boundary is configured.** `core_hosts_configured: true`, `tenant_host_map_configured: true`, `tenant_preview_secret_configured: true` — apex / `core.*` / `lux.*` separation is wired per `docs/operations/TENANT_CLIENT_LOGIN.md`.
5. **Password-reset path is live.** `password_reset_delivery_configured: true` (corroborates Audit 03).
6. **Two intentional gaps in `automation` block:** `approval_secret_configured: false` and `tenant_bootstrap_secret_configured: false`. These are **expected** absent automation paths that require approval secrets, not live regressions.
7. **`tenant_optional.configured: false`** — the optional Luxe marketing surface probe inside `production-pulse` is not wired. This is opt-in, not a failure.
8. **Single observation only.** This is a single point-in-time probe at ~08:58 UTC+4 on 2026-05-23. A transient 5xx in the next 60 seconds would not be caught here. `factory-health-ping.yml` provides the recurring check.

---

## Gaps for Anton to confirm

- The current Vercel **Production deployment ID** and the **commit SHA** it built. The chat-history row from 2026-05-21 named `dpl_CDXuGrgGLqxnwXB92rK1W7vojJNt`; whether the next merge has produced a newer Production deployment is not visible from the public health endpoint and requires Vercel dashboard access.
- Whether `factory-health-ping.yml` has run successfully in the last 24 hours (GitHub Actions log).

---

## Verdict

**ALL CHECKS GREEN** at 2026-05-23 ~08:58 UTC+4. Production health is consistent with the floor in `predeploy-decision-checks.mdc`. **Packet 1.4** can close on a snapshot doc that captures this evidence (the body of this audit becomes that snapshot).

No approval gate hit. No authenticated requests. No state mutation.

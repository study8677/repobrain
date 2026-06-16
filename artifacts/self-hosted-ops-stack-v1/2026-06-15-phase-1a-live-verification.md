# Phase 1A live verification — Self-hosted ops stack v1 (Step 1 + Step 2)

**Date opened:** 2026-06-15 (UTC+4)
**Owner:** Anton (operator) for L3 / secret-bearing steps; Cursor (L1) for the public probes captured in § 2 and the operator-side recipes in § 3 / § 4.
**Companion docs (canonical):**

- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` (Phase 1 baseline; this artifact verifies it).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (L1 / L2 / L3 model; § 5.3 hard rules; § 5.4 collaboration pattern; § 7 `HOST_MISMATCH`; § 10 gate for new server-side surfaces).
- `docs/operations/MONITORING_ARCHITECTURE.md` (12 in-repo monitors; § 5 always-on minimum live URLs; § 6 known blind spots).
- `docs/automation-framework.md` (`POST /api/automation/ingest` contract).
- `docs/n8n/automation-forward-recipe.md` (channel separation; envelope shape).

**Verdict (current):** **PARTIAL** — public production probes from L1 confirm the producer side is live and wired; the four secret-bearing / admin-bearing checks (ingest test, `automation_events` read-back, n8n consumer execution, Uptime Kuma monitors) are gated on the operator and on a separate Kuma-install packet. See § 5.

---

## 1. Scope of this artifact

What this artifact covers:

- **§ 2** — read-only HTTP probes of public production URLs that L1 (this Cursor session on Anton's Windows laptop) is permitted to run per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 8 decision-tree row *"Read-only HTTP probe of production"*. Captured 2026-06-15 ~10:50 UTC+4.
- **§ 3** — the exact PowerShell recipe Anton runs from his own machine to send the harmless `ops.self_hosted.test.v1` event through `POST /api/automation/ingest`, with explicit redaction rules for the evidence he pastes back into this artifact.
- **§ 4** — the exact PowerShell recipe to read back the event from `GET /api/automation/events` (factory-master only) and the evidence-block format.
- **§ 5** — gating note for Uptime Kuma. Installing Kuma on `corpflow-exec-01-u69678` is a new L3 capability blocked by `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 "*No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope*" — that requires the § 10 gate (ADR + `MIGRATION_TO_SERVER_CHECKLIST.md` + monitoring-arch row + JE row + Anton's approval) in a **separate packet**. This artifact does **not** install Kuma, it only documents the verification scaffolding for when the install packet lands.
- **§ 6** — rollback / disable steps for every action proposed below.

What this artifact does NOT cover:

- It does **not** install Uptime Kuma, n8n, restic, Docker images, or any new app runtime dependency.
- It does **not** modify any production endpoint or any `.env.template` value or any GitHub Actions workflow.
- It does **not** request, print, or commit any secret value.
- It does **not** start the restic Step 3 work.

---

## 2. L1 evidence — public probes captured 2026-06-15 ~10:50 UTC+4

**Probe origin:** Anton's Windows laptop (Cursor L1 session, PowerShell 7).
**Method:** `Invoke-WebRequest -Method GET -UseBasicParsing -MaximumRedirection 5 -TimeoutSec 30`.
**Auth:** none — every URL below is publicly reachable; no headers added.

### 2.1 Production live-URL floor (always-on minimum per `MONITORING_ARCHITECTURE.md` § 5)

| URL | Status | Content-Type | Bytes | Latency (ms) | Markers |
|---|---|---|---|---|---|
| `https://core.corpflowai.com/api/factory/health` | 200 | `application/json` | 1015 | 1094 | `ok:true`, `status:"healthy"`, `database_configured:true`, `sovereign_session_configured:true`, `admin_operator_ready:true`, `runtime_config_valid:true` |
| `https://core.corpflowai.com/api/factory/production-pulse/runtime` | 200 | `application/json` | 859 | 363 | `schema:"corpflow.production_pulse.v1"`, `ok:true`, `deployment_ready:true` |
| `https://corpflowai.com/` | 200 | `text/html` | 16384 | 1086 | `<!DOCTYPE html>` apex marketing |
| `https://corpflowai.com/lead-rescue` | 200 | `text/html` | 43417 | 761 | `<!DOCTYPE html>` Lead Rescue landing |
| `https://aileadrescue.corpflowai.com/` | 200 | `text/html` | 25375 | 825 | `<!DOCTYPE html>` AI Lead Rescue marketing host |
| `https://lux.corpflowai.com/` | 200 | `text/html` | 59909 | 1001 | `<!DOCTYPE html>` Lux tenant marketing |
| `https://lux.corpflowai.com/change` | 200 | `text/html` | 6754 | 95 | `<!DOCTYPE html>` Change Console (operator surface) |

All probes returned 2xx within < 1.1 s. No redirect chains observed.

### 2.2 Producer-side wiring on Vercel (read from `/api/factory/health` — names only, no values)

The factory-health endpoint reports presence-only booleans for the producer-side env. None of the values are exposed; only the presence flags are.

| Field | Value | What it proves |
|---|---|---|
| `automation.cmp_mirror_enabled` | `true` | `CORPFLOW_AUTOMATION_CMP_MIRROR` is unset or `true` — CMP lifecycle (`cmp.ticket.created`, `cmp.estimate.recorded`, `cmp.build.approved`, `cmp.github.callback`) is mirrored into `automation_events` and forwarded. |
| `automation.ingest_secret_configured` | `true` | `CORPFLOW_AUTOMATION_INGEST_SECRET` is set on Vercel Production. The header-authenticated ingest path is live. |
| `automation.approval_secret_configured` | `false` | `CORPFLOW_AUTOMATION_APPROVAL_SECRET` is unset. Acceptable for Phase 1A — `ops.self_hosted.test.v1` does not match any high-risk prefix. |
| `automation.forward_url_configured` | `true` | `CORPFLOW_AUTOMATION_FORWARD_URL` is set on Vercel Production. The forward to n8n is wired on the producer side. |
| `automation.tenant_bootstrap_secret_configured` | `false` | Out of scope for Step 1 verification. |
| `automation.tenant_bootstrap_ingest_enabled` | `false` | Out of scope for Step 1 verification. |
| `monitoring.checks.core_hosts_configured` | `true` | `CORPFLOW_CORE_HOSTS` set. |
| `monitoring.checks.factory_health_url_configured` | `true` | `CORPFLOW_FACTORY_HEALTH_URL` (or `FACTORY_HEALTH_URL`) set. |
| `core.database_reachable` (production-pulse) | `true` | Postgres connectivity confirmed by an actual query (Monitor #3 in `MONITORING_ARCHITECTURE.md` § 2 — opens a real DB connection, unlike `/api/factory/health` which only checks env presence). |
| `deployment_ready` (production-pulse) | `true` | Composite OK: env shape + DB reachable + monitoring chain. |

### 2.3 What L1 evidence proves and does NOT prove

**Proves (Step 1, producer side):**

- The CorpFlow production app is live, healthy, and responsive on every public URL named in `MONITORING_ARCHITECTURE.md` § 5 always-on minimum.
- The automation-forward producer-side wiring (`POST /api/automation/ingest` + forward to n8n) is configured on Vercel Production today: ingest secret set, forward URL set, CMP mirror enabled, no high-risk approval gate (acceptable for the harmless test event).
- Postgres is actually reachable from the serverless runtime (production-pulse `core.database_reachable: true`).

**Proves (Step 2, monitoring scaffolding):**

- The in-repo 12-monitor architecture (`MONITORING_ARCHITECTURE.md` § 2) is unchanged and the live-URL floor (§ 5) is green from L1. Uptime Kuma's role is to add a **third location** that probes from outside both Vercel and GitHub Actions; the floor is the same set of URLs Kuma will probe.

**Does NOT prove (gated to operator — see § 3 / § 4 / § 5):**

- That a `POST /api/automation/ingest` actually round-trips today (needs `CORPFLOW_AUTOMATION_INGEST_SECRET`).
- That the resulting row appears in `automation_events` and is visible to the factory-only `GET /api/automation/events` endpoint (needs factory-master auth — admin session cookie or `MASTER_ADMIN_KEY` / `x-session-token`).
- That n8n received the forward and the consumer workflow ran (needs n8n admin URL + login; n8n origin URL is in `CORPFLOW_AUTOMATION_FORWARD_URL` on Vercel, not in the repo, not in this Cursor session).
- That Uptime Kuma is up and probing the floor URLs (Kuma is not yet installed; install on `corpflow-exec-01-u69678` is gated by `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 — separate packet — see § 5).

---

## 3. Step 1 operator-side recipe — `ops.self_hosted.test.v1` ingest

Anton runs the block below from his own PowerShell on his Windows laptop. The block reads the secret from his existing `.env.local` (or password-manager scratch file) and never echoes the value to the terminal or to this artifact.

### 3.1 Pre-flight (one-liners — no secrets touched)

```powershell
$ProgressPreference = 'SilentlyContinue'
$origin = 'https://core.corpflowai.com'
Invoke-WebRequest -Uri "$origin/api/factory/health" -UseBasicParsing -TimeoutSec 30 |
  Select-Object -ExpandProperty Content |
  ConvertFrom-Json |
  Select-Object -ExpandProperty automation
```

Expected output (presence-only flags; no secret values):

- `cmp_mirror_enabled        : True`
- `ingest_secret_configured  : True`
- `forward_url_configured    : True`

If `ingest_secret_configured` is `False`, **stop** — the ingest secret is missing on Vercel Production and the test below will return `401`. Set it from the operator's password manager into Vercel Production env, redeploy, and re-run pre-flight.

### 3.2 Send the harmless test event

The event type `ops.self_hosted.test.v1` was deliberately chosen to **not** match any high-risk prefix in `docs/automation-framework.md` (`billing.`, `payment.`, `money.`, `delete.`, `destroy.`, `publish.public.`, `external.deploy.prod`, `invoice.pay`, `refund.`). No approval secret is required.

```powershell
$ProgressPreference = 'SilentlyContinue'
$origin = 'https://core.corpflowai.com'

$secret = $env:CORPFLOW_AUTOMATION_INGEST_SECRET
if (-not $secret) {
  Write-Error 'CORPFLOW_AUTOMATION_INGEST_SECRET not in env. Load from password manager into the current shell only (e.g. `$env:CORPFLOW_AUTOMATION_INGEST_SECRET = (Get-Content -Path .secret-scratch.txt -Raw).Trim()`); never paste into the terminal history.'
  return
}

$idem = "self-hosted-ops-stack-v1-step-1-{0:yyyyMMdd-HHmmss}" -f (Get-Date)

$body = @{
  event_type      = 'ops.self_hosted.test.v1'
  tenant_id       = 'global'
  source          = 'self-hosted-ops-stack-v1-step-1'
  idempotency_key = $idem
  payload         = @{
    note          = 'Step 1 verification — Phase 1A live verification, no secrets'
    artifact_ref  = 'artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md'
  }
} | ConvertTo-Json -Depth 4

$resp = Invoke-WebRequest `
  -Method POST `
  -Uri "$origin/api/automation/ingest" `
  -Headers @{
    'x-corpflow-automation-secret' = $secret
    'Content-Type'                 = 'application/json'
  } `
  -Body $body `
  -UseBasicParsing `
  -TimeoutSec 30

[pscustomobject]@{
  status_code      = $resp.StatusCode
  content_length   = $resp.RawContentLength
  body_preview     = ($resp.Content.Substring(0, [Math]::Min(240, $resp.Content.Length)))
  used_idempotency = $idem
}
```

**Expected first-run result:** `status_code = 200`, body contains a row id (`id` field — opaque CUID), `tenant_scope = "global"`, `event_type = "ops.self_hosted.test.v1"`, `risk_tier = "low"`, no `deduped` flag.

**Expected replay (same `idempotency_key`):** `status_code = 200`, body contains `deduped: true` and the same row id.

### 3.3 Redaction rule for evidence pasted back here

When pasting the captured `$resp` object into this artifact (§ 7.1 below), include only:

- `status_code` (e.g. `200`).
- `content_length` (e.g. `220`).
- The first 200 chars of `body_preview` **after** redacting any field that is not in this allowlist:
  - `id`, `event_type`, `tenant_scope`, `risk_tier`, `source`, `idempotency_key`, `deduped`, `created_at`.
- The chosen `idempotency_key` (it is operator-generated, not a secret; it goes into `automation_events.idempotency_key` and is reusable for the readback in § 4).

Do **not** paste:

- Any header value from the request (the `x-corpflow-automation-secret` header carries the secret).
- The full request `$body` if it ever ends up containing tokens (it should not — the example above is hard-coded to placeholder text).
- The `$secret` variable, ever, in any form.

If unsure, paste only `status_code` + `idempotency_key` and the literal string `id=<redacted>`. That is sufficient evidence for a green tick.

---

## 4. Step 1 operator-side recipe — read back from `automation_events`

The factory-only events endpoint requires factory-master auth: either an admin session cookie (after logging in at `/login` on the apex with the factory-master credentials) **or** an `Authorization: Bearer <MASTER_ADMIN_KEY>` / `x-session-token: <MASTER_ADMIN_KEY>` header. **Both forms hold the master key** — keep them out of the terminal history.

### 4.1 Recipe (Bearer header form — easiest from PowerShell)

```powershell
$ProgressPreference = 'SilentlyContinue'
$origin = 'https://core.corpflowai.com'

$mk = $env:MASTER_ADMIN_KEY
if (-not $mk) {
  Write-Error 'MASTER_ADMIN_KEY not in env. Load from password manager into the current shell only.'
  return
}

$resp = Invoke-WebRequest `
  -Method GET `
  -Uri "$origin/api/automation/events?tenant_scope=global&limit=10" `
  -Headers @{ 'Authorization' = "Bearer $mk" } `
  -UseBasicParsing `
  -TimeoutSec 30

$j = $resp.Content | ConvertFrom-Json
$row = $j.events | Where-Object { $_.event_type -eq 'ops.self_hosted.test.v1' } | Select-Object -First 1

[pscustomobject]@{
  status_code         = $resp.StatusCode
  total_returned      = ($j.events | Measure-Object).Count
  match_event_type    = $row.event_type
  match_tenant_scope  = $row.tenant_scope
  match_risk_tier     = $row.risk_tier
  match_source        = $row.source
  match_idempotency   = $row.idempotency_key
  match_created_at    = $row.created_at
  match_id_first8     = if ($row.id) { $row.id.Substring(0, [Math]::Min(8, $row.id.Length)) + '...' } else { '<none>' }
}
```

**Expected:** `status_code = 200`; `match_event_type = ops.self_hosted.test.v1`; `match_tenant_scope = global`; `match_risk_tier = low`; `match_source = self-hosted-ops-stack-v1-step-1`; `match_idempotency` equals the value from § 3.2.

### 4.2 Redaction rule

Paste back only the `pscustomobject` shown above (it already redacts the row id to first-8 + ellipsis). Do **not** paste any other event row from the response — other rows may carry tenant ids, lead-rescue prospect details (`payload.prospect.*`), or other client-relevant fields that do not belong in a public-adjacent repo artifact. If a richer view is ever needed, query Postgres directly from a trusted machine with `POSTGRES_URL` set, and keep the output off-repo.

---

## 5. Step 2 — Uptime Kuma — gating note (PENDING AUTHORIZATION PACKET, no longer generally blocked)

### 5.1 Why Step 2 was blocked at L1 (history) and why it is now PENDING-AUTHORIZATION instead

**Earlier (2026-06-15 morning).** `SELF_HOSTED_OPS_STACK_V1.md` § 3 named Uptime Kuma as an approved Phase 1 supporting service in **doctrine**, but actually **installing it on `corpflow-exec-01-u69678`** was a **new L3 capability** that ran into two hard rules in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3:

- *"❌ No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope. Adds attack surface and memory pressure."*
- *"❌ No scheduled jobs — no cron, no systemd timers, no `at`. Anything scheduled today still lives on L2 (Vercel cron or GitHub Actions)."*

Uptime Kuma is typically deployed as a Docker container with its own scheduled probe loop, so an install would lift both of those hard rules — and the previous version of this section recorded that as **BLOCKED on a separate packet**.

**Now (2026-06-15 afternoon).** That separate packet has been **authored** as `UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_V1` (`JE-2026-06-15-1`). Step 2 is therefore no longer "generally blocked"; it is **PENDING the authorization packet's merge**. The authorization packet is **docs-only** — it does **not** install Kuma. It satisfies the seven-item § 10 gate so that Anton's merge of that packet IS the authorization.

### 5.2 Status of the § 10 gate items as of 2026-06-15

Per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 10, lifting either § 5.3 hard rule requires the seven items below. Each row links to the artifact that closes it:

| # | § 10 requirement | Closed by | Status (2026-06-15) |
|---|---|---|---|
| 1 | ADR for the new surface (name, credentials, threat model, rollback path, alert path) | `docs/decisions/20260615-uptime-kuma-on-exec01.md` (10 sections — incl. § 4 7-row threat model + § 5 four-step rollback + § 6 alert-path canonical) | **Drafted** — status PROPOSED → ACCEPTED on Anton's merge. |
| 2 | Pass `MIGRATION_TO_SERVER_CHECKLIST.md` § 2 (every checkbox) | `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` § 6 (every § 2 row addressed inline across § 6.1 credential placement → § 6.10 verification floor) | **Drafted.** |
| 3 | New row in `MONITORING_ARCHITECTURE.md` § 2 surface map (and § 11 status tables) | Monitor # 13 row in § 2; § 4.1 / § 4.2 alert-routing table row; § 11.1 row `🟡 authorized, not installed`; § 11.2 row `kuma-on-exec01-install` (install runbook follow-up packet) | **Drafted.** |
| 4 | Update `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` for the named exception | New § 5.5 *Authorized exceptions to § 5.3 hard rules (named, narrow, packet-gated)* listing Kuma as the **first and only** carve-out + § 5.3 parentheticals + § 6 row clarifier + § 6 exception-clarifier paragraph + § 13 change log v1 → v1.1 | **Drafted.** |
| 5 | `AGENTS.md` Must-read row | Row pointing at the ADR + authorization packet + `SELF_HOSTED_OPS_STACK_V1.md` § 3 | **Drafted.** |
| 6 | `JE-YYYY-MM-DD-N` decision row | `JE-2026-06-15-1` | **Drafted.** |
| 7 | Anton approves the merge (AAP § 3 gate) | (this is the actual gate) | **Pending Anton's review of the docs-only PR.** |

When item 7 lands, Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` flips **BLOCKED → AUTHORIZED-PENDING-INSTALL**. **Status update 2026-06-16:** PR #367 merged 2026-06-15 (item 7 satisfied); the install runbook follow-up packet `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` has now been authored at L1 by Cursor (`JE-2026-06-16-1`). Step 2 has therefore advanced one more notch: **AUTHORIZED-PENDING-INSTALL → INSTALL-RUNBOOK-AUTHORED-PENDING-OPERATOR-EXECUTION**. The runbook is 14 sections including a § 5 operator-paste shell-block sequence, a § 6 SSH-tunnel command, § 8 monitor specs for the eight URLs, § 9 alert routing (Kuma's own Telegram bot PRIMARY, n8n SECONDARY-only never on critical-outage path), § 10 three-level rollback, § 11 K1–K5 verification block with PASS/FAIL signals, § 12 evidence template, and § 13 closure update points. **No L3 commands typed by Cursor.** Anton runs the runbook at L3 per the § 5.4 pattern in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`; the K1–K5 live checks in § 11 of the runbook (mirrored from the authorization packet § 9 template) flip Step 2 → COMPLETE.

### 5.3 Lower-cost fallbacks recorded for the change-log only (no longer the chosen path)

These were named in the previous version of this section as "non-install options that do **not** require lifting any § 5.3 rule." They are kept here for the change-log record — Anton can still choose either if the authorization packet is rejected at the AAP § 3 gate or if Kuma's first-week signal is poor:

- **Option A — managed third-party uptime probe (Better Stack / UptimeRobot / Pingdom).** Operator-side account, no code change. Now repurposed in `MONITORING_ARCHITECTURE.md` § 11.2 (`exec01-uptime-from-third-location`) as a **complementary** second third-location signal, not a replacement for Kuma — to be re-evaluated after Kuma has 30 production days of clean signal.
- **Option B — content-marker assertion in the existing `factory-control-loop.yml` GitHub-Actions floor monitor.** Stays entirely on L2; addresses blind spot # 3 ("tenant resolution failure looks like apex 200") but does **not** close blind spot # 7 ("no third-location uptime") because GitHub Actions shares a failure domain with the producer.

Neither is being executed by the authorization packet; both stay on the table as fallbacks.

### 5.4 What Step 2 verification fields look like once Kuma is installed (template)

When the install packet lands and Kuma is up, the operator pastes evidence back into § 7.2 of this artifact in the following shape (no screenshots in repo — operator keeps screenshots in his local OneDrive, and pastes only the redacted text below).

| Monitor | Target | Type | Status (after install) | First green at | Notes |
|---|---|---|---|---|---|
| Production health | `https://core.corpflowai.com/api/factory/health` | HTTP — expect 200 + JSON `ok:true` | _PLANNED_ | _UTC timestamp_ | Floor URL per `MONITORING_ARCHITECTURE.md` § 5. |
| Change Console | `https://lux.corpflowai.com/change` | HTTP — expect 200 | _PLANNED_ | _UTC timestamp_ | Operator surface. |
| Lead Rescue marketing | `https://corpflowai.com/lead-rescue` | HTTP — expect 200 + content marker (`Representational example only`) | _PLANNED_ | _UTC timestamp_ | Apex sub-route confirmed live (§ 2.1). |
| Tenant client host | `https://lux.corpflowai.com/` | HTTP — expect 200 + tenant content marker (e.g. `Mauritius`) | _PLANNED_ | _UTC timestamp_ | Catches blind spot # 3 (apex fallback). |
| n8n reachability | `<N8N_ORIGIN>/<n8n-health-or-test-endpoint>` | HTTP — expect 200 | _PLANNED_ | _UTC timestamp_ | Use n8n's own health endpoint or a placeholder Webhook node configured for GET that returns 200. **Do not** point Kuma at the production `corpflow-automation` webhook URL — that would create real `automation_events` rows. |
| Test alert delivered | n/a | n/a | _PLANNED_ | _UTC timestamp_ | Operator forces a fail (briefly point one monitor at a non-existent path), confirms Telegram or email lands via Kuma's primary channel (must **not** depend on n8n — no circular dependency for critical outage), then restores. |

---

## 6. Rollback / disable steps (per action proposed above)

Each row below is the **single** action that reverses the corresponding step.

| Step | Action proposed | Rollback / disable |
|---|---|---|
| § 3.2 — send `ops.self_hosted.test.v1` | Single `POST /api/automation/ingest` from operator's machine | Nothing to roll back. The row stays in `automation_events` as a normal low-risk audit row; it does not trigger a CMP, billing, or client-facing side effect. If the row is unwanted, run a one-off `DELETE FROM automation_events WHERE event_type = 'ops.self_hosted.test.v1' AND idempotency_key = '<the key>'` from a trusted machine with `POSTGRES_URL` (purely cosmetic; not a security action). |
| § 3 / § 4 — disable forward to n8n only | (operator-side env edit) | Unset `CORPFLOW_AUTOMATION_FORWARD_URL` in Vercel Production env and redeploy. Ingest continues to write to `automation_events`; no outbound POST is attempted. (Same rollback as `SELF_HOSTED_OPS_STACK_V1.md` § 2.6.) |
| § 3 / § 4 — rotate forward secret | (operator-side env edit) | Update `CORPFLOW_AUTOMATION_FORWARD_SECRET` on Vercel + n8n simultaneously; first failed run after rotation surfaces in n8n's executions tab as a 401 / IF-mismatch. |
| § 3 / § 4 — rotate ingest secret | (operator-side env edit) | Rotate `CORPFLOW_AUTOMATION_INGEST_SECRET` in Vercel; redeploy; update operator's password manager. The pre-flight in § 3.1 should still report `ingest_secret_configured: true`. |
| § 5 — Uptime Kuma install on `corpflow-exec-01-u69678` | NOT in this packet — see § 5.2 | (no rollback needed because nothing is installed). When the future install packet lands, its rollback is `docker compose -p uptime-kuma down -v` followed by removal of the Compose file under the operator's home directory and the systemd unit (if any) per the install runbook authored at L1. |

If at any point the operator suspects the ingest secret or forward secret has leaked into an artifact, terminal history, or commit, follow `docs/runbooks/SECURITY_OR_INCIDENT.md` immediately — rotate the affected secret first, investigate second.

---

## 7. Operator evidence blocks (paste here once the recipes in § 3 / § 4 are run)

These blocks are **placeholders**. The operator pastes redacted output captured per the rules in § 3.3 and § 4.2. Until they are filled in, this artifact stays at **PARTIAL**.

### 7.1 Step 1 — ingest evidence

```
status_code      : <fill in>
content_length   : <fill in>
body_preview     : <first 200 chars after redaction per § 3.3>
used_idempotency : <the idempotency_key chosen in § 3.2>
```

Captured-by: <operator name>
Captured-at (UTC): <fill in>
Replay-deduped run (status_code + body_preview, optional): <fill in>

### 7.2 Step 1 — `automation_events` read-back evidence

```
status_code         : <fill in>
total_returned      : <fill in>
match_event_type    : ops.self_hosted.test.v1
match_tenant_scope  : global
match_risk_tier     : low
match_source        : self-hosted-ops-stack-v1-step-1
match_idempotency   : <same value as 7.1 used_idempotency>
match_created_at    : <fill in>
match_id_first8     : <fill in>
```

Captured-by: <operator name>
Captured-at (UTC): <fill in>

### 7.3 Step 1 — n8n consumer evidence (operator pastes only after he has logged into n8n admin)

n8n executions tab shows a **new run** for the `corpflow-automation` webhook within seconds of § 3.2.

```
n8n_executions_tab_url           : <kept off-repo; operator confirms he saw it>
matching_execution_started_at   : <UTC timestamp from n8n executions list>
matching_execution_status        : success | error | skipped
incoming_event_type              : ops.self_hosted.test.v1
forward_secret_header_validated  : true | false  (Y if n8n's IF/Function node compared x-corpflow-automation-forward-secret OK)
secret_logged_or_committed       : NO  (must always be NO; if YES, follow SECURITY_OR_INCIDENT.md immediately)
```

Captured-by: <operator name>
Captured-at (UTC): <fill in>

### 7.4 Step 2 — Uptime Kuma evidence (template authored 2026-06-16; pending operator L3 execution)

Until the operator runs `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` end-to-end at L3 and § 11 of the runbook returns K1=PASS / K2=PASS / K3=PASS / K4=PASS / K5=PASS, this section stays empty. The evidence shape is the § 12 *Evidence template* of the runbook — paste the filled-in block here verbatim (no secrets, no tokens, no chat ids; see runbook § 12.2 for the credential-incident guard). The accompanying closure PR per § 13 of the runbook flips Step 2 from `INSTALL-RUNBOOK-AUTHORED-PENDING-OPERATOR-EXECUTION` → `COMPLETE` and appends the corresponding `JE-YYYY-MM-DD-N` row to `docs/decisions/JOURNAL.md`.

---

## 8. Verdict (current)

```text
Delivery Reality Audit:
- Local fix exists: YES (this artifact + SHARED_TODO update)
- Merged to main: NO (this artifact is staged in working tree)
- Production deployment ID: N/A — Phase 1A is verification-only, no production deploy is part of this packet
- Commit deployed: N/A
- Live URLs tested: see § 2.1 — seven public production URLs, all 200, all within < 1.1 s
- Expected vs actual result: producer side is live and wired (§ 2.2); secret-bearing + n8n-consumer + Kuma-monitor checks await operator (§ 3 / § 4 / § 5)
- Client-facing flow usable: UNCHANGED (no production behavior modified by this packet)
- Final verdict: PARTIAL — public probes done at L1; Step 1 ingest/round-trip and Step 2 Kuma install + monitors are gated to operator (Step 2 also needs the § 5.2 separate packet first)
```

Step 1 will move from PARTIAL to COMPLETE when § 7.1 + § 7.2 + § 7.3 are filled in (or § 7.3 explicitly opted out of as "n8n admin not accessed in this round").
Step 2 will move from PARTIAL to COMPLETE only after the separate Kuma-install packet (per § 5.2) has shipped and § 7.4 has been filled in.

---

## 9. Change log

- **2026-06-15** — Created. L1 evidence captured (§ 2). Operator-side recipes drafted (§ 3 / § 4). Kuma install gating recorded (§ 5). Rollback steps listed (§ 6). Evidence blocks left as placeholders for the operator to fill in (§ 7).

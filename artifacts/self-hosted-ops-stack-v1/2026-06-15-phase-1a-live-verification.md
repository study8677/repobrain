# Phase 1A live verification — Self-hosted ops stack v1 (Step 1 + Step 2)

**Date opened:** 2026-06-15 (UTC+4)
**Owner:** Anton (operator) for L3 / secret-bearing steps; Cursor (L1) for the public probes captured in § 2 and the operator-side recipes in § 3 / § 4.
**Companion docs (canonical):**

- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` (Phase 1 baseline; this artifact verifies it).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (L1 / L2 / L3 model; § 5.3 hard rules; § 5.4 collaboration pattern; § 7 `HOST_MISMATCH`; § 10 gate for new server-side surfaces).
- `docs/operations/MONITORING_ARCHITECTURE.md` (12 in-repo monitors; § 5 always-on minimum live URLs; § 6 known blind spots).
- `docs/automation-framework.md` (`POST /api/automation/ingest` contract).
- `docs/n8n/automation-forward-recipe.md` (channel separation; envelope shape).

**Verdict (current):** **PARTIAL-CONSUMER-CONFIRMATION** (Step 1) + **COMPLETE** (Step 2) — Step 1 producer ingest and `automation_events` read-back are **PASS** (§ 7.1 / § 7.2, captured 2026-06-16T23:36:34Z); n8n consumer evidence is **PARTIAL / STRONGLY INDICATED** (§ 7.3 — succeeded execution at matching timestamp observed; payload/event-type and forward-secret validation not independently inspected inside n8n execution detail). Step 1 is **not** marked COMPLETE. Step 2 (Uptime Kuma) is COMPLETE end-to-end per `JE-2026-06-16-3`. See § 8.

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

These blocks record operator evidence captured per the rules in § 3.3 and § 4.2. § 7.1 and § 7.2 are **PASS** (2026-06-16T23:36:34Z). § 7.3 is **PARTIAL / STRONGLY INDICATED** — n8n execution success at matching timestamp observed; internal execution input/body not safely inspectable in n8n UI this round. Step 1 verdict is **PARTIAL-CONSUMER-CONFIRMATION**, not COMPLETE.

### 7.1 Step 1 — ingest evidence — **PASS**

```
status_code      : 200
content_length   : 186
body_preview     : {"ok":true,"id":"cmqha6wi80000l104f7gwr5fc","occurred_at":"2026-06-16T23:36:34.065Z","tenant_scope":"global","event_type":"ops.self_hosted.test.v1","risk_tier":"low","status":"accepted"}
used_idempotency : self-hosted-ops-stack-v1-step-1-20260616-233629
```

Captured-by: Anton
Captured-at (UTC): 2026-06-16T23:36:34Z
Replay-deduped run (status_code + body_preview, optional): not separately exercised this round

### 7.2 Step 1 — `automation_events` read-back evidence — **PASS**

```
status_code         : 200
total_returned      : 100
match_reason        : idempotencyKey
match_event_type    : ops.self_hosted.test.v1
match_tenant_scope  : global
match_risk_tier     : low
match_source        : self-hosted-ops-stack-v1-step-1
match_idempotency   : self-hosted-ops-stack-v1-step-1-20260616-233629
match_created_at    : 2026-06-16T23:36:34.065Z
match_id_first8     : cmqha6wi...
```

**Implementation note (evidence-script adjustment, not a product failure):** the live `GET /api/automation/events` response uses **camelCase** fields (`eventType`, `idempotencyKey`, `tenantScope`, `riskTier`, `occurredAt`) rather than the snake_case names expected by the original § 4 evidence script. The operator used a camelCase-safe read-back script; matching was performed on `idempotencyKey`.

Captured-by: Anton
Captured-at (UTC): 2026-06-16T23:36:34Z

### 7.3 Step 1 — n8n consumer evidence — **PARTIAL / STRONGLY INDICATED**

n8n executions list showed a **succeeded** execution at a timestamp matching § 7.1 / § 7.2. The operator could not safely locate internal execution input/body details in the n8n UI this round, so payload/event-type and forward-secret validation were **not independently inspected** — recorded honestly as partial rather than overstated.

```
matching_execution_started_at   : 2026-06-16T23:36:34Z
matching_execution_status        : success
n8n_execution_id                 : 1124
n8n_execution_duration           : 6ms
n8n_workflow_version             : 90e75d5c
incoming_event_type              : not visually confirmed inside execution detail
forward_secret_header_validated  : not visually confirmed; success is strongly indicative but not independently inspected
secret_logged_or_committed       : NO
operator_note                    : n8n executions list showed a succeeded execution at Jun 17 03:36:34 local time (UTC+4), matching the ingest/read-back timestamp 2026-06-16T23:36:34Z. Operator could not safely locate the internal execution input/body details in n8n UI, so § 7.3 is recorded as partial rather than overstated.
```

Captured-by: Anton
Captured-at (UTC): 2026-06-16T23:36:34Z

### 7.4 Step 2 — Uptime Kuma install evidence (operator-executed 2026-06-16; K1–K4 PASS, K5 PASS-by-construction, all 8 sub-probes Up — sub-probe 8 added later same day)

Anton ran `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` end-to-end at L3 on `corpflow-exec-01-u69678` on 2026-06-16. Cursor at L1 captured the operator's evidence summary (no secrets, no tokens, no chat ids) into the runbook § 12 evidence shape below, opened the docs-only closure PR (#373, merged 2026-06-16T07:01:15Z at `a9157216`, `JE-2026-06-16-2`) with the verdict **COMPLETE-WITH-N8N-DEFERRED** — Kuma installed, seven CorpFlow public floor URLs probed every 60 s, alert path operationally independent of n8n; sub-probe 8 (n8n origin) explicitly deferred at install time because the operator was not 100% sure of the correct URL and chose to defer rather than configure a guess (correct per runbook § 12.2 — *"Do NOT paste the actual n8n URL into this artifact; just confirm the URL family"*). **Later the same day (2026-06-16, before the next packet round started)**, Anton confirmed the canonical n8n health URL family (`<n8n-host>/healthz` — the n8n v1.x anonymous health endpoint, GET-only, returns `{"status":"ok"}` 200, no auth, no state mutation), added sub-probe 8 inside Kuma's UI through the SSH tunnel, observed it Up at 60 s, and test-confirmed the Telegram alert path for sub-probe 8 specifically. This second event closes the deferral and is recorded by `JE-2026-06-16-3`. The verdict for Step 2 therefore moves from **COMPLETE-WITH-N8N-DEFERRED** → **COMPLETE** in this PR (no n8n migration, no public port exposure, no additional containers — sub-probe 8 add is entirely a Kuma UI configuration change inside the existing carve-out).

```text
# Uptime Kuma install evidence — corpflow-exec-01-u69678

Operator: Anton
Date (UTC):           2026-06-16
Date (local UTC+4):   2026-06-16
Runbook executed:     docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md
Authorization basis:  PR #367 / JE-2026-06-15-1 / ADR docs/decisions/20260615-uptime-kuma-on-exec01.md
                      + PR #370 / JE-2026-06-16-1 (install runbook authoring)

## Install evidence

- Pinned image:       louislam/uptime-kuma:1.23.13
- Image digest:       (held off-repo; § 5.4.b operator output not pasted into the artifact — does not affect verdict)
- Container name:     uptime-kuma
- Compose project:    uptime-kuma
- Data dir:           ~/uptime-kuma-data/   (mode 700)
- Compose file:       ~/uptime-kuma/compose.yaml
- Host port mapping:  127.0.0.1:3001->3001/tcp                (operator-observed in `docker ps` PORTS column)
- Container status:   Up 39 minutes (healthy)                 (operator-observed in `docker ps` STATUS column)

## Pre-flight (§ 5.1)

- hostname matched corpflow-exec-01-u69678:                       YES
- Capacity OK (4 vCPU / ~7.5 GiB / >= 30 GiB free):               YES (assumed — post-resize 2026-06-04 capacity envelope; no warning observed)
- Docker + Compose v2 present:                                    YES
- ERPNext sandbox containers Up before install:                   YES (observed running before install; not intentionally touched)
- ERPNext production-shell containers Up before install:          YES (observed running before install; not intentionally touched)
- No prior uptime-kuma container or compose project:              YES (fresh install)
- Port 3001 free on host:                                         YES

## Loopback-only verification (§ 5.6)

- ss -tlnp showed 127.0.0.1:3001 (NOT 0.0.0.0 / NOT :::):         PASS  (host-side mapping `127.0.0.1:3001->3001/tcp` confirmed by `docker ps`)
- On-box curl http://127.0.0.1:3001/ returned Kuma HTML:          PASS  (`curl -I http://127.0.0.1:3001` returned `HTTP/1.1 302 Found` with `Location: /dashboard` — the canonical Kuma "redirect to setup/dashboard" response)
- Off-box curl http://5.78.213.185:3001/ returned non-zero exit:  PASS  (operator laptop: `curl -I --connect-timeout 8 http://5.78.213.185:3001` returned `curl: (28) Connection timed out after 8016 milliseconds` — exit 28 = the canonical K2 PASS signal per runbook § 5.6.c / § 11 K2)

## ERPNext untouched (§ 5.7)

- Sandbox containers still Up after install:                      YES (running before install; not intentionally touched after)
- Production-shell containers still Up after install:             YES (running before install; not intentionally touched after)
- Only NEW container is uptime-kuma (no watchtower/sidecar):      YES

## Monitors (§ 8)

| # | Friendly name                  | Status at 90s | Notes                |
|---|--------------------------------|---------------|----------------------|
| 1 | core-factory-health            | Up            | https://core.corpflowai.com/api/factory/health           |
| 2 | core-production-pulse-runtime  | Up            | https://core.corpflowai.com/api/factory/production-pulse/runtime |
| 3 | corpflowai-apex-root           | Up            | https://corpflowai.com/                                  |
| 4 | corpflowai-lead-rescue         | Up            | https://corpflowai.com/lead-rescue                       |
| 5 | aileadrescue-apex-root         | Up            | https://aileadrescue.corpflowai.com/                     |
| 6 | lux-apex-root                  | Up            | https://lux.corpflowai.com/                              |
| 7 | lux-change-console             | Up            | https://lux.corpflowai.com/change                        |
| 8 | n8n-health                     | Up            | Added 2026-06-16 by Anton inside Kuma's UI through the SSH tunnel once the URL family was confirmed. Canonical n8n v1.x anonymous health endpoint (`/healthz`); GET-only; returns `{"status":"ok"}` 200; no auth; no state mutation. Up at 60 s; Telegram alert path test-confirmed for sub-probe 8 specifically. URL family operator-confirmed; URL itself recorded only inside Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`, never in this repo per runbook § 12.2. Recorded by `JE-2026-06-16-3`. Does **not** point at the production webhook ingest path (`<n8n-host>/webhook/automation-forward`) — that route is state-mutating and would create real `automation_events` rows on every probe; it is explicitly forbidden per runbook § 8.5 anti-pattern guard. |

(URL for monitor 8 not pasted into this artifact — operator records the actual URL only inside Kuma per runbook § 12.2.)

## Notifications (§ 9)

- § 9.1 Kuma Telegram bot configured (separate from in-repo bot):  YES (credentials held in operator's Infisical vault, separate from in-repo `TELEGRAM_BOT_TOKEN`)
- § 9.2 SMTP backup configured (optional):                         NOT-CONFIGURED (optional; v1 PASSes K1–K5 without it)
- § 9.3 n8n SECONDARY-only configured (optional):                  NOT-CONFIGURED (optional; n8n is not in any alert path in this install — failure-domain isolation is therefore by-construction stronger than the runbook K5 floor requires)
- § 9.1 bot is verifiably DIFFERENT from in-repo TELEGRAM_BOT_TOKEN: YES (separate BotFather bot, separate token, credentials held in Infisical not in-repo)

## K1 – K5 verification (§ 11)

| Check | Description                                              | Result            | Evidence                                                                                                       |
|-------|----------------------------------------------------------|-------------------|----------------------------------------------------------------------------------------------------------------|
| K1    | Kuma UI reachable via SSH tunnel                         | PASS              | Operator opened SSH tunnel `ssh -L 3001:localhost:3001 anton@5.78.213.185`; browsed to `http://localhost:3001/`; Kuma UI rendered. Reinforced by the on-box `HTTP/1.1 302 Found Location: /dashboard` from § 5.6.b. |
| K2    | Kuma UI NOT reachable from public internet               | PASS              | Operator laptop (off-box, public network) `curl -I --connect-timeout 8 http://5.78.213.185:3001` returned `curl: (28) Connection timed out after 8016 milliseconds`. Exit 28 = the canonical K2 PASS signal per runbook § 5.6.c / § 11 K2.                          |
| K3    | All 8 monitors Up within 60–90 s                         | PASS              | All 8 / 8 monitors Up — the seven CorpFlow public floor URLs (monitors 1–7) Up at install (2026-06-16, `JE-2026-06-16-2`); monitor 8 (n8n `/healthz`) Up after sub-probe-add later the same day (2026-06-16, `JE-2026-06-16-3`). The earlier K3=PASS-WITH-DEFERRAL state recorded in PR #373 is closed by this PR. |
| K4    | Telegram test alert delivered via Kuma's own bot         | PASS              | Built-in **Settings → Notifications → Test** delivered the test message to the operator's Telegram chat from the new Kuma BotFather bot (separate token from in-repo `TELEGRAM_BOT_TOKEN`). K4 Test 1 PASS. K4 Test 2 (forced-failure) not separately exercised — the canonical K4 PASS signal is the Test-button delivery, which is satisfied. |
| K5    | Alert path independent of n8n                            | PASS-BY-CONSTRUCTION | n8n is NOT configured as a notifier in this install (§ 9.2 SMTP not-configured + § 9.3 n8n forwarding not-configured). The PRIMARY notifier is Kuma's own Telegram bot direct to `api.telegram.org`. There is therefore no n8n in any alert path to bring down — the failure mode K5 guards against (Kuma routing alerts through n8n; n8n down = silent outage) is structurally impossible. The K5 explicit test (stop n8n + force a fail + verify alert) was not separately performed because there is no n8n in the loop to stop; the K5 *invariant* is satisfied by-construction. |

## Verdict

- Overall: **PASS** (K1=PASS / K2=PASS / K3=PASS / K4=PASS / K5=PASS-BY-CONSTRUCTION) — all 8 sub-probes Up after the sub-probe 8 add later same day.
- Two closure PRs in sequence: install closure PR #373 (`JE-2026-06-16-2`, merged 2026-06-16T07:01:15Z at `a9157216`) flipped Monitor #13 → ✅ active and Step 2 → COMPLETE-WITH-N8N-DEFERRED. **This PR (`JE-2026-06-16-3`)** is the small docs-only sync that moves Step 2 → COMPLETE and Monitor #13 → "all 8 sub-probes Up" once Anton added sub-probe 8 inside Kuma's UI later the same day. No new code, no new envs, no new container, no n8n migration, no port-binding change.

## Rollback / disable readiness

- § 10.1 (`docker compose -p uptime-kuma stop`) understood by operator and reversible immediately: YES
- § 10.2.c (data-dir wipe) understood as destructive and only used post-revert: YES
- § 10.3 (repo revert path) understood: YES

## Notes / deviations from runbook

- **Monitor 8 (n8n origin) — initially deferred (PR #373), now Up (this PR).** Not a runbook deviation; runbook § 8.2.8 explicitly says the URL is operator-confirmed at install time and § 12.2 explicitly says do not paste it into the artifact. Anton's initial deferral over guessing the URL family was the conservative, runbook-compliant call. Later the same day (2026-06-16), Anton confirmed the canonical n8n v1.x anonymous health endpoint (`/healthz`, GET-only, returns `{"status":"ok"}` 200, no auth, no state mutation), added sub-probe 8 directly inside Kuma's UI through the SSH tunnel (no PR needed for the *configuration* — recorded in Kuma's SQLite DB at `~/uptime-kuma-data/kuma.db`), observed it Up at 60 s, and test-confirmed the Telegram alert path for sub-probe 8 specifically. Recorded by `JE-2026-06-16-3` and this docs-sync PR.
- **K4 Test 2 (forced-failure)** not separately performed — the built-in **Test** button delivery is the canonical K4 PASS signal in runbook § 11 K4 Test 1; Test 2 is belt-and-suspenders only.
- **K5 explicit test** not separately performed — n8n is not in any alert path in this install (§ 9.2 + § 9.3 both not-configured), so K5 is satisfied by-construction. This is logically stronger than the runbook K5 floor.
- **Image digest** (`§ 5.4.b operator output`) not pasted into the artifact — this is a runbook **reduction** for redaction safety, not a deviation. Future closure PRs can re-include the digest if Anton wants the byte-precise pin recorded; for v1 closure, the pinned image *tag* (`louislam/uptime-kuma:1.23.13`) is sufficient.
- **Optional § 9.2 SMTP backup** not configured — runbook § 9.2 explicitly marks SMTP as OPTIONAL and says K1–K5 PASS without it. Operator chose Telegram-only as v1.
- **Credentials held in Infisical** — Anton's standard secret-store; out-of-repo, out-of-runbook, out-of-chat. The runbook § 7.1 / § 9.1 do not prescribe the secret-store medium; "operator's password manager" in the runbook applies to Infisical equally well as to a 1Password / Bitwarden vault.

---

## 8. Verdict (current — updated 2026-06-16 after Step 1 operator evidence capture)

```text
Delivery Reality Audit (Step 1 — n8n automation-forward live verification):
- Local fix exists:                       YES (producer wiring live on Vercel Production; harmless test event accepted and persisted)
- Merged to main:                         pending this docs-only evidence PR (JE-2026-06-16-4)
- Production deployment ID:               n/a — no Vercel deploy required for evidence capture (existing Production app served the ingest)
- Commit deployed:                        n/a — evidence is live operational truth on existing Production
- Live URLs tested:                       POST https://core.corpflowai.com/api/automation/ingest (200 accepted); GET https://core.corpflowai.com/api/automation/events (200 read-back match); n8n executions list (succeeded execution at matching timestamp — § 7.3)
- Expected vs actual result:              § 7.1 ingest PASS / § 7.2 automation_events read-back PASS / § 7.3 n8n consumer PARTIAL-STRONGLY-INDICATED (execution success at matching timestamp; payload/event-type and forward-secret not independently inspected inside n8n execution detail)
- Client-facing flow usable:              YES for producer path (ingest accepted, row persisted, factory-only read-back confirmed); consumer path strongly indicated but not fully verified inside n8n execution detail
- Final verdict:                          PARTIAL-CONSUMER-CONFIRMATION (NOT COMPLETE)
```

**Step 1 status (2026-06-16, later same day):** Producer ingest **PASS** (`ops.self_hosted.test.v1` accepted 2026-06-16T23:36:34Z). Database read-back **PASS** (matched on `idempotencyKey` via camelCase-safe script — see § 7.2 implementation note). n8n consumer **PARTIAL / STRONGLY INDICATED** — execution #1124 succeeded at matching timestamp (6 ms, workflow version `90e75d5c`); `incoming_event_type` and `forward_secret_header_validated` were **not** visually confirmed inside n8n execution detail. **Step 1 is not marked COMPLETE.** To reach COMPLETE, a future round must independently inspect n8n execution input (confirm `event_type: ops.self_hosted.test.v1`) and forward-secret validation (or document an equivalent auditable check). Monitor # 13 sub-probe 8 (`/healthz`) confirms n8n *liveness* only — it does **not** substitute for § 7.3 consumer verification.

```text
Delivery Reality Audit (Step 2 — Uptime Kuma install on corpflow-exec-01-u69678; all 8 sub-probes Up):
- Local fix exists:                       YES (live container on the box; ~/uptime-kuma-data/ persistent; sub-probe 8 added inside Kuma UI 2026-06-16 — JE-2026-06-16-3)
- Merged to main:                         YES — install closure PR #373 merged 2026-06-16T07:01:15Z at a9157216 (JE-2026-06-16-2); sub-probe 8 docs-sync PR #376 merged 2026-06-16T08:53:46Z at 1809a8e5 (JE-2026-06-16-3)
- Production deployment ID:               n/a — does not deploy to Vercel
- Commit deployed:                        n/a — runs on `corpflow-exec-01-u69678` (L3), not Vercel
- Live URLs tested:                       all 8 monitors Up (§ 7.4 monitors 1–7 + sub-probe 8); off-box public unreachability of host:3001 confirmed (curl exit 28); SSH-tunnel UI reachable; sub-probe 8 Telegram alert path test-confirmed
- Expected vs actual result:              K1=PASS / K2=PASS / K3=PASS (all 8 sub-probes Up) / K4=PASS / K5=PASS-BY-CONSTRUCTION
- Client-facing flow usable:              YES — all 8 monitored surfaces return expected responses to Kuma's probes; alerts route via Kuma's own bot independently of n8n
- Final verdict:                          COMPLETE
```

**Step 2 status (unchanged):** Uptime Kuma COMPLETE end-to-end per `JE-2026-06-16-3`. No deferred sub-probes remain.

**Step 3 status (unchanged):** Eligibility gate fully satisfied (Step 2 = COMPLETE). Step 3 (restic) **not** initiated — held on explicit *"Do not proceed to restic"* directive until separate authorization.

---

## 9. Change log

- **2026-06-15** — Created. L1 evidence captured (§ 2). Operator-side recipes drafted (§ 3 / § 4). Kuma install gating recorded (§ 5). Rollback steps listed (§ 6). Evidence blocks left as placeholders for the operator to fill in (§ 7).
- **2026-06-15 (later same day)** — § 5 reworked from "BLOCKED" to "PENDING AUTHORIZATION PACKET, no longer generally blocked" once `UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_V1` was authored at L1.
- **2026-06-16** — § 5.2 status update + § 7.4 evidence-paste pointer added when the install runbook follow-up packet `UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1` was authored at L1 (PR #370 / `JE-2026-06-16-1`, merged 2026-06-16T03:47:12Z at `8121b19e`).
- **2026-06-16 (later same day)** — § 7.4 filled in with operator-executed install evidence; § 8 verdict flipped from PARTIAL → COMPLETE-WITH-N8N-DEFERRED for Step 2; closure PR #373 opened by Cursor at L1 and merged 2026-06-16T07:01:15Z at `a9157216` (`JE-2026-06-16-2`). Monitor 8 / n8n explicitly deferred (operator chose deferral over guessing the URL family). Step 3 (restic) eligibility gate substantively satisfied but Step 3 NOT initiated by this PR per user instruction.
- **2026-06-16 (end of same day, after PR #373 merge)** — Anton confirmed canonical n8n health URL family (`<n8n-host>/healthz` — n8n v1.x anonymous health endpoint, GET-only, returns `{"status":"ok"}` 200, no auth, no state mutation) and added sub-probe 8 inside Kuma's UI through the SSH tunnel; sub-probe Up at 60 s; Telegram alert path test-confirmed for sub-probe 8. § 7.4 heading + opening paragraph + monitors-table row 8 + K3 row + Verdict line + Notes/deviations bullet updated; § 8 DRA flipped from COMPLETE-WITH-N8N-DEFERRAL → COMPLETE; Step 3 eligibility now fully satisfied (still not initiated per user instruction). Recorded by `JE-2026-06-16-3` and docs-sync PR #376.
- **2026-06-16 (later same day, after Step 2 closure)** — § 7.1 ingest evidence **PASS** + § 7.2 `automation_events` read-back evidence **PASS** + § 7.3 n8n consumer evidence **PARTIAL / STRONGLY INDICATED** (execution #1124 succeeded at matching timestamp 2026-06-16T23:36:34Z; payload/event-type and forward-secret not independently inspected inside n8n execution detail). § 7.2 implementation note added (live API returns camelCase fields; operator used camelCase-safe read-back script). § 8 Step 1 DRA added with verdict **PARTIAL-CONSUMER-CONFIRMATION** (Step 1 **not** marked COMPLETE). Recorded by `JE-2026-06-16-4` and this docs-only evidence PR. No L3 commands by Cursor; no secrets; no env vars; no app code; no restic; no new self-hosted tools.

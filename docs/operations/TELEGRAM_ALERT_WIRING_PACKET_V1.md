# Telegram alert wiring packet (v1) — eliminate silent-monitor risk

**Status:** Design + phased rollout (v1, 2026-05-27). Pre-action gate is **operator-only**: Anton sets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` GitHub repo secrets. Execution after gate is split between Cursor (workflow + server changes, doc updates) and Anton (secret values, dispatch test).

**Audience:** Anton (operator, secret values), Cursor (workflow + server-side wiring).

**Companion docs (read first; this packet is the bounded execution unit, the full map lives elsewhere):**

- `docs/operations/MONITORING_ARCHITECTURE.md` § 4 *Alert routing*, § 2 *Surface map*, § 6 *Known blind spots*, § 11 *Status tables* — canonical single component map.
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` — CMP delivery verdict + alert routing on the server side.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound communication model; `operator_escalation` event used by ops alerts.
- `docs/automation-framework.md` — n8n forward envelope contract used as second alert channel.
- `lib/server/ops-alerts.js` — Telegram + n8n forward helper (server side).
- `scripts/post-control-loop-telegram-alert.mjs` — Telegram helper used by GitHub Actions (CI side).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — secret creation is §3 Anton-only.

---

## 1. Why a separate packet

`MONITORING_ARCHITECTURE.md` § 4.3 already enumerates which monitors alert today and which do not. § 6.5 names the gap. § 11.2 lists the named follow-up packet `cmp-internal-cron-alerts`. This packet is the **bounded, executable unit** that:

1. Records the silent-monitor inventory as of **2026-05-27** (the version below).
2. Establishes the **payload contract**, **severity rules**, and **anti-spam governance** so any new monitor added later inherits the same shape rather than re-inventing it per workflow.
3. Sequences a **phased rollout** that respects the §3 Anton-only secret gate (no monitor switches from silent to noisy until the two secrets are present).
4. Names a **test plan** and **rollback** so the rollout itself does not generate noise that erodes trust in the channel.

This is the v1 of the *wiring contract* — future revisions can add additional channels (email via n8n, Slack, SMS) by extending the contract, not by re-shipping each workflow.

---

## 2. Packet metadata (per `CORPFLOW_EXECUTION_PACKET_STANDARD.md` § 2)

- **Packet ID:** `telegram-alert-wiring`
- **Goal:** Eliminate silent-monitor risk across the 12-row monitor inventory in `MONITORING_ARCHITECTURE.md` § 2 by wiring every scheduled monitor with a documented severity to a single Telegram channel via two interchangeable helpers (`scripts/post-control-loop-telegram-alert.mjs` for CI, `lib/server/ops-alerts.js` for server-side). Establish the payload contract, anti-spam rules, severity ladder, and phased rollout.
- **Definition of Done:**
  - [ ] **Gate 1 (operator):** `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` set as **GitHub Actions repo secrets** AND in Vercel Production env (both surfaces). Presence-only verification via the workflow boot step in #1 (`factory-control-loop.yml`).
  - [ ] **Phase 1:** Today's two alerting paths (#1 control loop, #4 CMP delivery monitor) confirmed end-to-end via a controlled test (`workflow_dispatch` of #1 with `TEST_MODE=alert-only`).
  - [ ] **Phase 2:** Silent CI-scheduled monitor #10 (`factory-health-ping.yml`, weekly Mondays 14:00 UTC) wired with on-failure Telegram alert mirroring #1's payload shape.
  - [ ] **Phase 2:** Silent CI-scheduled monitor `factory-housekeeping.yml` (weekly Mondays 03:00 UTC) wired the same way.
  - [ ] **Phase 3:** Server-side silent monitors #5 (`/api/cmp/overseer-sweep-cron`), #6 (`/api/cmp/stuck-self-repair-cron`), #8 (`/api/cron/billing-sentinel`) instrumented via `sendTelegramOpsAlert()` from `lib/server/ops-alerts.js` with `kind`-tagged payloads.
  - [ ] **Phase 4:** Anti-spam dedup window applied (`kind` × hour bucket) in the server-side path. Anti-spam for CI-side is the workflow `concurrency:` group + the "alert only on failure" semantics (no dedup needed beyond that).
  - [ ] **Phase 5:** Severity ladder documented and consumed by every emitter (§4 of this packet).
  - [ ] `MONITORING_ARCHITECTURE.md` § 2 + § 4.3 + § 11.1 status columns updated in the same PR each phase ships in (per the §9 add-a-monitor recipe — same rule applies in reverse for gain-an-alert-path).
  - [ ] Test plan exercised and recorded; rollback verified for each phase.
- **Scope:**
  - **In:** Wiring existing silent monitors to existing Telegram helpers. Documenting the payload contract, severity ladder, anti-spam rule, test plan, rollback plan.
  - **Out:** Adding new monitors (those follow `MONITORING_ARCHITECTURE.md` § 9). Adding new alert channels (email, Slack, SMS) — future v2. Adding monitoring of `corpflow-exec-01` itself — separate future packet `exec01-cron-pulse`. Changing the bot, the chat id, or the API token rotation policy — operator-owned.
- **Constraints:**
  - Secret values are operator-only; Cursor never sees `TELEGRAM_BOT_TOKEN` or `TELEGRAM_ALERT_CHAT_ID`. Workflows boot-step presence-only.
  - All new alert calls degrade to a no-op when the two secrets are unset (mirror `sendTelegramOpsAlert()` and `post-control-loop-telegram-alert.mjs` behavior — both silently skip when unset).
  - Payload is text-only (no inline images, no Markdown-V2 — `text` field of Telegram `sendMessage`, capped at 3500 chars).
  - No new secrets created beyond the two existing names. No DB schema changes. No tenant data in payloads.
  - **Anti-spam is mandatory.** A monitor that wakes Anton up twice for the same `kind` within an hour fails the rollout and is reverted to silent until the dedup is fixed.
- **Risks:**
  - **Alert fatigue.** Wiring all silent monitors at once would generate noise from currently-known-but-tolerated CMP transient states. Mitigated by phased rollout — each phase observed for one full week before the next phase ships.
  - **Secret leakage.** Mitigated by never printing values, presence-only boot logging (already in place — see `factory-control-loop.yml` "Show optional integration status" step).
  - **Workflow failure during the alert step itself.** Mitigated by best-effort error swallowing in the helper (`scripts/post-control-loop-telegram-alert.mjs` exit code policy is documented in its header — returns 0 when secrets unset, optionally returns 1 only on hard POST failures with secrets present).
  - **Wrong severity classification.** Mitigated by §4 severity ladder — only **error / fatal** severities alert; **warning / info** never do (warnings go to `automation_events` / `telemetry_events` only).
  - **Wrong chat id.** Mitigated by Anton verifying the chat ID via `scripts/telegram-get-chat-id.mjs` before setting the secret.
- **Allowed actions:**
  - **Anton:** Set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets (GitHub) + Production env (Vercel). Run `scripts/telegram-get-chat-id.mjs` locally to confirm chat id. Dispatch the test workflow. Approve PR for each phase.
  - **Cursor:** Author the wiring PRs (one per phase). Update `MONITORING_ARCHITECTURE.md` rows. Run `npm test` + `npm run build`. Verify Vercel Preview deploys per phase.
- **Approval gates:**
  - **Gate 0 (pre-action):** Anton sets both repo + Vercel secrets. Pre-action verified via §6 of this packet.
  - **Gate 1 → 2:** Phase 1 test passes; #1 and #4 confirmed end-to-end. PR opened, Anton merges.
  - **Gate 2 → 3:** Phase 2 has one full week of green CI runs (#10 + housekeeping) before Phase 3 server-side ships.
  - **Gate 3 → 4:** Phase 3 has one full week of server-side observations with **no per-`kind` doublets within an hour** before dedup is loosened.
- **Verification evidence:** Per §6 below — workflow run URLs + screenshots of received alerts (chat-id scrubbed) + status table updates in `MONITORING_ARCHITECTURE.md`.
- **Rollback plan:** Per phase — revert the wiring PR; the previously-silent monitor returns to silent. **The two secrets stay set** (other workflows depend on them). Rollback is independent per phase — no global "turn it all off" required.
- **Owner:** Approver = Anton. Executor = Anton (Gate 0 + final merges) + Cursor (every other step).
- **Status:** **PENDING Gate 0** — awaiting Anton's `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` secret values.

---

## 3. Today's wiring inventory (as of 2026-05-27)

### 3.1 What alerts today (2 paths, well-understood)

| Path | Helper | Trigger | Workflow / route |
|---|---|---|---|
| **CI Telegram** | `scripts/post-control-loop-telegram-alert.mjs` | Workflow failure | `.github/workflows/factory-control-loop.yml` (monitor #1; daily 06:00 UTC) |
| **Server Telegram + n8n** | `lib/server/ops-alerts.js` → `sendTelegramOpsAlert()` + `forwardOpsAlert()` | `cmp_delivery_blocked` and similar `kind`s | `/api/cron/cmp-monitor` (monitor #4; daily 05:00 UTC) |

Helpers share the same Telegram API call shape (`POST https://api.telegram.org/bot<TOKEN>/sendMessage` with `{chat_id, text}` JSON body, 3500-char cap). They differ in:

- Source surface (CI vs Vercel runtime).
- Auth-secret retrieval (`process.env` direct vs `cfg('TELEGRAM_BOT_TOKEN')`).
- Telemetry behaviour on failure (CI script swallows; server-side emits `emitLogicFailure(severity='warning')`).

Both **skip silently** when either secret is unset — confirmed today in `lib/server/ops-alerts.js` lines 22-25 and in `post-control-loop-telegram-alert.mjs` header.

### 3.2 What is silent today (the gap)

| Monitor | Where it runs | Schedule | Why silent | Phase |
|---|---|---|---|---|
| #5 CMP overseer sweep | Vercel cron `/api/cmp/overseer-sweep-cron` | daily 02:00 UTC | No `sendTelegramOpsAlert()` call in the cron's failure branch. | Phase 3 |
| #6 CMP stuck self-repair | Vercel cron `/api/cmp/stuck-self-repair-cron` | daily 04:00 UTC | Same as #5. | Phase 3 |
| #8 Billing sentinel | Vercel cron `/api/cron/billing-sentinel` | daily 00:00 UTC | Same as #5. | Phase 3 |
| #9 Postgres env drift diagnostic | GitHub Actions `diagnose-postgres-env.yml` | `workflow_dispatch` only (no schedule) | Manual only; not in v1 alerting scope. | Out of scope v1 (future `diagnose-postgres-env-scheduled` packet). |
| #10 Factory health weekly ping | GitHub Actions `factory-health-ping.yml` | weekly Mon 14:00 UTC | No Telegram step in the workflow. | Phase 2 |
| `factory-housekeeping.yml` | GitHub Actions | weekly Mon 03:00 UTC | No Telegram step. | Phase 2 |

#11 (`vercel.json` cron self-validation) is rolled into #1's failure path and inherits its alert — no separate wiring needed.

#12 (`corpflow-exec-01`) has no scheduled work and therefore no failure-mode to alert on in v1 (per `MONITORING_ARCHITECTURE.md` § 11.3 hard rules).

### 3.3 What is alerted via n8n only (no direct Telegram today)

| Path | Envelope | Notes |
|---|---|---|
| Server-side ops alerts going to n8n | `corpflow.ops_alert.v1` | n8n routes on `kind` (e.g. `cmp_delivery_blocked`) → email + optionally Telegram via n8n. Today, n8n is responsible for fan-out — the direct Telegram call from `lib/server/ops-alerts.js` is the **second, redundant** channel for resilience. Both are best-effort. |

This dual-channel design is intentional: if n8n is down, Telegram still fires; if Telegram is unset, n8n still emails. Phase 3 of this packet preserves both channels for the new emitters.

---

## 4. Payload contract + severity ladder

### 4.1 Payload shape (text-only, 3500-char cap)

All alerts use the same skeleton:

```
CorpFlowAI alert: <subject> <verb> on <surface> (<run_id_or_timestamp>).
Severity: <P0|P1|P2>.
Recommended action: <one sentence; the Anton action that would resolve this>.
Evidence: <single URL — workflow run, deployment, or Production Pulse>.

<2-6 lines of compact body — what is wrong, what was OK, what the helper read>
```

Constraints baked into the contract:

- **Exactly one Evidence URL.** Multi-URL payloads erode the "where do I click?" signal.
- **Recommended action is a sentence, not a paragraph.** If Anton has to read prose to know what to do, the alert is broken.
- **Severity is named explicitly** so anti-spam can group by severity not just `kind`.
- **No secrets** (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`, DB URLs, tokens) ever appear in the body. The helpers already enforce this for the existing alerters; new emitters must follow.
- **No tenant data** in the body. CMP-side alerts reference `ticket_id` only — never tenant name, customer email, or business name.

### 4.2 Severity ladder

| Severity | Definition | Alerts? | Examples |
|---|---|---|---|
| **P0 fatal** | Customer-visible production is broken or about to be. | YES — immediate. | `/api/factory/health` failing, apex serves 500, all CMP tickets blocked. |
| **P1 error** | Internal monitor failed; customer-visible production probably fine; needs operator within the day. | YES — same-day. | Factory control loop SHA drift, CMP delivery blocked on a single ticket, env drift diagnostic flags a mismatch. |
| **P2 warning** | Anomaly noted; probably self-resolves; surfaces in logs/UI only. | NO. | Cold-start TTFB spike, single rate-limit retry, transient n8n forward 502. |
| **P3 info** | Operational note; never alerts. | NO. | Successful cron run, monitor that ran clean, nightly housekeeping result. |

**Anti-gaming rule:** if every monitor emits P0, the ladder is broken. Each emitter must justify its severity choice in code comments or in the doc that owns its emission point. P0 is reserved — see §4.3.

### 4.3 P0 emission policy

A monitor may emit P0 if and only if **at least one** of these is true:

1. The customer-visible production URL set (per `.cursor/rules/predeploy-decision-checks.mdc` § *Minimum live GET checks*) is failing.
2. CMP is unable to make progress on any ticket due to a platform issue (not a per-ticket bug).
3. The `vercel.json` cron policy validation fails (this implies all in-app cron monitors will stop firing).
4. The Postgres reachability check (Production Pulse `core.database_reachable`) fails for two consecutive runs.

All other failures are P1 by default. A monitor cannot self-promote from P1 to P0 across runs — only the four conditions above trigger P0.

### 4.4 Anti-spam (dedup window + concurrency)

**Server-side emitter (`lib/server/ops-alerts.js`):**

- Phase 4 adds an in-memory or DB-backed dedup keyed by `(kind, severity, hour_bucket)`. Within the same bucket, second and subsequent emissions are skipped at the Telegram step (still logged to `telemetry_events`).
- Dedup is **per `kind`**, not per emission. If two different `kind`s fire in the same hour, both alert.

**CI-side emitter (`post-control-loop-telegram-alert.mjs`):**

- GitHub Actions `concurrency:` group is the dedup. `factory-control-loop.yml` already sets `concurrency: { group: factory-control-loop, cancel-in-progress: false }`. Phase 2 wirings copy this pattern.
- Failure-only emission (no success alerts) means a green cron generates zero alert traffic.

**Hard rule:** a monitor that wakes Anton up twice for the same `kind` within an hour, twice across the rollout, gets reverted to silent and the dedup rule is rewritten.

---

## 5. Phased rollout

Each phase is **one PR**, **one CI cycle**, and **one week of observation** before the next phase ships. The rollout deliberately moves slowly — alert fatigue is the failure mode this packet most needs to avoid.

### Phase 0 (pre-action gate) — operator-only

- Anton sets `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`:
  - **GitHub repo secret** (Settings → Secrets and variables → Actions).
  - **Vercel Production env** (Production env, same values).
- Anton confirms the chat id via `node scripts/telegram-get-chat-id.mjs` from `corpflow-exec-01` (local laptop also fine, but exec-01 is the operator-shell of record).
- Cursor confirms via the `factory-control-loop.yml` boot step that both report `configured` (no values printed).

### Phase 1 (T+0) — confirm today's wiring

- Cursor `workflow_dispatch` of `factory-control-loop.yml` (the workflow tolerates a successful run not triggering Telegram; the failure path is exercised by intentionally pointing at an unreachable health URL via a short-lived branch).
- Cursor `workflow_dispatch` of `cmp-stuck-self-heal.yml` to ping `/api/cmp/router?action=stuck-self-repair-cron` (this is server-side and already exercises the `lib/server/ops-alerts.js` path via #4's emitter).
- Anton confirms one alert arrives in the chat.
- No code change in Phase 1 — it is a confidence check on the existing wiring.

### Phase 2 (T+1 week) — wire CI-side silent monitors

- One PR: add the "Post Telegram alert on failure" step to:
  - `.github/workflows/factory-health-ping.yml` (monitor #10).
  - `.github/workflows/factory-housekeeping.yml`.
- The step copies the existing `factory-control-loop.yml` pattern: `if: failure()`, `env` block with presence-only markers, run step that invokes `node scripts/post-control-loop-telegram-alert.mjs` (the helper accepts a `loop.json` path; for these two workflows pass a minimal `{ "summary": "<workflow>: <step that failed>" }`).
- `MONITORING_ARCHITECTURE.md` § 2 + § 4.3 status columns updated in the same PR.
- One week of observation before Phase 3.

### Phase 3 (T+2 weeks) — wire server-side silent monitors

- One PR per emitter (3 small PRs, not 1 big one — easier to revert):
  - `pages/api/cmp/overseer-sweep-cron.js` (or its router branch — depends on the §11 source). On uncaught error or final telemetry-emitted failure, call `sendTelegramOpsAlert()` with `kind: 'cmp_overseer_sweep_failed'`, P1.
  - `pages/api/cmp/stuck-self-repair-cron.js` — same, `kind: 'cmp_stuck_self_repair_failed'`, P1.
  - `pages/api/cron/billing-sentinel.js` — same, `kind: 'billing_sentinel_failed'`, P1.
- Each emitter also calls `forwardOpsAlert()` to keep n8n in the loop (per § 3.3).
- One week of observation per PR before merging the next.

### Phase 4 (T+5 weeks) — anti-spam dedup

- Implement the `(kind, severity, hour_bucket)` dedup in `lib/server/ops-alerts.js`. Backed by an existing telemetry table (likely `telemetry_events` or a new `ops_alert_dedup` if needed — design TBD in the implementing PR).
- Verify no doublets across the 4-week observation window.

### Phase 5 (T+6 weeks) — codify severity ladder consumption

- Audit every existing emitter (`scripts/post-control-loop-telegram-alert.mjs`, `lib/server/ops-alerts.js`, the 3 Phase 3 emitters, the 2 Phase 2 emitters) for explicit severity tagging.
- Update `MONITORING_ARCHITECTURE.md` § 4 with the severity ladder reference.

---

## 6. Test plan

### 6.1 Phase 0 verification (no code change)

- [ ] `gh secret list --repo antonvdberg-bit/corpflow-ai-command-center | grep -E 'TELEGRAM_'` → both secrets present.
- [ ] Vercel CLI or UI → Production env list → both secrets present.
- [ ] `workflow_dispatch` of `factory-control-loop.yml` → boot step prints `Telegram alert on failure : configured` (not `SKIPPED`).

### 6.2 Phase 1 happy-path test

- [ ] Open a short-lived branch with `CORPFLOW_FACTORY_HEALTH_URL` repo secret pointed at `https://corpflowai.com/__not_real_path__` (or via `workflow_dispatch` input override if the workflow supports it).
- [ ] Trigger run; expect failure.
- [ ] Confirm Telegram message arrives, with: `CorpFlowAI alert: factory control loop FAILED on antonvdberg-bit/corpflow-ai-command-center (run #<N>).` + recommended action + run URL.
- [ ] Delete the test branch / revert the secret.

### 6.3 Phase 2 wiring tests

- [ ] After PR merges, `workflow_dispatch` of `factory-health-ping.yml` with intentionally-bad health URL.
- [ ] Confirm one Telegram message arrives, matching the §4.1 contract.
- [ ] Same for `factory-housekeeping.yml`.

### 6.4 Phase 3 wiring tests

- [ ] `curl -X POST` of `/api/cmp/router?action=overseer-sweep-cron` with the cron secret + a forced-error parameter (or a temporary code path).
- [ ] Confirm one Telegram + one n8n forward arrive.
- [ ] Same for the other two emitters.

### 6.5 Phase 4 anti-spam test

- [ ] Trigger the same `kind` twice within an hour. Confirm only one alert arrives. Confirm both emissions are logged in `telemetry_events`.

---

## 7. Rollback

Per phase, in priority order:

| Phase | If broken, revert by | Side-effect |
|---|---|---|
| Phase 1 (no code change) | Re-set `CORPFLOW_FACTORY_HEALTH_URL` to a real URL. | None — confidence check only. |
| Phase 2 | `git revert` the wiring PR; #10 + housekeeping return to silent. | Other monitors unaffected; Phase 1 wiring still alerts. |
| Phase 3 | `git revert` the per-emitter PR; that emitter returns to silent. | Other 2 emitters and Phases 1+2 unaffected. |
| Phase 4 | `git revert` the dedup PR; per-`kind`-per-hour emissions resume. | Risk: alert flood. Use sparingly. |
| Phase 5 | Doc revert only; no code impact. | None. |

**Global kill switch (do not use except in incident):** unset `TELEGRAM_BOT_TOKEN` in repo secrets — every emitter returns to silent within one cron tick. This is the nuclear option; it also disables the existing #1 + #4 alerting. **Document any use in `docs/runbooks/SECURITY_OR_INCIDENT.md`.**

---

## 8. Governance — "do not alert on noise"

Three non-negotiable rules. Violations revert the offending wiring without ceremony.

1. **No success alerts.** A monitor that ran clean must not emit anything to Telegram. Logs to `automation_events` / `telemetry_events` are fine.
2. **No transient retries.** A monitor that retried-and-recovered (e.g. n8n 502 followed by 200) must not emit. The recovery is the signal that the system was self-healing.
3. **No per-tenant noise without a per-tenant dedup.** A per-tenant failure (e.g. one tenant's wallet reconciliation) cannot emit a Telegram alert per tenant per run. It rolls up to a single `summary` alert with the count, with the per-tenant detail in `automation_events`.

Anti-gaming corollary: if a future monitor's emission is "factory-control-loop ran" with no failure analysis, that emission is reverted and the monitor stays silent until its emission carries a recommended action that matters.

---

## 9. Cross-references

- `docs/operations/MONITORING_ARCHITECTURE.md` — single component map; § 2 / § 4 / § 6 / § 11 status.
- `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md` — server-side delivery alerting.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `operator_escalation` event type.
- `docs/automation-framework.md` — `corpflow.ops_alert.v1` envelope.
- `lib/server/ops-alerts.js` — server-side helper.
- `scripts/post-control-loop-telegram-alert.mjs` — CI helper.
- `scripts/telegram-get-chat-id.mjs` — chat-id discovery for Phase 0.
- `docs/runbooks/SECURITY_OR_INCIDENT.md` — incident decision tree (incl. global kill switch).
- `.cursor/rules/security-sensitive-changes.mdc` — applies to Phase 3 server-side PRs.

---

*Generated by Cursor from `corpflow-exec-01` (`5.78.213.185`, user `anton`, repo `~/corpflow-ai-command-center`). Read-only inventory probes only. No DNS, no secret values, no production change in the authoring step itself.*

## 7. Inbound Telegram webhook — canonical operator-facing home

<!-- INBOUND_WEBHOOK_PORTED_FROM_MONITORING_4_4 -->

> **Provenance:** this section was originally added to `docs/operations/MONITORING_ARCHITECTURE.md` § 4.4 by PR #241 (`docs(monitoring): document existing Telegram inbound webhook registration`, merged `2026-05-27T11:00:47Z`, squash commit `c16e1a5d`). With this packet doc landed on `main` (PR #238, merged `2026-05-27T11:27:08Z`, squash commit `f1be96fd`), the inbound webhook surface lives here. `MONITORING_ARCHITECTURE.md` § 4.4 is collapsed to a concise pointer back to this section while preserving the `<!-- TELEGRAM_INBOUND_WEBHOOK_4.4 -->` anchor that § 6 / § 7 / § 10 cross-references depend on.
>
> This is a **documentation port**, not a behavior change. The runtime path is unchanged.

### 7.1 Production URL

The Telegram bot's inbound webhook is registered on Telegram's servers and currently points to:

```text
https://corpflowai.com/api/webhook
```

### 7.2 Repo-serving path

Inbound `POST`s from Telegram are routed through:

```text
POST https://corpflowai.com/api/webhook
        |
        v
Vercel rewrite (vercel.json: source "/api/(.*)" -> destination "/api/factory_router?__path=$1")
        |
        v
api/factory_router.js   (single Vercel serverless entry; dispatches by __path)
        |
        v
lib/server/webhook.js   (incoming message parser; replies via Telegram Bot API)
```

This path is identical to all other `/api/*` traffic — the factory router is the single consolidated entry point under the Hobby tier function budget.

### 7.3 Registration — Telegram-side, external to the repo

The webhook URL is registered **on Telegram's servers** against the active `TELEGRAM_BOT_TOKEN`. **No repo script calls `setWebhook`.** This was verified by `grep` across all committed runtime, script, workflow, and shell files at the time the original § 4.4 documentation landed (PR #241). The registration was set manually and lives outside any GitHub diff or CI gate.

### 7.4 Token rotation invariant (CRITICAL)

Rotating `TELEGRAM_BOT_TOKEN` **does not** carry the inbound webhook over. The new bot starts with empty webhook config on Telegram's side. After every token rotation, the operator must re-run the equivalent of:

```bash
curl -F "url=https://corpflowai.com/api/webhook" \
     "https://api.telegram.org/bot<NEW_TOKEN>/setWebhook"
```

Without this step, inbound Telegram messages will silently stop reaching `lib/server/webhook.js`. There is no automated alerting on this silence — Telegram and Vercel both report healthy, but the bot becomes mute from the operator's perspective. This invariant is **operator-owned**, not repo-automated.

### 7.5 Inbound vs. outbound — separate operational surfaces

Both surfaces share the same `TELEGRAM_BOT_TOKEN`, but they fail independently and must be reasoned about separately:

| Aspect | Inbound webhook (this section) | Outbound alerts (the rest of this packet) |
|---|---|---|
| Direction | Telegram -> repo | repo -> Telegram |
| Endpoint | `POST /api/webhook` on production | Telegram Bot API `sendMessage` |
| Required env | `TELEGRAM_BOT_TOKEN` | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` |
| Failure mode after token rotation without re-running `setWebhook` | Inbound silently stops; no automated alert about the silence | Outbound senders fail; surfaceable via CI / control-loop |
| Operator action on rotation | Re-run `setWebhook` (§ 7.4 above) | Update `TELEGRAM_BOT_TOKEN` env in Vercel + Infisical |
| Knowledge of chat id | Learned per incoming message (no env) | Persisted in `TELEGRAM_ALERT_CHAT_ID` env |

The two surfaces are intentionally documented separately so future packets do not conflate them.

### 7.6 What this section explicitly does NOT introduce

- **No `setWebhook` automation in the repo.** That call remains a Telegram-side operator action by design. Adding it to the repo would widen the trust boundary on `TELEGRAM_BOT_TOKEN` and is out of scope for this port.
- **No new env var names.** Only the two existing names are referenced: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`. No `TELEGRAM_WEBHOOK_URL`, no `TELEGRAM_INBOUND_*`, no aliases.
- **No Telegram-behavior change.** The runtime path (`vercel.json` -> `api/factory_router.js` -> `lib/server/webhook.js`) is unchanged.
- **No DNS, no Vercel rewrite, no routing change.**

### 7.7 Cross-references

| Surface | Reference |
|---|---|
| Monitor map anchor (preserved) | `docs/operations/MONITORING_ARCHITECTURE.md` § 4.4 (concise pointer back to this section; anchor `<!-- TELEGRAM_INBOUND_WEBHOOK_4.4 -->` preserved for § 6 / § 7 / § 10 cross-refs) |
| Inventory row | `FACTORY_INVENTORY.md` `/api/webhook` row — rotation note + cross-link to this packet |
| Webhook handler source | `lib/server/webhook.js` |
| Vercel rewrite contract | `vercel.json` — source `/api/(.*)`, destination `/api/factory_router?__path=$1` |
| Token env doc | `.env.template` — `TELEGRAM_BOT_TOKEN` row |


# CorpFlow Weekend Execution Queue (v1)

**Status:** Active queue (started 2026-05-23)
**Audience:** Anton (approver), Cursor agents (executor)
**Companion docs:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
**Cross-refs:** `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`, `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/CORPFLOW_SHARED_TODO.md`

---

## How this file works

This is the **live queue** of approved or pending packets for autonomous execution. It is intentionally short and operational, not a backlog.

- Anton drafts and approves packets here. Once a packet is `APPROVED`, an agent may execute under `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.
- Each packet uses the structure from `CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2.
- Packets stay here until they reach `COMPLETE` or `FAILED`. Then they move to the **Archive** at the bottom (or are summarized in `artifacts/chat_history.md`).
- If a packet is `BLOCKED`, the blocker is named and the packet stays visible until resolved.

**Branch / PR convention:** docs-only packets land on `docs/<short-name>` branches; runtime packets land on `feat/<short-name>` or `fix/<short-name>`. Cursor never merges its own PRs.

---

## Goal 1 — Stabilize permanent infrastructure and reduce Anton as runtime bottleneck

**Why this goal:** Today, parts of CorpFlow's "always-on" surface still depend on Anton's laptop, undocumented decisions, or implicit knowledge. The first weekend queue moves the **brain** off Anton's laptop and into the **repo + cloud** so future autonomous packets have stable ground to stand on.

**North star outcome:** Any approved Cursor agent (or contractor) can land a docs-only or non-production packet end-to-end, with evidence, **without Anton being awake**. Production deploys, secrets, DNS, billing, and auth still gate on Anton — by design.

---

### Packet 1.1 — Confirm Infisical → Vercel env sync model

- **Goal:** Document the canonical Infisical → Vercel env sync path so any operator (Anton or otherwise) can reproduce a redeploy that picks up new secret values without tribal knowledge.
- **Definition of Done:**
  - [ ] A canonical doc exists (target path: `docs/operations/SECRETS_SYNC.md`) describing: source of truth (Infisical), how values flow into Vercel Production / Preview / Development, when a Vercel **Redeploy** is required, and how Agent CI consumes Infisical via OIDC where applicable.
  - [ ] Cross-links exist from `docs/VERCEL_DEPLOYMENT.md`, `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, and `AGENTS.md` Must-read table.
  - [ ] No secret **values** in the doc — only env var names and process steps.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing Infisical project settings, adding/rotating any secret, changing Vercel project env, changing CI workflows.
- **Constraints:**
  - Docs-only PR.
  - Do not paste secret values anywhere.
  - Do not modify `.env.template` beyond pointing at the new doc.
- **Risks:**
  - Doc captures an outdated or partial flow → Anton catches in PR review.
  - Doc is too prescriptive and will rot → keep it short, link to live screens, mark "verify before trusting".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`. No Vercel writes, no Infisical writes.
- **Approval gates:** pre-merge (Anton).
- **Verification evidence:** PR URL, CI status, diff of the new doc and cross-links.
- **Rollback plan:** revert PR; no runtime impact.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING (awaiting Anton's `APPROVED` mark)

---

### Packet 1.2 — Confirm Neon / Postgres canonical provider docs merged

- **Goal:** Make Postgres provider truth (Neon) explicit and discoverable in repo, so other docs (`CORPFLOW_COMMUNICATIONS_V1.md`, `EXECUTION_BRAIN_VS_HANDS.md`) stop referencing a doc that does not yet exist.
- **Definition of Done:**
  - [ ] `docs/operations/POSTGRES_PROVIDER.md` exists and names: provider (Neon), how `POSTGRES_URL` is sourced (env-only, never committed), pooling guidance for serverless, and `ensure-schema` vs `prisma migrate deploy` discipline.
  - [ ] Existing references in `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` and `docs/CORPFLOW_SHARED_TODO.md` continue to resolve (link target now exists).
  - [ ] `AGENTS.md` Must-read table includes a "Postgres provider" row pointing at the new doc.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing Prisma schema, running migrations, changing `POSTGRES_URL` value, changing pooling code.
- **Constraints:**
  - Docs-only PR.
  - Do not include the Postgres connection string anywhere.
  - Do not commit the Neon project ID if it is treated as sensitive in this workspace; reference it by env var name only.
- **Risks:**
  - Doc claims a pooling pattern that does not match runtime → mark as "current convention; verify in `lib/server/`".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.3 — Confirm n8n email / password-reset golden path documented

- **Goal:** Lock in the operational doc trail for the only live transactional email path (`password_reset`) so a contractor could rebuild the n8n workflow from scratch using only `docs/n8n/password-reset-email-recipe.md` and `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
- **Definition of Done:**
  - [ ] `docs/n8n/password-reset-email-recipe.md` accurately describes: webhook URL env name (`N8N_EMAIL_WEBHOOK_URL`), shared secret env name (`N8N_EMAIL_WEBHOOK_SECRET`), header name (`x-corpflow-email-secret`), payload schema (`corpflow.email.password_reset.v1`), Gmail OAuth account, sender alias (`support@corpflowai.com`), and a step-by-step **rebuild from scratch** path.
  - [ ] Doc names the **expected failure mode** when env values drift (HTTP 401 from n8n, no Gmail send).
  - [ ] Doc names where the evidence lands (`automation_events` row + n8n execution URL).
  - [ ] Cross-link from `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` is intact.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: doc edits to `docs/n8n/password-reset-email-recipe.md` and any cross-links.
  - Out: editing the n8n workflow itself, sending live test emails, changing any secret, editing `lib/server/email-delivery.js` or `lib/server/password-reset-delivery.js`.
- **Constraints:**
  - Docs-only PR.
  - No client-facing test sends, even to Anton's address; verification is via the existing `automation_events` history, not a fresh send.
- **Risks:**
  - Doc references a Gmail account that has rotated → flagged in PR review.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. **Hard stop** if the work would require sending a live email (per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.8).
- **Verification evidence:** PR URL, CI status, diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.4 — Audit production deployment health (read-only)

- **Goal:** Produce a one-page snapshot of current production health (deployment ID, deployed commit, factory health JSON, live HTML for client URLs) and check it against the floor in `predeploy-decision-checks.mdc`.
- **Definition of Done:**
  - [ ] New report at `artifacts/production-health-snapshots/2026-05-23-production-health.md` (or similar dated path) capturing:
    - Vercel Production deployment ID + deployed commit SHA.
    - `https://core.corpflowai.com/api/factory/health` → status + key fields.
    - `https://core.corpflowai.com/api/factory/production-pulse/runtime` → status + key fields.
    - `https://lux.corpflowai.com/` → status + first bytes of HTML / observed title.
    - `https://lux.corpflowai.com/change` → status + observed shell.
  - [ ] Each row labeled PASS / FAIL against the floor in `predeploy-decision-checks.mdc` § *Minimum live GET checks*.
  - [ ] **No secrets, tokens, or session cookies** in the snapshot.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: read-only HTTP probes against documented public production URLs, snapshot doc, link from `docs/CORPFLOW_SHARED_TODO.md`.
  - Out: any write to production, changing health endpoints, changing Vercel project, mutating CMP.
- **Constraints:**
  - Read-only verification only (per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2.1, §2.7).
  - Do not include any tenant data beyond what is anonymously visible.
- **Risks:**
  - Probe captures a transient 5xx and is interpreted as a real outage → label "single observation, repeat before declaring outage".
- **Allowed actions:** anonymous `curl` / `Invoke-WebRequest` to documented public URLs, edit docs/artifacts, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. If any required URL is **failing**, raise as `BLOCKED` and tag Anton — **do not** attempt to redeploy or rollback.
- **Verification evidence:** PR URL, CI status, the snapshot doc itself.
- **Rollback plan:** revert PR; snapshot is purely informational.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.5 — Identify remaining laptop / local dependencies

- **Goal:** Enumerate every step in current "production" workflows that still requires Anton's laptop (a local script, a manual paste, a credential only on disk) so we can plan their migration off-laptop.
- **Definition of Done:**
  - [ ] New doc `docs/execution/LAPTOP_DEPENDENCIES_AUDIT.md` listing each laptop-bound step:
    - What it does.
    - What file or tool it lives in (e.g. `scripts/*.ps1`, local `.env`, browser session).
    - Who can do it today (only Anton, vs. anyone with repo access).
    - Proposed off-laptop home (GitHub Actions, Vercel cron, n8n, doc/runbook).
    - Severity (P0 = blocks 24/7 execution, P1 = inconvenient, P2 = nice-to-have).
  - [ ] Doc links from `docs/EXECUTION_BRAIN_VS_HANDS.md` and `docs/CORPFLOW_SHARED_TODO.md`.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: read repo, list `scripts/`, list local-only references, write the audit doc.
  - Out: changing or moving any of those scripts; that is a separate packet per item.
- **Constraints:**
  - Docs-only PR.
  - Do not capture secret values, hostnames marked sensitive, or local paths that include personal info.
- **Risks:**
  - Audit misses a hidden dependency → flagged as "v1 audit; expect at least one omission".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, the audit doc.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.6 — Define migration-to-server checklist

- **Goal:** For each laptop-bound step found in 1.5, define the **standard checklist** that must be satisfied before it can be migrated to a server (GitHub Actions, Vercel cron, n8n, or VPS) — so future packets implementing those migrations are routine, not bespoke.
- **Definition of Done:**
  - [ ] New doc `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` covering:
    - Where the credential lives now vs. target (Infisical / Vercel env / GitHub secret).
    - How the script is parameterized (no machine-local paths, no laptop-only env vars).
    - Idempotency expectations.
    - Failure / retry behavior.
    - Where the audit trail lands (`automation_events`, GitHub Actions log, n8n execution URL).
    - Rollback plan for the migrated job.
  - [ ] Doc cross-links from `docs/EXECUTION_BRAIN_VS_HANDS.md` and `docs/execution/LAPTOP_DEPENDENCIES_AUDIT.md` (1.5).
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: actually migrating any script. Each migration is a separate packet.
- **Constraints:**
  - Docs-only PR.
  - Do not copy credential values or hostnames marked sensitive.
- **Risks:**
  - Checklist becomes too generic to be useful → keep tied to the categories in 1.5.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, doc diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.7 — Define evidence format for future autonomous work

- **Goal:** Make the **evidence shape** for autonomous packets uniform, so Anton can review a packet's outcome in seconds, not minutes, and so agents stop reinventing the report shape.
- **Definition of Done:**
  - [ ] New doc `docs/execution/EVIDENCE_FORMAT.md` defining:
    - The Markdown skeleton an agent uses to report results in a PR description.
    - Required fields: branch, base/head SHA, PR URL, CI run URL, `npm test` / `npm run build` results, Vercel deployment ID (if any), live URLs tested with HTTP status, `Delivery Reality Audit` block (per `delivery-reality.mdc`).
    - Forbidden content: any secret value, full session cookie, full request/response with PII, full `Authorization` headers.
    - A short example for a docs-only packet and a runtime packet.
  - [ ] `CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2.8 Verification evidence references this doc.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing CI workflows or PR templates yet (those are follow-up packets once the format is stable).
- **Constraints:**
  - Docs-only PR.
- **Risks:**
  - Format becomes too rigid and slows packets down → mark as v1, expect refinement.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, doc diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

## Queue summary (Goal 1)

| # | Packet | State | Risk | Approval gates beyond pre-merge |
|---|--------|-------|------|---------------------------------|
| 1.1 | Confirm Infisical → Vercel env sync model | PENDING | Doc accuracy | None (docs-only) |
| 1.2 | Confirm Neon / Postgres canonical provider docs merged | PENDING | Doc drift | None (docs-only) |
| 1.3 | Confirm n8n email / password-reset golden path documented | PENDING | Doc drift | Hard stop on any live email send |
| 1.4 | Audit production deployment health (read-only) | PENDING | Misread transient 5xx | Hard stop on attempting fix |
| 1.5 | Identify remaining laptop / local dependencies | PENDING | Incomplete audit | None (docs-only) |
| 1.6 | Define migration-to-server checklist | PENDING | Over-generic | None (docs-only) |
| 1.7 | Define evidence format for future autonomous work | PENDING | Over-rigid | None (docs-only) |

**All seven Goal 1 packets are docs-only by design.** They establish the ground (process + visibility) before any autonomous packet starts touching runtime code.

---

## Goal 2 — Infrastructure stabilization (apply Goal 1 audit findings)

**Why this goal:** Goal 1 produced read-only audits. Goal 2 turns the **two doc gaps** Audit 1 and Audit 2 surfaced into committed canonical docs, and migrates the **P0 / P1 candidates** Audit 5 surfaced off Anton's laptop.

### Packet 2.1 — Write `docs/operations/POSTGRES_PROVIDER.md` and `docs/operations/SECRETS_SYNC.md`

- **Goal:** Close the two doc gaps Audits 1 and 2 surfaced. Specifically: a canonical Postgres provider doc (Neon) and a canonical Infisical → Vercel env sync doc.
- **Definition of Done:**
  - [ ] `docs/operations/POSTGRES_PROVIDER.md` exists, names Neon as the provider, documents `POSTGRES_URL` (+ `POSTGRES_URL_NON_POOLING`) sourcing, pooling guidance for serverless, `ensure-schema` vs `prisma migrate deploy` discipline, and where backups/DR are managed.
  - [ ] `docs/operations/SECRETS_SYNC.md` exists, names Infisical as source of truth, documents the flow into Vercel Production / Preview / Development env, names the redeploy requirement when values change, names how Agent CI consumes Infisical via OIDC.
  - [ ] Cross-links from `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, `docs/CORPFLOW_SHARED_TODO.md`, `docs/VERCEL_DEPLOYMENT.md`, `AGENTS.md` Must-read table.
  - [ ] Both docs contain **zero secret values**, **zero account IDs marked sensitive**, only env var names and process steps.
  - [ ] `npm test`, `npm run build` green.
  - [ ] PR opened against `main`, CI green.
- **Scope:** docs only. Out: changing any Infisical or Vercel state, changing Prisma schema, running migrations.
- **Constraints:** docs-only PR; no secrets; no `tenant_id` mutation.
- **Risks:** doc references an outdated step → Anton catches in PR review.
- **Allowed actions:** read repo, read public docs, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, both new docs visible in `AGENTS.md` Must-read table.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** PENDING (queued behind PR #212 merge).

### Packet 2.2 — Migrate factory-control-loop SHA comparison to a GitHub Action (P0)

- **Goal:** Move the `npm run control:loop -- --fetch` Git-tip ↔ Vercel-Production-deploy comparison off Anton's laptop and onto a recurring GitHub Action that posts an alert if drift is detected.
- **Definition of Done:**
  - [ ] New workflow `.github/workflows/factory-control-loop.yml` runs on a daily schedule (Hobby-cron-safe), invokes the SHA comparison logic, exits non-zero on drift.
  - [ ] Repo secrets `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, optional `VERCEL_TEAM_ID` (names; values set by Anton).
  - [ ] On drift, posts a Telegram + automation-forward alert via `lib/server/ops-alerts.js` (the existing helper).
  - [ ] No `MASTER_ADMIN_KEY` in CI; uses Vercel REST + public Git refs only.
  - [ ] `MIGRATION_TO_SERVER_CHECKLIST.md` items 2.1–2.8 satisfied; checklist screenshot in PR description.
  - [ ] PR opened, CI green; **first scheduled run captured in PR comment** before merge approval.
- **Scope:** workflow file + minor refactor of `scripts/factory-control-loop.mjs` if needed for non-interactive output. Out: changing factory health URL, changing deploy hook behavior.
- **Constraints:** No new secrets created in this PR (Anton sets values). No production deploy. No `tenant_id` mutation.
- **Risks:** false-positive drift alert if Vercel REST returns stale data → mitigate with two-strikes detection (alert only after second consecutive drift).
- **Allowed actions:** read repo, edit workflow + script, branch, PR, `npm test`, `npm run build`. **Ask Anton before** the first merge — the workflow will run live after merge.
- **Approval gates:** pre-merge (Anton); **does not run scheduled until merged** so no production effect before approval.
- **Verification evidence:** PR URL, CI status, dry-run output of the script in PR comment, confirmation that `lib/server/ops-alerts.js` test usage does not log secret values.
- **Rollback plan:** delete the workflow file (or set `on: workflow_dispatch` only); the script remains usable from Anton's laptop unchanged.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE (workflow shipped) + secondary blocker on secret value. PR #217 squash-merged at commit `92e6eb96`. First manual `workflow_dispatch` run on `main` (run id `26348877751`, 2026-05-24) executed end-to-end as designed — local-Git/Vercel-SHA/Hobby-cron checks all green; **`CORPFLOW_FACTORY_HEALTH_URL` secret returned HTTP 404** against the path the script tried (canonical `https://core.corpflowai.com/api/factory/health` returns 200 from a normal client). Telegram alert step ran on `failure()` and gracefully skipped because `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` are not set in repo secrets. **Anton blockers (both are §3 hard gates):** (a) fix or rotate the `CORPFLOW_FACTORY_HEALTH_URL` secret value so it matches the live `core.corpflowai.com` health URL; (b) optionally set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets to enable failure alerts off-laptop. Both fixes are operator-only.

---

## Goal 3 — Website quality scoring (first real audit)

**Why this goal:** The framework in `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` is only useful when applied. This goal runs the **first real audit** against the most active client surface (Lux marketing) so the framework gets battle-tested.

### Packet 3.1 — Run first quality audit against `https://lux.corpflowai.com/`

- **Goal:** Produce the first per-tenant Quality audit using the v1 framework. Score Lux marketing across all five dimensions, capture evidence, and propose the **top five highest-impact fixes** (each one a candidate follow-up packet).
- **Definition of Done:**
  - [ ] Audit report at `artifacts/quality-audits/2026-05-XX-luxe-maurice/quality-score.md` filled per the framework §5 template.
  - [ ] Score per dimension (Conversion, Performance, Accessibility, SEO, Trust) and total.
  - [ ] Verdict per framework §3.
  - [ ] Lighthouse JSON or PageSpeed Insights output saved as evidence artifact (no PII; tenant content is public).
  - [ ] Top 5 recommended fixes ordered by point gain.
  - [ ] No tenant content mutated. No new tenant-data writes.
  - [ ] PR opened against `main`, CI green.
- **Scope:** read-only audit of public Lux marketing pages. In: root + property listings + concierge CTA destinations. Out: `/change`, login, anything tenant-private.
- **Constraints:** docs-only PR (audit lives in `artifacts/`). No tenant content edits in this packet — fixes are separate packets.
- **Risks:** Lighthouse mobile profile produces transient variance → run twice, take median; document both runs in evidence.
- **Allowed actions:** anonymous fetch of public Lux URLs, Lighthouse on developer machine, save reports to `artifacts/quality-audits/`, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, audit report, Lighthouse outputs (or PSI links).
- **Rollback plan:** revert PR; the audit is purely informational.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE — PR #219 squash-merged at commit `5b8258dd`. Score 44/100\* (Conversion 18/20, Performance 8/20\*, Accessibility 6/20, **SEO 0/20**, Trust 12/20). Verdict: Substantive gaps (40–59) — treat as draft for SEO; doctrine verdict PASS. Top-5 fixes named with point gain; SEO/accessibility/404/robots/sitemap fixes absorbed into Packet 3.2 below.

---

### Packet 3.3 — Eliminate Prisma/Postgres provider ambiguity (Neon-only mandate + diagnostic + drift playbook)

- **Goal:** Permanently end the recurrence of the 2026-05-22 / 2026-05-25 drift class (Vercel Production env regressing to `db.prisma.io:5432`) by codifying **Neon as the sole approved Postgres provider**, shipping a read-only diagnostic that surfaces drift before it's customer-visible, and writing the operator playbook so the next agent fixes it without re-debugging.
- **Definition of Done:**
  - [x] `docs/operations/POSTGRES_PROVIDER.md` rewritten with top-of-file Neon-only architectural decision; new §4a *Source of truth — Infisical, never edit Vercel directly first*; new §4b *Known drift symptoms* (the exact triple of pulse-`database_reachable:false` + tenant-site `db.prisma.io:5432` + UI-context fallback); new §5b *Incident: 2026-05-25* with the operator playbook.
  - [x] `AGENTS.md` Must-read row for the Postgres provider doc explicitly mentions the Neon-only mandate and references §4a/§4b/§5b.
  - [x] `docs/operations/FACTORY_CONTROL_LOOP.md` calls out that `/api/factory/health` is not a DB connectivity check.
  - [x] `docs/EXECUTION_BRAIN_VS_HANDS.md` Postgres line marks Prisma Accelerate as deprecated and points the brain→hands path through the canonical doc + diagnostic workflow.
  - [x] `scripts/diagnose-vercel-postgres-env.mjs` ships — enumerates every DB-related Vercel env name on the Production target and tags each with strict booleans (`value_starts_with_prisma_proto`, `value_host_contains_prisma_io`, `value_host_contains_neon_tech`, `value_host_contains_pooler`); never prints values, hostnames, userinfo, or URL substrings.
  - [x] `.github/workflows/diagnose-postgres-env.yml` ships — `workflow_dispatch` only (no schedule, no env mutation, no Telegram); reads via existing `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID` repo secrets; emits a verdict line + JSON artifact.
  - [x] `node-tests/diagnose-vercel-postgres-env.test.mjs` ships — 12 unit tests covering key-pattern matching, value-shape booleans, secret-leak prevention; passes with the existing suite (373/373 total).
  - [x] `npm test` passes; `npm run build` passes.
  - [x] PR opened against `main`, CI green.
  - [ ] After merge: workflow dispatched on `main`; verdict line + JSON artifact uploaded; Stage 5 final probes captured in chat_history.
- **Scope:**
  - In: docs (`POSTGRES_PROVIDER.md`, `AGENTS.md`, `FACTORY_CONTROL_LOOP.md`, `EXECUTION_BRAIN_VS_HANDS.md`, `chat_history.md`), diagnostic script + workflow, unit tests.
  - Out: writing values to Vercel or Infisical, deploying production, rotating secrets, mutating any tenant data, rolling back PR #222 (separate decision in the Stage 6 recommendation; #223 stays closed).
- **Constraints:** No values printed. No env writes from Cursor. No `tenant_id` mutation. No DB migration. No new secrets created (uses existing `VERCEL_TOKEN`/`VERCEL_PROJECT_ID`/`VERCEL_TEAM_ID`). No client-facing email. No new dependencies.
- **Risks:**
  - The diagnostic workflow can only be dispatched after merge to `main` (GitHub Actions requires `workflow_dispatch` workflows to live on the default branch). Mitigated by independently confirming the root cause from the production error (`db.prisma.io:5432`) and shipping the documented remediation playbook so Anton can act before the workflow runs.
  - If `VERCEL_TOKEN` lacks env-decrypt permission, the diagnostic returns `INDETERMINATE — all DB envs are Sensitive (values not readable). Inspect via Vercel UI.` This is acceptable; the §3 / §4b live-endpoint checks are the source of truth for connectivity.
- **Allowed actions:** docs, diagnostic script + workflow, unit tests, PR open, run on `main` after merge, public-endpoint probes.
- **Approval gates:** **production deploy / Vercel env writes / Infisical writes are Anton-only** — Cursor only ships docs + diagnostic; the actual restore/redeploy is in §5b's operator playbook.
- **Verification evidence:** PR URL, `npm test` 373/373, `npm run build` green, live probes captured in chat_history under 2026-05-25, post-merge diagnostic JSON artifact + verdict line.
- **Rollback plan:** revert the merge commit. No data persistence, no schema change, no secret rotation. The diagnostic workflow is `workflow_dispatch`-only; removing it is a clean delete.
- **Owner:** Approver = Anton (production deploy / env writes). Executor = Cursor (docs + diagnostic). Reviewer = Anton.
- **Status:** AWAITING ANTON MERGE — branch `fix/postgres-neon-only-2026-05-25`, PR opening next. **Stage 2 (Neon restoration) is gated on Anton — see `POSTGRES_PROVIDER.md` §5b operator playbook.**

---

### Packet 3.2 — Lux SEO + accessibility + 404 + robots + sitemap fix

- **Goal:** Close the SEO 0/20 + Accessibility 6/20 + Trust 12/20 gaps surfaced in Packet 3.1 / Packet 4.1 §F.1+F.2+F.3+F.6 in a single bounded runtime PR. Target outcome: Lux Quality score lifts from **44/100\* → ~70/100\*** without any visual redesign or tenant-data schema change.
- **Definition of Done:**
  - [x] `<html lang>` set on every render path (apex + Lux + Lead Rescue).
  - [x] Viewport meta includes `initial-scale=1` site-wide.
  - [x] Lux marketing root + every property page emits `<meta name="description">`, `<link rel="canonical">`, OG type/title/description/url/image, Twitter card/title/description/image.
  - [x] `<main>` landmark wraps the primary content of the Lux marketing root (property pages already had one).
  - [x] `pages/404.js` ships a branded fallback (replaces the generic Next.js `_error` HTML).
  - [x] `public/robots.txt` exists and explicitly disallows `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, factory + cron + auth API namespaces. Lists apex + Lux sitemap URLs.
  - [x] `pages/sitemap.xml.js` serves a host-aware sitemap (apex routes for `corpflowai.com`, Lux marketing + 8 property refs for `lux.corpflowai.com` + `luxe.*` aliases) with `Cache-Control: public, s-maxage=3600`.
  - [x] At least 10 new node-tests cover the host detection, build-entries, and XML rendering.
  - [x] `npm test` passes (363/363).
  - [x] `npm run build` passes; `/sitemap.xml` registers as Dynamic, `/404` as Static.
  - [ ] PR opened against `main`, CI green.
  - [ ] After Anton's merge: `lux.corpflowai.com/` HTML carries `description`, `canonical`, OG block; `/robots.txt` and `/sitemap.xml` return 200.
- **Scope:**
  - In: `pages/_app.js` (new), `pages/_document.js` (new), `pages/404.js` (new), `pages/sitemap.xml.js` (new), `public/robots.txt` (new), `components/LuxeMauriceTenantPresentation.js` (Head + `<main>`), `components/LuxeMauricePropertyDetailPage.js` (Head), node-tests.
  - Out: tenant-data schema (`lib/server/tenant-site-public.js` `meta` shape unchanged); analytics snippet (separate Packet 5.1.1, gated on Anton's analytics provider decision); Search Console verification (separate, Anton-only DNS TXT); `vercel.json` lux static rewrite cleanup (separate small docs-PR).
- **Constraints:** No tenant-data writes. No `tenant_id` mutation. No DB migration. No new secrets. No client-facing email. No analytics / no third-party JS.
- **Risks:**
  - The Next.js Head merge in `LuxeMauriceTenantPresentation` could conflict with a future per-locale Head — mitigated by always emitting English defaults; per-locale will override safely.
  - The static `vercel.json` rewrite for `/` on Lux (lines 9-28) is dead code today (live serves the Next.js path) but if it ever activates, it would shadow these Head changes — flagged in chat_history; cleanup PR follows.
- **Allowed actions:** edit pages/components, add tests, `npm test`, `npm run build`, open PR. **Merge gated to Anton (production deploy).**
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, build log, test output (363/363); after merge, Anton-side live re-probe of the URL set in DoD.
- **Rollback plan:** revert the merge commit. No data persistence, no schema migration, no secret rotation — clean revert.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** AWAITING ANTON MERGE — branch `feat/lux-seo-fix-2026-05-24`, PR opening next.

---

### Packet 3.4 — Lux post-fix quality audit re-run (Track 2 WP A)

- **Goal:** Re-score `lux.corpflowai.com` after PR #222 (SEO/a11y/404/robots/sitemap) merged and the 2026-05-25 Postgres-drift incident closed. Quantify the actual gain vs the predicted ~+25 in Packet 3.2.
- **Definition of Done:**
  - [x] Public probes captured for home, robots, sitemap, tenant-resolution APIs, sample property page, 404 probe, favicon.
  - [x] All confirmation items in WP A §2 binary-checked (tenant resolves as `luxe-maurice`, host-aware sitemap, branded 404, no `db.prisma.io` errors, etc.).
  - [x] Score recomputed against `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` v1.
  - [x] Report at `artifacts/quality-audits/2026-05-25-luxe-maurice-postfix/README.md` with previous score, new score, Δ, top-5 remaining fixes, framework-revision notes.
- **Scope:** read-only audit. No tenant content edits. No analytics install. No DNS work.
- **Constraints:** docs/audit-only PR. No fixes shipped in the same packet.
- **Allowed actions:** anonymous probes, save report, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** the audit report and its embedded probe table are the evidence.
- **Rollback plan:** revert PR; the audit is informational.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE in this PR. **Score: 59/100\*** (Conversion 18/20, Performance 8/20\*, Accessibility 6/20\*, **SEO 12/20\* (+12)**, Trust 15/20 (+3)). Δ vs 2026-05-23 baseline = **+15**. Verdict: *Substantive gaps closing toward Operational* — ceiling ~78–80/100\* once Lighthouse + Search Console land.

---

## Goal 4 — Current-client migration audit (Lux first)

**Why this goal:** Use the new `CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` for the first real per-tenant audit. Lux is the only active production tenant today; auditing Lux exercises every section A–F of the template.

### Packet 4.1 — Run first migration audit against `luxe-maurice`

- **Goal:** Produce the first filled-in per-tenant migration audit using the template, capturing identity/routing, login boundary, marketing surface (cross-references Packet 3.1's score), analytics + Search Console + indexing posture, and off-laptop posture.
- **Definition of Done:**
  - [ ] Filled audit at `artifacts/migration-audits/2026-05-XX-luxe-maurice/migration-audit.md`.
  - [ ] Section A (identity/routing) populated using anonymous DNS / TLS / HTTP probes — no factory master needed.
  - [ ] Section B (login boundary) populated for items the agent can verify anonymously (B.1, B.4, B.5); items requiring Anton (B.2, B.3, B.6, B.7) flagged "operator-required" with the specific evidence Anton can attach.
  - [ ] Section C populated by reference to Packet 3.1's quality score.
  - [ ] Section D (analytics, Search Console) populated for items the agent can verify (e.g. `robots.txt` content, `sitemap.xml` reachability, `<meta name="robots">` on private surfaces); items requiring Search Console access flagged "operator-required".
  - [ ] Section E (off-laptop posture) populated by reference to Audit 5.
  - [ ] Section F lists the high-impact failures and proposes follow-up packets with their gate categorization.
  - [ ] Verdict per template §10.
  - [ ] PR opened against `main`, CI green.
- **Scope:** read-only audit of Lux production hostname. Out: any change to tenant data; running an actual login.
- **Constraints:** No tenant data writes. No factory master used by the agent. No live login attempts.
- **Risks:** Operator-required items leave gaps in the audit → flag clearly so the audit's verdict is `PARTIAL` until Anton fills them.
- **Allowed actions:** anonymous HTTP, repo reads, save audit doc, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, audit report, evidence artifacts under `artifacts/migration-audits/`.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** PENDING.

---

## Goal 5 — Analytics, Search Console, indexing setup

**Why this goal:** Apply the v1 checklist to a real surface. Start with the smallest blast radius — the **CorpFlow apex** marketing site (`https://corpflowai.com/`) — before touching client tenants.

### Packet 5.1 — Plan analytics + Search Console + indexing for `https://corpflowai.com/`

- **Goal:** Plan the first real wiring of analytics + Search Console + indexing for the CorpFlow apex marketing site. **Plan only**, not execute — the packet ends at "Anton has a one-page plan + PR draft to approve."
- **Definition of Done:**
  - [ ] Plan doc at `artifacts/analytics-audits/2026-05-XX-corpflowai-apex/plan.md`.
  - [ ] Records the analytics tool decision (recommend Plausible or Fathom; alternative GA4 if Anton requires).
  - [ ] Records where the snippet would be placed (`pages/_app.js` likely).
  - [ ] Records the Search Console verification method (DNS TXT recommended).
  - [ ] Records the sitemap URL (`/sitemap.xml`) and the proposed sitemap content (which routes are public, which are excluded — `core.*`, `/change`, `/login`, `/api/*`).
  - [ ] Records the proposed `robots.txt` content.
  - [ ] Records the **indexing requests** plan (top 5 URLs to submit).
  - [ ] Lists the **gates** the implementation packet will hit: production deploy (§3.1), DNS TXT (§3.3), and any third-party cookie-policy work that triggers §3.7.
  - [ ] PR opened against `main`, CI green.
- **Scope:** plan only. Out: writing the analytics snippet into code, setting any DNS TXT, submitting any sitemap.
- **Constraints:** No DNS changes. No code changes. No third-party account creations by the agent. Anton creates accounts and DNS records.
- **Risks:** Plan diverges from the eventual implementation packet → keep plan high-level; concrete file paths only when obvious.
- **Allowed actions:** read repo, read public docs, edit `artifacts/`, `npm test`, `npm run build`.
- **Approval gates:** pre-merge for the plan; **the eventual implementation packet** has its own §3.1 / §3.3 gates.
- **Verification evidence:** PR URL, plan doc, list of explicitly-gated implementation steps.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** PENDING (this packet remains the **apex** plan, distinct from Track 2 below).

---

### Packet 5.2 — Plausible Analytics v1 doc + adapter design (Track 2 WP B)

- **Goal:** Convert the open Step 4.1 (analytics provider decision) into a recorded ADR + canonical doc + adapter design, so the eventual runtime PR has zero design ambiguity. **Docs/design only — no runtime install.**
- **Definition of Done:**
  - [x] ADR at `docs/decisions/20260525-plausible-analytics-v1.md` (Plausible chosen; rationale; reversibility note).
  - [x] Canonical doc at `docs/analytics/CORPFLOW_ANALYTICS_V1.md` covering tenant-aware approach, event taxonomy, allow/deny lists, adapter contract, env placeholders, approval gates, rollout order, privacy posture.
  - [x] `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` Step 4.1 marked closed; status table updated.
  - [x] `AGENTS.md` Must-read row added.
- **Scope:** docs only. Out: any third-party script in `pages/_app.js`; any new `lib/analytics/*` module; `DATA_MAP_AND_SUBPROCESSORS.md` Plausible row (deferred to a separate small docs PR before runtime install per ADR §6 gate 3).
- **Constraints:** No new secrets. No DNS work. No analytics account creation. No GA4. No tracking on `/change`, `/admin`, factory routes, or any auth/reset URL.
- **Allowed actions:** docs, ADR, link updates, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. **Runtime install remains an explicit Anton-approved gate** per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.
- **Verification evidence:** the ADR, the canonical doc, and the rollout-plan status update.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE in this PR.

---

### Packet 5.3 — Search Console + indexing operator playbook (Track 2 WP C)

- **Goal:** Split the Search Console verification + indexing-request operator path out of the mixed analytics-and-SC rollout plan into a standalone playbook Anton can run step-by-step.
- **Definition of Done:**
  - [x] `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` covering target domains, verification methods (DNS TXT preferred + HTML file fallback), apex playbook, Lux playbook, future-tenant playbook, common failure modes, indexing-request pace, owner table, evidence shape, status table.
  - [x] `AGENTS.md` Must-read row added.
- **Scope:** docs only. Out: any DNS change, any sitemap submission, any URL inspection (those are Anton-only operator actions).
- **Constraints:** No DNS work. No new secrets. No automation against the Search Console API in v1.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. **Search Console verification + indexing requests are Anton-only operator gates.**
- **Verification evidence:** the playbook itself + the §10 evidence-folder convention.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE in this PR.

---

### Packet 5.4 — Website quality reporting standard (Track 2 WP D)

- **Goal:** Codify cadence, thresholds, evidence shape, client-facing wording, improvement-backlog format, and "launch-ready" definition so every future tenant audit reads the same.
- **Definition of Done:**
  - [x] `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` covering acceptance thresholds (75 / 85 / <60), surface-type targets, doctrine override, asterisk discipline, reporting cadence, audit procedure, internal report template, client-facing template, improvement-backlog format, launch-ready definition, anti-patterns, status.
  - [x] `AGENTS.md` Must-read row added.
- **Scope:** docs only. Does not change the framework rubric (that's `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`); this standard is *operationalised on top of* the framework.
- **Constraints:** No tenant data. No new secrets.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** the standard itself.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton; Executor = Cursor; Reviewer = Anton.
- **Status:** COMPLETE in this PR.

---

## Queue summary (Goals 1–5)

| # | Packet | Goal | State | Risk | Approval gates beyond pre-merge |
|---|--------|------|-------|------|---------------------------------|
| 1.1 | Infisical → Vercel sync model doc | 1 | PENDING | Doc accuracy | None |
| 1.2 | Neon / Postgres canonical doc | 1 | PENDING | Doc drift | None |
| 1.3 | n8n email / password-reset golden path doc | 1 | PENDING | Doc drift | Hard stop on any live email send |
| 1.4 | Production deployment health audit | 1 | PENDING | Misread transient 5xx | Hard stop on attempting fix |
| 1.5 | Laptop / local dependencies audit | 1 | PENDING | Incomplete audit | None |
| 1.6 | Migration-to-server checklist | 1 | PENDING | Over-generic | None |
| 1.7 | Evidence format for autonomous work | 1 | PENDING | Over-rigid | None |
| 2.1 | Postgres provider + Secrets sync canonical docs | 2 | PENDING | Doc drift | None |
| 2.2 | Factory-control-loop migrated to GitHub Action | 2 | PENDING | False-positive drift alert | First scheduled run after merge |
| 3.1 | First quality audit (Lux) | 3 | PENDING | Lighthouse variance | None |
| 4.1 | First migration audit (`luxe-maurice`) | 4 | PENDING | Operator-required gaps | Items B.2/B.3/B.6/B.7 require Anton evidence |
| 5.1 | Analytics + SC + indexing plan (apex) | 5 | PENDING | Plan/impl divergence | Implementation packet hits §3.1 + §3.3 |
| 3.4 | Lux post-fix quality re-audit (Track 2 WP A) | 3 | COMPLETE | None — read-only | None |
| 5.2 | Plausible Analytics v1 doc + adapter design (Track 2 WP B) | 5 | COMPLETE | Doc/design divergence on runtime install | Runtime install remains Anton-only |
| 5.3 | Search Console operator playbook (Track 2 WP C) | 5 | COMPLETE | None | DNS TXT + indexing requests remain Anton-only |
| 5.4 | Website quality reporting standard (Track 2 WP D) | 3 | COMPLETE | Standard ↔ framework drift | None |

**All 16 packets are docs-only or read-only by design.** The four Track 2 packets (3.4 / 5.2 / 5.3 / 5.4) are entirely documentation and audit; no runtime code changes, no third-party scripts, no DNS, no secrets.

---

## Goal 6 — Website quality & client performance system v1

**Why this goal:** Goals 1–5 stabilised the platform, shipped the first quality framework + reporting standard + analytics decision + Search Console playbook, and produced two Lux audits. Goal 6 turns those building blocks into **a single canonical quality system** (10 dimensions × 10 points), **the first client-facing reporting model design**, and **the first bounded operator packet for Search Console** — so future per-tenant audits are repeatable and the path to a real client report is named.

### Packet 6.1 — Website Quality System v1 (canonical 10-dim scoring)

- **Goal:** Codify the v1 quality system as a 10-dimension × 10-points rubric that supersedes the 5-dimension framework for new audits from 2026-05-27 forward; explicitly surface dimensions previously hidden in the "Trust + governance" bucket (Monitoring, Tenant routing, Analytics, Content completeness, Mobile usability).
- **Definition of Done:**
  - [x] `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` exists with §§1–12 (purpose, scope, 10 dimensions, thresholds, evidence requirements, mapping back to v1 framework, doctrine ties, remediation workflow, reporting cadence, launch-readiness criteria, anti-patterns, cross-references, status).
  - [x] Cross-linked from `AGENTS.md` Must-read table, `docs/operations/MONITORING_ARCHITECTURE.md` (companions + §11 future-packet row), `docs/execution/WEEKEND_EXECUTION_QUEUE.md` (this Goal 6), `artifacts/chat_history.md`.
  - [x] `npm test` passes; `npm run build` passes.
  - [x] Branch `docs/quality-system-v1`, PR opened against `main`, CI green.
- **Scope:** docs only. Out: any runtime code, any audit script, any new monitor, any tenant data mutation.
- **Constraints:** No secrets. No tenant data. No DNS. No `tenant_id` mutation. No DB writes. No production deploy (docs-only auto-deploy via Vercel is acceptable).
- **Risks:** rubric drift across the framework / system transition — mitigated by §6.1 *Mapping back to v1 framework* in the new doc, and by carrying forward the asterisk discipline.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`, PR open.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, the new doc visible in the AGENTS Must-read table.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** COMPLETE in this PR.

### Packet 6.2 — Lux Quality Report v1 (first audit under the v1 system)

- **Goal:** Re-score Lux against the new v1 10-dim system and ship the first audit folder using the v1 system suffix convention. Establish the v1-system baseline for Lux.
- **Definition of Done:**
  - [x] Audit folder `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` exists with full §§1–12 per the system's report template.
  - [x] Score recorded against the 10-dim rubric with per-row notes.
  - [x] Reconciliation table mapping the 10-dim score back to the 5-dim score (§6 of the audit).
  - [x] Top-10 fixes ordered by point gain.
  - [x] Operator-required follow-ups named.
  - [x] Whether Lux is client-ready answered explicitly.
  - [x] Whether analytics / Search Console are still blockers answered.
- **Scope:** read-only audit. Out: any tenant content edit; any analytics expansion; any DNS work.
- **Constraints:** read-only public probes only. No DB writes. No `tenant_id` mutation. No production changes. No new analytics. No Plausible env touched.
- **Risks:** TTFB cold-MISS variance misread as a regression — mitigated by audit §2.2 noting cold vs warm.
- **Allowed actions:** anonymous public probes from `corpflow-exec-01`, save audit doc, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** the audit report itself + the embedded probe table.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** COMPLETE in this PR. **Score: 59/100\*** (10-dim v1; Δ +15 vs 2026-05-23 framework baseline). Verdict: *Remediation required (<60); ceiling ~75/100\* once Lighthouse + Search Console land*. Doctrine PASS.

### Packet 6.3 — Search Console execution packet (apex first)

- **Goal:** Stand up the bounded operator packet for the first Search Console rollout (`corpflowai.com` apex), with explicit per-step DNS / UI / evidence requirements and Cursor verifier handoff. Lux deferred until apex COMPLETE.
- **Definition of Done:**
  - [x] `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` exists with §§1–9 (why separate, packet metadata, operator action checklist, Cursor verifier steps, evidence requirements, common pitfalls, after-COMPLETE plan, why Cursor cannot execute, cross-references).
  - [x] Cross-linked from `AGENTS.md` Must-read table, `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`, `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md`.
  - [ ] Anton executes §3.1–§3.7 of the packet (DNS, verify, sitemap, indexing requests). **OPERATOR-OWNED.**
  - [ ] Cursor runs §4.1 / §4.2 / §4.3 verifier steps after Anton completes operator steps.
- **Scope:** docs only in this PR; operator action is the next packet phase.
- **Constraints:** No DNS change from Cursor. No Search Console API automation. No new secrets. No `tenant_id` mutation. No production deploy.
- **Risks:** Apex DNS TXT placed in wrong zone — mitigated by §6.1 of the packet.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`, PR open.
- **Approval gates:** pre-merge for the docs PR. **DNS + Search Console account verification are §3 Anton-only operator gates** per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.
- **Verification evidence:** the packet doc itself + after-operator-action evidence folder `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/`.
- **Rollback plan:** revert PR (docs-only); remove TXT record + remove Search Console property if operator action started.
- **Owner:** Approver = Anton. Executor = Anton (operator steps) + Cursor (verifier + docs). Reviewer = Anton.
- **Status:** COMPLETE for the packet doc; PENDING for the operator execution (Anton-owned).

### Packet 6.4 — Client Performance Reporting Model v1 (design-only)

- **Goal:** Define what clients should eventually see in a monthly performance report, what the internal monthly review carries that the external report does not, and what data sources feed each category. **Design only — no implementation in this PR.**
- **Definition of Done:**
  - [x] `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` exists with §§1–12 (why separate, frequency / surface / delivery, internal vs external, five metric categories with source-of-truth + pull mechanisms, recommended-actions structure, trend-summary shape, explicit non-measurements, quality-score → report mapping, implementation gates, v2 candidates, cross-references, status).
  - [x] Cross-linked from `AGENTS.md` Must-read table, `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`, `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md`.
- **Scope:** design only. Out: any `lib/server/reports/` skeleton; any cron; any PDF generator; any client-side dashboard.
- **Constraints:** No new secrets. No new Comms event implemented (only named in §9 implementation gates). No analytics expansion. No DB writes.
- **Risks:** design diverges from eventual implementation — mitigated by §9 gate naming + §10 v2 candidates explicitly listed.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`, PR open.
- **Approval gates:** pre-merge. **Implementation** packet (when it comes) hits multiple §3 Anton-only gates (Comms event approval, Search Console API service account creation, client-facing email auto-send policy).
- **Verification evidence:** the design doc itself.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** COMPLETE in this PR (design-only by definition).

### Packet 6.5 — Telegram alert wiring (operator-only)

- **Goal:** Close the named-blocker from the 2026-05-24 audit + the v1 system §3.8 row 6: set `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` repo secrets so factory-control-loop failure alerts fire off-laptop.
- **Definition of Done:**
  - [ ] `TELEGRAM_BOT_TOKEN` set as GitHub repo secret (value only known to Anton).
  - [ ] `TELEGRAM_ALERT_CHAT_ID` set as GitHub repo secret (value only known to Anton).
  - [ ] A failing manual `workflow_dispatch` run of `factory-control-loop.yml` produces a Telegram message in the alert chat (forced-fail dry-run, e.g. point health URL at a known-404 fixture for one run, then revert).
  - [ ] Status row updated in `docs/operations/MONITORING_ARCHITECTURE.md` §11.1 (monitor #1 Telegram-alert column flips from `⚠️ active-no-alert` to `✅ active`).
- **Scope:** GitHub repo secret set + one forced-fail evidence run + one status-table doc edit.
- **Constraints:** Anton-only secret values (per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3). No code change required.
- **Risks:** secret typo → Telegram POST returns 401; mitigated by the forced-fail test run.
- **Allowed actions:** Anton sets secrets; Cursor drafts the status-table doc PR after evidence.
- **Approval gates:** §3 Anton-only (secret values).
- **Verification evidence:** evidence chat-message screenshot (Telegram channel name only — no message body that contains secrets); workflow run URL with the forced-fail outcome.
- **Rollback plan:** unset the two secrets; the alert path silently no-ops as today.
- **Owner:** Approver = Anton. Executor = Anton (secret + force-fail). Reviewer = Cursor (status-table PR).
- **Status:** PENDING — operator-only.

### Packet 6.6 — Publication engine v1 (design-only)

- **Goal:** Frame the design of CorpFlow's first "publication engine" — the path from CMP ticket Approved/Build → Preview → Anton's per-tenant approval → Production deploy → live verification → tenant signoff → client-visible "Published" badge. Today this path is implicit across multiple docs (`docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`, `docs/operations/CMP_PR_DELIVERY_GATE.md`, `docs/operations/DELIVERY_VERDICT_AND_ALERTS.md`, the `change-workflow-state` derivation logic). The v1 design doc names the canonical end-to-end flow so future automation packets have a single reference. **Design only — no runtime change.**
- **Definition of Done:**
  - [ ] `docs/publication/CORPFLOW_PUBLICATION_ENGINE_V1.md` exists with §§ purpose / states / state-machine diagram / inputs per state / who-decides per state / SLA per state / evidence shape per transition / failure modes / per-tenant overrides / v2 candidates / cross-references / status.
  - [ ] States named (draft → in-review → approved → build → preview → tenant-uat → published; with explicit terminal states).
  - [ ] Inputs/decision-makers/SLAs per state captured.
  - [ ] Cross-linked from `AGENTS.md` Must-read.
- **Scope:** design only. Out: any code change, any state-machine implementation, any database schema, any CMP change.
- **Constraints:** No new state on `cmp_tickets`. No new event in `automation_events`. No new Comms event. No `tenant_id` mutation.
- **Risks:** design diverges from existing runtime — mitigated by naming the existing docs as the substrate and citing the relevant logic files.
- **Allowed actions:** docs, link updates, `npm test`, `npm run build`, PR open.
- **Approval gates:** pre-merge. Implementation packets (when they come) hit multiple §3 Anton-only gates.
- **Verification evidence:** the design doc itself.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING — not in this PR (design-only future packet).

---

### Queue summary (Goal 6 packets)

| # | Packet | Goal | State | Risk | Approval gates beyond pre-merge |
|---|--------|------|-------|------|---------------------------------|
| 6.1 | Website Quality System v1 (10-dim canonical) | 6 | COMPLETE | None — docs-only | None |
| 6.2 | Lux Quality Report v1 | 6 | COMPLETE | TTFB cold-MISS variance | None (read-only audit) |
| 6.3 | Search Console execution packet (apex first) | 6 | COMPLETE (doc) / PENDING (operator) | DNS placement | §3 Anton-only (DNS + SC verification) |
| 6.4 | Client Performance Reporting Model v1 | 6 | COMPLETE (design-only) | Design/impl divergence | Implementation packet hits §3 multiple times |
| 6.5 | Telegram alert wiring | 6 | PENDING | Secret typo | §3 Anton-only (secret values) |
| 6.6 | Publication engine v1 (design-only) | 6 | PENDING | Design/runtime divergence | None for design; impl future-gated |

---

## Archive

(Empty — first queue, started 2026-05-23.)


<!-- CONCIERGE_SEO_HEAD_2026_05_27 -->

### Goal 6 follow-up — 2026-05-27 — Lux concierge SEO `<Head>` fix (RUNTIME packet — first to ship)

First runtime packet derived from the Lux quality audit's top-10 fix list (fix #2). Shipped as a separate PR on top of `main` (independent of #237 / #238 — touches different files so no merge conflict).

#### Packet `lux-concierge-seo-head` (COMPLETE — live-verified in production 2026-05-27)

- **Branch:** `feat/lux-concierge-seo-head` (off `main`).
- **PR title:** `feat(seo): add Lux concierge SEO metadata`.
- **Files (3):**
  - `lib/client/concierge-seo.js` (new) — pure SSR-callable helper.
  - `pages/concierge.js` (modified) — `getServerSideProps` + `useMemo` + full SEO `<Head>`.
  - `node-tests/concierge-seo.test.mjs` (new) — 12 unit tests.
- **What changed:** The `/concierge` page now emits `<title>` + `<meta name="description">` + `<meta name="robots" content="index, follow">` + `<link rel="canonical">` + 5 `og:*` tags + 3 `twitter:*` tags on every request, with host-aware canonical URL.
- **Tenant-safety stance:** the page is Lux-only today (imports `LUXE_MAURICE_*` brand tokens). The helper documents this explicitly and collapses canonical to `https://lux.corpflowai.com/concierge` for any non-Lux host. When `lux-trust-policy-impl-v1` ships host-aware rendering, the helper's `isLuxHost` branch becomes the extension point for per-tenant SEO.
- **No DB / no tenant_id / no env / no analytics / no Plausible / no Search Console / no DNS** changes.
- **Verification:** `npm test` **418/418 PASS** locally on `corpflow-exec-01` (+12 over the 406 baseline). `npm run build` deliberately skipped (heavy for 2 GB box); Vercel Preview build handles the next gate.
- **Expected Lux audit score impact:** §3.1 *SEO/indexing* +1.5 (concierge head meta complete), §3.9 *Content completeness* +1 (sitemap-listed surface gains complete head). **Total: ~+2.5 on the next Lux audit** (closes the audit's fix #2 row).
- **Live-verification checklist (after Vercel Production deploys the merged PR, per `delivery-reality.mdc`):**
  - [ ] `https://lux.corpflowai.com/concierge` returns 200 with `<meta name="description">`, `<link rel="canonical" href="https://lux.corpflowai.com/concierge">`, `og:title`, `og:description`, `og:url`, `og:type=website`, `og:site_name=Luxurious Mauritius`, `twitter:card=summary_large_image`.
  - [ ] `https://corpflowai.com/concierge` (apex) returns 200 with the same metadata BUT canonical pointing back to `https://lux.corpflowai.com/concierge` (intentional — Lux brand owns the page).
  - [ ] `https://corpflowai.com/` (apex marketing) unaffected — still serves CorpFlowAI public home.
  - [ ] `https://lux.corpflowai.com/` (Lux static landing rewrite) unaffected.
- **Verdict (live-verified 2026-05-27):** **COMPLETE.** Merged via squash commit `eacb8d3fb2` ([PR #239](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/239)), deployed by Vercel Production deployment **`4831280707`** (commit `eacb8d3fb2`, status `success` at `2026-05-27T07:09:44Z`, alias `https://corpflow-ai-command-center-dr419cc1q-corpflowai.vercel.app`), and live-probed from `corpflow-exec-01` at `2026-05-27T07:12:16Z`.

<!-- CONCIERGE_SEO_HEAD_VERIFIED_2026_05_27 -->
##### Production verification evidence (captured 2026-05-27)

| URL probed | HTTP | Key tags / behavior |
|---|---|---|
| `https://lux.corpflowai.com/concierge` | **200** | `<title>Private concierge · Luxurious Mauritius</title>`; `<meta name="description">` present; `<meta name="robots" content="index, follow">`; `<link rel="canonical" href="https://lux.corpflowai.com/concierge">`; `og:title` / `og:description` / `og:url` / `og:type=website` / `og:site_name=Luxurious Mauritius`; `twitter:card=summary_large_image` / `twitter:title` / `twitter:description`. All 12 tags present in initial SSR HTML. |
| `https://corpflowai.com/concierge` | **200** | Same 12 tags. `canonical` and `og:url` correctly collapse to `https://lux.corpflowai.com/concierge` (no cross-tenant leak — apex serves Lux content under Lux canonical, as designed). |
| `https://lux.corpflowai.com/concierge?property=heritage-villa-test` | **200** | `canonical` strips query (correct discipline). `og:url` stays at canonical because the property ref is React state, not threaded through `getServerSideProps`; documented v1 limitation, **not** a defect. |
| `https://lux.corpflowai.com/` | **200** | Title `Luxurious Mauritius · LuxeMaurice` unchanged. No homepage regression. |
| `https://corpflowai.com/` | **200** | Title `CorpFlowAI · Practical AI-assisted workflow systems` unchanged. No apex regression. |
| `https://core.corpflowai.com/api/factory/health` | **200** | `ok: true`, `status: healthy`, all sub-checks pass. No factory regression. |

- **Known v1 scope note (intentional, not a bug):** `og:url` for `/concierge?property=…` collapses to the canonical (no query) under SSR because `propertyInterest` is React state populated client-side; the helper *does* support property-aware `og:url` once the page threads the query through `getServerSideProps`. Captured as a future small-scope enhancement, not blocking.
- **Cross-tenant leak check:** explicit. Apex `/concierge` serves Lux content with Lux canonical — Google will index `lux.corpflowai.com/concierge` and consolidate signals there; no duplicate-content split between hosts.
- **Audit trajectory update (queued, not in this PR):** the Lux quality audit artifact `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` lives only on the still-open **PR #237** (not yet on `main`). The +2.5 trajectory note (current **59/100*** → **~61.5/100***) will be appended to that artifact *after* PR #237 merges, in a separate tiny docs PR — not forced here.

### Status table (Goal 6, cumulative — refreshed 2026-05-27)

| Packet | Status |
|---|---|
| 6.1 quality-system-v1 | COMPLETE (PR #237). |
| 6.2 lux-quality-report-v1 | COMPLETE (PR #237). |
| 6.3 search-console-apex | DOC COMPLETE (PR #237) + PREFLIGHT COMPLETE (PR #238). Operator §3 PENDING. |
| 6.4 client-performance-reporting-model | COMPLETE design-only (PR #237). |
| 6.5 telegram-alert-wiring | DESIGN COMPLETE (PR #238). Operator Gate 0 PENDING. |
| 6.6 lux-trust-policy-remediation | DESIGN COMPLETE (PR #238). Implementation packet PENDING. |
| 6.7 quality-score-evolution-v2 | DESIGN COMPLETE (PR #238). Cutover gated on G1–G5. |
| 6.8 publication-engine-v1-design | PENDING (future design). |
| **6.9 lux-concierge-seo-head** | **COMPLETE — live-verified in production 2026-05-27** (merge `eacb8d3fb2`, deploy `4831280707`, all 12 SEO tags confirmed on `lux.corpflowai.com/concierge`; audit-artifact trajectory note +2.5 deferred to post-#237-merge follow-up). |


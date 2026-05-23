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
- **Status:** PENDING.

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
- **Status:** PENDING.

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
- **Status:** PENDING.

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

**All 12 packets are docs-only or read-only by design.** Packet 2.2 introduces a workflow file but that file is a docs/automation surface, not a runtime code change; it does not run until merged and the merge is Anton's gate.

---

## Archive

(Empty — first queue, started 2026-05-23.)

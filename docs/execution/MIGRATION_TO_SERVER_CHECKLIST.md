# Migration-to-server checklist (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton, Cursor agents, contractors
**Companion docs:** `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`, `docs/execution/WEEKEND_EXECUTION_QUEUE.md`, `artifacts/audits/2026-05-23-weekend/05-laptop-local-dependencies.md`
**Cross-refs:** `.cursor/rules/security-sensitive-changes.mdc`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, `docs/EXECUTION_BRAIN_VS_HANDS.md`, `.env.template`

---

## 1. When this checklist applies

Use this checklist whenever a packet proposes moving a **recurring** or **time-driven** action off Anton's laptop and onto a server (GitHub Actions, Vercel cron, n8n, or a long-running container). It does **not** apply to one-off operator scripts or to interactive break-glass tools — those should stay laptop-locked per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.

A migration packet that does not satisfy every required item below is **rejected** at the pre-merge gate.

---

## 2. The checklist (required for any migration packet)

### 2.1 Credential placement

- [ ] **Source of truth identified.** The credential currently lives in Anton's local `.env`/`.env.local` or in his head. Name the env var (never the value).
- [ ] **Target home chosen.** One of: Infisical project (preferred for secrets that already exist there), Vercel project env (for Vercel-hosted runtime), GitHub Actions repository secret (for CI-only credentials), n8n credential store (for n8n-bound flows).
- [ ] **No credential broadening.** The migration does not give a wider audience (CI runners, n8n workflows) access than they have today. If it does, an explicit `policy:` PR per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §6 must precede it.
- [ ] **No factory master in CI** unless absolutely required. Prefer `CORPFLOW_CRON_SECRET` / `CRON_SECRET` (already used by Vercel crons + `factory-cmp-drive.yml`) over `MASTER_ADMIN_KEY` for scheduled jobs. Documented pattern: `Authorization: Bearer ${CORPFLOW_CRON_SECRET}` against routes that accept it.
- [ ] **Rotation story.** Name the env that holds the credential, the surface that consumes it, and the human who rotates it. Rotation should not require a code change.

### 2.2 Parameterization (no machine-local state)

- [ ] **No hard-coded paths.** No `C:\Users\anton\…`, no `/Users/…`, no profile-relative paths.
- [ ] **No hard-coded hostnames.** Production URLs come from env (`CORPFLOW_PUBLIC_BASE_URL`, `CORPFLOW_FACTORY_HEALTH_URL`, `LUX_SMOKE_BASE_URL`, etc.).
- [ ] **No "first-run" assumptions.** The script does not assume an interactive shell, an open browser session, or a saved OS credential.
- [ ] **`bootstrap-repo-env.mjs` import discipline.** Node scripts that read `process.env` import the bootstrap module first; on a server the `.env` files are absent and the script falls through to actual env.

### 2.3 Idempotency and safety

- [ ] **Idempotent on success.** Running the job twice with the same input produces the same end-state and does not double-emit events or duplicate rows.
- [ ] **Idempotent on partial failure.** If the job dies after step 3 of 5, the next invocation can reach the same end-state without manual cleanup.
- [ ] **No destructive side effect by default.** Default mode is dry-run / report-only; mutation requires an explicit `--execute` flag and a separate gate per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.5–§3.9.
- [ ] **`tenant_id` is read-only in this job.** The job never mutates `tenant_id`, never moves rows between tenants, and never writes to a tenant the operator did not name.

### 2.4 Failure / retry behavior

- [ ] **Timeouts.** Outbound HTTP has a finite timeout (8s default for our n8n helpers; pick something appropriate).
- [ ] **Retries are bounded.** No infinite-retry loop. Failed jobs surface in the host's audit trail (GitHub Actions log, Vercel cron log, n8n execution URL).
- [ ] **Loud failure.** Critical failures emit a Telegram or `automation_events` alert via `lib/server/ops-alerts.js` `sendTelegramOpsAlert` / `forwardOpsAlert`, **not** silent exit.
- [ ] **Quiet success.** Success does not page Anton; the audit trail is enough.

### 2.5 Audit trail

- [ ] **Where the run is recorded.** Pick one (or more) and document it: GitHub Actions log URL, Vercel cron invocation, `automation_events` row, n8n execution URL, CMP `console_json.audit`.
- [ ] **What is recorded.** Outcome (`ok` / `error`), duration, key counts (e.g. tickets reconciled), **never** secret values, **never** request bodies that contain PII or session tokens.
- [ ] **What is NOT logged.** Reset codes, password hashes, full email payloads, `Authorization` headers, `x-corpflow-*-secret` headers, full session cookies. Per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.2 and `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § Logging discipline.

### 2.6 Schedule / trigger discipline

- [ ] **Hobby-cron-safe** if scheduled on Vercel. `npm run verify:vercel-hobby-crons` passes locally and in CI. Schedule is fixed minute / fixed hour (e.g. `0 4 * * *`), not `*/N` patterns.
- [ ] **GitHub Actions schedule expressed in UTC.** Document the equivalent local time in the workflow's comment header.
- [ ] **No overlapping invocations.** Long-running jobs use a lock or check (e.g. CMP ticket-level lock, `automation_events` "in flight" row) to avoid double-runs.

### 2.7 Rollback plan

- [ ] **Disable path documented.** Naming convention: which env var to unset, which workflow file to remove, which n8n workflow to deactivate.
- [ ] **Reversibility named.** "Removing the schedule restores the previous state in N minutes." If the job mutated DB state, the rollback names the inverse query (or the read-only verification proving no mutation happened).
- [ ] **No silent data drift.** If the migrated job introduces a new write surface, the rollback PR must close that write surface, not just remove the schedule.

### 2.8 Documentation discipline

- [ ] **Canonical doc updated.** The relevant doc names the new server home: `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/operations/*`, or a runbook under `docs/runbooks/`.
- [ ] **`.env.template` updated** if a new env var was introduced (placeholders only, never values).
- [ ] **`AGENTS.md` Must-read row added** when the migrated job introduces a new operational surface a future agent must know about.
- [ ] **`docs/decisions/JOURNAL.md`** receives an append-only row with date, change, reversibility, owner.

---

## 3. Pattern: GitHub Actions schedule (recommended for read-only checks)

For migrating a **read-only** scheduled job (factory-control-loop SHA comparison, scheduled smoke tests, factory health beyond the existing ping):

1. Create `.github/workflows/<name>.yml` mirroring an existing pinned workflow (e.g. `factory-health-ping.yml`) — third-party Actions pinned to commit SHAs per `AGENTS.md` § *CI / supply chain*.
2. Use repo secrets, not values in the workflow file. Required name pattern: `CORPFLOW_*` or `VERCEL_*`.
3. Authenticate with `Authorization: Bearer ${{ secrets.CORPFLOW_CRON_SECRET }}` against any factory route that accepts it; do **not** put `MASTER_ADMIN_KEY` into a workflow secret unless you have a written reason.
4. Use `continue-on-error: true` only for steps that genuinely tolerate failure (e.g. `npx prisma migrate deploy` on a non-baselined DB; see `docs/VERCEL_DEPLOYMENT.md`).
5. On failure, post a `lib/server/ops-alerts.js` envelope (best-effort Telegram + automation forward).

## 4. Pattern: Vercel cron (recommended for in-app scheduled work)

For migrating a job that already has a route in `pages/api` or `api/`:

1. Add the schedule to `vercel.json` `crons[]`. Hobby-safe minute/hour.
2. The route accepts `Authorization: Bearer ${CORPFLOW_CRON_SECRET}` — do not gate on `MASTER_ADMIN_KEY`.
3. Run `npm run verify:vercel-hobby-crons` to validate locally and in CI.
4. Verify the cron fires in the Vercel dashboard after deploy; record the first successful invocation timestamp in the migration PR's evidence block.

## 5. Pattern: n8n workflow (recommended for outbound communications and side-effects)

For migrating a job that emits an outbound side-effect (email, webhook, Slack/Telegram outside the existing helper):

1. Read `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`, and (for email) `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` first.
2. n8n workflow validates the shared secret on the **first** node before any side effect (per password-reset recipe §1).
3. Auto-send only for system-transactional or operator-only events; client-facing requires operator approval per Communications v1 §3.
4. Evidence row in `automation_events` + n8n execution URL is the audit trail.

## 6. Pattern: Long-running container (last resort)

Use only when serverless limits hurt (long jobs, queue draining). Cloud Run free tier or a small VPS. The container only executes **versioned, repo-pinned code**; brain decisions stay in the repo (`docs/EXECUTION_BRAIN_VS_HANDS.md` §3).

Container migrations require an explicit `policy:` PR before adoption — they introduce a new operational surface.

---

## 7. Verification floor for any migration packet

Before declaring `COMPLETE`:

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run verify:vercel-hobby-crons` passes (if Vercel cron involved).
- [ ] If the migration changes any production behavior, the **Delivery Reality Audit** block from `.cursor/rules/delivery-reality.mdc` is filled in with deployment ID, commit, live URLs tested, and verdict.
- [ ] If the migration touches secrets, auth, or webhook validation, `docs/operations/SECURITY_REVIEW_CHECKLIST.md` is walked.

---

## 8. Anti-patterns (rejected at gate)

- "We need `MASTER_ADMIN_KEY` in CI to make this work" — almost always a sign the route should accept `CORPFLOW_CRON_SECRET` instead.
- "We'll log the request body for debugging" — never. Per Communications v1 § Logging discipline.
- "It's idempotent because it checks first then writes" — that's a TOCTOU, not idempotency. Idempotent means the **second run** produces the same end state, not that the **first run** is careful.
- "We can fix it manually if it goes wrong" — that puts Anton back in the runtime loop. Define the rollback before merging.
- "We'll skip the schedule guard for this one" — `verify:vercel-hobby-crons` is non-negotiable on Hobby.

---

## 9. Cross-references

- `artifacts/audits/2026-05-23-weekend/05-laptop-local-dependencies.md` — what currently lives on Anton's laptop and which items are migration candidates.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` § *Cheap "hands" patterns* — the four off-laptop patterns and when to choose each.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required for security-relevant migrations.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § *Logging discipline* — what never goes in a log.
- `lib/server/ops-alerts.js` — the standard Telegram + automation-forward helper.
- `.github/workflows/factory-cmp-drive.yml` and `.github/workflows/factory-health-ping.yml` — reference implementations for the GitHub Actions pattern.

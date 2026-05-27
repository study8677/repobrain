# Factory control loop (off-laptop)

Source of truth for the daily drift check that used to depend on Anton's laptop running `npm run control:loop`. Implementation: **`.github/workflows/factory-control-loop.yml`** (canonical).

> **Where this fits.** **Monitor #1** (`factory-control-loop.yml`) in the **monitoring & 24/7 execution architecture** component map — see **`docs/operations/MONITORING_ARCHITECTURE.md`** § 2 for the full surface table of all 12 monitors, § 6.1 for why a green `/api/factory/health` alone is not a DB-connectivity proof (this loop's #2 dependency carries the same blind spot), and § 11.3 for the role of the `corpflow-exec-01` execution node (#12). The loop's policy check on `vercel.json` cron entries is recorded as **Monitor #11** (cron self-validation) in the same map.

## Purpose

Detect drift between four control points without operator action:

1. `origin/main` — what the repo says is shipped.
2. Vercel Production — the deployment actually serving `corpflowai.com`.
3. `/api/factory/health` — runtime self-report (Postgres, sessions, automation, password-reset config).
4. `vercel.json` crons — Hobby-safe schedule rule (≤ once/day per job).

## Schedule

- **Daily** at `0 6 * * *` UTC (10:00 UTC+4).
- **Manual:** GitHub → Actions → *Factory control loop* → **Run workflow** (`workflow_dispatch`).
- Concurrency group `factory-control-loop` — only one run at a time.
- Read-only by design — workflow does **not** trigger Vercel deploys.

## What "healthy" means

| Step | Pass criteria |
|---|---|
| Factory health | `HTTP 200`, `ok: true`, every `checks.*` true |
| Vercel SHA compare | `latest production deployment.githubCommitSha === origin/main` |
| `vercel.json` crons | every job's minute + hour are fixed values (not `*`/lists/ranges) |

If any step fails, the workflow exits non-zero and (when configured) posts a Telegram alert.

> **Important — `/api/factory/health` is not a database connectivity check.** The endpoint reports `database_configured: true` whenever `POSTGRES_URL` is non-empty; it does **not** open a connection. A `healthy` response from this loop does **not** prove Postgres is reachable. If you suspect DB drift (apex content served on tenant domains, tenant resolution falling back, `db.prisma.io:5432` errors), use the **production-pulse runtime** endpoint and the live tenant marketing surface instead — see `docs/operations/POSTGRES_PROVIDER.md` §4b *Known drift symptoms*. **Neon is the sole approved Postgres provider; any `db.prisma.io` reference is configuration drift.**

## Required GitHub repo secrets

All optional — workflow degrades gracefully with each missing one.

| Secret | What enables | Used by |
|---|---|---|
| `CORPFLOW_FACTORY_HEALTH_URL` | factory health probe | Same as `factory-health-ping.yml` (already in use) |
| `VERCEL_TOKEN` | Vercel SHA comparison | Read-only API token |
| `VERCEL_PROJECT_ID` | Vercel SHA comparison | `prj_…` from `.vercel/project.json` |
| `VERCEL_TEAM_ID` | (optional) team-scoped projects | only if project lives under a team |
| `TELEGRAM_BOT_TOKEN` | failure alert | Same as `lib/server/ops-alerts.js` |
| `TELEGRAM_ALERT_CHAT_ID` | failure alert | Same as `lib/server/ops-alerts.js` |

The workflow's first step prints presence-only status (`configured` / `SKIPPED`) — secret values never appear in logs.

## Telegram alert behavior

- Posts **only on failure** (workflow `failure()` condition).
- Skips silently if either Telegram secret is unset.
- Body shape: header line (repo + run #) → recommended action → run URL → factory/vercel/cron one-liners → top 5 fix-level actions. Capped at 3500 chars (matches `lib/server/ops-alerts.js`).
- POST contract identical to `sendTelegramOpsAlert`: `https://api.telegram.org/bot<TOKEN>/sendMessage` JSON body `{chat_id, text}`.
- Helper script: **`scripts/post-control-loop-telegram-alert.mjs`** (text builder + POST helper exported for unit tests).

## When alerted: what Anton does

1. Open the GitHub Actions run from the alert's `Evidence:` URL.
2. Read the human-readable log section *Actions & control* — fix the first `[!]` line.
3. Common cases:
   - **`origin/main` ahead of Vercel** — push happened but deploy didn't. Trigger a redeploy from Vercel dashboard, or `npm run control:loop -- --execute-hook` locally if `VERCEL_DEPLOY_HOOK_URL` is set.
   - **Factory health failed_checks** — open Vercel env, fix the named missing/invalid var (mirrors `/api/factory/health` `hint` field).
   - **`vercel.json` cron not Hobby-safe** — see `docs/VERCEL_DEPLOYMENT.md`; one fixed minute + one fixed hour per job.
4. Re-run the workflow manually after the fix and confirm green.

## Manual run

Local (always works, even without secrets):
```
npm run control:loop                       # default: factory health + vercel + cron
npm run control:loop -- --fetch            # fetch origin first
npm run control:loop -- --json             # machine-readable output
```

CI: GitHub → Actions → *Factory control loop* → Run workflow.

## Rollback / disable

- **Disable**: GitHub → Actions → *Factory control loop* → `…` → Disable workflow.
- **Pause schedule only**: comment out the `schedule:` block in the workflow file (keep `workflow_dispatch:`).
- **Remove**: delete `.github/workflows/factory-control-loop.yml` and `scripts/post-control-loop-telegram-alert.mjs` + tests.

## See also

- **`docs/operations/MONITORING_ARCHITECTURE.md`** — single component map for monitoring + 24/7 execution (parent of this doc).
- `scripts/factory-control-loop.mjs` — core check; CI-safe, exits 0/1 on health verdict.
- `scripts/post-control-loop-telegram-alert.mjs` — alert helper.
- `node-tests/post-control-loop-telegram-alert.test.mjs` — unit tests.
- `lib/server/ops-alerts.js` — server-side `sendTelegramOpsAlert` (same contract).
- `.github/workflows/factory-health-ping.yml` — lighter weekly ping that this workflow supersedes for daily drift detection.
- `docs/EXECUTION_BRAIN_VS_HANDS.md` — boundary between brain (Cursor/Anton) and hands (24/7 server execution).
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — pattern this packet follows.

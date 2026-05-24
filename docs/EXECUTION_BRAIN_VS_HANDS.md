# Brain on laptop, execution 24/7 (inexpensive)

## Mental model

| Layer | Where it lives | Role |
|--------|----------------|------|
| **Brain** | Your laptop (Cursor, chat, design calls, secrets in head) | Judgment, architecture, client conversations, pairing with the agent. |
| **Hands** | Cloud you already pay for | Run when the laptop is closed: HTTP APIs, cron, GitHub Actions, n8n, Postgres, Vercel. |

The agent in Cursor **cannot** stay “awake” on your machine after you close the lid. “24/7 execution” means **automation + hooks** that run without you, while **you + Cursor** remain the place where strategy and code changes happen.

## What you already have (use to the max)

- **Vercel** — APIs, static sites, `vercel.json` crons (e.g. billing sentinel, overseer).
- **Postgres** — system of record, automation event log, CMP. **Neon is the sole approved provider; Prisma Accelerate / `db.prisma.io` is deprecated.** When DB env drift is suspected, the brain → hands path is `docs/operations/POSTGRES_PROVIDER.md` (canonical) plus the diagnostic workflow `.github/workflows/diagnose-postgres-env.yml` (read-only, names + booleans only).
- **GitHub** — Actions (build, test, CMP workflows), webhooks, `repository_dispatch`.
- **n8n** — forward from `CORPFLOW_AUTOMATION_FORWARD_URL`, password reset webhook, lead intake.
- **Google Workspace / GCP** — mail relay, optional Cloud Scheduler, Secret Manager, Cloud Run later.

No new line items required for the first phase.

## Cheap “hands” patterns (pick in order)

### 1) Event-driven (best ROI)

- **Vercel** receives webhooks (Stripe later, GitHub, forms).
- **n8n** branches on `event_type` from CorpFlow automation envelopes (`docs/n8n/automation-forward-recipe.md`).
- **Postgres** stores state; CMP + `automation_events` give an audit trail.

*Cost:* ~$0 incremental if n8n is self-hosted or already running.

### 2) Time-driven

- **GitHub Actions** `schedule:` hitting a **secret-protected** URL (e.g. cron route with `CORPFLOW_CRON_SECRET` pattern you already use).
- Or **GCP Cloud Scheduler** → same URL (fits “we have GCP”).

*Cost:* GitHub free minutes usually enough for light pings; GCP scheduler is cents.

**Factory ↔ automation (no `MASTER_ADMIN_KEY` in CI):** Workflow `factory-cmp-drive.yml` calls `GET /api/factory/cmp/ticket-summaries` and `POST /api/factory/cmp/push` with `Authorization: Bearer` equal to **`CORPFLOW_CRON_SECRET`** (same as Vercel crons). Repo secrets: `CORPFLOW_CORE_BASE_URL`, `CORPFLOW_CRON_SECRET`, `CMP_FACTORY_DRIVE_TICKET_IDS`. Cursor/repo work stays the “brain”; this loop keeps **priority tickets** moving in production on a schedule.

#### Factory health URL (`CORPFLOW_FACTORY_HEALTH_URL`)

The workflow `.github/workflows/factory-health-ping.yml` uses GitHub secret **`CORPFLOW_FACTORY_HEALTH_URL`** (e.g. `https://corpflowai.com/api/factory/health`).

**When to change it:** Any time you **split DNS, SSL, or traffic** so that apex and `core.*` (or other hosts) no longer hit the same deployment, or when you move the factory API to another domain or edge. Otherwise the ping may stay green while the host clients actually use is broken.

**Optional:** Add a second scheduled job or secret (e.g. `core`) if you need to monitor two hostnames after a split.

### 3) Long jobs (only when serverless limits hurt)

- **Cloud Run** (GCP) or **Fly.io** free tier: tiny container that drains a queue or runs a script.
- Keep **brain** decisions in repo + playbooks; the container only executes approved, versioned code.

*Cost:* Often $0–few $/mo at low volume.

### 4) Always-on n8n

- Run n8n on a **small VPS** (Hetzner, Oracle free tier, home box) **or** GCP VM using credits.
- Vercel always reaches it via HTTPS webhook URL.

## Concrete next moves (agreed framework: agent executes, you evaluate)

1. **Add one scheduled GitHub Action** in this repo: weekly `curl` to `/api/factory/health` and fail the job if `ok: false` (no laptop needed).
2. **Finish one n8n workflow** tied to `CORPFLOW_AUTOMATION_FORWARD_URL` (notify + optional Google Chat / email via Workspace). For any **email** branch, follow the disciplined path in **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`** — typed event, sender alias, approval rule (auto-send only for system-transactional or operator-only events).
3. **Optional:** `GET /api/automation/events` small operator page (factory-only) — ticket in `CORPFLOW_SHARED_TODO.md`.

## Security note

“24/7 execution” should **not** mean “agent has prod keys on a server.” Prefer:

- Short-lived tokens, **cron secrets**, **forward secrets**, factory master only on break-glass.
- High-risk automation types still require approval secret on **ingest** (`docs/automation-framework.md`).

---

## Cursor: fewer “allow this command?” prompts

Cursor’s permission model is **editor-level**, not in this repo.

**What to try (UI):**

1. Open **Cursor Settings** (e.g. `Ctrl + ,` then search **Agent**).
2. Enable **Auto-run** (or equivalent) for terminal / tool use so routine commands run without per-step approval.
3. If available, expand the **allowlist** for trusted commands (`npm test`, `git status`, `pytest`, etc.).

**Optional file (user profile):** Some builds support a permissions allowlist under your Cursor user config; see official **Cursor → Documentation → Permissions** for the current filename and schema (it has changed across versions).

**Reality check:** Some operations (network, `git push`, destructive file ops) may **always** prompt by design. The agreed “don’t wait for me” workflow in-repo is: **agents commit to branches + open PRs**, and **CI** runs tests without your laptop.

---

*This doc pairs with `docs/CORPFLOW_SHARED_TODO.md`.*

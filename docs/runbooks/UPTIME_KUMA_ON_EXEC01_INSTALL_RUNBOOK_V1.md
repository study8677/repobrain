# Uptime Kuma install runbook on `corpflow-exec-01-u69678` (v1)

**Packet id:** `UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`
**Status:** v1 — 2026-06-16 — operator-paste runbook authored at L1 by Cursor; **NOT executed yet**.
**Owner:** Authorship = Cursor (L1, docs-only); Execution = Anton (L3 keyboard, SSH from his own terminal); Review = Anton.
**Authorized by:** PR #367 (merged 2026-06-15) — `JE-2026-06-15-1` + `docs/decisions/20260615-uptime-kuma-on-exec01.md` (ADR ACCEPTED) + `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` + `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 carve-out (in effect on `main`).
**Companion docs (canonical):**

- `docs/decisions/20260615-uptime-kuma-on-exec01.md` (ADR — § 2.1 canonical authorization paragraph; § 3 credentials; § 4 threat model; § 5 rollback; § 6 alert path).
- `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (packet — § 1.1 canonical authorization paragraph; § 6 inline `MIGRATION_TO_SERVER_CHECKLIST.md`; § 9 K1–K5 verification template — this runbook implements § 5–§ 11 of that template).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 (named, narrow, packet-gated carve-out for Uptime Kuma alone), § 5.4 (the L1+L3 collaboration pattern this runbook follows), § 7 (`HOST_MISMATCH` semantics).
- `docs/operations/MONITORING_ARCHITECTURE.md` § 2 Monitor # 13 (the surface this runbook makes live), § 5 (always-on minimum live URLs the monitors target).
- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 3 (Phase 1 doctrine — Kuma named as a Phase 1 supporting service).
- `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 5–§ 7 (Phase 1A artifact — operator pastes filled-in evidence into § 7 once K1–K5 complete).

---

## 1. Purpose and scope

This runbook is the **operator-paste install recipe** that Anton runs at the L3 keyboard on `corpflow-exec-01-u69678` to bring **Monitor # 13** (Uptime Kuma probe set) live. It is the natural follow-up packet to PR #367 (the docs-only authorization).

### 1.1 Canonical authorization paragraph (cite verbatim — same wording at four loci across PR #367)

> **This packet authorizes only the minimum execution boundary change needed for Uptime Kuma to run as a monitoring service on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications, backups/restic, chatbot/live-chat platforms, AI frameworks, or production shell access beyond the documented Kuma installation/operation path.**

This runbook **operates strictly within** that paragraph. Every command block below is bounded by it. If a step appears to widen the carve-out (general Docker work, additional containers, public exposure, etc.), the step is wrong — stop and open a new ADR.

### 1.2 What this runbook IS

- A docs-only operator-paste recipe authored at L1 by Cursor.
- Bounded to the **single** Uptime Kuma container on `corpflow-exec-01-u69678` for **third-location uptime monitoring** of the eight URLs in § 8.
- Loopback-only: container binds to `127.0.0.1:3001`; UI access via SSH local-port-forward only.
- Idempotent: `docker compose up -d` against the file in § 5.3 is a no-op once the container is running with the same spec.
- Reversible: § 10 lists three rollback levels (pause monitoring ≤ 60 s; full uninstall ≤ 5 min; repo revert ≤ 1 hour), all operator-driven.

### 1.3 What this runbook is NOT

- Not a generalization of Docker usage on the box. The carve-out is for the named `uptime-kuma` container alone; § 5.3 hard rules in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` otherwise unchanged.
- Not a generalization of scheduled jobs on the box. The carve-out is for Kuma's internal probe scheduler inside the container alone; `cron` / `systemd timer` / `at` outside the container remain forbidden.
- Not a backup / restic packet. Step 3 of `SELF_HOSTED_OPS_STACK_V1.md` § 4 remains gated on Step 2 = COMPLETE.
- Not a Chatwoot / Open WebUI / Coolify / Langfuse / AgentSpan / OpenJarvis / generic chatbot framework / generic agent framework / additional monitoring tool / second container packet. **None of those are authorized.** Adding any of them requires a new ADR + authorization packet + § 10 gate.
- Not a public-exposure packet. No DNS record, no reverse proxy, no public port.
- Not an n8n migration packet. The n8n host stays where it is today.
- Not a runtime / app code change. Zero edits to `api/`, `lib/`, `components/`, `pages/`, `prisma/`, `middleware*`, `scripts/`, `public/`, `.github/`, `node-tests/`, `tests/`, `core/engine/`, `.env*`, `vercel.json`, `next.config*`, `package*.json`, `tsconfig*`.
- Not a tenant-data surface. The container has zero `POSTGRES_URL`, zero `MASTER_ADMIN_KEY`, zero tenant content. All probes are **GET-only against public URLs**.

### 1.4 Scope checklist (cross-checked against the user's hard boundaries)

| Boundary | This runbook | Verification step |
|---|---|---|
| Uptime Kuma only | ✅ One image: `louislam/uptime-kuma:1.23.13` (§ 4) | § 5.7 verifies no other new container started. |
| `corpflow-exec-01-u69678` only | ✅ § 5.1 host check | Pre-flight `hostname` matches expected string. |
| Third-location monitoring only | ✅ § 8 monitor list is bounded to the eight URLs | No state-mutating route. No `POST`. |
| Single container only | ✅ § 5.3 Compose file has exactly one service | § 5.7 / K3 verify. |
| `127.0.0.1:3001` only | ✅ § 5.3 port mapping | § 5.6 / K2 verify with `ss -tlnp` + external curl. |
| No public port | ✅ Same as above | K2 |
| No DNS | ✅ No hostname created or pointed at the box | n/a — operator does not run a DNS step. |
| No reverse proxy | ✅ No nginx / Caddy / Traefik / cloudflared changes | n/a — runbook does not touch any reverse proxy. |
| UI access by SSH tunnel only | ✅ § 6 + K1 | K1 verifies tunnel works; K2 verifies direct external access does NOT work. |
| No client data | ✅ Probes are GET-only against public URLs | Probe URL list is fixed in § 8. |
| No production DB access | ✅ Container has no DB connection string | § 5.3 Compose file has no DB env vars. |
| No app/runtime code changes | ✅ Runbook is docs-only | `git diff main` for THIS packet shows only `docs/`, `AGENTS.md`, `artifacts/`, `JOURNAL.md`. |
| No `.env` changes | ✅ `.env.template` untouched | `git diff main -- .env.template` shows no change. |
| No restic | ✅ Step 3 gated on Step 2 = COMPLETE | n/a — restic is a separate future packet. |
| No Chatwoot / Open WebUI / Coolify / Langfuse / AgentSpan / OpenJarvis / generic chatbot framework | ✅ Forbidden tool list pinned in § 1.3 | n/a — runbook does not install any of these. |
| No second app / no second database | ✅ One Next.js app + one Postgres via `POSTGRES_URL` (Neon) preserved | n/a — runbook does not touch app or DB. |

If any row above shows ❌ at execution time, **stop** — the runbook has drifted from authorization. Open a new ADR.

---

## 2. Preconditions from PR #367 (verify before pasting any command)

These are the on-merge guarantees of PR #367. Each must be true before § 5 is pasted. This is the operator's pre-flight checklist (no shell yet).

### 2.1 Repo-side preconditions

- [ ] PR #367 is **merged** to `main` (verify: `git log --oneline main | grep -i "Authorize Uptime Kuma"` — expect commit `83fc4d6b docs: authorize Uptime Kuma on exec01 for third-location monitoring only (#367)`).
- [ ] `docs/decisions/20260615-uptime-kuma-on-exec01.md` ADR is on `main` with status ACCEPTED.
- [ ] `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 carve-out is on `main`.
- [ ] `docs/operations/MONITORING_ARCHITECTURE.md` § 2 Monitor # 13 row is on `main`.
- [ ] `JE-2026-06-15-1` is on `main` in `docs/decisions/JOURNAL.md`.
- [ ] No superseding `JE-YYYY-MM-DD-N` row has reversed `JE-2026-06-15-1` since merge.

### 2.2 Operator-side preconditions (no values pasted into chat or repo)

- [ ] **Kuma admin password** — operator has generated a strong password (≥ 20 random chars) in his password manager. Will be entered ONCE during § 7 first-login. Never typed into a runbook block, never pasted into chat, never echoed to terminal history.
- [ ] **Separate Telegram bot for Kuma** — operator has created a NEW bot via [@BotFather](https://t.me/BotFather) on Telegram, **distinct from** the in-repo `TELEGRAM_BOT_TOKEN`. Bot token + chat id are in operator's password manager. The bot is added to a **different** Telegram chat from the in-repo `TELEGRAM_ALERT_CHAT_ID` (or the same chat — operator's call — but the bot is different so the failure domain is independent).
- [ ] **Optional: SMTP backup** — if operator wants email-on-down as a backup primary, has SMTP server + port + username + app-password from an operator-side mailbox (NOT `support@corpflowai.com` Gmail OAuth — that token belongs to n8n, not Kuma).
- [ ] **N8N origin URL** — operator has the n8n instance's own health endpoint URL ready (e.g. `https://<n8n-host>/healthz` or a stable GET-200 endpoint). Never the production webhook ingest URL (`<n8n-host>/webhook/automation-forward` — pointing Kuma there would create real `automation_events` rows on every probe).
- [ ] **`corpflow-exec-01-u69678` capacity headroom** — verified by § 5.1 pre-flight. Expected: post-resize 4 vCPU / 7,751 MiB RAM / 150 GB disk / 2 GB swap (per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1). Kuma needs ≈ 100–200 MiB RAM steady-state.
- [ ] **ERPNext sandbox + production-shell containers untouched** — pre-flight § 5.1 confirms `corpflowai-sandbox-*` and `corpflowai-production-*` containers are `Up`. The runbook MUST NOT recreate, restart, or reconfigure any of those.

### 2.3 Network-side preconditions

- [ ] Operator's machine can reach `5.78.213.185` over SSH (port 22). Verified by `ssh anton@5.78.213.185 "echo ok"` returning `ok`.
- [ ] Operator's machine can reach `https://core.corpflowai.com/api/factory/health` (returns 200 + JSON). Verified by `curl -fsSL https://core.corpflowai.com/api/factory/health | head -c 200`.
- [ ] Operator's machine has **no** local listener on `localhost:3001` (so the SSH tunnel can bind it). Verified by `ss -tln | grep ':3001 '` on Linux/macOS, or `netstat -ano | findstr :3001` on Windows. If something is listening, pick a different forwarded port (e.g. `-L 3002:localhost:3001`) and adjust § 6 + K1 accordingly.

---

## 3. Operator-only execution warning

**This entire runbook is executed by Anton at the L3 keyboard.** Cursor authors every byte of this document at L1, but **Cursor does not type any byte into the SSH session** that runs the commands. This is the canonical L1+L3 collaboration pattern from `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4:

```
Step 1.  Cursor (L1) drafts the exact command block in this docs-only
         runbook. Block is parameterised (no per-host paths, no inline
         secrets — Kuma admin password and Telegram bot token are
         entered ONCE during first-login by the operator, never
         typed into a runbook block).

Step 2.  Anton opens his SSH session from his own terminal:
         `ssh -L 3001:localhost:3001 anton@5.78.213.185`
         (Cursor does not see the SSH terminal; Anton runs it from
         Git Bash / WSL / OpenSSH / whichever shell on his laptop
         already has working SSH.)

Step 3.  Anton pastes blocks from this runbook into the SSH terminal
         and runs them. Anton may run them as separate operator-side
         pre-flight steps (e.g. `df -h`, `free -h`, `docker ps`)
         before pasting the install block.

Step 4.  Anton shares the output back into chat. Cursor (L1) reads
         the output, captures the relevant numbers / file paths
         / image SHAs / port states / monitor counts into a JOURNAL
         row + the Phase 1A artifact § 7 evidence block. Cursor
         never reads or prints password values; it only records
         file paths (e.g. `~/uptime-kuma-data/kuma.db`) and
         lengths / counts (e.g. "data dir grew 0 -> 32 KiB after
         first-login").

Step 5.  Cursor (L1) opens a docs-only PR with the JOURNAL row +
         chat_history entry + Phase 1A artifact § 7 evidence
         + any runbook updates discovered during execution. Anton
         merges. Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` flips to
         COMPLETE.
```

**Hard rule:** if at any step a Cursor session offers to "SSH for you" or "run the install for you", refuse — Cursor's tools have **no SSH access to the box**, and the offer is a hallucination. The `HOST_MISMATCH` guard from `JE-2026-06-04-1` applies (see `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7).

**Hard rule:** never paste the Kuma admin password, the Telegram bot token, the chat id, or SMTP credentials into chat with Cursor or into the runbook PR. Cursor does not need them; the operator enters them directly into the Kuma UI over the SSH tunnel during § 7.

---

## 4. Exact install model

This is the only authorized shape. Every choice has a constraint behind it; do not improvise.

### 4.1 Image (pinned)

- **`louislam/uptime-kuma:1.23.13`** — pinned 1.23.x patch.
- Why pinned: `latest` and floating tags drift with upstream releases; pinning is the only way to satisfy the `MIGRATION_TO_SERVER_CHECKLIST.md` § 2.4 *"bounded retries"* and to make rollback deterministic.
- Why 1.23.x specifically: 1.23 is the current stable Kuma minor; 2.x (when released) introduces breaking schema changes that would need a separate ADR.
- Operator may bump within 1.23.x patch (e.g. `1.23.14` once it lands) by editing § 5.3 and re-running § 5.5 — no ADR required for patch bumps. **Moving to a different minor (e.g. 1.24.x or 2.x) requires a new ADR.**

### 4.2 Single container

- One service named `uptime-kuma`. No sidecars, no `nginx-proxy`, no `watchtower`, no `prometheus`, no `grafana`. Adding any of those is **out of scope** of PR #367 and requires a new ADR.

### 4.3 Persistent data

- **`~/uptime-kuma-data/`** on the host (operator's home dir), bind-mounted into the container at `/app/data`.
- Why bind-mount (not Docker named volume): operator-side backup, inspection, and `chmod 600` are simpler with a host path. Aligns with the bind-mount pattern from `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` and `JE-2026-06-05-7`.
- Inside this directory: Kuma's SQLite DB (`kuma.db`), upload directory, and any cert/identity material. **All Kuma state lives here.** Backing up the directory is the entire backup story for Kuma.
- Permissions: `chmod 700 ~/uptime-kuma-data/` after creation (only `anton` can read/write); `kuma.db` itself becomes `chmod 600` after first start.

### 4.4 Port binding (loopback-only)

- Host-side bind: `127.0.0.1:3001` only.
- Container-side: `:3001` (Kuma's default).
- Compose port mapping: `"127.0.0.1:3001:3001"` (the explicit `127.0.0.1:` prefix is what makes Docker bind to loopback instead of `0.0.0.0`).
- **K2 (§ 11) verifies** that `0.0.0.0:3001` is NOT listening, by curl from outside the box.

### 4.5 Restart policy

- `restart: unless-stopped`. Kuma comes back up on box reboot or Docker daemon restart, but stays down if operator deliberately runs `docker compose stop`.

### 4.6 Network

- Default Compose-created bridge network. No `host` network mode (which would bypass the loopback bind). No custom external network.

### 4.7 Resource limits (recommended, not strictly required for v1)

- `mem_limit: 256m` (Kuma steady-state ≈ 100–200 MiB; cap prevents runaway).
- `cpus: 0.5` (Kuma is mostly idle; cap leaves headroom for ERPNext).

### 4.8 What is explicitly NOT in the install model

- ❌ No public port (no `:3001` without the `127.0.0.1:` prefix).
- ❌ No reverse proxy, no nginx config change, no Caddy / Traefik / cloudflared.
- ❌ No DNS record (Kuma has no public hostname).
- ❌ No status page exposed publicly. Status pages may be created in Kuma's UI but **only as private** (login-required) for v1.
- ❌ No second container, no Compose `depends_on`, no networked sidecar.
- ❌ No environment-variable secret loading from a host `.env` file (Kuma reads its admin creds from the SQLite DB, set during first-login).
- ❌ No CorpFlow secret bind-mounted into the container (no `~/.erpnext-production-credentials`, no `POSTGRES_URL`, no `MASTER_ADMIN_KEY`).
- ❌ No host UID / GID override that would let the container write outside `~/uptime-kuma-data/`.

---

## 5. Operator-paste command blocks

All blocks are pasted by the operator into the **SSH session on `corpflow-exec-01-u69678`** (the operator opens this session himself; see § 6 for the tunnel command, § 3 for the L1+L3 collaboration warning). Each block is idempotent unless explicitly noted.

> **Convention:** lines starting with `#` are comments — pasting them is harmless. Lines starting with `$` are placeholders — operator must NOT paste the literal `$`. Output sections marked `Expected:` describe what success looks like; if the operator sees something different, **stop** and share output with Anton (not into chat with Cursor) for triage.

### 5.1 Pre-flight (on the box, no install yet)

```bash
# 5.1.a — Confirm we are on corpflow-exec-01-u69678 and not somewhere else.
hostname
# Expected: corpflow-exec-01-u69678

# 5.1.b — Confirm capacity (post-resize 4 vCPU / 7,751 MiB / 150 GB / 2 GB swap).
nproc
free -h
df -h /
# Expected: nproc = 4; free shows ~7.5 GiB total; df / shows ~150 GiB total with at least 30 GiB free.

# 5.1.c — Confirm Docker is running.
docker version --format 'Server: {{.Server.Version}} | Client: {{.Client.Version}}'
# Expected: a version string (Kuma needs Docker >= 20.10, Compose v2 plugin available).
docker compose version
# Expected: "Docker Compose version v2.x.y" (NOT the old `docker-compose` v1).

# 5.1.d — Confirm ERPNext sandbox + production-shell containers are still Up.
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' | grep -E 'corpflowai-(sandbox|production)' || echo "WARN: no ERPNext containers visible — verify with Anton before continuing."
# Expected: at least one corpflowai-sandbox-* and one corpflowai-production-* row, both showing "Up".

# 5.1.e — Confirm there is currently NO container or compose project named uptime-kuma
#         (true on a fresh install; if a previous install exists, abort and check § 10 rollback first).
docker ps -a --filter 'name=uptime-kuma' --format '{{.Names}} | {{.Status}}'
# Expected on fresh install: empty output.
docker compose ls --format json | grep -i 'uptime-kuma' || echo "no prior compose project — ok"
# Expected on fresh install: "no prior compose project — ok".

# 5.1.f — Confirm port 3001 is NOT already in use on the host.
ss -tlnp 2>/dev/null | grep ':3001 ' || echo "port 3001 free — ok"
# Expected: "port 3001 free — ok".
```

If ANY pre-flight check shows unexpected output, **stop**. Do not paste § 5.2 onward. Share the output with Anton; let Anton decide whether to abort or amend.

### 5.2 Create persistent data directory

```bash
# 5.2.a — Create the directory with strict permissions (only operator can read/write).
mkdir -p "$HOME/uptime-kuma-data"
chmod 700 "$HOME/uptime-kuma-data"

# 5.2.b — Verify.
ls -ld "$HOME/uptime-kuma-data"
# Expected: drwx------ (mode 700), owner = anton, group = anton, otherwise empty directory.
```

### 5.3 Create the Compose project directory and pinned compose file

```bash
# 5.3.a — Create the project dir.
mkdir -p "$HOME/uptime-kuma"

# 5.3.b — Write the compose file. This is the ONLY supported shape; do not extend
#         it with extra services, networks, public port mappings, or env files.
#         The pinned image + loopback-only port + bind-mount + restart policy
#         are all required by § 4.
cat > "$HOME/uptime-kuma/compose.yaml" <<'YAML'
# Authorised by PR #367 (Uptime Kuma on corpflow-exec-01-u69678 — third-location
# monitoring only). Carve-out: docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md § 5.5.
# Do not extend this file beyond the single uptime-kuma service without a new ADR.

services:
  uptime-kuma:
    image: louislam/uptime-kuma:1.23.13
    container_name: uptime-kuma
    restart: unless-stopped
    ports:
      # Loopback-only. The 127.0.0.1: prefix is REQUIRED.
      # Removing it would expose Kuma to the public internet — out of scope.
      - "127.0.0.1:3001:3001"
    volumes:
      # Host bind-mount (not a Docker named volume) so the operator can back it
      # up, inspect it, and chmod it directly. ~/uptime-kuma-data/ is the entire
      # Kuma state surface (kuma.db, uploads, cert material).
      - "${HOME}/uptime-kuma-data:/app/data"
    mem_limit: 256m
    cpus: 0.5
    healthcheck:
      # Kuma's built-in /health endpoint, hit from inside the container.
      test: ["CMD", "node", "extra/healthcheck.js"]
      interval: 60s
      timeout: 30s
      retries: 5
      start_period: 60s
YAML

# 5.3.c — Verify.
cat "$HOME/uptime-kuma/compose.yaml" | head -40
# Expected: the YAML above, byte-identical.
```

### 5.4 Pull the pinned image

```bash
# 5.4.a — Pull explicitly (so the network step is separated from the up step).
docker pull louislam/uptime-kuma:1.23.13
# Expected: "Status: Downloaded newer image for louislam/uptime-kuma:1.23.13"
#           (or "Image is up to date" on a re-pull).

# 5.4.b — Capture the image digest (for the JOURNAL row).
docker image inspect --format '{{index .RepoDigests 0}}' louislam/uptime-kuma:1.23.13
# Expected: "louislam/uptime-kuma@sha256:<64-hex>". Operator pastes this digest
#           into the JOURNAL row + Phase 1A artifact § 7 evidence block.
```

### 5.5 Start the container

```bash
# 5.5.a — Bring it up (project name pinned so § 10 rollback is deterministic).
cd "$HOME/uptime-kuma"
docker compose -p uptime-kuma up -d
# Expected:
#   [+] Running 1/1
#   ✔ Container uptime-kuma  Started

# 5.5.b — Wait ~60 seconds for the healthcheck start_period to elapse, then verify.
sleep 60
docker ps --filter 'name=uptime-kuma' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
# Expected:
#   NAMES         STATUS                       PORTS
#   uptime-kuma   Up X minutes (healthy)       127.0.0.1:3001->3001/tcp
# CRITICAL: the PORTS column MUST start with "127.0.0.1:3001->3001/tcp".
#           If it shows "0.0.0.0:3001->3001/tcp" or ":::3001->3001/tcp",
#           the loopback bind is broken — STOP, run § 10.1 to stop the
#           container, fix § 5.3 compose port line, and re-run from § 5.5.
```

### 5.6 Verify port binding (LOOPBACK ONLY) — the K2 host-side half

```bash
# 5.6.a — On the box, confirm only 127.0.0.1 is listening on 3001.
ss -tlnp 2>/dev/null | grep ':3001 '
# Expected: a line like "LISTEN ... 127.0.0.1:3001 ... users:((\"docker-proxy\",..."
#           NOT "0.0.0.0:3001" and NOT ":::3001" (IPv6 wildcard).

# 5.6.b — On the box, GET the Kuma root over loopback (proves the container is serving HTTP).
curl -fsS --max-time 5 http://127.0.0.1:3001/ | head -c 200
# Expected: HTML beginning with "<!DOCTYPE html>" and including "Uptime Kuma" or
#           the Kuma SPA shell. The actual page content is the Kuma setup wizard
#           on first run.

# 5.6.c — From the operator's LAPTOP (NOT from the box), confirm 5.78.213.185:3001 is unreachable.
#         (This block is to be pasted in the operator's LOCAL terminal, not the SSH session.)
#         Run from a non-tunnelled terminal:
#
#             curl -fsS --max-time 5 http://5.78.213.185:3001/ ; echo "exit=$?"
#
#         Expected: a non-zero exit code (curl: (7) Connection refused, or (28)
#                   Operation timed out). The literal text "exit=7" or "exit=28"
#                   is the success signal here.
#         If the operator's laptop returns HTML, the loopback bind is broken —
#         STOP and run § 10.1.
```

### 5.7 Verify ERPNext sandbox + production-shell are still Up (untouched)

```bash
# 5.7.a — Confirm we did not collateral-damage the existing ERPNext containers.
docker ps --filter 'name=corpflowai-sandbox' --format 'table {{.Names}}\t{{.Status}}'
# Expected: same containers as in § 5.1.d, all still "Up".

docker ps --filter 'name=corpflowai-production' --format 'table {{.Names}}\t{{.Status}}'
# Expected: same containers as in § 5.1.d, all still "Up".

# 5.7.b — Confirm uptime-kuma is the only NEW container.
docker ps --format '{{.Names}}' | sort
# Expected: previous list + "uptime-kuma" exactly once. If you see
#           "watchtower", "kuma-nginx", "kuma-prom", "grafana", or any
#           other unauthorised name — STOP, run § 10.1, escalate.

# 5.7.c — Capacity check after start (Kuma steady-state ≤ 200 MiB RAM).
free -h
docker stats --no-stream uptime-kuma --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}'
# Expected: free still shows ample headroom; uptime-kuma uses < 256 MiB
#           (matches the mem_limit in § 5.3).
```

---

## 6. SSH tunnel command (operator runs from his own laptop)

The Kuma UI is **only** reachable via SSH local-port-forward. There is no public route. There is no `lux.corpflowai.com/kuma` route. There is no DNS record.

### 6.1 The tunnel command

Run this in the operator's LOCAL terminal (Git Bash / WSL / OpenSSH on his laptop), **not** in the SSH session opened in § 5:

```bash
ssh -L 3001:localhost:3001 anton@5.78.213.185
```

This creates a tunnel: the operator's `localhost:3001` is forwarded to the box's `localhost:3001`, which is what Kuma is bound to.

### 6.2 Open the UI

While the SSH tunnel is up (i.e. the SSH session is still active in the operator's local terminal), open a browser on the operator's laptop to:

```
http://localhost:3001/
```

> **`http://`, not `https://`.** Kuma 1.23.x serves plain HTTP locally. TLS is unnecessary because the only network in play is the SSH-encrypted tunnel; the HTTP traffic never leaves loopback at either end.

### 6.3 Closing the tunnel

When done with the UI session, return to the operator's local terminal and `Ctrl+D` (or `exit`) the SSH session. The tunnel closes immediately. **The Kuma container keeps running on the box** — closing the tunnel only ends the operator's UI session, not Kuma itself. Probes continue 24/7 inside the container.

### 6.4 Local port collision (fallback)

If the operator's laptop already has something listening on `localhost:3001` (rare, but e.g. a local dev server), pick another local port:

```bash
ssh -L 3002:localhost:3001 anton@5.78.213.185
# then browse to http://localhost:3002/
```

The `:3001` on the box side stays unchanged. **K1 and K2 evidence** (§ 11) must record which local port the operator used, so the K2 negative test (no public access) is unambiguous.

---

## 7. First-login setup instructions

These steps are performed in the **browser**, while the SSH tunnel from § 6 is open. The operator types secrets directly into the Kuma UI; **none of these values appear in this runbook, in chat with Cursor, or in the PR**.

### 7.1 Initial admin account

1. Browse to `http://localhost:3001/` (or the alternate port from § 6.4).
2. Kuma shows the first-run setup wizard.
3. Choose: language `English`, timezone `Indian/Mauritius` (UTC+4 — matches the operator's timezone for log readability).
4. Set the admin **username** — recommended: `admin` (Kuma is single-user; the username is local to the SQLite DB).
5. Set the admin **password** — paste the strong password from the operator's password manager (preconditions § 2.2). Minimum length 20 characters; password manager generated; never typed by hand.
6. Click **Create**. Kuma redirects to the empty dashboard.

### 7.2 Confirm "do not expose" defaults

After login, navigate to **Settings → General**:

- [ ] `Disable Authentication`: **OFF** (default — keep OFF).
- [ ] `Allow primary base URL only`: leave blank for now (we are not exposing publicly).
- [ ] `Search Engine Visibility`: **OFF** (Kuma should not be indexable — irrelevant since loopback-only, but defensive).

Navigate to **Settings → Backup**:

- [ ] Backup is **operator-driven only** — do NOT enable any S3 / off-site export from inside Kuma. Backups happen externally via host-side `tar` of `~/uptime-kuma-data/` (covered in a future restic packet — `SELF_HOSTED_OPS_STACK_V1.md` § 4 Step 3).

Navigate to **Status Pages**:

- [ ] Confirm there is no status page yet. Operator may create a private (login-required) status page later, but for v1 there should be **zero** status pages. Public / unauthenticated status pages are out of scope of PR #367.

### 7.3 What NOT to enable in first-login

- ❌ **Two-factor authentication via SMS / external service.** Kuma's TOTP-based 2FA is fine for v1 if operator wants it; SMS-based 2FA requires a Twilio-style sub and is out of scope.
- ❌ **Cloudflare Tunnel plugin / external tunnel integrations.** PR #367 forbids public exposure.
- ❌ **External database connection.** Kuma 1.23.x can use MariaDB instead of SQLite; v1 uses SQLite only (the bind-mounted `kuma.db`). MariaDB would be a second container — out of scope.
- ❌ **API tokens for n8n callback.** n8n is a SECONDARY notifier (§ 9.3); it does not need a Kuma API token in v1.

---

## 8. Monitor setup instructions

The operator creates **eight** monitors. All eight are HTTP(s) GET-only against public CorpFlow URLs, plus the n8n health URL once confirmed. Probes are **read-only** — none of these URLs mutate state.

### 8.1 Common settings (apply to all eight)

For each monitor below, in the Kuma UI: **Add New Monitor → Type: HTTP(s) — keyword optional**.

| Field | Value | Why |
|---|---|---|
| Monitor Type | `HTTP(s)` | All targets are public HTTPS GETs. |
| HTTP Method | `GET` | Read-only; no body. |
| Heartbeat Interval | `60` seconds | Matches `MONITORING_ARCHITECTURE.md` § 3.2 floor and Vercel Hobby cron cadence. |
| Heartbeat Retries | `2` (then mark Down) | Tolerates a single transient blip. |
| Retry Interval | `60` seconds | Re-check fast after a fail. |
| Resend Notification if Down | `every 6 hours` | Avoid pager fatigue while keeping the operator aware. |
| Request Timeout | `15` seconds | Generous for cold-start Vercel routes. |
| Maximum redirects | `10` | Default; allow tenant-host → apex redirects. |
| Accepted Status Codes | `200-299` | Reject 3xx as a sign of regression unless redirect is expected (see Notes column below). |
| Ignore TLS error | `OFF` | Cert breakage IS a real outage. |
| Notification | Kuma Telegram bot (§ 9.1 PRIMARY) | Critical-outage path. |
| Tags | `corpflow-prod` for CorpFlow URLs; `n8n` for the n8n URL | Helps filter on the dashboard. |

### 8.2 The eight monitors (paste the URL into Kuma's "URL" field for each)

| # | Friendly name | URL | Expected behaviour | Notes |
|---|---------------|-----|--------------------|-------|
| 8.2.1 | `core-factory-health` | `https://core.corpflowai.com/api/factory/health` | 200 + JSON `{"ok":true,...}` | Use **Keyword** mode if available: keyword = `"ok":true`. Treats a JSON body without `"ok":true` as Down even when 200. |
| 8.2.2 | `core-production-pulse-runtime` | `https://core.corpflowai.com/api/factory/production-pulse/runtime` | 200 + JSON | Plain HTTP(s) is enough; keyword optional (`"runtime":` is a stable substring). Doc: `docs/operations/PRODUCTION_PULSE_V1.md`. |
| 8.2.3 | `corpflowai-apex-root` | `https://corpflowai.com/` | 200 + HTML | Apex marketing landing. |
| 8.2.4 | `corpflowai-lead-rescue` | `https://corpflowai.com/lead-rescue` | 200 + HTML | AI Lead Rescue intake page. |
| 8.2.5 | `aileadrescue-apex-root` | `https://aileadrescue.corpflowai.com/` | 200 + HTML | AI Lead Rescue dedicated host. |
| 8.2.6 | `lux-apex-root` | `https://lux.corpflowai.com/` | 200 + HTML | Lux tenant marketing landing. |
| 8.2.7 | `lux-change-console` | `https://lux.corpflowai.com/change` | 200 + HTML | Lux Change Console — high-value client surface. |
| 8.2.8 | `n8n-health` | `<N8N_ORIGIN>/` (operator-confirmed at install time) | 200 | URL is whichever stable GET-200 endpoint Anton confirms (e.g. `https://<n8n-host>/healthz`). **Do NOT point this at the production webhook ingest URL** — that would create real `automation_events` rows on every probe. |

### 8.3 Per-monitor configuration steps

Repeat for each row 8.2.1 — 8.2.8:

1. **Add New Monitor** (top-right + button on the dashboard).
2. **Monitor Type** = `HTTP(s) — keyword` if the row has a keyword in the Notes column; otherwise plain `HTTP(s)`.
3. **Friendly Name** = the value from the table column 2.
4. **URL** = the value from the table column 3.
5. **Heartbeat Interval / Retries / Retry Interval / Timeout** = from § 8.1.
6. **Notifications** — toggle ON the Kuma Telegram bot configured in § 9.1.
7. **Tags** — add `corpflow-prod` for 8.2.1 — 8.2.7; add `n8n` for 8.2.8.
8. **Save**.
9. Wait 60–90 seconds; the monitor row should turn **green / Up**.

### 8.4 Sanity after all eight are saved

- The Kuma dashboard should show 8 rows, all green.
- The "Up" pulse for each row should show interval = 60 s.
- A keyword-mismatch on 8.2.1 (e.g. if `health` returns 200 but `"ok":false`) should mark it Down — the operator can verify by temporarily editing the keyword to a string the response does not contain, observing Down within 2 × 60 s, then restoring the correct keyword.
- **No 5xx, no Timeout, no DNS error** should appear in the row history during the first 5 minutes. If any do, capture the screenshot and hand to Anton; do not silence them.

### 8.5 What NOT to add as a monitor in v1

- ❌ Any URL that **mutates state** (no `POST`, no `PUT`, no `DELETE`).
- ❌ Any URL that requires authentication (no `MASTER_ADMIN_KEY` header, no factory-only routes, no tenant-session cookies).
- ❌ Any URL that hits Postgres directly (`POSTGRES_URL` is not on the box).
- ❌ Any URL belonging to a third-party SaaS (Stripe, Vercel, Neon, GitHub, Telegram). Their own status pages cover those.
- ❌ Any internal IP / loopback URL on the box (Kuma probing itself is circular; the SSH-tunnel UI session is what proves Kuma itself is up).
- ❌ Any client tenant outside the eight URLs above. Per-tenant client monitoring is a future packet (`docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 named future packets) and requires its own ADR.

---

## 9. Alert routing setup

The alert path is the second half of "is this monitor real". A green dashboard is worthless if alerts do not land in a chat the operator reads. This section configures three notification channels with strict roles.

### 9.1 Kuma's own Telegram bot — PRIMARY (critical-outage path)

**Why a SEPARATE bot:** the in-repo `TELEGRAM_BOT_TOKEN` belongs to CorpFlow's internal alerting (factory health, technical-lead, etc.). If that bot, that workflow, or that channel breaks, the in-repo path goes silent — and we still need Kuma to alert. Therefore Kuma's notifier must NOT share fate with the in-repo bot.

#### 9.1.1 Configure in Kuma UI

1. Navigate to **Settings → Notifications → Setup Notification**.
2. **Notification Type** = `Telegram`.
3. **Friendly Name** = `kuma-ops-telegram-primary` (so the alert source is unambiguous in the chat).
4. **Bot Token** = paste the NEW bot's token from the operator's password manager (the one created via @BotFather in preconditions § 2.2). **Do NOT paste the in-repo `TELEGRAM_BOT_TOKEN`.**
5. **Chat ID** = the chat id from the operator's password manager. Must be a chat the operator reads (recommended: a private group named `corpflow-ops-alerts` or DM with the bot).
6. **Apply on all existing monitors** = YES (since this is the primary).
7. Click **Test** — expect a test message in the chosen chat within 5 seconds. **If the test fails, do not save** — investigate (wrong token, wrong chat id, bot not added to the chat).
8. **Save**.

#### 9.1.2 Why this is the critical-outage path

- The bot lives entirely on Kuma's side.
- Kuma's outbound HTTPS to `api.telegram.org` is the only dependency; this works even if n8n is down, even if Vercel is down, even if the in-repo Telegram path is down.
- **K4 (§ 11)** verifies this by forcing a fail and observing the alert.
- **K5 (§ 11)** verifies n8n-independence by stopping the n8n workflow and observing the alert still arrives.

### 9.2 SMTP backup — SECONDARY (optional, never sole)

**Purpose:** if Telegram itself has an outage, a second channel still wakes the operator.

**Skip this section if** the operator does not have an SMTP server + app-password in his password manager. SMTP backup is OPTIONAL for v1; Kuma + Telegram alone satisfies K1–K5.

**If configured:**

1. **Settings → Notifications → Setup Notification**.
2. **Notification Type** = `Email (SMTP)`.
3. **Friendly Name** = `kuma-ops-smtp-secondary`.
4. **Host / Port / Username / Password** = from operator's password manager. Use an **operator-side mailbox** (e.g. operator's personal Gmail with app-password, or operator's Fastmail / Proton SMTP). **Do NOT** use `support@corpflowai.com` Gmail OAuth — that token belongs to n8n's outbound email workflow per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
5. **From Email** = the same operator-side mailbox.
6. **To Email** = the operator's personal inbox (the place he actually checks).
7. **Apply on all existing monitors** = YES.
8. **Test** → confirm an email lands in the operator's inbox within 60 seconds.
9. **Save**.

### 9.3 n8n forwarding — SECONDARY ONLY, never critical-outage path

**Purpose:** if the operator wants a DIGEST or summary fan-out (e.g. monthly status roll-up posted to a public channel), n8n can act as a Kuma webhook receiver. It must NEVER be the critical-outage path.

**Anti-patterns (forbidden):**

- ❌ Configuring n8n as the **only** notifier on any monitor. n8n shares fate with the box; if the box dies, n8n cannot tell us about it.
- ❌ Configuring n8n as **PRIMARY** on ANY monitor. The PRIMARY slot is § 9.1 Telegram only.
- ❌ Sending Kuma's webhook to the production `<PRODUCTION_ORIGIN>/api/automation/ingest` endpoint. Kuma's events are NOT in the `docs/automation-framework.md` § 4 allowed event-type list, and forging an event-type would create false `automation_events` rows.

**If configured (operator's choice):**

1. In n8n, create a new workflow (or add a Webhook node to an existing one) that:
   - Listens at a private webhook path (e.g. `/webhook/kuma-digest`).
   - Reads `Authorization` header against an n8n-side credential (operator's choice; **NOT** any in-repo secret).
   - Persists or fans-out the digest payload as the operator wants.
2. In Kuma: **Settings → Notifications → Setup Notification**.
3. **Notification Type** = `Webhook`.
4. **Friendly Name** = `kuma-ops-n8n-digest-secondary`.
5. **Post URL** = the n8n webhook URL.
6. **Custom Body / Headers** = the auth header from step 1 above.
7. **Apply on all existing monitors** = `NO`. Manually attach this notifier to monitors **only** when the operator wants a digest from that monitor.
8. Test, save.

The DRA verdict for this runbook is unaffected by whether § 9.3 is configured. K1–K5 do not require it.

---

## 10. Rollback / disable steps

Three reversal levels, ordered by impact (smallest first). All operator-driven. **The CorpFlow runtime is unchanged by all three rollback paths** — Vercel, GitHub workflows, Postgres (Neon), public marketing pages, ERPNext sandbox, ERPNext production-shell, and n8n are unaffected.

### 10.1 Pause monitoring (≤ 60 seconds; fully reversible immediately)

```bash
cd "$HOME/uptime-kuma"
docker compose -p uptime-kuma stop
```

- Container stops; data preserved in `~/uptime-kuma-data/`.
- No alerts fire from now on.
- To resume: `docker compose -p uptime-kuma start` — Kuma comes back with all monitors and notifiers intact.
- Use this when: investigating a Kuma misconfiguration that is firing spurious alerts; doing operator-side maintenance that would cause apparent outages.

### 10.2 Full uninstall (≤ 5 minutes; data preserved unless step c)

```bash
# 10.2.a — Stop and remove the container.
cd "$HOME/uptime-kuma"
docker compose -p uptime-kuma down
# Container removed; bind-mounted data still in ~/uptime-kuma-data/.

# 10.2.b — Optionally remove the pinned image (if disk pressure).
docker image rm louislam/uptime-kuma:1.23.13

# 10.2.c — DESTRUCTIVE: only run if you also want to delete all monitor history,
#          notification configuration, and the admin password.
#          Take a host-side tar backup FIRST if you might want to restore.
#          tar czf ~/uptime-kuma-data-backup-$(date -u +%Y%m%d-%H%M%S).tgz -C "$HOME" uptime-kuma-data
rm -rf "$HOME/uptime-kuma-data" "$HOME/uptime-kuma"
```

- 10.2.a + 10.2.b: container & image gone, data preserved → can be re-installed by re-running § 5.3 onward.
- 10.2.c: full wipe → next install starts at first-run setup wizard again.
- Use this when: rotating to a new Kuma minor (e.g. 1.24.x — requires a new ADR first); migrating to a different host; carrying out the post-revert cleanup after § 10.3.

### 10.3 Repo revert (≤ 1 hour; governance rollback)

If PR #367's authorization needs to be reversed entirely (not just paused):

```bash
# 10.3.a — Revert the install runbook PR (this PR).
git checkout main
git pull
git revert -m 1 <THIS_PR_MERGE_COMMIT_SHA>

# 10.3.b — Revert the authorization packet PR #367.
git revert -m 1 83fc4d6b
```

- Open the resulting commits as a single PR titled `Revert: Uptime Kuma authorization on exec01` with reasoning.
- After merge: `JE-2026-06-15-1` is superseded by a fresh `JE-YYYY-MM-DD-N` row that records the reversal and reasoning.
- Operator runs § 10.2.c to remove all on-box state.

### 10.4 Per-row revocation (governance only — no on-box change)

If the carve-out needs to be tightened (not removed) — e.g. operator decides Kuma should run on a different host, or with a different bind, or with monitor # 13 transferred to a paid third-party tool:

- Append a fresh `JE-YYYY-MM-DD-N` row to `docs/decisions/JOURNAL.md` recording the decision.
- Update `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 table accordingly (or remove the row entirely if Kuma is replaced).
- Update `docs/operations/MONITORING_ARCHITECTURE.md` § 11.1 / § 11.2 accordingly.
- The on-box rollback is whichever of § 10.1 / § 10.2 / § 10.3 the new JE row prescribes.

### 10.5 What rollback DOES NOT touch

- ❌ Vercel project, deployments, env vars, cron — unchanged.
- ❌ GitHub Actions workflows, secrets, branch protection — unchanged.
- ❌ Postgres (Neon) — unchanged. Kuma never touches Postgres.
- ❌ Public marketing pages (`corpflowai.com/`, `corpflowai.com/lead-rescue`, `aileadrescue.corpflowai.com/`, `lux.corpflowai.com/`) — unchanged.
- ❌ ERPNext sandbox container (`corpflowai-sandbox-*`) — unchanged. § 10.1 / § 10.2 / § 10.3 all only touch the `uptime-kuma` container + its data dir + its compose project dir.
- ❌ ERPNext production-shell container (`corpflowai-production-*`) — unchanged.
- ❌ n8n host (wherever it runs today) — unchanged. Removing § 9.3 from Kuma's notifications has no effect on n8n.
- ❌ In-repo `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` — unchanged. Kuma uses a SEPARATE bot per § 9.1.

---

## 11. K1 – K5 verification block

Five live checks, all operator-driven. Every check has an **expected output** and a **PASS/FAIL** signal. The operator captures evidence and pastes it into § 12 + the Phase 1A artifact § 7. **A single FAIL invalidates the install** — operator runs § 10.1, hands evidence to Anton, no DRA flip.

### K1: Kuma UI reachable through SSH tunnel (FROM operator's laptop)

- **Setup:** SSH tunnel from § 6 is active (`ssh -L 3001:localhost:3001 anton@5.78.213.185` is running in the operator's local terminal).
- **Test (browser):** open `http://localhost:3001/`.
- **Expected:** Kuma dashboard renders (after first-login from § 7) showing the eight monitors from § 8, all green.
- **Test (curl, alternative):** in a new local terminal:
  ```bash
  curl -fsS --max-time 5 http://localhost:3001/ | head -c 200
  ```
- **Expected:** HTML body containing `Uptime Kuma` (or the SPA root markers).
- **PASS criterion:** UI loads; dashboard shows monitors; HTTP 200.
- **FAIL criterion:** browser shows connection refused / `ERR_CONNECTION_REFUSED`; or curl returns non-zero; or HTML does not contain Kuma markers.
- **If FAIL:** check the SSH session is still alive; check `docker ps --filter 'name=uptime-kuma'` on the box shows `Up (healthy)`; if container is down, container did not start cleanly — § 10.1 + investigate.

### K2: Kuma UI NOT reachable from the public internet (FROM operator's laptop, NO tunnel)

- **Setup:** **close the SSH tunnel from K1**. Verify `ss -tln | grep ':3001 '` (or `netstat -ano | findstr :3001` on Windows) shows nothing on the operator's laptop.
- **Test 1 (direct external curl):** from operator's laptop:
  ```bash
  curl -fsS --max-time 5 http://5.78.213.185:3001/ ; echo "exit=$?"
  ```
- **Expected:** non-zero exit code (typically `exit=7` = Connection refused, or `exit=28` = timeout).
- **Test 2 (alternative network — e.g. operator's phone tether or external box):** repeat the same curl from a clearly-different network path.
- **Expected:** same non-zero exit.
- **Test 3 (TLS port 443 sanity — optional):** confirm there is no public Kuma at any standard HTTPS path:
  ```bash
  curl -fsS --max-time 5 https://5.78.213.185/ ; echo "exit=$?"
  ```
- **Expected:** non-zero exit (no public TLS terminator was added; if this returns 200, a reverse proxy was added without authorization — STOP).
- **Test 4 (on-box host-side, separate SSH session):** open a fresh SSH session (`ssh anton@5.78.213.185`) and run:
  ```bash
  ss -tlnp 2>/dev/null | grep ':3001 '
  docker exec uptime-kuma sh -c 'apk add --no-cache iproute2 >/dev/null 2>&1 || true; ss -tln 2>/dev/null | grep 3001 || netstat -tln 2>/dev/null | grep 3001'
  ```
- **Expected:** host-side `ss` shows `127.0.0.1:3001` (not `0.0.0.0:3001`, not `:::3001`); container-side shows Kuma listening on `0.0.0.0:3001` INSIDE the container (which is normal — it's the host-side mapping that matters).
- **PASS criterion:** All four tests confirm public unreachability + loopback-only host bind.
- **FAIL criterion:** Test 1, 2, or 3 returns HTTP 200 (Kuma is publicly reachable).
- **If FAIL:** STOP. Run § 10.1 immediately. Loopback-only is the fundamental constraint of PR #367 — its violation requires a § 10.3 governance rollback.

### K3: All eight monitors Up within 60 seconds

- **Setup:** all eight monitors from § 8 are saved.
- **Test:** wait 90 seconds (one heartbeat plus margin), then in the Kuma dashboard:
  - All 8 rows show green / Up.
  - Each row shows at least one heartbeat tick in the timeline.
  - No row shows red / Down or Pending.
- **Evidence:** screenshot of the dashboard with all 8 rows green; capture timestamps for the JOURNAL row.
- **PASS criterion:** all 8 rows green at 90 s after save.
- **FAIL criterion:** any row red or Pending at 120 s after save.
- **If FAIL:** check the failing URL manually (`curl -fsS --max-time 15 <URL> | head -c 200` from the operator's laptop). If the URL is genuinely failing, it's a real outage — alert per the operator's incident process. If the URL is fine but Kuma reports Down, check Kuma's egress (Kuma needs outbound HTTPS to all eight URLs). The CorpFlow box's egress is normally unrestricted, so this should not occur on the listed URLs.

### K4: Telegram test alert delivered through Kuma's own bot

- **Setup:** Kuma's own Telegram bot from § 9.1 is configured. The CorpFlow `TELEGRAM_BOT_TOKEN` (in-repo) is **NOT** in use here.
- **Test 1 (built-in test button):** **Settings → Notifications → kuma-ops-telegram-primary → Test**.
- **Expected:** test message arrives in the operator's Telegram chat within 5 seconds. Sender is the new bot from § 9.1 (NOT the in-repo bot).
- **Test 2 (forced-failure):** edit one monitor (e.g. 8.2.1) to point at a deliberately-broken URL (`https://core.corpflowai.com/api/factory/health-DOES-NOT-EXIST`). Wait for 2 retries × 60 s = 120 s.
- **Expected:** "Down" alert arrives in the chat within 130 seconds. Restore the original URL; expect "Up" alert within 130 seconds.
- **PASS criterion:** Test 1 and Test 2 both deliver alerts to the chat with the new bot as sender.
- **FAIL criterion:** Test 1 returns an error; OR Test 2's "Down" alert never arrives; OR the alert sender is the in-repo bot (token leak — STOP, rotate, investigate).
- **If FAIL on bot identity:** the operator pasted the in-repo `TELEGRAM_BOT_TOKEN` into Kuma instead of a new bot. Treat as a credential incident: § 10.1 immediately, rotate the in-repo bot, regenerate Kuma's bot via @BotFather, re-do § 9.1.

### K5: Alert still works with n8n stopped/unavailable

This proves the critical-outage path does NOT depend on n8n.

- **Setup:** identify the n8n process / workflow that handles ANY automation events. If § 9.3 is configured, identify the specific Kuma-digest workflow.
- **Test (operator-driven, on the n8n host):** stop n8n entirely (e.g. `docker compose -p n8n stop` if it's containerised, or whatever the n8n host-specific stop command is). Verify n8n's health endpoint returns nothing.
- **Force a fail in Kuma:** repeat K4 Test 2 (edit a monitor to a broken URL).
- **Expected:** Down alert arrives via Telegram (§ 9.1) within 130 s. SMTP backup (§ 9.2) also fires if configured. **n8n receiving the digest is irrelevant** — Kuma's PRIMARY path is direct to Telegram and does not traverse n8n.
- **Restore:** restore the broken URL in Kuma; restart n8n.
- **Expected:** "Up" alert arrives via Telegram. n8n digest workflow is back online if applicable.
- **PASS criterion:** Telegram alert arrives during the n8n-down window.
- **FAIL criterion:** No alert arrives during the n8n-down window.
- **If FAIL:** Kuma was misconfigured to route through n8n. § 10.1, then re-do § 9.1 and § 9.3 (move n8n out of the PRIMARY slot and into SECONDARY-only).

### K1 – K5 summary expectation

After all five PASS, the install is operationally complete from a verification standpoint:

- K1 ✅ → operator can reach Kuma UI
- K2 ✅ → no one else can reach Kuma UI
- K3 ✅ → Kuma sees the eight URLs and reports them correctly
- K4 ✅ → Kuma can deliver an alert via its own bot
- K5 ✅ → that alert path does not depend on n8n

The operator is then ready to flip Step 2 → COMPLETE per § 13.

---

## 12. Evidence template (Anton pastes filled-in version back)

The operator copies this block into a chat to Cursor (or to a holding file like `artifacts/self-hosted-ops-stack-v1/2026-MM-DD-kuma-install-evidence.md`), then Cursor opens a docs-only PR that:

- Pastes the filled-in evidence into `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md` § 7 (new subsection 7.4 *"Step 2 — Uptime Kuma install evidence"*).
- Appends the corresponding `JE-YYYY-MM-DD-N` row to `docs/decisions/JOURNAL.md` (see § 13.3).
- Updates `docs/operations/MONITORING_ARCHITECTURE.md` § 11 monitor # 13 state (see § 13.2).
- Updates `docs/CORPFLOW_SHARED_TODO.md` Step 2 row (see § 13.4).

**Hard rule for the evidence block:** **no secrets, no tokens, no chat ids, no passwords, no private DNS names, no internal IP addresses other than the public `5.78.213.185`**. The block records observable OUTCOMES, not credentials.

### 12.1 Evidence block — paste this verbatim, fill the `<...>` placeholders

```text
# Uptime Kuma install evidence — corpflow-exec-01-u69678

Operator: Anton
Date (UTC):           <YYYY-MM-DDTHH:MM:SSZ>
Date (local UTC+4):   <YYYY-MM-DD HH:MM>
Runbook executed:     docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md
Authorization basis:  PR #367 / JE-2026-06-15-1 / ADR docs/decisions/20260615-uptime-kuma-on-exec01.md

## Install evidence

- Pinned image:       louislam/uptime-kuma:1.23.13
- Image digest:       <sha256:... — paste output of § 5.4.b>
- Container name:     uptime-kuma
- Compose project:    uptime-kuma
- Data dir:           ~/uptime-kuma-data/   (mode 700)
- Compose file:       ~/uptime-kuma/compose.yaml
- Host port mapping:  127.0.0.1:3001 -> 3001/tcp     (output of § 5.5.b PORTS column)
- Container status:   Up <X> minutes (healthy)       (output of § 5.5.b STATUS column)

## Pre-flight (§ 5.1)

- hostname matched corpflow-exec-01-u69678:                       YES / NO
- Capacity OK (4 vCPU / ~7.5 GiB / >= 30 GiB free):               YES / NO
- Docker + Compose v2 present:                                    YES / NO
- ERPNext sandbox containers Up before install:                   YES / NO
- ERPNext production-shell containers Up before install:          YES / NO
- No prior uptime-kuma container or compose project:              YES / NO
- Port 3001 free on host:                                         YES / NO

## Loopback-only verification (§ 5.6)

- ss -tlnp showed 127.0.0.1:3001 (NOT 0.0.0.0 / NOT :::):         PASS / FAIL
- On-box curl http://127.0.0.1:3001/ returned Kuma HTML:          PASS / FAIL
- Off-box curl http://5.78.213.185:3001/ returned non-zero exit:  PASS / FAIL  (exit code = <7|28|...>)

## ERPNext untouched (§ 5.7)

- Sandbox containers still Up after install:                      YES / NO
- Production-shell containers still Up after install:             YES / NO
- Only NEW container is uptime-kuma (no watchtower/sidecar):      YES / NO

## Monitors (§ 8)

| # | Friendly name                  | Status at 90s | Notes                |
|---|--------------------------------|---------------|----------------------|
| 1 | core-factory-health            | Up / Down     | keyword "ok":true Y/N|
| 2 | core-production-pulse-runtime  | Up / Down     |                      |
| 3 | corpflowai-apex-root           | Up / Down     |                      |
| 4 | corpflowai-lead-rescue         | Up / Down     |                      |
| 5 | aileadrescue-apex-root         | Up / Down     |                      |
| 6 | lux-apex-root                  | Up / Down     |                      |
| 7 | lux-change-console             | Up / Down     |                      |
| 8 | n8n-health                     | Up / Down     | URL family confirmed |

(Do NOT paste the actual n8n URL into this artifact; just confirm the URL family.
 Operator records the actual URL only inside Kuma.)

## Notifications (§ 9)

- § 9.1 Kuma Telegram bot configured (separate from in-repo bot):  YES / NO
- § 9.2 SMTP backup configured (optional):                         YES / NO / NOT-CONFIGURED
- § 9.3 n8n SECONDARY-only configured (optional):                  YES / NO / NOT-CONFIGURED
- § 9.1 bot is verifiably DIFFERENT from in-repo TELEGRAM_BOT_TOKEN: YES / NO

## K1 – K5 verification (§ 11)

| Check | Description                                              | Result      |
|-------|----------------------------------------------------------|-------------|
| K1    | Kuma UI reachable via SSH tunnel                         | PASS / FAIL |
| K2    | Kuma UI NOT reachable from public internet               | PASS / FAIL |
| K3    | All 8 monitors Up within 60–90 s                         | PASS / FAIL |
| K4    | Telegram test alert delivered via Kuma's own bot         | PASS / FAIL |
| K5    | Alert path independent of n8n (still works n8n stopped)  | PASS / FAIL |

## Verdict

- Overall: PASS / PARTIAL / FAIL
- If PARTIAL or FAIL, list which checks failed and the operator-side
  rollback action taken (§ 10.1 / § 10.2 / § 10.3).
- If PASS: operator authorises Cursor (L1) to open the docs-only
  closure PR per § 13.

## Rollback / disable readiness

- § 10.1 (`docker compose -p uptime-kuma stop`) tested as a dry-run:  YES / NO
- Operator confirms § 10.2.c is destructive and only used post-revert: YES
- Operator confirms repo revert path § 10.3 is understood:            YES

## Notes / deviations from runbook

<free text — anything that differed from the runbook and how the
 operator handled it. If the operator amended the runbook in any way,
 note the diff so Cursor can roll the amendment into the PR that
 closes Step 2.>
```

### 12.2 What NOT to paste into the evidence block

- ❌ Kuma admin password.
- ❌ Telegram bot token.
- ❌ Telegram chat id.
- ❌ SMTP host / username / password.
- ❌ The actual n8n URL (just confirm "URL family confirmed").
- ❌ Any internal IP / private hostname other than the public `5.78.213.185`.
- ❌ Any session cookie, SSH host key fingerprint, or Kuma API token.

If the operator accidentally pastes any of the above, treat as a credential incident:
1. Rotate the leaked credential immediately (§ 10.1 if Kuma; @BotFather `/revoke` for Telegram; SMTP app-password regen).
2. Scrub the chat / file / PR history.
3. Append a `JE-YYYY-MM-DD-N` row recording the rotation.

---

## 13. Update points after a successful operator run

Once K1 – K5 all PASS and the operator returns the filled-in § 12 evidence, Cursor (L1) opens a single closure PR that flips Step 2 → COMPLETE.

### 13.1 Phase 1A artifact § 7 — paste evidence

- File: `artifacts/self-hosted-ops-stack-v1/2026-06-15-phase-1a-live-verification.md`.
- Add new subsection `## 7.4 Step 2 — Uptime Kuma install evidence` containing the filled-in § 12 block.
- In § 5 of the artifact, flip Step 2 status from `BLOCKED → AUTHORIZED-PENDING-INSTALL` to `COMPLETE` and link to § 7.4.

### 13.2 `MONITORING_ARCHITECTURE.md` monitor # 13 state

- File: `docs/operations/MONITORING_ARCHITECTURE.md`.
- § 11.1 *Today's monitors* — flip monitor # 13 row from `🟡 authorized, not installed` to `✅ active` and add the install date.
- § 11.2 *Named future packets* — remove the `kuma-on-exec01-install` row (because it has now landed) OR mark it as `LANDED 2026-MM-DD via JE-YYYY-MM-DD-N`. Keep `exec01-uptime-from-third-location` in § 11.2 (the second complementary signal is still future).
- § 2 surface map — change the section heading from `## 2. Surface map — the 12 active monitors + 1 authorized-pending-install` to `## 2. Surface map — the 13 active monitors`.
- § 4 alert routing — flip monitor # 13's row from "Kuma's own bot, **once installed**" to "Kuma's own bot (active)".
- § 6 known blind spots — flip the "no third-location uptime monitoring" row from `OPEN` to `CLOSED 2026-MM-DD` with link to the JE row.

### 13.3 `docs/decisions/JOURNAL.md` — new JE row

Append a new row `JE-YYYY-MM-DD-N` (operator picks the date based on actual install run) with shape:

```text
| JE-YYYY-MM-DD-N | Uptime Kuma installed and active on `corpflow-exec-01-u69678` per `UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1`. K1 – K5 = PASS. Step 2 of `SELF_HOSTED_OPS_STACK_V1.md` flips → COMPLETE. Authorization basis: PR #367 / JE-2026-06-15-1 / ADR `docs/decisions/20260615-uptime-kuma-on-exec01.md`. Image: `louislam/uptime-kuma:1.23.13` (pinned). Container: `uptime-kuma`. Bind: `127.0.0.1:3001`. Data dir: `~/uptime-kuma-data/` (mode 700). Notifier: NEW Telegram bot via @BotFather (separate from in-repo `TELEGRAM_BOT_TOKEN`); SMTP backup `<configured / not configured>`; n8n SECONDARY-only `<configured / not configured>`. Hard limits honoured: third-location monitoring only; loopback-only; no public port; no DNS; no reverse proxy; no client data; no production DB access; no app/runtime code change; no `.env` change; no second app; no second DB. Reversible via § 10.1 (≤ 60 s) / § 10.2 (≤ 5 min) / § 10.3 (≤ 1 hour). Verdict: COMPLETE. Reversibility: § 10.{1,2,3,4}. |
```

### 13.4 `docs/CORPFLOW_SHARED_TODO.md`

- Locate the Phase 1 self-hosted ops stack section.
- Step 2 row: flip from `BLOCKED → AUTHORIZED-PENDING-INSTALL` to `COMPLETE 2026-MM-DD via JE-YYYY-MM-DD-N`.
- Step 3 row (restic): flip the gate from `gated on Steps 1 + 2 = COMPLETE` to `gated on Step 1 = COMPLETE` (Step 1 / n8n automation-forward is still open per the prior PARTIAL).

### 13.5 Optional: `docs/operations/SELF_HOSTED_OPS_STACK_V1.md`

- § 3.4 *Step 2 status* — flip to `COMPLETE 2026-MM-DD via JE-YYYY-MM-DD-N`.
- § 4 *Step 3 — restic* — gating language updated per § 13.4 above.

### 13.6 `artifacts/chat_history.md`

Add a dated bullet under the current month section recording the install + K1 – K5 result + JE row id.

### 13.7 What is NOT updated

- ❌ `.env.template` — unchanged.
- ❌ `vercel.json` — unchanged.
- ❌ `package.json` / `package-lock.json` — unchanged.
- ❌ Any `api/`, `lib/`, `pages/`, `components/`, `prisma/`, `middleware*` file — unchanged.
- ❌ Any GitHub Actions workflow — unchanged.
- ❌ The CMP database (`automation_events`, `cmp_tickets`, etc.) — unchanged. Kuma writes nothing to Postgres.

---

## 14. Delivery Reality Audit (this runbook)

This DRA records the docs-only authorship of the runbook. It is **NOT** the install DRA — that is recorded by the closure PR per § 13 once K1 – K5 PASS.

```text
Delivery Reality Audit — UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1 (docs-only authorship)
- Local fix exists:                       YES (this runbook + § 13 update points)
- Merged to main:                         pending Anton's merge of the runbook PR
- Production deployment ID:               n/a — docs-only, no Vercel deploy implication
- Commit deployed:                        n/a — docs-only
- Live URLs tested:                       n/a — runbook authoring round; live URLs are tested by the OPERATOR at K1 – K5 time, not by Cursor
- Expected vs actual result:              expected: a runbook that an operator can paste verbatim and that, by construction, cannot widen the carve-out beyond PR #367. actual: 14-section runbook authored, every command block bounded by § 1.4 scope checklist, every notifier role bounded by § 9.1 / § 9.2 / § 9.3, K1 – K5 spelled out with PASS/FAIL signals
- Client-facing flow usable:              n/a — Kuma is internal; the customer-facing flow is the eight URLs in § 8 which are already protected by the existing 12 monitors and remain unchanged
- Final verdict:                          COMPLETE for docs-only install runbook authoring
```

### 14.1 Future DRA (the install run itself)

Once Anton runs the runbook end-to-end and § 12 evidence shows K1 – K5 = PASS, the closure PR carries this DRA shape:

```text
Delivery Reality Audit — Uptime Kuma install on corpflow-exec-01-u69678 (live)
- Local fix exists:                       YES (live container on the box)
- Merged to main:                         <YES — closure PR per § 13>
- Production deployment ID:               n/a — does not deploy to Vercel
- Commit deployed:                        n/a — runs on `corpflow-exec-01-u69678` (L3), not Vercel
- Live URLs tested:                       all eight URLs in § 8 + Kuma UI via SSH tunnel (K1) + Kuma UI NOT reachable from public internet (K2)
- Expected vs actual result:              K1=PASS / K2=PASS / K3=PASS / K4=PASS / K5=PASS
- Client-facing flow usable:              YES — all eight monitored client-facing URLs return 200 to Kuma's probes; alerts route to operator's chat via Kuma's own Telegram bot independently of n8n
- Final verdict:                          COMPLETE
```

### 14.2 If any check FAILs

The closure PR is **not** opened. Instead:

1. Operator runs § 10.1 (pause) or § 10.2 (uninstall) per the failure mode.
2. Operator pastes the partial § 12 evidence to Cursor.
3. Cursor (L1) opens a docs-only diagnostic PR that:
   - Files the partial evidence under `artifacts/self-hosted-ops-stack-v1/2026-MM-DD-kuma-install-FAIL.md`.
   - Appends a `JE-YYYY-MM-DD-N` row recording the failure cause + rollback level.
   - Either amends THIS runbook (if a runbook bug is the cause) and re-runs § 13, OR escalates to a new ADR (if the failure exposes a constraint not in PR #367).
4. Step 2 stays at `AUTHORIZED-PENDING-INSTALL` until a clean run lands.

---

## Change log

- **2026-06-16** — Initial v1 authored at L1 by Cursor. Docs-only. No L3 commands typed by Cursor. Authorization basis: PR #367 (merged 2026-06-15). Companion docs: ADR `docs/decisions/20260615-uptime-kuma-on-exec01.md`, packet `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md`, carve-out in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, monitor # 13 in `MONITORING_ARCHITECTURE.md`, JE-2026-06-15-1.

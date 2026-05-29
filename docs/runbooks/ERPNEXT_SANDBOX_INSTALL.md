# ERPNext sandbox install runbook (v1)

**Status:** Phase A1 of multi-phase ERPNext implementation. **Phase B (the install body) is HELD** until the host capacity question in §0.1 is resolved by the operator.
**Companion to:** `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`.
**Target host (per `docs/decisions/JOURNAL.md` JE-2026-05-29-1):** `corpflow-exec-01` (self-host, Hetzner KVM, Elestio-managed).
**Anchor sentinel:** `<!-- ERPNEXT_SANDBOX_INSTALL_RUNBOOK_V1 -->`

<!-- ERPNEXT_SANDBOX_INSTALL_RUNBOOK_V1 -->

## Authorship and ownership

- **Operator (Anton) owns:** host capacity-resize decision (§0.1), merge of this runbook, ERPNext admin password storage decision, ERPNext UI access strategy (§10), tear-down (§15). Every Hetzner/Elestio panel click. Every billing change.
- **Cursor owns:** drafting, SSH-driven install steps §1–§9 once §0.1 is cleared, post-install read-only verification, evidence capture into bridge issue #249 and `docs/decisions/JOURNAL.md`.
- **Bridge protocol:** every phase boundary (pre-install pre-flight, post-install bring-up, CoA imported, backup verified, tear-down) gets a STATUS comment on issue #249 per `docs/operations/OPERATOR_BRIDGE_V1.md` §5.

This runbook **does not** describe Phase C (test plan execution) or Phase D (go/no-go recommendation). Those follow in `docs/runbooks/ERPNEXT_SANDBOX_TESTING.md` (added in Phase A2) and `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` §10 respectively.

## 0. Hard prerequisites (Phase B BLOCKED until resolved)

### 0.1 Capacity finding (2026-05-29)

Read-only pre-flight against `corpflow-exec-01` measured **1.9 GB RAM**, 31 GB disk on `/`, 2 CPU cores, no Docker installed, no existing CorpFlowAI workloads active on the box (no factory processes, no containers, no cron, only `sshd` + `systemd-resolved` + standard OS daemons listening). Egress to `ghcr.io`, `hub.docker.com`, and `github.com/frappe/frappe_docker` reachable.

Frappe Docker requires **4 GB RAM minimum**, **8 GB RAM comfortable** for a single sandbox site running Frappe + MariaDB + Redis (cache) + Redis (queue) + Frappe workers + Nginx. Running the stack on 1.9 GB will OOM under any test load and will produce false-negative results in the Phase C test plan.

**Phase B (this runbook §1–§13) does not start until one of the three paths below is chosen by Anton and recorded as a new `JOURNAL.md` row.**

| Path | Action (operator-only) | Estimated billing | Risk |
|---|---|---|---|
| **A — Resize `corpflow-exec-01`** | Anton resizes via the Elestio/Hetzner panel to a 4 GB tier (e.g. CX22 equivalent) or 8 GB tier (CX32 equivalent). Brief reboot. | ~€3–5/mo (4 GB) or ~€8–12/mo (8 GB) above current line | Pre-flight showed no factory workloads on the box, so reboot risk is negligible. |
| **B — Provision a fresh VM** | Anton creates a new Hetzner CX22/CX32 dedicated to the sandbox; adds it to `~/.ssh/config` (suggested name: `corpflow-erp-01`) so Cursor can SSH in. Phase B targets the new host instead. | ~€4–12/mo new line item | Fully isolated; one more box to maintain. |
| **C — Switch to Frappe Cloud trial** | Anton signs up for the Frappe Cloud free trial (vendor-managed). This runbook is replaced with a Frappe-Cloud-specific runbook (Cursor produces it in a follow-up Phase A2 PR once chosen). | Free during trial; ~USD 10/mo after | Vendor-managed; trial may expire mid-test-cycle. |

The chosen path is recorded as a new `JOURNAL.md` row with the format:

```text
| JE-2026-MM-DD-n | 2026-MM-DD | Anton | Chose path <A|B|C> — <one-sentence detail>. ERPNext Phase B install proceeds on <host>. | <how to revert>. |
```

### 0.2 Operator-only steps Cursor will not perform

- Clicking "Resize" in any Hetzner / Elestio panel (billing change).
- Signing up for Frappe Cloud (external account + billing).
- Editing DNS for any sandbox hostname.
- Holding real Mauritius bank, PayPal, or Wise credentials.
- Committing the ERPNext admin password to the repo (the password lives on the host only — see §4.1).
- Approving the merge of this runbook or any Phase B / C / D PR.

### 0.3 What Cursor will do once §0.1 is cleared

Once Anton records the chosen path in `JOURNAL.md`, Cursor runs §1–§9 of this runbook via SSH on the chosen host, generates sandbox credentials at `~/.erpnext-sandbox-credentials` (chmod 600, never committed), captures container health + version IDs + backup file path as evidence, and posts a Phase B closure STATUS to issue #249 inviting the operator to verify before Phase C begins.

## 1. Pre-install pre-flight (Cursor; re-runnable, read-only)

Re-confirms capacity before any install action. Idempotent; safe to run as many times as needed.

```bash
# Run on the chosen host
df -h / && free -h && nproc
ss -tlnp 2>/dev/null | grep -E ':(80|443|3000|3306|5432|6379|8080|9000|11000)\s' || echo '(no conflicts)'
which docker && docker version --format '{{.Server.Version}}' 2>/dev/null || echo '(docker not installed)'
curl -s -I -o /dev/null -w 'ghcr.io %{http_code}\n' https://ghcr.io --max-time 5
curl -s -I -o /dev/null -w 'hub.docker.com %{http_code}\n' https://hub.docker.com --max-time 5
curl -s -I -o /dev/null -w 'frappe_docker %{http_code}\n' https://github.com/frappe/frappe_docker --max-time 5
```

Pre-flight passes when: `free -h` shows ≥ 4 GB total; `df -h /` shows ≥ 20 GB available; no conflict on ports 8080 / 11000 / 13000; egress probes return `200`/`405`/`301` (any non-zero `%{http_code}` means reachable).

If the box has ≥ 4 GB RAM but the path-decision row in `JOURNAL.md` is still missing, Cursor halts and posts an `AWAITING_OPERATOR` STATUS on issue #249.

## 2. Install Docker + Compose plugin

Use Docker's official APT repository (not the distro package, which can be stale). The commands below are taken from Docker's `https://docs.docker.com/engine/install/ubuntu/`; pinning the major version line for predictability.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Allow the operator user to run docker without sudo
sudo usermod -aG docker "$USER"
newgrp docker

docker version
docker compose version
```

Record the exact `docker version` output (server + client) in a `JOURNAL.md` row at install time.

## 3. Clone Frappe Docker

Frappe Docker is the upstream-maintained Docker Compose layout for ERPNext. Do **not** fork or copy it into the CorpFlowAI repo; clone it to a sibling directory.

```bash
mkdir -p ~/erpnext-sandbox
cd ~/erpnext-sandbox
git clone https://github.com/frappe/frappe_docker.git
cd frappe_docker
git fetch --tags
# Pin to a known stable tag at install time; v5.0.0 is the latest stable line as of 2026-05.
# Confirm with `git tag --sort=-v:refname | head -10` and pick the latest stable v5.x.
git checkout v5.0.0
```

Record both the chosen tag and the resolved commit SHA in `JOURNAL.md`:

```text
ERPNext sandbox install:
  frappe_docker tag: v5.0.0
  commit:            <full SHA from `git rev-parse HEAD`>
  date:              <ISO timestamp>
  installed on:      <hostname>
  Docker server:     <docker version --format ...>
```

## 4. Configure the `.env` overlay

```bash
cd ~/erpnext-sandbox/frappe_docker
cp example.env .env
```

Required values for the sandbox (sandbox-only; never real production):

| Key | Value | Notes |
|---|---|---|
| `ERPNEXT_VERSION` | `version-15` (pin to the latest stable v15 tag; check `https://hub.docker.com/r/frappe/erpnext/tags`) | Record exact tag in `JOURNAL.md` |
| `FRAPPE_SITE_NAME_HEADER` | `corpflowai-sandbox.localhost` | Single sandbox site; `localhost` keeps it off any DNS |
| `SITES` | `corpflowai-sandbox.localhost` | Matches the header |
| `DB_PASSWORD` | Generated via `openssl rand -base64 32` | See §4.1 |
| `MARIADB_ROOT_PASSWORD` | Generated via `openssl rand -base64 32` | See §4.1 |
| `MAIL_PASSWORD` / `MAIL_USER` / `MAIL_PORT` / `MAIL_SERVER` | **Empty** | No email sending in sandbox |
| `ROUTER` (if present) | `nginx` (default) | We expose port 8080 locally only; access via SSH tunnel (§10) |

`chmod 600 .env` after edits.

### 4.1 Sandbox secret handling (Cursor's contract)

Cursor generates and stores sandbox-only passwords on the host. The repo never sees them.

```bash
ERPNEXT_CRED_FILE="$HOME/.erpnext-sandbox-credentials"
umask 077
{
  echo "# Generated $(date -Iseconds) by Cursor on $(hostname)"
  echo "# Sandbox-only; never reuse outside this ERPNext sandbox."
  echo "MARIADB_ROOT_PASSWORD=$(openssl rand -base64 32)"
  echo "DB_PASSWORD=$(openssl rand -base64 32)"
  echo "ADMIN_PASSWORD=$(openssl rand -base64 32)"
} > "$ERPNEXT_CRED_FILE"
chmod 600 "$ERPNEXT_CRED_FILE"
```

- The credentials file lives at `~/.erpnext-sandbox-credentials` on the chosen host.
- Cursor posts the **file path** to bridge issue #249 but never the **contents**.
- Anton can rotate via `bench --site corpflowai-sandbox.localhost set-admin-password <new>` followed by rewriting the file.
- On tear-down (§15) the file is removed.

### 4.2 What does NOT go in `.env`

- No real Mauritius bank account number.
- No PayPal API key (the sandbox tests PayPal as a manual / unverified ledger source per `ERPNEXT_SANDBOX_PLAN_V1.md` §5).
- No Wise API key (same posture, plan §6).
- No production Telegram, n8n, Plausible, or Search Console token.
- No CorpFlowAI Postgres / Neon credentials.

## 5. Bring up the stack

```bash
cd ~/erpnext-sandbox/frappe_docker
docker compose \
  -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  -f overrides/compose.noproxy.yaml \
  -p erpnext-sandbox \
  up -d
```

`-p erpnext-sandbox` keeps the Docker project name (and therefore network / volume names) separate from anything else that might land on the box later.

Wait for all containers to be `healthy`:

```bash
docker compose -p erpnext-sandbox ps
# Re-run until every row shows `Up (healthy)` or `Up`.
```

First-time image pull is typically 5–10 minutes. If the host has < 4 GB RAM the `frontend` and `backend` containers will OOM during boot — this is the failure mode §0.1 is designed to prevent.

## 6. Create the sandbox site

```bash
source ~/.erpnext-sandbox-credentials

docker compose -p erpnext-sandbox exec backend bench new-site corpflowai-sandbox.localhost \
  --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --no-mariadb-socket

docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost install-app erpnext
```

Confirm the site is reachable on the box:

```bash
curl -sI http://localhost:8080 -H 'Host: corpflowai-sandbox.localhost' | head -5
# Expect HTTP/1.1 200 OK or 302 to the setup wizard.
```

## 7. Setup wizard

Operator runs §7 in the ERPNext UI via the SSH tunnel from §10.

| Wizard field | Value |
|---|---|
| Company name | **`CorpFlowAI Sandbox`** (literal; never `CorpFlowAI` alone) |
| Country | `Mauritius` |
| Default currency | `MUR` |
| Operator email | `anton+erp-sandbox@<personal-domain>` (alias contains `sandbox`) |
| Time zone | `Indian/Mauritius` (UTC+4) |
| Default chart of accounts | `Standard with Numbers` (overlay our CoA in §11) |
| Domain | `Services` (closest fit for our offer model; ignores irrelevant industries) |

After the wizard:

```bash
docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost set-config developer_mode 0
docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost clear-cache
```

`developer_mode 0` is the safe default; flip on temporarily only when debugging.

## 8. Create test users

Both users are sandbox-only and tagged with `sandbox` in their email aliases.

| User | Email | Roles | Allowed actions |
|---|---|---|---|
| Operator | `operator-sandbox@<personal-domain>` | `Accounts Manager`, `System Manager`, `Sales User`, `Purchase User` | Full posting; can create invoices, payments, journal entries |
| Read-only accountant | `accountant-readonly-sandbox@<personal-domain>` | `Accounts User`, `Report Viewer` | Read and export only; **no posting**, no journal-entry create permission |

Verify the read-only role by logging in as the accountant user and attempting to create a Sales Invoice — ERPNext should refuse.

## 9. Disable automation that could leak

Confirm each of the following before any test data is entered:

- **Email Settings → Outgoing Email**: no SMTP credentials configured. No domain.
- **Scheduler Settings → Pause Scheduler**: ON for v1. (Re-enable per phase when Phase C tests need scheduler events; document each toggle in `JOURNAL.md`.)
- **Notification Settings → Default Notifications**: all disabled.
- **Webhooks → Webhooks list**: empty.
- **Integrations → Connected Apps**: empty.
- **Print Settings → PDF generator**: `wkhtmltopdf` (sandbox default; never an external SaaS).
- **System Settings → Country**: `Mauritius` (matches the wizard).

If anything in the above list is non-empty, **stop**, document the state in `JOURNAL.md`, and ask Anton before proceeding.

## 10. Operator UI access (recommended: SSH tunnel)

The sandbox ERPNext UI listens on `localhost:8080` on the chosen host. The safe default is to access it through an SSH tunnel from the operator's laptop:

```bash
# On Anton's laptop
ssh -L 8080:localhost:8080 anton@<host-ip>
# Then in the laptop's browser:
#   http://localhost:8080
```

This requires:

- **No firewall change** on the host.
- **No DNS record.**
- **No public exposure** of the ERPNext UI.
- The UI is reachable only while the SSH session is open.

Alternative (operator-only, requires firewall change): expose `:8080` directly. **Not recommended for v1.** If chosen, document the firewall rule in `JOURNAL.md` and pair it with a strong ERPNext admin password and ideally a reverse proxy with HTTP basic auth.

## 11. Chart of Accounts overlay

Once the wizard completes with a `Standard with Numbers` CoA, overlay the CorpFlowAI sandbox CoA from `ERPNEXT_SANDBOX_PLAN_V1.md` §2:

- The CoA seed file (machine-readable form) ships in Phase A2 at `data/erpnext-sandbox/chart-of-accounts/coa-seed.json` (not in this Phase A1 PR; deferred so the JSON shape matches what the actual sandbox import format expects).
- For Phase A1, the operator can hand-create the structure from `ERPNEXT_SANDBOX_PLAN_V1.md` §2 (Assets / Liabilities / Equity / Income / Expenses) in the UI.
- VAT Output Holding + Input VAT accounts are **created but inactive** per plan §9.

After overlay, verify:

```bash
docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost console <<'PY'
# Sanity check inside the ERPNext shell
import frappe
print(frappe.db.count("Account", filters={"company": "CorpFlowAI Sandbox"}))
PY
```

Record the count and the company name in `JOURNAL.md`.

## 12. Backup + restore verification

```bash
# Backup the sandbox site
docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost backup --with-files

# Find the backup file location
docker compose -p erpnext-sandbox exec backend ls -la sites/corpflowai-sandbox.localhost/private/backups/
```

Restore the backup into a second site to prove the backup is usable:

```bash
docker compose -p erpnext-sandbox exec backend bench new-site corpflowai-sandbox-restore.localhost \
  --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --no-mariadb-socket

docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox-restore.localhost \
  --force restore sites/corpflowai-sandbox.localhost/private/backups/<TIMESTAMP>-database.sql.gz
```

Verify the restored site:

- Company name = `CorpFlowAI Sandbox`.
- Default currency = `MUR`.
- CoA structure matches the source site.
- Test users carried over.

Record the backup file name + restore success in `JOURNAL.md`. The restore site can be dropped afterwards with `bench drop-site corpflowai-sandbox-restore.localhost`.

## 13. Phase B exit criteria

Phase B closes when **all** of the following are true and posted to bridge issue #249:

- §1 pre-flight passed.
- §2 Docker + Compose plugin installed; versions recorded.
- §3 `frappe_docker` cloned at a pinned tag; commit SHA recorded.
- §4 `.env` configured; `~/.erpnext-sandbox-credentials` exists with `chmod 600`.
- §5 stack up; all containers `Up` or `Up (healthy)`.
- §6 sandbox site created; ERPNext app installed; HTTP 200/302 on `localhost:8080`.
- §7 setup wizard completed; company / currency / country confirmed via operator login.
- §8 both test users created; read-only accountant cannot post (operator confirms via login).
- §9 automation surfaces empty / paused / no SMTP / no webhooks.
- §10 operator confirms UI reachable via SSH tunnel.
- §11 CoA matches `ERPNEXT_SANDBOX_PLAN_V1.md` §2; account count recorded.
- §12 backup taken; restore verified into a second site.
- `JOURNAL.md` carries one row per Phase B section above, naming the install date, ERPNext version, Frappe Docker tag, host, account count, and backup file name.

Until Phase B closes, Phase C (test plan §3–§7 of the plan) does not begin.

## 14. Hard limits (carried verbatim from `ERPNEXT_SANDBOX_PLAN_V1.md` §0)

- **Sandbox only.** No real client data. No real CorpFlowAI invoices. No real Mauritius bank credentials.
- **No API keys, no payment-gateway secrets, no bank credentials**, no production tenant IDs.
- **No payment automation.** PayPal and Wise are tested as manual / unverified flows.
- **No runtime CorpFlowAI changes.** This sandbox does not touch `lib/`, `api/`, `pages/`, `prisma/`, `scripts/`, env vars, secrets, DNS, DB, `tenant_id`, analytics, Plausible, Search Console, Telegram, Vercel config, GitHub settings, or deployment settings.
- **No production-grade VAT configuration** in the sandbox (plan §9). Active VAT is deferred until turnover threshold or accountant review.

## 15. Tear-down

```bash
cd ~/erpnext-sandbox/frappe_docker
docker compose -p erpnext-sandbox down -v
cd ~
rm -rf ~/erpnext-sandbox
rm -f ~/.erpnext-sandbox-credentials

# Reclaim disk
docker system prune -a -f
docker volume prune -f
```

Verify:

- `docker ps -a | grep erpnext-sandbox` returns nothing.
- `docker volume ls | grep erpnext-sandbox` returns nothing.
- `df -h /` shows disk reclaimed.
- `JOURNAL.md` carries a tear-down row with the date and reason.

## 16. Cross-references

- Plan: `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md`.
- Phase C testing checklist (added in Phase A2): `docs/runbooks/ERPNEXT_SANDBOX_TESTING.md`.
- Decisions log: `docs/decisions/JOURNAL.md` (host decision `JE-2026-05-29-1`, capacity finding `JE-2026-05-29-2`, future path-choice row).
- Bridge coordination: `docs/operations/OPERATOR_BRIDGE_V1.md` + issue #249.
- Operator-only actions reference: `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.
- Forbidden surfaces: `docs/operations/OPERATOR_BRIDGE_V1.md` §6.
- Brand and CTA wording (for any invoice copy that might be shown to a customer): `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § AI Lead Rescue doctrine.

## 17. Honest limits of this runbook

- **Cursor has not executed any of §1–§15 yet.** The exact ERPNext / Frappe Docker version pins are placeholders to be set at install time and recorded in `JOURNAL.md`.
- **Frappe Docker's compose overlay names evolve** between releases; if upstream renames `compose.mariadb.yaml` or `compose.redis.yaml`, §5 needs adjustment at install time. Cursor will verify the overlay file list before running the up command.
- **§11 CoA overlay** is documented from ERPNext's published import format; the exact JSON shape is confirmed against a running sandbox before being committed to the repo (Phase A2 deliverable).
- **§12 restore command** is documented from `bench` published help; the exact file name pattern is observed at first run and recorded.
- **`corpflow-exec-01` is currently below capacity for ERPNext.** Phase B does not begin until §0.1 is cleared. Running §1–§15 against a 1.9 GB host will OOM and the resulting evidence will be unreliable — this runbook would have to be re-run from §15 (tear-down) after a path-A/B/C resolution.

# ERPNext production-shell setup recipe (v1)

**Status:** v1 — 2026-06-04 — **operator-paste recipe, NOT yet executed.** Designed for one controlled SSH session on `corpflow-exec-01-u69678` by Anton, with command output shared back to Cursor for evidence capture.
**Authorisation:** `JE-2026-06-04-1` (production-shell narrowed-scope authorisation; production *shell* only, NOT accounting go-live).
**Execution boundary:** `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 collaboration pattern (Cursor authors at L1; Anton pastes at L3; Anton shares output back; Cursor captures evidence at L1).
**Anchor sentinel:** `<!-- ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE_V1 -->`

<!-- ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE_V1 -->

**Companion docs (read once before executing):**

- `docs/decisions/JOURNAL.md` `JE-2026-06-04-1` — what is authorised and what is **NOT** authorised (read every line — the 12-point NOT-authorised list is a hard contract).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1/L2/L3 model + HOST_MISMATCH semantics.
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 5 / § 6 / § 7.1 / § 12 / § 15 — the proven sandbox commands this recipe is adapted from.
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — what stays HELD by HB-2 / HB-3 / HB-4 even after this recipe completes.
- `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` — broad scalable CoA categories (Lead Rescue stays an Item, not the CoA backbone).
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1 — W1–W5 verbatim wording for the Pro-forma footer.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — single-offer rule + item naming.
- Bridge handoff: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 0. How to use this recipe (READ BEFORE EXECUTING)

### 0.1 Pre-execution checklist (Anton, at the keyboard)

Before pasting any block:

1. **Confirm the host** — you SSH'd into `corpflow-exec-01-u69678` (`5.78.213.185`) as user `anton`. Run `hostname` and `whoami` first (§ 1 below).
2. **Confirm PR #298 is merged** — `JE-2026-06-04-1` must exist on `main` before you execute, because every block below honours its 12-point NOT-authorised list. Verify with `cd ~/corpflow-ai-command-center && git pull && grep -c 'JE-2026-06-04-1' docs/decisions/JOURNAL.md` → expect ≥ 1.
3. **Confirm PR #299 is merged (if you want the boundary runbook live)** — not strictly required for this recipe to run, but the boundary runbook is the canonical doc this recipe inherits its execution model from. Recommended order: PR #298 → PR #299 → PR-B (this recipe) → execute.
4. **Confirm sandbox is healthy** (§ 2). If sandbox is broken, fix it first or take a backup before adding a production shell to the same box.
5. **Have an SSH session you can keep open for ~30–45 min** — this recipe is meant to run end-to-end. Pausing partway is safe but the wizard-bypass step (§ 5) is easier in one shot.

### 0.2 What this recipe does NOT do (the 12-point hard contract from `JE-2026-06-04-1`)

This recipe builds **only** an empty production shell for visual review. It does **NOT**:

1. Activate ERPNext accounting on production.
2. Issue any pro-forma / quotation / invoice to a real client.
3. Submit any Sales Invoice (no GL posting on production).
4. Activate VAT or use *"Tax invoice"* / *"VAT invoice"* wording anywhere.
5. Enter any real bank account number / SWIFT / BIC / IBAN / routing / sort-code / card / payment credentials / payment-gateway API keys / client secrets.
6. Configure DNS, TLS, SMTP, reverse proxy, or any public exposure of the production site.
7. Change the CorpFlowAI app runtime, Vercel project settings, GitHub workflows or settings, Postgres / Neon / Prisma schema, n8n, Plausible, Search Console, Telegram, or any client-facing surface.
8. Invent new env var names.
9. Print passwords / secrets / DB strings / API tokens / OAuth refresh tokens in chat or logs.
10. Promote the sandbox database to production (parallel install only).
11. Import sandbox transactional data into production.
12. Delete the sandbox by default.

**If at any point a command in this recipe appears to violate any of points 1–12, STOP and post to bridge #249.** The recipe was authored against the JE-2026-06-04-1 contract; any deviation is a recipe bug, not an operator decision to make at the keyboard.

### 0.3 What you (Anton) share back with Cursor at L1

After each `§` section, paste the **command output** (not your screen state) into the Cursor chat so Cursor can capture evidence into `JE-2026-06-04-3` (the closure JE row) and bridge #249 STATUS. **Never paste:**

- The contents of `~/.erpnext-production-credentials`
- Plain-text passwords
- DB connection strings
- Site config JSON containing `db_password`
- Anything that came from a `cat ~/.*-credentials` or similar

**Always paste:**

- `hostname`, `whoami`, `pwd`, `df -h`, `free -h`, `docker ps` outputs
- Site config field NAMES (without values) — e.g., output of `cat sites/.../site_config.json | jq 'keys'`
- Database row counts, container health rows, file paths, file sizes
- ERPNext UI screenshots with no admin password visible

### 0.4 The five secrets-handling rules

1. **All secrets are generated on the host**, never typed by Cursor.
2. **All secrets are stored at `~/.erpnext-production-credentials`** with `chmod 600`.
3. **Cursor reports the file path**, never the contents (e.g., "credentials file grew 0 → 654 bytes" — not "DB_PASSWORD=xyz").
4. **Cursor never reads** `~/.erpnext-production-credentials`. The file is for Anton's eyes only.
5. **If a secret leaks** into chat or a log line, rotate immediately and document in `docs/runbooks/SECURITY_OR_INCIDENT.md`.

---

## 1. Pre-flight

**Goal:** Confirm you are on the right host, sandbox is intact, and disk + memory budget can absorb a second ERPNext stack.

Paste this block in one go:

```bash
echo '--- HOST IDENTITY ---'
hostname
whoami
pwd

echo '--- DISK + MEMORY ---'
df -h /
free -h
nproc

echo '--- DOCKER STATE ---'
docker --version
docker compose version
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}'
docker compose ls

echo '--- EXISTING ERPNEXT STATE ---'
ls -lah ~/erpnext-sandbox/frappe_docker/.env 2>/dev/null || echo '(no sandbox .env)'
ls -lah ~/.erpnext-sandbox-credentials 2>/dev/null || echo '(no sandbox credentials file)'
ls -lah ~/.erpnext-production-credentials 2>/dev/null || echo '(no production credentials file — expected at first run)'
ls -lah ~/erpnext-production 2>/dev/null || echo '(no production directory — expected at first run)'

echo '--- PORT CONFLICTS ---'
ss -tlnp 2>/dev/null | grep -E ':(8080|8081|11000|13000)\s' || echo '(no conflict on candidate production-shell ports)'
```

**HOST_MISMATCH check:** `hostname` must contain `corpflow-exec-01` (today: `corpflow-exec-01-u69678` per `JE-2026-05-31-2`). If `hostname` returns anything else — your laptop, a different VM — **STOP**, do not paste any further block, post `HOST_MISMATCH` to bridge #249, and exit the SSH session.

**Capacity check:** `free -h` total must be ≥ 4 GiB available (today: 6.5 GiB available per `JE-2026-05-31-2`); `df -h /` must show ≥ 20 GB free. If either fails, **STOP** and post to bridge #249 — adding a second ERPNext stack to a tight box will OOM under load.

**Sandbox state check:** `docker ps` must show the sandbox containers running (project `erpnext-sandbox`). If sandbox is down, fix it first (sandbox preservation rule from `JE-2026-06-04-1`). If sandbox containers are not present at all, double-check the host — you may have SSH'd to the wrong box.

**Expected output to share back with Cursor at L1:**

- `hostname`, `whoami`, `pwd` lines (no secrets).
- The 3-line `df -h /` + `free -h` summary.
- `docker ps` table (container names + statuses; no env vars).
- The four `ls -lah` lines (file paths + sizes; no contents).
- The port-conflicts line.

---

## 2. Sandbox preservation gate

**Goal:** Confirm the sandbox is preserved as `JE-2026-06-04-1`'s sandbox-preservation rule requires. Take a fresh backup so the box has a known-good fallback before we add a second stack.

```bash
echo '--- SANDBOX HEALTH ---'
docker compose -p erpnext-sandbox ps --format 'table {{.Service}}\t{{.Status}}\t{{.Health}}'

echo '--- FRESH SANDBOX BACKUP (Phase B-a preservation gate) ---'
docker compose -p erpnext-sandbox exec backend bench --site corpflowai-sandbox.localhost backup --with-files

echo '--- BACKUP FILES (look for the new timestamp at the bottom) ---'
docker compose -p erpnext-sandbox exec backend ls -lt sites/corpflowai-sandbox.localhost/private/backups/ | head -10

echo '--- BACKUP FILE SIZES + SHA-256 (for the four newest files) ---'
docker compose -p erpnext-sandbox exec backend bash -c '
  cd sites/corpflowai-sandbox.localhost/private/backups
  for f in $(ls -t | head -4); do
    sha256sum "$f"
  done
'
```

**Expected behaviour:** every sandbox row in `docker compose -p erpnext-sandbox ps` shows `Up (healthy)` or `Up`. The `bench backup --with-files` produces 4 files: `<TIMESTAMP>-database.sql.gz`, `<TIMESTAMP>-site_config_backup.json`, `<TIMESTAMP>-files.tar`, `<TIMESTAMP>-private-files.tar`.

**Stop conditions (do NOT proceed if any are true):**

- Any sandbox container is not `Up`. → Fix sandbox first or accept the risk that adding a second stack may worsen the situation.
- `bench backup` fails. → Sandbox is in an inconsistent state; do not stack on top.
- Disk is < 20 GB free *after* the backup. → Stop and reclaim space (`docker system prune -a -f` would also delete sandbox images — **don't run it**; instead, prune backup files older than 30 days).

**Expected output to share back with Cursor at L1:** the four SHA-256 hashes + file names of the new backup files. Cursor records these in `JE-2026-06-04-3` as the sandbox-preservation evidence (per `JE-2026-06-04-1` sandbox-preservation rule condition i).

---

## 3. Create the production-shell directory + frappe_docker clone

**Goal:** Stand up an independent `frappe_docker` checkout for the production shell at the same pinned SHA as the sandbox. Sandbox files at `~/erpnext-sandbox/` stay untouched.

```bash
echo '--- CREATE PRODUCTION DIRECTORY ---'
mkdir -p ~/erpnext-production
cd ~/erpnext-production

echo '--- CLONE frappe_docker (independent of sandbox checkout) ---'
test -d frappe_docker || git clone https://github.com/frappe/frappe_docker.git
cd frappe_docker

echo '--- PIN TO THE SAME SHA AS SANDBOX (JE-2026-05-31-2 / JE-2026-06-01-1) ---'
git fetch --tags
git fetch origin
git checkout 6526ab8cd4d7c6969b9b44f95558590c89ab4347
git --no-pager log -1 --format='%H %s%n%ci'

echo '--- VERIFY OVERLAY FILES EXIST AT THIS PIN ---'
ls -la compose.yaml overrides/compose.mariadb.yaml overrides/compose.redis.yaml overrides/compose.noproxy.yaml
```

**Expected output:** `git log -1` returns SHA `6526ab8c…` with the corresponding commit message. All four overlay files exist.

**If `git checkout 6526ab8c…` fails** (the SHA was force-pushed or removed upstream — unlikely for Frappe), pause and post to bridge #249. Cursor will pick a new pinned SHA and update this recipe before you continue.

**Expected output to share back:** the `git log -1` SHA line + the `ls -la` output for the four overlay files.

---

## 4. Configure the production `.env` overlay

**Goal:** Set the production-shell `.env` with placeholders that point to the new site name and new database, using freshly generated secrets stored on the host only.

### 4.1 Generate the production credentials file (Anton, at the keyboard)

```bash
ERPNEXT_CRED_FILE="$HOME/.erpnext-production-credentials"
umask 077

if [ -f "$ERPNEXT_CRED_FILE" ]; then
  echo "ABORT: $ERPNEXT_CRED_FILE already exists. If you intend to re-run, move it aside first:"
  echo "  mv \"$ERPNEXT_CRED_FILE\" \"$ERPNEXT_CRED_FILE.bak-\$(date +%Y%m%d-%H%M%S)\""
  echo "  chmod 600 \"$ERPNEXT_CRED_FILE.bak-*\""
else
  {
    echo "# Generated $(date -Iseconds) by Anton on $(hostname)"
    echo "# Production-shell only; never reuse outside this ERPNext production shell."
    echo "MARIADB_ROOT_PASSWORD=$(openssl rand -base64 32)"
    echo "DB_PASSWORD=$(openssl rand -base64 32)"
    echo "ADMIN_PASSWORD=$(openssl rand -base64 32)"
  } > "$ERPNEXT_CRED_FILE"
  chmod 600 "$ERPNEXT_CRED_FILE"
  echo "Created $ERPNEXT_CRED_FILE ($(stat -c%s "$ERPNEXT_CRED_FILE") bytes)"
fi
```

**Expected output:** `Created /home/anton/.erpnext-production-credentials (XXX bytes)` where `XXX` is somewhere around 240–280 bytes. The literal content of the file is never displayed.

**Expected output to share back:** the single confirmation line (`Created … (XXX bytes)`). Cursor records the file path + size, never the contents.

### 4.2 Write the production `.env`

```bash
cd ~/erpnext-production/frappe_docker
cp example.env .env

# Apply production-shell values. Each replacement is idempotent (sed -i with anchored patterns).
sed -i 's|^ERPNEXT_VERSION=.*|ERPNEXT_VERSION=v15.109.1|' .env
sed -i 's|^FRAPPE_SITE_NAME_HEADER=.*|FRAPPE_SITE_NAME_HEADER=corpflowai-production.localhost|' .env
sed -i 's|^SITES=.*|SITES=corpflowai-production.localhost|' .env

# DB_PASSWORD + MARIADB_ROOT_PASSWORD live in the env file as well so docker compose can read them at boot.
# We source them from the credentials file so they are written ONCE and stay consistent with bench config.
source ~/.erpnext-production-credentials
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
sed -i "s|^MARIADB_ROOT_PASSWORD=.*|MARIADB_ROOT_PASSWORD=${MARIADB_ROOT_PASSWORD}|" .env

# Clear any mail values from example.env — production shell has no SMTP per JE-2026-06-04-1 § (6).
sed -i 's|^MAIL_PASSWORD=.*|MAIL_PASSWORD=|' .env
sed -i 's|^MAIL_USER=.*|MAIL_USER=|' .env
sed -i 's|^MAIL_PORT=.*|MAIL_PORT=|' .env
sed -i 's|^MAIL_SERVER=.*|MAIL_SERVER=|' .env

chmod 600 .env

# Verify the .env shape WITHOUT printing secret values:
echo '--- .env KEYS PRESENT (values masked) ---'
awk -F= '/^[A-Z_][A-Z0-9_]*=/ {
  k = $1; v_present = (length($2) > 0) ? "set" : "empty";
  print k "=" v_present
}' .env | sort -u
```

**Expected output:** a sorted list of key names + `set`/`empty` markers. No password values printed. Critical keys: `DB_PASSWORD=set`, `MARIADB_ROOT_PASSWORD=set`, `ERPNEXT_VERSION=set`, `FRAPPE_SITE_NAME_HEADER=set`, `SITES=set`, `MAIL_PASSWORD=empty`, `MAIL_SERVER=empty`.

**Expected output to share back:** the masked key list. Cursor records that no `MAIL_*` value is set (honours `JE-2026-06-04-1` § 6 no-SMTP rule).

### 4.3 What does NOT go in production `.env` (forbidden by `JE-2026-06-04-1`)

- No real Mauritius bank account number / SWIFT / BIC / IBAN / routing / sort-code.
- No PayPal / Stripe / Wise / SBM API key.
- No DNS hostname (the site is `corpflowai-production.localhost` — loopback-only).
- No TLS cert / private key.
- No SMTP credentials (no mail sending from production shell).
- No CorpFlowAI Postgres / Neon URL.
- No Telegram bot token.
- No Vercel / GitHub tokens.

If any value above accidentally lands in `.env`, stop and rotate the leaked credential before continuing.

---

## 5. Bring up the production stack

**Goal:** Start the production-shell containers under Docker project `erpnext-production`, isolated from sandbox (which uses `-p erpnext-sandbox`).

```bash
cd ~/erpnext-production/frappe_docker

echo '--- CHECK FOR PORT CONFLICT (production shell wants its OWN port) ---'
ss -tlnp 2>/dev/null | grep -E ':(8081|13001)\s' || echo '(no port conflict on 8081 / 13001 — production stack will bind to these)'

echo '--- BRING UP PRODUCTION STACK (project name erpnext-production) ---'
# Bind production frontend to host port 8081 (sandbox already owns 8080).
# This requires the noproxy overlay to map 8081:8080 in compose:
# we add a small inline override file instead of editing the upstream overlay.
cat > overrides/compose.cf-production-port.yaml <<'YML'
services:
  frontend:
    ports:
      - "127.0.0.1:8081:8080"
YML

docker compose \
  -f compose.yaml \
  -f overrides/compose.mariadb.yaml \
  -f overrides/compose.redis.yaml \
  -f overrides/compose.noproxy.yaml \
  -f overrides/compose.cf-production-port.yaml \
  -p erpnext-production \
  up -d

echo '--- WAIT FOR HEALTH (first pull may take 5–10 min if images not cached) ---'
sleep 30
docker compose -p erpnext-production ps --format 'table {{.Service}}\t{{.Status}}\t{{.Health}}'

echo '--- VERIFY BOTH PROJECTS ARE RUNNING (sandbox preserved) ---'
docker compose ls
```

**Expected behaviour:** `docker compose ls` shows two projects: `erpnext-sandbox` (preserved) and `erpnext-production` (new). Every row in `docker compose -p erpnext-production ps` shows `Up` or `Up (healthy)` after a few minutes. The sandbox port (`8080`) and the production port (`8081`) are bound on `127.0.0.1` only (loopback; no external exposure).

**Stop conditions:**

- Any production container is `Restarting` or `Exited` after 5 minutes → run `docker compose -p erpnext-production logs --tail=100 <service>` and share with Cursor.
- Sandbox containers go unhealthy (memory pressure from the second stack) → consider stopping the production stack (`docker compose -p erpnext-production stop`) and reassessing capacity before proceeding.
- `docker compose ls` only shows one project → the production stack failed to start; check the overlay file paths.

**Expected output to share back:** `docker compose ls` (2 projects), `docker compose -p erpnext-production ps` (all healthy), `docker compose -p erpnext-sandbox ps` (still healthy).

---

## 6. Create the production Frappe site + install ERPNext

**Goal:** Create `corpflowai-production.localhost` as a fresh Frappe site, install ERPNext on it, and confirm HTTP reachability on loopback.

```bash
cd ~/erpnext-production/frappe_docker
source ~/.erpnext-production-credentials

echo '--- CREATE FRESH PRODUCTION SITE ---'
docker compose -p erpnext-production exec backend bench new-site corpflowai-production.localhost \
  --mariadb-root-password "$MARIADB_ROOT_PASSWORD" \
  --admin-password "$ADMIN_PASSWORD" \
  --mariadb-user-host-login-scope='%'

echo '--- INSTALL ERPNEXT APP ON THE PRODUCTION SITE ---'
docker compose -p erpnext-production exec backend bench --site corpflowai-production.localhost install-app erpnext

echo '--- CONFIRM SITE REACHABLE ON LOOPBACK (expect HTTP/1.1 200 or 302) ---'
curl -sI http://localhost:8081 -H 'Host: corpflowai-production.localhost' | head -5

echo '--- LIST INSTALLED APPS ON THE PRODUCTION SITE ---'
docker compose -p erpnext-production exec backend bench --site corpflowai-production.localhost list-apps
```

**Expected output:** `bench new-site` completes without error. `bench install-app erpnext` takes a few minutes and finishes with `Installing erpnext...` followed by `Installed`. `curl -sI` returns `HTTP/1.1 200 OK` or `HTTP/1.1 302 Found` (302 is the redirect to the setup wizard, which we'll bypass in § 7). `list-apps` returns at least `frappe` and `erpnext`.

**Note on `--no-mariadb-socket` vs `--mariadb-user-host-login-scope='%'`:** the sandbox install used `--no-mariadb-socket` (which is now deprecated in MariaDB 11.x). This recipe uses the modern form `--mariadb-user-host-login-scope='%'` per the sandbox runbook § 6 deprecation note. Either form works as of 2026-05; the modern form is preferred for the production shell.

**Stop conditions:**

- `bench new-site` fails with `mysql.connector.errors.OperationalError` → MariaDB container is not ready yet; wait 60 s and re-run. The site name is idempotent only if the previous attempt completed fully; partial failures may require `bench drop-site corpflowai-production.localhost --root-password "$MARIADB_ROOT_PASSWORD" --no-backup --force` before retry.
- `install-app erpnext` fails with a Python traceback → share the full traceback with Cursor (NOT containing any DB password values).
- `curl -sI` returns 5xx → the backend container is not ready; check `docker compose -p erpnext-production logs --tail=50 backend`.

**Expected output to share back:** the `bench new-site` final line, `bench install-app erpnext` final line, `curl -sI` first 5 lines, `bench list-apps` output.

---

## 7. Server-side wizard bypass (Path B — the proven Phase B-a pattern)

**Goal:** Complete ERPNext setup without using the UI wizard (which failed client-side during sandbox Phase B-a). Use the `setup_complete` Python API directly inside the backend container, with the three operational quirks from `JE-2026-06-01-1` § 7.1.

**Three quirks to know before pasting (same as sandbox runbook § 7.1):**

1. `frappe` is in bench's venv, not the system Python. Use `/home/frappe/frappe-bench/env/bin/python` explicitly.
2. `frappe.init(site=...)` defaults `sites_path='.'`. Pass the absolute `sites_path` so the site config resolves regardless of cwd: `frappe.init(site=SITE, sites_path='/home/frappe/frappe-bench/sites')`.
3. Frappe's logger uses a relative path that assumes cwd = `<bench>/sites/`. From anywhere else, `frappe.connect()` fails with `FileNotFoundError`. Fix: `os.chdir('/home/frappe/frappe-bench/sites')` before any `frappe.connect()` call.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)  # quirk 3
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)  # quirk 2
frappe.connect()
frappe.set_user('Administrator')

# Idempotency: if setup is already complete, do not re-run.
already = frappe.db.get_single_value('System Settings', 'setup_complete')
print('SETUP_COMPLETE_BEFORE:', already)

if not already:
    from frappe.desk.page.setup_wizard.setup_wizard import setup_complete
    result = setup_complete({
        'language':         'English',
        'country':          'Mauritius',
        'timezone':         'Indian/Mauritius',
        'currency':         'USD',
        'first_name':       'Production',
        'last_name':        'Admin',
        'full_name':        'Production Admin',
        'email':            'Administrator',
        'company_name':     'CorpFlowAI Ltd',
        'company_abbr':     'CFL',
        'company_tagline':  'AI Lead Rescue & Productized Services',
        'chart_of_accounts': 'Standard',
        'fy_start_date':    '2026-01-01',
        'fy_end_date':      '2026-12-31',
        'domain':           'Services',
        'domains':          ['Services'],
    })
    frappe.db.commit()
    print('SETUP_COMPLETE_RESULT:', result)
else:
    print('SETUP_COMPLETE_RESULT: already_complete (skipped)')

# Sanity checks (read-only, no secrets):
co = frappe.db.get_value('Company', 'CorpFlowAI Ltd', ['name', 'country', 'default_currency', 'abbr'], as_dict=True)
print('COMPANY_ROW:', co)
print('ACCOUNT_COUNT:', frappe.db.count('Account', filters={'company': 'CorpFlowAI Ltd'}))
print('USER_COUNT:', frappe.db.count('User', filters={'enabled': 1}))
PY
```

**Expected output:** `SETUP_COMPLETE_BEFORE: 0` on first run, `SETUP_COMPLETE_RESULT: {'status': 'ok'}`, `COMPANY_ROW: {'name': 'CorpFlowAI Ltd', 'country': 'Mauritius', 'default_currency': 'USD', 'abbr': 'CFL'}`, `ACCOUNT_COUNT: 82` (Standard CoA), `USER_COUNT: 1` (Administrator).

**Re-run safety:** if `setup_complete` already ran successfully, the script prints `SETUP_COMPLETE_BEFORE: 1` and `SETUP_COMPLETE_RESULT: already_complete (skipped)`. The sanity checks still run. Safe to re-execute.

**Stop conditions:**

- `FileNotFoundError: '/home/frappe/logs/database.log'` → quirk 3 was bypassed; check that `os.chdir(SITES_PATH)` actually ran (no typo).
- `ImportError: No module named 'frappe'` → quirk 1 was bypassed; verify the `--workdir` and the `/home/frappe/frappe-bench/env/bin/python` path.
- `setup_complete` returns anything other than `{'status': 'ok'}` → share the full result dict with Cursor. The result usually contains a `messages` key naming the specific failure.

**Expected output to share back:** the seven lines starting with `SETUP_COMPLETE_BEFORE:`, `SETUP_COMPLETE_RESULT:`, `COMPANY_ROW:`, `ACCOUNT_COUNT:`, `USER_COUNT:`. Cursor records the company-row dict (which has no secrets) into `JE-2026-06-04-3`.

---

## 8. Company doctype — extend with address + identity fields (JE-2026-06-04-1 mandates)

**Goal:** Fill the Company doctype with the public CorpFlowAI identity fields required by `JE-2026-06-04-1` (Mauritius, BRN, registered office, support email). These are the same values that appear in `pages/contact.js` and `PAY_SBM_2_PAGE_COMPLIANCE_COPY.md` — no new public information is created here.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

company_name = 'CorpFlowAI Ltd'
co = frappe.get_doc('Company', company_name)

# Public identity fields per JE-2026-06-04-1.
co.tax_id = 'C25228280'                # BRN — public per PAY-SBM-2
co.email  = 'support@corpflowai.com'
co.website = 'https://corpflowai.com'
# Mauritius identifiers (already set by wizard but reaffirmed):
co.country = 'Mauritius'
co.default_currency = 'USD'

# Save without triggering accounting-go-live mutations.
co.flags.ignore_validate_update_after_submit = True
co.save(ignore_permissions=True)

# Registered office Address doctype (NOT a Customer / Supplier address).
addr_title = 'CorpFlowAI Ltd - Registered Office'
if frappe.db.exists('Address', addr_title):
    addr = frappe.get_doc('Address', addr_title)
    print('ADDRESS_EXISTS:', addr_title)
else:
    addr = frappe.get_doc({
        'doctype':      'Address',
        'address_title': 'CorpFlowAI Ltd',
        'address_type': 'Other',
        'address_line1': 'Dextra Lane Lot No. 3 Phase 1',
        'address_line2': 'Trou Aux Biches',
        'city':         'Trou Aux Biches',
        'country':      'Mauritius',
        'is_primary_address': 1,
        'is_shipping_address': 0,
        'links': [{
            'link_doctype': 'Company',
            'link_name':    company_name,
        }],
    })
    addr.insert(ignore_permissions=True)
    print('ADDRESS_CREATED:', addr.name)

frappe.db.commit()

# Verification print:
co2 = frappe.db.get_value('Company', company_name,
    ['name', 'country', 'default_currency', 'tax_id', 'email', 'website'], as_dict=True)
print('COMPANY_VERIFY:', co2)
print('ADDRESS_LINKED:', frappe.db.count('Dynamic Link',
    filters={'link_doctype': 'Company', 'link_name': company_name}))
PY
```

**Expected output:** `COMPANY_VERIFY` dict with `tax_id='C25228280'`, `email='support@corpflowai.com'`, `website='https://corpflowai.com'`. `ADDRESS_CREATED:` or `ADDRESS_EXISTS:` line. `ADDRESS_LINKED: ≥ 1`.

**Re-run safety:** the Address doctype check is idempotent. The Company doctype save is idempotent (no double-counting, no GL entries posted).

**What this section explicitly does NOT do:**

- Does NOT add a real bank account on the Company doctype (forbidden by `JE-2026-06-04-1` § (5)).
- Does NOT activate VAT (forbidden by `JE-2026-06-04-1` § (4)).
- Does NOT submit anything (no `submit()` call, no GL entries created).

**Expected output to share back:** the `COMPANY_VERIFY` dict + `ADDRESS_CREATED` / `ADDRESS_EXISTS` + `ADDRESS_LINKED` count.

---

## 9. Letter Head + CorpFlowAI branding

**Goal:** Create a Letter Head doctype that prints the public CorpFlowAI identity on every Quotation / Sales Invoice PDF. The Letter Head is purely visual — it does not affect GL posting.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

lh_name = 'CorpFlowAI Ltd - Production Letter Head'

# Letter Head HTML — text-only for v1. Logo is added by Anton via the UI in § 9.1
# below (binary asset upload is operator-owned per JE-2026-06-04-1 § branding).
letter_head_html = """
<div style="font-family: Arial, sans-serif; color: #1a1a1a; padding: 16px 0; border-bottom: 1px solid #c9c9c9;">
  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="vertical-align: top;">
        <div style="font-size: 18px; font-weight: 700; letter-spacing: 0.5px;">CorpFlowAI Ltd</div>
        <div style="font-size: 11px; color: #555; margin-top: 4px;">AI Lead Rescue &amp; Productized Services</div>
      </td>
      <td style="vertical-align: top; text-align: right; font-size: 10px; color: #444; line-height: 1.5;">
        Dextra Lane Lot No. 3 Phase 1<br/>
        Trou Aux Biches, Mauritius<br/>
        BRN C25228280<br/>
        <a href="mailto:support@corpflowai.com" style="color: #1a1a1a; text-decoration: none;">support@corpflowai.com</a>
      </td>
    </tr>
  </table>
</div>
""".strip()

footer_html = """
<div style="font-family: Arial, sans-serif; font-size: 9px; color: #555; padding: 8px 0; border-top: 1px solid #c9c9c9; text-align: center;">
  CorpFlowAI Ltd · Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius · BRN C25228280 · support@corpflowai.com
</div>
""".strip()

if frappe.db.exists('Letter Head', lh_name):
    lh = frappe.get_doc('Letter Head', lh_name)
    print('LETTER_HEAD_EXISTS:', lh_name)
else:
    lh = frappe.get_doc({'doctype': 'Letter Head', 'letter_head_name': lh_name})

lh.content = letter_head_html
lh.footer  = footer_html
lh.is_default = 1
lh.disabled   = 0
lh.source     = 'HTML'
lh.footer_source = 'HTML'
lh.save(ignore_permissions=True)
frappe.db.commit()

# Verify:
v = frappe.db.get_value('Letter Head', lh_name,
    ['name', 'is_default', 'disabled', 'source', 'footer_source'], as_dict=True)
print('LETTER_HEAD_VERIFY:', v)
print('LETTER_HEAD_CONTENT_BYTES:', len(letter_head_html))
print('LETTER_HEAD_FOOTER_BYTES:', len(footer_html))
PY
```

**Expected output:** `LETTER_HEAD_VERIFY` dict with `is_default=1`, `disabled=0`. Content + footer byte counts > 0.

### 9.1 Logo upload (operator UI step, OPTIONAL for v1)

If Anton wants a logo on the Letter Head:

1. Open the production shell UI through the SSH tunnel (§ 14.1 below for tunnel command).
2. Navigate **Settings → Letter Head → `CorpFlowAI Ltd - Production Letter Head`**.
3. Click **Edit** → switch the **Source** dropdown from `HTML` to `Image` if a single-image header is preferred, or paste a logo URL into the HTML content if the logo is hosted externally.
4. Upload the logo from `~/CorpFlowAI/brand/` on Anton's laptop (not from the repo — repo logos may be public-marketing-specific and not the canonical wordmark).
5. Save and refresh the Print Format preview (§ 14).

**Operator note:** logo upload is sandbox-preserving and reversible. If the upload fails or the logo looks wrong, the text-only v1 Letter Head still works for the PDF smoke (§ 14). Defer to a separate small follow-up if needed.

**Expected output to share back:** the `LETTER_HEAD_VERIFY` dict + the two byte-count lines.

---

## 10. Chart of Accounts — broad scalable revenue categories

**Goal:** Add the 7 broad revenue categories from `JE-2026-06-04-1` § (f) on top of the Standard CoA that the wizard installed. **Lead Rescue is an Item (§ 11), NOT a CoA leaf account.** Accountant-blocked items (VAT, MU-specific accounts) are intentionally NOT created here — those wait for HB-2 + HB-3.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

company = 'CorpFlowAI Ltd'
abbr = frappe.db.get_value('Company', company, 'abbr')
print('COMPANY_ABBR:', abbr)

# Locate the Income parent account (Standard CoA names this "Income").
income_parent = frappe.db.get_value('Account',
    {'company': company, 'is_group': 1, 'account_name': 'Income'}, 'name')
if not income_parent:
    # Fallback names some Standard CoA variants use.
    for candidate in ['Direct Income', 'Indirect Income', 'Income']:
        income_parent = frappe.db.get_value('Account',
            {'company': company, 'is_group': 1, 'account_name': candidate}, 'name')
        if income_parent:
            break
print('INCOME_PARENT:', income_parent)
assert income_parent, "Could not locate Income parent group account — Standard CoA may have unfamiliar structure; halt and ask Cursor."

# Broad revenue categories from JE-2026-06-04-1 § (f).
# These are *category-level* per accountant pack discipline; not Lead-Rescue-specific.
broad_revenue_categories = [
    'Productized Service Revenue',
    'Implementation / Setup Revenue',
    'Recurring Subscription / Retainer Revenue',
    'Consulting / Advisory Revenue',
    'Software / Platform Access Revenue',
    'Other Operating Revenue',
    'Foreign Exchange Gain / Loss',
]

created_count = 0
existed_count = 0
for account_name in broad_revenue_categories:
    expected = f'{account_name} - {abbr}'
    if frappe.db.exists('Account', expected):
        existed_count += 1
        continue
    acc = frappe.get_doc({
        'doctype':        'Account',
        'account_name':   account_name,
        'parent_account': income_parent,
        'company':        company,
        'is_group':       0,
        'account_type':   ('Income Account' if 'Foreign Exchange' not in account_name else ''),
        'root_type':      'Income',
        'report_type':    'Profit and Loss',
    })
    acc.insert(ignore_permissions=True)
    created_count += 1

frappe.db.commit()

print('CREATED:', created_count, 'EXISTED:', existed_count, 'TOTAL_REQUESTED:', len(broad_revenue_categories))
print('TOTAL_INCOME_LEAF_ACCOUNTS_NOW:',
    frappe.db.count('Account', filters={'company': company, 'root_type': 'Income', 'is_group': 0}))
print('TOTAL_ACCOUNTS_NOW:', frappe.db.count('Account', filters={'company': company}))
PY
```

**Expected output:** `COMPANY_ABBR: CFL`, `INCOME_PARENT: Income - CFL` (or similar), `CREATED: 7` on first run (`CREATED: 0`, `EXISTED: 7` on re-runs). `TOTAL_ACCOUNTS_NOW: ~89` (82 Standard + 7 new).

**What this section explicitly does NOT do:**

- Does NOT create VAT Output Holding / Input VAT accounts (those are accountant-blocked per `JE-2026-06-04-1` § HB-3 / HB-2; HELD until accountant CoA review).
- Does NOT create a `Lead Rescue Revenue` account or any Lead-Rescue-specific income account (Lead Rescue is an Item per § 11, not a CoA leaf).
- Does NOT create real bank account ledger rows (forbidden by `JE-2026-06-04-1` § (5)).
- Does NOT post any GL entry. Account creation is a doctype write; no Journal Entry / Sales Invoice is submitted.

**Accountant-blocked items NOT created (kept clearly marked pending):**

- VAT Output Holding (HB-3)
- Input VAT recoverable (HB-3)
- MU-specific GL accounts (HB-2)
- Bank account ledger rows (HB-4)
- Real customer / supplier ledger entries (HB-1 expanded scope)

These are recorded in `JE-2026-06-04-3` as still-pending in the operational JOURNAL row.

**Expected output to share back:** `COMPANY_ABBR`, `INCOME_PARENT`, `CREATED`/`EXISTED`/`TOTAL_REQUESTED`, `TOTAL_INCOME_LEAF_ACCOUNTS_NOW`, `TOTAL_ACCOUNTS_NOW`.

---

## 11. Production Item — `LR-SETUP-USD-150`

**Goal:** Create the single production Item per `JE-2026-06-04-1` + `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* single-offer rule. Item code is **`LR-SETUP-USD-150`** (no `SBX-` prefix — that prefix is sandbox-only). Item name is **`AI Lead Rescue Setup (USD 150 launch pilot)`** verbatim.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

company = 'CorpFlowAI Ltd'
abbr = frappe.db.get_value('Company', company, 'abbr')

item_code = 'LR-SETUP-USD-150'
item_name = 'AI Lead Rescue Setup (USD 150 launch pilot)'

# Ensure Item Group "Services" exists (the Standard install creates "All Item Groups" and
# typically a "Services" child group; if not, create it).
if not frappe.db.exists('Item Group', 'Services'):
    parent_grp = 'All Item Groups' if frappe.db.exists('Item Group', 'All Item Groups') else None
    services_grp = frappe.get_doc({
        'doctype': 'Item Group',
        'item_group_name': 'Services',
        'parent_item_group': parent_grp,
        'is_group': 0,
    })
    services_grp.insert(ignore_permissions=True)
    print('ITEM_GROUP_CREATED: Services')
else:
    print('ITEM_GROUP_EXISTS: Services')

income_account = f'Implementation / Setup Revenue - {abbr}'
assert frappe.db.exists('Account', income_account), \
    f'Expected income account "{income_account}" from § 10; halt.'

if frappe.db.exists('Item', item_code):
    item = frappe.get_doc('Item', item_code)
    print('ITEM_EXISTS:', item_code)
else:
    item = frappe.get_doc({
        'doctype':       'Item',
        'item_code':     item_code,
        'item_name':     item_name,
        'description':   item_name,
        'item_group':    'Services',
        'stock_uom':     'Nos',
        'is_stock_item': 0,
        'is_service_item': 1,
        'include_item_in_manufacturing': 0,
    })

# Item defaults (per-company income account; sandbox preservation rule — sandbox is untouched).
item.item_name = item_name
item.description = item_name
existing_defaults = [d for d in (item.item_defaults or []) if d.company == company]
if not existing_defaults:
    item.append('item_defaults', {
        'company':        company,
        'income_account': income_account,
        'default_warehouse': None,
    })
else:
    existing_defaults[0].income_account = income_account

item.save(ignore_permissions=True)

# Item Price (separate doctype). USD 150 standard selling rate.
# Idempotent: only insert if no Item Price exists for this code + USD.
existing_price = frappe.db.get_value('Item Price',
    {'item_code': item_code, 'currency': 'USD', 'selling': 1}, 'name')
if existing_price:
    print('ITEM_PRICE_EXISTS:', existing_price)
else:
    price_list = frappe.db.get_value('Price List',
        {'currency': 'USD', 'selling': 1, 'enabled': 1}, 'name')
    if not price_list:
        # Create one if Standard install didn't ship a USD selling price list.
        pl = frappe.get_doc({
            'doctype': 'Price List',
            'price_list_name': 'Standard Selling USD',
            'currency': 'USD',
            'selling':  1,
            'enabled':  1,
        })
        pl.insert(ignore_permissions=True)
        price_list = pl.name
        print('PRICE_LIST_CREATED:', price_list)
    ip = frappe.get_doc({
        'doctype':    'Item Price',
        'item_code':  item_code,
        'currency':   'USD',
        'price_list': price_list,
        'price_list_rate': 150.00,
        'selling':    1,
    })
    ip.insert(ignore_permissions=True)
    print('ITEM_PRICE_CREATED:', ip.name)

frappe.db.commit()

# Verify:
i = frappe.db.get_value('Item', item_code,
    ['item_code', 'item_name', 'item_group', 'stock_uom', 'is_stock_item', 'is_service_item'], as_dict=True)
print('ITEM_VERIFY:', i)
print('ITEM_DEFAULTS_COUNT:',
    frappe.db.count('Item Default', filters={'parent': item_code, 'company': company}))
ip_check = frappe.db.get_value('Item Price',
    {'item_code': item_code, 'currency': 'USD', 'selling': 1},
    ['price_list', 'price_list_rate'], as_dict=True)
print('ITEM_PRICE_VERIFY:', ip_check)
PY
```

**Expected output:** `ITEM_VERIFY: {'item_code': 'LR-SETUP-USD-150', 'item_name': 'AI Lead Rescue Setup (USD 150 launch pilot)', 'item_group': 'Services', 'stock_uom': 'Nos', 'is_stock_item': 0, 'is_service_item': 1}`. `ITEM_PRICE_VERIFY: {'price_list': '<USD selling list>', 'price_list_rate': 150.0}`. `ITEM_DEFAULTS_COUNT: 1`.

**Re-run safety:** the script checks for existing Item, Item Group, Item Price; safe to re-run.

**What this section explicitly does NOT do:**

- Does NOT create a sandbox-prefixed item (`SBX-LR-SETUP-USD-150` stays in sandbox only).
- Does NOT create a second tier / recurring component (per `JE-2026-05-28-1` single-offer rule).
- Does NOT post any inventory transaction (it's a service item).

**Expected output to share back:** `ITEM_GROUP_EXISTS`/`CREATED`, `ITEM_EXISTS`/`CREATED`, `ITEM_PRICE_EXISTS`/`CREATED`, `ITEM_VERIFY` dict, `ITEM_DEFAULTS_COUNT`, `ITEM_PRICE_VERIFY` dict.

---

## 12. Naming series — Quotation `CFLR-QUO-.YYYY.-.NNN` and Sales Invoice `CFLR-INV-.YYYY.-.NNN`

**Goal:** Set the production naming series. Quotation series uses `CFLR-QUO-`; Sales Invoice series uses `CFLR-INV-`. The `CFLR` prefix marks these as CorpFlowAI Ltd production (vs sandbox `CFS-` or generic `QTN-`).

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

from frappe.custom.doctype.property_setter.property_setter import make_property_setter

def set_naming_series(doctype, options_str, default):
    # autoname Property Setter — adds the new series to the dropdown.
    make_property_setter(doctype, None, 'autoname', 'naming_series:', 'Data', for_doctype=True)
    # Update the options field so the dropdown lists the new series.
    make_property_setter(doctype, 'naming_series', 'options', options_str, 'Text', for_doctype=False)
    # Default series for new documents.
    make_property_setter(doctype, 'naming_series', 'default', default, 'Text', for_doctype=False)

# Quotation
quo_options = '\n'.join([
    'CFLR-QUO-.YYYY.-.NNN',
    'QTN-.YYYY.-.NNN',  # keep ERPNext default as a fallback
])
set_naming_series('Quotation', quo_options, 'CFLR-QUO-.YYYY.-.NNN')

# Sales Invoice
inv_options = '\n'.join([
    'CFLR-INV-.YYYY.-.NNN',
    'SINV-.YYYY.-.NNN',  # ERPNext default fallback
])
set_naming_series('Sales Invoice', inv_options, 'CFLR-INV-.YYYY.-.NNN')

frappe.db.commit()

# Verify:
for dt in ['Quotation', 'Sales Invoice']:
    options = frappe.db.get_value('Property Setter',
        {'doc_type': dt, 'property': 'options', 'field_name': 'naming_series'}, 'value')
    default = frappe.db.get_value('Property Setter',
        {'doc_type': dt, 'property': 'default', 'field_name': 'naming_series'}, 'value')
    print(f'{dt}_OPTIONS:\n{options}')
    print(f'{dt}_DEFAULT:', default)
PY
```

**Expected output:** for both Quotation and Sales Invoice, `OPTIONS` includes both the new `CFLR-…` series and the ERPNext default fallback, and `DEFAULT` is set to the `CFLR-…` series.

**Note:** This is the *draft* naming series. No Quotation / Sales Invoice has been created yet (§ 13 / § 14). The series only takes effect when a document is created.

**Expected output to share back:** the 4 verification lines (2 per doctype: OPTIONS + DEFAULT).

---

## 13. Quotation Print Format — *"Pro-forma invoice"* (titled, NOT a tax invoice)

**Goal:** Create a Custom Print Format for Quotation that renders with the title **"Pro-forma invoice"** and the W1–W5 footer wording verbatim from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1. **No "Tax invoice" or "VAT invoice" wording anywhere.**

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

pf_name = 'CFLR Pro-forma Invoice'

# Forbidden wording check (defensive — if any of these appears anywhere in this script,
# the script aborts before writing).
forbidden = [
    'Tax invoice', 'TAX INVOICE', 'tax invoice',
    'VAT invoice', 'VAT INVOICE', 'vat invoice',
    'Pay now', 'PAY NOW',
    'PayPal accepted', 'Wise accepted',
    'Instant checkout', 'INSTANT CHECKOUT',
    'Visa', 'Mastercard', 'UnionPay', 'JCB', 'Alipay',
    'guaranteed revenue', 'revenue guarantee', 'guaranteed leads',
]

# W1–W5 verbatim per AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md § 1.
W1 = 'Payment instructions are sent separately after intake approval.'
W2 = 'Setup begins after payment confirmation and receipt of required client information.'
W3 = 'Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed.'
W4 = 'No revenue, lead volume, or conversion outcome is guaranteed.'
W5 = 'VAT/tax treatment pending accountant confirmation.'

# Jinja-style HTML for the Print Format. ERPNext renders Quotation print formats via
# print/print.html → wkhtmltopdf. The template uses Jinja conditionals against `doc`.
html = '''
<div style="font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11px;">
  <div style="text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 0.5px; margin: 8px 0 12px 0;">
    Pro-forma invoice
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        <div style="font-size: 11px; font-weight: 700; color: #555;">Buyer</div>
        <div style="margin-top: 2px; font-size: 12px;">{{ doc.customer_name or '' }}</div>
        {% if doc.contact_email %}<div>{{ doc.contact_email }}</div>{% endif %}
        {% if doc.address_display %}<div style="margin-top: 4px; white-space: pre-line;">{{ doc.address_display }}</div>{% endif %}
      </td>
      <td style="vertical-align: top; width: 40%; text-align: right;">
        <div><strong>Pro-forma no.:</strong> {{ doc.name }}</div>
        <div><strong>Issue date:</strong> {{ frappe.utils.format_date(doc.transaction_date) }}</div>
        {% if doc.valid_till %}<div><strong>Valid until:</strong> {{ frappe.utils.format_date(doc.valid_till) }}</div>{% endif %}
        <div><strong>Currency:</strong> {{ doc.currency }}</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; border: 1px solid #c9c9c9; margin-bottom: 14px;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="text-align: left; padding: 6px 8px; border-bottom: 1px solid #c9c9c9;">Item</th>
        <th style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #c9c9c9; width: 70px;">Qty</th>
        <th style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #c9c9c9; width: 100px;">Rate</th>
        <th style="text-align: right; padding: 6px 8px; border-bottom: 1px solid #c9c9c9; width: 110px;">Amount</th>
      </tr>
    </thead>
    <tbody>
    {% for it in doc.items %}
      <tr>
        <td style="padding: 6px 8px; border-top: 1px solid #eee;">
          <div style="font-weight: 600;">{{ it.item_code }}</div>
          <div>{{ it.item_name }}</div>
          {% if it.description and it.description != it.item_name %}<div style="color: #555; font-size: 10px;">{{ it.description }}</div>{% endif %}
        </td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ it.qty }}</td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ frappe.utils.fmt_money(it.rate, currency=doc.currency) }}</td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ frappe.utils.fmt_money(it.amount, currency=doc.currency) }}</td>
      </tr>
    {% endfor %}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding: 6px 8px; text-align: right; font-weight: 700; border-top: 1px solid #c9c9c9;">Total</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700; border-top: 1px solid #c9c9c9;">{{ frappe.utils.fmt_money(doc.grand_total, currency=doc.currency) }}</td>
      </tr>
    </tfoot>
  </table>

  <div style="font-size: 11px; line-height: 1.5; color: #1a1a1a; margin-top: 12px;">
    <div style="margin-bottom: 6px;"><strong>Payment</strong></div>
    <div>__W1__</div>
    <div style="margin-top: 6px;"><strong>Setup</strong></div>
    <div>__W2__</div>
    <div>__W3__</div>
    <div style="margin-top: 6px;"><strong>Trust block</strong></div>
    <div>__W4__</div>
    <div>__W5__</div>
  </div>
</div>
'''

# Defensive: substitute W1-W5 explicitly so they appear verbatim.
html = (html
    .replace('__W1__', W1)
    .replace('__W2__', W2)
    .replace('__W3__', W3)
    .replace('__W4__', W4)
    .replace('__W5__', W5))

# Defensive: forbidden-wording scan of the final HTML (must be zero matches).
violations = [w for w in forbidden if w in html]
assert not violations, f'ABORT: forbidden wording found in Print Format HTML: {violations}'

if frappe.db.exists('Print Format', pf_name):
    pf = frappe.get_doc('Print Format', pf_name)
    print('PRINT_FORMAT_EXISTS:', pf_name)
else:
    pf = frappe.get_doc({'doctype': 'Print Format', 'name': pf_name})
pf.doc_type = 'Quotation'
pf.print_format_type = 'Jinja'
pf.standard = 'No'
pf.html = html
pf.disabled = 0
pf.default_print_language = 'en'
pf.font_size = 10
pf.line_breaks = 0
pf.align_labels_right = 0
pf.show_section_headings = 0
pf.save(ignore_permissions=True)
frappe.db.commit()

print('PRINT_FORMAT_VERIFY:', frappe.db.get_value('Print Format', pf_name,
    ['name', 'doc_type', 'print_format_type', 'standard', 'disabled'], as_dict=True))
print('PRINT_FORMAT_HTML_BYTES:', len(html))
print('PRINT_FORMAT_TITLE_LINE_PRESENT:', 'Pro-forma invoice' in html)
print('W_PRESENT:', {'W1': W1 in html, 'W2': W2 in html, 'W3': W3 in html, 'W4': W4 in html, 'W5': W5 in html})
print('FORBIDDEN_FOUND:', violations)
PY
```

**Expected output:** `PRINT_FORMAT_VERIFY` dict with `doc_type='Quotation'`, `disabled=0`. `PRINT_FORMAT_TITLE_LINE_PRESENT: True`. `W_PRESENT: {'W1': True, 'W2': True, 'W3': True, 'W4': True, 'W5': True}`. `FORBIDDEN_FOUND: []`.

**Stop conditions:** if `FORBIDDEN_FOUND` is non-empty or `W_PRESENT` has any `False`, the assertion will fire and the script will abort. Do not proceed. Share the violation list with Cursor.

**Expected output to share back:** all 5 verification lines (`PRINT_FORMAT_VERIFY`, `PRINT_FORMAT_HTML_BYTES`, `PRINT_FORMAT_TITLE_LINE_PRESENT`, `W_PRESENT`, `FORBIDDEN_FOUND`).

---

## 14. Sales Invoice Print Format DRAFT (NOT a tax invoice; for later use only)

**Goal:** Create a Sales Invoice Print Format draft so the production shell has a placeholder, **but clearly marked DRAFT** and NOT labelled *"Tax invoice"* / *"VAT invoice"* per `JE-2026-06-04-1` § (4). No real Sales Invoice is created in this recipe (forbidden by `JE-2026-06-04-1` § (3)) — this is purely a visual / structural placeholder.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

pf_name = 'CFLR Sales Invoice (Draft)'

# DRAFT placeholder: title says "Sales Invoice (DRAFT — VAT/tax treatment pending accountant confirmation)".
# No "Tax invoice" / "VAT invoice" wording anywhere.
W5 = 'VAT/tax treatment pending accountant confirmation.'
forbidden = [
    'Tax invoice', 'TAX INVOICE', 'tax invoice',
    'VAT invoice', 'VAT INVOICE', 'vat invoice',
    'Pay now', 'PAY NOW', 'PayPal accepted', 'Wise accepted',
]

html = '''
<div style="font-family: Arial, sans-serif; color: #1a1a1a; font-size: 11px;">
  <div style="text-align: center; font-size: 18px; font-weight: 700; margin: 8px 0 4px 0;">
    Sales Invoice (DRAFT)
  </div>
  <div style="text-align: center; font-size: 11px; color: #b9521f; margin-bottom: 12px;">
    Draft placeholder — VAT/tax treatment pending accountant confirmation. Not for client issue.
  </div>

  <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px;">
    <tr>
      <td style="vertical-align: top; width: 60%;">
        <div style="font-size: 11px; font-weight: 700; color: #555;">Buyer</div>
        <div style="margin-top: 2px; font-size: 12px;">{{ doc.customer_name or '' }}</div>
        {% if doc.contact_email %}<div>{{ doc.contact_email }}</div>{% endif %}
        {% if doc.address_display %}<div style="margin-top: 4px; white-space: pre-line;">{{ doc.address_display }}</div>{% endif %}
      </td>
      <td style="vertical-align: top; width: 40%; text-align: right;">
        <div><strong>Document no.:</strong> {{ doc.name }}</div>
        <div><strong>Issue date:</strong> {{ frappe.utils.format_date(doc.posting_date) }}</div>
        <div><strong>Currency:</strong> {{ doc.currency }}</div>
        <div style="margin-top: 4px; color: #b9521f;"><strong>STATUS:</strong> {{ doc.docstatus_label or 'DRAFT' }}</div>
      </td>
    </tr>
  </table>

  <table style="width: 100%; border-collapse: collapse; border: 1px solid #c9c9c9; margin-bottom: 14px;">
    <thead>
      <tr style="background: #f5f5f5;">
        <th style="text-align: left; padding: 6px 8px;">Item</th>
        <th style="text-align: right; padding: 6px 8px; width: 70px;">Qty</th>
        <th style="text-align: right; padding: 6px 8px; width: 100px;">Rate</th>
        <th style="text-align: right; padding: 6px 8px; width: 110px;">Amount</th>
      </tr>
    </thead>
    <tbody>
    {% for it in doc.items %}
      <tr>
        <td style="padding: 6px 8px; border-top: 1px solid #eee;">
          <div style="font-weight: 600;">{{ it.item_code }}</div>
          <div>{{ it.item_name }}</div>
        </td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ it.qty }}</td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ frappe.utils.fmt_money(it.rate, currency=doc.currency) }}</td>
        <td style="padding: 6px 8px; border-top: 1px solid #eee; text-align: right;">{{ frappe.utils.fmt_money(it.amount, currency=doc.currency) }}</td>
      </tr>
    {% endfor %}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="3" style="padding: 6px 8px; text-align: right; font-weight: 700; border-top: 1px solid #c9c9c9;">Total</td>
        <td style="padding: 6px 8px; text-align: right; font-weight: 700; border-top: 1px solid #c9c9c9;">{{ frappe.utils.fmt_money(doc.grand_total, currency=doc.currency) }}</td>
      </tr>
    </tfoot>
  </table>

  <div style="font-size: 11px; color: #1a1a1a; margin-top: 12px; border-top: 1px solid #c9c9c9; padding-top: 8px;">
    <div style="color: #b9521f;"><strong>__W5__</strong></div>
    <div style="margin-top: 6px;">Draft placeholder created during ERPNext production-shell setup. Not for client issue. Activation of this Print Format for real client invoicing is gated on Mauritius-licensed accountant CoA review (HB-2) + VAT decision (HB-3) + bank reconciliation cycle (HB-4) closure plus a separate Phase D authorisation row in JOURNAL.md.</div>
  </div>
</div>
'''.replace('__W5__', W5)

violations = [w for w in forbidden if w in html]
assert not violations, f'ABORT: forbidden wording in Sales Invoice DRAFT HTML: {violations}'

if frappe.db.exists('Print Format', pf_name):
    pf = frappe.get_doc('Print Format', pf_name)
    print('PRINT_FORMAT_EXISTS:', pf_name)
else:
    pf = frappe.get_doc({'doctype': 'Print Format', 'name': pf_name})
pf.doc_type = 'Sales Invoice'
pf.print_format_type = 'Jinja'
pf.standard = 'No'
pf.html = html
pf.disabled = 0   # enabled in dropdown, but explicit DRAFT label keeps it from being mistaken
pf.default_print_language = 'en'
pf.save(ignore_permissions=True)
frappe.db.commit()

print('PRINT_FORMAT_VERIFY:', frappe.db.get_value('Print Format', pf_name,
    ['name', 'doc_type', 'print_format_type', 'disabled'], as_dict=True))
print('DRAFT_LABEL_PRESENT:', 'Sales Invoice (DRAFT)' in html)
print('W5_PRESENT:', W5 in html)
print('FORBIDDEN_FOUND:', violations)
PY
```

**Expected output:** `PRINT_FORMAT_VERIFY` dict with `doc_type='Sales Invoice'`. `DRAFT_LABEL_PRESENT: True`. `W5_PRESENT: True`. `FORBIDDEN_FOUND: []`.

**Expected output to share back:** the 4 verification lines.

---

## 15. Test customer (clearly fake/test, sandbox-preserving naming)

**Goal:** Create a single Test customer Anton can use to render the test Pro-forma in § 16. Name is **`Test Buyer (CFLR-DRY-RUN)`** — clearly fake; not a real client; never to be invoiced.

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

customer_name = 'Test Buyer (CFLR-DRY-RUN)'

if frappe.db.exists('Customer', customer_name):
    print('CUSTOMER_EXISTS:', customer_name)
else:
    cust = frappe.get_doc({
        'doctype':       'Customer',
        'customer_name': customer_name,
        'customer_type': 'Company',
        'customer_group': 'All Customer Groups' if frappe.db.exists('Customer Group', 'All Customer Groups') else None,
        'territory':     'All Territories' if frappe.db.exists('Territory', 'All Territories') else None,
    })
    # Some Standard installs don't ship a "Commercial" customer group; fall back to whatever exists.
    if not cust.customer_group:
        any_group = frappe.db.get_value('Customer Group', {'is_group': 0}, 'name')
        cust.customer_group = any_group
    if not cust.territory:
        any_terr = frappe.db.get_value('Territory', {'is_group': 0}, 'name')
        cust.territory = any_terr
    cust.insert(ignore_permissions=True)
    frappe.db.commit()
    print('CUSTOMER_CREATED:', customer_name)

print('CUSTOMER_VERIFY:', frappe.db.get_value('Customer', customer_name,
    ['name', 'customer_name', 'customer_type', 'customer_group', 'territory'], as_dict=True))
PY
```

**Expected output:** `CUSTOMER_VERIFY` dict with `customer_name='Test Buyer (CFLR-DRY-RUN)'`.

**Expected output to share back:** `CUSTOMER_EXISTS`/`CREATED` + `CUSTOMER_VERIFY` dict.

---

## 16. Test PDF smoke — render a Quotation as Pro-forma (no client, no submission, no GL)

**Goal:** Create ONE Quotation document for the test customer + `LR-SETUP-USD-150` × 1 @ USD 150, render it through the Pro-forma Print Format, save the resulting PDF to a temp location, capture the file path + size + first bytes for visual review. **The Quotation is NOT submitted** (Quotations don't post to GL anyway, but we leave it as draft for clean-up safety). **The PDF is NOT sent to any real client.**

```bash
cd ~/erpnext-production/frappe_docker

docker compose -p erpnext-production exec -T \
  --workdir /home/frappe/frappe-bench \
  backend /home/frappe/frappe-bench/env/bin/python - <<'PY'
import os
BENCH_ROOT = '/home/frappe/frappe-bench'
SITES_PATH = os.path.join(BENCH_ROOT, 'sites')
SITE = 'corpflowai-production.localhost'

os.chdir(SITES_PATH)
import frappe
frappe.init(site=SITE, sites_path=SITES_PATH)
frappe.connect()
frappe.set_user('Administrator')

customer = 'Test Buyer (CFLR-DRY-RUN)'
item_code = 'LR-SETUP-USD-150'

# Create ONE test quotation; idempotent via custom remarks tag.
TAG = 'CFLR-DRY-RUN-PDF-SMOKE-V1'

existing = frappe.db.get_value('Quotation',
    {'party_name': customer, 'remarks': ['like', f'%{TAG}%'], 'docstatus': 0}, 'name')

if existing:
    qname = existing
    print('QUOTATION_EXISTS:', qname)
else:
    q = frappe.get_doc({
        'doctype':        'Quotation',
        'quotation_to':   'Customer',
        'party_name':     customer,
        'transaction_date': frappe.utils.today(),
        'currency':       'USD',
        'selling_price_list': frappe.db.get_value('Price List',
            {'currency': 'USD', 'selling': 1, 'enabled': 1}, 'name'),
        'remarks':        f'TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT. {TAG}',
        'items': [{
            'item_code': item_code,
            'qty':       1,
            'rate':      150.00,
        }],
    })
    q.insert(ignore_permissions=True)
    frappe.db.commit()
    qname = q.name
    print('QUOTATION_CREATED:', qname)

# Render the Pro-forma Print Format to PDF via Frappe's print API.
from frappe.utils.print_format import download_pdf

pdf_path = f'/tmp/CFLR-PRODUCTION-SHELL-SMOKE-{qname}.pdf'

# Call the internal renderer directly so we can write to disk (download_pdf is HTTP-oriented).
from frappe.utils.pdf import get_pdf
html = frappe.get_print(
    doctype='Quotation',
    name=qname,
    print_format='CFLR Pro-forma Invoice',
    letterhead='CorpFlowAI Ltd - Production Letter Head',
    as_pdf=False,
)
pdf_bytes = get_pdf(html)

with open(pdf_path, 'wb') as f:
    f.write(pdf_bytes)

print('PDF_PATH:', pdf_path)
print('PDF_SIZE_BYTES:', os.path.getsize(pdf_path))
print('PDF_FIRST_4_BYTES_HEX:', pdf_bytes[:4].hex())  # expect 25504446 = "%PDF"
print('QUOTATION_TOTAL_USD:', frappe.db.get_value('Quotation', qname, 'grand_total'))
print('QUOTATION_DOCSTATUS:', frappe.db.get_value('Quotation', qname, 'docstatus'))  # expect 0 = draft
PY

# Now from outside the container — sanity check the PDF actually exists on the container FS.
docker compose -p erpnext-production exec -T backend ls -la /tmp/ | grep CFLR-PRODUCTION-SHELL-SMOKE || echo '(no PDF found in container /tmp/)'
```

**Expected output:** `PDF_PATH: /tmp/CFLR-PRODUCTION-SHELL-SMOKE-CFLR-QUO-…pdf`. `PDF_SIZE_BYTES` is typically 25 KB – 80 KB for a simple Quotation. `PDF_FIRST_4_BYTES_HEX: 25504446` (the literal `%PDF` magic bytes). `QUOTATION_DOCSTATUS: 0` (draft, NOT submitted).

### 16.1 Copy the PDF to the host filesystem so Anton can view it locally

```bash
# From outside the container, copy the PDF out to the host so Anton can inspect it.
SMOKE_PDF=$(docker compose -p erpnext-production exec -T backend bash -c 'ls -t /tmp/CFLR-PRODUCTION-SHELL-SMOKE-*.pdf | head -1')
docker compose -p erpnext-production cp backend:$SMOKE_PDF ~/erpnext-production/$(basename $SMOKE_PDF)
ls -la ~/erpnext-production/CFLR-PRODUCTION-SHELL-SMOKE-*.pdf
```

**To visually inspect the PDF** (without exposing the production-shell UI publicly):

```bash
# Option 1: SCP the PDF from the box to the laptop.
# On Anton's laptop (separate terminal):
#   scp anton@5.78.213.185:~/erpnext-production/CFLR-PRODUCTION-SHELL-SMOKE-*.pdf ~/Downloads/
# Then open ~/Downloads/CFLR-PRODUCTION-SHELL-SMOKE-*.pdf locally.

# Option 2: SSH tunnel + temporary HTTP serve on the box (loopback only).
# (Recommended: Option 1; less moving parts and doesn't require a temp HTTP server.)
```

### 16.2 PDF smoke verdict (operator's call)

After visually opening the PDF locally, Anton picks one of:

- **PASS** — PDF renders cleanly: title shows *"Pro-forma invoice"*, Letter Head header + footer present, buyer block has `Test Buyer (CFLR-DRY-RUN)`, line item shows `LR-SETUP-USD-150` × 1 @ USD 150 = USD 150, totals correct, W1–W5 footer wording verbatim, **no Tax/VAT-invoice wording anywhere**, no payment-button / live-checkout language, layout fits on one or two A4 pages.
- **PARTIAL** — PDF works but needs formatting fixes (font / spacing / Letter Head logo missing because § 9.1 deferred). Document the specific fixes needed and move them to a follow-up Letter Head v2 / Print Format v2 packet.
- **FAIL** — PDF does not render, or contains forbidden wording (Tax/VAT invoice, Pay now, etc.), or shows the wrong company, or has a clear visual bug that blocks operator use. STOP — file a fix-forward packet before any production-shell use.

**Expected output to share back:** the 5 `PDF_*` + `QUOTATION_*` lines, the `ls -la` line confirming the PDF on the host filesystem, and Anton's PASS/PARTIAL/FAIL verdict + reason.

---

## 17. UI access for visual review (SSH tunnel — same pattern as sandbox §10)

**Goal:** Let Anton open the production shell UI in his laptop browser without exposing anything publicly.

```bash
# On Anton's LAPTOP (not the box):
ssh -L 8081:localhost:8081 anton@5.78.213.185
# Then in Anton's browser on the laptop:
#   http://localhost:8081
#
# Note: the sandbox is on http://localhost:8080 (after `ssh -L 8080:localhost:8080 …`).
# Both tunnels can be open simultaneously in two different SSH sessions.
```

Log in with username `Administrator` + the admin password from `~/.erpnext-production-credentials` on the box (Anton reads the file with `cat ~/.erpnext-production-credentials` in his SSH session; Cursor never sees the value).

**What to spot-check in the UI** (5-minute walkthrough):

1. **Home → Setup → Company → CorpFlowAI Ltd** — verify BRN, registered office, support email, USD currency.
2. **Home → Setup → Letter Head → CorpFlowAI Ltd - Production Letter Head** — verify content + footer; if logo upload was deferred (§ 9.1), the text-only header is what's there for v1.
3. **Home → Accounts → Chart of Accounts → CorpFlowAI Ltd** — verify the 7 broad revenue categories exist under Income.
4. **Home → Stock → Item → LR-SETUP-USD-150** — verify item name, item group, USD 150 selling rate.
5. **Home → Selling → Quotation → New → Naming Series dropdown** — verify `CFLR-QUO-.YYYY.-.NNN` appears and is the default.
6. **Home → Accounts → Sales Invoice → New → Naming Series dropdown** — verify `CFLR-INV-.YYYY.-.NNN` appears and is the default. (Do NOT submit the draft Sales Invoice — JE-2026-06-04-1 § (3) forbids it.)
7. **Home → Setup → Print Format → CFLR Pro-forma Invoice** — open in preview mode with the smoke quotation from § 16.
8. **Home → Setup → Print Format → CFLR Sales Invoice (Draft)** — open in preview mode; verify DRAFT label is visible and there's no "Tax invoice" / "VAT invoice" wording.

**Expected output to share back:** screenshots (with admin password NOT visible — sign out before screenshotting, or crop the URL bar) OR a 2-sentence summary per item.

---

## 18. Verification checklist (the operator + Cursor read this together)

After § 1–§ 17 complete, both Anton and Cursor walk through this list before declaring the shell setup done:

| # | Check | Source | Status |
|---|---|---|---|
| V1 | Host is `corpflow-exec-01-u69678` (no HOST_MISMATCH) | § 1 `hostname` | |
| V2 | Sandbox containers still `Up (healthy)` | § 1 + § 2 `docker compose -p erpnext-sandbox ps` | |
| V3 | Fresh sandbox backup file SHA-256s captured | § 2 | |
| V4 | Production Docker project `erpnext-production` running; all containers `Up` or `Up (healthy)` | § 5 | |
| V5 | Production site `corpflowai-production.localhost` reachable on `127.0.0.1:8081` (HTTP 200/302) | § 6 | |
| V6 | ERPNext app installed on production site | § 6 `bench list-apps` | |
| V7 | Setup wizard complete (`SETUP_COMPLETE_BEFORE: 1` on re-run) | § 7 | |
| V8 | Company `CorpFlowAI Ltd`, abbr `CFL`, country `Mauritius`, currency `USD`, BRN `C25228280`, email `support@corpflowai.com` | § 7 + § 8 verify dicts | |
| V9 | Registered office Address linked to Company | § 8 `ADDRESS_LINKED: ≥ 1` | |
| V10 | Letter Head `CorpFlowAI Ltd - Production Letter Head` exists, default, not disabled | § 9 | |
| V11 | 7 broad revenue categories created under Income | § 10 `CREATED + EXISTED = 7` | |
| V12 | Item `LR-SETUP-USD-150` exists with name `AI Lead Rescue Setup (USD 150 launch pilot)`, USD 150 selling price | § 11 | |
| V13 | Naming series `CFLR-QUO-.YYYY.-.NNN` default on Quotation; `CFLR-INV-.YYYY.-.NNN` default on Sales Invoice | § 12 | |
| V14 | Print Format `CFLR Pro-forma Invoice` (Quotation) exists, title shows *"Pro-forma invoice"*, contains W1–W5 verbatim, **no forbidden wording** | § 13 | |
| V15 | Print Format `CFLR Sales Invoice (Draft)` (Sales Invoice) exists with DRAFT label, **no Tax/VAT invoice wording** | § 14 | |
| V16 | Test customer `Test Buyer (CFLR-DRY-RUN)` exists | § 15 | |
| V17 | Test Quotation `CFLR-QUO-…` created (draft, NOT submitted, `docstatus=0`) | § 16 | |
| V18 | PDF rendered with correct `%PDF` magic bytes; size > 5 KB; copied to host filesystem | § 16 | |
| V19 | PDF visual smoke verdict captured: PASS / PARTIAL / FAIL | § 16.2 + operator review | |
| V20 | **No real bank account on Company doctype** (`JE-2026-06-04-1` § (5)) | UI spot-check; or `frappe.db.count('Bank Account', filters={'company': 'CorpFlowAI Ltd'})` → 0 | |
| V21 | **No real client invoice created or sent** (`JE-2026-06-04-1` § (2) + § (3)) | `frappe.db.count('Sales Invoice', filters={'docstatus': 1})` → 0 | |
| V22 | **No VAT activated** (`JE-2026-06-04-1` § (4)) | UI Setup → Tax Templates list is empty / unchanged from Standard install | |
| V23 | **No DNS / TLS / SMTP / public exposure added** (`JE-2026-06-04-1` § (6)) | Loopback-only; no firewall rule added on the box | |
| V24 | **Standing holds preserved:** HB-2 (accountant CoA review), HB-3 (VAT decision), HB-4 (real MU bank CSV) still PENDING. | `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1 unchanged | |
| V25 | **Sandbox preservation rule honoured:** sandbox project / site / credentials file untouched | § 1 + § 2 ls outputs | |

If any row is unchecked, the shell setup is **PARTIAL**, not COMPLETE. Cursor records the V1–V25 status in `JE-2026-06-04-3` and bridge #249 STATUS.

---

## 19. Rollback / cleanup / no-go rules

### 19.1 Rollback (drop the production shell, keep the sandbox)

If the operator wants to remove the production shell without affecting the sandbox:

```bash
cd ~/erpnext-production/frappe_docker

# Stop and remove production containers + volumes (sandbox is project erpnext-sandbox; untouched).
docker compose -p erpnext-production down -v

# Drop the Frappe site (also archives it to <bench>/archived/sites/).
# NOTE: this command runs against a fresh container start — if `down -v` removed the volume,
# you can't drop-site; the data is already gone with the volume. The drop-site step is for
# the case where the operator wants to keep the volume but drop the site (rare).

# Remove the production frappe_docker directory + production credentials file.
cd ~
rm -rf ~/erpnext-production
rm -f ~/.erpnext-production-credentials

# Reclaim disk (BE CAREFUL: docker system prune -a -f also removes UNUSED sandbox images).
# Prefer narrow cleanup:
docker container prune -f
docker volume prune -f
# Only run `docker image prune` if disk pressure requires it AND you've taken a sandbox backup first.

# Verify:
docker compose ls | grep erpnext-production && echo 'STILL RUNNING — check' || echo 'production project removed'
ls -lah ~/erpnext-production 2>/dev/null || echo 'production directory removed'
ls -lah ~/.erpnext-production-credentials 2>/dev/null || echo 'production credentials removed'
docker compose -p erpnext-sandbox ps --format 'table {{.Service}}\t{{.Status}}'  # sandbox preserved
```

### 19.2 No-go rules (when to halt before § 19.1)

Do NOT roll back if any of the following is true:

- Anton has NOT issued explicit rollback approval as a chat DECISION on bridge #249.
- The PDF smoke verdict (V19) is recorded as PASS or PARTIAL — that means visual review may continue across future sessions; rollback discards setup work that took ~30–45 minutes.
- A scheduled re-run of this recipe is planned within 7 days (rollback + reinstall is wasteful).

### 19.3 Sandbox removal rules (preserved verbatim from `JE-2026-06-04-1`)

The existing Phase B-a sandbox is **preserved by default**. The sandbox may be removed only when ALL of the following hold:

1. A final sandbox backup/export has been produced and its path documented (§ 2 provides the fresh backup).
2. The production-shell site is reachable on the box (V5 + V6 above).
3. The test-only Quotation PDF smoke completes with PASS or PARTIAL (V19).
4. Anton has issued explicit removal approval as a separate chat DECISION on bridge #249.

**Removal without all four conditions is forbidden.** If Anton later wants to remove the sandbox, the recipe is:

```bash
# Only run this block AFTER all four conditions above are met.
cd ~/erpnext-sandbox/frappe_docker
docker compose -p erpnext-sandbox down -v
cd ~
rm -rf ~/erpnext-sandbox
rm -f ~/.erpnext-sandbox-credentials
```

### 19.4 What this recipe NEVER does (the JE-2026-06-04-1 12-point hard contract, restated)

| # | Forbidden | Recipe section that does NOT do this |
|---|---|---|
| 1 | Activate ERPNext accounting on production | n/a — § 7 setup_complete does not enable accounting workflows; no Journal Entry / Sales Invoice is submitted |
| 2 | Issue any pro-forma to a real client | § 15 + § 16 use only `Test Buyer (CFLR-DRY-RUN)`; PDF saved to `/tmp/`; never emailed |
| 3 | Submit any Sales Invoice | n/a — no Sales Invoice is created in this recipe; the Print Format (§ 14) is a placeholder |
| 4 | Activate VAT or use "Tax invoice" / "VAT invoice" | § 13 + § 14 defensive forbidden-wording assertions; § 10 explicitly does NOT create VAT accounts |
| 5 | Enter real bank / SWIFT / IBAN / payment credentials | § 4 + § 8 — no bank account fields are touched; § 4.3 lists the values that must not enter `.env` |
| 6 | Configure DNS / TLS / SMTP / reverse proxy / public exposure | § 4.2 clears `MAIL_*` env vars; § 5 binds port `8081` to `127.0.0.1` only; § 17 uses SSH tunnel |
| 7 | Change CorpFlowAI runtime / Vercel / GitHub / Postgres / Neon / Prisma / n8n / Plausible / Telegram / Search Console / client-facing surfaces | n/a — entire recipe runs in container scope on the box; no edits to repo runtime |
| 8 | Invent new env var names | § 4.2 only modifies keys that already exist in `example.env` |
| 9 | Print passwords / secrets / DB strings / API tokens / OAuth refresh tokens in chat or logs | All scripts source from `~/.erpnext-production-credentials`; all outputs use masked-key patterns; § 0.3 + § 0.4 enforce the discipline |
| 10 | Promote the sandbox database to production | n/a — parallel install with separate Docker project, separate site, separate credentials file; no `bench restore` against production from a sandbox backup |
| 11 | Import sandbox transactional data into production | n/a — production starts with Standard CoA only (82 accounts + 7 broad revenue categories); no data migration script in this recipe |
| 12 | Delete the sandbox | § 19.3 four-condition gate; default behaviour preserves sandbox |

---

## 20. Operator handoff to Cursor (evidence capture for `JE-2026-06-04-3`)

After § 1–§ 18 complete, Anton pastes the following 8 evidence blocks back into the Cursor chat. Cursor uses them to write the **execution closure JE row** (next available `JE-YYYY-MM-DD-N`; this recipe-creation PR consumes `JE-2026-06-04-3`, so the closure row will be `JE-2026-06-04-4` if executed the same day, or `JE-YYYY-MM-DD-1` on a later day) and a bridge #249 STATUS comment.

1. **Host identity:** `hostname` + `whoami` + `pwd` from § 1.
2. **Sandbox preservation:** the 4 backup file SHA-256s from § 2.
3. **Production stack health:** `docker compose ls` + `docker compose -p erpnext-production ps` from § 5.
4. **Site bring-up:** `bench install-app erpnext` final line + `curl -sI` first 5 lines from § 6.
5. **Wizard bypass result:** the 7 `SETUP_COMPLETE_…` / `COMPANY_ROW:` / `ACCOUNT_COUNT:` / `USER_COUNT:` lines from § 7.
6. **Identity + branding:** `COMPANY_VERIFY` dict from § 8 + `LETTER_HEAD_VERIFY` dict from § 9 + `CREATED`/`EXISTED` lines from § 10 + `ITEM_VERIFY` dict from § 11.
7. **Naming + Print Formats:** the 4 naming-series lines from § 12 + `PRINT_FORMAT_VERIFY` + `W_PRESENT` + `FORBIDDEN_FOUND` from § 13 + same triple from § 14.
8. **PDF smoke:** `PDF_PATH`, `PDF_SIZE_BYTES`, `PDF_FIRST_4_BYTES_HEX`, `QUOTATION_TOTAL_USD`, `QUOTATION_DOCSTATUS` from § 16 + the `ls -la` line from § 16.1 + Anton's PASS/PARTIAL/FAIL verdict from § 16.2.

**Cursor will then:**

- Write the **execution closure row** (e.g. `JE-2026-06-04-4` if same day, or next available `JE-YYYY-MM-DD-N`) in `JOURNAL.md` recording:
  - the host execution happened (production-shell setup, NOT accounting go-live);
  - production site name `corpflowai-production.localhost`;
  - access method (loopback `127.0.0.1:8081` + SSH tunnel `8081:localhost:8081`); no secrets;
  - Company / Letter Head / Print Format / Item / test customer / test quote references;
  - V20–V25 explicit confirmations (no bank account, no submitted SI, no VAT, no public exposure, HB-2/3/4 still pending);
  - PDF smoke verdict;
  - the explicit closure sentence: *"ERPNext production shell is prepared but not live for real accounting use."*
- Post a bridge #249 STATUS comment summarising the same.
- Update `chat_history.md` with a dated section.
- Open a docs-only PR with the JOURNAL row + chat_history entry + any recipe-update fixes discovered during execution.

---

## 21. Cross-references

- Authorisation row: `docs/decisions/JOURNAL.md` `JE-2026-06-04-1` (production-shell narrowed-scope authorisation).
- Execution boundary: `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 (the L1/L2/L3 collaboration pattern this recipe implements).
- Sandbox runbook (proven commands this recipe is adapted from): `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` §§ 5 / 6 / 7.1 / 12 / 15.
- Phase B-a closure: `docs/decisions/JOURNAL.md` `JE-2026-05-31-2` + `JE-2026-06-01-1`.
- Phase C cycles: `docs/decisions/JOURNAL.md` `JE-2026-06-01-3` + `JE-2026-06-01-5`.
- Production readiness evaluation (HB-1..HB-4): `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1.
- Accountant review pack: `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`.
- W1–W5 verbatim source: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1.
- Brand doctrine (single-offer rule + item naming): `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Monitoring posture (the box): `docs/operations/MONITORING_ARCHITECTURE.md` § 11.3.
- Comms posture (no email sending from shell): `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## 22. Change log

- **v1, 2026-06-04** — initial canonical recipe (this PR consumes `JE-2026-06-04-3`). Authored at L1 (Cursor on Anton's Windows laptop) per `JE-2026-06-04-1` + Anton's structured `AskQuestion` decisions (Q1 Option B + Q2 boundary runbook now + PR-B full scope). Adapted from `ERPNEXT_SANDBOX_INSTALL.md` §§ 5 / 6 / 7.1 / 12 / 15 with production-shell deltas (separate Docker project `erpnext-production` vs sandbox `erpnext-sandbox`, separate site `corpflowai-production.localhost` vs sandbox `corpflowai-sandbox.localhost`, separate credentials file `~/.erpnext-production-credentials` vs sandbox `~/.erpnext-sandbox-credentials`, separate host port `8081` vs sandbox `8080`, Letter Head + Pro-forma Print Format + Sales Invoice DRAFT Print Format + Item `LR-SETUP-USD-150` + `CFLR-…` naming series + test PDF smoke added). Awaits Anton's L3 execution on `corpflow-exec-01-u69678`; the execution closure row will be a future `JE-YYYY-MM-DD-N` once executed.

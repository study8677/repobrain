# `ERPNext-PrintDesigner-Editor-Fix-1` — frontend service bind-mount fix (operator-paste runbook)

**Status:** Docs / runbook only — operator-paste runbook authored at L1. **No server commands executed by THIS PR. The fix is executed by the operator (Anton) at the L3 keyboard, after PR merge (or against the live branch, operator's call).** No ERPNext mutation. No real customer / Sales Invoice / GL posting / VAT / bank / payment-gateway / DNS / TLS / SMTP / public-exposure changes by THIS PR. No secrets.

**Anchor sentinel:** `<!-- ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1 -->`

<!-- ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), on behalf of Anton.
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-05 *"Please receive any authorisation required to repair this issue"* — treated as `AUTHORISE — ERPNext-PrintDesigner-Editor-Fix-1`). Approved scope: docs / runbook only; the host-side fix is a **single bind-mount addition to the frontend service** in the existing `compose.print-designer-mount.yaml` override, followed by `docker compose up -d` which recreates only the frontend container. No ERPNext data mutation. No real customer / Sales Invoice / GL / VAT / bank / payment-gateway / DNS / TLS / SMTP / public-exposure changes.
**Linked JOURNAL row:** `JE-2026-06-05-5` (`docs/decisions/JOURNAL.md`).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `ERPNext-PrintDesigner-Editor-Fix-1`*.

**Purpose:** Fix the Print Designer visual editor's blank-canvas / 404 bug observed during alignment evidence capture (`JE-2026-06-05-4`). Root cause is that the bind-mount Compose override added during install closed `JE-2026-06-05-3` for 5 Python services (`backend`, `scheduler`, `queue-short`, `queue-long`, `websocket`) but **not for the frontend (nginx) container** — which is the one that serves the `/assets/print_designer/dist/js/print_designer.bundle.<hash>.js` static bundle. nginx in the frontend container resolves the symlink `sites/assets/print_designer/` → `apps/print_designer/print_designer/public/` to an absolute path inside its own filesystem; without the bind-mount, that path is empty, nginx returns 404, the browser executes the 404 HTML as JS (`SyntaxError: Unexpected token '<'`), the `frappe.ui.PrintDesigner` class never registers, the canvas stays blank.

The fix is one-line YAML + one `docker compose up -d`. Estimated execution time: ~5 minutes at the L3 keyboard. Estimated HTTP downtime: ~10 seconds (frontend container restart).

---

## § 0 — Hard limits honoured by THIS PR

- Zero host commands executed by THIS PR (authored entirely on L1).
- Zero ERPNext production-shell **data** mutation (`corpflowai-production.localhost` Docker project `corpflowai-production` on `corpflow-exec-01-u69678`; live `host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged; site config unchanged; doctype data unchanged).
- Zero ERPNext sandbox mutation (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`; sandbox-preservation rule from `JE-2026-06-04-1` honoured — only `corpflowai-production`'s frontend container is touched).
- Zero Print Designer code modified (the app source on disk is unchanged; only the Compose override file is amended to add a frontend bind-mount line).
- Zero template creation, edit, or build.
- Zero Sales Invoice creation or submission.
- Zero GL posting.
- Zero VAT activation; zero `Tax invoice` / `VAT invoice` wording introduced anywhere.
- Zero real bank account / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card number / payment-gateway API key / OAuth token / KYC-grade personal data added to repo.
- Zero invoices issued or pro-formas sent.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Zero new public exposure (the frontend container remains bound to `127.0.0.1:8081` via the existing port override from recipe v1.1).
- Zero L3 host commands triggered by THIS PR's merge — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered. The operator-paste block in § 4 runs **only** when Anton chooses to execute it.
- Only public Anton-approved values quoted (`CorpFlowAI Ltd`; no BRN / address / email / secrets needed in this fix packet).

---

## § 1 — Prerequisites

Run this fix **only** when **all** of the following hold. If any prerequisite fails, **stop**, post evidence to Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249), and resolve before continuing.

| # | Prerequisite | How to confirm | If fails |
|---|---|---|---|
| **PR-1** | Install closure verdict is **PARTIAL** per `JE-2026-06-05-4` (Print Designer v1.6.7 installed via bind-mount approach; visual editor canvas blank with 404 on `print_designer.bundle.<hash>.js`) | Read `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` § 2.7; symptom matches: browser DevTools shows `Failed to load resource: 404` for `/assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js` (or similar hashed filename) + `Uncaught TypeError: frappe.ui.PrintDesigner is not a constructor` | If install state is FAIL (not PARTIAL), stop and address install-level issues first |
| **PR-2** | Production shell containers are `Up` on `corpflow-exec-01-u69678` (Docker project `corpflowai-production`) | `docker compose -p corpflowai-production ps` shows all 9 containers `Up` | Bring stack up per recipe v1.1 § 5 before running this fix |
| **PR-3** | Sandbox is preserved (Docker project `corpflowai-sandbox` `Up` per `JE-2026-06-04-1` sandbox-preservation rule) | `docker compose -p corpflowai-sandbox ps` shows running containers | Investigate sandbox state before proceeding |
| **PR-4** | The Compose override file `~/erpnext-production/frappe_docker/overrides/compose.print-designer-mount.yaml` exists from the original install (`JE-2026-06-05-3` install session) | `ls ~/erpnext-production/frappe_docker/overrides/compose.print-designer-mount.yaml` returns a file | If the override file is missing, this fix won't work as-is; the operator-paste block in § 4 auto-discovers the override path via `docker inspect` and will report a clear error if absent |
| **PR-5** | `host_name = http://frontend:8080` from `JE-2026-06-04-5` is unchanged | This fix does not modify `host_name`; if it is somehow drifted, the fix still applies but PDF rendering would be a separate issue | No action needed; this fix is independent of `host_name` |
| **PR-6** | Standing holds HB-1 / HB-2 / HB-3 / HB-4 are still acceptable as **HELD** for the scope of this fix | This fix touches no HB-gated surface; it adds a Docker volume mount to nginx | If Anton tries to use the editor against a real client, stop — that is `ERPNext-First-Real-Pro-Forma-Send` (not drafted) |

**This packet does NOT include** any change to ERPNext data, any Print Designer code change, any template build, any change to real-client / real-bank / real-payment / VAT / GL posting surfaces, or any change to non-frontend services.

---

## § 2 — Root cause analysis

### § 2.1 The symptom

When Anton opens the Print Designer visual editor (e.g., `Sales Invoice PD Format v2` → `Edit Format` button at `http://localhost:8081`), the page route resolves but the editor canvas is blank. Browser DevTools console shows (captured 2026-06-05):

```
GET /assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js → 404 (Not Found)
Uncaught SyntaxError: Failed to execute 'appendChild' on 'Node': Unexpected token '<'
    at Object.eval (dom.js:33:44)
Uncaught (in promise) TypeError: frappe.ui.PrintDesigner is not a constructor
    at load_print_designer (print_designer.js:181:28)
```

The 404 on the bundle is the root cause. The `appendChild ... Unexpected token '<'` error is a downstream effect — the browser receives the 404's HTML error page when it expects JavaScript, and tries to parse the `<html>` tag as JS. The `frappe.ui.PrintDesigner is not a constructor` error is further downstream — because the bundle never loaded, the `PrintDesigner` class never registered on the `frappe.ui` global, and the loader code at `print_designer.js:181` then fails when it tries to instantiate it.

### § 2.2 The architecture mismatch

The bind-mount Compose override `~/erpnext-production/frappe_docker/overrides/compose.print-designer-mount.yaml` created during the install session (`JE-2026-06-05-3` closure → applied via `bench install-app` + `bench build` on bind-mounted source) mounts the host-cloned `print_designer/` source into **5 Python services** that need to `import print_designer` at runtime:

| Service | Bind-mount? | Why it needs the source |
|---|---|---|
| `backend` | ✅ YES | Frappe web server — imports `print_designer` for doctype + view registration |
| `scheduler` | ✅ YES | Background task runner — may execute `print_designer` scheduled jobs |
| `queue-short` | ✅ YES | RQ worker for short jobs |
| `queue-long` | ✅ YES | RQ worker for long jobs (e.g., PDF generation) |
| `websocket` | ✅ YES | Node.js SocketIO service (mounted defensively; may not strictly require) |
| **`frontend`** | **❌ NO** | **nginx static-file server — serves `/assets/print_designer/dist/...` from disk** |
| `db` | n/a | MariaDB; doesn't need code |
| `redis-cache` | n/a | Redis; doesn't need code |
| `redis-queue` | n/a | Redis; doesn't need code |

`bench build` (run inside the `backend` container) writes the compiled JS / CSS bundles to `apps/print_designer/print_designer/public/dist/` on the bind-mounted source — which is shared with the 5 Python services that share the same bind-mount.

When the browser requests `http://localhost:8081/assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js`:

1. nginx in the `frontend` container handles the request.
2. nginx config (`location /assets` → `root /home/frappe/frappe-bench/sites`) maps it to `/home/frappe/frappe-bench/sites/assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js` on the frontend container's filesystem.
3. **In the frontend container's view, `sites/assets/print_designer/` does not exist** — neither as a directory nor as a symlink.
4. nginx returns 404.

**Why the frontend container doesn't have it** (the finding that took the v1 fix-and-discover loop to surface):

- `bench build` running in the **backend** container produced the dist files correctly at `apps/print_designer/print_designer/public/dist/` (shared with backend's bind-mount).
- `bench build` did **not** create a `sites/assets/print_designer` symlink in the backend's view, OR if it did, that symlink does not appear in the frontend's view despite both containers nominally mounting the same `corpflowai-production_sites` Docker volume per `docker inspect`.
- Execution evidence from 2026-06-05 05:36 UTC confirmed this directly: `docker compose exec backend ln -sfn ... sites/assets/print_designer` succeeded with exit 0, and `docker compose exec frontend ls sites/assets/print_designer` returned "No such file or directory" seconds later. Backend's `sites/assets/` `.` mtime was the time of the symlink creation (`05:33`); frontend's was the original image build (`May 29 12:18`). Different `assets.json` file sizes (3796 bytes vs 3508 bytes) confirmed they were genuinely different directories.
- The likely root cause is a frappe-docker / Docker volume-overlay quirk specific to this installation — possibly the frontend image's entrypoint copies a baked-in `sites/assets/` over the volume mount on startup, masking it for the `sites/assets/<app>` subpath specifically. Not investigated further because the workaround is simple and the editor-canvas business need is unblocked.

### § 2.3 The fix (final form — both halves required)

Single `docker compose up -d` after extending the existing `compose.print-designer-mount.yaml` override to give the `frontend` service **TWO bind-mounts**, not one:

1. **`apps/print_designer/`** — same as the 5 Python services. Provides the source on disk so that absolute-path symlink targets can resolve.
2. **`sites/assets/print_designer/`** — bind-mounted directly to the host's `print_designer/print_designer/public/` directory. Bypasses any symlink-resolution dependency entirely: nginx finds the files at the exact path it expects, served from the host filesystem.

Only the `frontend` container is recreated by `docker compose up -d` because only its mount spec changed. The other 5 Python services have unchanged specs → Compose detects no diff → no recreation → backend IP stays stable → no risk of the `JE-2026-06-05-4` § 2.6 nginx-upstream-IP-cache 502 issue recurring.

After the fix, nginx resolves the bundle URL to a real file served directly from the host bind-mount, returns HTTP 200, browser executes the JS, `frappe.ui.PrintDesigner` registers, canvas renders. This fix is **persistent** — bind-mounts in the Compose override survive container recreation, image upgrade, and `--force-recreate`.

---

## § 3 — Pre-flight (operator confirms; read-only)

Run these checks **before** executing the fix. Each check has a **Pass condition**; anything else means **stop**, post evidence to Bridge #249, and resolve.

| # | Step | Pass condition |
|---|---|---|
| **PF-1** | SSH into the box: `ssh anton@5.78.213.185` (per recipe § 17 / `JE-2026-06-04-5` evidence pattern) | Prompt visible; Anton at L3 |
| **PF-2** | Confirm production project health: `docker compose -p corpflowai-production ps` | All 9 containers `Up` (`backend`, `db`, `frontend`, `queue-long`, `queue-short`, `redis-cache`, `redis-queue`, `scheduler`, `websocket`) |
| **PF-3** | Confirm sandbox preservation: `docker compose -p corpflowai-sandbox ps` | Sandbox containers `Up`; sandbox not touched |
| **PF-4** | Confirm the Compose override file exists: `ls -la ~/erpnext-production/frappe_docker/overrides/compose.print-designer-mount.yaml` | File listed (with size + mtime) |
| **PF-5** | Confirm the symptom: from inside the frontend container, the bind-mount target is empty: `docker compose -p corpflowai-production exec -T frontend ls /home/frappe/frappe-bench/apps/print_designer/ 2>&1` | Returns `No such file or directory` or empty listing — **this is the smoking gun for the missing bind-mount**. If the directory has contents, the diagnosis is wrong and a different fix is needed; stop and post evidence |

---

## § 4 — The fix (single paste-safe block)

Run this block **once** at the L3 keyboard in your SSH session. It is idempotent (re-running it is safe). It is self-contained (no multi-step copy-paste). It is paste-safe (uses heredoc to write YAML; no risk of bash trying to interpret YAML lines).

The block does:

1. Auto-discovers the current Compose file list via `docker inspect` of the backend container (no operator memory required).
2. Auto-discovers the print-designer-mount override file path within that list.
3. Backs up the current override file (timestamped).
4. Writes the new override file with the **frontend service given TWO bind-mounts** — `apps/print_designer/` AND `sites/assets/print_designer/` — preserving the 5 existing Python-service `apps/` bind-mounts.
5. Runs `docker compose up -d` with the discovered file list (recreates **only frontend** because only frontend's spec changed; other services see no diff).
6. Verifies the bind-mount: frontend container can now see the bundle file directly at the path nginx expects.
7. Verifies nginx serves the bundle (`HTTP 200`).
8. Confirms all 9 production containers are `Up`, sandbox preserved.
9. Prints clear next-step instructions for the operator.

**Copy the entire block below — from `bash -c '` line down to the closing `'` line — and paste into your SSH session in one go:**

```bash
bash -c '
set -e

echo "=================================================="
echo "ERPNext-PrintDesigner-Editor-Fix-1 (v2 dual bind-mount)"
echo "Time on box: $(date -u)"
echo "=================================================="
echo ""

echo "=== Step 1: Discover Compose files in use ==="
CONFIG_FILES=$(docker inspect corpflowai-production-backend-1 \
  --format "{{ index .Config.Labels \"com.docker.compose.project.config_files\" }}")
echo "Files: $CONFIG_FILES"
echo ""

COMPOSE_FLAGS=""
IFS="," read -ra FILES <<< "$CONFIG_FILES"
for f in "${FILES[@]}"; do
  COMPOSE_FLAGS="$COMPOSE_FLAGS -f $f"
done
echo "Compose flags: $COMPOSE_FLAGS"
echo ""

PD_OVERRIDE=""
for f in "${FILES[@]}"; do
  case "$f" in
    *print-designer-mount*) PD_OVERRIDE="$f" ;;
  esac
done
if [ -z "$PD_OVERRIDE" ]; then
  echo "ERROR: print-designer-mount override file not found in compose file list."
  echo "       Expected a file matching *print-designer-mount* in:"
  echo "       $CONFIG_FILES"
  exit 1
fi
echo "Print Designer override file: $PD_OVERRIDE"
echo ""

echo "=== Step 2: Back up existing override (timestamped) ==="
BACKUP="${PD_OVERRIDE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$PD_OVERRIDE" "$BACKUP"
echo "Backup created: $BACKUP"
echo ""

echo "=== Step 3: Write new override with DUAL bind-mount for frontend ==="
cat > "$PD_OVERRIDE" <<"YAML_END"
services:
  frontend:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
      - /home/anton/erpnext-production/host-apps/print_designer/print_designer/public:/home/frappe/frappe-bench/sites/assets/print_designer
  backend:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
  scheduler:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
  queue-short:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
  queue-long:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
  websocket:
    volumes:
      - /home/anton/erpnext-production/host-apps/print_designer:/home/frappe/frappe-bench/apps/print_designer
YAML_END
echo "New override contents:"
echo "----------------------"
cat "$PD_OVERRIDE"
echo "----------------------"
echo ""

echo "=== Step 4: Apply (recreates frontend only; other services unchanged) ==="
docker compose -p corpflowai-production $COMPOSE_FLAGS up -d
echo ""

echo "=== Step 5: Wait 15s for frontend ==="
sleep 15
echo ""

echo "=== Step 6: Verify bundle accessible directly via bind-mount (no symlink) ==="
docker compose -p corpflowai-production exec -T frontend ls -la /home/frappe/frappe-bench/sites/assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js 2>&1
echo ""

echo "=== Step 7: Verify nginx serves bundle (expect HTTP 200) ==="
docker compose -p corpflowai-production exec -T frontend curl -sI -w "HTTP %{http_code}\n" http://localhost:8080/assets/print_designer/dist/js/print_designer.bundle.UDIPLQSC.js 2>&1 | tail -3
echo ""

echo "=== Step 8: Production health (9 containers Up) ==="
docker compose -p corpflowai-production ps --format "table {{.Name}}\t{{.Status}}"
echo ""

echo "=== Step 9: Sandbox preservation (not touched) ==="
docker compose -p corpflowai-sandbox ps --format "table {{.Name}}\t{{.Status}}" 2>&1 | head -10
echo ""

echo "=================================================="
echo "FIX APPLIED. Operator next step:"
echo "  1. Open INCOGNITO browser window (Ctrl+Shift+N) — clears cache"
echo "  2. Visit http://localhost:8081/app/print-designer/Sales%20Invoice%20PD%20Format%20v2"
echo "  3. Log in as Administrator if prompted"
echo "  4. EXPECTED: visual designer canvas renders (toolbar, template body, right panel)"
echo "=================================================="
echo "OPERATOR_BLOCK_DONE"
'
```

**Why the outer `bash -c "..."` wrapper:** it makes the entire multi-line script land as one process invocation regardless of how your terminal handles pasted newlines. If any line gets interrupted or mis-pasted, the wrapper's exit code surfaces the error cleanly rather than half-executing.

**Why the dual bind-mount (vs the v1 single bind-mount):** during execution on 2026-06-05, the v1 single bind-mount succeeded at making the source files visible to the frontend container's `apps/` path, but nginx serves from `sites/assets/print_designer/` (per the nginx config inspected in execution diagnostic D-5), and that path was empty in the frontend container despite `corpflowai-production_sites` being nominally a shared Docker volume per `docker inspect`. The second bind-mount (`sites/assets/print_designer/` → host `public/`) bypasses the volume-sharing quirk entirely by giving nginx a direct host-filesystem path to serve. See § 2.2 finding details + § 9 for the documented honest limit.

---

## § 5 — Browser smoke test (Anton, after § 4 completes)

After the operator-paste block prints `OPERATOR_BLOCK_DONE`, switch to your browser:

| # | Step | Pass condition |
|---|---|---|
| **UI-1** | Open an **incognito / private** browser window (this avoids stale-cache false negatives) | Incognito mode active |
| **UI-2** | Navigate to `http://localhost:8081/login` and log in as `Administrator` (password from `~/.erpnext-production-credentials` on box — **never paste in chat**) | Desk loads at `http://localhost:8081/app` |
| **UI-3** | Navigate to `http://localhost:8081/app/print-format` (Print Format list) | List renders; `Sales Invoice PD Format v2` and `Sales Order PD v2` visible among 22 rows |
| **UI-4** | Click `Sales Invoice PD Format v2` to open it | Print Format detail view opens |
| **UI-5** | Click the **`Edit Format`** button (or equivalent — Print Designer's "open visual editor" affordance) | Browser navigates to the visual designer route; full-screen canvas opens |
| **UI-6** | Confirm the visual designer canvas **renders** (toolbox on one side, property panel on the other, Sales Invoice template visible in the middle) | Canvas visible; **not blank**; no error overlay |
| **UI-7** | (Optional but recommended) Open DevTools (F12) → Console tab → confirm **no** 404 lines for any `/assets/print_designer/...` URL; **no** `frappe.ui.PrintDesigner is not a constructor` error | Clean console (ignore the pre-existing `microtemplate.js` errors and the SocketIO `Invalid origin` warning — both are unrelated cosmetic issues addressed in § 9) |

---

## § 6 — Verification matrix (FIX-PASS / FIX-PARTIAL / FIX-FAIL)

| Verdict | Conditions |
|---|---|
| **FIX-PASS** | § 4 block prints `OPERATOR_BLOCK_DONE`; § 4 Step 6 shows dist JS files listed (e.g., `print_designer.bundle.UDIPLQSC.js`); § 4 Step 7 shows all 9 production containers `Up`; § 4 Step 8 shows sandbox preserved; UI-6 visual designer canvas renders; UI-7 console clean of bundle 404s |
| **FIX-PARTIAL** | § 4 block completes but UI-6 canvas still shows errors (different from the original 404 — e.g., the SocketIO `Invalid origin` is still present but now blocks canvas) → see § 9 *Known limits* + draft a follow-up SocketIO-fix packet (not this packet) |
| **FIX-FAIL** | Any of: § 4 block exits with non-zero before `OPERATOR_BLOCK_DONE`; § 4 Step 6 returns `No such file or directory`; one or more production containers crash-loop; sandbox tear-down; UI-6 still shows the same 404 on the bundle |

If FIX-FAIL: use § 8 *Rollback* to restore the previous override file and revert the change.

---

## § 7 — Evidence to paste back to Bridge #249 (`EV-1..EV-6`)

After running § 4 and § 5, paste these back to chat / Bridge #249:

| # | Evidence | Source |
|---|---|---|
| **EV-1** | Last ~30 lines of § 4 block output (Steps 4–8 + final next-step banner) | SSH terminal |
| **EV-2** | UI-6 screenshot — visual designer canvas rendered (or whatever it actually shows) | Browser |
| **EV-3** | UI-7 DevTools Console screenshot (post-fix; ideally clean of bundle 404 + `PrintDesigner is not a constructor`) | Browser DevTools |
| **EV-4** | One-line verdict per § 6 (FIX-PASS / FIX-PARTIAL / FIX-FAIL) | Operator's call |
| **EV-5** | If FIX-PASS, optional: one-line decision on the still-outstanding **B-2 PDF generator choice** from `JE-2026-06-05-4` § 4.2 — either *"Accept wkhtmltopdf fallback for v1"* OR *"Run bench setup-chrome on backend in a follow-up packet"* | Operator's call |
| **EV-6** | If FIX-PASS + B-2 chosen: short request *"draft the closure-flip PR PARTIAL → PASS"* — Cursor will then author `ERPNext-PrintDesigner-Install-Closure-Flip-1` as a one-row docs PR | Operator's call |

---

## § 8 — Rollback

Use this section **only** if § 6 verdict is FIX-FAIL or if the fix introduces a regression discovered later.

```bash
bash -c '
set -e
echo "=== Rolling back ERPNext-PrintDesigner-Editor-Fix-1 ==="

# Discover Compose files
CONFIG_FILES=$(docker inspect corpflowai-production-backend-1 \
  --format "{{ index .Config.Labels \"com.docker.compose.project.config_files\" }}")
COMPOSE_FLAGS=""
IFS="," read -ra FILES <<< "$CONFIG_FILES"
for f in "${FILES[@]}"; do
  COMPOSE_FLAGS="$COMPOSE_FLAGS -f $f"
done

# Find the print-designer-mount override
PD_OVERRIDE=""
for f in "${FILES[@]}"; do
  case "$f" in
    *print-designer-mount*) PD_OVERRIDE="$f" ;;
  esac
done

# Find the most recent backup
BACKUP=$(ls -t "${PD_OVERRIDE}.backup."* 2>/dev/null | head -1)
if [ -z "$BACKUP" ]; then
  echo "ERROR: no backup file found at ${PD_OVERRIDE}.backup.*"
  exit 1
fi
echo "Restoring from: $BACKUP"

cp "$BACKUP" "$PD_OVERRIDE"
docker compose -p corpflowai-production $COMPOSE_FLAGS up -d
sleep 15
docker compose -p corpflowai-production ps

echo "ROLLBACK_DONE"
'
```

This restores the previous override file (the one without the frontend bind-mount) and re-runs `docker compose up -d` — the frontend container is recreated again, back to its pre-fix state. The visual editor returns to the blank-canvas + 404 state (i.e., back to PARTIAL install with the editor unusable; manual Word/Pages pro-forma remains canonical).

**What rollback does NOT do:**

- Does NOT touch `corpflowai-sandbox` (sandbox-preservation rule honoured).
- Does NOT touch the live `host_name = http://frontend:8080` from `JE-2026-06-04-5`.
- Does NOT modify Print Designer source code.
- Does NOT undo the bind-mount for the 5 Python services (`backend` / `scheduler` / `queue-short` / `queue-long` / `websocket`) — those keep working.
- Does NOT touch any real-client / real-bank / real-payment / VAT / GL surface.
- Does NOT delete the Print Format records (the demo `Sales Invoice PD Format v2` etc. remain in DB).

---

## § 9 — Honest limits + known unrelated issues

- **frappe-docker volume-overlay quirk (v2 finding from execution 2026-06-05)** — `corpflowai-production_sites` is nominally a shared Docker volume between `backend` and `frontend` per `docker inspect ... --format '{{ .Mounts }}'`, but in practice the `sites/assets/` subpath behaves as if it is NOT shared between the two containers: a symlink created in backend's view does not appear in frontend's view; the directories have different `mtime` and different `assets.json` file sizes when read seconds apart. The likely cause is the frontend image's entrypoint copying its baked-in `sites/assets/` over the mounted volume on startup, masking it for that subpath specifically. This was discovered during the v1 fix-and-discover loop (initial attempt with single bind-mount + symlink-from-backend failed; final fix uses dual bind-mount that bypasses the volume layer for the specific assets path). Not investigated further beyond what was needed to ship the editor fix. **Implication for future Frappe apps installed via the same bind-mount pattern**: any app whose static assets must be served by nginx needs the same dual bind-mount pattern as `print_designer` — extend the `compose.print-designer-mount.yaml` override (or author a sibling override) with a second `sites/assets/<app>` bind-mount for each such app.
- **Browser cache** — the fix changes nothing on the browser side. If the operator does NOT use an incognito window (or hard-refresh / clear cache for `localhost:8081`), the browser may still serve the stale cached HTML page that references the dead 404 URL. Always use incognito for UI-1.
- **SocketIO `Invalid origin` 400** — observed in the original `JE-2026-06-05-4` browser console as `Error connecting to socket.io: Invalid origin` + `400 Bad Request` on `/socket.io/?EIO=4&transport=polling`. This is **a separate issue**: the websocket service rejects the `http://localhost:8081` browser origin because it expects a configured allowed-origins list (typically `http://frontend:8080` for the internal Docker DNS path). It affects only real-time updates (multi-user editing, live notifications). The visual editor canvas itself works without it. Address in a separate future packet `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` (not drafted; not authorised by THIS PR).
- **Frappe v15 `microtemplate.js: Error in Template: <h3>Print Format Help</h3>...`** — observed in the original browser console; this is a Frappe v15 cosmetic bug in the Print Format help microtemplate (the embedded Jinja-style `for row in doc.items` confuses the JS microtemplate parser). Not Print Designer specific; exists on every Frappe v15 install. Ignorable.
- **`moment.js` deprecation warning** — cosmetic; unrelated.
- **Persistence gap F-2 from `JE-2026-06-05-4` § 4.3** is not addressed by THIS fix — the venv `.pth` for `pip install -e print_designer` still lives in the backend container's writable layer and is lost on container recreation. This fix recreates the **frontend** container (no impact on backend's venv), but a future `docker compose up -d --force-recreate backend` would still drop the `.pth`. Address in the separate future packet `ERPNext-PrintDesigner-Persistence-1` (not drafted; not authorised by THIS PR).
- **Persistence gap F-1 from `JE-2026-06-05-4` § 4.3** (worker count `GUNICORN_WORKERS=2` env unchanged; SIGTTIN hot-bump to 6 is not persistent) is similarly not addressed.
- **Print Designer UI affordances may differ across versions** — the runbook is authored against Print Designer v1.6.7 (pinned per `JE-2026-06-04-4` § 7.2 Packet 2 shape); the `Edit Format` button in UI-5 may have a different label on other versions; map to the closest equivalent.
- **No PDF rendered by THIS PR.** The fix restores the visual editor; rendering a PDF is the next phase under `ERPNext-CFLR-ProForma-Template-Build-1` (still HELD on its own AUTHORISE).
- **AC-1..AC-11 from design brief `JE-2026-06-05-1` § 9 are NOT validated by THIS PR.** Acceptance evaluation happens at template build time.

---

## § 10 — Standing holds (unchanged by THIS PR)

This fix is operator-paste instructions only + a single Docker volume mount addition for the frontend service. It does NOT close, modify, or accelerate any of:

- **HB-1** (full Phase D operator-approval row for revenue-posting / VAT-active / real-bank / real-client surface) — still **NOT-AUTHORISED**.
- **HB-2** Mauritius-licensed accountant CoA review — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** real (redacted) MU bank CSV reconciliation — **PENDING-OPERATOR**.
- **Full Phase D** ERPNext accounting go-live — HELD.
- **First submitted Sales Invoice on production** (GL posting) — HELD.
- **First email of any ERPNext-generated PDF to a real client** — HELD (`ERPNext-First-Real-Pro-Forma-Send` packet not drafted).
- **`ERPNext-CFLR-ProForma-Template-Build-1`** host-side execution — **HELD** on (a) Anton clearing B-1 (this fix's success) + B-2 (PDF generator decision) so install verdict flips PARTIAL → PASS, (b) separate `AUTHORISE — …` chat DECISION for the build.
- **`ERPNext-PrintDesigner-Persistence-1`** (F-1 + F-2 packet, not drafted) — not authorised.
- **`ERPNext-PrintDesigner-Chrome-Setup-1`** (Chrome backend setup-chrome packet, not drafted) — not authorised.
- **`ERPNext-PrintDesigner-SocketIO-Origin-Fix-1`** (websocket origin allow-list fix, not drafted) — not authorised.
- **Sandbox tear-down** — HELD on the four-condition gate from `JE-2026-06-04-1`.
- All standing holds from `JE-2026-06-05-1..4` § *Standing holds*.

**New holds introduced by THIS PR:** none. This is a fix runbook for a specific identified bug; success flips one item from the existing PARTIAL → PASS state but does not change any held surface.

---

## § 11 — Cross-references

- Authorisation: chat DECISION 2026-06-05 *"Please receive any authorisation required to repair this issue"* — treated as `AUTHORISE — ERPNext-PrintDesigner-Editor-Fix-1`.
- The runbook: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1.md`.
- The PARTIAL state this fix targets: `docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md` (`JE-2026-06-05-4`), specifically § 4.2 blocker B-1 *visual designer canvas verification*.
- Install closure schema applied in the alignment doc: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (`JE-2026-06-05-3`).
- Print Designer evaluation (Packet 2 install shape this fix patches): `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- CFLR design brief (gated on install verdict flip to PASS): `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- CFLR build runbook (also gated on install verdict flip): `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Production-shell setup recipe v1.1: `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that this fix does NOT touch: `JE-2026-06-04-5`.
- Production-shell narrowed-scope authorisation: `JE-2026-06-04-1`.
- Sandbox-preservation rule: `JE-2026-06-04-1` § sandbox-preservation.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Manual Word/Pages pro-forma fallback (canonical client-facing path during PARTIAL install): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/operator-bridge-issues).

---

## § 12 — Verdict per `.cursor/rules/delivery-reality.mdc`

This is a *hybrid* artefact: docs runbook + a host-side fix executed by the operator.

- **For the runbook artefact (THIS PR):** **COMPLETE-AT-PR-MERGE** per `.cursor/rules/delivery-reality.mdc` § docs-only — operator + agent governance; no customer-visible URL to probe by design.
- **For the host-side fix execution:** **FIX-PASS, executed 2026-06-05 05:51 UTC** at L3 keyboard on `corpflow-exec-01-u69678` — recorded as `JE-2026-06-05-7` (closure flip). Evidence captured:
  - `EV-1` execution block output: `PERSISTENT_FIX_DONE` printed; Step 4 `corpflowai-production-frontend-1 Started 16.1s` (only one container recreated); Step 6 confirmed bundle file `1212393 Jun 5 00:29 print_designer.bundle.UDIPLQSC.js` accessible at `sites/assets/print_designer/dist/js/` via the new bind-mount; Step 7 `HTTP 200`; Step 8 9/9 production containers `Up`; Step 9 sandbox preserved 5 days uptime.
  - `EV-2` browser canvas screenshot: Print Designer visual editor rendered — toolbox left, template body middle (`{{ customer_name }}`, `{{ posting_date }}`, `{{ due_date }}`, `{{ status }}`, company Tax ID `C25228280`, line-item table, Grand Total), right panel (Custom Data / Save / Page Settings A4 297×210mm / Page Margins / Header-Footer).
  - `EV-3` browser console: no `bundle 404`, no `PrintDesigner is not a constructor`, only the documented-as-cosmetic SocketIO `Invalid origin` + benign Print Designer image preload warnings.
- **Persistence:** the dual bind-mount lives in the Compose override file and survives container recreation, image upgrade, and `--force-recreate`. No runtime-symlink dependency.
- **Install verdict flip:** `JE-2026-06-05-4` PARTIAL → PASS achieved via this fix (blocker B-1 *visual designer canvas verification* CLOSED). Blocker B-2 *PDF generator decision* remains operator's call (Chrome-vs-wkhtmltopdf), but does not block template build authorisation if Anton accepts wkhtmltopdf fallback for v1.
- **What this unblocks:** Anton's separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION for the pro-forma template build per `JE-2026-06-05-2` runbook. Template build remains HELD on that explicit chat decision; not auto-promoted.

If a future regression appears (editor goes blank again after a Compose change, image upgrade, or `bench` operation), use § 8 *Rollback* to restore the previous override, then re-author with the dual-bind-mount pattern preserved.

---

## § 13 — Change log

- **v2, 2026-06-05** — amendments based on execution outcome (post-FIX-PASS at 05:51 UTC). Changes: § 2.2 final paragraph rewritten — removed incorrect "the `sites/` volume is shared with the `frontend` container" assertion + added the documented-via-execution-evidence finding that nominal Docker volume sharing does NOT translate to filesystem sharing at the `sites/assets/<app>` subpath (different `mtime`, different `assets.json` sizes confirmed seconds apart); § 2.3 fix description updated from "add bind-mount for `apps/print_designer/`" (v1 single-mount) to "add TWO bind-mounts: `apps/print_designer/` AND `sites/assets/print_designer/`" (v2 dual-mount — bypasses volume layer for the asset path); § 4 operator-paste block replaced with the final dual-bind-mount version + Step 7 added curl test for HTTP 200; § 9 added new top-bullet documenting the frappe-docker volume-overlay quirk + implication for any future bind-mounted Frappe app whose assets must be served by nginx; § 12 verdict updated to record FIX-PASS execution at 2026-06-05 05:51 UTC with EV-1..EV-3 evidence + install verdict flip `JE-2026-06-05-4` PARTIAL → PASS recorded as `JE-2026-06-05-7`. The fix is now **persistent across container lifecycle events** (recreation, image upgrade, `--force-recreate`) because both bind-mounts live in the Compose override, not in a writable layer. No change to hard limits, prerequisites, pre-flight, browser smoke, verification matrix, evidence checklist, rollback, standing holds, or cross-references.
- **v1, 2026-06-05** — initial editor-fix runbook. 13 sections covering hard limits + prerequisites PR-1..PR-6 (install PARTIAL per `JE-2026-06-05-4` + production-shell `Up` + sandbox preserved + override file exists + host_name unchanged + standing holds acceptable as HELD) + root cause analysis (§ 2.1 symptom = 404 on hashed `print_designer.bundle.<hash>.js` + `Uncaught TypeError: frappe.ui.PrintDesigner is not a constructor`; § 2.2 architecture mismatch = bind-mount applied to 5 Python services but not to frontend nginx; § 2.3 fix = add `frontend:` to override + `docker compose up -d`) + pre-flight PF-1..PF-5 (SSH + production health + sandbox preservation + override file present + smoking gun confirmation that frontend container's `apps/print_designer/` is empty) + single paste-safe operator block § 4 (auto-discovers compose file list via `docker inspect` + auto-discovers print-designer-mount override path + timestamped backup + heredoc-rewrites override with frontend service added preserving all 5 existing services + `docker compose up -d` recreates frontend only + 15s wait + verification listing of dist JS files inside frontend container + production health re-check + sandbox preservation re-check + final next-step banner) + browser smoke UI-1..UI-7 (incognito window + login + Print Format list + open `Sales Invoice PD Format v2` + click `Edit Format` + confirm visual designer canvas renders + DevTools clean of bundle 404 + ignore pre-existing `microtemplate.js` + SocketIO unrelated errors) + verification matrix FIX-PASS / FIX-PARTIAL / FIX-FAIL + evidence checklist EV-1..EV-6 (block output tail + canvas screenshot + DevTools screenshot + verdict + optional B-2 PDF generator decision + optional closure-flip request) + rollback § 8 (restore most recent timestamped backup + `docker compose up -d`; sandbox / host_name / Print Designer source / 5-service bind-mount / real-client / real-bank / real-payment / VAT / GL surfaces all untouched by rollback) + honest limits (browser cache → incognito mandatory; SocketIO Invalid origin separate future packet; Frappe v15 microtemplate cosmetic; persistence gaps F-1 + F-2 unaddressed; Print Designer UI affordances may vary; no PDF rendered by THIS PR; AC-1..AC-11 not validated by THIS PR) + standing holds unchanged (HB-1..HB-4 / Phase D / first submitted Sales Invoice / first ERPNext-emailed PDF to real client / template build host-side execution / persistence packet / Chrome backend setup packet / SocketIO origin fix packet / sandbox tear-down / all `JE-2026-06-05-1..4` standing holds) + cross-references to 11 sibling docs + verdict per `.cursor/rules/delivery-reality.mdc` = COMPLETE-AT-PR-MERGE for runbook artefact with host-side fix verdict recorded as separate future `JE-2026-06-05-N` row + change log v1 2026-06-05. (`JE-2026-06-05-5`.)

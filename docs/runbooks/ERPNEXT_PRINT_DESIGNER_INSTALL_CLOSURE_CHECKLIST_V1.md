# `ERPNext-PrintDesigner-Install-1` — closure evidence checklist v1

**Status:** Docs / closure checklist only. **No host commands executed by THIS PR. No ERPNext changes. No Print Designer install. No template build. No invoices / GL / VAT / bank / payment gateway / DNS / TLS / SMTP / public-exposure changes by THIS PR. No secrets.**

**Anchor sentinel:** `<!-- ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1 -->`

<!-- ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), on behalf of Anton.
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-05 *"AUTHORISE — ERPNext-PrintDesigner-Install-Closure-Checklist-1"*). Approved scope: docs / checklist only; no host commands; no ERPNext changes; no Print Designer install; no template build; no invoices / GL / VAT / bank / payment-gateway / DNS / TLS / SMTP / public-exposure changes; no secrets.
**Linked JOURNAL row:** `JE-2026-06-05-3` (`docs/decisions/JOURNAL.md`).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `ERPNext-PrintDesigner-Install-Closure-Checklist-1`*.

**Purpose:** Define the **exact evidence checklist** Anton must return on Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) when `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) finishes — so we can close the install packet cleanly **and** decide whether to start the host-side execution of `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).

The checklist is intentionally **short** (15 numbered items C-1..C-15) and **read-only** by design. None of the items require new mutations; they all verify state already produced by the install run.

---

## § 0 — Hard limits honoured by THIS PR

- Zero host commands executed by this PR.
- Zero ERPNext mutation on `corpflow-exec-01-u69678` (`corpflowai-production.localhost` Docker project `corpflowai-production`; live `host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged).
- Zero ERPNext sandbox mutation (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`; sandbox-preservation rule from `JE-2026-06-04-1` honoured).
- Zero Print Designer install (install is `ERPNext-PrintDesigner-Install-1`, a separate authorisation chain).
- Zero template creation, edit, or build.
- Zero Sales Invoice / GL posting / VAT activation / `Tax invoice` / `VAT invoice` wording.
- Zero real bank / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card number / payment-gateway API key / OAuth token added.
- Zero invoices issued.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema.
- Zero pricing / page-copy changes on customer-facing surfaces.
- Zero host commands executed from this L1 Windows laptop session — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered.

---

## § 1 — When to use this checklist

Run § 2 **after** Anton (or the install packet executor) has finished `ERPNext-PrintDesigner-Install-1` on `corpflow-exec-01-u69678` — meaning the install commands have been executed at the L3 keyboard and the runner is ready to declare a verdict.

Use § 3 to translate the C-1..C-15 results into one of three closure verdicts (`PASS` / `PARTIAL` / `FAIL`). The verdict gates whether the **build runbook** (`ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` § 1 PR-2) may run next.

**Do not** run this checklist *before* the install — that produces meaningless data. **Do not** treat a `PASS` here as authorisation to run the build runbook; the build runbook requires its own `AUTHORISE — …` chat DECISION (this checklist only **enables** that decision).

---

## § 2 — Closure checklist (C-1..C-15)

For each item, paste the **Evidence** column verbatim into the Bridge #249 closure comment. The orchestrator + commands assume Anton is logged into `corpflow-exec-01-u69678` via SSH (a working L3 session) and that the SSH tunnel `ssh -L 8081:localhost:8081` (per recipe § 17) is live for the UI items.

### § 2.1 Project health (C-1, C-2)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-1** | Production project health | `docker compose -p corpflowai-production ps` | All 9 containers `Up`: `backend`, `db`, `frontend`, `queue-long`, `queue-short`, `redis-cache`, `redis-queue`, `scheduler`, `websocket`. No `Exit`, no `Restarting`, no missing rows. | Full command output (10 lines: 1 header + 9 service rows). |
| **C-2** | Sandbox project health (preservation gate per `JE-2026-06-04-1`) | `docker compose -p corpflowai-sandbox ps` | All sandbox containers `Up` (count + names match the state Anton remembers from pre-install). Sandbox **must not** have been torn down by the install. | Full command output. |

### § 2.2 Print Designer presence (C-3, C-4, C-5)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-3** | `print_designer` app installed on the production site | `docker compose -p corpflowai-production exec -T backend bench --site corpflowai-production.localhost list-apps` | Output includes a line beginning `print_designer` (alongside `frappe` and `erpnext`). | Full command output (typically 3 lines). |
| **C-4** | ERPNext UI loads through SSH tunnel | Open `http://localhost:8081/login` in the browser on Anton's laptop. | Login page renders cleanly (HTML title `Login | ERPNext`). No 502 / 504 / blank page. After login as `Administrator` (password from `~/.erpnext-production-credentials` on box — **never paste in chat**), the desk loads at `http://localhost:8081/app`. | Screenshot of the desk landing page (the top bar showing `Administrator` is enough — **redact** anything sensitive in the URL/sidebar if it appears). |
| **C-5** | Print Designer UI / menu visible | In the ERPNext desk search bar, type `Print Designer`; **or** visit `http://localhost:8081/printdesigner` directly. | Print Designer landing page loads (empty list of templates is fine for a fresh install). No 404 / 500. Print Designer entry appears in the global search dropdown. | Screenshot of the Print Designer landing page (URL bar + page header visible). |

### § 2.3 PDF backend (C-6)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-6** | Chrome PDF backend status | ERPNext desk → Settings → **Print Settings** → look for `Pdf Generator`. **Or** open any Print Format record (e.g. the placeholder `CFLR Pro-forma Invoice` from recipe § 13 if it exists) → check the `Pdf Generator` dropdown. | Either: (a) `Chrome` appears in the dropdown options (preferred per `JE-2026-06-04-4` § 4 Option A); **or** (b) only `wkhtmltopdf` is available (acceptable transitional fallback because `JE-2026-06-04-5` host_name fix is already live; the template build runbook UI-CREATE-7 documents this fallback path). | Screenshot of the `Pdf Generator` dropdown showing the available options. State explicitly in the Bridge #249 comment which path applies: `Chrome present` or `wkhtmltopdf only — Chrome not installed`. If `Chrome present`, also note whether `bench setup-chrome` was run only on `backend` (sufficient for interactive render) or on `backend` + `queue-long` + `queue-short` + `scheduler` (required if background-rendered PDFs are ever attached to emails — out of scope for `ERPNext-PrintDesigner-Install-1`). |

### § 2.4 host_name preservation (C-7)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-7** | `host_name` remains `http://frontend:8080` per `JE-2026-06-04-5` | `docker compose -p corpflowai-production exec -T backend bench --site corpflowai-production.localhost show-config \| grep -i host_name` **or** `cat sites/corpflowai-production.localhost/site_config.json \| grep -i host_name` from inside the backend container. | Output contains `host_name = http://frontend:8080` (or the JSON `"host_name": "http://frontend:8080"`). **Not** `frontend:8081`, **not** `localhost`, **not** a public hostname. | Command output (single line is enough). |

### § 2.5 No real data / surfaces created (C-8..C-13)

These are **read-only safety gates** confirming `ERPNext-PrintDesigner-Install-1` honoured its own scope (install only — no business data added). The pass condition for each is **zero new rows beyond the test surfaces from recipe § 11 / § 15 / § 16**.

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-8** | No real Customer created | ERPNext desk → Selling → **Customer** list. | Only `Test Buyer (CFLR-DRY-RUN)` from recipe § 15 (if recipe § 15 ran). **No** real client names. | Screenshot of the Customer list. |
| **C-8b** | No real Quotation created beyond the recipe § 16 test row | ERPNext desk → Selling → **Quotation** list. | Either zero rows OR only the recipe § 16 test Quotation with `customer_remarks` sentinel `TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT` (per `JE-2026-06-04-6` correction). All rows must be `docstatus=0` (Draft). | Screenshot of the Quotation list. |
| **C-9** | No submitted Sales Invoice | ERPNext desk → Accounts → **Sales Invoice** list → filter by `Status = Submitted` or `docstatus = 1`. | **Zero** rows. | Screenshot of the empty filtered list (the list view with the filter visible counts as evidence). |
| **C-10** | No GL posting | ERPNext desk → Accounts → **General Ledger** → run the report for the install date range (today). | Zero rows for any account. (Alternatively: `bench --site corpflowai-production.localhost execute frappe.client.get_count --args "['GL Entry']"` returns `0`.) | Screenshot of the empty GL report, **or** the `get_count` command output. |
| **C-11** | No VAT / tax invoice activation | ERPNext desk → Setup → **Sales Taxes and Charges Template** list AND Setup → **Tax Category** list. | Either zero rows in both, OR only ERPNext's stock `Standard` upstream defaults (no active VAT line). **No** template named `VAT 15%` / `MU VAT` / `Tax invoice` / similar. | Screenshot of both lists. |
| **C-12** | No bank / payment-gateway setup | ERPNext desk → (a) Accounts → **Chart of Accounts** → expand `Bank Accounts` node; (b) Accounts → **Payment Gateway Account** list; (c) Setup → **Bank Account** list. | (a) Either no Bank-type accounts, or only the broad placeholder accounts seeded by recipe § 10 (no real digits). (b) Zero Payment Gateway Account rows. (c) Zero Bank Account rows with real IBAN / SWIFT / account-number digits. | Screenshots of all three. |
| **C-13** | No public exposure | (a) Confirm `http://localhost:8081` is reachable **only** through the SSH tunnel — not from any other machine; (b) Confirm `corpflowai-production.localhost` is not added to public DNS (Cloudflare / Vercel / any provider — the operator confirms by recall: this packet does not query DNS); (c) `docker compose -p corpflowai-production port frontend` shows the frontend bound to `127.0.0.1:8081` on the host, **not** `0.0.0.0:8081`. | (a) Attempting to reach the production ERPNext from another device on the LAN fails; (b) No public DNS record added by the install; (c) `docker compose port` output shows loopback-only binding. | (c) output as the primary evidence; (a) + (b) recorded as one-line operator confirmation in the Bridge #249 comment. |

### § 2.6 Errors / warnings captured (C-14)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-14** | Errors / warnings captured from the install run | (a) Re-read the install runner's terminal output (or capture if still live) for any `ERROR`, `WARN`, `Traceback`, `failed`, `denied` lines. (b) Tail the backend logs: `docker compose -p corpflowai-production logs --tail 200 backend`. (c) Tail the scheduler + queue logs: same command with `scheduler` / `queue-long` / `queue-short`. | All `ERROR` / `Traceback` lines are either (i) **absent**, or (ii) **explained** in the Bridge #249 comment with a clear "benign because …" note (e.g. expected migration log warnings, expected one-time index rebuilds). Any unexplained error → verdict drops to PARTIAL or FAIL per § 3. | Paste the relevant log excerpt (no full log dumps — just the lines that matter, ~10-50 lines max). |

### § 2.7 Final verdict (C-15)

| # | Check | How to confirm | Pass condition | Evidence to attach |
|---|---|---|---|---|
| **C-15** | Final install verdict | Anton applies § 3 decision tree using C-1..C-14 results. | One of `PASS` / `PARTIAL` / `FAIL` (see § 3). | One-line verdict in the Bridge #249 comment, followed by a one-sentence reason. |

---

## § 3 — Verdict decision tree (PASS / PARTIAL / FAIL)

Apply in order; first match wins.

| Verdict | Condition |
|---|---|
| **FAIL** | Any of: C-1 production not all `Up`; C-3 `print_designer` missing from `list-apps`; C-4 ERPNext UI does not load; C-7 `host_name` differs from `http://frontend:8080`; **any** of C-8..C-13 shows new real-surface data / public exposure / VAT activation / bank-gateway setup created by the install; C-14 unexplained `Traceback` / `ERROR` lines that block subsequent use. |
| **PARTIAL** | C-1 + C-3 + C-4 + C-7 all PASS **and** C-8..C-13 all clean **but** one of: C-2 sandbox state changed in any way (sandbox-preservation drift); C-5 Print Designer UI loads but search-bar discovery fails; C-6 Chrome backend unavailable (transitional wkhtmltopdf-only fallback acceptable but worth flagging); C-14 explained-but-noisy warnings worth investigating before relying on the install. |
| **PASS** | C-1..C-14 all clean (or C-6 Chrome-vs-wkhtmltopdf explicitly noted with no other failures). Install is closed and the host-side execution of `ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` may be **AUTHORISED** in a separate Bridge #249 chat DECISION. |

**Important:** a `PASS` verdict on this checklist closes the **install packet**. It does **not** authorise the template build runbook to run — that requires its own `AUTHORISE — …` chat DECISION (as the build runbook § 1 PR-2 already specifies). The checklist's role is to give Anton the evidence needed to make that build-authorisation decision.

---

## § 4 — Standing holds (unchanged by THIS PR)

This checklist is read-only documentation. It does NOT close, modify, or accelerate any of:

- **HB-1** (full Phase D beyond narrowed shell-setup) — still **NOT-AUTHORISED**.
- **HB-2** Mauritius-licensed accountant CoA review — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** real (redacted) MU bank CSV reconciliation — **PENDING-OPERATOR**.
- Full Phase D ERPNext accounting go-live — **HELD**.
- First submitted Sales Invoice on production (GL posting) — **HELD**.
- First email of any ERPNext-generated PDF to a real client — **HELD**.
- `ERPNext-PrintDesigner-Install-1` itself — **still its own authorisation chain**; this checklist only standardises **closure**, not authorisation.
- Sandbox tear-down four-condition gate from `JE-2026-06-04-1` — **HELD**.
- All standing holds from `JE-2026-06-05-1` § *Standing holds* and `JE-2026-06-05-2`.

**New holds introduced by this PR:** none.

---

## § 5 — Cross-references

- The install packet this checklist closes: `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2).
- The build runbook this checklist gates: `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- The design specification it serves: `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- Production-shell setup recipe v1.1 (SSH tunnel § 17 + placeholder Print Format § 13 + test customer § 15 + test Quotation § 16): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that C-7 verifies preserved: `JE-2026-06-04-5`.
- Sandbox-preservation rule that C-2 verifies preserved: `JE-2026-06-04-1`.
- Execution boundary (L1/L2/L3): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## § 6 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE-AT-PR-MERGE** for the *closure-checklist artefact* — operator + agent governance; no customer-visible URL to probe by design. The host-side execution of the install (which this checklist closes) is a separate piece of work on its own authorisation chain (`ERPNext-PrintDesigner-Install-1`); the closure verdict it produces is recorded as its own future `JE-YYYY-MM-DD-N` row on Bridge #249.

---

## § 7 — Change log

- **v1, 2026-06-05** — initial closure checklist. 7 sections. § 0 hard limits (12 explicit out-of-scope categories). § 1 when to run (after install commands executed at L3 keyboard; not before; PASS here does not authorise the build runbook). § 2 the 15-item closure checklist split into 7 sub-sections: § 2.1 project health C-1..C-2 (`docker compose ps` for production 9-containers + sandbox preservation per `JE-2026-06-04-1`); § 2.2 Print Designer presence C-3..C-5 (`bench list-apps` includes `print_designer` + ERPNext UI loads at `http://localhost:8081/login` via SSH tunnel + Print Designer UI at `/printdesigner`); § 2.3 PDF backend C-6 (Chrome present preferred OR wkhtmltopdf-only acceptable transitional fallback per `JE-2026-06-04-5` host_name fix; note re `bench setup-chrome` per-container requirement for background-rendered PDFs); § 2.4 host_name preservation C-7 (`http://frontend:8080` from `JE-2026-06-04-5` unchanged); § 2.5 no real data / surfaces C-8..C-13 (no real Customer beyond `Test Buyer (CFLR-DRY-RUN)` / no real Quotation beyond recipe § 16 test row at `docstatus=0` / no submitted Sales Invoice / no GL posting / no VAT activation / no bank or payment-gateway setup / no public exposure — frontend bound `127.0.0.1:8081` only); § 2.6 errors / warnings C-14 (terminal output + backend + scheduler + queue log tails; explained-or-absent rule); § 2.7 final verdict C-15. § 3 decision tree PASS / PARTIAL / FAIL (FAIL on any hard-rule violation; PARTIAL on sandbox drift / UI-discovery gap / Chrome unavailability / noisy warnings; PASS on all-clean — but PASS does NOT authorise the build runbook, which requires its own `AUTHORISE — …` chat DECISION). § 4 standing holds unchanged. § 5 cross-references to install packet + build runbook + design brief + recipe v1.1 + host_name fix JE + sandbox-preservation JE + execution-boundary JE + Bridge #249. § 6 verdict per `.cursor/rules/delivery-reality.mdc` § docs-only = COMPLETE-AT-PR-MERGE. § 7 change log. (`JE-2026-06-05-3`.)

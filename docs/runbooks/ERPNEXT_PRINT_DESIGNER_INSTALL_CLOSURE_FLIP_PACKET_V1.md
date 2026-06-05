# ERPNext Print Designer — Install Closure Flip Packet v1

**Packet name:** `ERPNext-PrintDesigner-Install-Closure-Flip-1`
**JE-ID:** `JE-2026-06-05-8`
**Status:** **CLOSED — install verdict flip recorded.**
**Scope:** **Docs-only.** No host commands. No ERPNext changes. No template build. No customers / quotations / invoices / GL / VAT / bank / payment-gateway / DNS / TLS / SMTP / public-exposure changes. No secrets.
**Supersedes / clarifies:** `JE-2026-06-05-7` (which performed the verdict flip mechanically but left `B-2` PDF-generator decision as `DEFERRED-OPERATOR-CHOICE`).

---

## § 0 — Hard limits honoured by THIS PR

Zero host commands executed. Zero ERPNext production-shell mutation. Zero ERPNext sandbox mutation. Zero Print Designer install change. Zero template creation / edit / build. Zero Sales Invoice / GL posting / VAT activation. Zero `Tax invoice` / `VAT invoice` wording. Zero real bank / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card / payment-gateway / OAuth / KYC data. Zero invoices issued. Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`. Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema. Zero pricing / offer / page-copy changes on customer-facing surfaces. Zero new public exposure. Zero new persistent surface beyond this docs file + a `JOURNAL.md` row + a `chat_history.md` entry.

---

## § 1 — Why this packet exists

`JE-2026-06-05-7` (merged via PR #307) recorded the install-verdict flip `JE-2026-06-05-4` **PARTIAL → PASS** based on `FIX-PASS` evidence at 2026-06-05 05:51 UTC on `corpflow-exec-01-u69678`:

- **Blocker `B-1`** *visual designer canvas verification* — **CLOSED**. `EV-2` browser canvas screenshot of `Sales Invoice PD Format v2` rendered in the Print Designer visual editor with proper Jinja delimiters + property panel; `EV-3` browser console clean of `bundle 404` + `frappe.ui.PrintDesigner is not a constructor`.
- **Blocker `B-2`** *PDF generator decision* — **DEFERRED-OPERATOR-CHOICE** between **(a)** accept `wkhtmltopdf` fallback for v1 leveraging the `JE-2026-06-04-5` `host_name = http://frontend:8080` fix, **OR** **(b)** authorise a future `ERPNext-PrintDesigner-Chrome-Setup-1` packet to run `bench setup-chrome` on backend + scheduler + worker containers.

This packet resolves `B-2` so the install-closure record is complete and unambiguous, and so the next AUTHORISE chat DECISION (`ERPNext-CFLR-ProForma-Template-Build-1`) rests only on Anton's explicit go-ahead — not on a lingering operator-choice ambiguity.

---

## § 2 — Operator decision recorded (Anton, 2026-06-05)

Anton's chat DECISION (Cursor session 2026-06-05 *"Decision: choose B. … B-2 PDF path = wkhtmltopdf fallback for v1 … Defer Chrome setup for now."*):

- **`B-2` = (a) `wkhtmltopdf` fallback for v1.** Locked.
- **Chrome backend = deferred.** Future `ERPNext-PrintDesigner-Chrome-Setup-1` packet is **not drafted**, **not authorised**, and **not on any active queue**. Anton may authorise it later if a v2 template needs a Chrome-rendered PDF.

This decision is recorded under `JE-2026-06-05-8` in `docs/decisions/JOURNAL.md` and in `artifacts/chat_history.md` (this PR).

---

## § 3 — Composite install verdict (final, locked)

| Closure-checklist item | Status | Anchor |
|---|---|---|
| `C-1` Production project health | **PASS** | `JE-2026-06-05-4` § 2.1 |
| `C-2` Sandbox project health (preserved) | **PASS** | `JE-2026-06-05-4` § 2.2 |
| `C-3` `bench list-apps` includes `print_designer` | **PASS** | `JE-2026-06-05-4` § 2.3 |
| `C-4` ERPNext UI loads through SSH tunnel | **PASS** | `JE-2026-06-05-4` § 2.4 |
| `C-5` Print Designer UI / menu visible | **PASS** | `JE-2026-06-05-4` § 2.5 + `JE-2026-06-05-7` `EV-2` (canvas now renders end-to-end) |
| `C-6` Chrome PDF backend status | **DEFERRED** | `JE-2026-06-05-8` § 2 — `B-2 = (a)`; Chrome backend explicitly deferred to future unauthorised `ERPNext-PrintDesigner-Chrome-Setup-1` packet |
| `C-7` `host_name` remains `http://frontend:8080` | **PASS** | `JE-2026-06-05-4` § 2.7 (post-`JE-2026-06-04-5` value preserved) |
| `C-8` No real Customer / Quotation / Sales Invoice / Payment Entry created | **PASS** | `JE-2026-06-05-4` § 2.8 |
| `C-9` No submitted Sales Invoice | **PASS** | `JE-2026-06-05-4` § 2.9 |
| `C-10` No GL posting | **PASS** | `JE-2026-06-05-4` § 2.10 |
| `C-11` No VAT / tax-invoice activation | **PASS** | `JE-2026-06-05-4` § 2.11 |
| `C-12` No bank / payment-gateway setup | **PASS** | `JE-2026-06-05-4` § 2.12 |
| `C-13` No public exposure | **PASS** | `JE-2026-06-05-4` § 2.13 (frontend remains `127.0.0.1:8081->8080/tcp` loopback) |
| `C-14` Errors / warnings captured | **PASS** | `JE-2026-06-05-4` § 2.14 + `JE-2026-06-05-7` `EV-3` (only documented-as-cosmetic console items remain) |
| `C-15` Final install verdict | **PASS** | THIS row (`JE-2026-06-05-8`) — supersedes the prior `PARTIAL` from `JE-2026-06-05-4` and confirms the flip recorded in `JE-2026-06-05-7` is now complete with no DEFERRED-OPERATOR-CHOICE remaining |

**Composite install verdict: `PASS`.** No remaining blockers for the v1 install workstream.

---

## § 4 — What `B-2 = (a) wkhtmltopdf-for-v1` implies operationally

This is reasoning only — no execution by THIS PR.

- **For the v1 template build** (`JE-2026-06-05-2` runbook, when AUTHORISE is issued):
  - `UI-CREATE-7` will set `PDF Generator = wkhtmltopdf` on the Print Format record (the runbook already documents this as the explicit fallback path when `UI-PF-6` Chrome check fails — see `ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` § 5).
  - `UI-PF-6` (Chrome PDF backend pre-flight) is **expected to fail** because `bench setup-chrome` has not been run. The fallback is acceptable for v1 *only because* the `JE-2026-06-04-5` `host_name = http://frontend:8080` fix is live (the original `wkhtmltopdf ConnectionRefusedError` is gone).
  - `§ 8.1 PDF smoke render` `V-5` (`No 'wkhtmltopdf' error in container logs`) will become the critical PASS gate for the v1 PDF render — replacing the previously-preferred Chrome-PDF path.
  - `V-3` PDF size range (30,000–200,000 bytes typical) may need a slight widening for `wkhtmltopdf` output vs `Chrome` output. If the v1 render lands outside that range, the build packet's verification matrix is the right place to record the observation; we do not pre-widen V-3 in THIS PR.
  - `AC-2` (PDF renders cleanly) is gated on `wkhtmltopdf` output meeting the V-1..V-7 matrix; if Anton finds the PDF visually unacceptable at template-build time, the right escalation is to draft `ERPNext-PrintDesigner-Chrome-Setup-1` (not authorised here) and re-render with `PDF Generator = Chrome`.

- **For email delivery of an ERPNext-rendered PDF to a real client** (`ERPNext-First-Real-Pro-Forma-Send` — packet not drafted, not authorised):
  - Background-rendered PDFs (e.g., scheduled email attachments) are processed by the queue / scheduler containers, which **also** do not have Chrome installed. If first-real-send uses background rendering, `wkhtmltopdf` will run there too. This is acceptable for v1; the same fallback logic applies.

- **For Sales Invoice / GL / VAT / real bank surfaces** — **HELD**. The `B-2 = (a)` decision applies only to the PDF rendering backend on the v1 template; it does not lift any of the standing accounting holds (`HB-1..HB-4`).

---

## § 5 — Chrome backend — explicit deferral

The future `ERPNext-PrintDesigner-Chrome-Setup-1` packet is **not** authorised by THIS PR. It is added to the standing-holds list with the following draft scope so a future operator session knows what it would entail (this is documentation of intent, **not** an authorisation):

| Field | Value |
|---|---|
| Trigger | Anton issues `AUTHORISE — ERPNext-PrintDesigner-Chrome-Setup-1` chat DECISION on Bridge #249. |
| Prerequisite | v1 template render produced an unacceptable PDF via `wkhtmltopdf`, **or** Anton wants Chrome-quality output before v1 client send. |
| Scope (draft) | Run `bench setup-chrome` on the `backend` container; optionally repeat on `scheduler` + `queue-short` + `queue-long` + `websocket` if background email rendering is in scope at that time; verify `chromium_binary_path` config; flip per-Print-Format `PDF Generator = Chrome` on the v1 template; re-run `§ 8.1 PDF smoke render` `V-1..V-7`. |
| Risk | Adds ~150 MB Chromium binary per container; mild container restart required; persistence concern unless `setup-chrome` is captured in a Compose layer or post-install bind-mount (analogous to the dual-bind-mount pattern from `JE-2026-06-05-7` v2). |
| What it does NOT do | No Sales Invoice / GL / VAT / bank / payment / DNS / TLS / SMTP / public-exposure change. No template content edit. |
| Authorisation status | **NOT AUTHORISED.** |
| Operator owner | Anton at L3 keyboard. |
| Cursor role | Author the operator-paste runbook when AUTHORISE is issued; no host commands by Cursor. |

---

## § 6 — What this packet unblocks

- Anton's separate `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION is now the **only** remaining gate before the v1 pro-forma template can be built per `JE-2026-06-05-2` runbook. The install-closure half of the gate is now fully clean (`PASS`, no `DEFERRED-OPERATOR-CHOICE`).
- The wkhtmltopdf-vs-Chrome decision is locked, so the build packet does not need to re-ask the operator at `UI-CREATE-7`.

**Template build itself is still HELD** on that explicit chat DECISION. Nothing in THIS PR initiates the build.

---

## § 7 — Standing holds (unchanged by THIS PR)

This packet records a verdict decision; it does not lift any operational hold. All of the following remain HELD exactly as recorded in `JE-2026-06-05-7`:

`HB-1` Phase D operator-approval row for revenue-posting / VAT-active / real-bank / real-client surface · `HB-2` Mauritius-licensed accountant CoA review · `HB-3` VAT decision recorded · `HB-4` real (redacted) MU bank CSV reconciliation · full Phase D ERPNext accounting go-live · first submitted Sales Invoice on production (GL posting) · first email of any ERPNext-generated PDF to a real client (`ERPNext-First-Real-Pro-Forma-Send` packet not drafted) · `ERPNext-PrintDesigner-Persistence-1` (`F-1` worker count + `F-2` venv `.pth` packet not drafted) · **`ERPNext-PrintDesigner-Chrome-Setup-1` (per § 5 — explicitly deferred by THIS PR; not drafted; not authorised)** · `ERPNext-PrintDesigner-SocketIO-Origin-Fix-1` (websocket origin allow-list fix not drafted) · sandbox tear-down four-condition gate from `JE-2026-06-04-1` · Phase C² · runbook § 8.1 hardening · scheduler · payment gateway configuration · Lead Rescue wording adoption (`LR-Pay-1`) · SBM application submission · `PAY-SBM-3` · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM / SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift.

**New holds introduced by THIS PR:** none — this packet records a decision + a verdict closure; it does not authorise any new work.

---

## § 8 — Honest limits

- THIS PR does not run `bench` commands, does not modify Compose overrides, does not edit Print Format records, and does not render any PDF. The actual PDF rendering decision (`wkhtmltopdf` vs `Chrome`) materialises only at template-build time when Anton issues the next AUTHORISE.
- The locked `B-2 = (a)` decision applies to **v1 only**. v2+ templates may revisit the choice and may trigger the deferred `ERPNext-PrintDesigner-Chrome-Setup-1` packet.
- If a future regression makes `wkhtmltopdf` rendering fail (e.g., a frappe-docker image upgrade that breaks the `host_name` fix), the v1 PDF path will break; recovery is either re-verify `host_name` config per `JE-2026-06-04-5` or escalate to the Chrome-setup packet. This packet does not promise the `wkhtmltopdf` path is risk-free forever; it promises it is the accepted path **for v1 build now**.
- The `JOURNAL.md` row for `JE-2026-06-05-4` currently appears twice (line 21 and line 22) due to PR #306 + PR #307 both squash-merging the JE-4 row addition; this is a cosmetic artefact and is **not** addressed by THIS PR (separate one-line janitorial cleanup if desired).

---

## § 9 — Rollback

To revoke this decision:

- A future superseding `JE-YYYY-MM-DD-N` row that explicitly references and reverses `JE-2026-06-05-8` (preferred — keeps THIS row as historical record of an interim decision), **OR**
- A single revert PR of THIS PR's merge commit (atomically removes this runbook + the JE-8 row + the chat_history entry; the `JE-2026-06-05-7` PARTIAL → PASS verdict flip is **NOT** reverted by such a revert — it lives in PR #307's merge commit, independent of this one).

Reverting THIS PR does **not** undo any host-side state, because no host-side state was created. The ERPNext production-shell live state, ERPNext sandbox state, CorpFlowAI runtime, Vercel project, Postgres / Neon database, Prisma schema, public pages, payment posture, DNS, mail-routing, and any local pro-forma PDFs already issued off-repo are all unchanged by both the merge and the revert of THIS PR.

---

## § 10 — Cross-references

- `JE-2026-06-05-4` — workstream alignment that originally recorded install verdict `PARTIAL` (`docs/finance/ERPNEXT_PRINT_DESIGNER_WORKSTREAM_ALIGNMENT_2026_06_05.md`).
- `JE-2026-06-05-3` — canonical 15-item closure checklist (`docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md`).
- `JE-2026-06-05-5` + `JE-2026-06-05-7` — editor-fix runbook v1 → v2 + FIX-PASS execution + verdict flip mechanism (`docs/runbooks/ERPNEXT_PRINT_DESIGNER_EDITOR_FIX_PACKET_V1.md`).
- `JE-2026-06-05-2` — pro-forma template build packet (`docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md`) — `UI-CREATE-7` is the operator step that will materialise the `wkhtmltopdf` choice; `§ 8.1` `V-5` is the PASS gate.
- `JE-2026-06-04-5` — `host_name = http://frontend:8080` fix that makes `wkhtmltopdf` rendering viable.
- `JE-2026-06-04-4` § 7.2 — Packet 2 install (the original ERPNext-PrintDesigner-Install-1 authorisation).
- `JE-2026-06-05-1` — pro-forma design brief (`docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md`).
- `JE-2026-06-05-6` — Mauritius sales activation pack (`docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md`) — operational continuity while ERPNext is being readied.
- Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- `.cursor/rules/delivery-reality.mdc` — verdict framework.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 / L2 / L3 execution boundaries.

---

## § 11 — Verdict per `.cursor/rules/delivery-reality.mdc`

This is a **docs-only** artefact (decision-record packet).

- **For the docs artefact (THIS PR):** **COMPLETE-AT-PR-MERGE** per `.cursor/rules/delivery-reality.mdc` § docs-only — operator + agent governance; no customer-visible URL to probe by design.
- **For the install closure flip itself:** **COMPLETE** — `JE-2026-06-05-4` PARTIAL → `JE-2026-06-05-7` PASS (mechanically flipped) → `JE-2026-06-05-8` PASS with `B-2` locked at `wkhtmltopdf-for-v1` + Chrome deferred (operator-choice ambiguity resolved). No `DEFERRED-OPERATOR-CHOICE` remains on the install workstream.
- **For the template build:** **HELD** on a separate explicit `AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-1` chat DECISION. Not initiated by THIS PR.

---

## § 12 — Change log

- **v1, 2026-06-05** — initial closure-flip packet. Records `B-2 = (a) wkhtmltopdf-for-v1` decision; explicitly defers Chrome backend to future `ERPNext-PrintDesigner-Chrome-Setup-1` packet (not drafted, not authorised); finalises composite install verdict at `PASS` with no DEFERRED-OPERATOR-CHOICE remaining; adds `ERPNext-PrintDesigner-Chrome-Setup-1` to standing holds with draft scope. No change to hard limits, standing holds (other than the new Chrome-setup hold), or any operational surface. (`JE-2026-06-05-8`.)

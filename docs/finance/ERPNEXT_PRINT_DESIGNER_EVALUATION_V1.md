# ERPNext Print Designer evaluation (v1)

**Status:** DECISION RECORDED — 2026-06-04 — research / evaluation only; **no installation occurred**, **no ERPNext production-shell mutation occurred**, **no SSH commands were executed during the evaluation**.
**Authorisation:** Anton DECISION on 2026-06-04 — `AUTHORISE — ERPNext-Print-Designer-Evaluation-1` (research/evaluation only unless separately authorised).
**Sources of truth this doc commits to:** the verdict matrix in § 4 and the future-packet shapes in § 7. Anything outside those sections is supporting research.
**Anchor sentinel:** `<!-- ERPNEXT_PRINT_DESIGNER_EVALUATION_V1 -->`

<!-- ERPNEXT_PRINT_DESIGNER_EVALUATION_V1 -->

**Why this doc exists:** Anton attempted to configure ERPNext classic Letter Head / Print Format manually on `corpflowai-production.localhost` and hit four symptoms (image scaling unreliable, script/comment text appearing in printed output, PDF generation failing with `wkhtmltopdf ConnectionRefusedError`, manual UI editing too error-prone). Anton authorised an evaluation packet to decide whether Frappe Print Designer or a similar PDF/document design system should be used for CorpFlowAI client-facing ERPNext documents.

---

## 1. Scope (what this evaluation is, what it is not)

**This evaluation is:**

- Research only.
- A decision artefact selecting **one** path from a five-option menu (A–E in § 4).
- A diagnosis of the four in-flight symptoms Anton reported.
- A definition of the two future operator-paste packets that operationalise the chosen path.

**This evaluation is NOT:**

- An installation of Print Designer (forbidden by the authorisation; bounded by `JE-2026-06-04-1` 12-point hard contract).
- A mutation of the ERPNext production shell on `corpflow-exec-01-u69678`.
- A change to any CorpFlowAI runtime / Vercel / DNS / Postgres / Neon / n8n / Plausible / Telegram / payment / public surface.
- A repo-runtime change. No edits to `api/` / `lib/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `core/engine/` / `.env*` / `.github/` / `package*.json` / `tsconfig*` / `vercel.json` / `next.config*`.
- An authorisation to issue or send any client-facing pro-forma / invoice.

---

## 2. Sources consulted (live web research, 2026-06-04)

| # | Source | What it confirmed |
|---|---|---|
| S1 | `frappe/print_designer` GitHub repo + `README.md` | Print Designer is an official Frappe-team project. README warning: *"print designer is only compatible with develop and V15 version of frappe framework."* Latest stable release **v1.6.7** (2026-02-10). 421 GitHub stars. Self-hosted install path documented. |
| S2 | Print Designer install guides (`techsolvo.com` + YouTube install walkthrough) | Standard install: `bench get-app https://github.com/frappe/print_designer` → `bench --site <site> install-app print_designer` → `bench build --app print_designer` → `bench migrate`. Installs **into the existing site**, not as a separate site. |
| S3 | `frappe/print_designer` PR #399 — *"feat: Chrome PDF Generator"* (merged) | Print Designer added a Chromium-based PDF backend as an alternative to wkhtmltopdf. Benchmark: **2.21–2.79× faster** generation, **2.27–2.73× lower CPU**. Toggleable per Print Format via `pdf_generator` field. Frappe Cloud explicitly *"not supported for now"* for the Chrome backend. |
| S4 | `frappe/frappe` PR #35812 + Issue #35546 | Chrome PDF backend is being upstreamed into Frappe core (`pdf_generator` field on Print Settings; v15 has it via Print Designer; v16 ships it natively). Issue #35546 flags that v16 still downloads Chromium into the bench directory rather than using an OS package — production deployments should install `chromium-headless-shell` as a system package and set `chromium_binary_path` in `common_site_config.json` instead. |
| S5 | `frappe/erpnext` Issue #36018 + `frappe/frappe_docker` Issue #1589 + Aakvatech *"Fix ERPNext PDF Letterhead Issues"* | The `wkhtmltopdf ConnectionRefusedError` is a Frappe-Docker `host_name` mismatch. Fix: set `host_name` in `sites/<site>/site_config.json` to a URL the backend container can reach internally (typically `http://frontend:8080` for the standard Frappe Docker network), or set the public-facing host without protocol so both PDF generation and email links work. wkhtmltopdf is officially abandoned (repo archived 2023). |

All five sources were read live on 2026-06-04 from the assistant's L1 laptop session; none required SSH access to `corpflow-exec-01-u69678`.

---

## 3. Diagnosis of the four in-flight symptoms

| Symptom | Real cause | Is Letter Head at fault? |
|---|---|---|
| `wkhtmltopdf ConnectionRefusedError` during PDF generation | `host_name` in `sites/corpflowai-production.localhost/site_config.json` either missing or set to the loopback hostname `corpflowai-production.localhost`, which the **backend container cannot resolve via Docker DNS** — backend resolves the Compose service name (`frontend`) but not the host's loopback alias. wkhtmltopdf, running inside the backend container, tries to fetch its own site URL to render dynamic content (CSRF token, image src URLs, asset paths) and aborts when the lookup fails. | **NO.** Docker networking + Frappe site_config issue. |
| Image scaling unreliable in Letter Head | wkhtmltopdf 0.12.6 uses an abandoned QtWebKit fork (last upstream commit 2023, repo archived). Does not honour modern CSS sizing (`max-width: 100%`, `object-fit`, `aspect-ratio`). Images render at their intrinsic pixel size unless explicitly given `width`/`height` in pixels. **Also** affected by the `host_name` failure (a broken image fallback can look like "scaling failed"). | **Partially.** Letter Head HTML field accepts modern CSS that wkhtmltopdf ignores; inherent engine limitation, not the doctype. |
| Script / comment text appearing in printed document | Letter Head `Source` dropdown was almost certainly left on `HTML` mode while raw text or HTML comment markers were pasted into a field that expects either a self-contained HTML fragment or a Jinja template. Comment markers (`<!-- … -->`) survive wkhtmltopdf; raw `<script>…</script>` tag contents do not execute server-side and leak as text. | **Yes — UI confusion.** Letter Head has both Source = `HTML` and Source = `Image` modes; both editors are unreliable for non-developers because they expect clean HTML without comment-bleed-through. |
| Manual UI editing too error-prone | Letter Head + Print Format UI was built for accountants tweaking margins, not for designers building branded marketing-quality artefacts. The Print Format editor offers raw Jinja + raw HTML in a single textarea — no preview, no syntax highlighting, no template library. For pro-forma quality, this is the wrong tool. | **Yes — inherent UX limit.** Frappe themselves built Print Designer specifically because the classic editor is *"easy to use, and you can easily create basic formats. If you need more customisable formats with complex layouts and alignment, you must create a custom format with code, which can take days or weeks"* (verbatim from `frappe/print_designer` README). |

**One-sentence root cause:** the immediate `ConnectionRefusedError` is a Docker `host_name` fix; the underlying ergonomics issue is that **classic Letter Head + Print Format editing is not the right tool for designed PDFs in 2026**, which is exactly why Frappe shipped Print Designer.

---

## 4. Verdict matrix (the decision this doc records)

| # | Option | Verdict | One-line rationale |
|---|---|---|---|
| **A** | Install Print Designer into existing ERPNext production shell | **EVALUATE-SEPARATELY → recommend GO via a new authorisation packet** | Best-fit for our setup; technically supported on v15.109.x; reversible via `bench uninstall-app`; modest risk; resolves the underlying renderer-quality problem long-term. Authorise as a separate `ERPNext-PrintDesigner-Install-1` packet that bundles the Chrome PDF backend switch. |
| **B** | Install Print Designer as a separate self-hosted Frappe site / container | **NO-GO** | Defeats the entire purpose of a visual editor that knows the live doctype schema. A separate site has no `LR-SETUP-USD-150` Item, no `CFLR-QUO-…` Quotation, no `Test Buyer (CFLR-DRY-RUN)` Customer to design against. |
| **C** | Use hosted Frappe Cloud + Print Designer | **NO-GO for v1** | Would require migrating the production shell off `corpflow-exec-01-u69678` (contradicts `JE-2026-05-29-1` host decision); adds a new paid vendor relationship; Chrome PDF backend is explicitly *"FC not supported for now"* per Print Designer PR #399. Reconsider only as part of a larger off-laptop strategy with explicit operator decision to leave self-hosting. |
| **D** | Build / own our own PDF renderer (Puppeteer / WeasyPrint / Pandoc / a SaaS like DocRaptor / Carbone) | **NO-GO** | Would duplicate ERPNext's data model + permissions + audit trail into a separate system; high maintenance debt for the first 6 months when document volume is tiny. Worth reconsidering only if we ever need typographic-quality marketing collateral (where Word/InDesign manual workflows beat custom code anyway). |
| **E** | Continue classic ERPNext Letter Head / Print Format editing | **NO-GO for v1.5+ / acceptable as emergency-only for one PDF** | wkhtmltopdf is abandoned (repo archived 2023); image scaling, modern CSS, and the script-field-bleed symptoms Anton hit are exactly why Frappe themselves shipped Print Designer + the Chrome backend. Keeping classic Letter Head as the long-term tool means inheriting a deprecated rendering stack with no support path. **Exception:** if recipe § 16 needs one PDF working immediately to unblock the production-shell smoke test, fix `host_name` + accept the minimalist text-only Letter Head + move on. Then plan Print Designer as a follow-up. |

**Summary verdict:**

- **GO (separate authorisation):** Option A — Print Designer inside the existing production shell, with the Chrome PDF backend and `host_name` fix bundled into the install packet.
- **NO-GO:** Options B, C, D.
- **TRANSITIONAL only:** Option E for one emergency PDF if needed to keep recipe § 16 smoke moving.

---

## 5. Answers to the 10 questions in the authorisation packet

| Q | Answer |
|---|---|
| **Q1** Can Print Designer be installed into our existing ERPNext v15 production shell? | **Yes.** Print Designer is v15-compatible (README: *"only compatible with develop and V15 version"*). Installs via standard `bench get-app` + `install-app` + `bench build` + `bench migrate`. Our production shell is `frappe v15.109.0 + erpnext v15.109.1`, well within range. |
| **Q2** Should it be installed inside the ERPNext site or as a separate Frappe site / container? | **Inside the existing site.** Print Designer is a Frappe *app* that adds doctypes + a UI editor; it needs read access to the live Item / Quotation / Sales Invoice schema to be useful. A separate site would have no data to design against. The `easy-install.py deploy` path on the README creates a *new* prod deployment from scratch — that path is for greenfield, not for adding the app to an existing site. |
| **Q3** Does it work reliably self-hosted? | **Yes, with documented Docker caveats.** Stable v1.6.7 (2026-02-10), 421 stars, active development by the Frappe core team. Self-hosted is the primary deployment path documented. Caveats: in a multi-container Docker setup, `bench setup-chrome` must be run on every container that renders PDFs (backend, scheduler, worker, queue) — each container has an independent bench directory. Awkward but documented and reversible; the cleaner production approach is to install `chromium-headless-shell` as an OS package in a custom Dockerfile layer + set `chromium_binary_path` in `common_site_config.json`. |
| **Q4** Does it reduce or avoid wkhtmltopdf / header / footer / image-scaling problems? | **Indirectly — via the Chrome PDF backend it ships with.** Print Designer added `pdf_generator='chrome'` as a per-Print-Format option (PR #399). Switching a Print Format to Chrome backend bypasses wkhtmltopdf entirely → modern CSS works, image scaling works, no abandoned-dependency risk. Chrome is **2.21–2.79× faster** + uses **2.27–2.73× less CPU**. The `host_name` `ConnectionRefusedError` is **independent** — that's a Frappe-Docker config issue that must be fixed regardless of which renderer you pick (Chrome also wants to reach the site to fetch dynamic assets). |
| **Q5** Can it produce multiple high-quality templates (MU pro-forma, MU tax invoice later, ZA, USA, generic quotation)? | **Yes.** Each Print Format doctype record is one template. Unlimited templates per source doctype (Quotation, Sales Invoice, etc.); operator selects which template to render at print time. Jurisdictional variation is solved by template selection, not schema change. The single-offer rule from `JE-2026-05-28-1` is unaffected — it constrains *what's sold* (one item), not *how many PDF templates exist* (many). |
| **Q6** Can templates be exported / versioned / backed up? | **Yes — three layers.** (a) `bench backup --with-files` includes Print Format records in the DB dump (already exercised by recipe § 2). (b) `bench export-fixtures` can write Print Format records to JSON fixtures inside a custom app, which is then committed to git — the canonical Frappe pattern for portable customisations. (c) Print Designer's own JSON template payload (stored on the Print Format record) is human-diffable, so git history shows real semantic changes, not opaque binary blobs. |
| **Q7** What are the risks of installing it into the current production shell? | **Low-to-moderate, all reversible.** (i) `bench install-app` + `bench migrate` adds doctypes + nav entries; reversible via `bench uninstall-app print_designer`. (ii) Chrome backend requires `bench setup-chrome` on every container (~200 MB chromium-headless-shell binary per container, easy to miss one). (iii) Issue #35546 (v16) flags that Chromium is downloaded into the bench dir rather than installed system-wide — security-conscious operators should set `chromium_binary_path` to a system-installed `chromium-headless-shell` package instead. (iv) Does NOT touch any of the accounting-blocked surfaces from `JE-2026-06-04-1` (no GL, no Customer data, no VAT, no bank fields). (v) `bench migrate` adds Print Designer's own tables; safe with our production shell (no real transactional data). |
| **Q8** What is the fastest safe path to a visually excellent pro-forma PDF? | **Two-step:** (Step 1) Fix `host_name` in the production-shell `site_config.json` so wkhtmltopdf can fetch the site — this unblocks recipe § 16 PDF smoke immediately, with the existing text-only Letter Head + the `CFLR Pro-forma Invoice` Print Format. (Step 2, separate authorisation) Install Print Designer + switch the Pro-forma Print Format to Chrome backend → visually excellent template + future-proof renderer. **Total time to a working v1 pro-forma PDF: ~10 min for Step 1. Total time to a visually excellent v1 pro-forma PDF: ~30 min for Step 1 + ~90 min for Step 2 + ~60 min of template-design work in Print Designer.** |
| **Q9** Should we instead use a separate PDF rendering service or custom template engine? | **No, for ERPNext-generated documents.** Reasons: (a) the data model lives in ERPNext; duplicating it into a separate renderer (DocRaptor / Carbone / WeasyPrint / Puppeteer) means two systems for one document — every Item / Customer / line-item schema change has to be re-applied to the renderer. (b) Audit trail + permissions live in ERPNext; a separate renderer creates a hidden side-channel. (c) The Frappe-native Chrome backend gives us 90% of "modern PDF renderer" benefit without any of the data-duplication cost. **The exception** is the `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` workflow (Word/Pages → PDF), which Anton has already adopted for off-repo pro-formas — that off-repo workflow is fine and should keep existing for the first 1–10 real pro-formas. |
| **Q10** What should Anton do now in ERPNext: stop, continue, or clean up failed letterhead artifacts? | **All three, in order.** (a) **STOP** further classic Letter Head edits this session — they will not produce the result you want until `host_name` is fixed. (b) **CLEAN UP** by deleting any test Letter Heads + Print Formats that contain script-text bleed-through (UI: Setup → Letter Head → delete the bad one; Setup → Print Format → delete user-created drafts). The text-only Letter Head from recipe § 9 + the `CFLR Pro-forma Invoice` Print Format from § 13 should be the only ones to keep. (c) **AWAIT** the next authorisation packet — either Packet 1 (`ERPNext-Production-Shell-host_name-Fix-1`, emergency unblocker) or Packet 2 (`ERPNext-PrintDesigner-Install-1`, full install). |

---

## 6. Risks (carried verbatim from the in-chat evaluation)

- **Stale `host_name` will keep breaking PDFs** — whether we install Print Designer or not, the production shell `site_config.json` needs `host_name` set to a Docker-internal-reachable value (e.g., `http://frontend:8080`). One-line fix but a real blocker for recipe § 16.
- **Print Designer in Docker requires `setup-chrome` per container** — easy to miss one (e.g., scheduler container without chromium → emails with PDF attachments silently fail when sent in background). Mitigation: install `chromium-headless-shell` as a system package via a custom Dockerfile and set `chromium_binary_path` globally; document this in Packet 2.
- **Print Designer adds ~200 MB chromium binary per container** — minor on `corpflow-exec-01-u69678` (150 GB disk after `JE-2026-05-31-2` resize) but worth recording in Packet 2.
- **`bench migrate` is needed after install** — safe on the production shell (no transactional data), but the operation is not instant (typically 30–120 s). Sandbox at `erpnext-sandbox` (or `corpflowai-sandbox`, depending on actual Docker project name discovered at execution time) is unaffected (separate Docker project, separate bench directory).
- **Frappe Cloud temptation** — if Anton wants Print Designer with zero operator burden, the FC option will look attractive. But (i) `JE-2026-05-29-1` decided self-hosted on `corpflow-exec-01-u69678` for v1, (ii) Chrome backend is *"FC not supported for now"* per PR #399, (iii) moving to FC is its own multi-day migration project. Recommended: stay self-hosted for now; revisit FC only as part of a bigger off-laptop strategy.
- **Wasted Letter Head edit time stays wasted** — the classic Letter Head edits Anton attempted during the failed UI session are not recoverable as Print Designer templates. They'd be re-done in Print Designer's visual editor. Acceptable because the time invested was small and the Print Designer template will be better.

---

## 7. Two future-packet shapes

These two packets are NOT authorised by this doc. They are *shape definitions* that Anton can review and authorise (or modify and authorise) as separate `AUTHORISE — …` chat messages.

### 7.1 Packet 1 — `ERPNext-Production-Shell-host_name-Fix-1` (the emergency unblocker)

**Goal:** Set `host_name` in the production-shell site config to a Docker-internal-reachable URL so wkhtmltopdf can fetch its own site; rerun the recipe § 16 PDF smoke and confirm the `ConnectionRefusedError` is gone.

**Estimated time:** ~10 min L3 SSH work.

**Sketch of steps (final wording lives in the eventual packet itself, not here):**

1. Discovery (read-only): detect actual Docker project name (`docker compose ls`); confirm production stack containers `Up`; confirm sandbox containers still `Up`; probe `http://frontend:8080` reachability from inside the backend container; show current `host_name` (filtered for non-secret keys only); inventory recipe § 13 / § 15 / § 16 doctype presence.
2. Decision tree (operator's call based on discovery output): GO with `http://frontend:8080`, GO with a discovered fallback hostname, BLOCKED if no internal hostname reachable, PARTIAL if `host_name` is already correct and PDF still fails.
3. Fix: `bench --site corpflowai-production.localhost set-config host_name "<resolved>"`.
4. Cache clear: `bench --site corpflowai-production.localhost clear-cache`.
5. Smoke: re-render the recipe § 16 test Quotation (or create one if absent), verify `%PDF` magic bytes + size + docstatus=0 + Quotation not submitted.
6. Sandbox preservation re-check: confirm sandbox containers still `Up` after the production-shell change.

**Hard limits (carried from `JE-2026-06-04-1`):** loopback only, no public exposure, no DNS/TLS/SMTP changes, no Sales Invoice submission, no VAT activation, no real bank/payment, no secrets printed, no sandbox mutation, no Print Designer install yet, no repo runtime changes.

**Closure JE row when executed:** future `JE-YYYY-MM-DD-N` with COMPLETE / PARTIAL / BLOCKED verdict.

### 7.2 Packet 2 — `ERPNext-PrintDesigner-Install-1` (the long-term answer)

**Goal:** Install Frappe Print Designer into the existing ERPNext production shell + switch the `CFLR Pro-forma Invoice` Print Format to the Chrome PDF backend + rebuild the Pro-forma layout in Print Designer's visual editor.

**Estimated time:** ~3 hours L3 SSH work + ~60 min of template design.

**Sketch of steps (final wording lives in the eventual packet itself, not here):**

1. Discovery (read-only): confirm `host_name` is set (Packet 1 closed); confirm production stack containers `Up`; confirm sandbox still `Up`; check current Print Format `pdf_generator` field values.
2. Install: `bench get-app https://github.com/frappe/print_designer` (pinned to **v1.6.7** tag) → `bench --site corpflowai-production.localhost install-app print_designer` → `bench build --app print_designer` → `bench --site corpflowai-production.localhost migrate`.
3. Chrome PDF backend setup: either (a) `bench setup-chrome` on backend + scheduler + worker containers (quick but per-container), OR (b) custom Dockerfile layer that installs `chromium-headless-shell` as an OS package + `bench set-config -g chromium_binary_path /usr/bin/chromium-headless-shell` (cleaner for production).
4. Switch the `CFLR Pro-forma Invoice` Print Format `pdf_generator` field from `wkhtmltopdf` to `chrome`.
5. Template work (operator UI): rebuild the Pro-forma layout in Print Designer's visual editor; preserve W1–W5 verbatim wording from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1; preserve the defensive forbidden-wording assertion from recipe § 13 (re-apply post-install via a small Cursor-authored check).
6. Verification: re-render the test Quotation; visually compare against the classic-Letter-Head version; PASS gate is *"clearly better visually"*.
7. Rollback path: `bench --site corpflowai-production.localhost uninstall-app print_designer` + flip the `pdf_generator` field back to `wkhtmltopdf`; sandbox unaffected throughout.

**Hard limits (carried from `JE-2026-06-04-1`):** loopback only, no public exposure, no DNS/TLS/SMTP changes, no Sales Invoice submission, no VAT activation, no real bank/payment, no secrets printed, no sandbox mutation, no real client invoice / pro-forma sent from the production shell.

**Prerequisite:** Packet 1 closed with verdict COMPLETE (or PARTIAL with a clear plan to close before Packet 2 runs).

**Closure JE row when executed:** future `JE-YYYY-MM-DD-N` with COMPLETE / PARTIAL / BLOCKED verdict.

---

## 8. What stays HELD by this evaluation (unchanged)

This evaluation does NOT close, modify, or accelerate any of:

- **HB-2** Mauritius-licensed accountant CoA review in writing — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** Real (redacted) MU bank CSV reconciliation cycle — **PENDING-OPERATOR**.
- **Full Phase D** ERPNext accounting go-live — HELD pending HB-2 + HB-3 + HB-4 closure plus a separate future Phase D authorisation row.
- **First submitted Sales Invoice on production** (GL posting) — HELD on the same gate.
- **First email of any ERPNext-generated PDF to a real client** — HELD on the same gate.
- **Sandbox tear-down** — HELD pending the four-condition gate from `JE-2026-06-04-1`.
- All standing holds enumerated in `JE-2026-06-04-3` § *Standing holds*.

---

## 9. Verification (what this doc verified, what it could not)

**Verified by live web research from L1:**

- [x] Print Designer v15 compatibility (README warning is explicit).
- [x] Chrome PDF backend exists (PR #399 merged in Print Designer; PR #35812 merged in Frappe core).
- [x] `ConnectionRefusedError` root cause is `host_name` (multiple GitHub issues converge).
- [x] Template portability via `bench export-fixtures` (canonical Frappe pattern).
- [x] Self-hosted install path documented in official README.
- [x] Frappe Cloud Chrome-backend caveat documented in PR #399 comments.

**Could NOT verify without operator L3 help (deferred to Packet 1 discovery):**

- [ ] The actual `host_name` value currently set in `sites/corpflowai-production.localhost/site_config.json`.
- [ ] Whether the backend container can reach `http://frontend:8080` from inside Docker.
- [ ] The exact wkhtmltopdf version + patched-qt status on the production-shell backend container.
- [ ] Which test Letter Heads / Print Formats Anton actually created and needs to clean up.
- [ ] The actual Docker Compose project name on `corpflow-exec-01-u69678` (recipe used `-p erpnext-production`; later operator usage may have used `-p corpflowai-production`).

All five are 1-command L3 checks that fit into Packet 1's discovery block.

---

## 10. Deployment state (what changed in the world)

**Nothing.** This evaluation is research-only.

- ERPNext production shell on `corpflow-exec-01-u69678`: **unchanged** (no SSH, no `bench`, no UI access).
- ERPNext sandbox on `corpflow-exec-01-u69678`: **unchanged** (sandbox preservation rule honoured by default).
- CorpFlowAI runtime / Vercel / DNS / Postgres / Neon / n8n / Plausible / Telegram / Search Console / GitHub workflows / payment-settings / public pages: **unchanged.**
- This repo: 4 files added/modified (this doc + `JOURNAL.md` row + `AGENTS.md` row + `chat_history.md` section); zero runtime / scripts / env / config changes.

---

## 11. Cross-references

- Authorisation provenance: Anton DECISION 2026-06-04 *"AUTHORISE — ERPNext-Print-Designer-Evaluation-1"*; this evaluation is the deliverable.
- Decision row: `docs/decisions/JOURNAL.md` `JE-2026-06-04-4`.
- Production-shell hard contract: `docs/decisions/JOURNAL.md` `JE-2026-06-04-1` (12-point NOT-authorised list).
- Production-shell setup recipe (§ 13 Print Format defensive forbidden-wording assertion; § 16 PDF smoke): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md`.
- Pro-forma verbatim wording (W1–W5) referenced by future Print Designer templates: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1.
- Brand doctrine (single-offer rule): `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Execution boundary (L1/L2/L3 + HOST_MISMATCH): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`.
- Pending Phase D blockers (HB-2 / HB-3 / HB-4): `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1.
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- Upstream sources:
  - [`frappe/print_designer`](https://github.com/frappe/print_designer)
  - [`frappe/print_designer` PR #399 (Chrome PDF Generator)](https://github.com/frappe/print_designer/pull/399)
  - [`frappe/frappe` PR #35812 (allow Chrome generator for standard print format)](https://github.com/frappe/frappe/pull/35812)
  - [`frappe/erpnext` Issue #36018 (`wkhtmltopdf ConnectionRefusedError`)](https://github.com/frappe/erpnext/issues/36018)
  - [`frappe/frappe_docker` Issue #1589 (PDF generation 500 due to `host_name`)](https://github.com/frappe/frappe_docker/issues/1589)

---

## 12. Change log

- **v1, 2026-06-04** — initial canonical evaluation. Authored at L1 (Cursor on Anton's Windows laptop) per Anton's `AUTHORISE — ERPNext-Print-Designer-Evaluation-1` DECISION on 2026-06-04. Five sources consulted (Print Designer README, install guides, Print Designer PR #399, Frappe PR #35812 + Issue #35546, ERPNext Issue #36018 + Frappe Docker Issue #1589 + Aakvatech blog). Decision: Option **A** (Print Designer install via separate `ERPNext-PrintDesigner-Install-1` packet) GO; B / C / D NO-GO; E TRANSITIONAL-only for emergency single-PDF use. Two future packets defined: Packet 1 (`ERPNext-Production-Shell-host_name-Fix-1`, emergency unblocker, ~10 min) and Packet 2 (`ERPNext-PrintDesigner-Install-1`, full install + Chrome backend + template work, ~3 hours + design). Both packets remain UNAUTHORISED by this doc; each requires its own separate `AUTHORISE — …` chat DECISION from Anton.

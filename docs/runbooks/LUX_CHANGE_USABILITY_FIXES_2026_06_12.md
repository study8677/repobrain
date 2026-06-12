# LuxeMaurice `/change` usability fixes — 2026-06-12 (PR #347, follow-up PR #348, follow-up PR #349, follow-up PR #350)

**Status:** PARTIAL — PR #347 merged (`a406f352`), PR #348 merged (`c800ef56`), PR #349 merged (`93249e73`, Vercel Production deployment `5029556251` ready 2026-06-12T02:51:00Z). **PR #350** is a belt-and-suspenders defensive fix after the operator still hit "Upload area is not available right now" on PR #349's production deployment — adds stable `id`/`name` on the file input, a `document.getElementById` fallback in the click handler, a render-guard that guarantees the section is mounted whenever a sprint ticket is selected, and a one-line `console.warn` diagnostic for any future regression. Live production verification remains pending the PR #350 merge + Vercel Production + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`.

## P0 follow-up — PR #350 (2026-06-12)

**Symptom:** Even after PR #349 deployed to Production (SHA `93249e73`, Vercel Production deployment id `5029556251`), clicking **Upload content** on a C1–C4 Content Population Sprint ticket still surfaced:

> Upload area is not available right now. Try reloading /change with this ticket open.

**Diagnostic:**

| Check | Result |
|---|---|
| Production SHA includes PR #349 (`93249e73`) | ✅ confirmed via `gh api repos/.../deployments?environment=Production` |
| `pages/change.js` upload-section JSX condition on production HEAD | `{!isEstimateMode && selectedTicketId ? (...)}` — exactly what PR #349 deployed |
| `pages/change.js` upload section anchor id + data-testid | `id="lux-ticket-attachment-upload"` + matching testid present |
| `pages/change.js` file input anchor | `data-testid="lux-ticket-attachment-upload-input"` only — **no `id` or `name`** so `document.getElementById` lookups were impossible |
| Browser fallback after click | Reached the non-silent unavailable branch → either the section was not in the DOM (some guard combination not yet ruled out) **or** the React refs were `null` at click time (ref-attachment race or partial-hydration edge case) |

**Why this couldn't be diagnosed deeper from the repo:** `/change` is auth-gated; we cannot fetch its HTML server-side. The runtime DOM state during the actual click is the missing piece. PR #350 instruments the handler so the next operator click will either succeed (because of the fallback / strengthened guard) or paste a one-line diagnostic into the browser console identifying *which* of the two root causes it is.

**Fix (belt-and-suspenders):**

1. **Stable `id` + `name` on the file input.** `<input id="lux-ticket-attachment-upload-input" name="lux-ticket-attachment-upload-input" data-testid="lux-ticket-attachment-upload-input" type="file" ...>`. This (a) lets `handleSprintUploadContentClick` look the input up by id when the React ref is null, and (b) fixes the secondary "form field missing id/name" browser warning the operator reported.
2. **`document.getElementById` fallback in the handler.** If `luxAttachmentUploadInputRef.current` is null, the handler now also tries `document.getElementById('lux-ticket-attachment-upload-input')` and `document.getElementById('lux-ticket-attachment-upload')`. If either succeeds, the handler proceeds with scroll → focus → click as normal. No regression to the React-ref-first path; the fallback is additive.
3. **Render-guard strengthened.** The JSX conditional now reads `{selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) ? (...)}`. Operators editing sprint tickets get the upload section unconditionally, so even a future `isEstimateMode === true` regression cannot hide it for the C1–C4 flow.
4. **Operator-pasteable diagnostic.** When the handler reaches the unavailable branch, it now emits one structured `console.warn` line tagged `[lux-upload]` listing `selectedTicketId`, `isEstimateMode`, `isLuxContentSprintTicketSelected`, ref-attached booleans, and DOM-found booleans. If the regression ever recurs, the operator pastes the one line and the next root cause is obvious.

**Files changed (PR #350):**

* `pages/change.js`
  * `<input>` gains `id="lux-ticket-attachment-upload-input"` and `name="lux-ticket-attachment-upload-input"`.
  * `handleSprintUploadContentClick` — added `document.getElementById` fallback for both the section anchor and the input; added diagnostic `console.warn` on the unavailable branch and on successful fallback usage.
  * Upload-section render condition: `{selectedTicketId && (!isEstimateMode || isLuxContentSprintTicketSelected) ? (...)}` — sprint tickets bypass `isEstimateMode`.
* `node-tests/lux-content-sprint-upload-button.test.mjs`
  * **New test** *PR #350: upload section renders unconditionally when a sprint ticket is selected* — asserts the JSX conditional includes `isLuxContentSprintTicketSelected`.
  * **New test** *PR #350: file input carries stable id="lux-ticket-attachment-upload-input" and name attribute*.
  * **New test** *PR #350: handleSprintUploadContentClick falls back to document.getElementById when React refs are null*.
  * **New test** *PR #350: emits a diagnostic console.warn when the fallback path is reached*.
  * Existing tests retained.

**Tests + build (PR #350):** `npm test` — 743 passing assertions, 53 suites, 0 failing (up from 739 in PR #349; +4 new). `npm run build` — green.

**What is intentionally NOT changed (PR #350):**

* No CSP relaxation (operator explicitly asked: do not alter CSP, do not add `unsafe-eval`).
* No general accessibility refactor (operator explicitly asked: do not work on accessibility warnings until the upload flow works).
* `/api/change-attachment/upload` contract, `cmpTicketAttachment` storage, tenant / session / auth checks, media governance — all unchanged.
* `LuxContentSprintPanel` API surface — unchanged. Only `onUploadClick` is consumed.
* `computeIsIntakeUx` — unchanged.
* `public/change.html` — untouched.

**Live verification plan (PR #350):**

1. Wait for Vercel Production to mark the PR #350 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session.
3. For each of C1, C2, C3, C4:
   * Select the ticket.
   * Open the browser console (F12 → Console).
   * Click **Upload content**.
   * Expected: OS file picker opens immediately. No alert. No "Upload area is not available right now" message. No `[lux-upload]` warning in the console.
   * If the warning DOES appear, paste the single `[lux-upload] Upload area is not in the DOM ...` line back into the ticket. The boolean fields identify the exact root cause.
4. Pick a small safe test image (≤3 MB). Confirm the green status pill (*Uploaded and available on this ticket: …*) and the new attachment appearing in the ATTACHMENTS list. **Do not publish test media publicly.**
5. Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot in `artifacts/chat_history.md`. Flip PR #347 + PR #348 + PR #349 + PR #350 verdict to `COMPLETE` only after Jan and Anton confirm.

**Rollback (PR #350):** revert PR #350 — the previous (PR #349) behaviour returns; no migrations. The `id`/`name` removal would re-trigger the "form field missing id/name" browser warning, but no functional regression beyond returning to PR #349 state.

---

## Original PR #347 / PR #348 / PR #349 entries

**Status:** PARTIAL — PR #347 merged (`a406f352`), PR #348 merged (`c800ef56`), and PR #349 unblocked the "Upload content" button on the sprint child tickets that PR #348 still hid behind the intake-stage guard. Live production verification remains pending Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`.

## P0 follow-up — PR #349 (2026-06-12)

**Regression:** After PR #348 merged, clicking **Upload content** on a C1–C4 Content Population Sprint ticket reached the unavailable-state branch and showed an `alert(...)` plus the inline error pill:

> Upload area is not available right now. Try reloading /change with this ticket open.

The button wiring, handler, and fallback path were all correct — but the upload target itself was never mounted for sprint tickets.

**Root cause (verified):** In PR #348 the *Upload to this ticket* section was guarded by `!showIntakeSurface && !isEstimateMode && selectedTicketId`. `showIntakeSurface = showIntakeSkin || forceRefine` and `showIntakeSkin = Boolean(selectedTicketId && ticket && computeIsIntakeUx(ticket))`. The sprint child tickets C1–C4 created by PR #345 sit in the **Intake** workflow stage by design (they are fresh sprint work items, not legacy in-progress tickets), so `computeIsIntakeUx(ticket)` returns `true` for them → `showIntakeSurface` is `true` → the upload section was never rendered → `luxAttachmentUploadSectionRef.current` and `luxAttachmentUploadInputRef.current` were both `null` → `handleSprintUploadContentClick` correctly fell through to the non-silent fallback.

`<LuxContentSprintPanel>` does *not* share the `!showIntakeSurface` guard (its only condition is `isLuxContentSprintTicketSelected && luxChangeChrome`), so the **Upload content** button rendered while its target did not.

**Fix:**

1. **Loosen the upload-section guard** in `pages/change.js` from `!showIntakeSurface && !isEstimateMode && selectedTicketId` → `!isEstimateMode && selectedTicketId`. Operators need to attach media to in-flight sprint work regardless of intake stage; the section is still hidden during estimate mode (where the surface is read-only quote review). A code comment documents the prior false-positive.
2. **Trigger the OS file picker directly** by calling `input.click()` at the end of `handleSprintUploadContentClick` (option (b) from the brief). Browsers permit programmatic clicks on file inputs only inside the same user-gesture handler, and `handleSprintUploadContentClick` is exactly that handler, so the native file picker now opens synchronously on the first click — no scroll-then-click second step required. Wrapped in `try/catch` so a restrictive environment falls back to scroll + focus (option (a)) without throwing.

**Files changed (PR #349):**

* `pages/change.js`
  * Render guard on the Upload to this ticket section relaxed (still respects `!isEstimateMode && selectedTicketId`; comment explains why intake-stage sprint tickets must be allowed through).
  * `handleSprintUploadContentClick` now performs `scrollIntoView` → `focus({preventScroll:true})` → `click()` so the OS file picker opens immediately.
* `node-tests/lux-content-sprint-upload-button.test.mjs`
  * Existing test renamed: *handleSprintUploadContentClick with scroll + focus + click + unavailable fallback*; now asserts `input.click()` is invoked.
  * **New test** *PR #349 regression guard: upload section renders without the !showIntakeSurface gate* — parses `pages/change.js`, locates the JSX conditional that opens the upload section, and asserts the conditional does not include `!showIntakeSurface` (still requires `!isEstimateMode`). This guarantees the regression cannot return through a future refactor.

**Tests + build (PR #349):** `npm test` — 739 passing assertions, 53 suites, 0 failing (up from 738 in PR #348; +1 new). `npm run build` — green.

**What is intentionally NOT changed (PR #349):**

* `computeIsIntakeUx` — unchanged. The intake-skin behaviour (describe-the-change textarea, save-continue logic, etc.) for non-sprint tickets is preserved by not touching the helper.
* `/api/change-attachment/upload` contract, `cmpTicketAttachment` storage, tenant / session / auth checks, media governance — all unchanged from PR #348.
* `LuxContentSprintPanel` static-fallback affordance — still present for non-Lux operator chrome.
* `public/change.html` — untouched.

**Live verification plan (PR #349):**

1. Wait for Vercel Production to mark the PR #349 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session.
3. For each of C1, C2, C3, C4 (children of sprint `cmqa2y2ga0000l704glnfro1f`):
   * Select the ticket.
   * Click **Upload content**.
   * Confirm the OS file picker opens immediately. No `alert(...)`. No "Upload area is not available right now" message.
   * Optionally pick a small safe test image (≤3 MB). Confirm the status pill turns green (*Uploaded and available on this ticket: …*) and the new attachment appears in the existing ATTACHMENTS list below for review / link / publish.
   * Do **not** publish test media publicly.
4. Open a non-sprint ticket and confirm the Upload to this ticket section still renders and behaves identically.
5. Open an estimate-mode ticket and confirm the section remains hidden (the `!isEstimateMode` guard still applies).
6. Record Vercel Production deployment ID + commit SHA + Lux URL + screenshot in `artifacts/chat_history.md`. Flip the PR #347 + PR #348 + PR #349 verdict to `COMPLETE` only after Jan and Anton confirm the picker opens on the first click and the attachment row reaches the ticket.

**Rollback (PR #349):** revert PR #349 — the previous behaviour returns (button reaches unavailable fallback on sprint tickets). No migrations.

---

## Original PR #347 / PR #348 entries

**Status:** PARTIAL — PR #347 merged (`a406f352`) and **PR #348** wired the regressed "Upload content" button to the existing governed attachment pipeline. Live production verification (TASK 6 + PR #348 button reach) remains pending Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`.

## P0 follow-up — PR #348 (2026-06-12)

**Regression:** After PR #347 merged, the new "Upload content" CTA on C1–C4 Content Population Sprint tickets rendered as a static, non-clickable affordance because `pages/change.js` passed no `onUploadClick` handler to `<LuxContentSprintPanel>` and the React `/change` console had no inline attachment-upload UI at all (the upload UI lived only in `public/change.html`, which is a different surface). Operators saw the button but could not start an upload.

**Definition of Done:** Clicking "Upload content" on any C1–C4 ticket reaches the existing governed attachment pipeline (`POST /api/change-attachment/upload` → `lib/server/change-attachments.js` → `cmpTicketAttachment` + `lux_request_meta.attachments` annotation), without creating a second upload system, a new public route, a new env var, or weakening tenant / session / auth checks.

**Files changed (PR #348):**

* `pages/change.js`
  * New state: `uploadBusy`, `uploadStatus`, `uploadStatusKind`, refs `luxAttachmentUploadInputRef` / `luxAttachmentUploadSectionRef`.
  * New helpers: `readFileAsBase64`, `clientMimeAllowed`, `uploadFileToTicket`, `handleAttachmentUploadInputChange`, `handleSprintUploadContentClick`.
  * New section in the right-rail render (`!showIntakeSurface && !isEstimateMode && selectedTicketId`) titled **Upload to this ticket** with stable anchor `id="lux-ticket-attachment-upload"` and `data-testid="lux-ticket-attachment-upload"`, plus `data-testid="lux-ticket-attachment-upload-input"` on the `<input type="file">` and `data-testid="lux-ticket-attachment-upload-status"` on the status pill. The input refuses non-image / non-video / non-PDF files client-side, matches the server's documented default allowlist (`image/, video/, application/pdf` per `lib/server/change-attachments.js`), enforces the ~3 MB hint, and on success calls `loadAttachmentsForTicket(ticketId)` so the existing ATTACHMENTS section refreshes inline.
  * `<LuxContentSprintPanel onUploadClick={handleSprintUploadContentClick} />` — the click handler scrolls the upload section into view, focuses the file input, and if the section is not mounted (no ticket selected, ref not attached) surfaces a non-silent `alert(...)` plus an inline error status — never a silent no-op.
* `node-tests/lux-content-sprint-upload-button.test.mjs` — **new**, 9 regression guards:
  1. `LuxContentSprintPanel` renders a real `<button onClick={onUploadClick}>` when a handler is provided.
  2. The static fallback (`lux-content-sprint-upload-cta-static`) still exists when no handler is provided.
  3. `pages/change.js` wires `onUploadClick={handleSprintUploadContentClick}`.
  4. `handleSprintUploadContentClick` calls `scrollIntoView` + `focus` + the unavailable fallback (alert + status message).
  5. The stable upload anchor (`id="lux-ticket-attachment-upload"` and matching `data-testid`) is present, with the section ref and input ref wired.
  6. The upload path goes through `POST /api/change-attachment/upload` and refreshes the attachments list via `loadAttachmentsForTicket`.
  7. The client-side MIME pre-check matches the server allowlist (`image/`, `video/`, `application/pdf`) — no allowlist drift.
  8. Oversize / wrong-type files surface a non-silent error pill (`setUploadStatusKind('error')`, `lux-ticket-attachment-upload-status`).
  9. One shared FileReader-based `readFileAsBase64` helper exists — no duplicated upload state.

**Tests + build (PR #348):** `npm test` — 738 passing assertions, 53 suites, 0 failing (up from 729 in PR #347; +9 new). `npm run build` — green.

**What is intentionally NOT changed (PR #348):**

* Attachment API contract (`POST /api/change-attachment/upload`) — unchanged.
* Attachment storage (Postgres `CmpTicketAttachment` row + `lux_request_meta.attachments` annotation in `console_json`) — unchanged.
* Tenant / admin session resolution in `resolveUploadScope` and `assertTicketAccess` — unchanged.
* Media governance rules (review → link → publish on allowed slots) — unchanged; the upload pill explicitly reminds the operator that nothing becomes public from the upload step alone.
* `public/change.html` (the static intake page) — untouched.

**Live verification plan (PR #348):**

1. Wait for Vercel Production to mark the PR #348 merge commit `Ready`.
2. Open `https://lux.corpflowai.com/change` as a Lux operator session.
3. For each of C1, C2, C3, C4 (children of sprint `cmqa2y2ga0000l704glnfro1f`):
   * Select the ticket.
   * Confirm the **Add content** panel renders a clickable "Upload content" button (not the static affordance).
   * Click the button. Verify the page scrolls to the **Upload to this ticket** section and the file input is focused.
   * Optionally pick a small, safe test image (≤3 MB). Verify the status pill turns green ("Uploaded and available on this ticket: …") and the new attachment appears in the existing ATTACHMENTS list below for review/link/publish.
   * Do **not** publish test media publicly.
4. Open a non-sprint ticket and confirm the **Upload to this ticket** section still renders (the upload UI is per-ticket, not per-sprint-code) and behaves identically.
5. Record the Vercel Production deployment ID + commit SHA, the Lux URL, and a screenshot in `artifacts/chat_history.md`. Flip the PR #347 + PR #348 verdict to `COMPLETE` only after both Jan and Anton confirm the upload reaches a real attachment row.

**Rollback:** revert PR #348 — the static button affordance from PR #347 returns; existing attachment review / link / publish flows are unaffected; no migrations.

---

## Original PR #347 entry

**Status:** PARTIAL — code merged + tests + production build green; **live production verification (TASK 6) pending** Vercel Production deployment + Jan/Anton walk-through per `.cursor/rules/delivery-reality.mdc`.

**Programme context:** follow-up to PR #346 (operator queue cleanup, see `docs/runbooks/LUX_OPERATOR_QUEUE_CLEANUP_2026_06_11.md`). Master programme `cmo8mjijk0000jl04l1jz0v6d` and sprint parent `cmqa2y2ga0000l704glnfro1f` remain **open**; no DB row was closed or deleted.

---

## 1. Why this packet existed

After PR #346 cleared the 18 Phase 4C.1 smoke tickets, the LuxeMaurice operator desk on `https://lux.corpflowai.com/change` was still uncomfortable for the people who actually run LuxeMaurice (Jan + Anton):

1. **`LEADS · LuxeMaurice CRM (concierge)` reported `New: 14`** even though only 2 concierge messages came from real prospects (both from Jan). The remaining 12–13 rows were repo verification fixtures with placeholder contacts (`@example.com`, `@example.invalid`, `@placeholder.local`, `@corpflowai.invalid`).
2. **`Media library · cross-ticket index (Phase 5D)`** with helper copy `Cross-ticket Lux programme requests — JSON metadata only (no bytes). Use Load / refresh after changing filters.` — accurate, but unreadable to a non-engineer operator.
3. **No obvious upload path** for the four Content Population Sprint tickets (C1–C4). The primary call to action was the generic `Intake / Clarify / Draft / Review / Build` stage pills.
4. **Sprint tasks were framed as workflow stages, not content actions.** "Replace placeholder graphics" lacked a checklist or a clear "Upload content" affordance.
5. **The hardcoded staged catalog still rendered the demo opportunity** `lm-phase2d-manual-demo` ("Le Château — manual workflow demonstration") as if it were real curated public inventory.

---

## 2. What changed (by file)

### Server / pure logic

- **`lib/cmp/_lib/lux-lead-system-test-heuristic.js`** *(new)* — pure `classifyLuxLeadSystemTest(lead)` heuristic. Flags rows whose contact / name / message / `qualificationJson` match the well-known repo verification fixtures, or whose listing references the `lm-phase2d-manual-demo` slug. Returns `{ system_generated: boolean, reason?: string }`.
- **`lib/cmp/_lib/lux-sprint-meta-extract.js`** *(new)* — pure `extractLuxSprintMetaForApi(consoleJson)` that returns the tenant-safe `{ parent_sprint_ticket, parent_programme_ticket, sprint_code }` block. Returns `undefined` for non-sprint tickets so the existing `ticket-get` shape stays backwards-compatible.
- **`lib/cmp/router.js`** — `handleConciergeLeadsList` now adds `system_generated` (+ `system_generated_reason`) to each lead and a top-level `counts: { total, real, system_generated }` summary. `handleTicketGet` (the `ticket-get` action) surfaces `lux_sprint_meta` on every response.

### Operator desk UI

- **`pages/change.js`** —
  - **Media workspace:** renames the `<details>` summary to `Media workspace`, replaces the helper copy with `Review approved images and videos across LuxeMaurice content requests…`, and tucks the original engineering phrasing under a collapsed `Technical note`.
  - **CRM noise filter:** introduces `crmShowSystemGenerated` (default `false`) and derives `operatorViewLeads`. The LEADS pills + visible list now read from the filtered view; a `data-testid="lux-crm-system-generated-toggle"` inline control surfaces the hidden rows for audit. System-flagged rows in the list carry a `data-testid="lux-crm-system-generated-badge"` chip with the matched `reason` in `title`.
  - **Sprint detection + panel:** computes `luxSprintMeta` and `isLuxContentSprintTicketSelected` from `ticket.lux_sprint_meta`. Renders `<LuxContentSprintPanel sprintCode=… chrome=… />` above the workflow card on sprint tickets.
  - **Workflow pills:** for sprint tickets only, the Intake / Clarify / Draft / Review / Build buttons move into a closed `<details data-testid="lux-stage-tabs-advanced-collapsed">` summary labelled `Advanced workflow state ▾`. Non-sprint tickets continue to surface the pills inline (testid `lux-stage-tabs-primary`).
- **`components/LuxContentSprintPanel.js`** *(new)* — renders the per-sprint Add content panel with primary CTA, secondary guidance, upload + review steps, task-specific guidance, and a session-only content checklist.
- **`lib/client/lux-content-sprint-guidance.js`** *(new)* — per-C panel title / short line / upload steps / task guidance / checklist scaffolding for `C1`–`C4`, plus `getLuxContentSprintGuidance`, `normalizeLuxContentSprintCode`, and `isLuxContentSprintTicket` helpers and a `LUX_CONTENT_SPRINT_GENERIC_GUIDANCE` fallback.

### Public surface guards (TASK 5)

- **`lib/client/luxe-maurice-staged-properties.js`** — adds `demo: true` to the `lm-phase2d-manual-demo` entry plus `isLuxStagedDemoEntry`, `isLuxStagedDemoSlug`, `getPublicLuxStagedProperties` helpers.
- **`pages/index.js`** — runs the staged source list through `getPublicLuxStagedProperties` so the homepage cannot render demo entries.
- **`pages/property/[slug].js`** — public `getServerSideProps` returns `notFound: true` for `isLuxStagedDemoSlug(raw)`. The `?preview=1` + authenticated-editor path is unchanged.
- **`pages/concierge.js`** — treats a demo slug in `?property=` as "no property context" (the concierge form still loads, but no seeded property copy).
- **`pages/sitemap.xml.js`** — removes `lm-phase2d-manual-demo` from `LUX_PROPERTY_REFS`.

### Read-only inspection scripts (kept in repo)

- **`scripts/lux-leads-inspect.mjs`** *(new)* — dumps every `prisma.lead.findMany({ tenantId: 'luxe-maurice' })` row with heuristic tags. Used to validate that the new heuristic flags 14 noise rows and passes the 2 real Jan leads through. **Read-only.**
- **`scripts/lux-public-surfaces-inspect.mjs`** *(new)* — enumerates published `lux_listings` (currently `0`) and the hardcoded staged catalog. Used to confirm that `/properties` correctly renders the premium empty state and that the demo entry is the only one that needed `demo: true`. **Read-only.**

### Tests (new)

- `node-tests/lux-lead-system-test-heuristic.test.mjs` — 14 cases including the two real Jan leads, every distinct fixture pattern observed in production, and defensive null handling.
- `node-tests/lux-content-sprint-guidance.test.mjs` — 8 cases covering normalize / shape / per-C guidance / generic fallback.
- `node-tests/lux-sprint-meta-extraction.test.mjs` — 7 cases covering valid C1/C4 rows, lowercase coercion, invalid code rejection, partial linkage, and garbage payloads.
- `node-tests/luxe-maurice-staged-properties.test.mjs` — extended with 5 new cases for the demo flag + helpers + public filter.
- `node-tests/lux-change-usability-fixes.test.mjs` — file-content regression guards for the `/change` wording / wiring + the public-surface guards.

**Total new / updated tests: 45. Full suite: `npm test` → 729 pass, 0 fail. `npm run build` → green.**

---

## 3. Defaults, opt-ins, and operator override paths

| Behaviour | Default | Opt-out path | Why default-safe |
|---|---|---|---|
| LEADS · LuxeMaurice CRM counts exclude `system_generated` rows. | ON | "Show internal / test" pill in the LEADS card. | Real client leads are never matched; audit access preserved. |
| Sprint stage pills hidden under "Advanced workflow state". | ON for sprint tickets only. | Click the `<details>` summary; the same five pills are inside. | Non-sprint tickets are unaffected. |
| Add content panel rendered above the workflow card. | ON for sprint tickets only. | No opt-out (not a state change). | Non-sprint tickets do not render the panel. |
| Demo opportunity `/property/lm-phase2d-manual-demo` returns 404. | ON for public requests. | `?preview=1` + authenticated editor session. | The demo entry stays in the catalog for editor/audit. |
| Demo entry stripped from homepage staged list. | ON. | Set `tenant_site.staged_properties` to include a non-demo entry. | The fallback now passes through `getPublicLuxStagedProperties`. |
| `lm-phase2d-manual-demo` in sitemap. | OFF (removed). | n/a (intentional). | Search engines and operators do not surface it as real inventory. |

---

## 4. Verification (pre-merge)

- `node --test node-tests/lux-lead-system-test-heuristic.test.mjs … (5 new suites)` → all pass.
- `npm test` → 729 / 729 pass.
- `npm run build` → compiled successfully, 16 / 16 static pages generated.
- ReadLints over every touched file → no new warnings.
- `node scripts/lux-leads-inspect.mjs` → 14 rows flagged, 2 real Jan leads pass through. Matches the in-repo heuristic tests.
- `node scripts/lux-public-surfaces-inspect.mjs` → `lux_listings` rows = 0; demo slug only matches `lm-phase2d-manual-demo`.

## 5. Verification (post-merge — TASK 6, owner: Anton)

After Vercel Production deploys the merge commit:

1. **`/change` default queue** with Lux operator session: Programme (1), Active (1), Property (4 sprint children visible), CRM (0), Smoke (0). No old smoke noise.
2. **`/change` LEADS card**: `LuxeMaurice CRM (concierge)` now shows `New: 2` (the real Jan leads). The toggle is visible with `14 internal / test leads hidden from real-lead counts.` Toggling "Show internal / test" restores all rows; the `internal/test` chip appears on flagged rows.
3. **`/change` Media workspace**: section header reads `Media workspace`. Helper copy reads the operator-friendly paragraph. The collapsed `Technical note` is the only place the old phrasing appears.
4. **`/change` content tickets (C1, C2, C3, C4)**: opening any of the four sprint child tickets renders the Add content panel above the workflow card. The five-stage pills are hidden under `Advanced workflow state ▾`. The checklist toggles correctly within the session.
5. **Public surfaces**:
   - `https://lux.corpflowai.com/` does not render the "Le Château — manual workflow demonstration" card.
   - `https://lux.corpflowai.com/properties` shows the premium empty state (no `lux_listings` rows published yet — see `scripts/lux-public-surfaces-inspect.mjs`).
   - `https://lux.corpflowai.com/property/lm-phase2d-manual-demo` returns 404.
   - `https://lux.corpflowai.com/concierge?property=lm-phase2d-manual-demo` loads the concierge form without seeded demo property copy.
   - `https://lux.corpflowai.com/sitemap.xml` does not contain `lm-phase2d-manual-demo`.

Record the deployment ID + commit + screenshots on this runbook and close the loop with a Delivery Reality Audit block.

---

## 6. Non-negotiables held

- `cmo8mjijk0000jl04l1jz0v6d` (master programme) — **untouched**, still `Open`.
- `cmqa2y2ga0000l704glnfro1f` (sprint parent) — **untouched**, still `Open`.
- All 18 historical Phase 4C.1 closed rows from PR #346 — **untouched**, still `Closed` with hard-close history intact.
- Lead rows in `prisma.lead` — **no deletes, no status changes**. Only the `concierge-leads-list` API enriches the response shape; the underlying table is read-only here.
- Tenant boundaries — every new server-side helper is tenant-pure (the heuristic does not touch DB, the sprint extractor reads only `console_json`, both are pure).
- Media governance — `lib/cmp/_lib/lux-request-attachments.js` and the upload / review / link / publish flow are unchanged. PR #347 only renames the operator-desk surface and adds the guidance panel.
- IDX / MLS / fake inventory — none introduced. The demo opportunity is hidden, not faked.

---

## 7. Follow-up packets (not in PR #347)

- **Checklist persistence** — wire `console_json.lux_content_sprint_checklist[]` via a new `lux-content-sprint-checklist-patch` action with an idempotency key per item (see `LUX_CONTENT_POPULATION_SPRINT.md` § 8b).
- **Bulk-archive concierge test leads** — the heuristic now flags them; a separate operator packet can hard-soft-archive (no delete) `system_generated: true` rows by setting `status='archived'` once an operator session decides to. Out of scope for PR #347.
- **Lux operator queue UI counts strip** — show "Archived (N)" as a separate visible chip on `/change`. Currently the count is only visible via the audit script. The classifier already routes closed rows correctly (PR #346); this is a UI follow-up.

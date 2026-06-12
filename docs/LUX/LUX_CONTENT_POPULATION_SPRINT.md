# LuxeMaurice Content Population Sprint — operational programme

**Status (2026-06-11):** Programme formalized in CMP — sprint parent enriched, **four child workstreams live** (`Open / Intake / awaiting_operator_review`).  
**Sprint parent ticket:** `cmqa2y2ga0000l704glnfro1f` (created 2026-06-11 22:39 UTC; promoted to operational sprint parent 2026-06-11 23:42 UTC).  
**Master strategic ticket:** `cmo8mjijk0000jl04l1jz0v6d` — **remains open; not modified by this sprint**.  
**Tenant:** `luxe-maurice`.  
**Production host:** `https://lux.corpflowai.com/`.  
**Owner (business):** Jan / LuxeMaurice internal user.  
**Owner (technical):** Operator (Anton).

**Live sprint child tickets (created 2026-06-11 23:42 UTC):**

| Code | Ticket ID | Title |
|---|---|---|
| C1 | `cmqa57uyt0000xf803uav5x8x` | Content sprint C1 — Homepage property imagery package |
| C2 | `cmqa57ve00001xf80tpgmjeiz` | Content sprint C2 — First real private opportunity |
| C3 | `cmqa57vlg0002xf805d7azdk2` | Content sprint C3 — Demo / preview opportunities hidden from public |
| C4 | `cmqa57vsr0003xf80y543sx20` | Content sprint C4 — Jan validation E2E |

All four children carry `tenantId=luxe-maurice`, `parent_programme_ticket=cmo8mjijk0000jl04l1jz0v6d`, and `parent_sprint_ticket=cmqa2y2ga0000l704glnfro1f`. Operator queue audit on 2026-06-11 confirms they group cleanly under **Property & media** with no leakage into Smoke / CRM.

> **Where this sits.** The vision-aligned public experience is **live** (PR #343 — see `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` § 14). The next blocker is **not** core platform infrastructure — it is **real, client-approved content**: homepage imagery, the first real private opportunity, governed gallery imagery, cleanup of demo / preview content, and Jan’s end-to-end validation. This sprint is the operational programme that turns the brand-ready platform into a commercially usable one.

---

## 1. P0 objective

> Populate the live LuxeMaurice platform with real, client-approved content so the site can be used commercially.

“Commercially usable” means: Jan can show `https://lux.corpflowai.com/`, `/properties`, `/property/<real-slug>`, and `/concierge` to a prospective LuxeMaurice client without apology, without placeholder gradients on published slots, and without demo `lm-*` slugs masquerading as real inventory.

---

## 2. Programme structure

### Parent (operational)

- **Ticket:** `cmqa2y2ga0000l704glnfro1f` (created 2026-06-11 22:39 UTC).  
- **Title:** `LuxeMaurice Content Population Sprint`.  
- **Already a Phase 4B child of:** `cmo8mjijk0000jl04l1jz0v6d` via `console_json.parent_programme_ticket`.  
- **Formalization additions:** programme objective + workstreams + reality gate written to `console_json.lux_programme_meta`; description appended (not overwritten) with the programme block (marker `<!-- lux-content-sprint-formalized:2026-06-11 -->`); `console_json.child_request_ids[]` filled with the four workstream child ids after creation; an `assistant`-role formalization message appended to `console_json.messages[]`. Original intake words preserved.

### Children (four workstreams)

Each child is created via the same Phase 4B convention used by `lib/cmp/_lib/lux-client-requests.js` (`request_type='property_update'`, `priority='High'`, `status='Open'`, `stage='Intake'`, `workflow_state='awaiting_operator_review'`). Each carries **both**:

- `console_json.parent_programme_ticket = cmo8mjijk0000jl04l1jz0v6d` (so it appears in the existing programme related-requests list — no UI change needed)
- `console_json.parent_sprint_ticket = cmqa2y2ga0000l704glnfro1f` (sprint linkage)

| Code | Title | Owners | Dependencies |
|---|---|---|---|
| **C1** | Homepage property imagery package (hero + lifestyle + arrival + owner experience) | Jan (content + approval) · Operator (governed publish gate) | — |
| **C2** | First real private opportunity (Postgres listing + 5 governed gallery images + concierge link) | Jan (content + approval) · Operator (admin create + publish) | C1 (brand visual alignment); C3 (clean state before public visibility) |
| **C3** | Demo / preview opportunities hidden from public; only published listings on `/properties` and `/property/<slug>` | Operator | — |
| **C4** | Jan validation E2E (editor login → opportunity create/edit → publish → public render → concierge link) | Jan (primary) · Operator (provisioning support) | C2 (real opportunity to validate); C1 + C3 (clean visual + clean public state) |

---

## 3. Workstream detail

### C1 — Homepage property imagery package

**Goal:** replace placeholder visual treatment on `https://lux.corpflowai.com/` with real, governed, client-approved imagery that matches the Strategic Vision presentation.

**In scope (real bytes through the Phase 4 governed pipeline — review → link → publish):**

- Hero treatment: Mauritius coastline / luxury villa exterior / dusk lighting.
- Strategic Mauritius lifestyle visual (lifestyle / security / connectivity context).
- Private aviation or arrival imagery.
- Marina / business lifestyle / luxury living imagery.
- Owner experience imagery: architect interaction, finish selection, interior design review, remote client participation.

**Out of scope:** video on public surfaces; auto-publish; CDN / transforms; any image that is not explicitly approved by Jan.

**Acceptance criteria:**

- At least four distinct images uploaded → reviewed → linked → published via existing Lux CMP attachment actions (no auto-publish).
- Visible on `https://lux.corpflowai.com/` against the approved brand tokens (no broken layout, no placeholder gradients in published slots).
- No fake inventory or feed-shaped previews introduced as a side effect.
- Per-image governance audit trail (review status, reviewer, publish timestamp) preserved in `cmp_ticket_attachments` + `console_json.lux_request_meta.attachments[]`.

### C2 — First real private opportunity

**Goal:** ship the first real, client-approved private opportunity on `/properties` and `/property/<slug>`, end-to-end through the existing governed pipeline.

**In scope:**

- Create a `lux_listings` row via `/properties/admin` (Postgres-backed) with: title, slug (`lm-…`), region, property type, status, optional price guidance, short teaser, overview, lifestyle context, advisory notes, at-a-glance fields, consultation CTA.
- Upload ≥5 client-approved images via `/change` attachments → review → link → publish (image only, image MIME).
- Hero/card/gallery slot assignment per Lux media governance (no auto-publish; explicit publish per slot).
- Concierge CTA carries `property=<real-slug>` context end-to-end.

**Out of scope:** video on public surfaces; IDX / MLS / feed-shaped data; any image not explicitly approved by Jan; pricing claims not approved by Jan.

**Acceptance criteria:**

- `/properties` lists the new opportunity (card render with governed card image).
- `/property/<real-slug>` renders the Private Opportunity Memorandum with `Overview` / `Lifestyle` / `Advisory` / `At a glance` and a published gallery.
- `/concierge` from the property CTA preserves `property=<real-slug>` in the lead.
- All images on the public surface have been through review + link + publish (no draft / preview bytes leak).

### C3 — Demo / preview opportunities hidden from public

**Goal:** ensure the public LuxeMaurice surfaces never present demo, smoke, or feed-shaped preview opportunities as real inventory. **Audit history stays intact (no deletes).**

**Today (audit, 2026-06-11):** the published catalogue on Postgres is empty (`/properties` `__NEXT_DATA__.listings: []`), but the staged catalogue still resolves five `lm-*` preview slugs through `/property/<slug>`:

- `lm-villa-belombre`
- `lm-pent-plateau`
- `lm-nc-ridge`
- `lm-pipeline-q4`
- `lm-phase2d-manual-demo`

**Recommended option per slug** (operator chooses per-slug):

- (a) Gate behind `?preview=1` operator session only (default recommendation).
- (b) Replace with a real published listing from C2 and retire the slug.
- (c) Leave publicly visible only if labelled explicitly as illustrative reference, not real inventory.

**Out of scope:** deleting any database rows; deleting any attachments; deleting CMP tickets; touching the master programme ticket.

**Acceptance criteria:**

- Each of the five preview slugs is either (a) no longer reachable to anonymous users (404 or operator-only `?preview=1`) or (b) replaced by a real published listing under C2 or (c) clearly labelled illustrative.
- Sitemap audited; no stale `lm-*` preview paths advertised publicly without label.
- All audit history preserved (no row deleted).

### C4 — Jan validation E2E

**Goal:** confirm the LuxeMaurice platform is commercially usable from Jan’s perspective — login, content edit, governed media publish, public render, concierge linkage — on the live production surface.

**In scope:**

- Jan signs into `/login?next=/properties/admin` on `https://lux.corpflowai.com/`.
- Jan creates or edits the C2 real opportunity (or a second opportunity if Jan chooses).
- Jan uploads + reviews + links + requests publish of at least one governed image.
- Jan confirms `/property/<slug>` renders correctly with governed imagery and editorial copy.
- Jan confirms `/concierge?intent=property&property=<slug>` carries the context.
- Jan provides written confirmation on the sprint parent ticket: *“platform is commercially usable for LuxeMaurice”*.

**Out of scope:** code changes; new feature work; widening admin scope; introducing new env vars.

**Acceptance criteria:**

- Jan logs in successfully on production (operator may co-pilot only if required for provisioning).
- Jan completes one end-to-end create → publish loop on a real opportunity.
- Jan reviews live public render.
- Jan posts confirmation message on the sprint parent ticket.

---

## 4. Dependency map

```
        ┌────────────────────────────────────────────────┐
        │ cmo8mjijk0000jl04l1jz0v6d                      │
        │ Master strategic programme (Approved/Build)    │
        │ ── not modified by this sprint                 │
        └────────────────────────────────────────────────┘
                            ▲
                            │ parent_programme_ticket
                            │
        ┌────────────────────────────────────────────────┐
        │ cmqa2y2ga0000l704glnfro1f                      │
        │ LuxeMaurice Content Population Sprint (parent) │
        │ lux_programme_meta + child_request_ids[]       │
        └────────────────────────────────────────────────┘
              ▲                ▲                ▲                ▲
              │ parent_sprint_ticket on each child
              │                │                │                │
            ┌────┐           ┌────┐           ┌────┐           ┌────┐
            │ C1 │           │ C2 │           │ C3 │           │ C4 │
            │Home│           │Real│           │Hide│           │ Jan│
            │imgs│◀──────────│opp │◀──────────│demo│           │val │
            └────┘  brand    └────┘  clean    └────┘           └────┘
                    visual            public                     ▲
                    align             state                      │
                                                                 │
                                  C2 + C1 + C3 must hold before C4 sign-off
```

---

## 5. Reality Gate (programme COMPLETE only when all hold)

- `https://lux.corpflowai.com/` shows real approved imagery (no placeholder gradients on published slots).
- `https://lux.corpflowai.com/properties` shows at least one real approved private opportunity, **OR** an intentional premium empty state if Jan has not authorised a listing.
- `https://lux.corpflowai.com/property/<real-slug>` shows real content and real governed imagery.
- `https://lux.corpflowai.com/concierge` links correctly to opportunity context (`property=<real-slug>`).
- No fake inventory appears publicly (no demo `lm-*` slug resolves as real inventory).
- Jan **and** Anton both verify live and sign off on the sprint parent ticket.

The sprint is **PARTIAL** until **all six** conditions are live-verified per `.cursor/rules/delivery-reality.mdc`. The master programme ticket `cmo8mjijk0000jl04l1jz0v6d` remains **open** regardless of sprint outcome.

---

## 6. Non-negotiables (cross-link)

This sprint inherits the canonical guardrails from the repositioning packet (PR #342) and the vision-aligned public experience (PR #343):

- **No IDX**, no MLS, no realtor-platform language reintroduced. Audit guard in `node-tests/luxe-maurice-vision-positioning.test.mjs` stays green.
- **No fake inventory** as real public content. Demo `lm-*` slugs are illustrative only and are addressed in C3.
- **No auto-publish**; publication remains explicit per `docs/LUX/LUX_MEDIA_GOVERNANCE.md`.
- **No video on public surfaces** without separate security review.
- **No new env vars.**
- **Tenant isolation preserved.** All sprint child tickets are `tenantId=luxe-maurice`; admin remains auth-gated at `/properties/admin`.
- **Master ticket `cmo8mjijk0000jl04l1jz0v6d` is not closed** by this sprint.

---

## 7. CMP write summary

The sprint is formalized in CMP by `scripts/lux-content-sprint-formalize.mjs`:

1. **Parent enrichment** on `cmqa2y2ga0000l704glnfro1f`:
   - `description` — appends the programme block once, gated by the marker `<!-- lux-content-sprint-formalized:2026-06-11 -->`.
   - `console_json.lux_programme_meta` — programme objective, workstreams, reality gate, parent master ticket reference.
   - `console_json.child_request_ids[]` — populated with the four created child ids (deduped + merged with any prior values).
   - `console_json.messages[]` — appends one `assistant`-role formalization message.
2. **Children created** (four):
   - C1, C2, C3, C4 (see § 2 table). Each `tenantId=luxe-maurice`, `status=Open`, `stage=Intake`, `workflow_state=awaiting_operator_review`, `parent_programme_ticket=cmo8mjijk0000jl04l1jz0v6d`, `parent_sprint_ticket=cmqa2y2ga0000l704glnfro1f`.
3. **No deletes. No row removed. No closed-ticket bytes touched.**
4. **Idempotent.** Re-running the script skips children whose `(parent_sprint_ticket, sprint_code)` already exists; parent description block is appended at most once.

Dry-run snapshot lives at `.lux-verify/content-sprint-formalize-dryrun.json` during operator review (gitignored under `.lux-verify/`); the live execute snapshot is `.lux-verify/content-sprint-formalize-execute.json`.

### 7a. Operator-queue classifier patch (2026-06-11)

The live operator queue (`/change`) truncates `requested_change` to 120 chars before running `lib/client/lux-change-queue-classify.js`. Of the four newly created sprint children, only C1 contained a Property & media keyword (`property`) in its first 120 chars; C2 / C3 / C4 fell back to **Active client** (and C3 picked up `\bsmoke\b` further down). A second, idempotent script — `scripts/lux-content-sprint-classify-fix.mjs` — prepends a one-line **lead-in** to each of C2 / C3 / C4 that contains the right keywords (`property`, `gallery`, `published`, `publish`) and avoids the words that would trigger the earlier-checked smoke or CRM regexes (`\bsmoke\b`, `\btest\b`, `\bconcierge\b`, `\bcrm\b`, `\b(enquiry|inquiry)\b`):

- **C2** lead-in: *“Sprint property / media workstream — first real published `lux_listings` opportunity + governed gallery + private consultation route.”*
- **C3** lead-in: *“Sprint property / media workstream — demo / preview property opportunities hidden from public listings; governed `published`-only on /properties.”*
- **C4** lead-in: *“Sprint property / media workstream — Jan editor validation: opportunity create / edit / publish / public render / private consultation route.”*

Idempotency is tracked on `console_json.lux_request_meta.classify_leadin_v1=true` (not via a visible HTML comment in the description). Original intake words are preserved underneath the lead-in. Post-fix audit (2026-06-11 23:50 UTC) shows all four children under **Property & media**; CRM is empty.

---

## 8. Operator handoff (post-formalization)

When the four child tickets are live, the operator desk on `https://lux.corpflowai.com/change` will show four new rows classified into the **Property & media** bucket (titles contain `property` / `gallery` / `publish` / `listing`).

### 8a. Operator desk after 2026-06-11 queue cleanup

The 18 historical Phase 4C.1 attachment-review smoke / test artifact tickets that previously populated the Smoke bucket were **hard-closed** on 2026-06-11 by `scripts/lux-close-phase4c1-smoke-tickets.mjs --execute` (see `docs/runbooks/LUX_OPERATOR_QUEUE_CLEANUP_2026_06_11.md`). Since `lib/cmp/router.js#ticket-operator-queue` server-side filters `status='Closed'` rows, the default operator desk now reads:

> Programme (1) · Active (1) · **Property (4)** · CRM (0) · Internal (0) · Smoke (0)

The 4 in Property & media is the **sprint children C1–C4** — intentional active work, not noise. The 18 closed historical rows remain auditable via `node scripts/lux-queue-audit.mjs --include-closed`, where they now appear under the dedicated **Archived / completed** bucket added by the same cleanup packet to `lib/client/lux-change-queue-classify.js`.

Each child opens with `awaiting_operator_review` and the operator advances workflow per the same conventions used today for Phase 4B requests.

---

## 9. Cross-references

- `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` — § 15 *Vision-aligned content population sprint (PR #345 doc packet)*.
- `docs/LUX/LUX_DELIVERY_PROGRAMME.md` — Phase 2 note linking the operational sprint.
- `docs/LUX/LUX_MEDIA_GOVERNANCE.md` — governing rules for upload → review → link → publish on every image referenced in C1 + C2.
- `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md` — operator review playbook used for C1 + C2 attachments.
- `docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md` — canonical manual intake path used in C2.
- `lib/cmp/_lib/lux-client-requests.js` — Phase 4B request shape that the four sprint children use.
- `lib/client/lux-change-queue-classify.js` — classifier that places the sprint children into the **Property & media** bucket on the operator desk.

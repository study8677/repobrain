# LuxeMaurice delivery programme (staged) — ticket truth

**Authoritative ticket:** `cmo8mjijk0000jl04l1jz0v6d` (**Approved / Build**).  
**Official production URL:** `https://lux.corpflowai.com/`

**Programme control (operator-recorded, 2026-05-01):** Client approved **Phase 1** direction; **Phase 1** is recorded as **complete / approved**. **Phase 2** is **active** for **property discovery / IDX planning** (first slice only — listing source **TBD**: staged curated vs real IDX/feed vs hybrid). Operator next action: *Define listing source (staged vs IDX vs hybrid) and implement first property discovery slice.* Apply ticket patch via `node scripts/lux-record-phase1-approve-initiate-phase2.mjs --execute` (Lux tenant + ticket id asserted; does not change `status`/`stage`).

## Purpose

This document prevents a common failure mode: shipping a **useful** public homepage and then accidentally treating it as “IDX site delivered” or “CRM delivered.”

It classifies the current LuxeMaurice work correctly as **Phase 0** and defines the **full staged delivery programme** (Phases 1–5) that must be recorded and verified in `/change` before the ticket can be treated as operationally complete.

## Current reality (what exists today)

- **Phase 1 (programme):** client direction **approved**; ticket records Phase 2 **active (discovery)** — see acceptance criteria and scope in ticket `console_json.lux_delivery_programme` and appended programme audit on the ticket description.
- **Phase 0 / 1 public surface**: `lux.corpflowai.com` `/` is served by **Next.js** tenant marketing (`pages/index.js`). `vercel.json` may also map `/` to `lux-landing-static.html` on Lux hosts; whichever route wins in Vercel must still **200** on production.
- **LuxeMaurice-only presentation**: when `tenant_id === 'luxe-maurice'`, SSR sets `client_ui.lux_acquisition` and the UI uses **`components/LuxeMauriceTenantPresentation.js`** (island / developer-led brand). Other tenants keep the generic `TenantSite` layout.
- **Current lead capture path**: `/concierge` (posts to `concierge-lead-create` and creates a lead).
- **Phase 1 → Phase 2 handoff (ticket `cmo8mjijk0000jl04l1jz0v6d` only):** after client approval is recorded, operators run `scripts/lux-ticket-phase2-initiate.mjs` (see script header). That persists **`console_json.lux_programme`** (phase statuses, first-slice scope, `operator_next_action`) and appends description notes. **Phase 2 first-slice acceptance** lives in **`docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`**. **Phase 2B hybrid:** curated cards remain primary; **Explore more properties** adds a feed-shaped mock layer (`lxf-*` ids) with the same concierge handoff — replace `feed_properties` at the adapter when IDX is chosen (see acceptance doc).
- **Phase 2D manual curated:** operator-managed listings **without IDX** — intake, schema, and audit-friendly `manual_curated` source in leads/`/change`; see **`docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md`**.

## Non‑negotiable rules (ticket truth)

1. **Homepage ≠ programme completion.** A homepage-only deployment may be valuable for acquisition, but it must **never** close or satisfy ticket `cmo8mjijk0000jl04l1jz0v6d`.
2. **Every phase must be recorded inside the ticket** with:
   - **client-visible outcome**
   - **scope**
   - **owner** (who drives the phase)
   - **production URL verification** (live URLs tested)
   - **operator next action** (what the operator does next in `/change`)
3. **Delivery state discipline:** local code, CI green, or “merged” is not completion. Production must be **live verified** on real client URLs (see delivery reality rules).

## Phases and gates (what “done” means per phase)

Each phase below must be represented in the ticket’s narrative and acceptance criteria in `/change` (not just in chat).

### Phase 0 — Temporary public holding / acquisition page (allowed early)

- **Client-visible outcome**: `GET /` loads as a real website and provides a clear contact path.
- **Scope**:
  - Homepage sections (Hero, Services, CTA)
  - CTA routes to `/concierge`
- **Owner**: Tenant marketing surface owner (operator + implementer)
- **Production verification**:
  - `GET https://lux.corpflowai.com/` → **200**
  - CTA “Contact Us” → `/concierge` loads
  - Concierge submission works and creates a lead
- **Operator next action**: confirm leads arrive, then proceed to Phase 1 decisions (below)

### Phase 1 — Premium acquisition funnel + enriched lead capture

- **Client-visible outcome**: a refined acquisition journey (copy + proof + segmenting) that improves conversion.
- **Scope** (examples; pick what’s in-scope in the ticket):
  - **Brand-aligned tenant presentation** (LuxeMaurice only): warmer island palette, property-first sections, developer language — see `components/LuxeMauriceTenantPresentation.js` + `lib/client/luxe-maurice-brand-theme.js`; does not change Core or other tenants.
  - Enriched form fields (budget, timeframe, intent, location, contact channel)
  - Clear promise and response SLA
  - Basic analytics/measurement decision (what is tracked and where)
- **Owner**: Operator + marketing owner
- **Production verification**: conversion flow works end-to-end; operator can see leads + context
- **Operator next action**: decide whether to go Phase 2 (IDX) or staged listings

### Phase 2 — IDX / property discovery

- **Client-visible outcome**: visitors can browse and discover properties in a trusted, premium flow.
- **Scope**:
  - IDX provider integration **or** staged listings-first (explicit decision)
  - Search/filter and property detail experience
  - Compliance requirements (licensing, disclaimers, data usage) captured
- **First slice + hybrid + detail pages (LuxeMaurice, before full IDX):** listing cards on `lux.corpflowai.com`, **minimal** filter/grouping on **featured curated** inventory, plus a distinct **Explore more properties** band for feed-style previews (mock until provider wired). **`/property/<ref>`** detail pages (curated + feed) link to `/concierge` with the same property ref. Enquiry CTA per property to `/concierge` with **property context** in the lead. See **`docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`**. **Manual curated workflow (no IDX):** **`docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md`**.
- **Owner**: Implementer + operator (vendor coordination)
- **Production verification**: discovery works on production URL; data freshness expectations documented
- **Operator next action**: define how discovery feeds CRM/operator workflow (Phase 3); until then, follow `lux_programme.operator_next_action` on the ticket when set

### Phase 3 — CRM / operator workflow in `/change`

- **Client-visible outcome**: the business can respond reliably; no “lost lead” path.
- **Scope**:
  - **First slice + 3A.5 hardening (LuxeMaurice):** concierge lead CRM in `/change`, authenticated Lux-only lead list, stage audit + activity feed + assignable owner — **`docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md`**.
  - **Phase 3B (same doc — CRM maturity):** **`next_action_at`** / **`next_action_note`** on `lux_operator_workflow`; computed **`overdue_follow_up`**, **`stale_lead`**, **`untouched_new`**; `/change` filters (stage, owner, property, health); CRM summary strip by stage; assignment visibility + activity (including **`next_action_updated`**). Explicitly excludes automation, AI, notifications, exports, reporting suites, external CRM sync, and extra CRM schema tables.
  - Lead triage, assignment, follow-up status
  - Handoff from web enquiries into operator queue (source-of-truth decision)
  - Internal SLA and escalation
- **Owner**: Operator (process) + implementer (wiring)
- **Production verification**: operator can reliably process leads without DB access; audit trail exists; Phase 3B scheduling + filters + summary strip verified on **`https://lux.corpflowai.com/change`** with Lux session; public **`/concierge`** does not expose workflow metadata
- **Operator next action**: define automation sequences + AI channel (Phase 4 decisions)

### Phase 4 — Marketing automation + AI engagement

- **Client-visible outcome**: immediate, useful engagement while maintaining brand and trust.
- **Scope**:
  - First automation sequence (welcome, qualification, scheduling)
  - First AI channel (web/email/WhatsApp/SMS) — explicit decision
  - Human handoff rules + SLA and safety constraints
- **Owner**: Operator + automation owner
- **Production verification**: automation triggers are observable; failures are recoverable; no secrets leak
- **Operator next action**: move to Phase 5 verification + client handoff

### Phase 4B — Tenant-scoped request intake (LuxeMaurice, inside `/change`)

- **Purpose**: allow LuxeMaurice operators/clients to create **additional scoped requests** for ongoing refinement work **without overwriting** the master programme ticket `cmo8mjijk0000jl04l1jz0v6d`.
- **Surface**: Lux tenant session only on `https://lux.corpflowai.com/change` (operator authenticated). Not on public pages.
- **Model**: creates a **new CMP ticket** scoped to tenant `luxe-maurice` with `console_json.parent_programme_ticket = cmo8mjijk0000jl04l1jz0v6d` and `console_json.lux_request_meta` (type/priority/property reference).
- **Defaults**: `stage=Intake`, `status=Open`, `workflow_state=awaiting_operator_review`.
- **Scope exclusions**: not a full PM system — no comments/threads, notifications, Kanban, email/SMS/WhatsApp sending, automation, AI, or external integrations. Uploads are scoped separately under Phase 4C.

### Phase 4C — Request attachments (private, operator-only)

- **Purpose**: allow Lux operators (and authenticated Lux clients on `/change`) to attach images, video, or PDF to a Lux client-request ticket so the operator has the source material when scoping work.
- **Surface**: `https://lux.corpflowai.com/change` for intake/review/link/publish controls. Bytes live in `cmp_ticket_attachments` (already deployed); per-attachment metadata lives in `console_json.lux_request_meta.attachments[]` (Phase 4C.1+).
- **Scope exclusions**: no **CDN/transforms**, **auto-publish**, **video** on public property-media surfaces, or automation/AI around media. Governed **hero + multi-image gallery** publishing is **Phase 4D.1** (see **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`** + **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`**).

### Phase 4C.1 — Operator media review

- **Purpose**: give the operator a clear, audited path to mark each uploaded attachment as `pending_review` → `reviewed` → `rejected` with an optional note, before any approved media is reused on the public site (which itself remains a separate, deferred phase).
- **Surface**: Attachments panel on `/change` for the selected Lux client-request ticket; new CMP action `lux-attachment-review-set` (Lux tenant + Lux host only).
- **Persistence**: review state writes to `console_json.lux_request_meta.attachments[<id>]` (`review_status`, `review_note`, `reviewed_at`, `reviewed_by`) and appends a `lux_attachment_review` message to `console_json.messages[]`.
- **Production verification**: see **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`** for the operator verification checklist (upload, status round-trip, tenant isolation, no public exposure).

### Phase 4C.2 — Reviewed media → property linkage (private)

- **Purpose**: allow operators to associate **reviewed** attachments with a LuxeMaurice property record, without publishing. This prepares for a later, explicitly governed “publish approved media” phase.
- **Rule**: reviewed-only (pending/rejected cannot link).
- **Persistence**: `console_json.lux_request_meta.attachments[].property_links[]` (metadata only; no bytes duplicated).
- **Surface**: `/change` Attachments panel (reviewed entries only) + CMP actions `lux-attachment-property-link-set` and `lux-attachment-property-link-remove` (Lux tenant + Lux host only).

### Phase 4C.3 — Operator publish gate (reviewed + linked + image → public hero route)

- **Purpose**: let an operator explicitly move a **single** `(property_slug, intended_slot)` link from `unpublished` → `published` so the governed public image route (and optional `/property/[slug]` hero) can load **only** that asset. **Video stays private.**
- **Rule**: Lux tenant session + Lux host + Dormant Gate; ticket and attachment must be `luxe-maurice`; attachment must be **reviewed**, **image** MIME, tracked in `lux_request_meta.attachments[]`, with a matching **property link**; `property_slug` must resolve via `resolveLuxPropertyRef`; slot allowlist unchanged. No `tenant_id` from client; CMP JSON responses use **`safeLuxAttachmentShape`** only (no bytes).
- **Persistence**: same `property_links[]` row — `publish_status`, `published_at` / `published_by`, `public_caption`, `public_alt_text`, and on unpublish `unpublished_at` / `unpublished_by` (prior publish audit + caption/alt preserved on the row).
- **Surface**: `/change` per-link publish controls + `lux-attachment-property-publish` / `lux-attachment-property-unpublish` + `GET /api/lux/property-media`. See **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`**.

### Phase 4D.1 — Multi-image property gallery (governed public)

- **Purpose**: extend Phase 4C.3’s single-hero publish path to **multiple published gallery images** per property, with explicit operator controls (`gallery_order`, optional `is_gallery_cover`, `public_caption`, `public_alt_text`) on **`intended_slot === gallery`** links only. **Reference / card / detail** slots remain non-public in this phase.
- **Rule**: same publish gate as 4C.3 (**reviewed + linked + image + explicit publish**); no video on public routes; no auto-publish; Lux host + `luxe-maurice` context on **`GET /api/lux/property-media`** and **`GET /api/lux/property-media-list`**. List JSON exposes **only** safe display fields (no operator audit, no raw storage paths, no `lux_request_meta`).
- **Persistence**: additional fields on the same `property_links[]` rows for gallery slot (`gallery_order`, `is_gallery_cover`); at most one **published** gallery cover per property **per ticket** when operators set cover (other published gallery covers on that ticket are cleared).
- **Surface**: `/change` gallery publish panel; **`/property/[slug]`** renders hero + optional **Gallery** grid. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.

### Phase 5 — Production reality gate and client handoff

- **Client-visible outcome**: the delivered system matches the programme claims; clients can use it.
- **Scope**:
  - Live URL verification of the end-to-end journey
  - Operator handoff checklist (who does what weekly)
  - Client-facing comms: what is live, what’s next, what’s excluded
- **Owner**: Operator
- **Production verification**:
  - Record production deployment commit and tested URLs (delivery reality audit)
  - Ensure preview pipeline integrity is not “UNKNOWN” for phases that require it
- **Operator next action**: formal close language (or partial) aligned with reality

## Open decisions (must be captured in the ticket before Phase 1–4 work)

- **IDX**: choose an IDX provider vs staged listings-first?
- **Markets**: one combined market or separate France / South Africa / Russia journeys?
- **CRM**: integrate external CRM or lightweight `/change` workflow first?
- **First AI channel**: web, email, WhatsApp, or SMS?
- **Human handoff**: owner and SLA?
- **First marketing automation sequence**: what is the first “welcome → qualify → schedule” path?

## Cross-references

- Route governance: `docs/ROUTE_GOVERNANCE.md` (public vs tenant routes; `/concierge` is tenant-local)
- Change workflow: `docs/CHANGE_WORKFLOW.md` (client decisions are first-class)
- Core/tenant boundaries: `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md`
- Lux v1 acceptance checklist (Phase 0/early site checks): `docs/lux-v1-acceptance.md`
- Phase 2 first-slice acceptance (ticket `cmo8mjijk0000jl04l1jz0v6d`): `docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`
- Phase 2D manual property workflow: `docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md`
- Phase 3 CRM first slice + 3A.5 (LuxeMaurice): `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md`
- Phase 4C / 4C.1 / 4C.2 / 4C.3 attachments + publish gate: `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`
- Phase 4D.1 gallery + media governance: `docs/LUX/LUX_MEDIA_GOVERNANCE.md`


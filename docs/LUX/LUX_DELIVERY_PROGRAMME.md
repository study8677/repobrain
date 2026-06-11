# LuxeMaurice delivery programme (staged) — ticket truth

**Authoritative ticket:** `cmo8mjijk0000jl04l1jz0v6d` (**Approved / Build**).  
**Official production URL:** `https://lux.corpflowai.com/`

> **Repositioning (2026-06-11) — read first:** the active LuxeMaurice direction is now the **LuxeMaurice Private Wealth & Lifestyle Platform** (see `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md` and `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md`). Any framing in this document of Phase 2 as *“IDX / property discovery”* is **superseded for active direction**. The active requirement is **manual-first curated private opportunities, with future optional integrations only if strategically required**. Historical audit blocks remain unchanged for the record. The master programme ticket remains **open**.

**Programme control (operator-recorded, 2026-05-01 — superseded for active direction 2026-06-11):** Client approved **Phase 1** direction; **Phase 1** is recorded as **complete / approved**. **Phase 2** is **active** for the **private opportunities surface** (curated, manual-first; the prior framing of *“IDX planning”* is no longer the active requirement). Operator next action: *deliver the LuxeMaurice Vision-Aligned Public Experience (Slice 1) and continue manual-first curated private opportunities*. Historical handoff script: `node scripts/lux-record-phase1-approve-initiate-phase2.mjs --execute` (Lux tenant + ticket id asserted; does not change `status`/`stage`).

## Purpose

This document prevents a common failure mode: shipping a **useful** public homepage and then accidentally treating it as “platform delivered.”

It classifies the staged LuxeMaurice work and defines the **full staged delivery programme** (Phases 1–5) that must be recorded and verified in `/change` before the ticket can be treated as operationally complete.

The **active** scope is the *LuxeMaurice Private Wealth & Lifestyle Platform* (see the Repositioning note at the top of this file). Historical phase notes are kept for the record.

## Current reality (what exists today)

- **Phase 1 (programme):** client direction **approved**; ticket records Phase 2 **active (discovery)** — see acceptance criteria and scope in ticket `console_json.lux_delivery_programme` and appended programme audit on the ticket description.
- **Phase 0 / 1 public surface**: `lux.corpflowai.com` `/` is served by **Next.js** tenant marketing (`pages/index.js`). `vercel.json` may also map `/` to `lux-landing-static.html` on Lux hosts; whichever route wins in Vercel must still **200** on production.
- **LuxeMaurice-only presentation**: when `tenant_id === 'luxe-maurice'`, SSR sets `client_ui.lux_acquisition` and the UI uses **`components/LuxeMauriceTenantPresentation.js`** (island / developer-led brand). Other tenants keep the generic `TenantSite` layout.
- **Current lead capture path**: `/concierge` (posts to `concierge-lead-create` and creates a lead).
- **Phase 1 → Phase 2 handoff (ticket `cmo8mjijk0000jl04l1jz0v6d` only):** after client approval is recorded, operators run `scripts/lux-ticket-phase2-initiate.mjs` (see script header). That persists **`console_json.lux_programme`** (phase statuses, first-slice scope, `operator_next_action`) and appends description notes. **Phase 2 first-slice acceptance** (historical record of what shipped in Slice A/B/C) lives in **`docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`**. The historical *Phase 2B* hybrid (`lxf-*` feed-shaped preview cards on the homepage) is **no longer rendered** under the active vision — see the repositioning record.
- **Phase 2D manual curated (now the canonical private opportunities intake path):** operator-managed curated opportunities — intake, schema, and audit-friendly `manual_curated` source in leads/`/change`; see **`docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md`**.

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
- **Operator next action**: proceed to Phase 2 (private opportunities surface)

### Phase 2 — Private opportunities surface (curated, manual-first)

> **Active framing (2026-06-11).** The prior framing of *Phase 2 — IDX / property discovery* is **superseded for active direction**. The historical Slice A/B/C delivery audits captured under this phase are preserved unchanged below the active text.

- **Client-visible outcome**: visitors meet a quietly confident, editorial *Private Opportunities* surface — curated completed residences and development opportunities are previewed publicly, with depth available only through private advisory.
- **Active requirement**: **manual-first curated private opportunities, with future optional integrations only if strategically required**. No IDX / MLS / external real-estate feed is required for active delivery.
- **Scope**:
  - `/properties` and `/property/[slug]` reframed as *Private Opportunities* / private opportunity overview (not as a listings catalogue).
  - Curated manual intake via the existing visual editor (`/properties/admin`) and the manual-curated workflow.
  - Public surfaces use **published-only** Postgres rows; **no fake inventory** on the homepage.
  - Empty states use premium *“Private opportunities are being prepared for client review”* + *“Request a private consultation”* CTA.
- **Owner**: Implementer + operator.
- **Production verification**: live `/` , `/properties`, `/property/[slug]`, `/concierge` on `https://lux.corpflowai.com/` reflect the vision-aligned positioning; tenant boundaries preserved; lead capture remains green.
- **Operator next action**: continue the *LuxeMaurice Vision-Aligned Public Experience* slice and the **operator action** recorded in `docs/LUX/LUXEMAURICE_OPERATOR_TICKET_UPDATE.md`.

> **Vision-Aligned Public Experience — Slice 1 (PR #343, merged 2026-06-11):** brand-fidelity rebuild of `/`, `/properties`, `/property/[slug]`, `/concierge` against the approved Strategic Vision presentation and Brand Guidelines. **Live verified** on `https://lux.corpflowai.com/` against deployment **`5019756150`** on commit **`c5cd3769316c7c793f0dd323c210d92b474f46aa`** — charcoal/ivory/gold/stone palette + Cormorant Garamond/Inter hierarchy + monogram + LUXEMAURICE wordmark + signature “Private. Curated. Considered.” + “This is not a property website.” + “Invited. Not advertised.” + “Confidence at distance.” are all present on production. `/properties/admin` remains **307 → /login?next=…** (auth-gated). No fake inventory; tenant boundaries intact; media governance unchanged. **Full audit:** `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` § 14. The full Phase-2 §8 Reality Gate stays **PARTIAL** until a real client-published listing, editor E2E on production, and governed public imagery on a real listing also clear (Slice C scope). Master ticket **`cmo8mjijk0000jl04l1jz0v6d`** remains **open**.

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

- **Purpose**: extend Phase 4C.3’s single-hero publish path to **multiple published gallery images** per property, with explicit operator controls (`gallery_order`, optional `is_gallery_cover`, `public_caption`, `public_alt_text`) on **`intended_slot === gallery`** links only. **Reference / detail** slots remain off public composition in this phase; **`card`** is public in **Phase 4D.2** (homepage cards).
- **Rule**: same publish gate as 4C.3 (**reviewed + linked + image + explicit publish**); no video on public routes; no auto-publish; Lux host + `luxe-maurice` context on **`GET /api/lux/property-media`** and **`GET /api/lux/property-media-list`**. List JSON exposes **only** safe display fields (no operator audit, no raw storage paths, no `lux_request_meta`).
- **Persistence**: additional fields on the same `property_links[]` rows for gallery slot (`gallery_order`, `is_gallery_cover`); at most one **published** gallery cover per property **per ticket** when operators set cover (other published gallery covers on that ticket are cleared).
- **Surface**: `/change` gallery publish panel; **`/property/[slug]`** renders hero + optional **Gallery** grid. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.

### Phase 4D.2 — Homepage / property card image (`intended_slot === card`)

- **Purpose**: use **explicitly published** **`card`**-slot **images** on LuxeMaurice **homepage** listing cards (staged + resolved feed ids), with **unchanged** fallback to staged `images.hero` or placeholders when no published card exists.
- **Rule**: same publish gate as 4C.3 (**reviewed + linked + image + explicit publish**); **`GET /api/lux/property-media?...&slot=card`**; no video; no auto-publish; composition only in **`LuxeMauriceTenantPresentation`** + SSR in **`pages/index.js`** (`luxe-maurice` only).
- **Surface**: `/change` uses existing slot allowlist + publish controls for **`card`**; no media-library UX.

### Phase 4D.3 — Media lifecycle governance (archive / restore, no byte delete)

- **Purpose**: let operators **retire** media safely: **archive** sets `lifecycle_status: archived`, records audit fields, **unpublishes every** `property_links[]` row for that attachment (metadata + capped per-link **`publish_history`**), and removes the asset from **all** public collectors and **`GET /api/lux/property-media`** without deleting `cmp_ticket_attachments` bytes. **Restore** returns the attachment to `active` but **does not** republish; operators use the normal publish action again.
- **Rule**: Lux tenant + Lux host + Dormant Gate; same ticket/attachment ownership checks as other Lux attachment CMP actions; **no `tenant_id` in request body** for archive/restore; optional trimmed **`archive_reason`** (≤600 chars), e.g. `replaced by <new attachment id>`.
- **Persistence**: attachment-level `lifecycle_status`, `archived_*`, `restored_*`, `archive_reason`; link-level `publish_history` (never exposed on `property-media-list`); `lux_attachment_lifecycle` messages on the ticket.
- **Surface**: `/change` Attachments panel shows lifecycle + history summary + **Archive** / **Restore**; **`lux-attachment-archive`** / **`lux-attachment-restore`**. See **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`** and **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.

### Phase 4D.4 — `/change` media operations polish (summary, filters, where-used)

- **Purpose**: scale **operator usability** as attachment volume grows: at-a-glance counts, local list filters, per-link “where used” clarity, and consistent labels — **without** changing what can become public, **without** CDN/transforms/video publish/DAM/AI, and **without** touching **`/change-v2`**.
- **Rule**: all logic for counts/filters/public-vs-private display is implemented as **pure helpers** in `lib/cmp/_lib/lux-request-attachments.js` (tests in `node-tests/lux-request-attachments.test.mjs`); UI in `pages/change.js` only **reads** attachment state already returned by list endpoints. **No** hard-delete; **archive** stays the safe cleanup action until a future Lux-scoped delete policy exists.
- **Surface**: `/change` Attachments header region (summary + filter `<select>`) and per-card **Where used** + **Test media** hint. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`** and **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`**.

### Phase 4D.5 — Smoke/test cleanup policy (archive-first; smoke hygiene)

- **Purpose**: formalize **smoke/test identification** and **operator-safe cleanup guidance** without hard-deleting bytes by default; optional convenience archive + smoke script artifact summary.
- **Rule**: reuse **`lux-attachment-archive`** / restore semantics from 4D.3; expanded **`detectLuxOperatorTestMediaHint`** + **`luxAttachmentCleanupCandidate`** (not security); **`LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT`** for one-click smoke archive on `/change`. Smoke script **`--archive-smoke-artifacts`** default **off**; archives **only** attachment ids created in that run. **No** DAM/CDN/video/AI; **no** `/change-v2`.
- **Surface**: `/change` badges + **Archive as smoke/test artifact**; `scripts/smoke-lux-phase4c1-attachment-review.mjs` summary + optional flag. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`** and **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`**.

### Phase 5A — Media delivery optimization foundation (cache + variant scaffold; no CDN yet)

- **Purpose**: improve **public image delivery** foundations (HTTP `Cache-Control` for published vs denied responses, strict optional **`variant=`** query for future CDN/transform cache keys, normalized **`Content-Type`**, safe **`variant` + `content_type`** on `property-media-list`, lazy/async decoding on listing/property images) **without** changing review/link/publish/archive semantics, **without** video publish, **without** external object storage/CDN.
- **Rule**: bytes still exit **only** through `lib/server/lux-property-media.js` (`handleLuxPropertyMedia`) after the same gates; collectors in `lib/server/lux-published-property-media.js` and helpers in `lib/cmp/_lib/lux-request-attachments.js` (`buildLuxPublicPropertyMediaSrc`, variant allowlist) remain the **only** supported way to build published `src` URLs. Published **200**: `public, max-age=300, must-revalidate` (**no** `stale-while-revalidate`); denials: `private, no-store`.
- **Surface**: `lib/server/lux-property-media.js`, `lib/server/lux-published-property-media.js`, `components/LuxeMauricePropertyDetailPage.js`, `components/LuxeMauriceTenantPresentation.js`, `scripts/smoke-lux-phase4c1-attachment-review.mjs`, node tests. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.
- **Core assimilation recommendation**: treat **`buildLuxPublicPropertyMediaSrc`** as the canonical URL builder for any new public composition; hang future CDN/transform workers off the **same** route contract so unpublish/archive invalidation stays centralized.

### Phase 5B — Responsive image semantics (width buckets + `srcset`; still original bytes)

- **Purpose**: add **browser-facing** responsive image hints (`srcset`/`sizes`, optional strict **`width=`** on `property-media`) while preserving **5A cache rules** and the **single** governed byte path through `handleLuxPropertyMedia`. No external CDN; **no** on-the-fly resize in production yet.
- **Rule**: **`buildLuxPublicPropertyMediaSrc`** may append **`&width=`**; **`buildLuxPublicPropertyMediaSrcSet`** composes list **`src_set`**; **`buildLuxPublicMediaTransformPlan`** is abstraction only (`shouldTransform: false`, `source: original`) until Phase **5C+**. Collectors and **`property-media-list`** include safe **`src_set`**.
- **Surface**: `lib/cmp/_lib/lux-request-attachments.js`, `lib/server/lux-property-media.js`, `lib/server/lux-published-property-media.js`, `components/LuxeMauricePropertyDetailPage.js`, `components/LuxeMauriceTenantPresentation.js`, `scripts/smoke-lux-phase4c1-attachment-review.mjs`, node tests. See **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.

### Phase 5C — CDN / object-storage readiness (storage adapter; Postgres bytes only)

- **Purpose**: introduce a **server-side storage adapter** (`lib/server/lux-media-storage.js`) and **`readPublishedLuxMediaBytes`** so future object-store/CDN backends plug in **without** changing public URL contracts or bypassing **`handleLuxPropertyMedia`** / **`buildLuxPublicPropertyMediaSrc`** / collectors. **Production behaviour unchanged:** same bytes, same gates, same cache headers.
- **Rule**: byte reads go through **`getLuxMediaStorageAdapter()`** → **`postgres_attachment_bytes`** today; **`buildLuxPublicMediaTransformPlan`** is wired into the read path (`shouldTransform` stays **false**). Published **200** adds safe **`X-Lux-Media-Backend` / `X-Lux-Media-Variant` / `X-Lux-Media-Transform`** headers only on success.
- **Surface**: `lib/server/lux-media-storage.js`, `lib/server/lux-property-media.js`, `scripts/smoke-lux-phase4c1-attachment-review.mjs`, node tests, **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**, **`docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`**.
- **Core assimilation recommendation**: add new backends by extending **`lux-media-storage.js`** selection only after governance stays centralized in **`handleLuxPropertyMedia`**; never serve bytes from a parallel public route.

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

- **External property data integration** (resolved 2026-06-11): **not required**. The active direction is *manual-first curated private opportunities*. Any future external integration is optional and revisited only if a strategic reason emerges. The prior IDX-vs-staged-listings question is closed for active direction.
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
- Phase 4D.2 homepage card slot: `docs/LUX/LUX_MEDIA_GOVERNANCE.md`
- Phase 4D.4 `/change` operator media polish: `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`, `docs/LUX/LUX_MEDIA_GOVERNANCE.md`
- Phase 4D.5 smoke/test cleanup policy: `docs/LUX/LUX_PHASE4C_ATTACHMENT_REVIEW.md`, `docs/LUX/LUX_MEDIA_GOVERNANCE.md`


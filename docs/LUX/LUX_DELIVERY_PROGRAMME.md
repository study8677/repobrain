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
  - **First slice (LuxeMaurice):** concierge lead stages + internal notes + follow-up status in `/change` — **`docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md`** (no assignment / SLA / external CRM in that slice).
  - Lead triage, assignment, follow-up status
  - Handoff from web enquiries into operator queue (source-of-truth decision)
  - Internal SLA and escalation
- **Owner**: Operator (process) + implementer (wiring)
- **Production verification**: operator can reliably process leads without DB access; audit trail exists
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
- Phase 3 first CRM slice (LuxeMaurice `/change` leads): `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md`


# LuxeMaurice delivery programme (staged) — ticket truth

**Authoritative ticket:** `cmo8mjijk0000jl04l1jz0v6d` (**Approved / Build**).  
**Official production URL:** `https://lux.corpflowai.com/`

## Purpose

This document prevents a common failure mode: shipping a **useful** public homepage and then accidentally treating it as “IDX site delivered” or “CRM delivered.”

It classifies the current LuxeMaurice work correctly as **Phase 0** and defines the **full staged delivery programme** (Phases 1–5) that must be recorded and verified in `/change` before the ticket can be treated as operationally complete.

## Current reality (what exists today)

- **Phase 0 / 1 public surface**: `lux.corpflowai.com` `/` is served by **Next.js** tenant marketing (`pages/index.js`). `vercel.json` may also map `/` to `lux-landing-static.html` on Lux hosts; whichever route wins in Vercel must still **200** on production.
- **LuxeMaurice-only presentation**: when `tenant_id === 'luxe-maurice'`, SSR sets `client_ui.lux_acquisition` and the UI uses **`components/LuxeMauriceTenantPresentation.js`** (island / developer-led brand). Other tenants keep the generic `TenantSite` layout.
- **Current lead capture path**: `/concierge` (posts to `concierge-lead-create` and creates a lead).

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
- **Owner**: Implementer + operator (vendor coordination)
- **Production verification**: discovery works on production URL; data freshness expectations documented
- **Operator next action**: define how discovery feeds CRM/operator workflow (Phase 3)

### Phase 3 — CRM / operator workflow in `/change`

- **Client-visible outcome**: the business can respond reliably; no “lost lead” path.
- **Scope**:
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


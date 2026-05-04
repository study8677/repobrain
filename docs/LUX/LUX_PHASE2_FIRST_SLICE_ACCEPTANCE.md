# LuxeMaurice — Phase 2 first slice (property discovery) acceptance

**Ticket:** `cmo8mjijk0000jl04l1jz0v6d`  
**Host:** `https://lux.corpflowai.com/`  
**Scope:** First slice only — not full IDX, not CRM, not automation (see `docs/LUX/LUX_DELIVERY_PROGRAMME.md`).

## Recorded client inputs (reference)

- Phase 1 direction: **approved** (operator-recorded on programme transition).
- Phase 2 permission: granted as part of programme initiation (see ticket description + `console_json.lux_programme`).
- Listing approach: stored under `lux_programme.phase_2.first_slice.listing_approach` (`staged_curated` | `real_idx_feed` | `hybrid`).

## Acceptance criteria (first slice)

1. **Listings visible** — Curated/property cards (or feed-driven cards) render on `https://lux.corpflowai.com/` in the agreed section; production GET returns **200** (no platform 5xx).
2. **Property cards** — Each card shows essential listing fields (title, key meta, imagery as agreed); layout matches LuxeMaurice presentation tokens; no broken images for supplied assets.
3. **Enquiry CTA** — Each property has a clear enquiry / private access CTA.
4. **Concierge handoff** — CTA routes to `/concierge` with **property context** (at minimum human-readable property name; stable id when available).
5. **Lead submission** — Form submits successfully; user sees confirmation consistent with existing concierge UX.
6. **Lead payload** — Stored lead includes **property interest** (name/id/URL slug — minimal fields as implemented).
7. **Operator visibility** — New or existing lead list on `/change` (or equivalent operator surface) shows the lead with property context without exposing other tenants’ data.
8. **Tenant isolation** — Only `luxe-maurice` tenant data and routes; no cross-tenant reads or writes.
9. **Production verification** — Delivery reality audit recorded (deployment id + commit + live URLs tested); ticket **not** closed until programme gate allows.

## Implementation notes (repo)

- **Staged listings** live in `lib/client/luxe-maurice-staged-properties.js` and are injected for `luxe-maurice` in `pages/index.js` as `site.staged_properties`.
- **Homepage cards** render in `components/LuxeMauriceTenantPresentation.js` with filters; each CTA uses `/concierge?intent=property&property=<slug>`.
- **Lead API** (`concierge-lead-create`): optional `property_slug` is validated against the same allowlist when `tenant_id` from host is `luxe-maurice`; `leads.listing` and `qualification_json.property_interest` store operator-visible context.
- **Operator UI**: `/change` lead list shows property interest when present.

## Explicit exclusions (this slice)

- Full IDX vendor integration (unless `listing_approach` is `real_idx_feed` and a minimal read-only slice is explicitly in scope for the same ticket).
- CRM pipelines, automation, AI follow-up.

## Operator next action (default)

See `console_json.lux_programme.operator_next_action` on the ticket after initiation script:

> Define listing source (staged vs IDX vs hybrid) and implement first property discovery slice.

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
- **Phase 2B hybrid — feed-shaped layer (mock / adapter-ready):** `lib/client/luxe-maurice-feed-properties.js` → `site.feed_properties`; **unified ref resolution** in `lib/client/luxe-maurice-property-resolve.js` (curated slug **or** feed `id`). Homepage: **Featured · developer introductions** (curated) then **Explore more properties** (feed section, dashed cards). Both CTAs use `/concierge?intent=property&property=<stable-ref>`.
- **Homepage cards** render in `components/LuxeMauriceTenantPresentation.js` with filters on curated only; feed list is separate UX band.
- **Lead API** (`concierge-lead-create`): optional `property_slug` (body field name unchanged) is validated via `resolveLuxPropertyRef` when host tenant is `luxe-maurice`. `qualification_json.property_interest` includes `discovery_source` (`curated` | `manual_curated` | `feed`), `listing_provider` (`curated_staged` | `manual_curated` | `mock_feed_v1`), `slug` (stable ref), `region`, `property_type`, `status`, optional `price_range`, optional `summary` and `highlights` (manual curated and extended context).
- **Operator UI**: `/change` lead list shows property interest, **source** (Featured vs **Manual (curated)** vs Explore feed preview), and price range when present. Manual workflow doc: **`docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md`**.
- **Phase 2C detail pages:** `pages/property/[slug].js` (SSR) — **LuxeMaurice host only**; `notFound` for other tenants or unknown refs. Uses **`resolveLuxPropertyRef`** for allowlisted `lm-*` and `lxf-*`; props are server-built only. **`components/LuxeMauricePropertyDetailPage.js`** — hero + overview + highlights + “Request private details” → `/concierge?intent=property&property=<ref>`. Listing cards link **Property overview →** to `/property/<ref>`.

### Remaining for real IDX (not in this slice)

- Replace or hydrate `LUXE_MAURICE_FEED_PROPERTIES` from a provider adapter (server-side fetch + cache recommended); keep **stable external ids** mapped into `qualification_json` for audit.
- Add licensing / attribution / “information deemed reliable but not guaranteed” copy per vendor + jurisdiction.
- Session-gate or tighten `concierge-leads-list` if public host-scoped listing of leads is not desired (product decision).

## Explicit exclusions (this slice)

- Full IDX vendor integration (unless `listing_approach` is `real_idx_feed` and a minimal read-only slice is explicitly in scope for the same ticket).
- CRM pipelines, automation, AI follow-up.

## Operator next action (default)

See `console_json.lux_programme.operator_next_action` on the ticket after initiation script:

> Define listing source (staged vs IDX vs hybrid) and implement first property discovery slice.

---

## Production verification (recorded 2026-05-04) — ticket `cmo8mjijk0000jl04l1jz0v6d`

**Ticket status:** remains **open** (programme delivery; not closed on this record).

**Merged to main:** PR https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/134 — squash commit `780ea91b9e9a9fd3c2ea9d96be3e8d01c4456b07`.

**GitHub Production deployment (environment hook):** deployment id `4566948292` → SHA `780ea91b9e9a9fd3c2ea9d96be3e8d01c4456b07` (correlate with Vercel Production “Ready” for the same commit).

**Live GET checks**

| URL | Result |
|-----|--------|
| `https://lux.corpflowai.com/` | **200** — HTML includes staged listing slugs (`lm-nc-ridge`, `lm-villa-belombre`, …), filter copy (“North & plateau”), status (“Private preview”), `staged_properties` in payload |
| `https://lux.corpflowai.com/concierge?intent=property&property=lm-nc-ridge` | **200** — concierge page (property banner is client-rendered from `router.query` after hydration) |
| `https://core.corpflowai.com/api/factory/health` | **200** — non–Lux surface unchanged at health level |

**Lead API (property context)**

- `POST https://lux.corpflowai.com/api/cmp/router?action=concierge-lead-create` with JSON body including `property_slug: "lm-pent-plateau"` → **200**, `lead.id` = `cmoqtjog70003jy04hiyabu1u` (operator can confirm `listing` / `qualification_json.property_interest` on `/change` for Lux session).

**Operator visibility:** confirm on `https://lux.corpflowai.com/change` (authenticated) that the new lead shows property interest / listing ref for `luxe-maurice` only.

**Tenant boundaries:** property slug path server-gated to `luxe-maurice`; no `tenant_id` mutation from client; other tenants not in scope of this slice.

**CMP description note:** if the ticket body should mirror this block, paste this section from the repo or append via operator DB/script using `POSTGRES_URL` (not run from the merge agent environment).

---

## Production verification — Phase 2B hybrid (recorded 2026-05-04) — ticket `cmo8mjijk0000jl04l1jz0v6d`

**Ticket status:** **open** (programme continues; real IDX provider remains a future decision and integration — **not** claimed here).

**Merged to main:** PR https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/137 — squash commit `6a3bab0208ea19b1aa9e74cdb1c2e7c6682025e9`.

**GitHub Production deployment:** id `4568708270` → SHA `6a3bab0208ea19b1aa9e74cdb1c2e7c6682025e9` (match Vercel Production “Ready” for that commit).

**Live checks**

| Check | Result |
|-------|--------|
| `GET https://lux.corpflowai.com/` | **200** — HTML includes curated markers (`lm-nc-ridge`, …), **Featured** band, **explore-more-properties** anchor, feed ids (`lxf-grand-baie-apt`, …) |
| Curated + feed CTAs | Same pattern: `/concierge?intent=property&property=<lm-*>` and `/concierge?intent=property&property=<lxf-*>` (concierge property banner is client-hydrated) |
| `GET https://core.corpflowai.com/api/factory/health` | **200** |

**Curated lead (production API)**

- `POST concierge-lead-create` with `property_slug: "lm-pipeline-q4"` → **200**, `lead.id` = `cmor1tcui0000jv04b4ae76r1`; stored `property_interest.discovery_source` = **curated**, `listing_provider` = **curated_staged**.

**Feed-preview lead (production API)**

- `POST concierge-lead-create` with `property_slug: "lxf-poste-lafayette"` → **200**, `lead.id` = `cmor1tee30002jv04v2tr8gew`; stored `property_interest.discovery_source` = **feed**, `listing_provider` = **mock_feed_v1**, `price_range` present.

**Operator visibility:** `concierge-leads-list` JSON for those leads includes title, ref (`slug`), source, and range where applicable — same fields `/change` renders for authenticated Lux operators.

**Tenant boundaries:** unchanged — property context path gated to `luxe-maurice` host tenant; no real IDX vendor wired.

**CMP ticket body:** paste this subsection or mirror via `POSTGRES_URL` script if ticket description should match repo (optional).

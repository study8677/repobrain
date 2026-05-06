# LuxeMaurice — Phase 2D manual property loading (curated)

**Ticket (programme umbrella, do not close on this alone):** `cmo8mjijk0000jl04l1jz0v6d`  
**Tenant:** `luxe-maurice` only (`lux.corpflowai.com`, host-derived context)  
**Scope:** Manual intake → publish curated listings **only**. No real IDX/feed, no CRM, automation, or AI.

---

## Status

**Shipped** — PR https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/141 Manual curated rows live in `lib/client/luxe-maurice-staged-properties.js` with optional `source: 'manual_curated'`, `price_range`, `summary`, `highlights`, and same-origin `images.hero`. SSR merge unchanged in `pages/index.js` (`site.staged_properties`). `resolveLuxPropertyRef` sets `discovery_source` / `listing_provider` to **`manual_curated`** for those rows; concierge lead create persists extended `property_interest` (including `summary` / `highlights`); `/change` labels **Manual (curated)**. Demo slug: **`lm-phase2d-manual-demo`** (replace copy via PR when client intake is ready). Production verification is recorded in **`docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`** (Phase 2D subsection).

---

## Recommended manual loading approach

| Option | Fit for Phase 2D | Notes |
|--------|------------------|--------|
| **A — Code-backed module (recommended first)** | **Yes** | Add or extend a versioned file under `lib/client/` (or `tenants/luxe-maurice/config/` if you prefer tenant-folder convention) merged into the same lookup path as today. PR review = publishing. Aligns with `resolveLuxPropertyRef` + CMP validation. |
| B — `website_draft` / persona JSON | Possible later | Operator edits draft in `/change` tooling; SSR already prefers non-empty `site.staged_properties` from draft when present. Requires guardrails so draft JSON cannot inject arbitrary keys or break layout. |
| C — Ticket-attached intake only | **Process, not runtime** | Use the **client intake template** below in the CMP ticket or email; operator **transcribes** into A or B. Do not treat ticket body as authoritative runtime data without a merge step. |

**Recommendation:** Start with **A** for each batch of new homes: one PR per batch (or grouped PR) updating the curated catalog; keep **C** as the human-friendly intake channel. Record `source: manual_curated` in schema for audit and future operator tooling.

---

## Schema (manual curated property)

All fields are **operator/client supplied at intake time**; **slug** is assigned by LuxeMaurice (stable `lm-*` pattern) before merge. Server continues to resolve only **allowlisted** slugs.

| Field | Type | Required | Notes |
|-------|------|----------|--------|
| `slug` | string | yes | `lm-` + label, lowercase, `[a-z0-9-]{1,64}`; unique across curated + any merged manual list. |
| `title` | string | yes | Display name. |
| `region` | string | yes | Maps to “location” in resolver/detail UI today (`region` in catalog). |
| `property_type` | string | yes | e.g. Villa, Penthouse. |
| `status` | string | yes | Client-facing visibility, e.g. “Private preview”, “On application”. |
| `price_range` | string \| null | no | Shown on cards/detail when set; resolver passes catalog `price_range` through for staged rows (including manual curated). |
| `summary` | string | yes | Longer than one-line teaser; used for detail **Overview** (can align with or replace generated `summary_text` for manual rows). |
| `highlights` | string[] | no | 2–5 bullets; if absent, keep current resolver fallbacks for that slug. |
| `teaser` | string | no | Short card line; if absent, derive from first sentence of `summary`. |
| `group` | string | yes | For homepage filters: `north` \| `villa` \| `pipeline` \| (extend enum in code if needed). |
| `images` | object | no | **References only**, no uploads in Phase 2D: e.g. `{ "hero": "/assets/lux/…", "thumb": "…" }` or `{ "placeholders": ["gradient-1"] }`. |
| `source` | const | yes | Always **`manual_curated`** for this workflow (distinct from seed `curated_staged` if you split `listing_provider` later). |

**JSON example (intake → operator paste into PR):**

```json
{
  "slug": "lm-example-manual-01",
  "title": "Example — manual curated listing",
  "region": "North Mauritius",
  "property_type": "Villa",
  "status": "Private preview",
  "price_range": "On application",
  "summary": "Two paragraphs max: positioning, developer relationship, what the buyer should expect next.",
  "highlights": [
    "Beach-adjacent plot with approved concept",
    "Preview and pricing through LuxeMaurice concierge only"
  ],
  "teaser": "Single line for the homepage card.",
  "group": "north",
  "images": { "hero": "/assets/corpflow/placeholder-lux-hero.svg" },
  "source": "manual_curated"
}
```

---

## Client intake template (copy for email or ticket)

**Subject:** New LuxeMaurice listing — manual intake (one property per form)

1. **Property name / working title** (as it should appear on the site):  
2. **Location / region** (island area or estate name):  
3. **Property type** (Villa, Apartment, Penthouse, Land, Mixed, …):  
4. **Price or range** (or “On application” / “POA”):  
5. **Short public description** (2–6 sentences; no legal offers):  
6. **Highlights** (bullet list, max 5; factual, no guaranteed returns):  
7. **Image classification** (what we may show later): e.g. “exterior only”, “no photography yet — use placeholder”, “client to supply URLs under NDA”  
8. **Visibility status** (choose one): Private preview / Details on request / Register interest / Withdrawn  
9. **Internal reference** (optional — developer or unit code, not shown on site unless agreed):  

**Operator:** Assign a new **`lm-…` slug**, add the row to the versioned catalog (PR), deploy; confirm `/`, `/property/<slug>`, concierge lead, and `/change`.

---

## Implementation (PR #141)

1. **Catalog** — `lib/client/luxe-maurice-staged-properties.js`: optional `price_range`, `summary`, `highlights`, `images`, `source: 'manual_curated'`.
2. **Resolver** — `lib/client/luxe-maurice-property-resolve.js`: manual rows → `discovery_source` / `listing_provider` `manual_curated`; catalog summary/highlights/price; `safeLuxSameOriginPublicImagePath` for hero.
3. **Presentation** — `components/LuxeMauriceTenantPresentation.js`: card price, optional hero, “Manual curated” ribbon when applicable.
4. **Detail** — `pages/property/[slug].js` + `components/LuxeMauricePropertyDetailPage.js`: manual styling + optional hero strip.
5. **CMP** — `handleConciergeLeadCreate` / list: `qualification_json.property_interest` includes `summary`, `highlights` where resolved.
6. **`/change`** — source label **Manual (curated)** when `discovery_source === 'manual_curated'`.
7. **Docs** — this file + programme / acceptance cross-links.

**Out of scope for Phase 2D:** image upload pipeline, CRM stages, automated notifications beyond existing concierge lead hooks.

---

## Risks

| Risk | Mitigation |
|------|------------|
| **Slug collision** | Operator assigns `lm-*` via checklist; grep repo before PR. |
| **Copy / compliance** | Client text is marketing only; legal review for “offers” language; no performance claims without evidence. |
| **Image URLs** | Only allowlist same-origin paths or known CDN hosts in a small validator; reject arbitrary URLs in Phase 2D. |
| **Draft vs code drift** | If using `website_draft` later, define merge order: explicit policy “draft `staged_properties` overrides seed only when non-empty and schema-valid”. |
| **Ticket as source of truth** | Avoid; tickets are not validated runtime config — use template → PR. |

---

## Next narrow actions

- Replace **`lm-phase2d-manual-demo`** body with **client-approved** intake via PR (same schema).
- Optional: add **same-origin** hero asset under `public/` only after client approval — never unapproved external URLs.
- **Do not** close ticket `cmo8mjijk0000jl04l1jz0v6d` on manual-property merges alone.

---

## Cross-references

- Phase 2 acceptance / implementation notes: `docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md`
- Programme: `docs/LUX/LUX_DELIVERY_PROGRAMME.md`
- Tenant rules: `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md`

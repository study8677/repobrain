# 39 — LuxeMaurice P0 Phase 2 Build Brief: `/properties` + visual property admin

**Status:** Build brief created (planning / handoff; not operational delivery).  
**Client:** LuxeMaurice / Luxmaurice  
**Priority:** P0  
**Master programme ticket:** `cmo8mjijk0000jl04l1jz0v6d` — **do not close** on this slice; record child work or programme notes instead.  
**Production host:** `https://lux.corpflowai.com/`  
**Tenant context:** `luxe-maurice` — **server-derived from hostname / session**; never accept client-supplied `tenant_id`.  
**Integrations:** GoHighLevel **waived / not required** for this slice; do not block delivery on GHL.

**Related canonical docs (read before build):**

- `docs/LUX/LUX_DELIVERY_PROGRAMME.md` — programme phases and ticket discipline  
- `docs/LUX/LUX_PHASE2_FIRST_SLICE_ACCEPTANCE.md` — Phase 2 first slice (homepage + `/property/[slug]` + concierge context)  
- `docs/LUX/LUX_PHASE2D_MANUAL_PROPERTY_WORKFLOW.md` — manual curated catalog (code-backed today)  
- `docs/LUX/LUX_MEDIA_GOVERNANCE.md` — upload → review → link → **explicit publish**; **no video on public property-media routes** today  
- `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md` — CRM / leads on `/change`  
- `.env.template` + `docs/operations/TENANT_CLIENT_LOGIN.md` — tenancy and env **truth** (do not invent env vars)

**Engineering constraints (non-negotiable):**

- One production app; one Postgres via `POSTGRES_URL` only.  
- No new environment variables unless they already exist in `.env.template` or are explicitly added there as part of the same change (prefer **zero** new env for this slice).  
- No secrets in client, logs, or ticket copy; use placeholders in docs.  
- Tenant isolation: no cross-tenant reads/writes on any new API or page.

---

## 1. Definition of Done

### Public `/properties`

**URL:** `https://lux.corpflowai.com/properties` returns **200** on Production (not only Preview).

A **public visitor** can:

- Open `/properties` and see **at least one** property (client-created, real data — not demo-only if programme says first real property is the bar).  
- See **approved / published imagery** per existing Lux media governance (see §4 and `docs/LUX/LUX_MEDIA_GOVERNANCE.md`).  
- Read **title**, **location/region**, **description** (or agreed short + long copy), **status**, **price/range** when supplied.  
- Open a **property detail** route from the listing (path shape to be chosen in implementation; must be stable and Lux-host-gated).  
- Use a clear **enquiry / concierge CTA** that lands on the existing concierge flow with **property context** preserved end-to-end into **`leads.qualification_json.property_interest`** (and listing ref fields as today where applicable).

### Editors (Anton + Jan@luxemaurice.com)

Both can, **without developer intervention** (after accounts and roles are provisioned once):

- **Create** and **edit** property content (fields in §5).  
- **Upload** images and **video** files into the **existing** CMP attachment + review pipeline (video remains **non-public** until a future explicit product gate; first slice: **upload / review / associate-ready**, not auto-public — see §4).  
- Manage **captions** and **alt text** for **public** media where the governance model already exposes `public_caption` / `public_alt_text` (align with `property-media-list` safe fields).  
- Choose **hero**, **card**, and **gallery** associations using existing **link + publish** semantics (no auto-publish).  
- **Preview** a property in **draft** or **preview** visibility (exact UX: open decision — see §9).  
- **Request publish**; **published** state only after **explicit operator/client confirmation** (workflow may still use CMP actions or `/change` for the final publish **event**, but day-to-day editing must not force raw `/change` for content entry — see §3).

### Delivery language

Per `.cursor/rules/delivery-reality.mdc`, **Done** for this brief means **live verified** on `lux.corpflowai.com`, not merge-only. Use the **Reality Gate** checklist (§8) and record deployment id + commit.

---

## 2. First production slice (scope box)

Ship **one narrow vertical slice** that includes all of:

| Pillar | Outcome |
|--------|--------|
| **A. Public listing** | `/properties` on Lux host — SSR or hybrid consistent with existing Next.js pages patterns. |
| **B. Property detail** | Detail page linked from cards; same ref/slug stability as concierge + lead context. |
| **C. Visual admin/editor** | Dedicated route (preferred: `/properties/admin` **or** `/admin/properties`) — tenant session + role gated; **not** the primary `/change` operator console for content entry. |
| **D. Persistence** | Manual property rows in **Postgres** (recommended: dedicated table — §5) with server `tenant_id = 'luxe-maurice'`. |
| **E. Media** | Reuse **Lux media governance**: attachments on CMP tickets, review, property link, explicit publish for **images** on public surfaces; **video** stored and reviewable but **not** served as public marketing video until explicitly approved and a player path exists. |
| **F. CRM** | Existing **concierge-lead-create** + **`Lead`** model; extend `property_interest` as needed for `/properties` source path (no GHL). |
| **G. Smoke** | Production smoke verification recorded (§8). |

**Explicit exclusions (unless pulled in by a separate programme decision):**

- Full IDX / external feed as source of truth.  
- Public in-browser video player for ungoverned bytes.  
- New env vars “for convenience.”  
- Closing the master ticket.

---

## 3. `/properties` user journey (visitor)

1. Visitor lands on **`/properties`** (Lux host).  
2. Browses **property cards** (pagination or scroll: implementation choice; keep first slice simple).  
3. Opens **property detail** for one listing.  
4. Sees **published** images (and any **approved** visual treatment allowed by current `GET /api/lux/property-media` contract — today **image only** on that route).  
5. Clicks **enquiry / concierge** CTA → `/concierge` with query/body conventions consistent with `resolveLuxPropertyRef` and existing lead API.  
6. On successful submit, **lead** row includes **property context** (slug/ref, title, source path such as `properties_index` / `property_detail` for analytics clarity).

---

## 4. Admin upload/edit workflow (Anton + Jan)

**Product principle:** `/change` remains **operator/governance back-office** (programme tickets, attachments review, publish events, CRM). **Client-usable** property work happens on a **visual** admin route.

### Preferred route

- Implement **`/properties/admin`** **or** **`/admin/properties`** (pick one; avoid duplicating both unless middleware clearly canonicalizes).  
- **Lux host + `luxe-maurice` tenant session** required for all mutating APIs backing this UI.  
- **Public visitors:** read-only on `/properties` and detail; **no** admin APIs.

### Admin capabilities (MVP)

| Capability | Notes |
|------------|--------|
| Create property | Generates stable **slug** server-side or validates client-proposed slug against allowlist rules consistent with `resolveLuxPropertyRef`. |
| Edit fields | Title, location/region, description, status, type, price range, teaser, highlights, beds/baths/area when supplied. |
| Upload media | Uses existing attachment upload path tied to **Lux programme or scoped Lux ticket** (reuse patterns from `lux_request_meta` / CMP attachments — do not bypass review). |
| Select hero/card/gallery | Uses **`lux-attachment-property-link-set`** + **`lux-attachment-property-publish`** (or successor) — **auto-publish forbidden** per `LUX_MEDIA_GOVERNANCE.md`. |
| Preview | Draft/preview visibility: either session-gated preview URL, or editor-only preview mode that composes unpublished copy **without** widening public routes (open decision §9). |
| Request publish | Transitions `visibility_status` toward **pending publish**; human confirmation step (Anton and/or operator) before **`published`**. |
| Publish | **Gated**: explicit confirmation + satisfy image publish gates; video does not auto-appear on public pages. |

### Video (first slice)

- **In scope:** upload, **pending_review** → **reviewed**, association to property ref, operator notes, **no** automatic public embed.  
- **Public:** only if/when a **separate** governed player path is approved; until then UI may show **“In review”** or omit video on public pages entirely.  
- **Must not** weaken `GET /api/lux/property-media` image-only public contract without programme approval and security review.

---

## 5. Data model draft (Postgres)

**Goal:** persist **manual** properties in Postgres; align identifiers with existing **`resolveLuxPropertyRef`** and concierge **`property_slug`** validation.

**Do not** trust client JSON for `tenant_id`. Always set `tenant_id` (or equivalent column) from **server host + session** resolution to **`luxe-maurice`**.

### Suggested table (draft name: `lux_listings` or `lux_properties`)

| Field | Type / notes |
|-------|----------------|
| `id` | `cuid` PK |
| `tenant_id` | text, constant **`luxe-maurice`** at write time (server) |
| `slug` | unique per tenant; stable in URLs and concierge |
| `title` | text |
| `region` / `location_label` | text (split or single field — implementation choice) |
| `property_type` | text or enum string |
| `status` | listing status (e.g. Private preview) — distinct from `visibility_status` if both needed |
| `price_range` | optional text |
| `short_teaser` | optional text |
| `description` | text |
| `highlights` | `jsonb` string array |
| `bedrooms`, `bathrooms`, `area_sqm` | optional numerics |
| `media_refs` | optional `jsonb` — **denormalized hints only**; canonical media remains CMP attachments + publish links |
| `visibility_status` | `draft` \| `preview` \| `published` \| `archived` |
| `created_by`, `updated_by` | auth user ids or email refs (align with `AuthUser` / session claims) |
| `published_at` | nullable timestamp |
| `created_at`, `updated_at` | timestamps |

**Indexes:** `(tenant_id, slug)` unique; `(tenant_id, visibility_status)` for public listing queries.

**Migration:** Prisma migration under `prisma/`; follow `docs/operations/SECURITY_REVIEW_CHECKLIST.md` for tenant-scoped writes.

**Relationship to today’s code catalog:** Until migration ships, homepage may still read `lib/client/luxe-maurice-staged-properties.js`; the slice is complete when **at least one** row is **client-created in Postgres** and **read** by `/properties` and detail (or a documented cutover removes duplicate sources — open decision §9).

---

## 6. Role / access model

| Actor | Access |
|-------|--------|
| **Anton** | Operator/admin: full property CRUD, media review/publish where existing CMP actions allow, user provisioning. |
| **Jan@luxemaurice.com** | **Editor:** create/edit/upload/link/request publish for `luxe-maurice` only; **no** publish without gate if policy says operator confirmation (default: **yes**, keep gate). |
| **Public visitor** | Read-only **`published`** (and any agreed **preview** token if implemented) on `/properties` + detail. |
| **Publishing** | **Gated** until reviewed + explicit publish for media; property **`visibility_status = published`** only after confirmation workflow. |
| **Isolation** | Editors cannot read/write other tenants; all queries include `tenant_id = 'luxe-maurice'` from server context. |

**Implementation note:** map roles to existing `AuthUser.level` / tenant pairing or introduce **Lux-scoped** role flags **without** new env vars (e.g. config in code or DB table — prefer smallest change that fits existing auth).

---

## 7. Recommended implementation slices (for sequencing)

Execute in order; each slice should be mergeable and testable.

1. **Schema + Prisma** — table + migration; seed optional dev data only (no prod seed without client approval).  
2. **Server read API** — tenant-scoped list + get by slug for SSR (`lux.corpflowai.com` only).  
3. **Public pages** — `pages/properties/index` + detail route; reuse `LuxeMauriceTenantPresentation` tokens where sensible; wire **published** images via existing collectors / `property-media`.  
4. **Editor UI shell** — auth gate, list own drafts, create/edit form.  
5. **Media wiring** — reuse upload/review/link/publish from programme ticket or dedicated Lux ticket id **fixed in code or DB**, not env (unless already in `.env.template`).  
6. **Concierge CTA** — same `concierge-lead-create` + `property_slug`; extend `property_interest` with `entry_path: 'properties' | 'property_detail'` if useful.  
7. **Production smoke + audit** — §8 + Delivery Reality block in ticket or child ticket.

---

## 8. Reality Gate (operational completion)

No **Done** claim unless **all** are true on **Production** (`lux.corpflowai.com`):

- [ ] `GET https://lux.corpflowai.com/properties` → **200**, Lux-branded listing.  
- [ ] At least **one** real **client-created** property visible (Postgres-backed).  
- [ ] Property **detail** page → **200** with correct copy.  
- [ ] At least one **image** visible from **governed** public URL path (published + reviewed per current rules).  
- [ ] **Video:** either **not** shown on public pages, or shown **only** behind explicit approval + agreed player semantics (document which).  
- [ ] **Enquiry CTA** completes; lead row shows **property context** in CRM (`/change` or existing list).  
- [ ] **Anton** and **Jan** can create/edit/publish-request **without** calling a developer for routine content.  
- [ ] Record: **Vercel deployment id**, **commit SHA**, **live URLs** tested — see `.cursor/rules/delivery-reality.mdc`.

---

## 9. Open decisions (resolve during implementation / programme note)

1. **Public URL for detail:** `/property/[slug]` (existing) vs `/properties/[slug]` — avoid duplicate canonical URLs; pick one public pattern and redirect or link consistently.  
2. **Preview UX:** server-only draft flag vs signed preview token vs editor impersonation — security vs simplicity.  
3. **Single source of truth cutover:** when Postgres properties **replace** or **merge with** `luxe-maurice-staged-properties.js` for homepage cards.  
4. **Which CMP ticket** anchors attachments for client-created properties (programme ticket vs per-property child ticket).  
5. **Jan account provisioning:** magic link vs password — use existing auth flows only.  
6. **Role representation:** minimal change to `AuthUser` vs separate editor allowlist table.

---

## 10. Engineer / Cursor handoff

Build **one** production slice containing:

- **A.** Public `/properties` (listing).  
- **B.** Visual property editor (admin route).  
- **C.** Manual property persistence (Postgres + Prisma).  
- **D.** Media association via existing Lux governance (no auto-publish; no public video until approved).  
- **E.** Concierge CTA with **property context** into existing lead flow.  
- **F.** Production smoke verification (§8).

**Touchpoints likely involved (non-exhaustive):** `pages/`, `middleware` (if any new route matching), `lib/server/`, `lib/cmp/router.js` (if new actions), `lib/client/luxe-maurice-property-resolve.js`, `lib/server/lux-property-media.js` / `lux-published-property-media.js`, Prisma schema + migrations, concierge lead handler, `components/LuxeMaurice*.js`.

**Do not:** invent env vars; accept client `tenant_id`; close `cmo8mjijk0000jl04l1jz0v6d`; block on GHL.

---

## 11. Next Cursor prompt (implementation)

Use verbatim or adapt:

```text
Implement LuxeMaurice P0 Phase 2 slice per docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md.

Goals:
1) Public GET /properties on lux.corpflowai.com (SSR, tenant host gated) listing Postgres-backed properties with visibility_status = published for public; include cards linking to detail.
2) Property detail page consistent with brief (reuse resolveLuxPropertyRef / slug rules; do not duplicate tenant resolution logic).
3) New Prisma model + migration for manual properties (fields in brief §5); all writes set tenant_id server-side to luxe-maurice; no new env vars unless already in .env.template.
4) Visual admin at /properties/admin OR /admin/properties (pick one): Anton + Jan@luxemaurice.com as editors; create/edit/upload; media via existing CMP attachment + lux-attachment-* actions; no auto-publish; video upload OK but public pages remain image-only per LUX_MEDIA_GOVERNANCE unless explicitly extended with security review.
5) Concierge CTA uses existing concierge-lead-create; lead stores property_interest including entry path.
6) After implementation, run local npm test + npm run build; hand off with Reality Gate checklist and do NOT close master ticket cmo8mjijk0000jl04l1jz0v6d.

Constraints: one Postgres POSTGRES_URL; follow docs/operations/TENANT_CLIENT_LOGIN.md; follow docs/operations/SECURITY_REVIEW_CHECKLIST.md for API/auth/prisma changes; GHL waived.
```

---

## Output summary (for Anton / PM)

| Item | Value |
|------|--------|
| **Status** | Build brief created |
| **Files changed** | `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` (this file) |
| **Open decisions** | §9 (URL canonicalization, preview model, catalog cutover, attachment anchor ticket, Jan onboarding, role storage) |
| **Recommended implementation slices** | §7 |
| **Reality Gate checklist** | §8 |
| **Engineer handoff** | §10 |
| **Next Cursor prompt** | §11 |

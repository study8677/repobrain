# LuxeMaurice media governance (operator-controlled public surfaces)

**Authoritative programme ticket:** `cmo8mjijk0000jl04l1jz0v6d` (not closed by media phases).

This document describes **how media becomes public** on `lux.corpflowai.com` after Phase 4C.x / **4D.1** / **4D.2**, plus **Phase 4D.3** (operator **archive / restore** without deleting bytes), plus **Phase 4D.4** (operator-only **`/change`** summaries, filters, and “where used” copy — **no** new public fields or routes), plus **Phase 4D.5** (operator **cleanup policy** for smoke/test artifacts: expanded hinting, **Cleanup candidate** advisory, optional one-click archive with a standard reason, smoke script summary + optional `--archive-smoke-artifacts` — **still no** hard-delete by default), plus **Phase 5A** (public **cache + `variant=` scaffold** + MIME normalization + safe list metadata — **no** real transforms or external CDN yet), plus **Phase 5B** (strict **`width=`** buckets + **`src_set`** on collectors/list + **`srcset`/`sizes`** on public pages — **still** original bytes only; **`buildLuxPublicMediaTransformPlan`** is abstraction only), plus **Phase 5C** (**storage adapter** behind `handleLuxPropertyMedia`: Postgres bytes today; **`readPublishedLuxMediaBytes`** + safe **`X-Lux-Media-*`** observability headers on **200** only — **no** external object store, **no** CDN upload, **no** real transforms), and the **hard boundaries** before CDN, transforms, DAM, automation, or social surfaces exist.

## Lifecycles (strict order)

1. **Upload** — Binary lands in `cmp_ticket_attachments`; metadata row is upserted into `console_json.lux_request_meta.attachments[]` with default `review_status: pending_review`. **Nothing is public.**
2. **Review** — Operator sets `pending_review` → `reviewed` or `rejected` via `lux-attachment-review-set`. **Rejected media never becomes linkable for public slots in normal flows.** Still not public.
3. **Link** — Operator associates a **reviewed** attachment with a property ref + `intended_slot` (`hero`, `card`, `detail`, `gallery`, `reference`) via `lux-attachment-property-link-set`. **Still private** (`publish_status: unpublished` on the link). **Blocked while `lifecycle_status: archived`.**
4. **Publish** — Operator explicitly calls `lux-attachment-property-publish` for that `(property_slug, intended_slot)` link. **Only then** may bytes be served from `GET /api/lux/property-media` and only for **image** MIME types that pass all server checks. **Blocked while the attachment is archived.**
5. **Archive (4D.3)** — Operator calls `lux-attachment-archive`. Sets `lifecycle_status: archived` with `archived_at` / `archived_by` / optional `archive_reason`; **every** `property_links[]` row is set to `publish_status: unpublished` if it was published; **binary bytes are not deleted**. Public routes and collectors **ignore** archived attachments even if stale client state suggested otherwise.
6. **Restore (4D.3)** — Operator calls `lux-attachment-restore`. Sets `lifecycle_status: active` and `restored_at` / `restored_by`; **does not** flip any link back to published — the operator must **publish again** explicitly.

**Replacement workflow (no binary swap in this slice):** upload a **new** attachment → review → link → publish → archive the old attachment (reason may cite the replacement id or filename).

## Phase 4D.4 — Operator media polish on `/change` (no wider public semantics)

Pure **client-side** helpers in `lib/cmp/_lib/lux-request-attachments.js` drive:

- A **media summary** strip (totals for review states, archived count, linked/published counts, and a **needs action** heuristic: pending review; reviewed but not linked; linked but not published on an active attachment; published hero/gallery/card image with empty `public_alt_text`; archived attachment whose link **`publish_history`** still records a `published` event).
- **Local filters** on the attachment list (`all`, `pending_review`, `reviewed`, `rejected`, `archived`, `linked`, `published`, `needs_action`) — no server pagination or search.
- A per-attachment **“Where used”** readout aligned with the same **public** gate as `property-media` (reviewed + image + published + non-archived + slot in `hero` \| `gallery` \| `card`), plus link publish state and lifecycle labels for operator clarity.

**Explicit non-goals in 4D.4:** hard-delete of `cmp_ticket_attachments` bytes, CDN/transforms, new public JSON, weakening auth, or changing **`/change-v2`**. **Safe cleanup path remains archive** (and optional restore + deliberate republish); any future bulk delete requires a **Lux-scoped delete/archive policy** and separate engineering.

## Phase 4D.5 — Smoke/test cleanup policy (archive-first; no default hard-delete)

**Policy:** **Archive** is the only supported cleanup action in product today. **`lux-attachment-archive`** continues to unpublish all links first when needed (Phase 4D.3). **Hard-delete** of `cmp_ticket_attachments` bytes is **out of scope** until a separately governed, explicitly approved Lux workflow exists (audit, tenancy, retention, and rollback).

**Identification (operator convenience, not security):** pure helpers in `lib/cmp/_lib/lux-request-attachments.js` scan attachment `file_name`, `notes`, and optional ticket strings (`title`, `description`, common email-shaped fields) for smoke/test markers (e.g. `smoke`, `verify`, `uat`, `phase4d*`, `example.invalid`, `fixture`, `e2e`). A **Cleanup candidate** badge means: matched test/smoke heuristics **and** the attachment is **not** currently public on Lux hero/gallery/card (same gate as `property-media`).

**`/change`:** **Test media** + **Cleanup candidate** badges (advisory copy), optional **Archive as smoke/test artifact** button (prefills `LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT` into the existing archive action). No auto-archive, no bulk delete.

**Smoke script:** `scripts/smoke-lux-phase4c1-attachment-review.mjs` prints `ticket_id` + tracked `attachment_ids` and a cleanup recommendation. Optional **`--archive-smoke-artifacts`** (default off) archives **only** attachments created in that run, still **never** deletes bytes.

**Future hard-delete requirements (non-exhaustive):** explicit programme approval, Lux-only CMP action, tenancy + ticket ownership checks, dual control or operator role gate, retention logging, and coordination with any CDN/cache invalidation — none of which ship in 4D.5.

**Per-link publish history (operator-only):** each `property_links[]` row may carry `publish_history[]` entries `{ at, action, actor, note }` for `published` | `unpublished` | `archived` | `restored` (capped server-side). This is **not** included in `property-media-list` or any public JSON.

**Auto-publish is forbidden:** no publish on upload, review, link, or restore.

## Phase 5A — Public delivery foundation (HTTP cache + variant scaffold; no CDN/transforms yet)

**Purpose:** tighten **`GET /api/lux/property-media`** response headers for **published** images (`Cache-Control: public, max-age=300, must-revalidate`; **no** `stale-while-revalidate` so unpublish is not masked by shared caches) while keeping **all denials** (`404`/`400`/wrong host) on **`private, no-store`**. Add optional **`variant=original|card|hero|gallery`** (strict allowlist; **400** if present and invalid). **All variants still return the same original bytes** until a future CDN/transform layer exists — the parameter exists for **cache keys** and forward-compatible `src` URLs only.

**Published URL shape:** server-side collectors (`lux-published-property-media.js`) emit `variant=` defaults aligned to slot (**hero→hero**, **gallery→gallery**, **card→card**). Legacy URLs **without** `variant=` remain valid.

**List JSON:** `GET /api/lux/property-media-list` adds **`variant`** and **`content_type`** (normalized `image/*` only) per item alongside existing safe fields — **no** review metadata, **no** storage paths, **no** `lux_request_meta`.

**CDN / transform boundary (future):** edge workers or object storage must **not** bypass `handleLuxPropertyMedia` publish checks; transforms should consume the same query contract (`property`, `attachment`, `slot`, `variant`, optional **`width`**) and preserve **must-revalidate** (or stronger invalidation) when unpublish/archive semantics change.

## Phase 5B — Responsive `src` / `srcset` semantics (width buckets; no real transforms)

**Purpose:** give browsers **`srcset` + `sizes`** on hero, gallery, and card images while keeping **one** governed byte path: **`GET /api/lux/property-media`**. Optional **`width=`** accepts only **`LUX_PUBLIC_MEDIA_WIDTH_BUCKETS`** (`480`, `768`, `1024`, `1440`, `1920`); invalid values → **400**. **All widths still stream the same original bytes**; **`X-Lux-Media-Source: original`** documents that choice until a worker exists.

**Builders:** **`buildLuxPublicPropertyMediaSrc`** appends **`&width=`** when a bucket is selected; **`buildLuxPublicPropertyMediaSrcSet`** emits comma-separated **`url Nw`** candidates (slot-aware width subsets) with **`src`** set to the largest bucket URL for that slot. **`buildLuxPublicMediaTransformPlan`** returns `shouldTransform: false` and `source: 'original'` — reserved for Phase **5C+** wiring.

**List JSON:** `property-media-list` items add safe **`src_set`** (same contract as page composition). **Cache rules** match **5A** (published **200**: `public, max-age=300, must-revalidate`; denials: `private, no-store`).

## Phase 5C — CDN / object-storage readiness (storage adapter; behaviour unchanged)

**Purpose:** isolate **byte retrieval** behind `lib/server/lux-media-storage.js` so a future adapter (object store + edge) can swap in **without** changing URL builders, collectors, or publish gates. **`getLuxMediaStorageAdapter()`** / **`readPublishedLuxMediaBytes()`** run **only after** the same `handleLuxPropertyMedia` checks as today.

**Current adapter:** **`postgres_attachment_bytes`** reads `cmp_ticket_attachments.data` already loaded by the route — **no** schema migration, **no** new public fields, **no** storage path in HTTP.

**Transform plan:** **`buildLuxPublicMediaTransformPlan`** is passed into the adapter; **`shouldTransform`** remains **false**; if ever **true**, the route responds **501** (not used in production until transforms are approved).

**Observability (published 200 only):** **`X-Lux-Media-Backend: postgres`**, **`X-Lux-Media-Variant: <token>`**, **`X-Lux-Media-Transform: original`**, alongside existing **`X-Lux-Media-Source`**. Denials must **not** expose backend/variant/transform headers.

**Future adapter boundary:** any CDN/R2/S3 worker must **not** bypass `handleLuxPropertyMedia`; it consumes the same **delivery context** (property, attachment id, slot, variant, width, plan) and returns bytes only when governance already passed.

## Slot semantics

| Slot        | Public (current) | Notes |
|------------|------------------|--------|
| `hero`     | Yes (single preferred) | Bounded scan picks most recent published hero for `/property/[slug]`. |
| `gallery`  | Yes (multi-image grid) | `gallery_order` (optional 0–9999) and `is_gallery_cover` (max one published cover per property **on the same ticket** when set). |
| `card`     | Yes (homepage / listing cards) | Phase **4D.2**: one published card image per resolved property ref (same gate as hero); SSR composes `lux.corpflowai.com/` property cards; falls back to staged `images.hero` or placeholder when absent. **No video.** |
| `detail`   | No | Reserved; not composed on public homepage or property detail in this phase. |
| `reference`| No | Operator reference only; not composed on public cards, property page list, or `property-media-list`. |

## Public surfaces (current)

- **`GET /api/lux/property-media?property=&attachment=&slot=[&variant=][&width=]`** — Lux host + `luxe-maurice` context; **published + reviewed + image** + matching link + attachment **`lifecycle_status` not `archived`**; **404** otherwise; **400** for invalid `slot`, invalid **`variant`** when provided, or invalid **`width`** when provided; conservative **public** cache on **200** (`max-age=300`, `must-revalidate`); denials **`private, no-store`**; correct **`Content-Type`** (`image/*`, `image/jpg` normalized to **`image/jpeg`**); optional **`X-Lux-Media-Source`** (`original` when bytes are not transformed); on **200** only (Phase **5C**): **`X-Lux-Media-Backend`**, **`X-Lux-Media-Variant`**, **`X-Lux-Media-Transform`** (safe tokens only; **no** tenant ids, **no** storage paths); **no** raw storage path in response.
- **`GET /api/lux/property-media-list?property=`** — Same host gate; JSON list of **safe** entries (`slot`, `src`, `src_set`, `variant`, `content_type`, `public_caption`, `public_alt_text`, `gallery_order`, `is_gallery_cover`) for **hero + card + gallery**. **No** operator audit fields, **no** `lux_request_meta`, **no** private download URLs.
- **`/` (LuxeMaurice acquisition)** — Property cards use **published `card`** image when present (`collectPublishedLuxCardMediaByPropertyRefs`); otherwise same-origin staged hero path or neutral placeholder. Feed cards use the same rule when the feed id resolves.
- **`/property/[slug]`** — Renders published **hero** (if any) and a **Gallery** grid for published **gallery** slot images with public caption/alt only (card slot is for listing/home cards, not detail layout in this phase).

## Private vs public guarantees

**Public may show:** public image URL (already includes opaque attachment id in query), public caption, public alt text, slot, sort hints safe for display.

**Public must not show:** `lux_request_meta`, `review_note`, `reviewed_by`, `linked_by`, `published_by`, `publish_history`, lifecycle audit fields, private `/api/change-attachment/download` links, raw storage paths, unpublished/rejected/pending/**archived** media, **video** on these routes.

## Future: CDN / transforms boundary

Out of scope until explicitly specced:

- CDN domains, signed edge URLs, **real** on-the-fly image transforms **wired to production** (Phase **5A/5B** reserve **`variant=`**, **`width=`**, **`src_set`**, and cache semantics; Phase **5C** adds the **storage adapter** hook; bytes today remain **original** via **`handleLuxPropertyMedia`** + **`postgres_attachment_bytes`** until approved).
- Video transcoding or public video players.
- External DAM, bulk import, AI tagging, auto-cropping.

Until then, all public bytes flow through the **same governed** `property-media` handler and the same **publish** metadata gate.

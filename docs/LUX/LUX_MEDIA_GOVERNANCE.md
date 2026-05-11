# LuxeMaurice media governance (operator-controlled public surfaces)

**Authoritative programme ticket:** `cmo8mjijk0000jl04l1jz0v6d` (not closed by media phases).

This document describes **how media becomes public** on `lux.corpflowai.com` after Phase 4C.x / **4D.1** / **4D.2**, plus **Phase 4D.3** (operator **archive / restore** without deleting bytes), plus **Phase 4D.4** (operator-only **`/change`** summaries, filters, and “where used” copy — **no** new public fields or routes), and the **hard boundaries** before CDN, transforms, DAM, automation, or social surfaces exist.

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

**Per-link publish history (operator-only):** each `property_links[]` row may carry `publish_history[]` entries `{ at, action, actor, note }` for `published` | `unpublished` | `archived` | `restored` (capped server-side). This is **not** included in `property-media-list` or any public JSON.

**Auto-publish is forbidden:** no publish on upload, review, link, or restore.

## Slot semantics

| Slot        | Public (current) | Notes |
|------------|------------------|--------|
| `hero`     | Yes (single preferred) | Bounded scan picks most recent published hero for `/property/[slug]`. |
| `gallery`  | Yes (multi-image grid) | `gallery_order` (optional 0–9999) and `is_gallery_cover` (max one published cover per property **on the same ticket** when set). |
| `card`     | Yes (homepage / listing cards) | Phase **4D.2**: one published card image per resolved property ref (same gate as hero); SSR composes `lux.corpflowai.com/` property cards; falls back to staged `images.hero` or placeholder when absent. **No video.** |
| `detail`   | No | Reserved; not composed on public homepage or property detail in this phase. |
| `reference`| No | Operator reference only; not composed on public cards, property page list, or `property-media-list`. |

## Public surfaces (current)

- **`GET /api/lux/property-media?property=&attachment=&slot=`** — Lux host + `luxe-maurice` context; **published + reviewed + image** + matching link + attachment **`lifecycle_status` not `archived`**; **404** otherwise; conservative cache; **no** raw storage path in response.
- **`GET /api/lux/property-media-list?property=`** — Same host gate; JSON list of **safe** entries (`slot`, `src`, `public_caption`, `public_alt_text`, `gallery_order`, `is_gallery_cover`) for **hero + card + gallery**. **No** operator audit fields, **no** `lux_request_meta`, **no** private download URLs.
- **`/` (LuxeMaurice acquisition)** — Property cards use **published `card`** image when present (`collectPublishedLuxCardMediaByPropertyRefs`); otherwise same-origin staged hero path or neutral placeholder. Feed cards use the same rule when the feed id resolves.
- **`/property/[slug]`** — Renders published **hero** (if any) and a **Gallery** grid for published **gallery** slot images with public caption/alt only (card slot is for listing/home cards, not detail layout in this phase).

## Private vs public guarantees

**Public may show:** public image URL (already includes opaque attachment id in query), public caption, public alt text, slot, sort hints safe for display.

**Public must not show:** `lux_request_meta`, `review_note`, `reviewed_by`, `linked_by`, `published_by`, `publish_history`, lifecycle audit fields, private `/api/change-attachment/download` links, raw storage paths, unpublished/rejected/pending/**archived** media, **video** on these routes.

## Future: CDN / transforms boundary

Out of scope until explicitly specced:

- CDN domains, signed edge URLs, responsive `srcset`, on-the-fly image transforms.
- Video transcoding or public video players.
- External DAM, bulk import, AI tagging, auto-cropping.

Until then, all public bytes flow through the **same governed** `property-media` handler and the same **publish** metadata gate.

# LuxeMaurice media governance (operator-controlled public surfaces)

**Authoritative programme ticket:** `cmo8mjijk0000jl04l1jz0v6d` (not closed by media phases).

This document describes **how media becomes public** on `lux.corpflowai.com` after Phase 4C.x / **4D.1**, and the **hard boundaries** before CDN, transforms, DAM, automation, or social surfaces exist.

## Lifecycles (strict order)

1. **Upload** — Binary lands in `cmp_ticket_attachments`; metadata row is upserted into `console_json.lux_request_meta.attachments[]` with default `review_status: pending_review`. **Nothing is public.**
2. **Review** — Operator sets `pending_review` → `reviewed` or `rejected` via `lux-attachment-review-set`. **Rejected media never becomes linkable for public slots in normal flows.** Still not public.
3. **Link** — Operator associates a **reviewed** attachment with a property ref + `intended_slot` (`hero`, `card`, `detail`, `gallery`, `reference`) via `lux-attachment-property-link-set`. **Still private** (`publish_status: unpublished` on the link).
4. **Publish** — Operator explicitly calls `lux-attachment-property-publish` for that `(property_slug, intended_slot)` link. **Only then** may bytes be served from `GET /api/lux/property-media` and only for **image** MIME types that pass all server checks.

**Auto-publish is forbidden:** no publish on upload, review, or link.

## Slot semantics

| Slot        | Public in Phase 4D.1 | Notes |
|------------|----------------------|--------|
| `hero`     | Yes (single preferred) | Bounded scan picks most recent published hero for `/property/[slug]`. |
| `gallery`  | Yes (multi-image grid) | `gallery_order` (optional 0–9999) and `is_gallery_cover` (max one published cover per property **on the same ticket** when set). |
| `card` / `detail` | No | Metadata only for future work. |
| `reference`| No | Operator reference only; never listed on public property page or `property-media-list`. |

## Public surfaces (current)

- **`GET /api/lux/property-media?property=&attachment=&slot=`** — Lux host + `luxe-maurice` context; **published + reviewed + image** + matching link; **404** otherwise; conservative cache; **no** raw storage path in response.
- **`GET /api/lux/property-media-list?property=`** — Same host gate; JSON list of **safe** entries (`slot`, `src`, `public_caption`, `public_alt_text`, `gallery_order`, `is_gallery_cover`) for **hero + gallery** only. **No** operator audit fields, **no** `lux_request_meta`, **no** private download URLs.
- **`/property/[slug]`** — Renders published **hero** (if any) and a **Gallery** grid for published **gallery** slot images with public caption/alt only.

## Private vs public guarantees

**Public may show:** public image URL (already includes opaque attachment id in query), public caption, public alt text, slot, sort hints safe for display.

**Public must not show:** `lux_request_meta`, `review_note`, `reviewed_by`, `linked_by`, `published_by`, private `/api/change-attachment/download` links, raw storage paths, unpublished/rejected/pending media, **video** on these routes.

## Future: CDN / transforms boundary

Out of scope until explicitly specced:

- CDN domains, signed edge URLs, responsive `srcset`, on-the-fly image transforms.
- Video transcoding or public video players.
- External DAM, bulk import, AI tagging, auto-cropping.

Until then, all public bytes flow through the **same governed** `property-media` handler and the same **publish** metadata gate.

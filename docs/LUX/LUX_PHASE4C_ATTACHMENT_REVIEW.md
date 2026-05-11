# LuxeMaurice Phase 4C — request attachments + operator media review

**Authoritative ticket:** `cmo8mjijk0000jl04l1jz0v6d` (master programme).
**Surface:** `https://lux.corpflowai.com/change` (Lux tenant session only).

This document covers **Phase 4C** (binary upload to a Lux client-request ticket), **Phase 4C.1** (operator media review), **Phase 4C.2** (reviewed-only property linkage, metadata-only), **Phase 4C.3** (operator-controlled **publish** of reviewed+linked **images** to a narrow public surface), **Phase 4D.1** (governed **multi-image gallery** for `intended_slot === gallery` plus the existing **hero** path), **Phase 4D.2** (**homepage / listing card** images for `intended_slot === card`), **Phase 4D.3** (**archive / restore** lifecycle: archive unpublishes all links; restore does not auto-republish; per-link **`publish_history`** for operator audit only), and **Phase 4D.4** (**`/change`** operator UX only: media summary counts, client-side filters, “where used” readout, clearer publish/public labels, optional **Test media** hint from filename/notes/ticket text — **no** new public semantics, **no** hard delete). Video and other media types stay private on public routes; there is still **no** auto-publish, **no** CDN/transform pipeline, and **no** signed public download of raw bytes beyond the governed **`/api/lux/property-media`** (and optional **`property-media-list`**) described below. End-to-end lifecycle and slot rules: **`docs/LUX/LUX_MEDIA_GOVERNANCE.md`**.

## Scope (intentional, narrow)

In scope:

- Operators (and Lux tenant clients on `/change`) can upload images, video, or PDF to a **Lux client-request ticket** via the existing `/api/change-attachment/upload` route.
- Per-attachment review metadata (`intended_use`, `notes`, `media_type`, `review_status`, `review_note`, `reviewed_by`, `reviewed_at`) lives in the ticket's `console_json.lux_request_meta.attachments[]` so it travels with the ticket and stays operator-only.
- A new CMP action **`lux-attachment-review-set`** lets the operator move an attachment between `pending_review` → `reviewed` → `rejected`, with an optional review note.
- `/change` ticket detail shows an **Attachments** panel for Lux client-request tickets with file metadata, a secure view/download link, and the review actions.

Not in scope (deferred):

- **CDN/transforms**, **image processing**, transcoding, or AI / automation around media.
- **Auto-publish** on upload, review, or link (publish is always an explicit operator action).
- **Video** (or non-image MIME) on the public `property-media` route or as published gallery/hero on `/property/[slug]`.
- Cross-tenant exposure of attachment metadata or private download URLs on public pages.

In scope for **Phase 4C.3** + **Phase 4D.1** (narrow exceptions):

- Operator CMP actions **`lux-attachment-property-publish`** / **`lux-attachment-property-unpublish`** (Lux tenant + Lux host + Dormant Gate), updating only the matching `property_links[]` row: `publish_status`, `published_*` / `unpublished_*`, `public_caption`, `public_alt_text` (trimmed/capped). For **`intended_slot === gallery`**, also `gallery_order` (optional capped integer) and `is_gallery_cover` (clears other published gallery covers for the same property on the **same ticket** when set).
- Public **GET** ` /api/lux/property-media?property=<slug>&attachment=<id>&slot=<slot> ` on the Lux hostname only: serves bytes **only** when the link is **published**, the attachment is **reviewed**, MIME is **`image/*`**, and `(property, slot)` matches the link. Wrong property/slot/unpublished/non-image → **404**; invalid slot → **400**. Conservative cache headers; **no** raw storage path in the response.
- Public **GET** `/api/lux/property-media-list?property=<slug>` (Lux host, `luxe-maurice`): JSON list of **published** **hero + card + gallery** image entries with **safe** fields only (`slot`, `src`, captions/alt, sort hints). No operator audit fields, no raw paths.
- **`/`** (LuxeMaurice acquisition homepage) uses **published `card`** images on property cards when present; otherwise staged same-origin hero or placeholders (**Phase 4D.2**).
- **`/property/[slug]`** may show a **published hero** (`intended_slot === hero`) and a **Gallery** section for **published gallery** slot images; falls back to the static catalog hero when no published hero qualifies; gallery section omitted when no published gallery images exist.

In scope for **Phase 4D.3**:

- CMP actions **`lux-attachment-archive`** / **`lux-attachment-restore`** (Lux tenant + Lux host + Dormant Gate). Archive sets **`lifecycle_status: archived`**, stamps `archived_at` / `archived_by` / optional `archive_reason`, and sets **every** `property_links[]` row with `publish_status: published` to **`unpublished`** (preserving captions and prior publish timestamps on the row). Restore sets **`lifecycle_status: active`** and `restored_at` / `restored_by`; links stay **unpublished** until the operator publishes again.
- Per-link **`publish_history`** (capped array of `{ at, action, actor, note }` for `published` \| `unpublished` \| `archived` \| `restored`) is appended on publish, unpublish, archive, and restore. **Never** returned on public list payloads.
- **`/change`** shows lifecycle fields, a short publish-history summary per link, Archive/Restore controls, and replacement guidance (upload → review → link → publish → archive old).

In scope for **Phase 4D.4** (operator ergonomics only):

- **`/change` Attachments** — compact **media summary** (total, pending review, reviewed, rejected, archived, linked, published, needs action). Counts reuse the same pure helpers as filters; **published** in the summary means at least one **`publish_status: published`** link on an **active** (non-archived) attachment (archived rows do not increment published even if a client showed stale state).
- **Client-side filters** — narrow the visible attachment cards without new API parameters.
- **“Where used”** — one block per attachment summarizing each `property_links[]` row: property slug/title, intended slot, publish label (Published / Unpublished), attachment lifecycle (Active / Archived), and **visibility** text derived from the same gate as public `property-media` (hero / gallery / card vs private slots or not-currently-public reasons).
- **Copy** — consistent operator wording (e.g. Pending review, Published, Unpublished, Archived, Private, public-on-page strings). **Optional “Test media” badge** when filename, notes, or ticket title/description match known smoke/test substrings used in fixtures; never auto-deletes.
- **Cleanup stance** — no operator hard-delete in this phase; **archive** remains the safe retirement path. Future delete tooling needs an explicit Lux policy + implementation.

## Storage shape

Attachments use **two stores in the same tenant boundary**:

1. **Bytes** — `cmp_ticket_attachments` row (`id`, `ticketId`, `tenantId`, `fileName`, `contentType`, `byteSize`, `data`, `createdAt`). Already shipped pre-Phase 4C.
2. **Operator metadata** — `cmp_tickets.console_json.lux_request_meta.attachments[]` (Phase 4C.1, this branch).

Each metadata entry has the shape:

```json
{
  "attachment_id": "<cmp_ticket_attachments.id>",
  "file_name": "hero.jpg",
  "content_type": "image/jpeg",
  "byte_size": 12345,
  "media_type": "image",          // image | video | audio | document | other
  "intended_use": "property_hero", // property_hero | property_gallery | request_supporting | reference_material | other (or null)
  "notes": "Cliff view, golden hour",
  "review_status": "pending_review", // pending_review | reviewed | rejected
  "review_note": null,
  "reviewed_at": null,
  "reviewed_by": null,
  "lifecycle_status": "active",
  "archived_at": null,
  "archived_by": null,
  "archive_reason": null,
  "restored_at": null,
  "restored_by": null,
  "created_at": "2026-05-08T09:00:00.000Z",
  "created_by": "tenant_session"
}
```

New links created by **`lux-attachment-property-link-set`** include `publish_history: []` (then populated by publish/unpublish/archive/restore helpers).

When an operator changes review status, a structured trail is appended to `console_json.messages[]`:

```json
{
  "kind": "lux_attachment_review",
  "at": "2026-05-08T09:30:00.000Z",
  "attachment_id": "...",
  "file_name": "hero.jpg",
  "review_status": "rejected",
  "review_note": "too dark",
  "reviewed_by": "<session.username>"
}
```

The append is idempotent on `(attachment_id, review_status, at)` to avoid double-writes on retry.

## API surfaces

| Method + route | Action | Tenancy | Purpose |
|---|---|---|---|
| `POST /api/change-attachment/upload` | (binary upload) | tenant or admin session | Accepts `data_base64`. For Lux client-request tickets it **also** writes a `lux_request_meta.attachments[]` entry (defaults to `review_status: pending_review`). Optional body fields: `intended_use`, `notes`. |
| `GET  /api/change-attachment/list?ticket_id=...` | (list) | tenant or admin session | For Lux client-request tickets, returns the merged operator-safe shape (DB row + metadata). For other tenants, returns the prior basic shape. |
| `GET  /api/change-attachment/download?id=...` | (download) | tenant or admin session | Unchanged. Streams bytes for the owning tenant only. |
| `POST /api/cmp/router?action=lux-attachment-review-set` | `lux-attachment-review-set` | **Lux tenant + Lux host only** (`luxe-maurice` + `lux.corpflowai.com`) | Sets `review_status`, `review_note`, `reviewed_at`, `reviewed_by` on the matching attachment entry; appends a `lux_attachment_review` message. |
| `POST /api/cmp/router?action=lux-attachment-property-publish` | `lux-attachment-property-publish` | **Lux tenant + Lux host only** | Publishes a **reviewed + linked + image** attachment for one `(property_slug, intended_slot)`; for **`gallery`**, body may include **`gallery_order`**, **`is_gallery_cover`** (clears other published gallery covers on the ticket for that property). Appends `lux_attachment_property_publish` (`message`: `media published`). |
| `POST /api/cmp/router?action=lux-attachment-property-unpublish` | `lux-attachment-property-unpublish` | **Lux tenant + Lux host only** | Sets `publish_status` back to `unpublished`; preserves link + review + caption/alt metadata; appends `media unpublished`. |
| `POST /api/cmp/router?action=lux-attachment-archive` | `lux-attachment-archive` | **Lux tenant + Lux host only** | Sets attachment `lifecycle_status: archived`, unpublishes **all** links for that attachment, appends link-level history + `lux_attachment_lifecycle` message; **no byte delete**. |
| `POST /api/cmp/router?action=lux-attachment-restore` | `lux-attachment-restore` | **Lux tenant + Lux host only** | Sets `lifecycle_status: active` + `restored_*`; **does not** republish. |
| `GET /api/lux/property-media?...` | (public image bytes) | **Lux hostname + tenant host context `luxe-maurice` only** | Serves the image only when published+reviewed+linked slot matches and attachment is **not archived**; never exposes operator-only JSON. |
| `GET /api/lux/property-media-list?property=...` | (public JSON list) | **Lux hostname + tenant host context `luxe-maurice` only** | Returns **published** **hero + card + gallery** image entries with **safe** display fields only (`slot`, `src`, captions/alt, sort hints); no attachment audit blob, no raw storage paths. |

### `lux-attachment-review-set` request body

```json
{
  "ticket_id": "cmo...",
  "attachment_id": "...",
  "review_status": "reviewed",   // pending_review | reviewed | rejected (allowlist enforced)
  "review_note": "Looks good"    // optional, ≤1000 chars
}
```

### Error contract (operator UI surfaces these)

- `400 INVALID_REVIEW_STATUS` — sent when `review_status` is outside the allowlist.
- `404 TICKET_NOT_FOUND` — ticket doesn't exist or belongs to another tenant.
- `404 ATTACHMENT_NOT_FOUND` — attachment id doesn't belong to this ticket / tenant.
- `409 TICKET_NOT_LUX_REQUEST` — ticket has no `lux_request_meta` (not a Lux client-request ticket).
- `409 ATTACHMENT_NOT_TRACKED` — bytes exist in `cmp_ticket_attachments` but no metadata entry yet (legacy upload predating Phase 4C.1). Re-upload via the Lux flow to register metadata.
- `403 LUX_ATTACHMENT_REVIEW_TENANT_ONLY` / `403 LUX_HOST_REQUIRED` — wrong tenant or wrong host.
- `403 dormant gate` — session expired; the UI surfaces "Your session expired. Please refresh and log in again."

## `/change` UI

When a Lux client-request ticket is selected and has at least one attachment, an **Attachments** panel renders below the ticket snapshot. For each attachment it shows:

- File name + status badge (Pending review / Reviewed / Rejected / Untracked).
- Media type, MIME, size (KB), intended use, created-at.
- Notes (if provided at upload time).
- For reviewed/rejected entries: who reviewed, when, and the review note.
- A `View / download` link that opens the existing secure download route.
- Three operator buttons (`Mark reviewed`, `Reject`, `Reset to pending`) plus an optional review note textarea.

Attachments are loaded automatically when the selected ticket changes. The list refreshes after a successful review action.

## Phase 4C.2 — reviewed media → property linkage (private)

Goal: allow operators to associate **reviewed** attachments with LuxeMaurice property records so future, governed publishing workflows can draw only from approved assets.

Rules (non-negotiable):

- **Reviewed-only**: only attachments with `review_status === "reviewed"` may be linked.
- **Lux-only + operator-only**: called only from authenticated Lux tenant session on `lux.corpflowai.com` and guarded by Dormant Gate.
- **Private**: no public rendering, no public URLs, no binary duplication. Phase 4C.2 only writes metadata on the ticket.
- **Host-derived tenant scope**: no `tenant_id` accepted from the client.

### Persistence model

Stored only inside the matching attachment metadata entry:

`console_json.lux_request_meta.attachments[].property_links[]`

Shape:

```json
{
  "property_slug": "lm-phase2d-manual-demo",
  "property_title": "…",
  "intended_slot": "hero",
  "linked_at": "2026-05-09T00:00:00.000Z",
  "linked_by": "lux-smoke@corpflowai.com",
  "link_note": "Optional operator note",
  "publish_status": "unpublished",
  "published_at": null,
  "published_by": null,
  "unpublished_at": null,
  "unpublished_by": null,
  "public_caption": null,
  "public_alt_text": null
}
```

New links default to `publish_status: "unpublished"`. Phase 4C.3 updates publish fields in place (see CMP actions below).

Allowed `intended_slot` values: `hero`, `card`, `detail`, `gallery`, `reference`.

### API actions (operator)

- `POST /api/cmp/router?action=lux-attachment-property-link-set`
  - Body: `{ ticket_id, attachment_id, property_slug, intended_slot, link_note? }`
  - Validates `property_slug` via `resolveLuxPropertyRef()`
  - Enforces reviewed-only; rejects pending/rejected
- `POST /api/cmp/router?action=lux-attachment-property-link-remove`
  - Body: `{ ticket_id, attachment_id, property_slug, intended_slot }`
  - Removes only the matching `(property_slug, intended_slot)` link

### UI behavior

- For **reviewed** attachments only, `/change` shows “Link to property” controls (slug + slot + optional note).
- Existing property links are listed on the attachment with an “Unlink” control per link.

### Phase 4C.3 — Publish / unpublish (reviewed + linked + **image**)

- For each **reviewed** attachment with `media_type === image` and at least one **property link**, `/change` shows per-link **publish status**, optional **public caption** and **public alt** inputs, **Publish** and **Unpublish**, and read-only `published_*` / `unpublished_*` audit lines.
- **Publish** / **Unpublish** are hidden for non-images, pending/rejected attachments, or when no link exists (controls are scoped inside each link card and only render for reviewed images).
- Nothing is auto-published when uploading, reviewing, or linking.

## Tenant isolation invariants

- The CMP route validates **both** tenant session (`luxe-maurice`) **and** host context (`lux.corpflowai.com`) before any DB access.
- The DB step asserts the ticket's `tenantId === 'luxe-maurice'` and the attachment's `tenantId === 'luxe-maurice'` and `ticketId === ticket_id`. A non-Lux tenant cannot review or list Lux attachments even with a guessed id.
- Public marketing pages (`/`, `/concierge`) **do not** expose `lux_request_meta`, review notes, private download paths, or `property_links` JSON in HTML. **`/property/[slug]`** performs a **bounded** scan of recent Lux request tickets solely to resolve a **published hero** image URL + public caption/alt when Phase 4C.3 criteria are met; it does not ship operator-only fields to the client. Only the authenticated `/change` operator surface shows the full merged attachment shape (including private review metadata and secure download links).

## Future gaps (explicit)

- **Media library / multi-image galleries**, responsive srcsets, **CDN**, on-the-fly **transforms**, and **video** publishing remain out of scope.
- No **signed URLs** to the private `/api/change-attachment/download` route for anonymous visitors.

## Verification (operator)

1. Sign in as a Lux operator on `https://lux.corpflowai.com/change`.
2. Submit a "Request something new" ticket from `/change` (e.g. property update with description).
3. Upload one image and one video to the new ticket via the existing upload route, e.g. via DevTools fetch:

```js
await fetch('/api/change-attachment/upload', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticket_id: '<ticket_id>',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    data_base64: '<base64>',
    intended_use: 'property_hero',
    notes: 'Cliff view'
  })
});
```

4. Reload `/change`, select the ticket — confirm the Attachments panel renders with the file name, type, intended use, notes, and a Pending review badge.
5. Click `Mark reviewed` (with an optional note) on the image; click `Reject` on the video. Refresh — confirm both states persist and `reviewed_by` shows the operator session.
6. Confirm `https://lux.corpflowai.com/`, `/property/<slug>`, and `/concierge` still load and show **no** review metadata or download URLs.
7. Sign in as a different tenant (or as no tenant) and confirm `lux-attachment-review-set` returns `403`.

## Cross-references

- `lib/cmp/_lib/lux-request-attachments.js` — pure helper module (status enums, normalizers, immutable JSON updaters, safe shape).
- `lib/server/change-attachments.js` — extended upload + list routes.
- `lib/cmp/router.js` — `lux-attachment-review-set`, `lux-attachment-property-link-*`, `lux-attachment-property-publish`, `lux-attachment-property-unpublish`, **`lux-attachment-archive`**, **`lux-attachment-restore`** handlers + tenant-login allowlist.
- `lib/server/lux-property-media.js` — public image route handler (**archived** attachments → **404**).
- `lib/server/lux-published-property-media.js` — public composition (**skips archived** attachments).
- `pages/change.js` — Attachments panel + review + link + publish + **archive/restore** actions.
- `pages/property/[slug].js` — optional published hero from recent Lux tickets.
- `node-tests/lux-request-attachments.test.mjs` — pure helper tests.
- `docs/LUX/LUX_DELIVERY_PROGRAMME.md` — programme phase placement.
- `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md` — Lux `/change` UI / layout fix workflow (preview-smoke loop).

## Delivery Reality Audit (Phase 4C.1)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (PR #156, merge commit feeca06c4d6a76582670a43226e3369b4ed13242)
- Production deployment ID: GitHub deployment 4620068642 (Vercel target_url https://corpflow-ai-command-center-detezelan-corpflowai.vercel.app)
- Commit deployed: feeca06c4d6a76582670a43226e3369b4ed13242
- Live URLs tested:
  - https://lux.corpflowai.com (public)
  - https://lux.corpflowai.com/concierge (public)
  - https://lux.corpflowai.com/property/lm-phase2d-manual-demo (public)
  - https://lux.corpflowai.com/change (authenticated)
- Expected vs actual result:
  - Operator login works on Lux host.
  - Phase 4C.1 smoke created a Lux request ticket, uploaded image+video, listed attachments with metadata,
    performed reviewed+rejected actions with notes, and confirmed persistence.
  - Public surfaces contained no attachment metadata or private routes in content.
- Client-facing flow usable: YES (operator-only flow on /change)
- Final verdict: COMPLETE
```

## Delivery Reality Audit (Phase 4C.2)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (PR #158, merge commit 7b8247325afc40e6cfb6cbc2c787f4e6e3fe91d0)
- Production deployment ID: GitHub deployment 4630215289 (Vercel target_url https://corpflow-ai-command-center-d667rj7je-corpflowai.vercel.app)
- Commit deployed: 7b8247325afc40e6cfb6cbc2c787f4e6e3fe91d0
- Live URLs tested:
  - https://lux.corpflowai.com (public)
  - https://lux.corpflowai.com/concierge (public)
  - https://lux.corpflowai.com/property/lm-phase2d-manual-demo (public)
  - https://lux.corpflowai.com/change (authenticated)
- Expected vs actual result:
  - Operator login works on Lux host.
  - Phase 4C.2 smoke created a new Lux request ticket, uploaded image+video, reviewed/rejected, then linked the reviewed image to lm-phase2d-manual-demo (hero) and confirmed persistence, then unlinked and confirmed removal.
  - Attempting to link non-reviewed media is rejected server-side; link controls only appear for reviewed attachments in /change.
  - Public surfaces contained no attachment metadata, review metadata, or property_links content.
- Client-facing flow usable: YES (operator-only flow on /change)
- Final verdict: COMPLETE
```

## Delivery Reality Audit (Phase 4C.3)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES
  - Feature PR **#160** (squash merge commit `3056bb8ae180d2decb921efb790a5e9fe26b9659`)
  - Follow-up PR **#161** — `lib/server/lux-property-media.js` deny responses use `Cache-Control: private, no-store` and 200 responses drop `stale-while-revalidate` so unpublish is not masked by CDN; smoke adds per-GET `_cb` (squash merge commit `3a77249f48c20f5fdd19a3cd67105e1356b435f7`)
- Production deployment ID: GitHub deployment **4643154095** (Vercel target_url `https://corpflow-ai-command-center-n1wlcqn1x-corpflowai.vercel.app`, state success)
- Commit deployed (production): `3a77249f48c20f5fdd19a3cd67105e1356b435f7`
- Live URLs tested:
  - https://lux.corpflowai.com/change (authenticated)
  - https://lux.corpflowai.com/api/lux/property-media (GET, publish vs unpublish gate)
  - https://lux.corpflowai.com/property/lm-phase2d-manual-demo (published hero + caption/alt, then fallback after unpublish)
  - https://lux.corpflowai.com/, /concierge (public no-leak smoke)
- Production smoke: `npm run smoke:lux-phase4c1 -- --target=production` (2026-05-11) — ALL CHECKS PASSED
  - Publish proof: `property-media` **200** + `image/*` after `lux-attachment-property-publish`; `/property/lm-phase2d-manual-demo` HTML contained public caption **Smoke 4C3 public caption** + alt **Smoke 4C3 public alt** and `/api/lux/property-media` URL
  - Unpublish proof: after `lux-attachment-property-unpublish`, `property-media` **404**; property page no longer contained the public caption string
  - IMAGE_ONLY proof: reviewed video linked to `gallery` then `lux-attachment-property-publish` returned **409 IMAGE_ONLY**
  - Public no-leak: `/`, `/concierge`, `/property/lm-phase2d-manual-demo` smoke forbids `lux_request_meta`, `property_links`, `review_status`, `/api/change-attachment/`, etc. in HTML body — passed
- Master programme ticket `cmo8mjijk0000jl04l1jz0v6d`: intentionally **not** closed by this phase
- Client-facing flow usable: YES (operator publish gate + narrow public hero + governed media URL)
- Final verdict: COMPLETE
```

## Delivery Reality Audit (Phase 4D.1)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES — PR **#163** (squash merge commit `485b30014aeca3d74c8e80052a9b03c6c0602dff`)
- Production deployment ID: GitHub deployment **4643549076** (Vercel target_url `https://corpflow-ai-command-center-ltkqbvoex-corpflowai.vercel.app`, state success)
- Commit deployed (production): `485b30014aeca3d74c8e80052a9b03c6c0602dff`
- Live URLs tested:
  - https://lux.corpflowai.com/change (authenticated)
  - https://lux.corpflowai.com/api/lux/property-media (GET, hero + gallery slot gate)
  - https://lux.corpflowai.com/api/lux/property-media-list?property=lm-phase2d-manual-demo (published hero + gallery JSON, safe fields only)
  - https://lux.corpflowai.com/property/lm-phase2d-manual-demo (gallery grid + captions/alt when published)
  - https://lux.corpflowai.com/, /concierge (public no-leak smoke)
- Production smoke: `npm run smoke:lux-phase4c1 -- --target=production` (2026-05-11) — ALL CHECKS PASSED
  - Gallery publish proof: two reviewed PNGs linked as `gallery`, published with order/caption/alt; `property-media` **200** + `image/*` for both; `property-media-list` returned **≥2** gallery items; `/property/lm-phase2d-manual-demo` HTML showed gallery grid + caption strings from smoke
  - Gallery unpublish proof: after `lux-attachment-property-unpublish` on one gallery attachment, that image **404**d on `property-media` and disappeared from list + property page while the other published gallery image remained
  - Video remains private: reviewed video linked to `gallery` then `lux-attachment-property-publish` returned **409 IMAGE_ONLY**; no public gallery bytes for video
  - Public no-leak: `/`, `/concierge`, `/property/lm-phase2d-manual-demo` smoke forbids `lux_request_meta`, `property_links`, `review_status`, `/api/change-attachment/`, etc. in HTML body — passed
- Master programme ticket `cmo8mjijk0000jl04l1jz0v6d`: intentionally **not** closed by this phase
- Client-facing flow usable: YES (operator gallery publish + governed list + property gallery grid)
- Final verdict: COMPLETE
```

## Delivery Reality Audit (Phase 4D.2)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES — PR **#165** (squash merge commit `3e28a00b01ca9fc467f85b07a4af26185233281e`; cherry-picked from `4b00f89b` on clean branch `lux/phase-4d2-homepage-card`)
- Production deployment ID: GitHub deployment **4644040270** (Vercel target_url `https://corpflow-ai-command-center-o7v5min9u-corpflowai.vercel.app`, state success)
- Commit deployed (production): `3e28a00b01ca9fc467f85b07a4af26185233281e`
- Live URLs tested:
  - https://lux.corpflowai.com/change (authenticated)
  - https://lux.corpflowai.com/ (homepage — published `card` image on `lm-phase2d-manual-demo` listing card when published)
  - https://lux.corpflowai.com/api/lux/property-media (GET, `slot=card` gate)
  - https://lux.corpflowai.com/api/lux/property-media-list?property=lm-phase2d-manual-demo (includes `slot=card` when published)
  - https://lux.corpflowai.com/, /concierge, /property/lm-phase2d-manual-demo (public no-leak smoke)
- Production smoke: `npm run smoke:lux-phase4c1 -- --target=production` (2026-05-11) — ALL CHECKS PASSED
  - Homepage card publish proof: reviewed PNG linked as `card`, published; `property-media` **200** + `image/*` for `slot=card`; homepage HTML contained `slot=card` URL and alt probe **Smoke4D2CardAltUnique9271**
  - Homepage fallback proof: after `lux-attachment-property-unpublish` on the card link, homepage HTML no longer contained alt probe; card `property-media` **404**
  - `property-media-list` included `card` item while published; video gallery publish still **409 IMAGE_ONLY** (unchanged gate)
  - Public no-leak: `/`, `/concierge`, `/property/lm-phase2d-manual-demo` smoke forbids `lux_request_meta`, `property_links`, `review_status`, `/api/change-attachment/`, etc. in HTML body — passed
- Master programme ticket `cmo8mjijk0000jl04l1jz0v6d`: intentionally **not** closed by this phase
- Client-facing flow usable: YES (homepage listing cards can use governed published card images)
- Final verdict: COMPLETE
```

## Delivery Reality Audit (Phase 4D.3)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES — PR **#167** (squash merge commit `38710b84fcd7146979748621d79ea767206a81ba`)
- Production deployment ID: GitHub deployment **4644466974** (Vercel target_url `https://corpflow-ai-command-center-r5zykh5b4-corpflowai.vercel.app`, state success)
- Commit deployed (production): `38710b84fcd7146979748621d79ea767206a81ba`
- Live URLs tested:
  - https://lux.corpflowai.com/change (authenticated)
  - https://lux.corpflowai.com/api/lux/property-media (GET — archive → 404, restore without republish → 404, explicit republish → 200)
  - https://lux.corpflowai.com/property/lm-phase2d-manual-demo (hero caption absent after archive)
  - https://lux.corpflowai.com/, /concierge (public no-leak smoke)
- Production smoke: `npm run smoke:lux-phase4c1 -- --target=production` (2026-05-11) — ALL CHECKS PASSED
  - Archive proof: after `lux-attachment-archive`, hero `property-media` **404**; property page HTML no longer contained **Smoke 4C3 public caption**; list payload showed `lifecycle_status: archived`, hero link `publish_status: unpublished`, and `publish_history` contained **unpublished** (auto: attachment archived) + **archived**
  - Restore proof: `lux-attachment-restore` then `property-media` still **404** (not auto-republished)
  - Republish proof: `lux-attachment-property-publish` again → **200** + `image/*` on `property-media`
  - `tenant_id` / `tenantId` in archive body → **400** `TENANT_ID_NOT_ALLOWED_IN_BODY`; publish while archived → **409** `LIFECYCLE_ARCHIVED`
  - Public no-leak: `/`, `/concierge`, `/property/lm-phase2d-manual-demo` smoke forbids `lux_request_meta`, `property_links`, `review_status`, `/api/change-attachment/`, etc. in HTML body — passed
- Master programme ticket `cmo8mjijk0000jl04l1jz0v6d`: intentionally **not** closed by this phase
- Client-facing flow usable: YES (operators can archive/restore without deleting bytes; public surfaces stay clean)
- Final verdict: COMPLETE
```

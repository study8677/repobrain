# LuxeMaurice Phase 4C — request attachments + operator media review

**Authoritative ticket:** `cmo8mjijk0000jl04l1jz0v6d` (master programme).
**Surface:** `https://lux.corpflowai.com/change` (Lux tenant session only).

This document covers **Phase 4C** (binary upload to a Lux client-request ticket) and **Phase 4C.1** (the operator media review surface added in this branch). Phase 4C is intentionally a private, operator-only intake step; nothing here publishes media to the public Lux site.

## Scope (intentional, narrow)

In scope:

- Operators (and Lux tenant clients on `/change`) can upload images, video, or PDF to a **Lux client-request ticket** via the existing `/api/change-attachment/upload` route.
- Per-attachment review metadata (`intended_use`, `notes`, `media_type`, `review_status`, `review_note`, `reviewed_by`, `reviewed_at`) lives in the ticket's `console_json.lux_request_meta.attachments[]` so it travels with the ticket and stays operator-only.
- A new CMP action **`lux-attachment-review-set`** lets the operator move an attachment between `pending_review` → `reviewed` → `rejected`, with an optional review note.
- `/change` ticket detail shows an **Attachments** panel for Lux client-request tickets with file metadata, a secure view/download link, and the review actions.

Not in scope (deferred):

- Publishing approved media to `lux.corpflowai.com` (homepage, listings, galleries, CDN).
- Building galleries, CDNs, image processing, transcoding, or AI / automation around media.
- Cross-tenant or public exposure of attachment metadata.

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
  "created_at": "2026-05-08T09:00:00.000Z",
  "created_by": "tenant_session"
}
```

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
  "link_note": "Optional operator note"
}
```

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

## Tenant isolation invariants

- The CMP route validates **both** tenant session (`luxe-maurice`) **and** host context (`lux.corpflowai.com`) before any DB access.
- The DB step asserts the ticket's `tenantId === 'luxe-maurice'` and the attachment's `tenantId === 'luxe-maurice'` and `ticketId === ticket_id`. A non-Lux tenant cannot review or list Lux attachments even with a guessed id.
- Public marketing pages (`/`, `/property/...`, `/concierge`) **do not** read `lux_request_meta.attachments[]` and never expose review state. Only the authenticated `/change` operator surface does.

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
- `lib/cmp/router.js` — `lux-attachment-review-set` handler + tenant-login allowlist.
- `pages/change.js` — Attachments panel + review actions + form guidance text.
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

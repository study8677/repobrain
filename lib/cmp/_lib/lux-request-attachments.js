/**
 * Phase 4C.1 helpers — operator media review for Lux client request attachments.
 *
 * Scope (intentional, narrow):
 * - Attachments are stored in `cmp_ticket_attachments` (binary bytes, ticket-scoped).
 * - Per-attachment review metadata (intended_use, notes, media_type, review_status, …)
 *   lives in `cmp_tickets.console_json.lux_request_meta.attachments[]` so it travels with
 *   the Lux request ticket and stays operator-only (never surfaced on the public site).
 *
 * Phase 4D.3 adds **attachment lifecycle** (`active` | `archived`) and per-link **`publish_history`** (operator-only);
 * archived attachments cannot publish or appear on public media collectors; archive auto-unpublishes all links.
 *
 * Phase 4D.4 adds **pure helpers** for `/change` media summary, filters, and “where used” display — no new public semantics.
 *
 * NOT in scope here:
 * - CDN transforms, external DAM, AI tagging, or video on public property-media routes.
 * - Any cross-tenant attachment surface.
 *
 * Tenancy: every helper assumes the caller has already enforced
 * `tenantId === 'luxe-maurice'` and Lux-host context. Helpers do not re-derive tenancy.
 */

export const LUX_ATTACHMENT_REVIEW_STATUSES = Object.freeze([
  'pending_review',
  'reviewed',
  'rejected',
]);

export const LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS = 'pending_review';

export const LUX_ATTACHMENT_INTENDED_USES = Object.freeze([
  'property_hero',
  'property_gallery',
  'request_supporting',
  'reference_material',
  'other',
]);

// Phase 4C.2 — reviewed media association to a property record (still private; not published).
export const LUX_ATTACHMENT_PROPERTY_SLOTS = Object.freeze([
  'hero',
  'card',
  'detail',
  'gallery',
  'reference',
]);

export const LUX_ATTACHMENT_PUBLISH_STATUSES = Object.freeze(['unpublished', 'published']);

const REVIEW_NOTE_MAX_LEN = 1000;
const FILE_NAME_MAX_LEN = 240;
const NOTES_MAX_LEN = 1000;
const LINK_NOTE_MAX_LEN = 600;
const PUBLIC_TEXT_MAX_LEN = 180;
const LUX_GALLERY_ORDER_MAX = 9999;

/** Phase 4D.3 — per property_link publish audit (operator-only; never on public list payloads). */
export const LUX_LINK_PUBLISH_HISTORY_MAX = 40;

const LUX_ARCHIVE_REASON_MAX = 600;

export const LUX_ATTACHMENT_LIFECYCLE_STATUSES = Object.freeze(['active', 'archived']);

export const LUX_ATTACHMENT_DEFAULT_LIFECYCLE_STATUS = 'active';

/**
 * @param {unknown} raw
 * @returns {'active' | 'archived'}
 */
export function normalizeLuxLifecycleStatus(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (v === 'archived') return 'archived';
  return 'active';
}

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
export function isLuxAttachmentLifecycleArchived(entry) {
  return normalizeLuxLifecycleStatus(entry?.lifecycle_status) === 'archived';
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLuxArchiveReason(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, LUX_ARCHIVE_REASON_MAX);
}

/**
 * @param {object} link
 * @param {{ action: 'published' | 'unpublished' | 'archived' | 'restored', at?: string | null, actor?: string | null, note?: string | null }} evt
 * @returns {object}
 */
export function appendLuxLinkPublishHistoryEntry(link, evt) {
  const base = link && typeof link === 'object' ? link : {};
  const action = evt?.action;
  if (action !== 'published' && action !== 'unpublished' && action !== 'archived' && action !== 'restored') {
    return { ...base };
  }
  const at =
    evt?.at != null && String(evt.at).trim() ? String(evt.at).trim() : new Date().toISOString();
  const actor = evt?.actor != null && String(evt.actor).trim() ? String(evt.actor).trim().slice(0, 200) : null;
  const noteRaw = evt?.note != null ? String(evt.note).trim() : '';
  const note = noteRaw ? noteRaw.slice(0, LINK_NOTE_MAX_LEN) : null;
  const hist = Array.isArray(base.publish_history) ? base.publish_history.slice() : [];
  hist.push({ at, action, actor, note });
  while (hist.length > LUX_LINK_PUBLISH_HISTORY_MAX) hist.shift();
  return { ...base, publish_history: hist };
}

/**
 * Optional gallery sort index (0–9999). Null = omit / default sort by publish time server-side.
 *
 * @param {unknown} raw
 * @returns {number | null}
 */
export function normalizeLuxGalleryOrder(raw) {
  if (raw == null || raw === '') return null;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0 || n > LUX_GALLERY_ORDER_MAX) return null;
  return n;
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function normalizeLuxGalleryCover(raw) {
  if (raw === true || raw === 1) return true;
  if (typeof raw === 'string' && String(raw).trim().toLowerCase() === 'true') return true;
  return false;
}

/**
 * When setting a new published gallery cover, clear other published gallery covers for the same property on this ticket.
 *
 * @param {object} consoleJson — mutated
 * @param {string} propertySlugLower
 * @param {string} exceptAttachmentId
 */
export function clearPublishedGalleryCoversForPropertyOnTicket(consoleJson, propertySlugLower, exceptAttachmentId) {
  const slug = propertySlugLower != null ? String(propertySlugLower).trim().toLowerCase() : '';
  const ex = exceptAttachmentId != null ? String(exceptAttachmentId).trim() : '';
  if (!slug || !ex) return;
  const list = consoleJson?.lux_request_meta?.attachments;
  if (!Array.isArray(list)) return;
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue;
    const aid = String(entry.attachment_id || '').trim();
    const pls = Array.isArray(entry.property_links) ? entry.property_links : [];
    for (let i = 0; i < pls.length; i++) {
      const pl = pls[i];
      if (!pl || typeof pl !== 'object') continue;
      if (String(pl.property_slug || '').toLowerCase() !== slug) continue;
      const slot = normalizeLuxAttachmentPropertySlot(pl.intended_slot);
      if (slot !== 'gallery') continue;
      if (String(pl.publish_status || '').toLowerCase() !== 'published') continue;
      if (aid === ex) continue;
      if (pl.is_gallery_cover === true) {
        pls[i] = { ...pl, is_gallery_cover: false };
      }
    }
    entry.property_links = pls;
  }
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentReviewStatus(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!v) return null;
  return LUX_ATTACHMENT_REVIEW_STATUSES.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentIntendedUse(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if (!v) return null;
  return LUX_ATTACHMENT_INTENDED_USES.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeAttachmentNotes(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, NOTES_MAX_LEN);
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLuxAttachmentPropertySlot(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if (!v) return null;
  return LUX_ATTACHMENT_PROPERTY_SLOTS.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLuxAttachmentLinkNote(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, LINK_NOTE_MAX_LEN);
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLuxAttachmentPublishStatus(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!v) return null;
  return LUX_ATTACHMENT_PUBLISH_STATUSES.includes(v) ? v : null;
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeLuxPublicText(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, PUBLIC_TEXT_MAX_LEN);
}

/**
 * @param {unknown} raw
 * @returns {string | null}
 */
export function normalizeReviewNote(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.slice(0, REVIEW_NOTE_MAX_LEN);
}

/**
 * Coarse media type bucket derived from the upload `Content-Type`.
 * Operator UI shows this so reviewers can spot images vs videos vs documents at a glance
 * without trusting the raw mime string.
 *
 * @param {unknown} contentType
 * @returns {'image' | 'video' | 'audio' | 'document' | 'other'}
 */
export function deriveMediaType(contentType) {
  const ct = contentType != null ? String(contentType).trim().toLowerCase() : '';
  if (!ct) return 'other';
  if (ct.startsWith('image/')) return 'image';
  if (ct.startsWith('video/')) return 'video';
  if (ct.startsWith('audio/')) return 'audio';
  if (ct === 'application/pdf') return 'document';
  return 'other';
}

/**
 * Build a fresh `lux_request_meta.attachments[]` entry from upload inputs.
 * The entry is an operator-only metadata record; raw bytes never live here.
 *
 * @param {{
 *   attachment_id: string,
 *   file_name?: string | null,
 *   content_type?: string | null,
 *   byte_size?: number | null,
 *   intended_use?: string | null,
 *   notes?: string | null,
 *   created_at?: string | null,
 *   created_by?: string | null,
 * }} args
 * @returns {object}
 */
export function buildLuxAttachmentEntry(args) {
  const a = args && typeof args === 'object' ? args : {};
  const id = a.attachment_id != null ? String(a.attachment_id).trim() : '';
  if (!id) throw new Error('buildLuxAttachmentEntry: attachment_id required');
  const fileName =
    a.file_name != null && String(a.file_name).trim()
      ? String(a.file_name).trim().slice(0, FILE_NAME_MAX_LEN)
      : 'upload.bin';
  const contentType =
    a.content_type != null && String(a.content_type).trim()
      ? String(a.content_type).trim().slice(0, 160)
      : 'application/octet-stream';
  const byteSize = Number.isFinite(Number(a.byte_size)) ? Math.max(0, Math.trunc(Number(a.byte_size))) : 0;
  const intendedUse = normalizeAttachmentIntendedUse(a.intended_use);
  const notes = normalizeAttachmentNotes(a.notes);
  const createdAt =
    a.created_at != null && String(a.created_at).trim()
      ? String(a.created_at).trim()
      : new Date().toISOString();
  const createdBy = a.created_by != null && String(a.created_by).trim() ? String(a.created_by).trim() : null;

  return {
    attachment_id: id,
    file_name: fileName,
    content_type: contentType,
    byte_size: byteSize,
    media_type: deriveMediaType(contentType),
    intended_use: intendedUse,
    notes,
    review_status: LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
    review_note: null,
    reviewed_at: null,
    reviewed_by: null,
    lifecycle_status: LUX_ATTACHMENT_DEFAULT_LIFECYCLE_STATUS,
    archived_at: null,
    archived_by: null,
    archive_reason: null,
    restored_at: null,
    restored_by: null,
    property_links: [],
    created_at: createdAt,
    created_by: createdBy,
  };
}

/**
 * @param {unknown} consoleJson
 * @returns {object}
 */
function cloneConsoleJson(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? consoleJson : {};
  // Shallow-clone the levels we mutate; deeper structures are preserved by reference (Prisma writes JSON whole).
  const next = { ...cj };
  const meta = next.lux_request_meta && typeof next.lux_request_meta === 'object' && !Array.isArray(next.lux_request_meta)
    ? { ...next.lux_request_meta }
    : {};
  const list = Array.isArray(meta.attachments) ? meta.attachments.slice() : [];
  meta.attachments = list;
  next.lux_request_meta = meta;
  return next;
}

/**
 * Append (or upsert by attachment_id) an entry to `lux_request_meta.attachments[]`.
 * Returns the new console_json (immutable update).
 *
 * @param {unknown} consoleJson
 * @param {object} entry — output of `buildLuxAttachmentEntry`
 * @returns {object}
 */
export function upsertLuxAttachmentEntry(consoleJson, entry) {
  if (!entry || typeof entry !== 'object' || !entry.attachment_id) {
    throw new Error('upsertLuxAttachmentEntry: entry.attachment_id required');
  }
  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const id = String(entry.attachment_id);
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry };
  } else {
    list.push(entry);
  }
  return next;
}

/**
 * Apply an operator review decision to a single attachment entry.
 * Returns `{ ok, consoleJson?, entry?, error? }` so callers can detect "not found"
 * vs other failure modes without throwing inside request handlers.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ review_status: string, review_note?: string | null, reviewed_by?: string | null, reviewed_at?: string | null }} review
 * @returns {{ ok: true, consoleJson: object, entry: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentReview(consoleJson, attachmentId, review) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const status = normalizeAttachmentReviewStatus(review?.review_status);
  if (!status) return { ok: false, error: 'INVALID_REVIEW_STATUS' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const reviewedAt =
    review?.reviewed_at != null && String(review.reviewed_at).trim()
      ? String(review.reviewed_at).trim()
      : new Date().toISOString();
  const reviewedBy = review?.reviewed_by != null && String(review.reviewed_by).trim()
    ? String(review.reviewed_by).trim().slice(0, 200)
    : null;
  const reviewNote = normalizeReviewNote(review?.review_note);

  const updated = {
    ...list[idx],
    review_status: status,
    review_note: reviewNote,
    reviewed_at: reviewedAt,
    reviewed_by: reviewedBy,
  };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated };
}

/**
 * Phase 4C.2 — link a reviewed attachment to a Lux property ref.
 *
 * Enforces reviewed-only at the metadata layer; request handlers still must
 * validate ticket+attachment tenancy in Postgres.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{
 *   property_slug: string,
 *   property_title: string,
 *   intended_slot: string,
 *   linked_by?: string | null,
 *   linked_at?: string | null,
 *   link_note?: string | null,
 * }} args
 * @returns {{ ok: true, consoleJson: object, entry: object, link: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentPropertyLinkSet(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  if (!slug) return { ok: false, error: 'PROPERTY_SLUG_REQUIRED' };
  const title = args?.property_title != null ? String(args.property_title).trim().slice(0, 200) : '';
  if (!title) return { ok: false, error: 'PROPERTY_TITLE_REQUIRED' };
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot);
  if (!slot) return { ok: false, error: 'INVALID_INTENDED_SLOT' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  if (isLuxAttachmentLifecycleArchived(cur)) return { ok: false, error: 'LIFECYCLE_ARCHIVED' };
  const status = String(cur.review_status || '').trim().toLowerCase();
  if (status !== 'reviewed') return { ok: false, error: 'REVIEWED_ONLY' };

  const linkedAt =
    args?.linked_at != null && String(args.linked_at).trim() ? String(args.linked_at).trim() : new Date().toISOString();
  const linkedBy = args?.linked_by != null && String(args.linked_by).trim()
    ? String(args.linked_by).trim().slice(0, 200)
    : null;
  const note = normalizeLuxAttachmentLinkNote(args?.link_note);

  const existing = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const deduped = existing.filter(
    (pl) =>
      !(
        pl &&
        String(pl.property_slug || '').toLowerCase() === slug &&
        String(pl.intended_slot || '').toLowerCase() === slot
      ),
  );
  const link = {
    property_slug: slug,
    property_title: title,
    intended_slot: slot,
    linked_at: linkedAt,
    linked_by: linkedBy,
    link_note: note,
    publish_status: 'unpublished',
    published_at: null,
    published_by: null,
    unpublished_at: null,
    unpublished_by: null,
    public_caption: null,
    public_alt_text: null,
    gallery_order: null,
    is_gallery_cover: false,
    publish_history: [],
  };
  deduped.push(link);

  const updated = { ...cur, property_links: deduped };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated, link };
}

/**
 * Phase 4C.3 — publish a reviewed+linked attachment for a specific property+slot.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ property_slug: string, intended_slot: string, published_by?: string | null, published_at?: string | null, public_caption?: string | null, public_alt_text?: string | null, gallery_order?: unknown, is_gallery_cover?: unknown }} args
 * @returns {{ ok: true, consoleJson: object, entry: object, link: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentPropertyPublish(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  if (!slug) return { ok: false, error: 'PROPERTY_SLUG_REQUIRED' };
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot);
  if (!slot) return { ok: false, error: 'INVALID_INTENDED_SLOT' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };
  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  if (isLuxAttachmentLifecycleArchived(cur)) return { ok: false, error: 'LIFECYCLE_ARCHIVED' };
  const status = String(cur.review_status || '').trim().toLowerCase();
  if (status !== 'reviewed') return { ok: false, error: 'REVIEWED_ONLY' };

  const mt =
    cur.media_type != null && String(cur.media_type).trim()
      ? String(cur.media_type).trim().toLowerCase()
      : deriveMediaType(cur.content_type);
  if (mt !== 'image') return { ok: false, error: 'IMAGE_ONLY' };

  const links = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const li = links.findIndex(
    (pl) =>
      pl &&
      String(pl.property_slug || '').toLowerCase() === slug &&
      String(pl.intended_slot || '').toLowerCase() === slot,
  );
  if (li < 0) return { ok: false, error: 'PROPERTY_LINK_NOT_FOUND' };

  if (slot === 'gallery' && normalizeLuxGalleryCover(args?.is_gallery_cover)) {
    clearPublishedGalleryCoversForPropertyOnTicket(next, slug, id);
  }

  const nowIso =
    args?.published_at != null && String(args.published_at).trim()
      ? String(args.published_at).trim()
      : new Date().toISOString();
  const by =
    args?.published_by != null && String(args.published_by).trim()
      ? String(args.published_by).trim().slice(0, 200)
      : null;

  const cap = normalizeLuxPublicText(args?.public_caption);
  const alt = normalizeLuxPublicText(args?.public_alt_text);

  const curAfterClear = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  const linksAfterClear = Array.isArray(curAfterClear.property_links) ? curAfterClear.property_links.slice() : [];
  const liAfter = linksAfterClear.findIndex(
    (pl) =>
      pl &&
      String(pl.property_slug || '').toLowerCase() === slug &&
      String(pl.intended_slot || '').toLowerCase() === slot,
  );
  if (liAfter < 0) return { ok: false, error: 'PROPERTY_LINK_NOT_FOUND' };

  const galleryOrder = slot === 'gallery' ? normalizeLuxGalleryOrder(args?.gallery_order) : null;
  const galleryCover = slot === 'gallery' ? normalizeLuxGalleryCover(args?.is_gallery_cover) : false;

  const updatedLinkRaw = {
    ...linksAfterClear[liAfter],
    publish_status: 'published',
    published_at: nowIso,
    published_by: by,
    public_caption: cap,
    public_alt_text: alt,
    unpublished_at: null,
    unpublished_by: null,
    ...(slot === 'gallery'
      ? {
          gallery_order: galleryOrder,
          is_gallery_cover: galleryCover,
        }
      : {}),
  };
  const updatedLink = appendLuxLinkPublishHistoryEntry(updatedLinkRaw, {
    action: 'published',
    at: nowIso,
    actor: by,
    note: null,
  });
  linksAfterClear[liAfter] = updatedLink;
  const updated = { ...curAfterClear, property_links: linksAfterClear };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated, link: updatedLink };
}

/**
 * Phase 4C.3 — unpublish a property+slot association.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ property_slug: string, intended_slot: string, unpublished_by?: string | null, unpublished_at?: string | null }} args
 * @returns {{ ok: true, consoleJson: object, entry: object, link: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentPropertyUnpublish(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  if (!slug) return { ok: false, error: 'PROPERTY_SLUG_REQUIRED' };
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot);
  if (!slot) return { ok: false, error: 'INVALID_INTENDED_SLOT' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };
  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};

  const links = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const li = links.findIndex(
    (pl) =>
      pl &&
      String(pl.property_slug || '').toLowerCase() === slug &&
      String(pl.intended_slot || '').toLowerCase() === slot,
  );
  if (li < 0) return { ok: false, error: 'PROPERTY_LINK_NOT_FOUND' };

  const nowIso =
    args?.unpublished_at != null && String(args.unpublished_at).trim()
      ? String(args.unpublished_at).trim()
      : new Date().toISOString();
  const by =
    args?.unpublished_by != null && String(args.unpublished_by).trim()
      ? String(args.unpublished_by).trim().slice(0, 200)
      : null;

  const updatedLink = appendLuxLinkPublishHistoryEntry(
    {
      ...links[li],
      publish_status: 'unpublished',
      unpublished_at: nowIso,
      unpublished_by: by,
    },
    { action: 'unpublished', at: nowIso, actor: by, note: null },
  );
  links[li] = updatedLink;
  const updated = { ...cur, property_links: links };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated, link: updatedLink };
}

/**
 * Phase 4C.2 — unlink a property association.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ property_slug: string, intended_slot: string }} args
 * @returns {{ ok: true, consoleJson: object, entry: object, removed: boolean } | { ok: false, error: string }}
 */
export function applyLuxAttachmentPropertyLinkRemove(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  if (!slug) return { ok: false, error: 'PROPERTY_SLUG_REQUIRED' };
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot);
  if (!slot) return { ok: false, error: 'INVALID_INTENDED_SLOT' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  if (isLuxAttachmentLifecycleArchived(cur)) return { ok: false, error: 'LIFECYCLE_ARCHIVED' };
  const existing = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const after = existing.filter(
    (pl) =>
      !(
        pl &&
        String(pl.property_slug || '').toLowerCase() === slug &&
        String(pl.intended_slot || '').toLowerCase() === slot
      ),
  );
  const removed = after.length !== existing.length;
  const updated = { ...cur, property_links: after };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated, removed };
}

/**
 * Phase 4D.3 — archive attachment: lifecycle + unpublish all property_links (metadata preserved; no byte delete).
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ archived_at?: string | null, archived_by?: string | null, archive_reason?: string | null }} args
 * @returns {{ ok: true, consoleJson: object, entry: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentArchive(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  if (isLuxAttachmentLifecycleArchived(cur)) return { ok: false, error: 'ALREADY_ARCHIVED' };

  const nowIso =
    args?.archived_at != null && String(args.archived_at).trim()
      ? String(args.archived_at).trim()
      : new Date().toISOString();
  const by =
    args?.archived_by != null && String(args.archived_by).trim()
      ? String(args.archived_by).trim().slice(0, 200)
      : null;
  const reason = normalizeLuxArchiveReason(args?.archive_reason);

  const links = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const newLinks = links.map((pl) => {
    if (!pl || typeof pl !== 'object') return pl;
    let nl = { ...pl };
    if (String(pl.publish_status || '').toLowerCase() === 'published') {
      nl = {
        ...nl,
        publish_status: 'unpublished',
        unpublished_at: nowIso,
        unpublished_by: by,
      };
      nl = appendLuxLinkPublishHistoryEntry(nl, {
        action: 'unpublished',
        at: nowIso,
        actor: by,
        note: 'auto: attachment archived',
      });
    }
    nl = appendLuxLinkPublishHistoryEntry(nl, {
      action: 'archived',
      at: nowIso,
      actor: by,
      note: reason,
    });
    return nl;
  });

  const updated = {
    ...cur,
    lifecycle_status: 'archived',
    archived_at: nowIso,
    archived_by: by,
    archive_reason: reason,
    restored_at: null,
    restored_by: null,
    property_links: newLinks,
  };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated };
}

/**
 * Phase 4D.3 — restore to active; does not republish.
 *
 * @param {unknown} consoleJson
 * @param {string} attachmentId
 * @param {{ restored_at?: string | null, restored_by?: string | null }} args
 * @returns {{ ok: true, consoleJson: object, entry: object } | { ok: false, error: string }}
 */
export function applyLuxAttachmentRestore(consoleJson, attachmentId, args) {
  const id = attachmentId != null ? String(attachmentId).trim() : '';
  if (!id) return { ok: false, error: 'ATTACHMENT_ID_REQUIRED' };

  const next = cloneConsoleJson(consoleJson);
  const list = next.lux_request_meta.attachments;
  const idx = list.findIndex((x) => x && String(x.attachment_id || '') === id);
  if (idx < 0) return { ok: false, error: 'ATTACHMENT_NOT_TRACKED' };

  const cur = list[idx] && typeof list[idx] === 'object' ? list[idx] : {};
  if (!isLuxAttachmentLifecycleArchived(cur)) return { ok: false, error: 'NOT_ARCHIVED' };

  const nowIso =
    args?.restored_at != null && String(args.restored_at).trim()
      ? String(args.restored_at).trim()
      : new Date().toISOString();
  const by =
    args?.restored_by != null && String(args.restored_by).trim()
      ? String(args.restored_by).trim().slice(0, 200)
      : null;

  const links = Array.isArray(cur.property_links) ? cur.property_links.slice() : [];
  const newLinks = links.map((pl) => {
    if (!pl || typeof pl !== 'object') return pl;
    return appendLuxLinkPublishHistoryEntry({ ...pl }, {
      action: 'restored',
      at: nowIso,
      actor: by,
      note: null,
    });
  });

  const updated = {
    ...cur,
    lifecycle_status: 'active',
    restored_at: nowIso,
    restored_by: by,
    property_links: newLinks,
  };
  list[idx] = updated;
  return { ok: true, consoleJson: next, entry: updated };
}

/**
 * Append a concise operator-visible message to `console_json.messages[]` recording
 * a review-status change. Idempotency is best-effort: we de-duplicate on
 * (attachment_id, review_status, reviewed_at) to avoid double-writes.
 *
 * @param {unknown} consoleJson
 * @param {{ attachment_id: string, file_name?: string | null, review_status: string, review_note?: string | null, reviewed_by?: string | null, reviewed_at?: string | null }} args
 * @returns {object} new console_json
 */
export function appendLuxAttachmentReviewMessage(consoleJson, args) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const messages = Array.isArray(cj.messages) ? cj.messages.slice() : [];
  const at = args?.reviewed_at != null && String(args.reviewed_at).trim()
    ? String(args.reviewed_at).trim()
    : new Date().toISOString();
  const id = args?.attachment_id != null ? String(args.attachment_id).trim() : '';
  const status = normalizeAttachmentReviewStatus(args?.review_status) || 'pending_review';

  const dup = messages.some(
    (m) =>
      m &&
      m.kind === 'lux_attachment_review' &&
      String(m.attachment_id || '') === id &&
      String(m.review_status || '') === status &&
      String(m.at || '') === at,
  );
  if (dup) {
    cj.messages = messages;
    return cj;
  }

  messages.push({
    kind: 'lux_attachment_review',
    at,
    attachment_id: id,
    file_name: args?.file_name != null ? String(args.file_name).slice(0, FILE_NAME_MAX_LEN) : null,
    review_status: status,
    review_note: normalizeReviewNote(args?.review_note),
    reviewed_by: args?.reviewed_by != null ? String(args.reviewed_by).slice(0, 200) : null,
  });
  cj.messages = messages;
  return cj;
}

/**
 * Phase 4C.2 — record a property link/unlink event in console_json.messages[].
 *
 * @param {unknown} consoleJson
 * @param {{
 *   action: 'linked' | 'unlinked',
 *   at?: string | null,
 *   attachment_id: string,
 *   file_name?: string | null,
 *   property_slug: string,
 *   property_title?: string | null,
 *   intended_slot: string,
 *   link_note?: string | null,
 *   linked_by?: string | null,
 * }} args
 * @returns {object}
 */
export function appendLuxAttachmentPropertyLinkMessage(consoleJson, args) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const messages = Array.isArray(cj.messages) ? cj.messages.slice() : [];
  const at = args?.at != null && String(args.at).trim() ? String(args.at).trim() : new Date().toISOString();
  const id = args?.attachment_id != null ? String(args.attachment_id).trim() : '';
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot) || 'reference';
  const action = args?.action === 'unlinked' ? 'unlinked' : 'linked';

  const dup = messages.some(
    (m) =>
      m &&
      m.kind === 'lux_attachment_property_link' &&
      String(m.attachment_id || '') === id &&
      String(m.property_slug || '').toLowerCase() === slug &&
      String(m.intended_slot || '').toLowerCase() === slot &&
      String(m.action || '') === action &&
      String(m.at || '') === at,
  );
  if (dup) {
    cj.messages = messages;
    return cj;
  }

  messages.push({
    kind: 'lux_attachment_property_link',
    at,
    action,
    attachment_id: id,
    file_name: args?.file_name != null ? String(args.file_name).slice(0, FILE_NAME_MAX_LEN) : null,
    property_slug: slug,
    property_title: args?.property_title != null ? String(args.property_title).slice(0, 200) : null,
    intended_slot: slot,
    link_note: normalizeLuxAttachmentLinkNote(args?.link_note),
    linked_by: args?.linked_by != null ? String(args.linked_by).slice(0, 200) : null,
  });
  cj.messages = messages;
  return cj;
}

/**
 * Phase 4C.3 — record property-slot publish/unpublish in `console_json.messages[]`.
 *
 * @param {unknown} consoleJson
 * @param {{
 *   action: 'published' | 'unpublished',
 *   at?: string | null,
 *   attachment_id: string,
 *   file_name?: string | null,
 *   property_slug: string,
 *   intended_slot: string,
 *   actor?: string | null,
 * }} args
 * @returns {object}
 */
export function appendLuxAttachmentPropertyPublishMessage(consoleJson, args) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const messages = Array.isArray(cj.messages) ? cj.messages.slice() : [];
  const at = args?.at != null && String(args.at).trim() ? String(args.at).trim() : new Date().toISOString();
  const id = args?.attachment_id != null ? String(args.attachment_id).trim() : '';
  const slug = args?.property_slug != null ? String(args.property_slug).trim().toLowerCase().slice(0, 120) : '';
  const slot = normalizeLuxAttachmentPropertySlot(args?.intended_slot) || 'reference';
  const action = args?.action === 'unpublished' ? 'unpublished' : 'published';

  const dup = messages.some(
    (m) =>
      m &&
      m.kind === 'lux_attachment_property_publish' &&
      String(m.attachment_id || '') === id &&
      String(m.property_slug || '').toLowerCase() === slug &&
      String(m.intended_slot || '').toLowerCase() === slot &&
      String(m.action || '') === action &&
      String(m.at || '') === at,
  );
  if (dup) {
    cj.messages = messages;
    return cj;
  }

  messages.push({
    kind: 'lux_attachment_property_publish',
    at,
    action,
    message: action === 'published' ? 'media published' : 'media unpublished',
    attachment_id: id,
    file_name: args?.file_name != null ? String(args.file_name).slice(0, FILE_NAME_MAX_LEN) : null,
    property_slug: slug,
    intended_slot: slot,
    actor: args?.actor != null ? String(args.actor).slice(0, 200) : null,
  });
  cj.messages = messages;
  return cj;
}

/**
 * Phase 4D.3 — ticket-local lifecycle note for operators.
 *
 * @param {unknown} consoleJson
 * @param {{
 *   action: 'archived' | 'restored',
 *   at?: string | null,
 *   attachment_id: string,
 *   file_name?: string | null,
 *   actor?: string | null,
 *   archive_reason?: string | null,
 * }} args
 * @returns {object}
 */
export function appendLuxAttachmentLifecycleMessage(consoleJson, args) {
  const cj = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const messages = Array.isArray(cj.messages) ? cj.messages.slice() : [];
  const at = args?.at != null && String(args.at).trim() ? String(args.at).trim() : new Date().toISOString();
  const id = args?.attachment_id != null ? String(args.attachment_id).trim() : '';
  const action = args?.action === 'restored' ? 'restored' : 'archived';

  const dup = messages.some(
    (m) =>
      m &&
      m.kind === 'lux_attachment_lifecycle' &&
      String(m.attachment_id || '') === id &&
      String(m.action || '') === action &&
      String(m.at || '') === at,
  );
  if (dup) {
    cj.messages = messages;
    return cj;
  }

  messages.push({
    kind: 'lux_attachment_lifecycle',
    at,
    action,
    attachment_id: id,
    file_name: args?.file_name != null ? String(args.file_name).slice(0, FILE_NAME_MAX_LEN) : null,
    actor: args?.actor != null ? String(args.actor).slice(0, 200) : null,
    archive_reason: normalizeLuxArchiveReason(args?.archive_reason),
  });
  cj.messages = messages;
  return cj;
}

/**
 * Operator-safe attachment shape (no raw bytes, no internal storage paths).
 * Combines the `cmp_ticket_attachments` row with the `lux_request_meta.attachments[]`
 * metadata entry, falling back to safe defaults when meta is missing (e.g. legacy uploads).
 *
 * @param {{ id: string, file_name?: string | null, content_type?: string | null, byte_size?: number | null, created_at?: string | Date | null }} dbRow
 * @param {object | null} metaEntry
 * @returns {object}
 */
export function safeLuxAttachmentShape(dbRow, metaEntry) {
  const r = dbRow && typeof dbRow === 'object' ? dbRow : {};
  const m = metaEntry && typeof metaEntry === 'object' ? metaEntry : null;
  const id = r.id != null ? String(r.id) : (m && m.attachment_id != null ? String(m.attachment_id) : '');
  const fileName =
    (m && m.file_name != null && String(m.file_name)) ||
    (r.file_name != null ? String(r.file_name) : 'upload.bin');
  const contentType =
    (m && m.content_type != null && String(m.content_type)) ||
    (r.content_type != null ? String(r.content_type) : 'application/octet-stream');
  const byteSize = Number.isFinite(Number(r.byte_size))
    ? Math.max(0, Math.trunc(Number(r.byte_size)))
    : Number.isFinite(Number(m?.byte_size))
      ? Math.max(0, Math.trunc(Number(m.byte_size)))
      : 0;
  const createdAtRaw = r.created_at != null ? r.created_at : (m && m.created_at) || null;
  const createdAt =
    createdAtRaw instanceof Date ? createdAtRaw.toISOString() : createdAtRaw != null ? String(createdAtRaw) : null;

  const lifecycle = normalizeLuxLifecycleStatus(m?.lifecycle_status);

  return {
    attachment_id: id,
    file_name: fileName,
    content_type: contentType,
    byte_size: byteSize,
    media_type: m && m.media_type ? String(m.media_type) : deriveMediaType(contentType),
    intended_use: m && m.intended_use != null ? String(m.intended_use) : null,
    notes: m && m.notes != null ? String(m.notes) : null,
    review_status: m && m.review_status != null ? String(m.review_status) : LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
    review_note: m && m.review_note != null ? String(m.review_note) : null,
    reviewed_at: m && m.reviewed_at != null ? String(m.reviewed_at) : null,
    reviewed_by: m && m.reviewed_by != null ? String(m.reviewed_by) : null,
    lifecycle_status: lifecycle,
    archived_at: m && m.archived_at != null ? String(m.archived_at) : null,
    archived_by: m && m.archived_by != null ? String(m.archived_by).slice(0, 200) : null,
    archive_reason: m && m.archive_reason != null ? String(m.archive_reason).slice(0, LUX_ARCHIVE_REASON_MAX) : null,
    restored_at: m && m.restored_at != null ? String(m.restored_at) : null,
    restored_by: m && m.restored_by != null ? String(m.restored_by).slice(0, 200) : null,
    property_links: Array.isArray(m?.property_links)
      ? m.property_links
          .filter((pl) => pl && pl.property_slug && pl.intended_slot)
          .map((pl) => ({
            property_slug: String(pl.property_slug).slice(0, 120),
            property_title: pl.property_title != null ? String(pl.property_title).slice(0, 200) : null,
            intended_slot: normalizeLuxAttachmentPropertySlot(pl.intended_slot) || 'reference',
            linked_at: pl.linked_at != null ? String(pl.linked_at) : null,
            linked_by: pl.linked_by != null ? String(pl.linked_by).slice(0, 200) : null,
            link_note: pl.link_note != null ? String(pl.link_note).slice(0, LINK_NOTE_MAX_LEN) : null,
            publish_status: normalizeLuxAttachmentPublishStatus(pl.publish_status) || 'unpublished',
            published_at: pl.published_at != null ? String(pl.published_at) : null,
            published_by: pl.published_by != null ? String(pl.published_by).slice(0, 200) : null,
            unpublished_at: pl.unpublished_at != null ? String(pl.unpublished_at) : null,
            unpublished_by: pl.unpublished_by != null ? String(pl.unpublished_by).slice(0, 200) : null,
            public_caption: pl.public_caption != null ? String(pl.public_caption).slice(0, PUBLIC_TEXT_MAX_LEN) : null,
            public_alt_text: pl.public_alt_text != null ? String(pl.public_alt_text).slice(0, PUBLIC_TEXT_MAX_LEN) : null,
            gallery_order: normalizeLuxGalleryOrder(pl.gallery_order),
            is_gallery_cover: pl.is_gallery_cover === true,
            publish_history: Array.isArray(pl.publish_history)
              ? pl.publish_history
                  .filter((h) => h && typeof h === 'object')
                  .map((h) => {
                    const act = String(h.action || '').toLowerCase();
                    const okAct =
                      act === 'published' || act === 'unpublished' || act === 'archived' || act === 'restored' ? act : null;
                    return {
                      at: h.at != null ? String(h.at).slice(0, 80) : '',
                      action: okAct,
                      actor: h.actor != null ? String(h.actor).slice(0, 200) : null,
                      note: h.note != null ? String(h.note).slice(0, LINK_NOTE_MAX_LEN) : null,
                    };
                  })
                  .filter((h) => h.action)
                  .slice(-LUX_LINK_PUBLISH_HISTORY_MAX)
              : [],
          }))
      : [],
    created_at: createdAt,
    download_url: id ? `/api/change-attachment/download?id=${encodeURIComponent(id)}` : null,
  };
}

/** Phase 4D.4 — operator filter ids for `/change` (client-side only). */
export const LUX_ATTACHMENT_OPERATOR_FILTER_IDS = Object.freeze([
  'all',
  'pending_review',
  'reviewed',
  'rejected',
  'archived',
  'linked',
  'published',
  'needs_action',
]);

const LUX_TEST_MEDIA_MARKERS = Object.freeze([
  'smoke',
  'phase4c1',
  'phase4d1',
  'phase4d2',
  'phase4d3',
  'phase4d4',
  'fixture',
  'test-media',
  '-test',
  '_test',
  'test.',
]);

/**
 * Best-effort hint for operator QA fixtures (never auto-deletes).
 *
 * @param {unknown} entry — attachment row (`file_name`, optional `notes`)
 * @param {{ title?: string | null, description?: string | null }} [ticketCtx]
 * @returns {boolean}
 */
export function detectLuxOperatorTestMediaHint(entry, ticketCtx) {
  const fn = entry?.file_name != null ? String(entry.file_name).toLowerCase() : '';
  const notes = entry?.notes != null ? String(entry.notes).toLowerCase() : '';
  const hay = [fn, notes];
  const ctx = ticketCtx && typeof ticketCtx === 'object' ? ticketCtx : {};
  if (ctx.title != null) hay.push(String(ctx.title).toLowerCase());
  if (ctx.description != null) hay.push(String(ctx.description).toLowerCase());
  for (const s of hay) {
    if (!s) continue;
    for (const m of LUX_TEST_MEDIA_MARKERS) {
      if (s.includes(m)) return true;
    }
  }
  return false;
}

/**
 * Published link on an **active** (non-archived) attachment only.
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
export function luxAttachmentHasAnyPublishedLink(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isLuxAttachmentLifecycleArchived(entry)) return false;
  const pls = Array.isArray(entry.property_links) ? entry.property_links : [];
  return pls.some((pl) => pl && String(pl.publish_status || '').toLowerCase() === 'published');
}

/**
 * @param {unknown} entry
 * @returns {boolean}
 */
export function luxAttachmentHasAnyPropertyLink(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const pls = Array.isArray(entry.property_links) ? entry.property_links : [];
  return pls.length > 0;
}

/**
 * Reviewed image with a **published** hero/gallery/card link and empty public alt (accessibility gap).
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
export function luxAttachmentPublishedImageMissingAlt(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (isLuxAttachmentLifecycleArchived(entry)) return false;
  if (String(entry.review_status || '').toLowerCase() !== 'reviewed') return false;
  const mt =
    entry.media_type != null && String(entry.media_type).trim()
      ? String(entry.media_type).trim().toLowerCase()
      : deriveMediaType(entry.content_type);
  if (mt !== 'image') return false;
  const pubSlots = new Set(['hero', 'gallery', 'card']);
  const pls = Array.isArray(entry.property_links) ? entry.property_links : [];
  for (const pl of pls) {
    if (!pl || String(pl.publish_status || '').toLowerCase() !== 'published') continue;
    const slot = normalizeLuxAttachmentPropertySlot(pl.intended_slot);
    if (!slot || !pubSlots.has(slot)) continue;
    const alt = pl.public_alt_text != null ? String(pl.public_alt_text).trim() : '';
    if (!alt) return true;
  }
  return false;
}

/**
 * Archived attachment that still carries a **published** marker in link history (audit follow-up).
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
export function luxAttachmentArchivedWithPublishedHistory(entry) {
  if (!isLuxAttachmentLifecycleArchived(entry)) return false;
  const pls = Array.isArray(entry?.property_links) ? entry.property_links : [];
  return pls.some(
    (pl) =>
      Array.isArray(pl?.publish_history) &&
      pl.publish_history.some((h) => h && String(h.action || '').toLowerCase() === 'published'),
  );
}

/**
 * Operator “needs attention” heuristic for `/change` filters (does not change server rules).
 *
 * @param {unknown} entry
 * @returns {boolean}
 */
export function luxAttachmentEntryNeedsAction(entry) {
  if (!entry || typeof entry !== 'object') return false;
  const rs = String(entry.review_status || '').toLowerCase();
  if (rs === 'pending_review') return true;
  if (rs === 'rejected') return false;
  if (isLuxAttachmentLifecycleArchived(entry)) {
    return luxAttachmentArchivedWithPublishedHistory(entry);
  }
  if (rs === 'reviewed') {
    if (!luxAttachmentHasAnyPropertyLink(entry)) return true;
    if (!luxAttachmentHasAnyPublishedLink(entry)) return true;
    if (luxAttachmentPublishedImageMissingAlt(entry)) return true;
  }
  return false;
}

/**
 * Whether this link would be served as **public** bytes today (same gate as property-media).
 *
 * @param {unknown} entry
 * @param {unknown} link
 * @returns {boolean}
 */
export function luxLinkIsCurrentlyPublicOnLuxSite(entry, link) {
  if (!entry || !link || typeof link !== 'object') return false;
  if (isLuxAttachmentLifecycleArchived(entry)) return false;
  if (String(entry.review_status || '').toLowerCase() !== 'reviewed') return false;
  const mt =
    entry.media_type != null && String(entry.media_type).trim()
      ? String(entry.media_type).trim().toLowerCase()
      : deriveMediaType(entry.content_type);
  if (mt !== 'image') return false;
  if (String(link.publish_status || '').toLowerCase() !== 'published') return false;
  const slot = normalizeLuxAttachmentPropertySlot(link.intended_slot);
  return slot === 'hero' || slot === 'gallery' || slot === 'card';
}

/**
 * Human-readable public / linkage surface for operator UI.
 *
 * @param {unknown} slotRaw
 * @returns {string}
 */
export function luxPublicOperatorLabelForSlot(slotRaw) {
  const slot = normalizeLuxAttachmentPropertySlot(slotRaw);
  if (slot === 'hero') return 'Public on property page (hero)';
  if (slot === 'gallery') return 'Public in gallery (property page)';
  if (slot === 'card') return 'Public on homepage card';
  if (slot === 'detail' || slot === 'reference') return 'Linked (private slot)';
  return 'Linked';
}

/**
 * One row per `property_links[]` entry for “where used” tables.
 *
 * @param {unknown} entry
 * @returns {{ property_slug: string, property_title: string | null, intended_slot: string, publish_label: string, lifecycle_label: string, currently_public: boolean, public_labels: string[], linkage_label: string }[]}
 */
export function buildLuxAttachmentWhereUsedRows(entry) {
  if (!entry || typeof entry !== 'object') return [];
  const life = normalizeLuxLifecycleStatus(entry.lifecycle_status);
  const lifecycleLabel = life === 'archived' ? 'Archived' : 'Active';
  const pls = Array.isArray(entry.property_links) ? entry.property_links : [];
  return pls.map((pl) => {
    if (!pl || typeof pl !== 'object') return null;
    const slug = pl.property_slug != null ? String(pl.property_slug).slice(0, 120) : '';
    const title = pl.property_title != null ? String(pl.property_title).slice(0, 200) : null;
    const slot = normalizeLuxAttachmentPropertySlot(pl.intended_slot) || 'reference';
    const pub = String(pl.publish_status || '').toLowerCase() === 'published';
    const publishLabel = pub ? 'Published' : 'Unpublished';
    const current = luxLinkIsCurrentlyPublicOnLuxSite(entry, pl);
    const publicLabels = [];
    if (current) {
      const lbl = luxPublicOperatorLabelForSlot(slot);
      if (lbl) publicLabels.push(lbl);
    } else if (pub && isLuxAttachmentLifecycleArchived(entry)) {
      publicLabels.push('Not public (archived)');
    } else {
      publicLabels.push('Private');
    }
    return {
      property_slug: slug,
      property_title: title,
      intended_slot: slot,
      publish_label: publishLabel,
      lifecycle_label: lifecycleLabel,
      currently_public: current,
      public_labels: publicLabels,
      linkage_label: `${slug} · ${slot}`,
    };
  }).filter(Boolean);
}

/**
 * @param {unknown} entry
 * @param {string} filterId
 * @returns {boolean}
 */
export function luxAttachmentMatchesOperatorFilter(entry, filterId) {
  const f = filterId != null ? String(filterId).trim().toLowerCase() : 'all';
  if (f === 'all') return true;
  if (!entry || typeof entry !== 'object') return false;
  const rs = String(entry.review_status || '').toLowerCase();
  const archived = isLuxAttachmentLifecycleArchived(entry);
  if (f === 'pending_review') return rs === 'pending_review';
  if (f === 'reviewed') return rs === 'reviewed';
  if (f === 'rejected') return rs === 'rejected';
  if (f === 'archived') return archived;
  if (f === 'linked') return luxAttachmentHasAnyPropertyLink(entry);
  if (f === 'published') return luxAttachmentHasAnyPublishedLink(entry);
  if (f === 'needs_action') return luxAttachmentEntryNeedsAction(entry);
  return true;
}

/**
 * @param {unknown[]} attachments — API / `safeLuxAttachmentShape` rows
 * @returns {{
 *   total: number,
 *   pending_review: number,
 *   reviewed: number,
 *   rejected: number,
 *   archived: number,
 *   linked: number,
 *   published: number,
 *   needs_action: number,
 * }}
 */
export function computeLuxAttachmentMediaSummary(attachments) {
  const list = Array.isArray(attachments) ? attachments : [];
  let total = 0;
  let pending_review = 0;
  let reviewed = 0;
  let rejected = 0;
  let archived = 0;
  let linked = 0;
  let published = 0;
  let needs_action = 0;
  for (const a of list) {
    if (!a || typeof a !== 'object') continue;
    total++;
    const rs = String(a.review_status || '').toLowerCase();
    if (rs === 'pending_review') pending_review++;
    else if (rs === 'reviewed') reviewed++;
    else if (rs === 'rejected') rejected++;
    if (isLuxAttachmentLifecycleArchived(a)) archived++;
    if (luxAttachmentHasAnyPropertyLink(a)) linked++;
    if (luxAttachmentHasAnyPublishedLink(a)) published++;
    if (luxAttachmentEntryNeedsAction(a)) needs_action++;
  }
  return {
    total,
    pending_review,
    reviewed,
    rejected,
    archived,
    linked,
    published,
    needs_action,
  };
}

/**
 * @param {unknown} consoleJson
 * @returns {object[]}
 */
export function readLuxAttachmentEntries(consoleJson) {
  const cj = consoleJson && typeof consoleJson === 'object' ? consoleJson : {};
  const meta = cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : {};
  const list = Array.isArray(meta.attachments) ? meta.attachments : [];
  return list.filter((x) => x && typeof x === 'object' && x.attachment_id);
}

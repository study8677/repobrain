/**
 * LuxeMaurice Phase 5C — public media **byte storage** readiness (CDN / object-store boundary).
 *
 * **Reused:** governance and URL contract stay in {@link handleLuxPropertyMedia}; collectors unchanged
 * (`collectPublishedLuxPropertyMedia`); {@link buildLuxPublicPropertyMediaSrc} remains canonical for `src`.
 *
 * **This module:** pluggable adapter for **reading** published image bytes after all route gates pass.
 * Initial adapter **`postgres_attachment_bytes`** reads `cmp_ticket_attachments.data` only — no schema
 * migration, no external I/O, no storage path exposure.
 *
 * **Future (not 5C):** optional env-selected adapter (e.g. S3/R2 + signed fetch) must still be invoked
 * only from `handleLuxPropertyMedia` after the same publish/review/slot checks; transforms remain behind
 * {@link buildLuxPublicMediaTransformPlan}.
 *
 * @module lux-media-storage
 */

/** @typedef {{ variant: string, width: number | null, shouldTransform: boolean, source: string }} LuxPublicMediaTransformPlan */

/** @typedef {{ property_slug: string, attachment_id: string, slot: string, variant: string, width: number | null, prisma?: import('@prisma/client').PrismaClient }} LuxMediaStorageRequestContext */

/**
 * Successful byte read from a storage adapter.
 *
 * @typedef {object} LuxMediaStorageReadOk
 * @property {true} ok
 * @property {Buffer} bytes
 * @property {string} content_type
 * @property {number} byte_size
 * @property {'postgres'} storage_backend
 * @property {false} transformed
 */

/**
 * @typedef {{ ok: false, error: 'MISSING_BYTES' | 'TRANSFORM_NOT_IMPLEMENTED' }} LuxMediaStorageReadErr */
/** @typedef {LuxMediaStorageReadOk | LuxMediaStorageReadErr} LuxMediaStorageReadResult */

export const LUX_MEDIA_STORAGE_BACKEND_POSTGRES = 'postgres';

/**
 * Postgres-backed adapter: original bytes from `cmp_ticket_attachments` (already loaded by the route).
 *
 * @type {{ id: string, readPublishedLuxMediaBytes: (args: { attachment: Record<string, unknown>, transformPlan: LuxPublicMediaTransformPlan, requestContext: LuxMediaStorageRequestContext }) => Promise<LuxMediaStorageReadResult> }}
 */
const postgresAttachmentBytesAdapter = {
  id: 'postgres_attachment_bytes',

  /**
   * @param {{ attachment: Record<string, unknown>, transformPlan: LuxPublicMediaTransformPlan, requestContext: LuxMediaStorageRequestContext }} args
   * @returns {Promise<LuxMediaStorageReadResult>}
   */
  async readPublishedLuxMediaBytes(args) {
    const a = args && typeof args === 'object' ? args : {};
    const attachment = a.attachment && typeof a.attachment === 'object' ? a.attachment : {};
    const transformPlan =
      a.transformPlan && typeof a.transformPlan === 'object' ? a.transformPlan : { shouldTransform: false };

    if (transformPlan.shouldTransform === true) {
      return { ok: false, error: 'TRANSFORM_NOT_IMPLEMENTED' };
    }

    const raw = attachment.data;
    if (raw == null) {
      return { ok: false, error: 'MISSING_BYTES' };
    }

    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
    const content_type = String(attachment.contentType != null ? attachment.contentType : '').trim();

    return {
      ok: true,
      bytes: buf,
      content_type,
      byte_size: buf.length,
      storage_backend: LUX_MEDIA_STORAGE_BACKEND_POSTGRES,
      transformed: false,
    };
  },
};

/**
 * Active storage adapter for public Lux media reads.
 * Phase 5C: always Postgres row bytes; selection hook for future backends.
 *
 * @returns {typeof postgresAttachmentBytesAdapter}
 */
export function getLuxMediaStorageAdapter() {
  return postgresAttachmentBytesAdapter;
}

/**
 * Read published media bytes after route governance passes.
 *
 * @param {{ attachment: Record<string, unknown>, transformPlan: LuxPublicMediaTransformPlan, requestContext: LuxMediaStorageRequestContext }} input
 * @returns {Promise<LuxMediaStorageReadResult>}
 */
export async function readPublishedLuxMediaBytes(input) {
  const adapter = getLuxMediaStorageAdapter();
  return adapter.readPublishedLuxMediaBytes(input);
}

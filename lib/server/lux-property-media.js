import { resolveLuxPropertyRef } from '../client/luxe-maurice-property-resolve.js';
import {
  buildLuxPublicMediaTransformPlan,
  normalizeLuxAttachmentPropertySlot,
  normalizeLuxLifecycleStatus,
  normalizeLuxPublicImageContentTypeMime,
  resolveLuxPublicMediaVariantRequest,
} from '../cmp/_lib/lux-request-attachments.js';
import { readPublishedLuxMediaBytes } from './lux-media-storage.js';

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return '';
  const v = query[key];
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
}

function str(v) {
  return v != null ? String(v).trim() : '';
}

function getTenantIdFromHostContext(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return '';
    return ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
  } catch {
    return '';
  }
}

/** Avoid CDN/browser serving stale 200s as “still public” after unpublish or rule changes. */
function sendDeny(res, statusCode) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.statusCode = statusCode;
  res.end();
}

/** Phase 5A — conservative public cache; `must-revalidate` avoids masking unpublish (no stale-while-revalidate). */
const LUX_PUBLISHED_IMAGE_CACHE_CONTROL = 'public, max-age=300, must-revalidate';

/**
 * Public image serving for Lux properties (Phase 4C.3 + 5A variant scaffold + 5C storage adapter).
 *
 * Route: GET /api/lux/property-media?property=<slug>&attachment=<id>&slot=<hero|gallery|card|...>&variant=<original|card|hero|gallery>&width=<480|768|1024|1440|1920>
 *
 * `variant` is optional for backward compatibility; when present it must be allowlisted (cache key / future CDN).
 * All variants currently return the same original bytes.
 *
 * Strict rules:
 * - only lux tenant host context
 * - only when ticket is luxe-maurice and attachment is reviewed + published for (property,slot)
 * - images only (no video in this slice)
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function handleLuxPropertyMedia(req, res, prisma) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendDeny(res, 405);
    return;
  }

  const hostTid = getTenantIdFromHostContext(req);
  if (hostTid !== 'luxe-maurice') {
    sendDeny(res, 404);
    return;
  }

  const property = str(firstQuery(req.query, 'property')).toLowerCase();
  const attachmentId = str(firstQuery(req.query, 'attachment'));
  const slotRaw = str(firstQuery(req.query, 'slot'));
  const slot = normalizeLuxAttachmentPropertySlot(slotRaw);
  if (!property || !attachmentId || !slot) {
    sendDeny(res, 400);
    return;
  }

  const variantRaw = str(firstQuery(req.query, 'variant'));
  const widthRaw = str(firstQuery(req.query, 'width'));
  const parsed = resolveLuxPublicMediaVariantRequest({
    variantRaw,
    widthRaw,
    normalizedSlot: slot,
  });
  if (!parsed.ok) {
    sendDeny(res, 400);
    return;
  }

  const resolved = resolveLuxPropertyRef(property);
  if (!resolved) {
    sendDeny(res, 404);
    return;
  }

  try {
    const att = await prisma.cmpTicketAttachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, ticketId: true, tenantId: true, contentType: true, fileName: true, data: true },
    });
    if (!att || String(att.tenantId || '').trim() !== 'luxe-maurice') {
      sendDeny(res, 404);
      return;
    }
    const ct = String(att.contentType || '').toLowerCase();
    if (!ct.startsWith('image/')) {
      sendDeny(res, 404);
      return;
    }

    const ticket = await prisma.cmpTicket.findUnique({
      where: { id: att.ticketId },
      select: { tenantId: true, consoleJson: true },
    });
    if (!ticket || String(ticket.tenantId || '').trim() !== 'luxe-maurice') {
      sendDeny(res, 404);
      return;
    }
    const cj = ticket.consoleJson && typeof ticket.consoleJson === 'object' ? ticket.consoleJson : {};
    const meta = cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : null;
    const attachments = meta && Array.isArray(meta.attachments) ? meta.attachments : [];
    const entry = attachments.find((a) => a && String(a.attachment_id || '') === attachmentId) || null;
    if (!entry) {
      sendDeny(res, 404);
      return;
    }
    if (String(entry.review_status || '').toLowerCase() !== 'reviewed') {
      sendDeny(res, 404);
      return;
    }
    if (normalizeLuxLifecycleStatus(entry.lifecycle_status) === 'archived') {
      sendDeny(res, 404);
      return;
    }
    const links = Array.isArray(entry.property_links) ? entry.property_links : [];
    const okLink = links.some(
      (pl) =>
        pl &&
        String(pl.property_slug || '').toLowerCase() === String(resolved.ref).toLowerCase() &&
        normalizeLuxAttachmentPropertySlot(pl.intended_slot) === slot &&
        String(pl.publish_status || '').toLowerCase() === 'published',
    );
    if (!okLink) {
      sendDeny(res, 404);
      return;
    }

    const luxTransformPlan = buildLuxPublicMediaTransformPlan({ variant: parsed.variant, width: parsed.width });
    const requestContext = {
      property_slug: String(resolved.ref).toLowerCase(),
      attachment_id: attachmentId,
      slot,
      variant: parsed.variant,
      width: parsed.width,
      prisma,
    };
    const readResult = await readPublishedLuxMediaBytes({
      attachment: att,
      transformPlan: luxTransformPlan,
      requestContext,
    });
    if (!readResult.ok) {
      if (readResult.error === 'TRANSFORM_NOT_IMPLEMENTED') {
        sendDeny(res, 501);
        return;
      }
      sendDeny(res, 404);
      return;
    }

    const buf = readResult.bytes;
    const safeName = String(att.fileName || 'image').replace(/[\r\n"]/g, '_');
    const mime = normalizeLuxPublicImageContentTypeMime(readResult.content_type || att.contentType) || 'image/jpeg';
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', String(buf.length));
    res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Lux-Media-Source', luxTransformPlan.source);
    res.setHeader('X-Lux-Media-Backend', readResult.storage_backend);
    res.setHeader('X-Lux-Media-Variant', parsed.variant);
    res.setHeader('X-Lux-Media-Transform', readResult.transformed ? 'derivative' : 'original');
    res.setHeader('Cache-Control', LUX_PUBLISHED_IMAGE_CACHE_CONTROL);
    res.statusCode = 200;
    res.end(buf);
  } catch {
    sendDeny(res, 500);
  }
}

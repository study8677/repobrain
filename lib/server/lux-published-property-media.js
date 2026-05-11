import { resolveLuxPropertyRef } from '../client/luxe-maurice-property-resolve.js';
import {
  normalizeLuxAttachmentPropertySlot,
  normalizeLuxGalleryOrder,
} from '../cmp/_lib/lux-request-attachments.js';

const DEFAULT_TICKET_TAKE = 80;

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

function sendJson(res, statusCode, body) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = statusCode;
  res.end(JSON.stringify(body));
}

/**
 * GET /api/lux/property-media-list?property=<slug>
 * Lux host only. Returns only published hero + gallery image entries (safe fields).
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function handleLuxPropertyMediaList(req, res, prisma) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    return;
  }
  const hostTid = getTenantIdFromHostContext(req);
  if (hostTid !== 'luxe-maurice') {
    sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    return;
  }
  const propertyRaw = str(firstQuery(req.query, 'property')).toLowerCase();
  if (!propertyRaw) {
    sendJson(res, 400, { ok: false, error: 'PROPERTY_REQUIRED' });
    return;
  }
  if (!resolveLuxPropertyRef(propertyRaw)) {
    sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    return;
  }
  try {
    const payload = await buildLuxPropertyMediaListPayload(prisma, propertyRaw);
    if (!payload.ok) {
      sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
      return;
    }
    sendJson(res, 200, payload);
  } catch {
    sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' });
  }
}

/**
 * Scan recent Lux request tickets for published hero + gallery image refs (Phase 4D.1).
 * Excludes reference/card/detail from public gallery composition; caller renders hero + gallery only.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} propertySlugOrRef
 * @param {{ take?: number }} [options]
 * @returns {Promise<{
 *   ref: string,
 *   published_hero: { src: string, alt: string, caption: string | null } | null,
 *   published_gallery: { src: string, alt: string, caption: string | null, gallery_order: number | null, is_gallery_cover: boolean }[],
 * }>}
 */
export async function collectPublishedLuxPropertyMedia(prisma, propertySlugOrRef, options = {}) {
  const take = Number.isFinite(Number(options.take)) ? Math.min(200, Math.max(1, Math.trunc(Number(options.take)))) : DEFAULT_TICKET_TAKE;
  const resolved = resolveLuxPropertyRef(propertySlugOrRef);
  const ref = resolved ? String(resolved.ref).toLowerCase() : '';
  const empty = { ref: resolved?.ref || '', published_hero: null, published_gallery: [] };
  if (!resolved || !ref) return empty;

  const recent = await prisma.cmpTicket.findMany({
    where: { tenantId: 'luxe-maurice' },
    orderBy: { createdAt: 'desc' },
    take,
    select: { consoleJson: true },
  });

  /** @type {{ attachment_id: string, public_caption: string | null, public_alt_text: string | null }[]} */
  const heroCandidates = [];
  /** @type {{ attachment_id: string, public_caption: string | null, public_alt_text: string | null, gallery_order: number | null, is_gallery_cover: boolean, published_at: string | null }[]} */
  const galleryCandidates = [];

  for (const row of recent) {
    const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
    const meta = cj.lux_request_meta && typeof cj.lux_request_meta === 'object' ? cj.lux_request_meta : null;
    const list = meta && Array.isArray(meta.attachments) ? meta.attachments : [];
    for (const a of list) {
      if (!a || String(a.review_status || '').toLowerCase() !== 'reviewed') continue;
      const aid = String(a.attachment_id || '').trim();
      if (!aid) continue;
      const links = Array.isArray(a.property_links) ? a.property_links : [];
      for (const pl of links) {
        if (!pl || String(pl.property_slug || '').toLowerCase() !== ref) continue;
        const slot = normalizeLuxAttachmentPropertySlot(pl.intended_slot);
        if (!slot || String(pl.publish_status || '').toLowerCase() !== 'published') continue;
        if (slot === 'hero') {
          heroCandidates.push({
            attachment_id: aid,
            public_caption: pl.public_caption != null ? String(pl.public_caption).slice(0, 180) : null,
            public_alt_text: pl.public_alt_text != null ? String(pl.public_alt_text).slice(0, 180) : null,
          });
        } else if (slot === 'gallery') {
          galleryCandidates.push({
            attachment_id: aid,
            public_caption: pl.public_caption != null ? String(pl.public_caption).slice(0, 180) : null,
            public_alt_text: pl.public_alt_text != null ? String(pl.public_alt_text).slice(0, 180) : null,
            gallery_order: normalizeLuxGalleryOrder(pl.gallery_order),
            is_gallery_cover: pl.is_gallery_cover === true,
            published_at: pl.published_at != null ? String(pl.published_at) : null,
          });
        }
      }
    }
  }

  const firstHero = heroCandidates[0] || null;
  let publishedHero = null;
  if (firstHero) {
    const att = await prisma.cmpTicketAttachment.findUnique({
      where: { id: firstHero.attachment_id },
      select: { id: true, tenantId: true, contentType: true },
    });
    if (att && String(att.tenantId || '').trim() === 'luxe-maurice' && String(att.contentType || '').toLowerCase().startsWith('image/')) {
      publishedHero = {
        src: `/api/lux/property-media?property=${encodeURIComponent(resolved.ref)}&attachment=${encodeURIComponent(att.id)}&slot=hero`,
        alt: firstHero.public_alt_text || '',
        caption: firstHero.public_caption || null,
      };
    }
  }

  const seenGallery = new Set();
  const dedupedGallery = [];
  for (const g of galleryCandidates) {
    if (seenGallery.has(g.attachment_id)) continue;
    seenGallery.add(g.attachment_id);
    dedupedGallery.push(g);
  }

  const ids = dedupedGallery.map((g) => g.attachment_id);
  const atts =
    ids.length === 0
      ? []
      : await prisma.cmpTicketAttachment.findMany({
          where: { id: { in: ids }, tenantId: 'luxe-maurice' },
          select: { id: true, contentType: true },
        });
  const imageIds = new Set(
    atts.filter((x) => x && String(x.contentType || '').toLowerCase().startsWith('image/')).map((x) => String(x.id)),
  );

  const filtered = dedupedGallery.filter((g) => imageIds.has(g.attachment_id));
  filtered.sort((a, b) => {
    if (a.is_gallery_cover !== b.is_gallery_cover) return a.is_gallery_cover ? -1 : 1;
    const ao = a.gallery_order;
    const bo = b.gallery_order;
    if (ao != null && bo != null && ao !== bo) return ao - bo;
    if (ao != null && bo == null) return -1;
    if (ao == null && bo != null) return 1;
    const ta = a.published_at || '';
    const tb = b.published_at || '';
    return ta.localeCompare(tb);
  });

  const published_gallery = filtered.map((g) => ({
    src: `/api/lux/property-media?property=${encodeURIComponent(resolved.ref)}&attachment=${encodeURIComponent(g.attachment_id)}&slot=gallery`,
    alt: g.public_alt_text || '',
    caption: g.public_caption || null,
    gallery_order: g.gallery_order,
    is_gallery_cover: g.is_gallery_cover === true,
  }));

  return { ref: resolved.ref, published_hero: publishedHero, published_gallery };
}

/**
 * Safe JSON list for GET /api/lux/property-media-list (no operator metadata).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} propertySlugOrRef
 */
export async function buildLuxPropertyMediaListPayload(prisma, propertySlugOrRef) {
  const { ref, published_hero, published_gallery } = await collectPublishedLuxPropertyMedia(prisma, propertySlugOrRef);
  if (!ref) return { ok: false, error: 'NOT_FOUND' };
  const items = [];
  if (published_hero) {
    items.push({
      slot: 'hero',
      src: published_hero.src,
      public_alt_text: published_hero.alt || null,
      public_caption: published_hero.caption,
      gallery_order: null,
      is_gallery_cover: false,
    });
  }
  for (const g of published_gallery) {
    items.push({
      slot: 'gallery',
      src: g.src,
      public_alt_text: g.alt || null,
      public_caption: g.caption,
      gallery_order: g.gallery_order,
      is_gallery_cover: g.is_gallery_cover === true,
    });
  }
  return { ok: true, property: ref, items };
}

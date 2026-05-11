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
 * Lux host only. Returns published hero + gallery + card image entries (safe fields).
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
 * Scan recent Lux request tickets for published hero + gallery + card image refs (Phase 4D.1 + 4D.2).
 * `reference` / `detail` are not composed here; `card` is for homepage/listing cards (4D.2).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} propertySlugOrRef
 * @param {{ take?: number }} [options]
 * @returns {Promise<{
 *   ref: string,
 *   published_hero: { src: string, alt: string, caption: string | null } | null,
 *   published_gallery: { src: string, alt: string, caption: string | null, gallery_order: number | null, is_gallery_cover: boolean }[],
 *   published_card: { src: string, alt: string, caption: string | null, intended_slot: 'card' } | null,
 * }>}
 */
export async function collectPublishedLuxPropertyMedia(prisma, propertySlugOrRef, options = {}) {
  const take = Number.isFinite(Number(options.take)) ? Math.min(200, Math.max(1, Math.trunc(Number(options.take)))) : DEFAULT_TICKET_TAKE;
  const resolved = resolveLuxPropertyRef(propertySlugOrRef);
  const ref = resolved ? String(resolved.ref).toLowerCase() : '';
  const empty = { ref: resolved?.ref || '', published_hero: null, published_gallery: [], published_card: null };
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
  /** @type {{ attachment_id: string, public_caption: string | null, public_alt_text: string | null, published_at: string | null }[]} */
  const cardCandidates = [];

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
        } else if (slot === 'card') {
          cardCandidates.push({
            attachment_id: aid,
            public_caption: pl.public_caption != null ? String(pl.public_caption).slice(0, 180) : null,
            public_alt_text: pl.public_alt_text != null ? String(pl.public_alt_text).slice(0, 180) : null,
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

  let publishedCard = null;
  if (cardCandidates.length) {
    const cardIds = [...new Set(cardCandidates.map((c) => c.attachment_id))];
    const cardAtts =
      cardIds.length === 0
        ? []
        : await prisma.cmpTicketAttachment.findMany({
            where: { id: { in: cardIds }, tenantId: 'luxe-maurice' },
            select: { id: true, contentType: true },
          });
    const cardImageIds = new Set(
      cardAtts.filter((x) => x && String(x.contentType || '').toLowerCase().startsWith('image/')).map((x) => String(x.id)),
    );
    const firstCard = cardCandidates.find((c) => cardImageIds.has(c.attachment_id)) || null;
    if (firstCard) {
      publishedCard = {
        src: `/api/lux/property-media?property=${encodeURIComponent(resolved.ref)}&attachment=${encodeURIComponent(firstCard.attachment_id)}&slot=card`,
        alt: firstCard.public_alt_text || '',
        caption: firstCard.public_caption || null,
        intended_slot: 'card',
      };
    }
  }

  return { ref: resolved.ref, published_hero: publishedHero, published_gallery, published_card: publishedCard };
}

/**
 * Batch: first published card-slot image per resolved property ref (Phase 4D.2 homepage).
 * Same scan semantics as {@link collectPublishedLuxPropertyMedia}: newest tickets first; first matching link wins.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Iterable<string>} propertyRefsRaw — slugs or feed ids accepted by {@link resolveLuxPropertyRef}
 * @param {{ take?: number }} [options]
 * @returns {Promise<Map<string, { src: string, alt: string, caption: string | null, intended_slot: 'card' }>>} keys are lowercase resolved ref
 */
export async function collectPublishedLuxCardMediaByPropertyRefs(prisma, propertyRefsRaw, options = {}) {
  const take = Number.isFinite(Number(options.take)) ? Math.min(200, Math.max(1, Math.trunc(Number(options.take)))) : DEFAULT_TICKET_TAKE;
  /** @type {Map<string, string>} */
  const refLowerToCanonical = new Map();
  for (const raw of propertyRefsRaw || []) {
    const res = resolveLuxPropertyRef(raw);
    if (!res) continue;
    const low = String(res.ref).toLowerCase();
    if (!refLowerToCanonical.has(low)) refLowerToCanonical.set(low, res.ref);
  }
  if (refLowerToCanonical.size === 0) return new Map();

  const recent = await prisma.cmpTicket.findMany({
    where: { tenantId: 'luxe-maurice' },
    orderBy: { createdAt: 'desc' },
    take,
    select: { consoleJson: true },
  });

  /** @type {Map<string, { attachment_id: string, public_caption: string | null, public_alt_text: string | null, published_at: string | null }[]>} */
  const cardCandidatesByRef = new Map();

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
        if (!pl) continue;
        const refLower = String(pl.property_slug || '').toLowerCase();
        if (!refLowerToCanonical.has(refLower)) continue;
        const slot = normalizeLuxAttachmentPropertySlot(pl.intended_slot);
        if (!slot || String(pl.publish_status || '').toLowerCase() !== 'published') continue;
        if (slot !== 'card') continue;
        const rowCand = {
          attachment_id: aid,
          public_caption: pl.public_caption != null ? String(pl.public_caption).slice(0, 180) : null,
          public_alt_text: pl.public_alt_text != null ? String(pl.public_alt_text).slice(0, 180) : null,
          published_at: pl.published_at != null ? String(pl.published_at) : null,
        };
        const arr = cardCandidatesByRef.get(refLower) || [];
        arr.push(rowCand);
        cardCandidatesByRef.set(refLower, arr);
      }
    }
  }

  const ids = [...cardCandidatesByRef.values()].flat().map((c) => c.attachment_id);
  const uniqIds = [...new Set(ids)];
  if (!uniqIds.length) return new Map();

  const atts = await prisma.cmpTicketAttachment.findMany({
    where: { id: { in: uniqIds }, tenantId: 'luxe-maurice' },
    select: { id: true, contentType: true },
  });
  const imageIds = new Set(
    atts.filter((x) => x && String(x.contentType || '').toLowerCase().startsWith('image/')).map((x) => String(x.id)),
  );

  /** @type {Map<string, { src: string, alt: string, caption: string | null, intended_slot: 'card' }>} */
  const out = new Map();
  for (const [refLower, cands] of cardCandidatesByRef) {
    const cand = (Array.isArray(cands) ? cands : []).find((c) => imageIds.has(c.attachment_id));
    if (!cand) continue;
    const canonical = refLowerToCanonical.get(refLower);
    if (!canonical) continue;
    out.set(refLower, {
      src: `/api/lux/property-media?property=${encodeURIComponent(canonical)}&attachment=${encodeURIComponent(cand.attachment_id)}&slot=card`,
      alt: cand.public_alt_text || '',
      caption: cand.public_caption || null,
      intended_slot: 'card',
    });
  }
  return out;
}

/**
 * Safe JSON list for GET /api/lux/property-media-list (no operator metadata).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} propertySlugOrRef
 */
export async function buildLuxPropertyMediaListPayload(prisma, propertySlugOrRef) {
  const { ref, published_hero, published_gallery, published_card } = await collectPublishedLuxPropertyMedia(prisma, propertySlugOrRef);
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
  if (published_card) {
    items.push({
      slot: 'card',
      src: published_card.src,
      public_alt_text: published_card.alt || null,
      public_caption: published_card.caption,
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

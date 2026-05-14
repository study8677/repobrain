import { resolveLuxPropertyRef } from '../client/luxe-maurice-property-resolve.js';
import { assertLuxPublicMediaPropertyRef, normalizeLuxListingSlugQuery } from './lux-listing-published-query.js';
import {
  buildLuxPublicPropertyMediaSrcSet,
  normalizeLuxAttachmentPropertySlot,
  normalizeLuxGalleryOrder,
  normalizeLuxLifecycleStatus,
  normalizeLuxPublicImageContentTypeMime,
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
  const gate = await assertLuxPublicMediaPropertyRef(prisma, propertyRaw);
  if (!gate.ok) {
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
 *   published_hero: { src: string, src_set: string, alt: string, caption: string | null, content_type: string, variant: string } | null,
 *   published_gallery: { src: string, src_set: string, alt: string, caption: string | null, gallery_order: number | null, is_gallery_cover: boolean, content_type: string, variant: string }[],
 *   published_card: { src: string, src_set: string, alt: string, caption: string | null, intended_slot: 'card', content_type: string, variant: string } | null,
 * }>}
 */
export async function collectPublishedLuxPropertyMedia(prisma, propertySlugOrRef, options = {}) {
  const take = Number.isFinite(Number(options.take)) ? Math.min(200, Math.max(1, Math.trunc(Number(options.take)))) : DEFAULT_TICKET_TAKE;
  const resolved = resolveLuxPropertyRef(propertySlugOrRef);
  let refLower = resolved ? String(resolved.ref).toLowerCase() : '';
  let refCanon = resolved ? String(resolved.ref) : '';
  if (!refLower) {
    const slug = normalizeLuxListingSlugQuery(propertySlugOrRef);
    if (slug) {
      refLower = slug;
      refCanon = slug;
    }
  }
  const empty = { ref: refCanon || '', published_hero: null, published_gallery: [], published_card: null };
  if (!refLower) return empty;

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
      if (normalizeLuxLifecycleStatus(a.lifecycle_status) === 'archived') continue;
      const aid = String(a.attachment_id || '').trim();
      if (!aid) continue;
      const links = Array.isArray(a.property_links) ? a.property_links : [];
      for (const pl of links) {
        if (!pl || String(pl.property_slug || '').toLowerCase() !== refLower) continue;
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
      const { src, srcSet } = buildLuxPublicPropertyMediaSrcSet(refCanon, att.id, 'hero');
      publishedHero = {
        src,
        src_set: srcSet,
        alt: firstHero.public_alt_text || '',
        caption: firstHero.public_caption || null,
        content_type: normalizeLuxPublicImageContentTypeMime(att.contentType) || 'image/jpeg',
        variant: 'hero',
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
  /** @type {Map<string, { contentType?: string | null }>} */
  const attById = new Map(atts.map((x) => [String(x.id), x]));

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

  const published_gallery = filtered.map((g) => {
    const { src, srcSet } = buildLuxPublicPropertyMediaSrcSet(refCanon, g.attachment_id, 'gallery');
    return {
      src,
      src_set: srcSet,
      alt: g.public_alt_text || '',
      caption: g.public_caption || null,
      gallery_order: g.gallery_order,
      is_gallery_cover: g.is_gallery_cover === true,
      content_type: normalizeLuxPublicImageContentTypeMime(attById.get(g.attachment_id)?.contentType) || 'image/jpeg',
      variant: 'gallery',
    };
  });

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
      const cardRow = cardAtts.find((x) => x && String(x.id) === String(firstCard.attachment_id));
      const { src, srcSet } = buildLuxPublicPropertyMediaSrcSet(refCanon, firstCard.attachment_id, 'card');
      publishedCard = {
        src,
        src_set: srcSet,
        alt: firstCard.public_alt_text || '',
        caption: firstCard.public_caption || null,
        intended_slot: 'card',
        content_type: normalizeLuxPublicImageContentTypeMime(cardRow?.contentType) || 'image/jpeg',
        variant: 'card',
      };
    }
  }

  return { ref: refCanon, published_hero: publishedHero, published_gallery, published_card: publishedCard };
}

/**
 * Batch: first published card-slot image per resolved property ref (Phase 4D.2 homepage).
 * Same scan semantics as {@link collectPublishedLuxPropertyMedia}: newest tickets first; first matching link wins.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {Iterable<string>} propertyRefsRaw — slugs or feed ids accepted by {@link resolveLuxPropertyRef}
 * @param {{ take?: number, allowUnresolvedPropertySlugs?: boolean }} [options]
 * @returns {Promise<Map<string, { src: string, src_set: string, alt: string, caption: string | null, intended_slot: 'card' }>>} keys are lowercase resolved ref
 */
export async function collectPublishedLuxCardMediaByPropertyRefs(prisma, propertyRefsRaw, options = {}) {
  const take = Number.isFinite(Number(options.take)) ? Math.min(200, Math.max(1, Math.trunc(Number(options.take)))) : DEFAULT_TICKET_TAKE;
  const allowUnresolved = options.allowUnresolvedPropertySlugs === true;
  /** @type {Map<string, string>} */
  const refLowerToCanonical = new Map();
  for (const raw of propertyRefsRaw || []) {
    const res = resolveLuxPropertyRef(raw);
    if (res) {
      const low = String(res.ref).toLowerCase();
      if (!refLowerToCanonical.has(low)) refLowerToCanonical.set(low, res.ref);
      continue;
    }
    if (allowUnresolved) {
      const slug = normalizeLuxListingSlugQuery(raw);
      if (slug && !refLowerToCanonical.has(slug)) refLowerToCanonical.set(slug, slug);
    }
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
      if (normalizeLuxLifecycleStatus(a.lifecycle_status) === 'archived') continue;
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

  /** @type {Map<string, { src: string, src_set: string, alt: string, caption: string | null, intended_slot: 'card' }>} */
  const out = new Map();
  for (const [refLower, cands] of cardCandidatesByRef) {
    const cand = (Array.isArray(cands) ? cands : []).find((c) => imageIds.has(c.attachment_id));
    if (!cand) continue;
    const canonical = refLowerToCanonical.get(refLower);
    if (!canonical) continue;
    const { src, srcSet } = buildLuxPublicPropertyMediaSrcSet(canonical, cand.attachment_id, 'card');
    out.set(refLower, {
      src,
      src_set: srcSet,
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
      src_set: published_hero.src_set || '',
      public_alt_text: published_hero.alt || null,
      public_caption: published_hero.caption,
      gallery_order: null,
      is_gallery_cover: false,
      variant: published_hero.variant || 'hero',
      content_type: published_hero.content_type || null,
    });
  }
  if (published_card) {
    items.push({
      slot: 'card',
      src: published_card.src,
      src_set: published_card.src_set || '',
      public_alt_text: published_card.alt || null,
      public_caption: published_card.caption,
      gallery_order: null,
      is_gallery_cover: false,
      variant: published_card.variant || 'card',
      content_type: published_card.content_type || null,
    });
  }
  for (const g of published_gallery) {
    items.push({
      slot: 'gallery',
      src: g.src,
      src_set: g.src_set || '',
      public_alt_text: g.alt || null,
      public_caption: g.caption,
      gallery_order: g.gallery_order,
      is_gallery_cover: g.is_gallery_cover === true,
      variant: g.variant || 'gallery',
      content_type: g.content_type || null,
    });
  }
  return { ok: true, property: ref, items };
}

/**
 * Public read-only JSON for LuxeMaurice Postgres listings (Phase 2 slice A).
 *
 * Routes (via `api/factory_router.js`):
 * - GET /api/lux/listings — published rows for tenant `luxe-maurice`, Lux marketing host only.
 * - GET /api/lux/listing?slug=<ref> — single published row.
 *
 * Writes / editor UI are out of scope for this slice.
 */

const LUX_TENANT = 'luxe-maurice';
const VIS_PUBLISHED = 'published';

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return '';
  const v = query[key];
  if (Array.isArray(v)) return v[0] || '';
  return v || '';
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
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLuxListingSlugQuery(raw) {
  const s = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!s || s.length > 160) return '';
  if (!/^[a-z0-9][a-z0-9-]*$/.test(s)) return '';
  return s;
}

/**
 * @param {unknown} jsonVal
 * @returns {string[]}
 */
function parseHighlights(jsonVal) {
  if (!Array.isArray(jsonVal)) return [];
  return jsonVal.map((h) => String(h).trim()).filter(Boolean).slice(0, 24);
}

/**
 * @param {*} row
 */
function toPublicListRow(row) {
  return {
    slug: row.slug,
    title: row.title,
    region_label: row.regionLabel,
    property_type: row.propertyType,
    listing_status: row.listingStatus,
    price_range: row.priceRange,
    short_teaser: row.shortTeaser,
    highlights: parseHighlights(row.highlightsJson),
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area_sqm: row.areaSqm,
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
  };
}

/**
 * @param {*} row
 */
function toPublicDetailRow(row) {
  const raw = row.mediaRefsJson != null ? row.mediaRefsJson : [];
  const media_refs = Array.isArray(raw) ? raw : [];
  return {
    ...toPublicListRow(row),
    description: row.description,
    media_refs,
  };
}

/**
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} pathSeg
 * @returns {Promise<boolean>} true when this module handled the request
 */
export async function tryHandleLuxListingsPublicRead(req, res, prisma, pathSeg) {
  if (pathSeg !== 'lux/listings' && pathSeg !== 'lux/listing') {
    return false;
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    sendJson(res, 405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
    return true;
  }

  const hostTid = getTenantIdFromHostContext(req);
  if (hostTid !== LUX_TENANT) {
    sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
    return true;
  }

  if (pathSeg === 'lux/listings') {
    try {
      const rows = await prisma.luxListing.findMany({
        where: { tenantId: LUX_TENANT, visibilityStatus: VIS_PUBLISHED },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
        select: {
          slug: true,
          title: true,
          regionLabel: true,
          propertyType: true,
          listingStatus: true,
          priceRange: true,
          shortTeaser: true,
          highlightsJson: true,
          bedrooms: true,
          bathrooms: true,
          areaSqm: true,
          publishedAt: true,
        },
      });
      sendJson(res, 200, { ok: true, listings: rows.map(toPublicListRow) });
    } catch {
      sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' });
    }
    return true;
  }

  const slug = normalizeLuxListingSlugQuery(firstQuery(req.query, 'slug'));
  if (!slug) {
    sendJson(res, 400, { ok: false, error: 'SLUG_REQUIRED' });
    return true;
  }

  try {
    const row = await prisma.luxListing.findFirst({
      where: { tenantId: LUX_TENANT, slug, visibilityStatus: VIS_PUBLISHED },
      select: {
        slug: true,
        title: true,
        regionLabel: true,
        propertyType: true,
        listingStatus: true,
        priceRange: true,
        shortTeaser: true,
        description: true,
        highlightsJson: true,
        bedrooms: true,
        bathrooms: true,
        areaSqm: true,
        mediaRefsJson: true,
        publishedAt: true,
      },
    });
    if (!row) {
      sendJson(res, 404, { ok: false, error: 'NOT_FOUND' });
      return true;
    }
    sendJson(res, 200, { ok: true, listing: toPublicDetailRow(row) });
  } catch {
    sendJson(res, 500, { ok: false, error: 'SERVER_ERROR' });
  }
  return true;
}

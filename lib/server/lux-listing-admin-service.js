/**
 * LuxeMaurice `lux_listings` admin CRUD (Phase 2 Slice C). Server-only; tenant + editor identity enforced by callers.
 */

import { normalizeLuxListingSlugQuery } from './lux-listing-published-query.js';

const LUX_TENANT = 'luxe-maurice';

const VIS = new Set(['draft', 'preview', 'published', 'archived']);

function str(v) {
  return v != null ? String(v).trim() : '';
}

function normVis(raw) {
  const v = str(raw).toLowerCase();
  return VIS.has(v) ? v : '';
}

/**
 * @param {unknown} jsonVal
 * @returns {string[]}
 */
function parseHighlightsIn(jsonVal) {
  if (!Array.isArray(jsonVal)) return [];
  return jsonVal.map((h) => String(h).trim()).filter(Boolean).slice(0, 24);
}

/**
 * @param {*} row
 */
function toAdminDto(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    region_label: row.regionLabel,
    property_type: row.propertyType,
    listing_status: row.listingStatus,
    price_range: row.priceRange,
    short_teaser: row.shortTeaser,
    description: row.description,
    highlights: parseHighlightsIn(row.highlightsJson),
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area_sqm: row.areaSqm,
    visibility_status: row.visibilityStatus,
    published_at: row.publishedAt ? row.publishedAt.toISOString() : null,
    created_at: row.createdAt ? row.createdAt.toISOString() : null,
    updated_at: row.updatedAt ? row.updatedAt.toISOString() : null,
    created_by_id: row.createdById,
    updated_by_id: row.updatedById,
  };
}

const listSelect = {
  id: true,
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
  visibilityStatus: true,
  publishedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  updatedById: true,
};

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ userId: string | null }} actor
 */
export async function luxListingAdminList(prisma, actor) {
  const rows = await prisma.luxListing.findMany({
    where: { tenantId: LUX_TENANT },
    orderBy: [{ updatedAt: 'desc' }],
    select: listSelect,
  });
  const grouped = { draft: 0, preview: 0, published: 0, archived: 0 };
  for (const r of rows) {
    const k = String(r.visibilityStatus || '').toLowerCase();
    if (k in grouped) grouped[k]++;
  }
  return { ok: true, listings: rows.map(toAdminDto), counts: grouped };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id?: string, slug?: string }} key
 */
export async function luxListingAdminGet(prisma, key) {
  const id = str(key.id);
  const slug = normalizeLuxListingSlugQuery(key.slug);
  if (!id && !slug) return { ok: false, error: 'ID_OR_SLUG_REQUIRED' };
  const row = id
    ? await prisma.luxListing.findFirst({ where: { id, tenantId: LUX_TENANT }, select: listSelect })
    : await prisma.luxListing.findFirst({ where: { slug, tenantId: LUX_TENANT }, select: listSelect });
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  return { ok: true, listing: toAdminDto(row) };
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {object} body
 * @param {{ userId: string | null, username: string }} actor
 */
export async function luxListingAdminSave(prisma, body, actor) {
  const b = body && typeof body === 'object' ? body : {};
  const id = str(b.id);
  const slugIn = normalizeLuxListingSlugQuery(b.slug);
  const title = str(b.title).slice(0, 300);
  const regionLabel = str(b.region_label).slice(0, 300);
  const propertyType = str(b.property_type).slice(0, 120);
  if (!title || !regionLabel || !propertyType) {
    return { ok: false, error: 'TITLE_REGION_TYPE_REQUIRED' };
  }

  const listingStatus = b.listing_status != null ? str(b.listing_status).slice(0, 120) || null : null;
  const priceRange = b.price_range != null ? str(b.price_range).slice(0, 200) || null : null;
  const shortTeaser = b.short_teaser != null ? str(b.short_teaser).slice(0, 600) || null : null;
  const description = b.description != null ? String(b.description) : '';
  const highlightsJson = parseHighlightsIn(b.highlights);
  const bedrooms = Number.isFinite(Number(b.bedrooms)) ? Math.max(0, Math.trunc(Number(b.bedrooms))) : null;
  const bathrooms = Number.isFinite(Number(b.bathrooms)) ? Math.max(0, Number(b.bathrooms)) : null;
  const areaSqm = Number.isFinite(Number(b.area_sqm)) ? Math.max(0, Number(b.area_sqm)) : null;

  const vis = normVis(b.visibility_status) || 'draft';

  const userId = actor.userId || null;
  const username = str(actor.username).slice(0, 200);

  if (!id) {
    if (!slugIn) return { ok: false, error: 'SLUG_REQUIRED' };
    try {
      const row = await prisma.luxListing.create({
        data: {
          tenantId: LUX_TENANT,
          slug: slugIn,
          title,
          regionLabel,
          propertyType,
          listingStatus,
          priceRange,
          shortTeaser,
          description: description.slice(0, 50_000),
          highlightsJson,
          bedrooms,
          bathrooms,
          areaSqm,
          visibilityStatus: vis,
          createdById: userId,
          updatedById: userId,
          publishedAt: vis === 'published' ? new Date() : null,
        },
        select: listSelect,
      });
      return { ok: true, listing: toAdminDto(row) };
    } catch (e) {
      const msg = String(e?.message || e);
      if (msg.includes('Unique constraint') || msg.includes('unique')) {
        return { ok: false, error: 'SLUG_CONFLICT' };
      }
      return { ok: false, error: 'SAVE_FAILED', detail: msg };
    }
  }

  const existing = await prisma.luxListing.findFirst({
    where: { id, tenantId: LUX_TENANT },
    select: { id: true, slug: true, publishedAt: true },
  });
  if (!existing) return { ok: false, error: 'NOT_FOUND' };

  let nextPublishedAt = existing.publishedAt;
  if (vis === 'published') {
    nextPublishedAt = existing.publishedAt || new Date();
  } else if (vis === 'draft' || vis === 'preview') {
    nextPublishedAt = null;
  }

  try {
    const row = await prisma.luxListing.update({
      where: { id },
      data: {
        title,
        regionLabel,
        propertyType,
        listingStatus,
        priceRange,
        shortTeaser,
        description: description.slice(0, 50_000),
        highlightsJson,
        bedrooms,
        bathrooms,
        areaSqm,
        visibilityStatus: vis,
        updatedById: userId,
        publishedAt: nextPublishedAt,
      },
      select: listSelect,
    });
    void username;
    return { ok: true, listing: toAdminDto(row) };
  } catch (e) {
    return { ok: false, error: 'SAVE_FAILED', detail: String(e?.message || e) };
  }
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string, visibility_status: string }} body
 * @param {{ userId: string | null }} actor
 */
export async function luxListingAdminSetVisibility(prisma, body, actor) {
  const id = str(body.id);
  const vis = normVis(body.visibility_status);
  if (!id || !vis) return { ok: false, error: 'ID_AND_VISIBILITY_REQUIRED' };

  const existing = await prisma.luxListing.findFirst({ where: { id, tenantId: LUX_TENANT }, select: { id: true } });
  if (!existing) return { ok: false, error: 'NOT_FOUND' };

  const cur = await prisma.luxListing.findFirst({
    where: { id, tenantId: LUX_TENANT },
    select: { publishedAt: true },
  });
  let nextPublishedAt = cur?.publishedAt ?? null;
  if (vis === 'published') {
    nextPublishedAt = cur?.publishedAt || new Date();
  } else if (vis === 'draft' || vis === 'preview') {
    nextPublishedAt = null;
  }

  const row = await prisma.luxListing.update({
    where: { id },
    data: {
      visibilityStatus: vis,
      updatedById: actor.userId || null,
      publishedAt: nextPublishedAt,
    },
    select: listSelect,
  });
  return { ok: true, listing: toAdminDto(row) };
}

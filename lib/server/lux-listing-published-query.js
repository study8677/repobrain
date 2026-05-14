/**
 * Server-only: published `lux_listings` rows for LuxeMaurice (Phase 2).
 * Shared by `/api/lux/listings` and marketing SSR (`/properties`).
 */

import { resolveLuxPropertyRef } from '../client/luxe-maurice-property-resolve.js';

const LUX_TENANT = 'luxe-maurice';
const VIS_PUBLISHED = 'published';

/** Host-derived tenant id must match this for public `/properties` SSR (same as listing APIs). */
export function isLuxListingPublicTenantId(tenantId) {
  return String(tenantId || '').trim() === LUX_TENANT;
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
 * Published Lux listings for marketing (same shape as GET /api/lux/listings items).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<Array<ReturnType<typeof toPublicListRow>>>}
 */
export async function fetchPublishedLuxListingsPublic(prisma) {
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
  return rows.map(toPublicListRow);
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
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} slugRaw
 */
export async function fetchPublishedLuxListingDetailPublic(prisma, slugRaw) {
  const slug = normalizeLuxListingSlugQuery(slugRaw);
  if (!slug) return null;
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
  if (!row) return null;
  return toPublicDetailRow(row);
}

/**
 * Resolve property ref for concierge + detail pages: staged/feed first, then published Postgres row.
 * Shape aligns with `resolveLuxPropertyRef` for `property_interest` / detail props.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} rawSlug
 * @returns {Promise<object | null>}
 */
export async function resolveLuxPropertyRefWithPublishedDb(prisma, rawSlug) {
  const fromCatalog = resolveLuxPropertyRef(rawSlug);
  if (fromCatalog) return fromCatalog;

  const slug = normalizeLuxListingSlugQuery(rawSlug);
  if (!slug) return null;

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
    },
  });
  if (!row) return null;

  const customHl = parseHighlights(row.highlightsJson);
  const desc = row.description != null ? String(row.description).trim() : '';
  const teaser = row.shortTeaser != null ? String(row.shortTeaser).trim() : '';
  const defaultHighlights = [
    `${row.propertyType} · ${row.regionLabel}`,
    'Availability and private previews are arranged through the concierge.',
    'Nothing on this page is an offer; terms are agreed in writing when you proceed.',
  ];

  return {
    discovery_source: 'lux_postgres',
    ref: row.slug,
    title: row.title,
    location: row.regionLabel,
    property_type: row.propertyType,
    status: row.listingStatus || null,
    price_range: row.priceRange != null ? String(row.priceRange).trim() : null,
    listing_provider: 'lux_postgres_published',
    summary_text: teaser || desc.slice(0, 400) || `${row.title} — ${row.regionLabel}.`,
    highlights: customHl.length >= 1 ? customHl.slice(0, 12) : defaultHighlights,
    hero_image: null,
  };
}

/**
 * Staged/feed first, then any non-archived `lux_listings` row (draft/preview/published) for attachment linking.
 * Used by `lux-attachment-property-*` handlers so editors can wire media before a listing is public.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} rawSlug
 * @returns {Promise<object | null>}
 */
export async function resolveLuxPropertyRefForAttachmentLink(prisma, rawSlug) {
  const fromCatalog = resolveLuxPropertyRef(rawSlug);
  if (fromCatalog) return fromCatalog;

  const slug = normalizeLuxListingSlugQuery(rawSlug);
  if (!slug) return null;

  const row = await prisma.luxListing.findFirst({
    where: { tenantId: LUX_TENANT, slug, visibilityStatus: { not: 'archived' } },
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
    },
  });
  if (!row) return null;

  const customHl = parseHighlights(row.highlightsJson);
  const desc = row.description != null ? String(row.description).trim() : '';
  const teaser = row.shortTeaser != null ? String(row.shortTeaser).trim() : '';
  const defaultHighlights = [
    `${row.propertyType} · ${row.regionLabel}`,
    'Availability and private previews are arranged through the concierge.',
    'Nothing on this page is an offer; terms are agreed in writing when you proceed.',
  ];

  return {
    discovery_source: 'lux_postgres',
    ref: row.slug,
    title: row.title,
    location: row.regionLabel,
    property_type: row.propertyType,
    status: row.listingStatus || null,
    price_range: row.priceRange != null ? String(row.priceRange).trim() : null,
    listing_provider: 'lux_postgres_published',
    summary_text: teaser || desc.slice(0, 400) || `${row.title} — ${row.regionLabel}.`,
    highlights: customHl.length >= 1 ? customHl.slice(0, 12) : defaultHighlights,
    hero_image: null,
  };
}

/**
 * Public media routes: staged/feed ref, or a **published** Postgres listing slug only.
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} propertyLower — already lowercased host input
 * @returns {Promise<{ ok: boolean, refLower?: string, refCanon?: string, error?: string }>}
 */
export async function assertLuxPublicMediaPropertyRef(prisma, propertyLower) {
  const raw = propertyLower != null ? String(propertyLower).trim().toLowerCase() : '';
  if (!raw) return { ok: false, error: 'PROPERTY_REQUIRED' };
  const fromCatalog = resolveLuxPropertyRef(raw);
  if (fromCatalog) {
    return { ok: true, refLower: String(fromCatalog.ref).toLowerCase(), refCanon: fromCatalog.ref };
  }
  const slug = normalizeLuxListingSlugQuery(raw);
  if (!slug) return { ok: false, error: 'NOT_FOUND' };
  const row = await prisma.luxListing.findFirst({
    where: { tenantId: LUX_TENANT, slug, visibilityStatus: VIS_PUBLISHED },
    select: { slug: true },
  });
  if (!row) return { ok: false, error: 'NOT_FOUND' };
  return { ok: true, refLower: slug, refCanon: row.slug };
}

/**
 * Draft/preview listing row for authenticated editor preview (`/property/[slug]?preview=1`).
 *
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {string} slugRaw
 */
export async function fetchLuxListingDraftPreviewRow(prisma, slugRaw) {
  const slug = normalizeLuxListingSlugQuery(slugRaw);
  if (!slug) return null;
  return prisma.luxListing.findFirst({
    where: { tenantId: LUX_TENANT, slug, visibilityStatus: { in: ['draft', 'preview'] } },
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
    },
  });
}

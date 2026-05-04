/**
 * Staged curated listings for LuxeMaurice (`lux.corpflowai.com`) — Phase 2 first slice.
 * Single source for SSR, property cards, concierge context, and CMP allowlist validation.
 * Not IDX; slugs are stable editorial ids only.
 */

/** @typedef {{ slug: string, title: string, region: string, property_type: string, status: string, group: string, teaser: string }} LuxStagedProperty */

/** @type {LuxStagedProperty[]} */
export const LUXE_MAURICE_STAGED_PROPERTIES = [
  {
    slug: 'lm-nc-ridge',
    title: 'North Coast Ridge Residences',
    region: 'North Mauritius',
    property_type: 'Residences',
    status: 'Private preview',
    group: 'north',
    teaser: 'Beach-close apartments with services nearby — developer inventory by private introduction.',
  },
  {
    slug: 'lm-villa-belombre',
    title: 'Bel Ombre villa enclave',
    region: 'South & heritage coast',
    property_type: 'Villas',
    status: 'Details on request',
    group: 'villa',
    teaser: 'Low-density plots and ocean outlooks; floorplans and previews through concierge only.',
  },
  {
    slug: 'lm-pent-plateau',
    title: 'Plateau super-prime penthouse',
    region: 'Central plateau',
    property_type: 'Penthouse',
    status: 'Private preview',
    group: 'north',
    teaser: 'A single staged super-prime line — availability confirmed with the developer.',
  },
  {
    slug: 'lm-pipeline-q4',
    title: 'Pipeline — Q4 release',
    region: 'Island-wide',
    property_type: 'Mixed',
    status: 'Register interest',
    group: 'pipeline',
    teaser: 'Join the early list for the next developer-backed release; terms on agreement only.',
  },
];

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/**
 * @param {unknown} slug
 * @returns {boolean}
 */
export function isLuxStagedPropertySlug(slug) {
  const s = slug != null ? String(slug).trim().toLowerCase() : '';
  return SLUG_RE.test(s) && LUXE_MAURICE_STAGED_PROPERTIES.some((p) => p.slug === s);
}

/**
 * @param {unknown} slug
 * @returns {LuxStagedProperty | null}
 */
export function findLuxStagedPropertyBySlug(slug) {
  const s = slug != null ? String(slug).trim().toLowerCase() : '';
  if (!SLUG_RE.test(s)) return null;
  return LUXE_MAURICE_STAGED_PROPERTIES.find((p) => p.slug === s) || null;
}

/**
 * @param {'all' | 'north' | 'villa' | 'pipeline'} group
 * @returns {LuxStagedProperty[]}
 */
export function filterLuxStagedPropertiesByGroup(group) {
  const g = String(group || 'all').trim().toLowerCase();
  if (g === 'all') return [...LUXE_MAURICE_STAGED_PROPERTIES];
  return LUXE_MAURICE_STAGED_PROPERTIES.filter((p) => p.group === g);
}

/**
 * Mock IDX / feed-shaped listings for LuxeMaurice Phase 2B hybrid discovery.
 * Replace `LUXE_MAURICE_FEED_PROPERTIES` (or load from env/API) when wiring a real provider;
 * keep stable `id` values or map provider keys → these ids at the adapter boundary.
 */

/** @typedef {{ id: string, title: string, location: string, property_type: string, price_range?: string | null, status?: string | null }} LuxFeedProperty */

/** @type {LuxFeedProperty[]} */
export const LUXE_MAURICE_FEED_PROPERTIES = [
  {
    id: 'lxf-grand-baie-apt',
    title: 'Coastal apartments — Grand Baie corridor',
    location: 'Grand Baie',
    property_type: 'Apartment',
    price_range: 'From approx. USD 720k',
    status: 'Market preview (mock feed)',
  },
  {
    id: 'lxf-tamarin-villa',
    title: 'West coast villa — Tamarin foothills',
    location: 'Tamarin / Black River',
    property_type: 'Villa',
    price_range: 'USD 1.8M – 2.4M (indicative)',
    status: 'Market preview (mock feed)',
  },
  {
    id: 'lxf-poste-lafayette',
    title: 'North-east beachfront stack',
    location: 'Poste Lafayette',
    property_type: 'Penthouse',
    price_range: 'On application',
    status: 'Market preview (mock feed)',
  },
];

const FEED_ID_RE = /^lxf-[a-z0-9-]{1,56}$/;

/**
 * @param {unknown} id
 * @returns {boolean}
 */
export function isLuxFeedPropertyId(id) {
  const s = id != null ? String(id).trim().toLowerCase() : '';
  return FEED_ID_RE.test(s) && LUXE_MAURICE_FEED_PROPERTIES.some((p) => p.id === s);
}

/**
 * @param {unknown} id
 * @returns {LuxFeedProperty | null}
 */
export function findLuxFeedPropertyById(id) {
  const s = id != null ? String(id).trim().toLowerCase() : '';
  if (!FEED_ID_RE.test(s)) return null;
  return LUXE_MAURICE_FEED_PROPERTIES.find((p) => p.id === s) || null;
}

/**
 * Map governed visual-asset manifests to homepage slots.
 *
 * The CorpFlowAI public homepage (`https://corpflowai.com/` rendered
 * by `components/CorpFlowPublicHome.js`) is the first runtime
 * consumer of governed visual manifests. Rather than hard-coding
 * `<img src>` strings into the component, the component receives a
 * `homepageAssets` prop shaped by this selector.
 *
 * **Slot is a render contract; manifest is content.** Adding a new
 * homepage manifest must not require code changes — authors drop a
 * new `<id>.manifest.json` into `data/visual-assets/` and the
 * selector picks it up by id or by declarative slot hint.
 *
 * Selection rules (per slot):
 *
 * 1. If a manifest's id matches one of the slot's preferred ids, use
 *    it. Earlier preferred ids win.
 * 2. Otherwise, if a manifest declares `usage.notes` containing a
 *    `slot:<slot_id>` token, use the first matching one.
 * 3. Otherwise, if any manifest's `kind` is in the slot's accepted
 *    kinds AND its `surface` is `core` or `shared`, use the first
 *    such manifest (deterministic by id).
 * 4. Otherwise the slot is left empty — the homepage renders without
 *    that asset (preserves existing layout / conversion hierarchy).
 *
 * Manifests whose `lifecycle.state` is `draft` or `retired` are never
 * eligible. Manifests whose `usage.allowed_surfaces` does not include
 * `core` or `shared` are never eligible (a `lux`-only asset will not
 * leak onto the CorpFlowAI marketing surface).
 *
 * The selector is **pure**: same inputs → same outputs. It does no
 * I/O. Pair it with `listVisualAssetManifests('core')` (or
 * `'shared'`) from `./loadManifest.js` at SSR/build time.
 */

/** @typedef {import('./loadManifest.js').VisualAssetManifest} VisualAssetManifest */

/**
 * Slots the public homepage knows how to render. Order is the order
 * they typically appear visually, but the homepage component is free
 * to render any subset.
 */
export const HOMEPAGE_SLOT_IDS = Object.freeze([
  'homepage_hero',
  'homepage_services_graphic',
  'homepage_trust_band',
  'homepage_social_card',
]);

/**
 * @typedef {object} HomepageSlotSpec
 * @property {string[]} preferredIds  manifest ids tried first, in order
 * @property {string[]} acceptedKinds manifest kinds eligible for this slot
 */

/** @type {Record<string, HomepageSlotSpec>} */
const SLOT_SPECS = Object.freeze({
  homepage_hero: {
    preferredIds: [
      'corpflow-homepage-hero',
      'corpflow-home-hero',
      'home-hero',
    ],
    acceptedKinds: ['image', 'illustration'],
  },
  homepage_services_graphic: {
    preferredIds: [
      'corpflow-homepage-services',
      'corpflow-homepage-services-graphic',
      'corpflow-home-services-graphic',
      'home-services-graphic',
    ],
    acceptedKinds: ['illustration', 'image', 'icon'],
  },
  homepage_trust_band: {
    preferredIds: [
      'corpflow-homepage-trust',
      'corpflow-homepage-trust-band',
      'corpflow-home-trust-band',
      'home-trust-band',
    ],
    acceptedKinds: ['illustration', 'image'],
  },
  homepage_social_card: {
    preferredIds: [
      'corpflow-homepage-social',
      'corpflow-homepage-social-card',
      'corpflow-home-social-card',
      'home-social-card',
    ],
    acceptedKinds: ['social_card'],
  },
});

const HOMEPAGE_ALLOWED_SURFACES = Object.freeze(['core', 'shared']);

/**
 * Internal: is this manifest renderable on the public homepage at all?
 *
 * @param {VisualAssetManifest} m
 * @returns {boolean}
 */
function isEligibleForHomepage(m) {
  if (!m || typeof m !== 'object') return false;
  const state = m.lifecycle?.state;
  if (state !== 'vetted' && state !== 'published') return false;

  const allowed = Array.isArray(m.usage?.allowed_surfaces) ? m.usage.allowed_surfaces : [];
  return HOMEPAGE_ALLOWED_SURFACES.some((s) => allowed.includes(s));
}

/**
 * Internal: does the manifest declare an explicit `slot:<id>` hint
 * in its `usage.notes`? Lets content authors target a specific slot
 * without needing a code change to add a preferred id.
 *
 * @param {VisualAssetManifest} m
 * @param {string} slotId
 * @returns {boolean}
 */
function hasSlotHint(m, slotId) {
  const notes = typeof m?.usage?.notes === 'string' ? m.usage.notes : '';
  if (!notes) return false;
  const re = new RegExp(`(?:^|[\\s,;])slot:${slotId}(?:$|[\\s,;])`, 'i');
  return re.test(notes);
}

/**
 * Internal: pick the best manifest for one slot, given the eligible
 * pool. Returns `null` when nothing matches; the homepage will then
 * skip that slot.
 *
 * @param {VisualAssetManifest[]} pool
 * @param {string} slotId
 * @returns {VisualAssetManifest | null}
 */
function pickForSlot(pool, slotId) {
  const spec = SLOT_SPECS[slotId];
  if (!spec) return null;

  const byId = new Map(pool.map((m) => [m.id, m]));

  for (const preferred of spec.preferredIds) {
    const m = byId.get(preferred);
    if (m) return m;
  }

  for (const m of pool) {
    if (hasSlotHint(m, slotId) && spec.acceptedKinds.includes(m.kind)) {
      return m;
    }
  }

  for (const m of pool) {
    if (!spec.acceptedKinds.includes(m.kind)) continue;
    return m;
  }

  return null;
}

/**
 * @typedef {object} HomepageAssetSelection
 * @property {VisualAssetManifest | null} homepage_hero
 * @property {VisualAssetManifest | null} homepage_services_graphic
 * @property {VisualAssetManifest | null} homepage_trust_band
 * @property {VisualAssetManifest | null} homepage_social_card
 */

/**
 * Build a slot → manifest map for the CorpFlowAI public homepage.
 *
 * @param {VisualAssetManifest[]} manifests All manifests considered
 *   for the homepage. Typically the result of
 *   `listVisualAssetManifests('core')` plus
 *   `listVisualAssetManifests('shared')`, deduplicated by id. Passing
 *   the full set is also safe — surface gating is enforced here.
 * @returns {HomepageAssetSelection}
 */
export function selectHomepageAssets(manifests) {
  const eligible = (Array.isArray(manifests) ? manifests : []).filter(isEligibleForHomepage);

  /** @type {HomepageAssetSelection} */
  const out = {
    homepage_hero: null,
    homepage_services_graphic: null,
    homepage_trust_band: null,
    homepage_social_card: null,
  };

  for (const slotId of HOMEPAGE_SLOT_IDS) {
    out[slotId] = pickForSlot(eligible, slotId);
  }

  return out;
}

/**
 * @internal — exported for tests so they can assert against the
 * preferred-id and accepted-kind contracts without re-importing the
 * private constants.
 */
export function __getHomepageSlotSpecs() {
  return SLOT_SPECS;
}

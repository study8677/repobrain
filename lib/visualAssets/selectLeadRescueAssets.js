/**
 * Map governed visual-asset manifests to AI Lead Rescue page slots.
 *
 * Twin of `selectHomepageAssets.js` for the AI Lead Rescue surface
 * (`https://corpflowai.com/lead-rescue` and the
 * `aileadrescue.corpflowai.com` host, both rendered by
 * `components/AiLeadRescueLanding.js`). The rendering component
 * receives a `leadRescueAssets` prop shaped by this selector instead
 * of hard-coding `<img src>` strings.
 *
 * **Slot is a render contract; manifest is content.** Adding a new
 * lead-rescue manifest must not require code changes — authors drop
 * a new `<id>.manifest.json` into `data/visual-assets/` and the
 * selector picks it up by id or by declarative `slot:<id>` hint.
 *
 * Selection rules (per slot):
 *
 * 1. If a manifest's id matches one of the slot's preferred ids, use
 *    it. Earlier preferred ids win.
 * 2. Otherwise, if a manifest declares `usage.notes` containing a
 *    `slot:<slot_id>` token, use the first matching one (deterministic
 *    by manifest order in the input pool).
 * 3. Otherwise, if any manifest's `kind` is in the slot's accepted
 *    kinds AND its `usage.allowed_surfaces` includes `lead-rescue` or
 *    `shared`, use the first such manifest.
 * 4. Otherwise the slot is left empty — the page renders without that
 *    asset (preserves existing layout / conversion hierarchy).
 *
 * Manifests whose `lifecycle.state` is `draft` or `retired` are never
 * eligible. Manifests whose `usage.allowed_surfaces` does not include
 * `lead-rescue` or `shared` are never eligible (a `lux`-only asset
 * will not leak onto the AI Lead Rescue surface).
 *
 * The selector is **pure**: same inputs → same outputs. It does no
 * I/O. Pair it with `listVisualAssetManifests('lead-rescue')` (plus
 * `listVisualAssetManifests('shared')`, deduplicated) at SSR/SSG time.
 */

/** @typedef {import('./loadManifest.js').VisualAssetManifest} VisualAssetManifest */

/**
 * Slots the AI Lead Rescue page knows how to render. Order is the
 * order they typically appear visually, but the page component is
 * free to render any subset.
 */
export const LEAD_RESCUE_SLOT_IDS = Object.freeze([
  'lead_rescue_hero',
  'lead_rescue_process',
  'lead_rescue_dashboard',
  'lead_rescue_trust_band',
  'lead_rescue_social_card',
]);

/**
 * @typedef {object} LeadRescueSlotSpec
 * @property {string[]} preferredIds  manifest ids tried first, in order
 * @property {string[]} acceptedKinds manifest kinds eligible for this slot
 */

/** @type {Record<string, LeadRescueSlotSpec>} */
const SLOT_SPECS = Object.freeze({
  lead_rescue_hero: {
    preferredIds: [
      'lead-rescue-hero',
      'lead-rescue-hero-image',
    ],
    acceptedKinds: ['image', 'illustration'],
  },
  lead_rescue_process: {
    preferredIds: [
      'lead-rescue-process',
      'lead-rescue-process-flow',
    ],
    acceptedKinds: ['illustration', 'image', 'icon'],
  },
  lead_rescue_dashboard: {
    // CF-VID-0001 walkthrough is preferred over the static SVG mockup. The
    // walkthrough is a moving, accessible (captioned) version of the same
    // morning-view content; the SVG remains as the fallback if the
    // walkthrough manifest is ever retired.
    preferredIds: [
      'lead-rescue-walkthrough-v1',
      'lead-rescue-dashboard',
      'lead-rescue-operator-view',
      'lead-rescue-daily-view',
    ],
    acceptedKinds: ['video', 'illustration', 'image'],
  },
  lead_rescue_trust_band: {
    preferredIds: [
      'lead-rescue-trust',
      'lead-rescue-trust-band',
    ],
    acceptedKinds: ['illustration', 'image'],
  },
  lead_rescue_social_card: {
    preferredIds: [
      'lead-rescue-social',
      'lead-rescue-social-card',
      'lead-rescue-social-card-hero',
    ],
    acceptedKinds: ['social_card'],
  },
});

const LEAD_RESCUE_ALLOWED_SURFACES = Object.freeze(['lead-rescue', 'shared']);

/**
 * @param {VisualAssetManifest} m
 * @returns {boolean}
 */
function isEligibleForLeadRescue(m) {
  if (!m || typeof m !== 'object') return false;
  const state = m.lifecycle?.state;
  if (state !== 'vetted' && state !== 'published') return false;

  const allowed = Array.isArray(m.usage?.allowed_surfaces) ? m.usage.allowed_surfaces : [];
  return LEAD_RESCUE_ALLOWED_SURFACES.some((s) => allowed.includes(s));
}

/**
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
 * @typedef {object} LeadRescueAssetSelection
 * @property {VisualAssetManifest | null} lead_rescue_hero
 * @property {VisualAssetManifest | null} lead_rescue_process
 * @property {VisualAssetManifest | null} lead_rescue_dashboard
 * @property {VisualAssetManifest | null} lead_rescue_trust_band
 * @property {VisualAssetManifest | null} lead_rescue_social_card
 */

/**
 * Build a slot → manifest map for the AI Lead Rescue page.
 *
 * @param {VisualAssetManifest[]} manifests All manifests considered
 *   for the AI Lead Rescue page. Typically the result of
 *   `listVisualAssetManifests('lead-rescue')` plus
 *   `listVisualAssetManifests('shared')`, deduplicated by id. Passing
 *   the full set is also safe — surface gating is enforced here.
 * @returns {LeadRescueAssetSelection}
 */
export function selectLeadRescueAssets(manifests) {
  const eligible = (Array.isArray(manifests) ? manifests : []).filter(isEligibleForLeadRescue);

  /** @type {LeadRescueAssetSelection} */
  const out = {
    lead_rescue_hero: null,
    lead_rescue_process: null,
    lead_rescue_dashboard: null,
    lead_rescue_trust_band: null,
    lead_rescue_social_card: null,
  };

  for (const slotId of LEAD_RESCUE_SLOT_IDS) {
    out[slotId] = pickForSlot(eligible, slotId);
  }

  return out;
}

/**
 * @internal — exported for tests so they can assert against the
 * preferred-id and accepted-kind contracts without re-importing the
 * private constants.
 */
export function __getLeadRescueSlotSpecs() {
  return SLOT_SPECS;
}

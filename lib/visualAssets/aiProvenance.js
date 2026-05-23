/**
 * Pure helpers for AI-provenance gating.
 *
 * Deliberately separate from `components/VisualAssetRenderer.js` and
 * `components/AssetProvenanceDisclosure.js` so that:
 *
 * 1. Server-side code (page SSR, scripts, tests) can ask "is this
 *    asset AI-generated?" without pulling React + JSX into a Node
 *    test runner that can't parse JSX.
 * 2. There is exactly one place where the AI-generated condition
 *    lives, so renderer + disclosure agree by construction.
 */

/**
 * @param {object | null | undefined} manifest validated visual-asset manifest
 * @returns {boolean}
 */
export function isAiGeneratedManifest(manifest) {
  if (!manifest || typeof manifest !== 'object') return false;
  const sourceType = manifest.source && typeof manifest.source === 'object' ? manifest.source.type : null;
  const licenceTier = manifest.licence && typeof manifest.licence === 'object' ? manifest.licence.tier : null;
  return sourceType === 'ai_generated' || licenceTier === 'ai_generated';
}

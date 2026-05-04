/**
 * Unified property ref resolution: curated staged slugs + feed listing ids (Phase 2B hybrid).
 * Used by concierge UI and server allowlist validation (import from `lib/cmp/router.js`).
 */

import { findLuxFeedPropertyById } from './luxe-maurice-feed-properties.js';
import { findLuxStagedPropertyBySlug } from './luxe-maurice-staged-properties.js';

/**
 * @typedef {{
 *   discovery_source: 'curated' | 'feed',
 *   ref: string,
 *   title: string,
 *   location: string,
 *   property_type: string,
 *   status: string | null,
 *   price_range: string | null,
 *   listing_provider: string,
 * }} LuxResolvedPropertyInterest
 */

/**
 * @param {unknown} ref
 * @returns {LuxResolvedPropertyInterest | null}
 */
export function resolveLuxPropertyRef(ref) {
  const raw = ref != null ? String(ref).trim().toLowerCase() : '';
  if (!raw) return null;

  const curated = findLuxStagedPropertyBySlug(raw);
  if (curated) {
    return {
      discovery_source: 'curated',
      ref: curated.slug,
      title: curated.title,
      location: curated.region,
      property_type: curated.property_type,
      status: curated.status || null,
      price_range: null,
      listing_provider: 'curated_staged',
    };
  }

  const feed = findLuxFeedPropertyById(raw);
  if (feed) {
    return {
      discovery_source: 'feed',
      ref: feed.id,
      title: feed.title,
      location: feed.location,
      property_type: feed.property_type,
      status: feed.status != null ? String(feed.status) : null,
      price_range: feed.price_range != null ? String(feed.price_range) : null,
      listing_provider: 'mock_feed_v1',
    };
  }

  return null;
}

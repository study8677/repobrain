/**
 * Concierge SEO metadata builder (pure / SSR-callable / testable).
 *
 * Today `/concierge` is rendered by `pages/concierge.js` which imports
 * `LUXE_MAURICE_BRAND_TOKENS` and `resolveLuxPropertyRef` — the page is
 * **Lux-only** (i.e. when reached via apex `corpflowai.com/concierge`, the
 * same Lux-branded content is served). The future host-aware tenant
 * rendering described in `docs/quality/LUX_TRUST_AND_POLICY_REMEDIATION_PLAN.md`
 * tracks the broader split (privacy/terms/about/contact/refund-policy);
 * this helper deliberately mirrors today's rendering by returning
 * Lux-branded metadata for any host, while preserving a host-aware
 * canonical so search engines treat `lux.corpflowai.com/concierge` and
 * `luxe.corpflowai.com/concierge` (or even apex `/concierge` until the
 * remediation lands) as distinct canonical URLs.
 *
 * When the trust + policy remediation packet ships, this helper gains an
 * `isLuxHost`-style branch for non-Lux variants — the API shape and the
 * `host` / `canonicalHost` / `isLuxHost` outputs are designed to make
 * that a single-file change.
 *
 * Pure (no DOM, no React, no Next.js): callable from `getServerSideProps`.
 */

const LUX_HOSTS = Object.freeze([
  'lux.corpflowai.com',
  'www.lux.corpflowai.com',
  'luxe.corpflowai.com',
  'www.luxe.corpflowai.com',
]);

const LUX_PRIMARY_HOST = 'lux.corpflowai.com';
const BRAND_NAME = 'Luxurious Mauritius';
const TITLE_BASE = 'Private concierge';
const DESCRIPTION_GENERIC =
  'Speak with a private advisor about Mauritius property — developments, timing, and contact preferences. One advisor responds within one business day. Developer-backed opportunities only.';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * Normalize a host header value. Returns the lowercased host without
 * any port suffix. **Returns '' for missing / empty input** — callers
 * decide whether to apply a fallback (the canonical-URL derivation in
 * `buildConciergeSeo` falls back to `LUX_PRIMARY_HOST`, but
 * `isLuxHost('')` correctly returns false).
 */
function normalizeHost(raw) {
  return safeStr(raw).toLowerCase().replace(/:\d+$/, '');
}

export function isLuxHost(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  return LUX_HOSTS.includes(h);
}

/**
 * Build the SEO metadata for the `/concierge` page.
 *
 * @param {{
 *   host?: string,
 *   propertyTitle?: string,
 *   propertyRef?: string,
 * }} [input]
 * @returns {{
 *   title: string,
 *   description: string,
 *   canonical: string,
 *   robots: 'index, follow',
 *   ogTitle: string,
 *   ogDescription: string,
 *   ogUrl: string,
 *   ogType: 'website',
 *   ogSiteName: string,
 *   twitterCard: 'summary_large_image',
 *   twitterTitle: string,
 *   twitterDescription: string,
 *   host: string,
 *   canonicalHost: string,
 *   isLuxHost: boolean,
 * }}
 */
export function buildConciergeSeo(input) {
  const observedHost = normalizeHost(input && input.host);
  const isLux = !!observedHost && LUX_HOSTS.includes(observedHost);
  // The concierge page renders Lux content regardless of host today, so the
  // canonical URL collapses non-Lux (and missing) host inputs onto the Lux
  // primary host. This matches the page's actual brand identity until
  // host-aware rendering ships.
  const canonicalHost = isLux ? observedHost : LUX_PRIMARY_HOST;

  const cleanedPropertyTitle = safeStr(input && input.propertyTitle);
  const cleanedPropertyRef = safeStr(input && input.propertyRef);

  const title = cleanedPropertyTitle
    ? `${TITLE_BASE} · ${cleanedPropertyTitle} · ${BRAND_NAME}`
    : `${TITLE_BASE} · ${BRAND_NAME}`;

  const description = cleanedPropertyTitle
    ? `Speak with a private advisor about ${cleanedPropertyTitle} in Mauritius. One advisor responds within one business day. Developer-backed opportunities only.`
    : DESCRIPTION_GENERIC;

  const canonical = `https://${canonicalHost}/concierge`;
  // canonical never carries query parameters (avoids duplicate-content with
  // ?property=… variants); og:url DOES include the property ref so social
  // previews land back on the right enquiry.
  const ogUrl = cleanedPropertyRef
    ? `https://${canonicalHost}/concierge?property=${encodeURIComponent(cleanedPropertyRef)}`
    : canonical;

  return Object.freeze({
    title,
    description,
    canonical,
    robots: 'index, follow',
    ogTitle: title,
    ogDescription: description,
    ogUrl,
    ogType: 'website',
    ogSiteName: BRAND_NAME,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    host: observedHost,
    canonicalHost,
    isLuxHost: isLux,
  });
}

export const __TEST_ONLY__ = Object.freeze({
  LUX_HOSTS,
  LUX_PRIMARY_HOST,
  BRAND_NAME,
  TITLE_BASE,
});

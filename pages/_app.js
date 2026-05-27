import React from 'react';
import Head from 'next/head';

/**
 * Custom App for SEO + accessibility baseline (Packet 4.1 / Lux SEO fix).
 *
 * Why this exists:
 *  - Next.js default viewport meta is `width=device-width` only (no
 *    `initial-scale=1`). That fails Lighthouse SEO and can cause iOS
 *    double-tap-to-zoom artefacts. We set a single canonical viewport
 *    here so individual page components don't have to repeat it.
 *  - Per-page `<Head>` (title, description, canonical, OG, Twitter)
 *    is unchanged and lives in each page's component.
 *
 * Why analytics is NOT mounted here anymore (2026-05-27):
 *  - The Plausible script is now injected SSR-side from
 *    `pages/_document.js` so it appears in the initial HTML response
 *    that Plausible's `Verify your installation` step inspects. The
 *    apex-only allow list, operator-surface deny list, kill-switch,
 *    and host/path policy still live in `lib/analytics/`. The Document
 *    just calls `resolveAnalyticsForRequest({ host, path })` and emits
 *    the canonical `<script defer data-domain="…" src="…">` tag.
 *  - Removing the hydration-only mount also removes the small race
 *    where `window.location.hostname` was read in `useEffect` before
 *    the script could fire — which is why `curl` showed zero Plausible
 *    matches even though the bundle shipped the JSX.
 *
 * Scope: no runtime behaviour change beyond moving the analytics
 * mount from client-side hydration to server-side render. No data
 * fetching, no tenant-data access. See
 * `docs/analytics/CORPFLOW_ANALYTICS_V1.md` § 4.5.
 */
export default function CorpFlowApp({ Component, pageProps }) {
  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}

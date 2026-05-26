import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

import PlausibleScript from '../components/analytics/PlausibleScript.js';
import {
  isAnalyticsEnabledByEnv,
  isAnalyticsEnabledForHostPath,
} from '../lib/analytics/index.js';

/**
 * Custom App for SEO + accessibility baseline (Packet 4.1 / Lux SEO fix)
 * + the analytics mount point (CorpFlow Analytics v1).
 *
 * Why this exists:
 * - Next.js default viewport meta is `width=device-width` only (no `initial-scale=1`).
 *   That fails Lighthouse SEO + can cause iOS double-tap-to-zoom artifacts.
 * - We set a single canonical viewport for every page here so individual page
 *   components (CorpFlowPublicHome, LuxeMauriceTenantPresentation,
 *   AiLeadRescueLanding, …) don't have to repeat it.
 * - Plausible Auto snippet is conditionally mounted from this file so the
 *   host/path policy in `lib/analytics/config.js` is the single decision
 *   surface — no per-page repetition, no risk of leaking analytics into
 *   factory/operator routes (`/change`, `/admin`, `/login`, `/api/*`),
 *   tenant working surfaces (`<tenant>.corpflowai.com`), or apex internal
 *   product paths (`/lead-rescue`, `/concierge`, `/properties`, `/property`).
 *
 * Per-page `<Head>` (title, description, canonical, OG, Twitter) is unchanged
 * and lives in each page's component.
 *
 * Scope: no runtime behavior change beyond the analytics mount; no data
 * fetching; no tenant-data access. The analytics decision is host + path
 * only — see `docs/analytics/CORPFLOW_ANALYTICS_V1.md` § 5.
 */
export default function CorpFlowApp({ Component, pageProps }) {
  const router = useRouter();
  const [host, setHost] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHost(window.location.hostname || '');
    }
  }, []);

  const analyticsOn =
    isAnalyticsEnabledByEnv() &&
    Boolean(host) &&
    isAnalyticsEnabledForHostPath(host, router.asPath);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      {analyticsOn ? <PlausibleScript /> : null}
      <Component {...pageProps} />
    </>
  );
}

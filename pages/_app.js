import React from 'react';
import Head from 'next/head';

/**
 * Custom App for SEO + accessibility baseline (Packet 4.1 / Lux SEO fix).
 *
 * Why this exists:
 * - Next.js default viewport meta is `width=device-width` only (no `initial-scale=1`).
 *   That fails Lighthouse SEO + can cause iOS double-tap-to-zoom artifacts.
 * - We set a single canonical viewport for every page here so individual page
 *   components (CorpFlowPublicHome, LuxeMauriceTenantPresentation,
 *   AiLeadRescueLanding, …) don't have to repeat it.
 *
 * Per-page `<Head>` (title, description, canonical, OG, Twitter) is unchanged
 * and lives in each page's component — Next.js merges Head children correctly
 * so this file does not interfere with the existing AI Lead Rescue OG block,
 * the apex CorpFlowAI title, or the LuxeMaurice page title.
 *
 * Scope: no runtime behavior change, no data fetching, no tenant-data access.
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

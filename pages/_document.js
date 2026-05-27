import Document, { Html, Head, Main, NextScript } from 'next/document';

import { resolveAnalyticsForRequest } from '../lib/analytics/index.js';

/**
 * Custom Document for SEO + accessibility baseline + canonical SSR
 * Plausible install (CorpFlow Analytics v1).
 *
 * SEO / a11y baseline (Packet 4.1 / Lux SEO fix):
 *  - Sets `<html lang="en">` (Lighthouse "html-has-lang").
 *  - Exposes a default `theme-color` for mobile browser chrome.
 *  - Per-page Head components are free to override per-locale.
 *
 * Plausible install (this file, since 2026-05-27):
 *  - Plausible verification (the `Verify your installation` button on
 *    the Plausible dashboard) inspects the *initial server response*
 *    for a `<script ... data-domain="…">` tag in `<head>`.
 *  - The previous adapter mounted the script via `next/script`
 *    `afterInteractive` from `pages/_app.js`, which only injects after
 *    React hydration on the client. That worked for real visitors but
 *    failed verification because verification doesn't always execute
 *    JS, and even when it does, it can race the deferred hydration.
 *  - We now emit the canonical Plausible snippet directly into the
 *    SSR `<head>` here:
 *
 *        <script defer data-domain="corpflowai.com"
 *                src="https://plausible.io/js/script.js"></script>
 *
 *  - The decision of whether to emit it lives in the pure helper
 *    `resolveAnalyticsForRequest({ host, path })` in
 *    `lib/analytics/index.js`. That helper composes the existing
 *    apex-only allow list, the path deny list (`/change`, `/change-v2`,
 *    `/admin`, `/login`, factory/master/lux-editor/etc., reset-password
 *    substrings, token-bearing query keys), and the kill-switch env
 *    `NEXT_PUBLIC_PLAUSIBLE_ENABLED`. No tenant data flows through.
 *
 *  - Lux (`lux.corpflowai.com`) and every other tenant subdomain stay
 *    excluded by `ALLOW_HOSTS`. Operator surfaces stay excluded by
 *    `DENY_PATH_PREFIXES`. Password-reset URLs stay excluded by the
 *    substring/query deny lists. None of those gates change.
 *
 * Static-export caveat: `Document.getInitialProps` runs at request
 * time on every SSR page (including the apex root `/`, which uses
 * `getServerSideProps`). For statically-optimised pages without per-
 * request rendering, `ctx.req` is undefined; we treat that as "no
 * host" and emit nothing. Plausible verification only needs the apex
 * root, which is SSR — see ADR
 * `docs/decisions/20260527-plausible-apex-only-rollout-step1.md`.
 *
 * Viewport meta is still set in `pages/_app.js` per Next.js convention.
 */

export default class CorpFlowDocument extends Document {
  static async getInitialProps(ctx) {
    const initialProps = await Document.getInitialProps(ctx);

    const host =
      (ctx && ctx.req && ctx.req.headers && ctx.req.headers.host) || '';
    const path =
      (ctx && (ctx.asPath || ctx.pathname)) || '/';

    const analytics = resolveAnalyticsForRequest({ host, path });

    return { ...initialProps, analytics };
  }

  render() {
    const { analytics } = this.props;
    const plausibleEnabled = Boolean(analytics && analytics.enabled);

    return (
      <Html lang="en">
        <Head>
          <meta name="theme-color" content="#0a0a0a" />
          {plausibleEnabled ? (
            <script
              defer
              data-domain={analytics.domain}
              src={analytics.src}
            />
          ) : null}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

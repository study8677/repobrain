import Document, { Html, Head, Main, NextScript } from 'next/document';

import {
  buildSsgRuntimeLoaderScript,
  resolveAnalyticsForRequest,
} from '../lib/analytics/index.js';

/**
 * Custom Document for SEO + accessibility baseline + canonical SSR
 * Plausible install (CorpFlow Analytics v1) + self-hosted Inter Variable
 * (CorpFlowAI Brand Identity v1, Phase B step 2 — 2026-05-30).
 *
 * SEO / a11y baseline (Packet 4.1 / Lux SEO fix):
 *  - Sets `<html lang="en">` (Lighthouse "html-has-lang").
 *  - Exposes a default `theme-color` for mobile browser chrome.
 *  - Per-page Head components are free to override per-locale.
 *
 * Self-hosted Inter Variable (this file, since 2026-05-30):
 *  - The CorpFlowAI v1 brand identity declares `Inter` as the
 *    canonical face and pins the colour `#2dd4bf` as the canonical
 *    accent — see `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`
 *    and the supersession notes in
 *    `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Typography
 *    direction*. Until this packet, every apex public component
 *    (`components/CorpFlowPublicHome.js`,
 *    `components/AiLeadRescueLanding.js`, `components/PublicPolicyLayout.js`,
 *    `components/AiLeadRescueAdmin*.js`) declared `font-family: 'Inter,
 *    ui-sans-serif, system-ui, …'` but no @font-face existed and no
 *    Google Fonts CDN link was emitted, so visitors saw the OS fallback
 *    (`ui-sans-serif` / `system-ui` / `BlinkMacSystemFont` / `Segoe UI`).
 *  - We now self-host Inter Variable (rsms/inter v4.1 release zip →
 *    `web/InterVariable.woff2`) at `/assets/fonts/InterVariable.woff2`
 *    under the SIL Open Font License 1.1. The single woff2 carries the
 *    full upright weight axis (100–900). The italic axis is intentionally
 *    not shipped — no apex component uses italic Inter today. Provenance,
 *    SHA-256s, and refresh procedure live in
 *    `public/assets/fonts/README.md`.
 *  - `@font-face` is declared globally in this file's `<Head>`.
 *    `font-display: swap` keeps first paint on the system fallback and
 *    swaps to Inter when the woff2 lands; no invisible text (FOIT).
 *  - We deliberately do **not** emit `<link rel="preload" as="font">`
 *    here. Without preload, the browser only fetches the woff2 when a
 *    rendered CSS rule matches `font-family: 'Inter'`. Apex pages
 *    reference `'Inter'` (download); Lux (`T.fontUi`/`T.fontDisplay`)
 *    and operator surfaces (`/change`, `/change-v2`, factory) do not
 *    (no download). Adding preload later for apex-only is a deliberate
 *    perf choice, not a default — re-scope the @font-face emission via
 *    `getInitialProps` if/when we decide to preload, the same way
 *    Plausible is scoped today.
 *  - `font/woff2` is a binary asset served from `/public/`; Vercel's
 *    static asset cache + `Cache-Control` defaults take care of the
 *    edge layer. No cron, no runtime side-effects, no DB row.
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
 * Two render strategies depending on `ctx.req` presence (since
 * 2026-06-03, JE-2026-06-03-4 — Cold-Sprint-V1-Tracking-Fix Option C):
 *
 *  1. **SSR (`ctx.req` defined — apex `/` via `getServerSideProps`,
 *     every page with per-request rendering).** Emit the canonical
 *     `<script defer data-domain="…" src="…">` tag. Plausible's
 *     "Verify your installation" probe inspects the initial server
 *     response and finds the tag on apex `/`. Per-host gating is
 *     decided here at request time — Lux / Core / preview hosts
 *     never receive the tag in the SSR response.
 *
 *  2. **SSG / static-prerender (`ctx.req` undefined — apex marketing
 *     pages like `/lead-rescue` built via `getStaticProps`).** Emit
 *     an inline `<script>` that runs in the visitor's browser, reads
 *     `window.location.hostname` + `pathname` + `search`, and only
 *     then conditionally appends the Plausible tag. The loader's
 *     policy data (`ALLOW_HOSTS`, deny lists, apex-specific denies,
 *     query-key denies, path substring denies, `APEX_HOST`) is
 *     serialised at build time from `lib/analytics/config.js`, so
 *     `lib/analytics/` remains the single source of truth — there is
 *     no second deny list to maintain elsewhere.
 *
 *     This is needed because CorpFlow runs a single Vercel project
 *     with one SSG output per route shared across many hosts; without
 *     a runtime host check, the prerendered HTML for `/lead-rescue`
 *     would inject Plausible when served from `lux.corpflowai.com` or
 *     `core.corpflowai.com` (both verified to currently serve the
 *     same apex SSG HTML on `/lead-rescue` per the PR #291 closure
 *     DRA). The runtime check restores the Lux / Core / preview deny
 *     boundary while enabling apex SSG event tracking.
 *
 *     Plausible verification is unaffected — it inspects the SSR apex
 *     `/`, not SSG pages.
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
    const requiresRuntimeHostCheck = Boolean(
      analytics && analytics.requiresRuntimeHostCheck,
    );

    return (
      <Html lang="en">
        <Head>
          <meta name="theme-color" content="#0a0a0a" />
          <style
            dangerouslySetInnerHTML={{
              __html:
                "@font-face{" +
                "font-family:'Inter';" +
                "font-style:normal;" +
                "font-weight:100 900;" +
                "font-display:swap;" +
                "src:url('/assets/fonts/InterVariable.woff2') format('woff2-variations')," +
                "url('/assets/fonts/InterVariable.woff2') format('woff2');" +
                "}",
            }}
          />
          {plausibleEnabled ? (
            requiresRuntimeHostCheck ? (
              <script
                dangerouslySetInnerHTML={{
                  __html: buildSsgRuntimeLoaderScript({
                    src: analytics.src,
                    domain: analytics.domain,
                  }),
                }}
              />
            ) : (
              <script
                defer
                data-domain={analytics.domain}
                src={analytics.src}
              />
            )
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

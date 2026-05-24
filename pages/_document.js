import Document, { Html, Head, Main, NextScript } from 'next/document';

/**
 * Custom Document for SEO + accessibility baseline.
 *
 * Why this exists (Packet 4.1 / Lux SEO fix):
 * - The default Next.js render produces `<html>` with no `lang` attribute, which fails
 *   Lighthouse Accessibility ("html-has-lang"). This sets a deterministic default of
 *   `lang="en"`. Per-page Head components are free to override per-locale.
 * - We also expose a default `theme-color` so mobile browsers paint the URL bar
 *   consistently across the apex and tenant marketing surfaces.
 *
 * Scope: this file does not change runtime behavior, fetch data, or touch tenant
 * data. It only controls the static HTML envelope.
 *
 * Viewport meta is set in `pages/_app.js` per Next.js convention (the framework
 * complains if `<meta name="viewport">` is placed in `_document` Head).
 */

export default class CorpFlowDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <meta name="theme-color" content="#0a0a0a" />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

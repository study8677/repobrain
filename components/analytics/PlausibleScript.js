import React from 'react';
import Script from 'next/script';

/**
 * Plausible standard snippet (the `script.js` flavour with a `data-domain`
 * attribute that names the Plausible site).
 *
 * Why standard (not Auto):
 * - The Plausible site for `corpflowai.com` was registered as a standard
 *   site (verification expects `<script src=".../script.js" data-domain="…">`).
 * - Site identity is in the `data-domain` attribute, NOT the script URL.
 * - This component reads the URL from `NEXT_PUBLIC_PLAUSIBLE_SRC` and the
 *   domain from `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`, both falling back to safe
 *   apex defaults so a missing env still produces a valid tag for the
 *   apex.
 *
 * Host + path gating happens upstream (lib/analytics/index.js); this
 * component is purely the script mount.
 *
 * Custom events (CTA clicks, form submits) ride the same `window.plausible`
 * queue the standard snippet installs; the init shim below makes the
 * queue safe to call before the script finishes downloading.
 */

export const DEFAULT_PLAUSIBLE_SRC = 'https://plausible.io/js/script.js';
export const DEFAULT_PLAUSIBLE_DOMAIN = 'corpflowai.com';

const PLAUSIBLE_INIT_SHIM = `
window.plausible = window.plausible || function () {
  (window.plausible.q = window.plausible.q || []).push(arguments);
};
`.trim();

export default function PlausibleScript() {
  const src =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_PLAUSIBLE_SRC) ||
    DEFAULT_PLAUSIBLE_SRC;

  const domain =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN) ||
    DEFAULT_PLAUSIBLE_DOMAIN;

  return (
    <>
      <Script
        id="plausible-tracker"
        src={src}
        data-domain={domain}
        strategy="afterInteractive"
      />
      <Script id="plausible-init" strategy="afterInteractive">
        {PLAUSIBLE_INIT_SHIM}
      </Script>
    </>
  );
}

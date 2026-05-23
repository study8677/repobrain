import React from 'react';

import { isAiGeneratedManifest } from '../lib/visualAssets/aiProvenance.js';

/**
 * Render a governed visual-asset manifest safely.
 *
 * Inputs are manifest objects produced by `lib/visualAssets/schema.js`
 * (validated upstream by `loadManifest.js`). The renderer never
 * fetches or mutates anything; it just maps a manifest's `kind` and
 * `source` to a small, accessibility-safe DOM tree.
 *
 * Supported kinds (per task brief):
 *   - `image`         → `<img>` tag, lazy-loaded, responsive
 *   - `illustration`  → same as image (a stylised image)
 *   - `icon`          → `<img>` rendered at icon scale
 *   - `video`         → `<video>` for short-loop video assets
 *                       (autoplay/muted/loop/playsInline; respects
 *                       `prefers-reduced-motion` via `disableAutoplay`)
 *   - `social_card`   → `<img>` (used as block image when surfaced)
 *   - `lottie`        → falls back to a static image if a poster URL
 *                       is provided, otherwise renders nothing
 *                       (no JSON player dependency by design)
 *
 * Accessibility:
 *   - `accessibility.alt` is mandatory for image-shaped kinds (the
 *     schema enforces this; we re-enforce at render).
 *   - When `accessibility.decorative === true`, the asset is rendered
 *     with `alt=""` and `aria-hidden="true"` regardless of any alt
 *     value present in the manifest.
 *   - `lang` is propagated to the wrapping element when set.
 *
 * Responsive sizing:
 *   - `style.maxWidth: 100%` and `height: auto` ensure the asset
 *     scales with the container without losing intrinsic ratio.
 *   - `width` / `height` from `manifest.source` are passed through as
 *     intrinsic-size attributes when available — this avoids
 *     cumulative-layout-shift on first paint.
 *
 * Lazy loading:
 *   - All image-shaped kinds default to `loading="lazy"`,
 *     `decoding="async"`. Override with `eager={true}` for above-fold
 *     hero usage.
 *
 * The component is intentionally framework-light: no Next.js
 * `<Image>` dependency yet, because manifests today reference both
 * repo paths and arbitrary public CDN URLs and the next/image
 * loader/policy varies per host. We may upgrade to next/image once
 * the asset model and CDN policy stabilise.
 */

const KIND_IMAGE_LIKE = new Set(['image', 'illustration', 'icon', 'social_card']);

/**
 * Resolve the actual rendering URL for an asset given its manifest's
 * `source` block. Returns `null` if no usable URL/path exists.
 *
 * - `repo`              → `source.path` (must already be served as a
 *                         static file under `/public/...`)
 * - `cdn` /
 *   `external_public_url`/
 *   `ai_generated`      → `source.url`
 *
 * @param {object} source
 * @returns {string | null}
 */
function resolveAssetSrc(source) {
  if (!source || typeof source !== 'object') return null;
  if (source.type === 'repo' && typeof source.path === 'string' && source.path.startsWith('/')) {
    return source.path;
  }
  if (typeof source.url === 'string' && /^https:\/\//.test(source.url)) {
    return source.url;
  }
  return null;
}

/**
 * Default visual size hints per kind. Pages can override by passing
 * `style` / `width` / `height` props. These are conservative: they
 * keep the homepage from rendering a 2400-px hero at its native
 * width on small viewports.
 */
const KIND_DEFAULT_STYLE = {
  image: { maxWidth: '100%', height: 'auto', display: 'block' },
  illustration: { maxWidth: '100%', height: 'auto', display: 'block' },
  social_card: { maxWidth: '100%', height: 'auto', display: 'block' },
  icon: { width: 32, height: 32, display: 'inline-block', verticalAlign: 'middle' },
  video: { maxWidth: '100%', height: 'auto', display: 'block' },
  lottie: { maxWidth: '100%', height: 'auto', display: 'block' },
};

/**
 * @typedef {object} VisualAssetRendererProps
 * @property {object | null | undefined} manifest validated visual-asset manifest
 * @property {boolean} [eager] disable lazy loading (use for above-fold hero)
 * @property {boolean} [disableAutoplay] for `video` kind, render without autoplay
 * @property {React.CSSProperties} [style] overrides merged on top of kind defaults
 * @property {string} [className] passed through
 * @property {number} [width] explicit intrinsic width
 * @property {number} [height] explicit intrinsic height
 */

/**
 * @param {VisualAssetRendererProps} props
 */
export default function VisualAssetRenderer(props) {
  const {
    manifest,
    eager = false,
    disableAutoplay = false,
    style,
    className,
    width,
    height,
  } = props || {};

  if (!manifest || typeof manifest !== 'object') return null;

  const kind = typeof manifest.kind === 'string' ? manifest.kind : '';
  const src = resolveAssetSrc(manifest.source);
  if (!src) return null;

  const a11y = manifest.accessibility && typeof manifest.accessibility === 'object' ? manifest.accessibility : {};
  const decorative = a11y.decorative === true;
  const altText = decorative ? '' : (typeof a11y.alt === 'string' ? a11y.alt : '');

  if (KIND_IMAGE_LIKE.has(kind) && !decorative && altText.trim().length === 0) {
    return null;
  }

  const intrinsicWidth = typeof width === 'number'
    ? width
    : (typeof manifest.source?.width === 'number' ? manifest.source.width : undefined);
  const intrinsicHeight = typeof height === 'number'
    ? height
    : (typeof manifest.source?.height === 'number' ? manifest.source.height : undefined);

  const mergedStyle = {
    ...(KIND_DEFAULT_STYLE[kind] || KIND_DEFAULT_STYLE.image),
    ...(style || {}),
  };

  const langAttr = typeof a11y.lang === 'string' && a11y.lang ? { lang: a11y.lang } : {};
  const ariaHidden = decorative ? { 'aria-hidden': 'true' } : {};

  if (kind === 'video') {
    return (
      <video
        src={src}
        muted
        loop
        playsInline
        autoPlay={!disableAutoplay}
        preload={eager ? 'auto' : 'metadata'}
        width={intrinsicWidth}
        height={intrinsicHeight}
        aria-label={decorative ? undefined : altText || undefined}
        className={className}
        style={mergedStyle}
        {...langAttr}
        {...ariaHidden}
      />
    );
  }

  if (kind === 'lottie') {
    const poster = typeof manifest.source?.poster_url === 'string' && /^https:\/\//.test(manifest.source.poster_url)
      ? manifest.source.poster_url
      : null;
    if (!poster) return null;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={poster}
        alt={altText}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        width={intrinsicWidth}
        height={intrinsicHeight}
        className={className}
        style={mergedStyle}
        {...langAttr}
        {...ariaHidden}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={altText}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      width={intrinsicWidth}
      height={intrinsicHeight}
      className={className}
      style={mergedStyle}
      {...langAttr}
      {...ariaHidden}
    />
  );
}

/**
 * Re-exported for callers that import the renderer (homepage, etc.).
 * The single source of truth for "is this manifest AI-generated?"
 * lives in `lib/visualAssets/aiProvenance.js` so non-React code (SSR,
 * tests) can use it without touching JSX.
 */
export { isAiGeneratedManifest };

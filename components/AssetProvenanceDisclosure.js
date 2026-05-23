import React from 'react';

import { isAiGeneratedManifest } from '../lib/visualAssets/aiProvenance.js';

/**
 * Small, expandable disclosure that surfaces AI provenance for
 * AI-generated visual assets shown on a customer-facing surface.
 *
 * Why:
 * - The CorpFlowAI brand-and-conversion doctrine demands clarity over
 *   cleverness. When a hero or social card on the public homepage is
 *   produced by AI tooling, hiding that fact erodes trust if the
 *   buyer later discovers it. A subtle disclosure that buyers can
 *   expand on demand satisfies the doctrine without creating visual
 *   noise.
 * - Companion governance: `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`.
 *
 * Behaviour:
 * - Renders nothing for non-AI manifests (`client_owned`,
 *   `corpflow_owned`, etc.). The homepage relies on this for "show
 *   only when AI-generated".
 * - Hidden by default, expandable on click — uses the native
 *   `<details>` / `<summary>` pattern so it works with no JavaScript,
 *   keyboard users, and assistive tech.
 * - Visually subtle: muted text, small caption-sized type, no
 *   coloured banner. Trust-enhancing, not attention-grabbing.
 * - Lists `model`, `model_version`, `prompt_id`, `reviewed_by` if
 *   present in `prompt_provenance`. Never reveals raw prompts (the
 *   prompt library is the source of truth and lives in-repo).
 */

const wrapStyle = {
  marginTop: 8,
  fontSize: 11,
  lineHeight: 1.5,
  color: '#9fb2c8',
};

const summaryStyle = {
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11,
  color: '#9fb2c8',
  userSelect: 'none',
  outlineOffset: 2,
};

const detailLineStyle = {
  marginTop: 6,
  paddingLeft: 14,
  borderLeft: '1px solid rgba(255,255,255,0.10)',
  color: '#aebfd1',
};

/**
 * @typedef {object} AssetProvenanceDisclosureProps
 * @property {object | null | undefined} manifest validated visual-asset manifest
 * @property {string} [label] override summary label
 * @property {React.CSSProperties} [style] override wrapper style
 */

/**
 * @param {AssetProvenanceDisclosureProps} props
 */
export default function AssetProvenanceDisclosure(props) {
  const { manifest, label, style } = props || {};
  if (!manifest || typeof manifest !== 'object') return null;
  if (!isAiGeneratedManifest(manifest)) return null;

  const provenance = manifest.prompt_provenance && typeof manifest.prompt_provenance === 'object'
    ? manifest.prompt_provenance
    : null;

  const summaryLabel = label || 'About this visual';
  const wrap = { ...wrapStyle, ...(style || {}) };

  return (
    <details style={wrap}>
      <summary style={summaryStyle} aria-label={summaryLabel}>
        <span aria-hidden="true">·</span>
        <span>{summaryLabel}</span>
      </summary>
      <div style={detailLineStyle}>
        Visual generated/assisted using AI tooling and reviewed by humans.
      </div>
      {provenance ? (
        <ul
          style={{
            margin: '6px 0 0',
            paddingLeft: 14,
            color: '#aebfd1',
            listStyle: 'none',
          }}
        >
          {typeof provenance.model === 'string' && provenance.model ? (
            <li>Model: {provenance.model}{provenance.model_version ? ` (${provenance.model_version})` : ''}</li>
          ) : null}
          {typeof provenance.prompt_id === 'string' && provenance.prompt_id ? (
            <li>Prompt id: {provenance.prompt_id}</li>
          ) : null}
          {typeof provenance.reviewed_by === 'string' && provenance.reviewed_by ? (
            <li>Reviewed by: {provenance.reviewed_by}</li>
          ) : null}
        </ul>
      ) : null}
    </details>
  );
}

/**
 * Re-exported for callers that want to gate UI ("show this section
 * only for AI-generated assets") without importing the renderer.
 */
export { isAiGeneratedManifest };

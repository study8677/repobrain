/**
 * Runtime loader for governed visual-asset manifests.
 *
 * This module is the *first runtime consumer slice* for the manifest
 * directory introduced in PR #202. It reads JSON manifests from
 * `data/visual-assets/`, validates them against the v1 schema, and
 * exposes them to render-time selectors (e.g. homepage slot mapping).
 *
 * Operating principles:
 *
 * - **Server-only.** Filesystem reads. Must be called from
 *   `getServerSideProps` / `getStaticProps` / API routes — never from
 *   client-side React. The result of the selectors is what gets
 *   serialized into props.
 * - **Dependency-free.** Uses only Node built-ins.
 * - **Safe.** Validates every manifest with
 *   `validateVisualAssetManifest()` from `./schema.js`. Refuses to
 *   surface invalid manifests at render time.
 * - **Strict in dev, soft in prod.** Invalid manifests throw with a
 *   clear message in development so authors fix them locally; in
 *   production we log and skip the offender so a single bad file
 *   cannot take down a customer-facing route. This matches
 *   `.cursor/rules/delivery-reality.mdc` — the live production
 *   surface must keep rendering even when content drifts.
 * - **No secrets.** The schema validator already rejects secret-like
 *   keys; this loader does not introduce any new trust boundaries.
 *
 * Companion docs:
 * - docs/marketing/CORPFLOW_CONTENT_MODEL.md
 * - docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  VISUAL_ASSET_SURFACES,
  validateVisualAssetManifest,
} from './schema.js';

const MANIFEST_FILE_RE = /\.manifest\.json$/i;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve the manifest directory once. Computed relative to this file
 * so the loader works from any CWD (Next.js build, node --test, scripts).
 *
 * `let` (rather than `const`) so tests can swap to a fixture directory
 * via `__setVisualAssetManifestDir()` without touching the real
 * `data/visual-assets/` tree. Production callers never mutate this.
 */
const DEFAULT_MANIFEST_DIR = path.resolve(__dirname, '..', '..', 'data', 'visual-assets');
let MANIFEST_DIR = DEFAULT_MANIFEST_DIR;

function isProduction() {
  return String(process.env.NODE_ENV || '').toLowerCase() === 'production';
}

function safeWarn(message, detail) {
  try {
    if (detail !== undefined) {
      console.warn(`[visualAssets] ${message}`, detail);
    } else {
      console.warn(`[visualAssets] ${message}`);
    }
  } catch {
    /* never throw from logging */
  }
}

/**
 * @typedef {object} VisualAssetManifest
 * @property {string} schema_version
 * @property {string} id
 * @property {string} surface
 * @property {string} kind
 * @property {string} title
 * @property {string} [description]
 * @property {{ type: string, url?: string, path?: string, content_hash?: string, width?: number, height?: number }} source
 * @property {{ tier: string, owner: string, terms: string }} licence
 * @property {{ alt?: string, lang?: string, decorative?: boolean }} accessibility
 * @property {{ allowed_surfaces: string[], primary_cta?: string, notes?: string }} usage
 * @property {{ state: string, created_at?: string, reviewed_at?: string, retired_at?: string }} lifecycle
 * @property {{ prompt_id: string, model: string, model_version?: string, generated_at?: string, seed?: string, reviewed_by?: string, notes?: string }} [prompt_provenance]
 */

/**
 * Internal: read + parse a single manifest file.
 *
 * @param {string} filePath absolute path to a `*.manifest.json` file
 * @returns {VisualAssetManifest | null}
 */
function readAndValidateManifest(filePath) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch (err) {
    const msg = `failed to read manifest at ${filePath}: ${err && err.message ? err.message : 'unknown error'}`;
    if (!isProduction()) {
      throw new Error(msg);
    }
    safeWarn(msg);
    return null;
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const msg = `manifest at ${filePath} is not valid JSON: ${err && err.message ? err.message : 'parse error'}`;
    if (!isProduction()) {
      throw new Error(msg);
    }
    safeWarn(msg);
    return null;
  }

  const result = validateVisualAssetManifest(parsed, { source: path.basename(filePath) });
  if (!result.ok) {
    const formatted = result.errors
      .map((e) => `  - ${e.path}: ${e.message}`)
      .join('\n');
    const msg = `manifest at ${filePath} failed schema validation:\n${formatted}`;
    if (!isProduction()) {
      throw new Error(msg);
    }
    safeWarn(msg);
    return null;
  }

  return /** @type {VisualAssetManifest} */ (parsed);
}

/**
 * Internal cache. Cleared in tests via `__resetVisualAssetManifestCache`.
 *
 * In production the manifest directory is part of the deployed bundle
 * and never changes between requests, so caching is safe and avoids
 * repeated filesystem walks per render.
 */
let cachedAll = null;
/** @type {Map<string, VisualAssetManifest>} */
let cachedById = new Map();

/**
 * @internal — exported for tests so they can isolate one another.
 */
export function __resetVisualAssetManifestCache() {
  cachedAll = null;
  cachedById = new Map();
}

/**
 * Internal: list manifest files on disk. Returns absolute paths.
 *
 * @returns {string[]}
 */
function listManifestFilesOnDisk() {
  if (!existsSync(MANIFEST_DIR)) {
    safeWarn(`manifest directory not found at ${MANIFEST_DIR}; returning empty set`);
    return [];
  }

  let entries;
  try {
    entries = readdirSync(MANIFEST_DIR);
  } catch (err) {
    const msg = `failed to read manifest directory ${MANIFEST_DIR}: ${err && err.message ? err.message : 'unknown error'}`;
    if (!isProduction()) {
      throw new Error(msg);
    }
    safeWarn(msg);
    return [];
  }

  const files = [];
  for (const name of entries) {
    if (!MANIFEST_FILE_RE.test(name)) continue;
    const full = path.join(MANIFEST_DIR, name);
    try {
      if (statSync(full).isFile()) files.push(full);
    } catch {
      /* skip unreadable entries silently */
    }
  }
  return files.sort();
}

/**
 * Internal: load + validate every manifest. Cached.
 *
 * @returns {VisualAssetManifest[]}
 */
function loadAllManifests() {
  if (cachedAll !== null) return cachedAll;

  const files = listManifestFilesOnDisk();
  const out = [];
  for (const file of files) {
    const m = readAndValidateManifest(file);
    if (m) out.push(m);
  }

  cachedAll = out;
  cachedById = new Map(out.map((m) => [m.id, m]));
  return out;
}

/**
 * Load a single visual-asset manifest by id.
 *
 * Returns the parsed and validated manifest, or `null` when no
 * manifest with that id exists. **Does not throw** for "not found";
 * callers can decide whether absence is an error in their context
 * (e.g. a homepage slot is allowed to be empty per task brief
 * "no broken rendering if manifest missing").
 *
 * In development, malformed manifests in the directory will throw
 * during the first call so authors fix them before merging. In
 * production, malformed manifests are skipped and logged; the bad id
 * will simply not resolve.
 *
 * @param {string} id manifest id (kebab-case, matches `m.id`)
 * @returns {VisualAssetManifest | null}
 */
export function loadVisualAssetManifest(id) {
  if (typeof id !== 'string' || id.length === 0) return null;
  loadAllManifests();
  const found = cachedById.get(id);
  return found ? found : null;
}

/**
 * List manifests, optionally filtered to those usable on a given
 * surface. A manifest is "usable on surface X" when:
 *
 * 1. its `surface` is `X`, or
 * 2. its `usage.allowed_surfaces` includes `X` (cross-surface reuse,
 *    e.g. a `shared` icon used on `core`).
 *
 * Pass `surface = null` (or omit) to get every loaded manifest.
 *
 * Always returns published-or-vetted manifests by default; retired or
 * draft manifests are filtered out so they cannot accidentally render
 * on a customer-facing surface. Callers that need draft assets (e.g.
 * preview tooling) should pass `{ includeAllStates: true }`.
 *
 * @param {string | null} [surface]
 * @param {{ includeAllStates?: boolean }} [opts]
 * @returns {VisualAssetManifest[]}
 */
export function listVisualAssetManifests(surface, opts = {}) {
  const all = loadAllManifests();

  let filtered = all;
  if (typeof surface === 'string' && surface.length > 0) {
    if (!VISUAL_ASSET_SURFACES.includes(surface)) {
      const msg = `listVisualAssetManifests: unknown surface "${surface}"; valid surfaces: ${VISUAL_ASSET_SURFACES.join(', ')}`;
      if (!isProduction()) {
        throw new Error(msg);
      }
      safeWarn(msg);
      return [];
    }
    filtered = filtered.filter((m) => {
      if (m.surface === surface) return true;
      const allowed = Array.isArray(m.usage?.allowed_surfaces) ? m.usage.allowed_surfaces : [];
      return allowed.includes(surface);
    });
  }

  if (!opts.includeAllStates) {
    filtered = filtered.filter((m) => {
      const state = m.lifecycle?.state;
      return state === 'vetted' || state === 'published';
    });
  }

  return filtered;
}

/**
 * @internal — for tests that want a deterministic root.
 */
export function __getVisualAssetManifestDir() {
  return MANIFEST_DIR;
}

/**
 * @internal — point the loader at a fixture directory (tests only).
 * Always followed by a cache reset so the next load reads the new
 * directory.
 *
 * @param {string} dir absolute path
 */
export function __setVisualAssetManifestDir(dir) {
  if (typeof dir !== 'string' || dir.length === 0) {
    throw new Error('__setVisualAssetManifestDir: dir must be a non-empty string');
  }
  MANIFEST_DIR = dir;
  __resetVisualAssetManifestCache();
}

/**
 * @internal — restore the default (data/visual-assets) directory.
 */
export function __restoreVisualAssetManifestDir() {
  MANIFEST_DIR = DEFAULT_MANIFEST_DIR;
  __resetVisualAssetManifestCache();
}

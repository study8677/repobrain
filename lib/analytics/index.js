/**
 * Analytics public API — host/path policy + env kill-switch.
 *
 * The script tag does not load on a deny-listed surface. The kill-switch
 * env (`NEXT_PUBLIC_PLAUSIBLE_ENABLED`) defaults to disabled — so a fresh
 * Vercel deploy is silent until an operator opts in.
 *
 * No per-tenant data ever flows through this module. Host + path only.
 */

import {
  ALLOW_HOSTS,
  APEX_DENY_PATH_PREFIXES,
  APEX_HOST,
  DENY_HOST_EXACT,
  DENY_HOST_SUFFIX,
  DENY_PATH_PREFIXES,
  DENY_PATH_SUBSTRINGS,
  DENY_QUERY_KEYS,
  MARKETING_SURFACE_BY_HOST,
} from './config.js';

export function normalizeHost(host) {
  if (!host || typeof host !== 'string') return '';
  return host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
}

function splitPathAndQuery(rawPath) {
  if (!rawPath || typeof rawPath !== 'string') return { path: '/', query: '' };
  const q = rawPath.indexOf('?');
  if (q === -1) return { path: rawPath, query: '' };
  return { path: rawPath.substring(0, q), query: rawPath.substring(q + 1) };
}

/**
 * Word-boundary match used for global deny prefixes.
 * Matches `<prefix>`, `<prefix>/...`, AND `<prefix>-...` so that operator
 * route variants (`/change`, `/change-v2`, `/admin`, `/admin-tools`) are
 * all denied as one family. A future `/changelog` would NOT be denied.
 */
function pathMatchesWordBoundary(path, prefix) {
  return (
    path === prefix ||
    path.startsWith(prefix + '/') ||
    path.startsWith(prefix + '-')
  );
}

/**
 * Slash-only match used for apex-specific deny prefixes.
 * Matches `<prefix>` and `<prefix>/...` only — sibling-with-dash paths
 * like `/lead-rescue-news` or `/property-search` (if ever added as
 * public marketing) remain allowed; only the literal internal path
 * and its sub-tree are denied.
 */
function pathMatchesSlashOnly(path, prefix) {
  return path === prefix || path.startsWith(prefix + '/');
}

export function isHostAllowed(host) {
  const h = normalizeHost(host);
  if (!h) return false;
  if (DENY_HOST_EXACT.includes(h)) return false;
  if (DENY_HOST_SUFFIX.some((s) => h.endsWith(s))) return false;
  return ALLOW_HOSTS.includes(h);
}

export function isPathAllowed(host, fullPath) {
  const h = normalizeHost(host);
  const { path, query } = splitPathAndQuery(fullPath || '/');

  for (const sub of DENY_PATH_SUBSTRINGS) {
    if (path.includes(sub)) return false;
  }

  for (const prefix of DENY_PATH_PREFIXES) {
    if (prefix.endsWith('/')) {
      if (path.startsWith(prefix)) return false;
    } else if (pathMatchesWordBoundary(path, prefix)) {
      return false;
    }
  }

  if (h === APEX_HOST) {
    for (const prefix of APEX_DENY_PATH_PREFIXES) {
      if (pathMatchesSlashOnly(path, prefix)) return false;
    }
  }

  if (query) {
    const params = query.split('&');
    for (const key of DENY_QUERY_KEYS) {
      if (params.some((p) => p === key || p.startsWith(key + '='))) return false;
    }
  }

  return true;
}

export function isAnalyticsEnabledForHostPath(host, fullPath) {
  if (!isHostAllowed(host)) return false;
  if (!isPathAllowed(host, fullPath)) return false;
  return true;
}

export function getMarketingSurface(host) {
  const h = normalizeHost(host);
  return MARKETING_SURFACE_BY_HOST[h] || null;
}

export function isAnalyticsEnabledByEnv() {
  const v =
    (typeof process !== 'undefined' &&
      process.env &&
      process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED) ||
    '';
  return String(v).toLowerCase() === 'true';
}

export const ANALYTICS_INTERNAL_FOR_TESTS = Object.freeze({
  ALLOW_HOSTS,
  DENY_HOST_EXACT,
  DENY_HOST_SUFFIX,
  DENY_PATH_PREFIXES,
  APEX_DENY_PATH_PREFIXES,
  DENY_PATH_SUBSTRINGS,
  DENY_QUERY_KEYS,
  MARKETING_SURFACE_BY_HOST,
});

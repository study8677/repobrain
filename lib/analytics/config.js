/**
 * Analytics policy — single source of truth for which hosts and paths
 * are allowed to load the Plausible snippet.
 *
 * Canonical reference:
 * - docs/analytics/CORPFLOW_ANALYTICS_V1.md (§2 stakeholder grouping, §5 deny lists)
 * - docs/decisions/20260527-plausible-apex-only-rollout-step1.md
 * - docs/decisions/20260526-plausible-internal-vs-client-facing-boundary.md (umbrella ADR; superseded for v1 step-1 only)
 *
 * Policy summary (v1 step-1, 2026-05-27):
 *   ALLOW (load script):
 *     - corpflowai.com  (apex marketing only)         → marketing_surface = "apex"
 *
 *   DENY (never load script):
 *     - core.corpflowai.com (factory)
 *     - lux.corpflowai.com, all <tenant>.corpflowai.com (tenant working/staging surfaces)
 *     - aileadrescue.corpflowai.com (deferred to step-2; see ADR 20260527)
 *     - localhost, *.vercel.app (dev / preview)
 *     - any path under /change, /admin, /login, /master, /lux-editor,
 *       /lux-guide, /sovereign-intake, /core-lux-migration-repair,
 *       /api/, /_next/, /client/
 *     - on the apex specifically: /concierge, /properties, /property
 *       (tenant-context routes; never apex marketing)
 *     - any URL with a token-bearing query param (?token=, ?reset=, ?ticket=)
 *     - any path containing "reset-password" or "forgot-password"
 *
 * Note: /lead-rescue on the apex IS apex public marketing in step-1
 * (per the 2026-05-27 decision update — Lead Rescue lives at
 * corpflowai.com/lead-rescue today; the dedicated subdomain is a
 * future step). It is therefore NOT in APEX_DENY_PATH_PREFIXES.
 */

export const ALLOW_HOSTS = Object.freeze([
  'corpflowai.com',
]);

export const DENY_HOST_EXACT = Object.freeze([
  'core.corpflowai.com',
  'localhost',
]);

export const DENY_HOST_SUFFIX = Object.freeze([
  '.vercel.app',
]);

/**
 * DENY_PATH_PREFIXES use a word-boundary match: the path matches if it
 * equals the prefix, starts with `<prefix>/`, or starts with `<prefix>-`
 * (so operator route variants like `/change-v2` are denied alongside
 * `/change` and `/change/queue`, but a future public `/changelog` would
 * NOT be denied — operators name variants with `-`, not as solid words).
 *
 * Prefixes that already end with `/` (e.g. `/api/`, `/client/`) match by
 * plain string-startsWith, since the trailing slash already encodes the
 * boundary.
 */
export const DENY_PATH_PREFIXES = Object.freeze([
  '/change',
  '/admin',
  '/login',
  '/master',
  '/lux-editor',
  '/lux-guide',
  '/sovereign-intake',
  '/core-lux-migration-repair',
  '/api/',
  '/_next/',
  '/client/',
]);

export const APEX_DENY_PATH_PREFIXES = Object.freeze([
  '/concierge',
  '/properties',
  '/property',
]);

export const DENY_PATH_SUBSTRINGS = Object.freeze([
  'reset-password',
  'forgot-password',
]);

export const DENY_QUERY_KEYS = Object.freeze([
  'token',
  'reset',
  'ticket',
]);

export const MARKETING_SURFACE_BY_HOST = Object.freeze({
  'corpflowai.com': 'apex',
});

export const APEX_HOST = 'corpflowai.com';

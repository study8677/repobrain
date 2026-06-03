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

/**
 * Canonical Plausible script defaults.
 *
 * The script URL identifies the Plausible *flavour* (vanilla, +exclusions,
 * +outbound-links, etc.). The data-domain attribute identifies the *site*
 * registered in the Plausible dashboard. Per the umbrella decision in
 * `docs/decisions/20260527-plausible-apex-only-rollout-step1.md`, the
 * step-1 site identity is the apex `corpflowai.com`.
 */
export const DEFAULT_PLAUSIBLE_SRC = 'https://plausible.io/js/script.js';
export const DEFAULT_PLAUSIBLE_DOMAIN = 'corpflowai.com';

/**
 * Path-only deny check used by the SSG-build fallback in
 * `resolveAnalyticsForRequest`. Applies every path-shaped deny rule
 * that does NOT depend on knowing the host:
 *   - global `DENY_PATH_PREFIXES` (operator routes, `/api/`, `/_next/`,
 *     `/client/`) using the same word-boundary semantics as
 *     `isPathAllowed`;
 *   - `DENY_PATH_SUBSTRINGS` (reset-password / forgot-password);
 *   - `DENY_QUERY_KEYS` (token-bearing query strings).
 *
 * Apex-specific denies (`APEX_DENY_PATH_PREFIXES` — `/concierge`,
 * `/properties`, `/property`) are intentionally NOT applied here
 * because they only apply when the visitor's host equals
 * `APEX_HOST`. The SSG-build fallback emits a runtime host-gating
 * loader that re-applies all checks (including apex-specific denies)
 * against the real `window.location.hostname`, so the apex denies
 * are enforced at the right layer.
 *
 * Returns `true` when the path passes all host-independent denies.
 */
function isPathAllowedWithoutHost(fullPath) {
  const raw = fullPath || '/';
  const q = raw.indexOf('?');
  const path = q === -1 ? raw : raw.substring(0, q);
  const query = q === -1 ? '' : raw.substring(q + 1);
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
  if (query) {
    const params = query.split('&');
    for (const key of DENY_QUERY_KEYS) {
      if (params.some((p) => p === key || p.startsWith(key + '='))) return false;
    }
  }
  return true;
}

/**
 * Pure decision helper used by `pages/_document.js`. Returns
 * `{ enabled, src, domain, requiresRuntimeHostCheck }` so the Document
 * only has to render the tag — the policy lives here.
 *
 * Two render strategies, one helper:
 *
 * 1. **SSR (host known, `ctx.req.headers.host` populated).** Standard
 *    behaviour since `JE-2026-05-27-1`: emit the canonical static
 *    `<script defer data-domain=… src=…>` tag iff the host is on
 *    `ALLOW_HOSTS` and the path passes every deny check. Plausible's
 *    "Verify your installation" probe inspects the initial server
 *    response and finds this tag on apex `/` (which is SSR via
 *    `getServerSideProps`).
 *
 *    Returned with `requiresRuntimeHostCheck: false`.
 *
 * 2. **SSG / static-prerender (host unknown — `ctx.req` undefined,
 *    `host === ''`).** New behaviour added 2026-06-03 by
 *    `JE-2026-06-03-4` (Cold-Sprint-V1-Tracking-Fix Option C). At
 *    build time the host header is unavailable, so a host-aware
 *    decision is impossible. We fall back to the configured public
 *    Plausible domain (`NEXT_PUBLIC_PLAUSIBLE_DOMAIN` or
 *    `DEFAULT_PLAUSIBLE_DOMAIN`) and mark the result with
 *    `requiresRuntimeHostCheck: true` so the Document renderer emits
 *    an **inline host-gating loader** (see `buildSsgRuntimeLoaderScript`)
 *    instead of the static `<script>` tag.
 *
 *    The loader executes in the visitor's browser, reads the real
 *    `window.location.hostname` + `pathname` + `search`, re-applies
 *    the SAME policy data from `lib/analytics/config.js` (allow list,
 *    deny lists, apex-specific denies, query-key denies, path
 *    substring denies), and only then dynamically appends the
 *    Plausible `<script>` tag to `<head>`.
 *
 *    This preserves the Lux / Core / preview deny boundary in
 *    CorpFlow's single-build multi-host Vercel deployment: the same
 *    prerendered HTML for `/lead-rescue` may be served from
 *    `corpflowai.com`, `lux.corpflowai.com`, `core.corpflowai.com`,
 *    or a `*.vercel.app` preview, and only the apex visitors get the
 *    Plausible script. Path-only denies that can be decided
 *    statically (e.g., a hypothetical SSG `/admin/*` page, a
 *    `?token=…` query, a `reset-password` URL) are also short-circuited
 *    at build time so the loader script is never emitted for paths
 *    that can never be allowed.
 *
 *    Returned with `requiresRuntimeHostCheck: true`.
 *
 * Kill-switch (`NEXT_PUBLIC_PLAUSIBLE_ENABLED`) is checked first and
 * shuts off both strategies. The kill-switch + config envs are the
 * only env vars touched.
 */
export function resolveAnalyticsForRequest({ host, path } = {}) {
  if (!isAnalyticsEnabledByEnv()) {
    return {
      enabled: false,
      src: null,
      domain: null,
      requiresRuntimeHostCheck: false,
    };
  }

  const normalisedHost = normalizeHost(host);
  const fullPath = path || '/';

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

  if (normalisedHost) {
    if (!isAnalyticsEnabledForHostPath(normalisedHost, fullPath)) {
      return {
        enabled: false,
        src: null,
        domain: null,
        requiresRuntimeHostCheck: false,
      };
    }
    return { enabled: true, src, domain, requiresRuntimeHostCheck: false };
  }

  if (!isPathAllowedWithoutHost(fullPath)) {
    return {
      enabled: false,
      src: null,
      domain: null,
      requiresRuntimeHostCheck: false,
    };
  }

  return { enabled: true, src, domain, requiresRuntimeHostCheck: true };
}

/**
 * Build the inline runtime host-gating loader script emitted into SSG
 * pages when `resolveAnalyticsForRequest` returns
 * `requiresRuntimeHostCheck: true`. The returned string is plain
 * vanilla JavaScript (no module syntax, no external dependencies, IE11
 * subset safe). The Document component wraps it in a
 * `<script dangerouslySetInnerHTML>` tag and ships it inline so it
 * runs synchronously during HTML parse, before any chunk loads.
 *
 * The loader is the runtime mirror of the same policy data exported by
 * `lib/analytics/config.js`. Both the allow list and every deny list
 * are serialised into the script as inline literals; the loader does
 * not import or fetch anything. This keeps `lib/analytics/` as the
 * single source of truth — there is no second deny list to maintain
 * elsewhere in the codebase.
 *
 * Outcomes (matches the SSR-time `isAnalyticsEnabledForHostPath`
 * surface exactly):
 *  - apex `corpflowai.com` + allowed path     → script appended
 *  - `lux.corpflowai.com`                     → no script
 *  - `core.corpflowai.com`                    → no script (denyExact)
 *  - any `*.vercel.app` preview               → no script (denySuffix)
 *  - `localhost` / `localhost:3000`           → no script (denyExact)
 *  - apex + `/change` / `/change-v2` / etc.   → no script (word-boundary
 *                                                deny matching mirrors
 *                                                `pathMatchesWordBoundary`)
 *  - apex + `/concierge` / `/properties`      → no script (apex-specific
 *                                                deny — only applies when
 *                                                host === apex)
 *  - apex + `?token=abc` / `?reset=xyz`       → no script (query deny)
 *  - apex + `/reset-password`                 → no script (substring deny)
 *  - apex + `/changelog`                      → script appended (no
 *                                                false positive — word
 *                                                boundary deny respects
 *                                                slash/dash, not letters)
 *
 * The loader wraps every step in `try { ... } catch (e) {}` so a
 * runtime error inside the policy check or DOM call never breaks the
 * host page. This matches the no-PII / fail-safe posture documented
 * for `trackEvent` (`JE-2026-06-03-3`).
 *
 * @param {{ src: string, domain: string }} args canonical Plausible
 *   script URL + `data-domain` (already resolved by
 *   `resolveAnalyticsForRequest` from envs or built-in defaults).
 * @returns {string} JavaScript source ready for
 *   `<script dangerouslySetInnerHTML={{ __html: <result> }} />`.
 */
export function buildSsgRuntimeLoaderScript({ src, domain } = {}) {
  if (typeof src !== 'string' || typeof domain !== 'string') {
    return '';
  }
  const config = {
    allow: ALLOW_HOSTS.slice(),
    denyExact: DENY_HOST_EXACT.slice(),
    denySuffix: DENY_HOST_SUFFIX.slice(),
    denyPrefixes: DENY_PATH_PREFIXES.slice(),
    apexDeny: APEX_DENY_PATH_PREFIXES.slice(),
    denySubstr: DENY_PATH_SUBSTRINGS.slice(),
    denyQuery: DENY_QUERY_KEYS.slice(),
    apexHost: APEX_HOST,
    src,
    domain,
  };
  const cfg = JSON.stringify(config);
  return (
    '(function(){try{' +
    'var c=' + cfg + ';' +
    'var h=(window.location.hostname||"").toLowerCase();' +
    'if(c.denyExact.indexOf(h)!==-1)return;' +
    'for(var i=0;i<c.denySuffix.length;i++){var sfx=c.denySuffix[i];' +
    'if(h.length>=sfx.length&&h.lastIndexOf(sfx)===h.length-sfx.length)return;}' +
    'if(c.allow.indexOf(h)===-1)return;' +
    'var p=window.location.pathname||"/";' +
    'for(var j=0;j<c.denySubstr.length;j++){if(p.indexOf(c.denySubstr[j])!==-1)return;}' +
    'for(var k=0;k<c.denyPrefixes.length;k++){var pre=c.denyPrefixes[k];' +
    'if(pre.charAt(pre.length-1)==="/"){if(p.indexOf(pre)===0)return;}' +
    'else if(p===pre||p.indexOf(pre+"/")===0||p.indexOf(pre+"-")===0)return;}' +
    'if(h===c.apexHost){for(var m=0;m<c.apexDeny.length;m++){var apre=c.apexDeny[m];' +
    'if(p===apre||p.indexOf(apre+"/")===0)return;}}' +
    'var qs=(window.location.search||"").replace(/^\\?/,"");' +
    'if(qs){var params=qs.split("&");' +
    'for(var n=0;n<c.denyQuery.length;n++){var key=c.denyQuery[n];' +
    'for(var o=0;o<params.length;o++){if(params[o]===key||params[o].indexOf(key+"=")===0)return;}}}' +
    'var s=document.createElement("script");s.defer=true;' +
    's.setAttribute("data-domain",c.domain);s.src=c.src;' +
    'document.head.appendChild(s);' +
    '}catch(e){}})();'
  );
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

/**
 * Lightweight client-side custom-event helper for Plausible.
 *
 * Designed to be call-and-forget — the helper:
 *   1) returns immediately and silently when `window` or `window.plausible`
 *      is not available (e.g., during SSR; on a deny-listed surface where
 *      the script tag was never injected by `pages/_document.js`; on a
 *      preview/local deployment where the kill-switch env is off; or in
 *      the rare case the third-party script failed to load).
 *   2) wraps the call in try/catch so a runtime error inside Plausible's
 *      own code path never surfaces to the host page or blocks form
 *      submission.
 *   3) returns `true` if the call dispatched (best effort), `false`
 *      otherwise. Call sites can ignore the return value; it exists so
 *      unit tests can assert dispatch behaviour without spying on the
 *      global.
 *
 * Surface-level policy (host + path + env kill-switch + deny lists) is
 * already enforced by `pages/_document.js` via `resolveAnalyticsForRequest`
 * before the script tag is ever injected. This helper therefore relies on
 * the absence of `window.plausible` as the operational allow-gate: if the
 * script was not injected, the helper silently no-ops. No additional
 * host/path check is needed here.
 *
 * No PII is ever passed in — call sites are responsible for ensuring
 * `options.props` contains only host/path/surface labels and small
 * categorical strings (e.g., `location: 'hero'`), never email, name,
 * phone, IP, or fingerprint values.
 *
 * Reference: Plausible vanilla `script.js` exposes
 * `window.plausible(eventName, { props, callback })` once loaded.
 *
 * @param {string} eventName — lowercased snake_case event name
 * @param {{ props?: Record<string, string | number | boolean>, callback?: Function }} [options]
 * @returns {boolean} `true` when the event was dispatched, `false` otherwise
 */
export function trackEvent(eventName, options) {
  if (typeof eventName !== 'string' || eventName.length === 0) return false;
  if (typeof window === 'undefined') return false;
  const plausible = window.plausible;
  if (typeof plausible !== 'function') return false;
  try {
    if (options === undefined) {
      plausible(eventName);
    } else {
      plausible(eventName, options);
    }
    return true;
  } catch {
    return false;
  }
}

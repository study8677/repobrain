/**
 * IM-4 (2026-06-15) — tenant-host "Switch workspace" affordance: pure decision +
 * URL helpers, no DOM, no React, no I/O.
 *
 * Canonical spec: docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-4.
 *
 * This module is the single source of truth for "should the tenant-host /change
 * page render a 'Switch workspace' link, and if so, where does it point?". It is
 * kept pure so it can be unit-tested without spinning up a DOM, a Prisma client,
 * or a React tree, and so future packets (IM-3 picker, IM-5 session enrichment,
 * IM-6 CMP enforcement) can reuse the same decision without re-implementing the
 * gate rules.
 *
 * Honest scope discipline (per Anton's IM-4 approval guardrails):
 *   - The link is described as **navigation to Core**, not as "tenant switching".
 *     IM-5 owns the actual switch (session shape, `acting_tenant_id`, switch /
 *     leave POST endpoints, cookie re-issue, login redirect resolver).
 *   - The link MUST be absent on Core hosts regardless of membership count.
 *   - The link MUST be absent for anonymous users and single-membership users.
 *   - The link reveals only the *existence* of more than one workspace — never
 *     other tenant identities (names, ids, hostnames).
 */

/**
 * Decision: should the tenant-host /change page render the "Switch workspace" link?
 *
 * Returns true only when ALL four conditions hold:
 *   1. surface === 'tenant'      — Core hosts get nothing (the user is already there).
 *   2. sessionLogged === true    — anonymous visitors get nothing.
 *   3. effectiveMembershipsCount is an integer (Number.isInteger)
 *      — `null` (env-master / PIN / pre-IM-1 sessions) means "we don't know your
 *      count", which is NOT the same as "you have zero", so the link is hidden.
 *   4. effectiveMembershipsCount > 1
 *      — single-membership users see no link (they have nowhere else to go).
 *
 * @param {object} args
 * @param {'core' | 'tenant' | null | undefined} args.surface
 * @param {boolean | null | undefined} args.sessionLogged
 * @param {number | null | undefined} args.effectiveMembershipsCount
 * @returns {boolean}
 */
export function shouldShowSwitchLink(args) {
  // Defensive: accept any falsy/non-object input (null, undefined, primitives)
  // by coercing to an empty record so this helper NEVER throws into render code.
  const safe = args && typeof args === 'object' ? args : {};
  const surface = safe.surface;
  const sessionLogged = safe.sessionLogged;
  const effectiveMembershipsCount = safe.effectiveMembershipsCount;
  if (surface !== 'tenant') return false;
  if (sessionLogged !== true) return false;
  if (!Number.isInteger(effectiveMembershipsCount)) return false;
  if (effectiveMembershipsCount <= 1) return false;
  return true;
}

/**
 * Build the absolute href the link should navigate to. Reads the first entry
 * of `CORPFLOW_CORE_HOSTS` (the same env IM-2's `requireCoreHost` consumes via
 * `buildCorpflowHostContext`), so Core-host configuration stays single-sourced.
 *
 * Falls back to `https://core.corpflowai.com/change` if the env value is empty,
 * unparseable, or contains only blank entries. The fallback is the production
 * canonical Core host — kept here as a constant rather than reaching back into
 * `runtime-config.js` so this module stays browser-safe (no Node-only imports).
 *
 * @param {{ coreHostsEnv?: string | null | undefined }} [args]
 * @returns {string}
 */
/**
 * Matches a valid hostname-or-FQDN prefix at the start of a string. Used to
 * defensively trim any junk a misconfigured env value might carry (quotes,
 * spaces, `onclick=`, etc.) before injecting the value into an href. Real Core
 * hosts only ever match `[a-z0-9.-]+` after lower-casing + port-stripping, so
 * this is strictly a narrowing operation — never expands what's accepted.
 */
const HOSTNAME_PREFIX_RE = /^([a-z0-9][a-z0-9.-]*[a-z0-9]|[a-z0-9])/;

export function coreSwitchUrl(args) {
  const safe = args && typeof args === 'object' ? args : {};
  const raw = safe.coreHostsEnv != null ? String(safe.coreHostsEnv) : '';
  const first = raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)[0];
  // Strict narrowing: take only the leading hostname-shaped portion of the
  // first entry. If the env value contains anything beyond `[a-z0-9.-]`, we
  // drop it (defense-in-depth — see HOSTNAME_PREFIX_RE comment).
  let host = '';
  if (first) {
    const m = HOSTNAME_PREFIX_RE.exec(first);
    if (m) host = m[1];
  }
  if (!host) host = 'core.corpflowai.com';
  return `https://${host}/change`;
}

/**
 * Sentinel `data-*` attribute used by the rendered `<a>` so it is trivially
 * grep-able from CI / smoke tests / HTML-source assertions, without depending
 * on the visible link text (which is i18n-able in a future packet).
 */
export const SWITCH_WORKSPACE_DATA_ATTR = 'data-cf-switch-workspace';

/**
 * Canonical visible link text. Exported so tests can assert it, and so a future
 * i18n packet can wire a single replace-point without hunting through markup.
 */
export const SWITCH_WORKSPACE_LINK_TEXT = 'Switch workspace';

/**
 * IM-4 — compute the additive `effective_memberships_count` field for
 * `GET /api/ui/context`. Lives in `lib/ui/` (no top-level server imports) so
 * unit tests can exercise all contract paths without loading the full
 * `api/factory_router.js` import graph (Prisma client, dozens of server
 * modules) just to test a 20-line helper.
 *
 * Dependency-injected: the caller passes `getEffectiveMembershipsFn` —
 * production passes the real `getEffectiveMemberships` from
 * `lib/server/effective-memberships.js`; tests pass a fake.
 *
 * Contract (per Anton's IM-4 approval guardrails):
 *
 *   - Returns `null` for null / undefined sessions, sessions with `ok !== true`
 *     (anonymous), and env-master / PIN / legacy sessions whose payload has no
 *     `user_id` (we cannot count what isn't DB-backed).
 *   - Returns `null` if `getEffectiveMembershipsFn` throws (guardrail #6:
 *     a downstream Prisma / Neon hiccup must NEVER turn /api/ui/context into
 *     a 5xx — the caller wraps this in its response either way).
 *   - Returns the integer count of effective tenant memberships for DB-backed
 *     sessions. The count includes factory_master expansion when applicable.
 *   - NEVER returns any tenant identity — only an integer or null (guardrail
 *     #5: tenant-host HTML must not leak other tenants).
 *
 * @param {{ ok?: boolean, payload?: { user_id?: string | null } } | null | undefined} sess
 *   The output of `getSessionFromRequest(req)`.
 * @param {{ getEffectiveMembershipsFn: (id: string) => Promise<{ memberships?: any[] }> }} opts
 *   Required injection — production passes the real Prisma-backed helper.
 * @returns {Promise<number | null>}
 */
export async function computeEffectiveMembershipsCountForUiContext(sess, opts) {
  const fn = opts && typeof opts.getEffectiveMembershipsFn === 'function'
    ? opts.getEffectiveMembershipsFn
    : null;
  if (!fn) {
    // Defensive: if the caller forgot to inject the function, return null rather
    // than crashing the surrounding /api/ui/context response. Logged so a future
    // wiring mistake is visible without affecting the live response shape.
    try {
      console.warn('[ui/context] computeEffectiveMembershipsCountForUiContext called without getEffectiveMembershipsFn');
    } catch (_) { /* logging best-effort */ }
    return null;
  }
  if (!sess || sess.ok !== true) return null;
  const userId = sess.payload && sess.payload.user_id != null ? String(sess.payload.user_id).trim() : '';
  if (!userId) return null;
  try {
    const eff = await fn(userId);
    return Array.isArray(eff?.memberships) ? eff.memberships.length : 0;
  } catch (err) {
    try {
      console.warn('[ui/context] effective_memberships_count probe failed:', err?.message || err);
    } catch (_) { /* logging best-effort */ }
    return null;
  }
}

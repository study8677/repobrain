/**
 * IM-4 — unit tests for the pure decision + URL helpers behind the tenant-host
 * "Switch workspace" affordance. Canonical spec:
 *   docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-4.
 *
 * These tests exhaust the truth table (surface × sessionLogged × count) plus
 * URL-resolution behavior. They run pure in-process — no DOM, no Prisma, no
 * network — and intentionally double-cover every guardrail from Anton's IM-4
 * approval message:
 *
 *   Guardrail #3: link absent on Core hosts regardless of count.
 *   Guardrail #4: link absent for anonymous and single-membership users.
 *   Guardrail #2: link is navigation to Core — coreSwitchUrl must produce a
 *                 Core-host URL (never a tenant host).
 *
 * No mocks. No timers. No async. If this file ever needs network or a DB, the
 * helper has stopped being pure and IM-4's contract is broken.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  SWITCH_WORKSPACE_DATA_ATTR,
  SWITCH_WORKSPACE_LINK_TEXT,
  coreSwitchUrl,
  shouldShowSwitchLink,
} from '../lib/ui/tenant-host-switch-link.js';

/**
 * Full truth table for shouldShowSwitchLink. Every row encodes one (surface,
 * sessionLogged, count) combination plus the expected verdict and a short
 * label explaining WHY (so a future failing row points straight at the rule
 * that broke).
 */
const truthTable = [
  // surface=core → always hidden, regardless of session / count (guardrail #3)
  { surface: 'core', sessionLogged: true, count: 5, expected: false, why: 'core host suppresses link' },
  { surface: 'core', sessionLogged: false, count: 5, expected: false, why: 'core host suppresses link (anon)' },
  { surface: 'core', sessionLogged: true, count: null, expected: false, why: 'core host suppresses link (null count)' },

  // surface=null/undefined → unknown surface → hidden (defensive default)
  { surface: null, sessionLogged: true, count: 5, expected: false, why: 'unknown surface → hidden' },
  { surface: undefined, sessionLogged: true, count: 5, expected: false, why: 'undefined surface → hidden' },
  { surface: 'admin', sessionLogged: true, count: 5, expected: false, why: 'non-canonical surface → hidden' },

  // surface=tenant, anonymous → hidden (guardrail #4)
  { surface: 'tenant', sessionLogged: false, count: 5, expected: false, why: 'anonymous tenant visitor → hidden' },
  { surface: 'tenant', sessionLogged: null, count: 5, expected: false, why: 'unknown session → hidden' },
  { surface: 'tenant', sessionLogged: undefined, count: 5, expected: false, why: 'undefined session → hidden' },

  // surface=tenant, logged-in, count undefined/null → hidden
  // (env-master / PIN / legacy sessions have no user_id → we cannot count → hidden)
  { surface: 'tenant', sessionLogged: true, count: null, expected: false, why: 'null count (env-master) → hidden' },
  { surface: 'tenant', sessionLogged: true, count: undefined, expected: false, why: 'undefined count → hidden' },

  // surface=tenant, logged-in, count 0 → hidden (DB returned but user has no
  // memberships; e.g. revoked-everywhere; still not shown to avoid a dead link)
  { surface: 'tenant', sessionLogged: true, count: 0, expected: false, why: 'count=0 → hidden' },

  // surface=tenant, logged-in, count 1 → hidden (single-membership, guardrail #4)
  { surface: 'tenant', sessionLogged: true, count: 1, expected: false, why: 'count=1 single-membership → hidden' },

  // surface=tenant, logged-in, count > 1 → SHOWN (the only "true" rows)
  { surface: 'tenant', sessionLogged: true, count: 2, expected: true, why: 'count=2 → shown' },
  { surface: 'tenant', sessionLogged: true, count: 3, expected: true, why: 'count=3 → shown' },
  { surface: 'tenant', sessionLogged: true, count: 50, expected: true, why: 'count=50 (factory_master) → shown' },

  // Non-integer counts must be rejected (avoids "1.5", "3.0001", "2" string, etc.)
  { surface: 'tenant', sessionLogged: true, count: 2.5, expected: false, why: 'fractional count → hidden' },
  { surface: 'tenant', sessionLogged: true, count: '5', expected: false, why: 'string count → hidden' },
  { surface: 'tenant', sessionLogged: true, count: NaN, expected: false, why: 'NaN count → hidden' },
  { surface: 'tenant', sessionLogged: true, count: Infinity, expected: false, why: 'Infinity count → hidden' },
];

test('shouldShowSwitchLink: truth table — every row gives the expected verdict', () => {
  for (const row of truthTable) {
    const got = shouldShowSwitchLink({
      surface: row.surface,
      sessionLogged: row.sessionLogged,
      effectiveMembershipsCount: row.count,
    });
    assert.equal(got, row.expected, `row failed: ${row.why} (surface=${row.surface}, logged=${row.sessionLogged}, count=${row.count})`);
  }
});

test('shouldShowSwitchLink: missing args object yields false (does not throw)', () => {
  assert.equal(shouldShowSwitchLink(), false);
  assert.equal(shouldShowSwitchLink({}), false);
  assert.equal(shouldShowSwitchLink(null), false);
});

test('shouldShowSwitchLink: empty / wrong-type sessionLogged is treated as not logged in', () => {
  assert.equal(
    shouldShowSwitchLink({ surface: 'tenant', sessionLogged: 'true', effectiveMembershipsCount: 3 }),
    false,
    'string "true" must not satisfy the strict === true gate',
  );
  assert.equal(
    shouldShowSwitchLink({ surface: 'tenant', sessionLogged: 1, effectiveMembershipsCount: 3 }),
    false,
    'numeric 1 must not satisfy the strict === true gate',
  );
});

test('coreSwitchUrl: default (no env) falls back to production Core host', () => {
  assert.equal(coreSwitchUrl(), 'https://core.corpflowai.com/change');
  assert.equal(coreSwitchUrl({}), 'https://core.corpflowai.com/change');
  assert.equal(coreSwitchUrl({ coreHostsEnv: null }), 'https://core.corpflowai.com/change');
  assert.equal(coreSwitchUrl({ coreHostsEnv: '' }), 'https://core.corpflowai.com/change');
  assert.equal(coreSwitchUrl({ coreHostsEnv: '   ' }), 'https://core.corpflowai.com/change');
});

test('coreSwitchUrl: reads the first comma-separated entry of CORPFLOW_CORE_HOSTS', () => {
  assert.equal(
    coreSwitchUrl({ coreHostsEnv: 'core.corpflowai.com,core.example.com' }),
    'https://core.corpflowai.com/change',
  );
  assert.equal(
    coreSwitchUrl({ coreHostsEnv: 'CORE.STAGE.CORPFLOWAI.COM, alt.example.com' }),
    'https://core.stage.corpflowai.com/change',
    'host must be lowercased',
  );
  assert.equal(
    coreSwitchUrl({ coreHostsEnv: '  ,  ,  core.corpflowai.com  ' }),
    'https://core.corpflowai.com/change',
    'blank entries must be skipped',
  );
  assert.equal(
    coreSwitchUrl({ coreHostsEnv: 'core.corpflowai.com:8443' }),
    'https://core.corpflowai.com/change',
    'port must be stripped',
  );
});

test('coreSwitchUrl: returns an https URL pointing to /change (no scheme injection from env)', () => {
  const url = coreSwitchUrl({ coreHostsEnv: 'attacker.example.com" onclick=alert(1) x="' });
  assert.match(url, /^https:\/\//, 'always https://');
  assert.match(url, /\/change$/, 'always ends in /change');
  // Sanity: the host segment must NOT carry a literal `"` or whitespace fragments.
  // (The env splitter already trims; this asserts trim + lowercased pass-through
  // does not let a control char slip into the href without escaping.)
  const hostPart = url.replace(/^https:\/\//, '').replace(/\/change$/, '');
  assert.equal(hostPart.includes('"'), false, 'host must not carry literal quote chars');
});

test('exported constants are stable for HTML / smoke-test assertions', () => {
  assert.equal(SWITCH_WORKSPACE_DATA_ATTR, 'data-cf-switch-workspace');
  assert.equal(SWITCH_WORKSPACE_LINK_TEXT, 'Switch workspace');
});

test('shouldShowSwitchLink: no tenant identities are observable from arguments', () => {
  // Defensive negative test: the decision function must reject tenant_id leakage
  // (callers should never pass tenant ids through this helper — guardrail #5).
  // We assert it does not throw, returns boolean, and ignores any unknown keys.
  const result = shouldShowSwitchLink({
    surface: 'tenant',
    sessionLogged: true,
    effectiveMembershipsCount: 3,
    tenant_id: 'living-word-mauritius',
    tenant_name: 'Living Word Mauritius',
    tenants: ['lux', 'living-word'],
  });
  assert.equal(result, true, 'extra keys must be ignored, not blocking');
});

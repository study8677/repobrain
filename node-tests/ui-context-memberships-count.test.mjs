/**
 * IM-4 — unit tests for `computeEffectiveMembershipsCountForUiContext`, the
 * exported helper that backs the additive `effective_memberships_count` field
 * on `GET /api/ui/context`. Canonical spec:
 *   docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §10 IM-4.
 *
 * These tests cover EVERY contract path Anton's IM-4 approval calls out:
 *
 *   1. Anonymous session            → null
 *   2. Env-master / PIN session     → null
 *      (logged-in but no payload.user_id)
 *   3. DB-backed empty memberships  → 0
 *   4. DB-backed single membership  → 1
 *   5. DB-backed multi-tenant user  → integer > 1
 *   6. DB-backed factory_master     → integer > 1 (includes expansion)
 *   7. Helper throws (Prisma error) → null  (guardrail #6: NEVER 5xx)
 *   8. user_id is whitespace-only   → null  (defensive trim)
 *
 * The tests inject a fake `getEffectiveMembershipsFn` so they are pure in-process,
 * never touch Prisma, never open the network. The shape of the fake mirrors
 * exactly what `lib/server/effective-memberships.js#getEffectiveMemberships`
 * returns in production (see EffectiveMembershipResult in that file).
 *
 * Guardrail re-check encoded by these tests:
 *   - The helper returns ONLY a number or null. It MUST NEVER return a tenant
 *     id, a tenant name, an array, or any object — that would leak identities
 *     to the tenant-host `/api/ui/context` response (guardrail #5).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { computeEffectiveMembershipsCountForUiContext } from '../lib/ui/tenant-host-switch-link.js';

/**
 * Build a fake `getEffectiveMemberships` whose `memberships` array length is
 * the integer we want to surface as the count.
 */
function fakeGetEffectiveMemberships(memberships) {
  return async () => ({
    user_id: 'fake-user',
    username: 'fake',
    level: 'tenant',
    enabled: true,
    factory_master: false,
    memberships,
    not_found: false,
  });
}

/**
 * Default opts shared by all "session shape" tests: injects a fake that would
 * return non-empty memberships if called. If a test expects `null` because of
 * a missing/bad session, this fake MUST NOT be called — we assert that via a
 * counter so a regression that bypasses the early-return shows up loudly.
 */
function makeOptsWithSpy(memberships = [{ tenant_id: 'should-not-be-counted' }]) {
  const calls = { count: 0 };
  const opts = {
    getEffectiveMembershipsFn: async (id) => {
      calls.count += 1;
      calls.lastId = id;
      return { memberships };
    },
  };
  return { opts, calls };
}

test('returns null when no fn is injected (defensive: missing wiring → null, not throw)', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext({ ok: true, payload: { user_id: 'x' } });
  assert.equal(got, null);
});

test('returns null for null session', async () => {
  const { opts, calls } = makeOptsWithSpy();
  const got = await computeEffectiveMembershipsCountForUiContext(null, opts);
  assert.equal(got, null);
  assert.equal(calls.count, 0, 'fn MUST NOT be called for null session');
});

test('returns null for undefined session', async () => {
  const { opts, calls } = makeOptsWithSpy();
  const got = await computeEffectiveMembershipsCountForUiContext(undefined, opts);
  assert.equal(got, null);
  assert.equal(calls.count, 0, 'fn MUST NOT be called for undefined session');
});

test('returns null for sess.ok === false (anonymous)', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: false, payload: null },
    { getEffectiveMembershipsFn: fakeGetEffectiveMemberships([{ tenant_id: 't1' }]) },
  );
  assert.equal(got, null);
});

test('returns null for env-master session (sess.ok=true but no payload.user_id)', async () => {
  // This is Anton's current admin posture: signed cookie, logged_in=true,
  // but payload was minted from env credentials so there is no auth_users row
  // backing it. We cannot count what isn't DB-backed → return null, not 0.
  let helperCallCount = 0;
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { typ: 'admin', tenant_id: null } },
    {
      getEffectiveMembershipsFn: async () => {
        helperCallCount += 1;
        return { memberships: [{}] };
      },
    },
  );
  assert.equal(got, null);
  assert.equal(helperCallCount, 0, 'helper MUST NOT be called when user_id is absent');
});

test('returns null for whitespace-only user_id (defensive trim)', async () => {
  let helperCallCount = 0;
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: '   ' } },
    {
      getEffectiveMembershipsFn: async () => {
        helperCallCount += 1;
        return { memberships: [{}] };
      },
    },
  );
  assert.equal(got, null);
  assert.equal(helperCallCount, 0, 'helper MUST NOT be called when user_id trims to empty');
});

test('returns 0 for DB-backed session with no memberships', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-empty' } },
    { getEffectiveMembershipsFn: fakeGetEffectiveMemberships([]) },
  );
  assert.equal(got, 0);
});

test('returns 1 for DB-backed single-membership user', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-single' } },
    {
      getEffectiveMembershipsFn: fakeGetEffectiveMemberships([
        { tenant_id: 'living-word-mauritius', source: 'explicit' },
      ]),
    },
  );
  assert.equal(got, 1);
});

test('returns >1 for DB-backed multi-tenant client', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-multi' } },
    {
      getEffectiveMembershipsFn: fakeGetEffectiveMemberships([
        { tenant_id: 'living-word-mauritius', source: 'explicit' },
        { tenant_id: 'luxe-maurice', source: 'explicit' },
        { tenant_id: 'tenant-three', source: 'explicit' },
      ]),
    },
  );
  assert.equal(got, 3);
});

test('returns large integer for DB-backed factory_master admin (includes expansion)', async () => {
  // Mirrors the production shape: explicit + factory_master rows are already
  // merged inside the helper; the count is just memberships.length.
  const memberships = Array.from({ length: 12 }, (_, i) => ({
    tenant_id: `t-${i}`,
    source: i < 2 ? 'explicit' : 'factory_master',
  }));
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-fm' } },
    { getEffectiveMembershipsFn: fakeGetEffectiveMemberships(memberships) },
  );
  assert.equal(got, 12);
});

test('returns null when getEffectiveMemberships throws (guardrail #6: never 5xx)', async () => {
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-throws' } },
    {
      getEffectiveMembershipsFn: async () => {
        throw new Error('Prisma: connection refused');
      },
    },
  );
  assert.equal(got, null, 'thrown error must be swallowed and surface as null');
});

test('returns 0 when helper returns malformed payload (missing memberships array)', async () => {
  // Defensive: if a future change accidentally returns { } instead of
  // { memberships: [...] }, we treat it as "no memberships visible" — never
  // crash, never widen the response shape.
  const got = await computeEffectiveMembershipsCountForUiContext(
    { ok: true, payload: { user_id: 'user-malformed' } },
    { getEffectiveMembershipsFn: async () => ({}) },
  );
  assert.equal(got, 0);
});

test('result is always a number or null — NEVER a tenant identity (guardrail #5)', async () => {
  const cases = [
    { sess: null, fake: fakeGetEffectiveMemberships([]) },
    { sess: { ok: false, payload: null }, fake: fakeGetEffectiveMemberships([]) },
    { sess: { ok: true, payload: { typ: 'admin' } }, fake: fakeGetEffectiveMemberships([]) },
    { sess: { ok: true, payload: { user_id: 'a' } }, fake: fakeGetEffectiveMemberships([]) },
    {
      sess: { ok: true, payload: { user_id: 'b' } },
      fake: fakeGetEffectiveMemberships([
        { tenant_id: 'leaky-tenant-name', tenant_name: 'Leaky Co', source: 'explicit' },
      ]),
    },
  ];
  for (let i = 0; i < cases.length; i += 1) {
    const got = await computeEffectiveMembershipsCountForUiContext(
      cases[i].sess,
      { getEffectiveMembershipsFn: cases[i].fake },
    );
    assert.ok(
      got === null || typeof got === 'number',
      `case ${i}: must be number or null, got ${typeof got} (${JSON.stringify(got)})`,
    );
    if (typeof got === 'number') {
      assert.ok(Number.isInteger(got), `case ${i}: must be integer when non-null`);
    }
  }
});

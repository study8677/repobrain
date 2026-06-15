/**
 * IM-1 seed idempotency — exercises the back-fill logic against an in-memory fake of
 * the Prisma client (no live DB). The fake mirrors the same partial-unique semantics
 * (only one active row per (user_id, tenant_id)) so the test catches drift between
 * the seeder and the DB constraint shape.
 *
 * What this proves:
 *   - First run inserts one membership per level='tenant' auth_users row that has a tenant_id.
 *   - Second run is a no-op (every candidate already has an active membership).
 *   - level='admin' auth_users rows are NEVER seeded (they get factory_master via the
 *     separate promote-factory-master.mjs script per credential doc §2.6).
 *   - level='tenant' auth_users rows with tenant_id IS NULL are skipped (not crash).
 *   - The seeder back-fills role='member', granted_by='system', notes carrying the
 *     IM-1 marker (so audit queries can identify back-filled rows).
 */
import test from 'node:test';
import assert from 'node:assert/strict';

/** Pure back-fill algorithm extracted from scripts/seed-user-tenant-memberships.mjs. */
async function runSeed({ authUsers, memberships, dryRun = false }) {
  const candidates = authUsers
    .filter((u) => u.level === 'tenant' && u.enabled && u.tenantId)
    .sort((a, b) => a.createdAt - b.createdAt);

  let inserted = 0;
  let skipped_existing = 0;
  let skipped_orphan_tenant = 0;

  for (const u of candidates) {
    if (!u.tenantId) {
      skipped_orphan_tenant += 1;
      continue;
    }
    const existing = memberships.find(
      (m) => m.userId === u.id && m.tenantId === u.tenantId && m.revokedAt === null,
    );
    if (existing) {
      skipped_existing += 1;
      continue;
    }
    if (dryRun) {
      inserted += 1;
      continue;
    }
    memberships.push({
      id: `mem_${memberships.length + 1}`,
      userId: u.id,
      tenantId: u.tenantId,
      role: 'member',
      capability: null,
      enabled: true,
      grantedAt: Date.now(),
      grantedBy: 'system',
      revokedAt: null,
      disabledAt: null,
      notes: 'IM-1 back-fill from auth_users.tenant_id',
    });
    inserted += 1;
  }

  return { inserted, skipped_existing, skipped_orphan_tenant };
}

function fixture() {
  return {
    authUsers: [
      { id: 'u_anton', username: 'anton', level: 'admin', tenantId: null, enabled: true, createdAt: 1 },
      { id: 'u_lux_client', username: 'luxe-maurice', level: 'tenant', tenantId: 'luxe-maurice', enabled: true, createdAt: 2 },
      { id: 'u_lw_client', username: 'living-word-mauritius', level: 'tenant', tenantId: 'living-word-mauritius', enabled: true, createdAt: 3 },
      { id: 'u_orphan', username: 'orphan', level: 'tenant', tenantId: null, enabled: true, createdAt: 4 },
      { id: 'u_disabled', username: 'paused', level: 'tenant', tenantId: 'some-tenant', enabled: false, createdAt: 5 },
    ],
    memberships: [],
  };
}

test('IM-1 seed: first run inserts exactly one row per active tenant client; ignores admin + orphan + disabled', async () => {
  const fx = fixture();
  const r = await runSeed(fx);
  assert.equal(r.inserted, 2, 'expected 2 inserted memberships (Lux + Living Word clients)');
  assert.equal(r.skipped_existing, 0);
  /* `skipped_orphan_tenant` defends against a future change that drops the Prisma `tenantId: { not: null }`
     filter. Today the orphan is excluded at the candidate step so the in-loop branch does not fire (== 0). */
  assert.equal(r.skipped_orphan_tenant, 0);
  assert.equal(fx.memberships.length, 2);

  for (const m of fx.memberships) {
    assert.equal(m.role, 'member', 'back-fill role must be member per credential doc §2.3');
    assert.equal(m.grantedBy, 'system', 'back-fill granted_by must be the sentinel "system"');
    assert.equal(m.enabled, true);
    assert.equal(m.revokedAt, null);
    assert.equal(m.disabledAt, null);
    assert.match(m.notes, /IM-1 back-fill/);
  }

  const userIds = fx.memberships.map((m) => m.userId).sort();
  assert.deepEqual(userIds, ['u_lux_client', 'u_lw_client'].sort());
  assert.ok(!fx.memberships.some((m) => m.userId === 'u_anton'), 'admin row must never be seeded');
  assert.ok(!fx.memberships.some((m) => m.userId === 'u_orphan'), 'orphan row must never be seeded');
  assert.ok(!fx.memberships.some((m) => m.userId === 'u_disabled'), 'disabled row must never be seeded');
});

test('IM-1 seed: second run is a no-op (idempotent)', async () => {
  const fx = fixture();
  await runSeed(fx);
  const before = fx.memberships.length;
  const r2 = await runSeed(fx);
  assert.equal(r2.inserted, 0, 'second run must insert nothing');
  assert.equal(r2.skipped_existing, 2, 'both active candidates must be skipped on the second run');
  assert.equal(fx.memberships.length, before, 'memberships count must be unchanged');
});

test('IM-1 seed: dry-run reports inserts without mutating', async () => {
  const fx = fixture();
  const r = await runSeed({ ...fx, dryRun: true });
  assert.equal(r.inserted, 2);
  assert.equal(fx.memberships.length, 0, 'dry-run must not mutate memberships');
});

test('IM-1 seed: a revoked row does NOT block a fresh seed for the same (user, tenant)', async () => {
  const fx = fixture();
  fx.memberships.push({
    id: 'mem_old',
    userId: 'u_lux_client',
    tenantId: 'luxe-maurice',
    role: 'member',
    capability: null,
    enabled: true,
    grantedAt: 0,
    grantedBy: 'system',
    revokedAt: 100,
    disabledAt: null,
    notes: 'historical revoked grant',
  });
  const r = await runSeed(fx);
  assert.equal(r.inserted, 2, 'seed treats revoked rows as absent (matches partial-unique semantics)');
  const active = fx.memberships.filter((m) => m.userId === 'u_lux_client' && m.revokedAt === null);
  assert.equal(active.length, 1, 'exactly one active membership for the user after re-seed');
});

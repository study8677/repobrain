/**
 * IM-1 schema shape — asserts the idempotent DDL strings declare every constraint,
 * index, and column required by the credential doc §2.3, §2.6, §7.2. No live DB.
 *
 * The constraints are also enforced at the DB level on Production (Anton verifies
 * via the read-only queries in the IM-1 Delivery Reality Audit); this test guards
 * the DDL source against drift.
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { ENSURE_SCHEMA_STATEMENTS } from '../lib/server/postgres-ensure-schema-statements.js';

const joined = ENSURE_SCHEMA_STATEMENTS.join('\n');

test('IM-1: auth_users gains factory_master column (additive, default false)', () => {
  assert.ok(
    /alter table auth_users add column if not exists factory_master boolean not null default false/i.test(joined),
    'expected idempotent ALTER for auth_users.factory_master',
  );
});

test('IM-1: auth_users.factory_master enforced operator-only by named CHECK constraint', () => {
  assert.ok(
    /auth_users_factory_master_admin_only/.test(joined),
    'expected CHECK constraint name auth_users_factory_master_admin_only',
  );
  assert.ok(
    /check\s*\(\s*factory_master\s*=\s*false\s+or\s+level\s*=\s*'admin'\s*\)/i.test(joined),
    "expected CHECK (factory_master = false OR level = 'admin')",
  );
  assert.ok(
    /do \$\$ begin[\s\S]+pg_constraint where conname = 'auth_users_factory_master_admin_only'/i.test(joined),
    'expected DO-block guard that adds the CHECK only when it does not already exist (idempotent)',
  );
});

test('IM-1: automation_events + telemetry_events gain actor_user_id (nullable) + index', () => {
  for (const tbl of ['automation_events', 'telemetry_events']) {
    assert.ok(
      new RegExp(`alter table ${tbl} add column if not exists actor_user_id text null`, 'i').test(joined),
      `expected idempotent ALTER for ${tbl}.actor_user_id`,
    );
    assert.ok(
      new RegExp(`create index if not exists ${tbl}_actor_user_id_idx on ${tbl} \\(actor_user_id\\)`, 'i').test(joined),
      `expected index ${tbl}_actor_user_id_idx`,
    );
  }
});

test('IM-1: user_tenant_memberships table declared with the spec columns', () => {
  assert.ok(
    /create table if not exists user_tenant_memberships/i.test(joined),
    'expected user_tenant_memberships create',
  );
  for (const col of [
    'id text primary key',
    'user_id text not null',
    'tenant_id text not null',
    "role text not null default 'member'",
    'capability text null',
    'enabled boolean not null default true',
    'granted_at timestamptz not null default now()',
    "granted_by text not null default 'system'",
    'revoked_at timestamptz null',
    'disabled_at timestamptz null',
    'notes text null',
  ]) {
    assert.ok(
      joined.toLowerCase().includes(col.toLowerCase()),
      `expected column declaration: ${col}`,
    );
  }
});

test('IM-1: user_tenant_memberships indexes — hot-path and partial-unique present', () => {
  assert.ok(
    /create index if not exists user_tenant_memberships_user_id_idx on user_tenant_memberships \(user_id\)/i.test(
      joined,
    ),
    'expected user_id single-column index',
  );
  assert.ok(
    /create index if not exists user_tenant_memberships_tenant_id_idx on user_tenant_memberships \(tenant_id\)/i.test(
      joined,
    ),
    'expected tenant_id single-column index',
  );
  assert.ok(
    /create index if not exists user_tenant_memberships_user_enabled_revoked_idx[\s\S]+\(user_id, enabled, revoked_at\)/i.test(
      joined,
    ),
    'expected composite (user_id, enabled, revoked_at) hot-path index per credential doc §2.3',
  );
  assert.ok(
    /create unique index if not exists user_tenant_memberships_user_tenant_active_unique[\s\S]+\(user_id, tenant_id\)\s+where\s+revoked_at\s+is\s+null/i.test(
      joined,
    ),
    'expected PARTIAL UNIQUE on (user_id, tenant_id) WHERE revoked_at IS NULL (soft-delete semantics)',
  );
});

test('IM-1: every IM-1 DDL statement is additive (no DROP / RENAME / TRUNCATE)', () => {
  const blocked = /\b(drop\s+table|drop\s+column|drop\s+index|rename\s+to|rename\s+column|truncate)\b/i;
  for (const sql of ENSURE_SCHEMA_STATEMENTS) {
    assert.ok(!blocked.test(sql), `non-additive DDL detected: ${sql.slice(0, 120)}`);
  }
});

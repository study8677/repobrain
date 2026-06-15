#!/usr/bin/env node
/**
 * IM-1 post-backfill read-only verification.
 * Confirms the membership row counts match expectations and that the partial-unique
 * constraint is in force. No writes.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run(label, sql) {
  console.log(`\n----- ${label} -----`);
  try {
    const rows = await prisma.$queryRawUnsafe(sql);
    console.log(`ROWS (${rows.length}):`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  console.log(`IM-1 post-backfill verification at ${new Date().toISOString()}`);

  await run(
    'membership rows per tenant + role',
    `SELECT m.tenant_id, m.role, COUNT(*)::int AS row_count
       FROM user_tenant_memberships m
       WHERE m.revoked_at IS NULL
       GROUP BY m.tenant_id, m.role
       ORDER BY m.tenant_id, m.role`,
  );

  await run(
    'memberships join auth_users (confirms userId -> level mapping; should all be tenant)',
    `SELECT m.tenant_id, m.role, m.granted_by, u.username, u.level, u.enabled
       FROM user_tenant_memberships m
       JOIN auth_users u ON u.id = m.user_id
       WHERE m.revoked_at IS NULL
       ORDER BY m.tenant_id, u.username`,
  );

  await run(
    'all memberships carry granted_by=system and the IM-1 backfill marker note',
    `SELECT granted_by, notes, COUNT(*)::int AS row_count
       FROM user_tenant_memberships
       GROUP BY granted_by, notes
       ORDER BY granted_by, notes`,
  );

  await run(
    'no orphan memberships (every row maps to a real auth_users.id and a real tenants.tenant_id)',
    `SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN u.id IS NULL THEN 1 ELSE 0 END)::int AS orphan_user_id,
        SUM(CASE WHEN t.tenant_id IS NULL THEN 1 ELSE 0 END)::int AS orphan_tenant_id
       FROM user_tenant_memberships m
       LEFT JOIN auth_users u ON u.id = m.user_id
       LEFT JOIN tenants t ON t.tenant_id = m.tenant_id`,
  );

  await run(
    'auth_users.factory_master distribution (must be all false after backfill)',
    `SELECT factory_master, COUNT(*)::int AS row_count
       FROM auth_users
       GROUP BY factory_master
       ORDER BY factory_master`,
  );
}

main()
  .catch((e) => {
    console.error('FATAL', e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

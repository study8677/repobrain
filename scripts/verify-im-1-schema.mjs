#!/usr/bin/env node
/**
 * IM-1 production schema verification — READ-ONLY (extended).
 *
 * Runs the 6 SELECTs from the PR #359 description / DRA against the database
 * configured by POSTGRES_URL, plus extended diagnostics on the auth_users shape
 * when the enabled-admin list comes back empty. NEVER prints the connection
 * string or any secret. NEVER performs a write. Designed to be safe to run from
 * any operator laptop whose .env already points at the production database.
 *
 * Output format: one labelled block per query, JSON-formatted result rows.
 * The output is suitable for paste-back into a PR / chat thread.
 *
 * Usage (PowerShell, repo root):
 *   node scripts/verify-im-1-schema.mjs
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run(label, sql) {
  console.log(`\n----- ${label} -----`);
  console.log(`SQL: ${sql.replace(/\s+/g, ' ').trim()}`);
  try {
    const rows = await prisma.$queryRawUnsafe(sql);
    console.log(`ROWS (${rows.length}):`);
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.log(`ERROR: ${e instanceof Error ? e.message : String(e)}`);
  }
}

async function main() {
  console.log('IM-1 production schema verification — READ-ONLY (no writes, no secrets printed).');
  console.log(`Database host: ${(process.env.POSTGRES_URL || '').match(/@([^/:?]+)/)?.[1] || '(unknown)'}`);
  console.log(`Started at:    ${new Date().toISOString()}`);

  await run(
    '(a) auth_users.factory_master exists + default false',
    `SELECT column_name, data_type, column_default, is_nullable
       FROM information_schema.columns
       WHERE table_name = 'auth_users' AND column_name = 'factory_master'`,
  );

  await run(
    '(b) CHECK constraint auth_users_factory_master_admin_only is in place',
    `SELECT conname, pg_get_constraintdef(oid) AS definition
       FROM pg_constraint
       WHERE conname = 'auth_users_factory_master_admin_only'`,
  );

  await run(
    '(c-1) actor_user_id columns on both event tables',
    `SELECT table_name, column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE column_name = 'actor_user_id' AND table_name IN ('automation_events', 'telemetry_events')
       ORDER BY table_name`,
  );

  await run(
    '(c-2) indexes on actor_user_id for both event tables',
    `SELECT indexname, tablename
       FROM pg_indexes
       WHERE indexname IN ('automation_events_actor_user_id_idx', 'telemetry_events_actor_user_id_idx')
       ORDER BY indexname`,
  );

  await run(
    '(d) user_tenant_memberships table columns + types',
    `SELECT column_name, data_type, is_nullable, column_default
       FROM information_schema.columns
       WHERE table_name = 'user_tenant_memberships'
       ORDER BY ordinal_position`,
  );

  await run(
    '(e) user_tenant_memberships indexes',
    `SELECT indexname, indexdef
       FROM pg_indexes
       WHERE tablename = 'user_tenant_memberships'
       ORDER BY indexname`,
  );

  await run(
    '(f) enabled-admin row list (Anton confirms which row is his BEFORE any write)',
    `SELECT id, username, level, tenant_id, factory_master, enabled
       FROM auth_users
       WHERE level = 'admin' AND enabled = true
       ORDER BY username`,
  );

  await run(
    '(g) [diagnostic] auth_users row counts by level + enabled state (no row contents leaked)',
    `SELECT level, enabled, COUNT(*)::int AS row_count
       FROM auth_users
       GROUP BY level, enabled
       ORDER BY level, enabled`,
  );

  await run(
    '(h) [diagnostic] all level=admin rows incl. disabled (so Anton can see whether one exists)',
    `SELECT id, username, level, tenant_id, factory_master, enabled,
            to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS created_at,
            to_char(last_login_at, 'YYYY-MM-DD"T"HH24:MI:SSOF') AS last_login_at
       FROM auth_users
       WHERE level = 'admin'
       ORDER BY username`,
  );

  await run(
    '(i) [diagnostic] current contents of user_tenant_memberships (expect empty before backfill)',
    `SELECT COUNT(*)::int AS total_rows,
            SUM(CASE WHEN revoked_at IS NULL THEN 1 ELSE 0 END)::int AS active_rows
       FROM user_tenant_memberships`,
  );

  await run(
    '(j) [diagnostic] anticipated backfill candidates (level=tenant, enabled, with tenant_id) — count only',
    `SELECT COUNT(*)::int AS candidate_count
       FROM auth_users
       WHERE level = 'tenant' AND enabled = true AND tenant_id IS NOT NULL`,
  );

  console.log(`\nFinished at:   ${new Date().toISOString()}`);
}

main()
  .catch((e) => {
    console.error('FATAL', e instanceof Error ? e.message : String(e));
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

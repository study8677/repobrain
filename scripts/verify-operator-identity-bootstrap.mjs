#!/usr/bin/env node
/**
 * IM-5.5 — Operator identity bootstrap, read-only verification.
 *
 * Confirms that production Neon has exactly the state IM-6 requires:
 *   - At least one auth_users row with level='admin', enabled=true, factory_master=true.
 *   - That admin row has zero user_tenant_memberships rows (Anton's tenant visibility
 *     comes from getEffectiveMemberships' factory_master expansion, not explicit grants).
 *   - No orphan memberships across the table (regression check).
 *
 * Read-only. SELECT statements only. No INSERT, UPDATE, DELETE, DDL, DCL.
 * Does not write to disk, does not emit telemetry / automation events.
 *
 * Authority: IM-5.5 approval, 2026-06-16 10:54 UTC+4. Step 7 of
 * docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md.
 *
 * Exit codes:
 *   0 — VERDICT: READY (IM-6 may proceed).
 *   1 — VERDICT: NOT READY (with a structured reason).
 *   2 — VERDICT: NOT READY (SELECT failed; DB unreachable, schema wrong, etc.).
 *
 * Usage (PowerShell, repo root):
 *   node scripts/verify-operator-identity-bootstrap.mjs
 *
 * Env: POSTGRES_URL required (loaded automatically via bootstrap-repo-env.mjs from .env).
 *
 * Canonical references:
 *   - docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md
 *   - docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §2.6, §10 (Packet IM-6)
 *   - lib/server/effective-memberships.js (the consumer this gate unblocks)
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function maskHost(url) {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.username ? '***@' : ''}${u.host}${u.pathname}`;
  } catch {
    return '<unparseable POSTGRES_URL>';
  }
}

async function runReadOnly(label, sql) {
  console.log(`\n----- ${label} -----`);
  console.log(`SQL: ${sql.replace(/\s+/g, ' ').trim()}`);
  const rows = await prisma.$queryRawUnsafe(sql);
  console.log(`ROWS (${rows.length}):`);
  console.log(JSON.stringify(rows, null, 2));
  return rows;
}

async function main() {
  console.log(`IM-5.5 operator identity bootstrap — read-only verification at ${new Date().toISOString()}`);
  console.log(`POSTGRES_URL host: ${maskHost(process.env.POSTGRES_URL || '')}`);

  let connInfo;
  try {
    connInfo = await runReadOnly(
      'connection metadata',
      `SELECT current_database() AS db, current_user AS usr, inet_server_addr()::text AS host_ip, version() AS pg_version`,
    );
  } catch (e) {
    console.error(`\n[verify] FATAL: connection metadata SELECT failed: ${e?.message || e}`);
    console.error(`[verify] VERDICT: NOT READY — cannot reach Neon.`);
    process.exit(2);
  }

  if (connInfo[0]?.db) {
    console.log(`\nConnected database: ${connInfo[0].db} (PG: ${(connInfo[0].pg_version || '').split(',')[0]})`);
  }

  let adminRows;
  try {
    adminRows = await runReadOnly(
      'auth_users admin rows (IM-6 readiness gate)',
      `SELECT id, username, level, factory_master, enabled, tenant_id, created_at
         FROM auth_users
        WHERE level = 'admin'
        ORDER BY username`,
    );
  } catch (e) {
    console.error(`\n[verify] FATAL: auth_users SELECT failed: ${e?.message || e}`);
    console.error(`[verify] VERDICT: NOT READY — auth_users not reachable.`);
    process.exit(2);
  }

  const enabledFactoryMasters = adminRows.filter(
    (r) => r.enabled === true && r.factory_master === true,
  );
  const tenantBoundAdmins = adminRows.filter((r) => r.tenant_id != null);

  let membershipRows = [];
  let orphanRows = [];
  if (enabledFactoryMasters.length >= 1) {
    const ids = enabledFactoryMasters.map((r) => `'${String(r.id).replace(/'/g, "''")}'`).join(', ');
    try {
      membershipRows = await runReadOnly(
        'user_tenant_memberships rows for any factory_master admin (should be zero)',
        `SELECT m.user_id, m.tenant_id, m.role, m.revoked_at
           FROM user_tenant_memberships m
          WHERE m.user_id IN (${ids})`,
      );
    } catch (e) {
      console.error(`\n[verify] FATAL: user_tenant_memberships SELECT failed: ${e?.message || e}`);
      console.error(`[verify] VERDICT: NOT READY — cannot verify membership state.`);
      process.exit(2);
    }

    try {
      orphanRows = await runReadOnly(
        'orphan memberships across the table (regression check; should be zero)',
        `SELECT m.user_id, m.tenant_id
           FROM user_tenant_memberships m
           LEFT JOIN auth_users u ON u.id = m.user_id
           LEFT JOIN tenants t ON t.tenant_id = m.tenant_id
          WHERE u.id IS NULL OR t.tenant_id IS NULL`,
      );
    } catch (e) {
      console.error(`\n[verify] FATAL: orphan-membership SELECT failed: ${e?.message || e}`);
      console.error(`[verify] VERDICT: NOT READY — cannot verify membership integrity.`);
      process.exit(2);
    }
  }

  console.log(`\n===== IM-5.5 VERIFICATION VERDICT =====`);
  console.log(`admin rows total:                ${adminRows.length}`);
  console.log(`admin rows enabled=true:         ${adminRows.filter((r) => r.enabled === true).length}`);
  console.log(`admin rows factory_master=true:  ${adminRows.filter((r) => r.factory_master === true).length}`);
  console.log(`admin rows enabled AND fm=true:  ${enabledFactoryMasters.length}`);
  console.log(`admin rows with tenant_id != null (should be 0): ${tenantBoundAdmins.length}`);

  if (enabledFactoryMasters.length === 0) {
    console.log(`\n[verify] VERDICT: NOT READY`);
    console.log(`[verify] No enabled DB-backed admin row has factory_master=true.`);
    console.log(`[verify] Follow docs/runbooks/OPERATOR_IDENTITY_BOOTSTRAP_IM_5_5.md steps 4-9.`);
    process.exit(1);
  }

  if (tenantBoundAdmins.length > 0) {
    console.log(`\n[verify] VERDICT: NOT READY`);
    console.log(`[verify] At least one admin row has a non-null tenant_id, which is unexpected for operator identities.`);
    console.log(`[verify] Review the listed rows and ensure admin rows have tenant_id = NULL.`);
    process.exit(1);
  }

  if (membershipRows.length > 0) {
    console.log(`\n[verify] VERDICT: NOT READY`);
    console.log(`[verify] The new admin row has at least one user_tenant_memberships entry.`);
    console.log(`[verify] Tenant visibility for factory_master admins comes from getEffectiveMemberships' factory_master`);
    console.log(`[verify] expansion (lib/server/effective-memberships.js), NOT from explicit grants. Explicit grants on a`);
    console.log(`[verify] factory_master admin would create ambiguous source attribution. Remove the membership rows or`);
    console.log(`[verify] demote the admin from factory_master before proceeding.`);
    process.exit(1);
  }

  if (orphanRows.length > 0) {
    console.log(`\n[verify] VERDICT: NOT READY`);
    console.log(`[verify] Orphan memberships detected (user_tenant_memberships rows pointing at non-existent users or tenants).`);
    console.log(`[verify] This is a separate IM-1 backfill regression; do not unblock IM-6 until resolved.`);
    process.exit(1);
  }

  if (enabledFactoryMasters.length > 1) {
    console.log(`\n[verify] VERDICT: READY (with note)`);
    console.log(`[verify] ${enabledFactoryMasters.length} enabled admin rows have factory_master=true.`);
    console.log(`[verify] More than one is allowed by IM-6 but the recommended v1 posture is exactly one (Anton).`);
    console.log(`[verify] Confirm the extra rows are intentional. IM-6 may proceed.`);
    process.exit(0);
  }

  console.log(`\n[verify] VERDICT: READY`);
  console.log(`[verify] Exactly 1 enabled DB-backed admin row has factory_master=true.`);
  console.log(`[verify] That admin row has zero user_tenant_memberships rows (correct — factory_master expansion in getEffectiveMemberships handles tenant visibility, not explicit grants).`);
  console.log(`[verify] No orphan memberships were detected.`);
  console.log(`[verify] IM-6 readiness gate is now: READY.`);
  process.exit(0);
}

main().catch((e) => {
  console.error('[verify] FATAL', e?.message || e);
  process.exit(2);
}).finally(async () => {
  await prisma.$disconnect().catch(() => {});
});

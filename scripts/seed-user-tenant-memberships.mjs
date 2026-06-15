#!/usr/bin/env node
/**
 * IM-1 backfill — populate user_tenant_memberships from existing auth_users rows.
 *
 * Scope (per docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §2.3 "Seed at IM-1 ship time"):
 *   - For every auth_users row with level='tenant' AND tenant_id IS NOT NULL,
 *     insert one membership row (user_id, tenant_id, role='member', granted_by='system',
 *     notes='IM-1 back-fill from auth_users.tenant_id') if no active membership row exists yet.
 *   - level='admin' rows are NOT seeded here. Blanket access (Anton) is handed out by the
 *     separate `scripts/promote-factory-master.mjs --username=<name>`, per §2.6 (a single
 *     boolean capability replaces N seeded rows).
 *   - Bootstrap+`<tenant>@corpflowai.com` rows are NOT touched in IM-1 (deprecated in IM-8).
 *
 * Idempotency:
 *   - Skips users that already have an active (revoked_at IS NULL) membership for their
 *     auth_users.tenant_id. Safe to re-run.
 *   - Uses the DB partial-unique index (user_tenant_memberships_user_tenant_active_unique)
 *     as the final safety net: a concurrent re-run on the same row fails with a unique
 *     violation, not with duplicated data.
 *
 * Behavioural impact: NONE in IM-1. The new column/table are not yet read by any production
 * code path; IM-2 ships the helper `getEffectiveMemberships(user_id)` that reads from here.
 *
 * Usage (PowerShell, repo root):
 *   node scripts/seed-user-tenant-memberships.mjs --dry-run
 *   node scripts/seed-user-tenant-memberships.mjs
 *
 * Env: POSTGRES_URL required (loaded automatically via bootstrap-repo-env.mjs from .env).
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const BACKFILL_GRANTED_BY = 'system';
const BACKFILL_NOTES = 'IM-1 back-fill from auth_users.tenant_id';

async function main() {
  const before = await prisma.userTenantMembership.count();
  console.log(`[seed-user-tenant-memberships] start dry_run=${dryRun} memberships_before=${before}`);

  const candidates = await prisma.authUser.findMany({
    where: { level: 'tenant', tenantId: { not: null }, enabled: true },
    select: { id: true, username: true, tenantId: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log(`[seed-user-tenant-memberships] candidates_level_tenant_with_tenant_id=${candidates.length}`);

  let inserted = 0;
  let skipped_existing = 0;
  let skipped_orphan_tenant = 0;

  for (const u of candidates) {
    if (!u.tenantId) {
      skipped_orphan_tenant += 1;
      continue;
    }

    const existing = await prisma.userTenantMembership.findFirst({
      where: { userId: u.id, tenantId: u.tenantId, revokedAt: null },
      select: { id: true },
    });
    if (existing) {
      skipped_existing += 1;
      continue;
    }

    if (dryRun) {
      console.log(
        `[seed-user-tenant-memberships] WOULD-INSERT user_id=${u.id} username=${u.username} tenant_id=${u.tenantId}`,
      );
      inserted += 1;
      continue;
    }

    try {
      await prisma.userTenantMembership.create({
        data: {
          userId: u.id,
          tenantId: u.tenantId,
          role: 'member',
          enabled: true,
          grantedBy: BACKFILL_GRANTED_BY,
          notes: BACKFILL_NOTES,
        },
      });
      inserted += 1;
      console.log(
        `[seed-user-tenant-memberships] INSERTED user_id=${u.id} username=${u.username} tenant_id=${u.tenantId}`,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const code = /** @type {{ code?: string }} */ (e || {}).code;
      if (code === 'P2002') {
        skipped_existing += 1;
        console.warn(
          `[seed-user-tenant-memberships] RACE-SKIP user_id=${u.id} tenant_id=${u.tenantId} (already inserted by concurrent run)`,
        );
        continue;
      }
      console.error(
        `[seed-user-tenant-memberships] ERROR user_id=${u.id} tenant_id=${u.tenantId} msg=${msg}`,
      );
      throw e;
    }
  }

  const after = await prisma.userTenantMembership.count();
  console.log(
    `[seed-user-tenant-memberships] done dry_run=${dryRun} inserted=${inserted} skipped_existing=${skipped_existing} skipped_orphan_tenant=${skipped_orphan_tenant} memberships_after=${after}`,
  );
}

main()
  .catch((e) => {
    console.error('[seed-user-tenant-memberships] FATAL', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

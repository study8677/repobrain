#!/usr/bin/env node
/**
 * IM-1 — Promote a single auth_users row to factory-master capability.
 *
 * Scope (per docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md §2.6):
 *   - Sets `auth_users.factory_master = true` for ONE user, matched by `--username`.
 *   - Refuses to promote a `level='tenant'` row (the DB CHECK constraint would also reject it,
 *     but failing in JS first gives a clearer error).
 *   - Idempotent: re-running for an already-promoted user is a no-op (`already_true`).
 *   - Does NOT touch any other row.
 *
 * Behavioural impact: NONE in IM-1. No production code currently reads `auth_users.factory_master`;
 * the helper `getEffectiveMemberships(user_id)` arrives in IM-2 and is the first reader.
 *
 * Usage (PowerShell, repo root):
 *   node scripts/promote-factory-master.mjs --username=anton --dry-run
 *   node scripts/promote-factory-master.mjs --username=anton
 *
 *   # Reverse (demotion, also idempotent):
 *   node scripts/promote-factory-master.mjs --username=someone --demote
 *
 * Pre-flight (recommended before running without --dry-run):
 *   # Read-only confirmation that the target row is the intended admin row.
 *   psql $POSTGRES_URL -c \
 *     "SELECT id, username, level, tenant_id, factory_master FROM auth_users WHERE username = '<name>'"
 *
 * Env: POSTGRES_URL required (loaded automatically via bootstrap-repo-env.mjs from .env).
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** @returns {{ username: string | null, dryRun: boolean, demote: boolean }} */
function parseArgs() {
  const out = { username: /** @type {string | null} */ (null), dryRun: false, demote: false };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--demote') out.demote = true;
    else if (arg.startsWith('--username=')) out.username = arg.slice('--username='.length);
  }
  return out;
}

async function main() {
  const { username, dryRun, demote } = parseArgs();
  if (!username || !username.trim()) {
    console.error(
      '[promote-factory-master] FATAL: --username=<name> is required. Example: --username=anton',
    );
    process.exit(2);
  }
  const desiredValue = !demote;
  const action = demote ? 'DEMOTE' : 'PROMOTE';

  console.log(
    `[promote-factory-master] start action=${action} username=${username} dry_run=${dryRun}`,
  );

  const row = await prisma.authUser.findUnique({
    where: { username },
    select: { id: true, username: true, level: true, tenantId: true, factoryMaster: true, enabled: true },
  });
  if (!row) {
    console.error(`[promote-factory-master] FATAL: no auth_users row with username=${username}`);
    process.exit(3);
  }
  console.log(
    `[promote-factory-master] found id=${row.id} level=${row.level} tenant_id=${row.tenantId ?? '(null)'} factory_master=${row.factoryMaster} enabled=${row.enabled}`,
  );

  if (desiredValue && row.level !== 'admin') {
    console.error(
      `[promote-factory-master] FATAL: factory_master=true is operator-only; row level=${row.level}. Refuse.`,
    );
    process.exit(4);
  }

  if (row.factoryMaster === desiredValue) {
    console.log(
      `[promote-factory-master] NO-OP factory_master already ${desiredValue}; nothing to do (idempotent).`,
    );
    return;
  }

  if (dryRun) {
    console.log(
      `[promote-factory-master] WOULD-${action} username=${username} id=${row.id}: factory_master=${row.factoryMaster} -> ${desiredValue}`,
    );
    return;
  }

  const updated = await prisma.authUser.update({
    where: { id: row.id },
    data: { factoryMaster: desiredValue },
    select: { id: true, username: true, level: true, factoryMaster: true },
  });
  console.log(
    `[promote-factory-master] ${action} OK id=${updated.id} username=${updated.username} level=${updated.level} factory_master=${updated.factoryMaster}`,
  );
}

main()
  .catch((e) => {
    console.error('[promote-factory-master] FATAL', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

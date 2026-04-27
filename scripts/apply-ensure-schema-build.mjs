/**
 * Vercel `vercel-build`: apply the same idempotent DDL as POST /api/factory/postgres/ensure-schema
 * using POSTGRES_URL only (no master key). Runs after `prisma generate`, before `next build`.
 *
 * Skip when POSTGRES_URL is unset (local `next build`, some CI).
 * Fails the build on production Vercel when POSTGRES_URL is missing (misconfiguration).
 */
import { PrismaClient } from '@prisma/client';

import { ENSURE_SCHEMA_STATEMENTS } from '../lib/server/postgres-ensure-schema-statements.js';

function snippet(sql) {
  return String(sql || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);
}

async function main() {
  if (String(process.env.CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD || '').toLowerCase() === 'true') {
    console.log('[ensure_schema_build] SKIP: CORPFLOW_SKIP_ENSURE_SCHEMA_BUILD=true');
    return;
  }

  const pgUrl = String(process.env.POSTGRES_URL || '').trim();
  const onVercelProd = Boolean(process.env.VERCEL) && String(process.env.VERCEL_ENV || '') === 'production';

  if (!pgUrl) {
    if (onVercelProd) {
      console.error('[ensure_schema_build] FATAL: VERCEL production build without POSTGRES_URL');
      process.exit(1);
    }
    console.log('[ensure_schema_build] SKIP: POSTGRES_URL not set');
    return;
  }

  const prisma = new PrismaClient();
  const n = ENSURE_SCHEMA_STATEMENTS.length;
  try {
    for (let i = 0; i < n; i++) {
      const sql = ENSURE_SCHEMA_STATEMENTS[i];
      await prisma.$executeRawUnsafe(sql);
      console.log(`[ensure_schema_build] statement_ok index=${i + 1}/${n} sql=${snippet(sql)}`);
    }
    console.warn(
      `[ensure_schema_build] complete ${JSON.stringify({
        statements_executed: n,
        vercel_env: process.env.VERCEL_ENV || null,
      })}`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[ensure_schema_build] FATAL', msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main();

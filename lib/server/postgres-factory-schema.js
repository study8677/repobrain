/**
 * Factory-only: create CorpFlow tables in Postgres if missing (idempotent).
 *
 * Use when you do not want to run SQL manually in Prisma/Vercel consoles.
 * Requires the same auth as other factory repair endpoints (admin session or master key).
 *
 * Route: POST /api/factory/postgres/ensure-schema
 */

import { PrismaClient } from '@prisma/client';

import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import { ENSURE_SCHEMA_STATEMENTS } from './postgres-ensure-schema-statements.js';

function json(res, status, body) {
  res.status(status).json(body);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function postgresFactorySchemaHandler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed' });
  }

  if (!verifyFactoryMasterAuth(req)) {
    return json(res, 403, { error: 'Factory master authentication required.' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return json(res, 503, {
      error: 'POSTGRES_URL_MISSING',
      hint: 'Set POSTGRES_URL in Vercel (pooled Prisma URL is fine).',
    });
  }

  const prisma = new PrismaClient();
  let lastIndex = -1;
  try {
    for (let i = 0; i < ENSURE_SCHEMA_STATEMENTS.length; i++) {
      lastIndex = i;
      await prisma.$executeRawUnsafe(ENSURE_SCHEMA_STATEMENTS[i]);
    }
    try {
      console.warn(
        `[ensure_schema_http] complete ${JSON.stringify({
          statements_executed: ENSURE_SCHEMA_STATEMENTS.length,
        })}`,
      );
    } catch {
      /* ignore */
    }
    return json(res, 200, {
      ok: true,
      statements_executed: ENSURE_SCHEMA_STATEMENTS.length,
      tables: [
        'tenants',
        'auth_users',
        'cmp_tickets',
        'tenant_personas',
        'token_debits',
        'telemetry_events',
        'recovery_vault_entries',
        'tenant_hostnames',
        'automation_events',
        'automation_playbooks',
        'cmp_ticket_attachments',
        'growth_segments',
        'growth_companies',
        'growth_contacts',
        'growth_touchpoints',
        'technical_lead_audits',
      ],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return json(res, 500, {
      ok: false,
      error: 'ENSURE_SCHEMA_FAILED',
      detail: msg,
      failed_statement_index: lastIndex,
      hint:
        lastIndex >= 0
          ? 'Check Postgres logs and permissions. Safe to retry after fixing the underlying error.'
          : 'Prisma could not connect or execute. Verify POSTGRES_URL and network access from Vercel.',
    });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

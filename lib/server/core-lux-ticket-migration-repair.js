/**
 * TEMPORARY operator repair: Lux → Core CMP ticket migration (session auth only).
 *
 * POST /api/factory/core-lux-ticket-migration-repair
 * - Requires HttpOnly admin session (same as core.corpflowai.com/login).
 * - Host must be Core (CORPFLOW_CORE_HOSTS / surface core, or core.corpflowai.com literal).
 * - Rejects tenant surfaces.
 *
 * Disable after use: set CORPFLOW_LUX_CORE_MIGRATION_REPAIR_ENABLED=false
 * REMOVEME: delete this module, route, and public/core-lux-migration-repair.html once migration is verified.
 */

import { buildHardCloseConsoleJsonPatch } from '../cmp/_lib/ticket-hard-close-core.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { buildCorpflowHostContext } from './host-tenant-context.js';
import { cfg } from './runtime-config.js';
import { getSessionFromRequest } from './session.js';

/** @type {const} */
const REPAIR_VERSION = 1;

/** Global idempotency key (automation_events.tenant_scope = global). */
const IDEMPOTENCY_KEY = 'cmp:core:lux-migration-repair:v1';

const LEAVE_UNCHANGED = 'cmo8mjijk0000jl04l1jz0v6d';
const CLOSE_TEST = 'cmo416scl0000ky045lnhwj1o';
const MIGRATE_FROM = ['cmoinjwqi0000kz049lw3zn1u', 'cmny6np61000hjs04sovhe3n9'];

const TEST_CLOSE_REASON = 'Test ticket - no further action';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function isCoreHostForRepair(req) {
  const ctx = req.corpflowContext || buildCorpflowHostContext(req);
  const host = String(ctx?.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '');
  if (host === 'core.corpflowai.com' || host === 'www.core.corpflowai.com') return true;
  return ctx?.surface === 'core';
}

/**
 * @param {unknown} cj
 * @param {string} luxId
 * @param {string} coreId
 * @returns {Record<string, unknown>}
 */
function mergeLuxClosureMigrationNote(cj, luxId, coreId) {
  const patch = buildHardCloseConsoleJsonPatch(cj, {
    reason: 'Migrated to Core workspace',
    contextNote: `Lux ticket ${luxId} retired in favor of Core-only CMP ticket ${coreId}. Operator session repair v${REPAIR_VERSION}.`,
  });
  const cv = patch.client_view && typeof patch.client_view === 'object' ? patch.client_view : {};
  const cl = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};
  return {
    ...patch,
    client_view: {
      ...cv,
      closure: {
        ...cl,
        migrated_to_core_ticket_id: coreId,
        migrated_from_lux_ticket_id: luxId,
      },
    },
  };
}

/**
 * @param {Pick<import('@prisma/client').PrismaClient, 'cmpTicket'>} db
 * @param {string} luxTicketId
 * @returns {Promise<string | null>}
 */
async function findExistingCoreCopyId(db, luxTicketId) {
  const rows = await db.cmpTicket.findMany({
    where: { tenantId: null },
    select: { id: true, consoleJson: true },
    take: 2500,
  });
  for (const r of rows) {
    const cj = r.consoleJson;
    if (cj && typeof cj === 'object' && !Array.isArray(cj)) {
      const mid = cj.core_migration && typeof cj.core_migration === 'object' ? cj.core_migration.migrated_from_ticket_id : null;
      if (String(mid || '') === luxTicketId) return r.id;
    }
  }
  return null;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 * @returns {Promise<void>}
 */
export async function handleCoreLuxTicketMigrationRepair(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (String(cfg('CORPFLOW_LUX_CORE_MIGRATION_REPAIR_ENABLED', 'true')).toLowerCase() === 'false') {
    return res.status(404).json({ error: 'REPAIR_DISABLED' });
  }

  const ctx = req.corpflowContext || buildCorpflowHostContext(req);
  if (ctx?.surface === 'tenant') {
    return res.status(403).json({ error: 'TENANT_HOST_FORBIDDEN' });
  }
  if (!isCoreHostForRepair(req)) {
    return res.status(403).json({ error: 'CORE_HOST_REQUIRED' });
  }

  const sess = getSessionFromRequest(req);
  if (!sess?.ok || sess.payload?.typ !== 'admin') {
    return res.status(401).json({ error: 'ADMIN_SESSION_REQUIRED' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });
  }

  const existing = await prisma.automationEvent.findUnique({
    where: {
      automation_events_scope_idem: {
        tenantScope: 'global',
        idempotencyKey: IDEMPOTENCY_KEY,
      },
    },
    select: { id: true, payload: true },
  });
  if (existing?.payload && typeof existing.payload === 'object') {
    return res.status(200).json({
      ok: true,
      deduped: true,
      repair_version: REPAIR_VERSION,
      automation_event_id: existing.id,
      .../** @type {Record<string, unknown>} */ (existing.payload),
    });
  }

  const leaveRow = await prisma.cmpTicket.findUnique({
    where: { id: LEAVE_UNCHANGED },
    select: { id: true, tenantId: true, status: true, stage: true, description: true },
  });
  if (!leaveRow) {
    return res.status(400).json({ error: 'LEAVE_TICKET_NOT_FOUND', ticket_id: LEAVE_UNCHANGED });
  }
  if (leaveRow.tenantId == null || String(leaveRow.tenantId).trim() === '') {
    return res.status(400).json({ error: 'LEAVE_TICKET_NOT_LUX_SCOPED', ticket_id: LEAVE_UNCHANGED });
  }

  const results = {
    ok: true,
    repair_version: REPAIR_VERSION,
    leave_unchanged: {
      ticket_id: leaveRow.id,
      tenant_id: leaveRow.tenantId,
      status: leaveRow.status,
      stage: leaveRow.stage,
    },
    closed_test_ticket: null,
    migrated: /** @type {Array<Record<string, unknown>>} */ ([]),
    core_ticket_ids: /** @type {string[]} */ ([]),
  };

  try {
    await prisma.$transaction(async (tx) => {
      // --- Close Lux test ticket (idempotent) ---
      const testRow = await tx.cmpTicket.findUnique({
        where: { id: CLOSE_TEST },
        select: { id: true, tenantId: true, status: true, consoleJson: true },
      });
      if (!testRow) {
        throw Object.assign(new Error('CLOSE_TEST_NOT_FOUND'), { code: 'CLOSE_TEST_NOT_FOUND' });
      }
      if (testRow.tenantId == null || String(testRow.tenantId).trim() === '') {
        throw Object.assign(new Error('CLOSE_TEST_NOT_TENANT'), { code: 'CLOSE_TEST_NOT_TENANT' });
      }
      const testClosed =
        String(testRow.status || '')
          .trim()
          .toLowerCase() === 'closed';
      if (!testClosed) {
        const nextCj = buildHardCloseConsoleJsonPatch(testRow.consoleJson, {
          reason: TEST_CLOSE_REASON,
          contextNote: 'Closed via Core operator repair (admin session).',
        });
        await tx.cmpTicket.update({
          where: { id: CLOSE_TEST },
          data: { status: 'Closed', stage: 'Closed', consoleJson: nextCj },
        });
        results.closed_test_ticket = { ticket_id: CLOSE_TEST, action: 'closed' };
      } else {
        results.closed_test_ticket = { ticket_id: CLOSE_TEST, action: 'already_closed' };
      }

      // --- Migrate two Lux tickets → Core copies; close Lux originals ---
      for (const luxId of MIGRATE_FROM) {
        const src = await tx.cmpTicket.findUnique({ where: { id: luxId } });
        if (!src) {
          throw Object.assign(new Error(`MIGRATE_SOURCE_NOT_FOUND:${luxId}`), { code: 'MIGRATE_SOURCE_NOT_FOUND' });
        }
        if (src.tenantId == null || String(src.tenantId).trim() === '') {
          throw Object.assign(new Error(`MIGRATE_SOURCE_NOT_TENANT:${luxId}`), { code: 'MIGRATE_SOURCE_NOT_TENANT' });
        }

        const srcCj =
          src.consoleJson && typeof src.consoleJson === 'object' && !Array.isArray(src.consoleJson)
            ? src.consoleJson
            : {};
        const outcome =
          srcCj.core_migration_outcome && typeof srcCj.core_migration_outcome === 'object'
            ? srcCj.core_migration_outcome
            : null;
        let coreId = (await findExistingCoreCopyId(tx, luxId)) || '';
        if (!coreId && outcome?.migrated_to_core_ticket_id) {
          coreId = String(outcome.migrated_to_core_ticket_id).trim();
        }

        if (!coreId) {
          const baseCv = srcCj.client_view && typeof srcCj.client_view === 'object' ? { ...srcCj.client_view } : {};
          const nextConsole = {
            ...srcCj,
            core_migration: {
              migrated_from_ticket_id: luxId,
              migrated_from_tenant_id: src.tenantId != null ? String(src.tenantId) : null,
              created_via: 'core-lux-ticket-migration-repair',
              repair_version: REPAIR_VERSION,
            },
            client_view: {
              ...baseCv,
              workflow_state: 'intake',
              workflow_next_action: 'Continue on Core workspace — migrated from Lux ticket.',
              progress_message: 'Ticket recreated on Core host for operator queue.',
            },
          };
          const created = await tx.cmpTicket.create({
            data: {
              tenantId: null,
              description: src.description,
              title: src.title,
              brief: src.brief,
              locale: src.locale,
              status: 'Open',
              stage: 'Intake',
              consoleJson: nextConsole,
            },
            select: { id: true },
          });
          coreId = created.id;
          results.core_ticket_ids.push(coreId);
          results.migrated.push({
            lux_ticket_id: luxId,
            core_ticket_id: coreId,
            action: 'created_core_copy',
          });
        } else {
          if (!results.core_ticket_ids.includes(coreId)) results.core_ticket_ids.push(coreId);
          results.migrated.push({
            lux_ticket_id: luxId,
            core_ticket_id: coreId,
            action: 'core_copy_already_existed',
          });
        }

        const luxFresh = await tx.cmpTicket.findUnique({
          where: { id: luxId },
          select: { status: true, consoleJson: true },
        });
        const luxAlreadyClosed =
          String(luxFresh?.status || '')
            .trim()
            .toLowerCase() === 'closed';
        if (!luxAlreadyClosed) {
          const luxCloseJson = mergeLuxClosureMigrationNote(luxFresh?.consoleJson, luxId, coreId);
          await tx.cmpTicket.update({
            where: { id: luxId },
            data: {
              status: 'Closed',
              stage: 'Closed',
              consoleJson: {
                ...luxCloseJson,
                core_migration_outcome: {
                  migrated_to_core_ticket_id: coreId,
                  repair_version: REPAIR_VERSION,
                  closed_at: new Date().toISOString(),
                },
              },
            },
          });
          const last = results.migrated[results.migrated.length - 1];
          if (last && last.lux_ticket_id === luxId) last.lux_closed = true;
        } else {
          const last = results.migrated[results.migrated.length - 1];
          if (last && last.lux_ticket_id === luxId) last.lux_closed = 'already_closed';
        }
      }

      const leaveAfter = await tx.cmpTicket.findUnique({
        where: { id: LEAVE_UNCHANGED },
        select: { tenantId: true, status: true, stage: true, description: true, updatedAt: true },
      });
      if (!leaveAfter) {
        throw Object.assign(new Error('LEAVE_TICKET_MISSING_AFTER_TXN'), { code: 'LEAVE_TICKET_MISSING_AFTER_TXN' });
      }
      if (String(leaveAfter.description || '') !== String(leaveRow.description || '')) {
        throw Object.assign(new Error('LEAVE_TICKET_DESCRIPTION_MUTATED'), { code: 'LEAVE_TICKET_DESCRIPTION_MUTATED' });
      }
      if (String(leaveAfter.tenantId || '') !== String(leaveRow.tenantId || '')) {
        throw Object.assign(new Error('LEAVE_TICKET_TENANT_MUTATED'), { code: 'LEAVE_TICKET_TENANT_MUTATED' });
      }
    });
  } catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? String(/** @type {{ code?: string }} */ (e).code) : '';
    if (code === 'CLOSE_TEST_NOT_FOUND' || code === 'MIGRATE_SOURCE_NOT_FOUND') {
      return res.status(400).json({ error: code, detail: String(e?.message || e) });
    }
    if (code === 'CLOSE_TEST_NOT_TENANT' || code === 'MIGRATE_SOURCE_NOT_TENANT') {
      return res.status(400).json({ error: code, detail: String(e?.message || e) });
    }
    if (code?.startsWith('LEAVE_TICKET_')) {
      return res.status(500).json({ error: code, detail: String(e?.message || e) });
    }
    console.error('core-lux-ticket-migration-repair', e);
    return res.status(500).json({ error: 'REPAIR_TRANSACTION_FAILED', detail: String(e?.message || e) });
  }

  const completionPayload = {
    repair_version: REPAIR_VERSION,
    leave_unchanged: results.leave_unchanged,
    closed_test_ticket: results.closed_test_ticket,
    migrated: results.migrated,
    core_ticket_ids: results.core_ticket_ids,
  };

  await recordTrustedAutomationEvent(prisma, {
    tenantId: null,
    eventType: 'cmp.core_migration.repair_complete',
    idempotencyKey: IDEMPOTENCY_KEY,
    correlationId: `core-lux-migration-repair-v${REPAIR_VERSION}`,
    source: 'core-lux-ticket-migration-repair',
    payload: completionPayload,
  });

  if (results.closed_test_ticket?.action === 'closed') {
    await recordTrustedAutomationEvent(prisma, {
      tenantId: null,
      eventType: 'cmp.core_migration.lux_test_closed',
      idempotencyKey: `cmp:core:migration:lux_test_closed:${CLOSE_TEST}`,
      source: 'core-lux-ticket-migration-repair',
      payload: { ticket_id: CLOSE_TEST, reason: TEST_CLOSE_REASON, repair_version: REPAIR_VERSION },
    });
  }

  for (const m of results.migrated) {
    if (!m || typeof m !== 'object') continue;
    const luxId = String(m.lux_ticket_id || '');
    const coreId = String(m.core_ticket_id || '');
    if (!luxId || !coreId) continue;
    if (m.action === 'created_core_copy') {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: null,
        eventType: 'cmp.core_migration.core_ticket_created',
        idempotencyKey: `cmp:core:migration:core_created:${luxId}`,
        source: 'core-lux-ticket-migration-repair',
        payload: { lux_ticket_id: luxId, core_ticket_id: coreId, repair_version: REPAIR_VERSION },
      });
    }
    if (m.lux_closed === true) {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: null,
        eventType: 'cmp.core_migration.lux_original_closed',
        idempotencyKey: `cmp:core:migration:lux_closed:${luxId}`,
        source: 'core-lux-ticket-migration-repair',
        payload: { lux_ticket_id: luxId, core_ticket_id: coreId, repair_version: REPAIR_VERSION },
      });
    }
  }

  return res.status(200).json(results);
}

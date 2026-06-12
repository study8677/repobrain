#!/usr/bin/env node
/**
 * Operator-queue cleanup script — close the 18 historical Phase 4C.1 attachment-review
 * smoke / test artifact tickets on the `luxe-maurice` tenant.
 *
 * Goals (per the 2026-06-11 LuxeMaurice operator queue cleanup packet):
 *   - Reduce operator noise on `/change` without losing audit history.
 *   - Close (not delete) only the 18 audited rows.
 *   - Preserve all attachments, messages, console_json history.
 *   - Use the canonical `buildHardCloseConsoleJsonPatch` so closed rows render with the
 *     same `client_view.workflow_state='closed'` semantics as other hard-closed tickets.
 *   - Never touch the master strategic programme ticket `cmo8mjijk0000jl04l1jz0v6d`.
 *   - Never touch the active content sprint parent `cmqa2y2ga0000l704glnfro1f`.
 *
 * All pure logic (target list, protected list, pre-write checks, console_json merge,
 * message append) lives in `lib/cmp/_lib/lux-phase4c1-smoke-cleanup.js` and is
 * unit-tested in `node-tests/lux-phase4c1-smoke-cleanup.test.mjs`. This CLI is just
 * the Prisma wiring + dry-run / execute orchestration around those helpers.
 *
 * Safety:
 *   - Dry-run by default. `--execute` is required to actually write.
 *   - Refuses to run if `POSTGRES_URL` (or `POSTGRES_PRISMA_URL`) is not set.
 *   - Refuses to run if any protected ticket id ever appears in the target set, or if
 *     the target set is not exactly 18 unique ids.
 *   - Per-row pre-write re-check (tenant lock, status != Closed, Phase 4C.1 smoke
 *     description heuristic, non-terminal stage/workflow).
 *   - Any non-`already-closed` refusal aborts the whole run — nothing is written.
 *
 * Usage:
 *   node scripts/lux-close-phase4c1-smoke-tickets.mjs                       # dry-run
 *   node scripts/lux-close-phase4c1-smoke-tickets.mjs --execute             # actually write
 *   node scripts/lux-close-phase4c1-smoke-tickets.mjs --output=path.json    # save snapshot
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  LUX_TENANT_ID,
  PROTECTED_TICKETS,
  TARGET_TICKETS,
  preflightConfigCheck,
  preWriteCheck,
  applyHardCloseAndAppendMessage,
} from '../lib/cmp/_lib/lux-phase4c1-smoke-cleanup.js';

function ensureOutputDir(outputPath) {
  if (!outputPath) return;
  const dir = path.dirname(path.resolve(outputPath));
  try {
    mkdirSync(dir, { recursive: true });
  } catch {
    /* ignore */
  }
}

async function main() {
  const args = process.argv.slice(2);
  const EXECUTE = args.includes('--execute');
  const outputArg = args.find((a) => a.startsWith('--output='));
  const outputPath = outputArg ? outputArg.slice('--output='.length) : '';
  ensureOutputDir(outputPath);

  if (!process.env.POSTGRES_URL && !process.env.POSTGRES_PRISMA_URL) {
    console.error('Refusing to run: POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
    process.exit(2);
  }

  const preflight = preflightConfigCheck();
  if (preflight.ok !== true) {
    console.error('Refusing to run: preflight config check failed —', preflight.reason);
    process.exit(3);
  }

  const prisma = new PrismaClient();
  const nowIso = new Date().toISOString();

  const summary = {
    generated_at: nowIso,
    mode: EXECUTE ? 'execute' : 'dry-run',
    tenant: LUX_TENANT_ID,
    target_count: TARGET_TICKETS.length,
    protected_tickets: PROTECTED_TICKETS,
    rows: [],
    counts: {
      would_close: 0,
      closed: 0,
      already_closed: 0,
      skipped: 0,
      refused: 0,
      not_found: 0,
    },
    refusals: [],
  };

  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { id: { in: [...TARGET_TICKETS] } },
      select: {
        id: true,
        tenantId: true,
        status: true,
        stage: true,
        title: true,
        description: true,
        consoleJson: true,
      },
    });

    const byId = new Map(rows.map((r) => [r.id, r]));
    for (const id of TARGET_TICKETS) {
      const row = byId.get(id);
      if (!row) {
        summary.rows.push({ id, action: 'not-found', reason: 'no-matching-row' });
        summary.counts.not_found += 1;
        continue;
      }
      const check = preWriteCheck(row);
      if (check.ok !== true) {
        if (check.reason === 'already-closed') {
          summary.rows.push({
            id,
            action: 'skip',
            reason: 'already-closed',
            before: { status: row.status, stage: row.stage },
          });
          summary.counts.already_closed += 1;
          summary.counts.skipped += 1;
        } else {
          summary.rows.push({
            id,
            action: 'refuse',
            reason: check.reason,
            before: { status: row.status, stage: row.stage, tenant: row.tenantId },
          });
          summary.counts.refused += 1;
          summary.refusals.push({ id, reason: check.reason });
        }
      } else if (!EXECUTE) {
        summary.rows.push({
          id,
          action: 'would-close',
          before: { status: row.status, stage: row.stage },
        });
        summary.counts.would_close += 1;
      } else {
        const nextCj = applyHardCloseAndAppendMessage(row.consoleJson, nowIso);
        await prisma.cmpTicket.update({
          where: { id },
          data: {
            status: 'Closed',
            stage: 'Closed',
            consoleJson: nextCj,
          },
        });
        summary.rows.push({
          id,
          action: 'closed',
          before: { status: row.status, stage: row.stage },
          after: { status: 'Closed', stage: 'Closed', workflow_state: 'closed' },
        });
        summary.counts.closed += 1;
      }
    }

    if (summary.refusals.length > 0) {
      console.error('Refusing to continue — refusals detected:');
      for (const r of summary.refusals) console.error('  -', r.id, r.reason);
      const out = JSON.stringify(summary, null, 2) + '\n';
      process.stdout.write(out);
      if (outputPath) writeFileSync(outputPath, out, 'utf8');
      process.exit(5);
    }

    const out = JSON.stringify(summary, null, 2) + '\n';
    process.stdout.write(out);
    if (outputPath) writeFileSync(outputPath, out, 'utf8');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('lux-close-phase4c1-smoke-tickets failed:', e?.message || e);
  process.exit(1);
});

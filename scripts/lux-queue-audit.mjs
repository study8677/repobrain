#!/usr/bin/env node
/**
 * READ-ONLY: dump the LuxeMaurice operator queue classified by bucket.
 *
 * Uses the same bucket logic as the live `/change` operator desk
 * (`lib/client/lux-change-queue-classify.js`). No writes; no mutations.
 *
 * Purpose: audit the "Internal" bucket on the live Lux operator queue
 * without touching the database or the UI. Output is suitable for paste
 * back into chat or for follow-up classification work.
 *
 * Usage:
 *   node scripts/lux-queue-audit.mjs
 *   node scripts/lux-queue-audit.mjs --include-closed
 *   node scripts/lux-queue-audit.mjs --output=.lux-verify/queue-audit.json
 *   node scripts/lux-queue-audit.mjs --limit=300 --include-closed --output=.lux-verify/queue-audit.json
 *
 * Env: POSTGRES_URL (Neon Prisma URL is fine).
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import {
  classifyLuxChangeQueueTicket,
  groupLuxOperatorQueueTickets,
} from '../lib/client/lux-change-queue-classify.js';

const LUX_TENANT_ID = 'luxe-maurice';

function argValue(prefix, fallback = '') {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return fallback;
  const i = a.indexOf('=');
  if (i < 0) return fallback;
  return String(a.slice(i + 1)).trim();
}

const INCLUDE_CLOSED = process.argv.includes('--include-closed');
const LIMIT = Math.max(1, Math.min(1000, Number(argValue('--limit', '300')) || 300));
const OUTPUT = argValue('--output', '');

function shortDesc(s, n = 100) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

function ageDays(d) {
  if (!d) return null;
  const ms = Date.now() - new Date(d).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  return Math.round((ms / 86_400_000) * 10) / 10;
}

function pluck(rows) {
  return rows.map((r) => ({
    ticket_id: r.id,
    requested_change: shortDesc(r.description, 140),
    status: r.status || '',
    stage: r.stage || '',
    created_at: r.createdAt ? new Date(r.createdAt).toISOString() : null,
    updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : null,
    age_days: ageDays(r.createdAt),
    workflow_state: (() => {
      try {
        const cj = r.consoleJson || {};
        if (cj && typeof cj === 'object') {
          if (cj.client_view && typeof cj.client_view === 'object') {
            return cj.client_view.workflow_state || '';
          }
        }
        return '';
      } catch {
        return '';
      }
    })(),
  }));
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL is not set. Source your operator env first.');
    process.exit(2);
  }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { tenantId: LUX_TENANT_ID },
      orderBy: { updatedAt: 'desc' },
      take: LIMIT,
      select: {
        id: true,
        tenantId: true,
        status: true,
        stage: true,
        description: true,
        consoleJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const openish = INCLUDE_CLOSED
      ? rows
      : rows.filter((r) => String(r.status || '').trim().toLowerCase() !== 'closed');

    // Match the live operator queue truncation (lib/cmp/router.js shortenRequestedChange — 120 chars).
    // Pass status / stage / workflow_state so the classifier can route terminal-closed rows
    // into the `archived_completed` bucket instead of leaking into Smoke / Active.
    const queueRows = openish.map((r) => ({
      ticket_id: r.id,
      requested_change: shortDesc(r.description, 120),
      status: r.status || '',
      stage: r.stage || '',
      workflow_state: (() => {
        try {
          const cj = r.consoleJson && typeof r.consoleJson === 'object' ? r.consoleJson : {};
          const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
          return cv.workflow_state || '';
        } catch {
          return '';
        }
      })(),
    }));

    const {
      counts,
      programme,
      activeClient,
      propertyMedia,
      crmLeads,
      internal,
      archivedSmoke,
      archivedCompleted,
    } = groupLuxOperatorQueueTickets(queueRows);

    const enrich = (groupRows) => {
      const out = [];
      for (const g of groupRows) {
        const src = openish.find((r) => r.id === g.ticket_id);
        if (!src) continue;
        const enrichedRow = pluck([src])[0];
        const cls = classifyLuxChangeQueueTicket({
          ticket_id: src.id,
          requested_change: src.description || '',
          status: enrichedRow.status,
          stage: enrichedRow.stage,
          workflow_state: enrichedRow.workflow_state,
        });
        out.push({
          ...enrichedRow,
          bucket: cls.bucket,
          badge: cls.badge,
        });
      }
      return out;
    };

    const report = {
      generated_at: new Date().toISOString(),
      tenant_id: LUX_TENANT_ID,
      include_closed: INCLUDE_CLOSED,
      query_limit: LIMIT,
      total_rows_considered: openish.length,
      counts,
      buckets: {
        programme: enrich(programme),
        active_client: enrich(activeClient),
        property_media: enrich(propertyMedia),
        crm_leads: enrich(crmLeads),
        internal: enrich(internal),
        archived_smoke: enrich(archivedSmoke),
        archived_completed: enrich(archivedCompleted),
      },
    };

    if (OUTPUT) {
      mkdirSync(path.dirname(path.resolve(OUTPUT)), { recursive: true });
      writeFileSync(path.resolve(OUTPUT), JSON.stringify(report, null, 2), 'utf8');
      console.error(`wrote ${OUTPUT}`);
    }

    const lines = [];
    lines.push(`# Lux operator queue audit — ${report.generated_at}`);
    lines.push('');
    lines.push(`Tenant: ${LUX_TENANT_ID}  include_closed=${INCLUDE_CLOSED}  rows=${openish.length}/${rows.length}`);
    lines.push('');
    lines.push('## Bucket counts');
    for (const [k, v] of Object.entries(counts)) {
      lines.push(`- ${k}: ${v}`);
    }
    lines.push('');

    const dumpBucket = (label, group) => {
      lines.push(`## ${label} (${group.length})`);
      if (!group.length) {
        lines.push('_(none)_');
        lines.push('');
        return;
      }
      lines.push('| # | ticket_id | status | stage | workflow | age_d | title |');
      lines.push('|---|---|---|---|---|---|---|');
      group.forEach((row, i) => {
        const t = row.requested_change ? row.requested_change.replace(/\|/g, '\\|') : '_(blank)_';
        lines.push(
          `| ${i + 1} | \`${row.ticket_id}\` | ${row.status || '-'} | ${row.stage || '-'} | ${row.workflow_state || '-'} | ${row.age_days ?? '-'} | ${t} |`,
        );
      });
      lines.push('');
    };

    dumpBucket('Programme', report.buckets.programme);
    dumpBucket('Internal (blank-titled)', report.buckets.internal);
    dumpBucket('Active client', report.buckets.active_client);
    dumpBucket('Property & media', report.buckets.property_media);
    dumpBucket('CRM / leads', report.buckets.crm_leads);
    dumpBucket('Archived smoke / test', report.buckets.archived_smoke);
    dumpBucket('Archived / completed', report.buckets.archived_completed);

    process.stdout.write(lines.join('\n') + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('audit failed:', e?.message || e);
  process.exit(1);
});

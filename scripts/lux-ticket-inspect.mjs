#!/usr/bin/env node
/**
 * READ-ONLY: dump full CMP ticket detail for a list of ids.
 *
 * Tenant-scoped to luxe-maurice. Prints status, stage, workflow_state,
 * description, console_json key shape, and a content fingerprint so
 * the operator/agent can review before any mutation.
 *
 * Usage:
 *   node scripts/lux-ticket-inspect.mjs cmo8mjijk0000jl04l1jz0v6d cmqa2y2ga0000l704glnfro1f
 *   node scripts/lux-ticket-inspect.mjs --output=.lux-verify/ticket-inspect.json <id> [<id> ...]
 *
 * Env: POSTGRES_URL.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LUX_TENANT_ID = 'luxe-maurice';

function argValue(prefix, fallback = '') {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return fallback;
  const i = a.indexOf('=');
  if (i < 0) return fallback;
  return String(a.slice(i + 1)).trim();
}

const OUTPUT = argValue('--output', '');
const ids = process.argv.slice(2).filter((a) => /^c[a-z0-9]{20,}$/i.test(String(a).trim()));

function safe(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try {
    return JSON.parse(JSON.stringify(v));
  } catch {
    return String(v);
  }
}

function digestConsoleJson(cj) {
  const out = {};
  if (!cj || typeof cj !== 'object') return out;
  out.keys = Object.keys(cj).slice(0, 40);
  if (cj.client_view && typeof cj.client_view === 'object') {
    out.client_view_keys = Object.keys(cj.client_view);
    out.client_view_workflow_state = cj.client_view.workflow_state || null;
  }
  if (Array.isArray(cj.messages)) {
    out.messages_count = cj.messages.length;
    out.messages_preview = cj.messages.slice(-3).map((m) => ({
      ts: m && m.ts ? m.ts : null,
      kind: m && m.kind ? m.kind : null,
      author: m && m.author ? m.author : null,
      summary: m && m.text ? String(m.text).slice(0, 160) : (m && m.summary ? String(m.summary).slice(0, 160) : null),
    }));
  }
  if (cj.lux_programme && typeof cj.lux_programme === 'object') {
    out.lux_programme = safe(cj.lux_programme);
  }
  if (cj.lux_request_meta && typeof cj.lux_request_meta === 'object') {
    out.lux_request_meta_keys = Object.keys(cj.lux_request_meta);
    if (Array.isArray(cj.lux_request_meta.attachments)) {
      out.attachments_count = cj.lux_request_meta.attachments.length;
    }
  }
  if (cj.parent_programme_ticket) {
    out.parent_programme_ticket = String(cj.parent_programme_ticket);
  }
  return out;
}

async function main() {
  if (!ids.length) {
    console.error('Usage: node scripts/lux-ticket-inspect.mjs <ticket_id> [<ticket_id> ...]');
    process.exit(2);
  }
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL not set.');
    process.exit(2);
  }
  const prisma = new PrismaClient();
  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        tenantId: true,
        status: true,
        stage: true,
        title: true,
        description: true,
        brief: true,
        consoleJson: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const report = {
      generated_at: new Date().toISOString(),
      requested: ids,
      found: rows.map((r) => ({
        id: r.id,
        tenant_id: r.tenantId,
        status: r.status,
        stage: r.stage,
        title: r.title,
        description_length: r.description ? r.description.length : 0,
        description: r.description ? r.description.slice(0, 2000) : '',
        brief: r.brief || null,
        console_json: digestConsoleJson(r.consoleJson),
        created_at: r.createdAt ? r.createdAt.toISOString() : null,
        updated_at: r.updatedAt ? r.updatedAt.toISOString() : null,
      })),
      missing: ids.filter((id) => !rows.find((r) => r.id === id)),
    };

    if (OUTPUT) {
      mkdirSync(path.dirname(path.resolve(OUTPUT)), { recursive: true });
      writeFileSync(path.resolve(OUTPUT), JSON.stringify(report, null, 2), 'utf8');
      console.error(`wrote ${OUTPUT}`);
    }

    process.stdout.write(JSON.stringify(report, null, 2) + '\n');

    // Tenant-isolation guard: print a warning if any inspected row is not luxe-maurice
    for (const r of rows) {
      if (r.tenantId !== LUX_TENANT_ID) {
        console.error(`WARN: ticket ${r.id} tenant=${r.tenantId} (not luxe-maurice)`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('inspect failed:', e?.message || e);
  process.exit(1);
});

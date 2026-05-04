#!/usr/bin/env node
/**
 * Consolidate duplicate Core/provider (tenant_id null) /change tickets into one canonical parent.
 * Does not delete rows, does not mutate tenant_id, does not touch non-null tenant tickets.
 *
 * Canonical parent (fixed):
 *   cmol5ik770001jo04cbwxidnr
 *
 * Dry-run (default):
 *   node scripts/core-consolidate-provider-change-tickets.mjs
 *
 * Apply:
 *   node scripts/core-consolidate-provider-change-tickets.mjs --execute
 *
 * Env: POSTGRES_URL (or POSTGRES_PRISMA_URL)
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CANONICAL_ID = 'cmol5ik770001jo04cbwxidnr';

const KEYWORDS = [
  'Change Console',
  'Change Space',
  'Core/provider',
  'provider operating process',
  'clean restart',
  'intake to verified delivery',
  'frictionless request',
  '/change operator queue',
  'operator queue',
  'CorpFlowAI Core',
  'canonical Core ticket',
];

const OPERATING_PROMPT = [
  '## Current operating prompt (Cursor)',
  '',
  '**Goal:** Ship Core /change operator queue fix and then prepare frictionless request creation inside /change.',
  '',
  '**Part 1 — Queue fix first:**',
  '- Ensure Core admin on core.corpflowai.com can load tenantId null provider tickets in /change.',
  '- Verify /change operator queue returns 200.',
  '- Verify canonical ticket cmol5ik770001jo04cbwxidnr appears and can be selected.',
  '- Do not touch tenant tickets.',
  '',
  '**Part 2 — Frictionless creation:**',
  '- Add a visible New request button inside /change.',
  '- Simple plain-language form.',
  '- Creates ticket through existing /api/cmp/router?action=ticket-create.',
  '- Body should only include description + locale unless tenant session requires tenant scoping.',
  '- Core admin on core.corpflowai.com creates tenantId null provider ticket.',
  '- After creation, refresh queue and auto-select the new ticket.',
  '',
].join('\n');

const execute = process.argv.includes('--execute');

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) is required.');
  process.exit(1);
}

function assertNullTenant(row, label) {
  const tid = row.tenantId != null ? String(row.tenantId).trim() : null;
  if (tid !== null && tid !== '') {
    throw new Error(`${label}: expected tenant_id null, got ${JSON.stringify(row.tenantId)}`);
  }
}

function childHeading(id) {
  return `### Superseded child: \`${id}\``;
}

function parentHasChildSection(desc, childId) {
  return String(desc || '').includes(childHeading(childId));
}

function buildSupersededConsoleJson(consoleJson, { parentId, nowIso }) {
  const prev = consoleJson && typeof consoleJson === 'object' && !Array.isArray(consoleJson) ? { ...consoleJson } : {};
  const prevCv = prev.client_view && typeof prev.client_view === 'object' ? { ...prev.client_view } : {};
  return {
    ...prev,
    client_view: {
      ...prevCv,
      workflow_state: 'closed',
      workflow_next_action: `Superseded by canonical ticket ${parentId}.`,
      progress_message: `Duplicate closed — canonical work is tracked under ${parentId}.`,
      closure: {
        kind: 'replaced',
        superseded_by_ticket_id: parentId,
        reason: 'Core/provider duplicate consolidated into canonical parent ticket.',
        decided_at: nowIso,
        context_note:
          'Operator consolidation: context merged into parent description. Row preserved (no delete). tenant_id unchanged.',
      },
    },
  };
}

function excerptDescription(raw, max = 6000) {
  const s = String(raw || '').trim();
  if (!s) return '_(no description)_';
  return s.length > max ? s.slice(0, max) + '\n\n…(truncated)…' : s;
}

function refLine(row) {
  const t = row.title != null ? String(row.title).trim() : '';
  if (t) return t;
  const d = String(row.description || '').trim();
  const first = d.split(/\r?\n/).find((x) => String(x).trim()) || '';
  const one = first.replace(/\s+/g, ' ').trim();
  return one ? one.slice(0, 160) : '_(no title)_';
}

const nowIso = new Date().toISOString();

const orClause = [];
for (const k of KEYWORDS) {
  orClause.push({ description: { contains: k, mode: 'insensitive' } });
  orClause.push({ title: { contains: k, mode: 'insensitive' } });
}

const canonical = await prisma.cmpTicket.findUnique({
  where: { id: CANONICAL_ID },
  select: { id: true, tenantId: true, status: true, stage: true, description: true, title: true, consoleJson: true },
});

if (!canonical) {
  console.error(JSON.stringify({ ok: false, error: 'canonical_ticket_not_found', id: CANONICAL_ID }, null, 2));
  await prisma.$disconnect();
  process.exit(2);
}

assertNullTenant(canonical, 'canonical');

const stCanon = String(canonical.status || '').trim().toLowerCase();
if (stCanon === 'closed') {
  console.error(
    JSON.stringify(
      {
        ok: false,
        error: 'canonical_is_closed_abort',
        id: CANONICAL_ID,
        status: canonical.status,
      },
      null,
      2,
    ),
  );
  await prisma.$disconnect();
  process.exit(3);
}

const dupes = await prisma.cmpTicket.findMany({
  where: {
    tenantId: null,
    id: { not: CANONICAL_ID },
    NOT: { status: { equals: 'Closed', mode: 'insensitive' } },
    OR: orClause,
  },
  orderBy: { createdAt: 'asc' },
  select: {
    id: true,
    tenantId: true,
    status: true,
    stage: true,
    title: true,
    description: true,
    consoleJson: true,
    createdAt: true,
    updatedAt: true,
  },
});

for (const r of dupes) assertNullTenant(r, `duplicate ${r.id}`);

const report = {
  ok: true,
  canonical_ticket_id: CANONICAL_ID,
  canonical_status_before: canonical.status,
  canonical_stage_before: canonical.stage,
  duplicate_ticket_ids: dupes.map((r) => r.id),
  duplicate_count: dupes.length,
  execute,
  actions: [],
};

let nextDesc = String(canonical.description || '');
const cj0 =
  canonical.consoleJson && typeof canonical.consoleJson === 'object' && !Array.isArray(canonical.consoleJson)
    ? { ...canonical.consoleJson }
    : {};
const prevConsol =
  cj0.core_provider_consolidation && typeof cj0.core_provider_consolidation === 'object'
    ? { ...cj0.core_provider_consolidation }
    : {};
const initialAuditLen = Array.isArray(prevConsol.audit_trail) ? prevConsol.audit_trail.length : 0;
const auditTrail = Array.isArray(prevConsol.audit_trail) ? [...prevConsol.audit_trail] : [];

const CONTEXT_HEADER = '## Superseded child ticket context';

for (const row of dupes) {
  const id = row.id;
  const ref = refLine(row).slice(0, 500);
  const hadSection = parentHasChildSection(nextDesc, id);
  if (!hadSection) {
    if (!nextDesc.includes(CONTEXT_HEADER)) {
      nextDesc = nextDesc.trimEnd() + '\n\n---\n\n' + CONTEXT_HEADER + '\n';
    }
    const block = [
      '',
      childHeading(id),
      '',
      `- **Reference:** ${ref}`,
      `- **Status at consolidation:** ${String(row.status || '')} / stage ${String(row.stage || '')}`,
      `- **Created:** ${row.createdAt.toISOString()}`,
      '',
      excerptDescription(row.description),
      '',
    ].join('\n');
    nextDesc = nextDesc.trimEnd() + block;
    auditTrail.push({
      at: nowIso,
      action: 'merged_child_description',
      child_ticket_id: id,
      child_reference: ref,
    });
    report.actions.push({ ticket_id: id, merged_section_into_parent: true, closed_superseded: null });
  } else {
    report.actions.push({
      ticket_id: id,
      merged_section_into_parent: false,
      reason: 'already_present',
      closed_superseded: null,
    });
  }

  const cj = row.consoleJson && typeof row.consoleJson === 'object' && !Array.isArray(row.consoleJson) ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const cl = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};
  const alreadyReplaced =
    String(row.status || '').toLowerCase() === 'closed' &&
    String(cl.kind || '').toLowerCase() === 'replaced' &&
    String(cl.superseded_by_ticket_id || '') === CANONICAL_ID;

  const act = report.actions[report.actions.length - 1];
  if (execute && !alreadyReplaced) {
    const nextCj = buildSupersededConsoleJson(row.consoleJson, { parentId: CANONICAL_ID, nowIso });
    await prisma.cmpTicket.update({
      where: { id },
      data: {
        status: 'Closed',
        stage: 'Closed',
        consoleJson: nextCj,
      },
    });
    act.closed_superseded = true;
  } else if (alreadyReplaced) {
    act.closed_superseded = 'already_closed_superseded_to_canonical';
  } else {
    act.closed_superseded = execute ? false : 'dry_run';
  }
}

const promptFingerprint = 'Ship Core /change operator queue fix and then prepare frictionless';
if (!nextDesc.includes(promptFingerprint)) {
  nextDesc = nextDesc.trimEnd() + '\n\n---\n\n' + OPERATING_PROMPT + '\n';
  auditTrail.push({ at: nowIso, action: 'appended_operating_prompt' });
  report.operating_prompt = 'appended';
} else {
  report.operating_prompt = 'unchanged_already_present';
}

const childRefs = [...new Set([...(Array.isArray(prevConsol.child_ticket_ids) ? prevConsol.child_ticket_ids : []), ...dupes.map((d) => d.id)])];

const prevVersion = Number(prevConsol.version) || 0;
const consolidationAuditAdded = auditTrail.length > initialAuditLen;
const nextVersion = consolidationAuditAdded ? prevVersion + 1 : prevVersion;

const nextConsole = {
  ...cj0,
  core_provider_consolidation: {
    ...prevConsol,
    version: nextVersion,
    canonical_ticket_id: CANONICAL_ID,
    child_ticket_ids: childRefs,
    last_consolidated_at: consolidationAuditAdded ? nowIso : prevConsol.last_consolidated_at || null,
    audit_trail: auditTrail,
  },
};

const descChanged = nextDesc.trim() !== String(canonical.description || '').trim();
const parentNeedsWrite = descChanged || consolidationAuditAdded;

if (execute) {
  if (parentNeedsWrite) {
    await prisma.cmpTicket.update({
      where: { id: CANONICAL_ID },
      data: {
        description: nextDesc,
        consoleJson: nextConsole,
      },
    });
  } else {
    report.parent_update_skipped = 'idempotent_no_description_or_audit_change';
  }
}

const refreshed = execute
  ? await prisma.cmpTicket.findUnique({
      where: { id: CANONICAL_ID },
      select: { id: true, status: true, stage: true, tenantId: true },
    })
  : null;

report.canonical_status_after = refreshed?.status ?? canonical.status;
report.canonical_stage_after = refreshed?.stage ?? canonical.stage;
report.canonical_tenant_id = refreshed?.tenantId ?? canonical.tenantId;
report.copied_summary = report.actions.map((a) => ({
  ticket_id: a.ticket_id,
  merged_section_into_parent: a.merged_section_into_parent,
  closed_superseded: a.closed_superseded,
}));
report.tickets_closed_superseded = report.actions.filter((a) => a.closed_superseded === true).map((a) => a.ticket_id);
report.parent_needs_write = parentNeedsWrite;
report.planned_consolidation_version = nextVersion;
report.note_change_load =
  'After the Core admin operator-queue fix is deployed, /change should list tenantId null tickets and allow ticket-get for this id.';

console.log(JSON.stringify(report, null, 2));
await prisma.$disconnect();

#!/usr/bin/env node
/**
 * Formalize the LuxeMaurice Content Population Sprint (operational programme).
 *
 * What this script does:
 *   1. Promote `cmqa2y2ga0000l704glnfro1f` to the operational sprint programme
 *      parent — preserves its title/description/identity, appends a formal
 *      programme description, and writes `console_json.lux_programme_meta`
 *      describing the workstreams + reality gate. NEVER overwrites the
 *      original `description` or any existing messages.
 *   2. Creates four Phase 4B child request tickets (one per workstream) using
 *      the same shape `lib/cmp/_lib/lux-client-requests.js` uses today,
 *      tenant-locked to `luxe-maurice`, all carrying:
 *        - `console_json.parent_programme_ticket = cmo8mjijk0000jl04l1jz0v6d`
 *          (so they appear in the existing programme related-requests list)
 *        - `console_json.parent_sprint_ticket    = cmqa2y2ga0000l704glnfro1f`
 *          (additional metadata, sprint linkage)
 *   3. Updates the parent `lux_programme_meta.child_request_ids[]` with the
 *      created child ids and appends an `assistant` role message recording
 *      the formalization.
 *
 * What this script DOES NOT touch:
 *   - The master strategic ticket `cmo8mjijk0000jl04l1jz0v6d` (read-only).
 *   - Any non-`luxe-maurice` row.
 *   - The 18 Phase 4C.1 smoke artifacts (queue cleanup is a separate packet).
 *   - Audit history of any kind (messages, attachments, console_json fields).
 *
 * Idempotency:
 *   - Children are detected by title prefix `Content sprint C<n> —` and skipped
 *     if any row with the same `parent_sprint_ticket` and the same `C<n>`
 *     prefix already exists.
 *   - Parent `lux_programme_meta` is rewritten each run; `child_request_ids` is
 *     deduped and re-merged. Description append is gated by a marker
 *     `<!-- lux-content-sprint-formalized:2026-06-11 -->` (added once).
 *
 * Default = DRY-RUN. Pass `--execute` to actually write.
 *
 * Usage:
 *   node scripts/lux-content-sprint-formalize.mjs
 *   node scripts/lux-content-sprint-formalize.mjs --execute
 *   node scripts/lux-content-sprint-formalize.mjs --execute --output=.lux-verify/content-sprint-formalize.json
 *
 * Env: POSTGRES_URL (tenant-scoped writes only).
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LUX_TENANT_ID = 'luxe-maurice';
const MASTER_PROGRAMME_ID = 'cmo8mjijk0000jl04l1jz0v6d';
const SPRINT_PARENT_ID = 'cmqa2y2ga0000l704glnfro1f';
const FORMALIZE_MARKER = '<!-- lux-content-sprint-formalized:2026-06-11 -->';

function argValue(prefix, fallback = '') {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return fallback;
  const i = a.indexOf('=');
  if (i < 0) return fallback;
  return String(a.slice(i + 1)).trim();
}

const EXECUTE = process.argv.includes('--execute');
const OUTPUT = argValue('--output', '');

/** @typedef {{ code: string, title: string, brief: string, description: string, acceptance: string[], owners: string[], dependencies: string[] }} ChildSpec */

/** @type {ChildSpec[]} */
const CHILDREN = [
  {
    code: 'C1',
    title:
      'Content sprint C1 — Homepage property imagery package (hero + lifestyle + arrival + owner experience)',
    brief:
      'Real homepage imagery via the governed media pipeline — hero, lifestyle, arrival, owner experience.',
    description: [
      'Workstream C1 — Homepage property imagery package',
      '',
      'Goal: replace placeholder visual treatment on `https://lux.corpflowai.com/` with real, governed, client-approved imagery that matches the Strategic Vision presentation.',
      '',
      'In scope (real bytes through the Phase 4 governed pipeline — review → link → publish):',
      '- Hero treatment: Mauritius coastline / luxury villa exterior / dusk lighting.',
      '- Strategic Mauritius lifestyle visual (lifestyle / security / connectivity context).',
      '- Private aviation or arrival imagery.',
      '- Marina / business lifestyle / luxury living imagery.',
      '- Owner experience imagery: architect interaction, finish selection, interior design review, remote client participation.',
      '',
      'Out of scope: video on public surfaces; auto-publish; CDN/transforms; any image that is not explicitly approved by Jan.',
      '',
      'Acceptance criteria:',
      '- At least four distinct images uploaded → reviewed → linked → published via existing Lux CMP attachment actions (no auto-publish).',
      '- Visible on `https://lux.corpflowai.com/` against the approved brand tokens (no broken layout, no placeholder gradients in published slots).',
      '- No fake inventory or feed-shaped previews introduced as a side effect.',
      '- Per-image governance audit trail (review status, reviewer, publish timestamp) preserved in `cmp_ticket_attachments` + `console_json.lux_request_meta.attachments[]`.',
    ].join('\n'),
    acceptance: [
      'At least 4 governed published images on the homepage.',
      'Live render on `https://lux.corpflowai.com/` matches the approved brand language.',
      'No fake inventory introduced; published-only on public.',
      'Per-image audit trail intact (review + link + publish events).',
    ],
    owners: ['Jan (content + approval)', 'Operator (governed publish gate)'],
    dependencies: [],
  },
  {
    code: 'C2',
    title:
      'Content sprint C2 — First real private opportunity (Postgres listing + 5 governed gallery images + concierge link)',
    brief:
      'First Postgres `lux_listings` row published end-to-end with ≥5 governed gallery images and concierge property context.',
    description: [
      'Workstream C2 — First real private opportunity',
      '',
      'Goal: ship the first real, client-approved private opportunity on `https://lux.corpflowai.com/properties` and `https://lux.corpflowai.com/property/<slug>`, end-to-end through the existing governed pipeline.',
      '',
      'In scope:',
      '- Create a `lux_listings` row via `/properties/admin` (Postgres-backed) with: title, slug (`lm-…`), region, property type, status, optional price guidance, short teaser, overview, lifestyle context, advisory notes, at-a-glance fields, consultation CTA.',
      '- Upload ≥5 client-approved images via `/change` attachments → review → link → publish (image only, image MIME).',
      '- Hero/card/gallery slot assignment per Lux media governance (no auto-publish; explicit publish per slot).',
      '- Concierge CTA carries `property=<real-slug>` context end-to-end.',
      '',
      'Out of scope: video on public surfaces; IDX/MLS/feed-shaped data; any image not explicitly approved by Jan; pricing claims not approved by Jan.',
      '',
      'Acceptance criteria:',
      '- `/properties` lists the new opportunity (card render with governed card image).',
      '- `/property/<real-slug>` renders the Private Opportunity Memorandum with Overview / Lifestyle / Advisory / At a glance and a published gallery.',
      '- `/concierge` from the property CTA preserves `property=<real-slug>` in the lead.',
      '- All images on the public surface have been through review + link + publish (no draft/preview bytes leak).',
    ].join('\n'),
    acceptance: [
      'Postgres `lux_listings` row created with full editorial fields, `visibility_status=published`.',
      '≥5 governed published gallery images on `/property/<slug>`.',
      'Concierge CTA carries `property=<slug>`; lead captures `property_interest`.',
      'No draft/preview bytes leak on public.',
    ],
    owners: ['Jan (content + approval)', 'Operator (admin create + publish)'],
    dependencies: ['C1 (brand visual alignment)', 'C3 (clean state before public visibility)'],
  },
  {
    code: 'C3',
    title:
      'Content sprint C3 — Demo / preview opportunities hidden from public; only published listings on `/properties` and `/property/<slug>`',
    brief:
      'Hide / unpublish demo opportunities so public surfaces only show real published listings; keep audit history.',
    description: [
      'Workstream C3 — Demo / preview opportunities hidden from public',
      '',
      'Goal: ensure the public LuxeMaurice surfaces never present demo, smoke, or feed-shaped preview opportunities as real inventory. Audit history stays intact (no deletes).',
      '',
      'Today (audit, 2026-06-11): the published catalogue on Postgres is empty (`/properties` `__NEXT_DATA__.listings: []`), but the staged catalogue still resolves five `lm-*` preview slugs through `/property/<slug>`:',
      '  - lm-villa-belombre',
      '  - lm-pent-plateau',
      '  - lm-nc-ridge',
      '  - lm-pipeline-q4',
      '  - lm-phase2d-manual-demo',
      '',
      'In scope:',
      '- Decide per slug: (a) gate behind `?preview=1` operator session only, (b) replace by C2 real opportunity and retire, (c) leave clearly labelled "illustrative" with explicit copy. Default recommendation: gate behind operator session.',
      '- Update sitemap if any `lm-*` preview path remains publicly resolvable.',
      '- Verify `__NEXT_DATA__.listings` on `/properties` stays `[]` until C2 publishes a real listing.',
      '- No code-side change to media governance, publish gates, tenant boundaries, or admin auth.',
      '',
      'Out of scope: deleting any database rows; deleting any attachments; deleting CMP tickets; touching the master programme ticket.',
      '',
      'Acceptance criteria:',
      '- Each of the five preview slugs is either (a) no longer reachable to anonymous users (404 or operator-only `?preview=1`) or (b) replaced by a real published listing under C2 or (c) clearly labelled illustrative.',
      '- Sitemap audited; no stale `lm-*` preview paths advertised publicly without label.',
      '- All audit history preserved (no row deleted).',
    ].join('\n'),
    acceptance: [
      'No demo `lm-*` slug renders publicly as real inventory.',
      'Sitemap reviewed; no stale preview paths advertised.',
      'No rows deleted; audit history preserved.',
    ],
    owners: ['Operator'],
    dependencies: [],
  },
  {
    code: 'C4',
    title:
      'Content sprint C4 — Jan validation E2E (editor login → opportunity create/edit → publish → public render → concierge link)',
    brief:
      'Jan completes a full create/edit/publish loop end-to-end on production and confirms commercial usability.',
    description: [
      'Workstream C4 — Jan validation E2E',
      '',
      'Goal: confirm the LuxeMaurice platform is commercially usable from Jan’s perspective — login, content edit, governed media publish, public render, concierge linkage — on the live production surface.',
      '',
      'In scope:',
      '- Jan signs into `/login?next=/properties/admin` on `https://lux.corpflowai.com/`.',
      '- Jan creates or edits the C2 real opportunity (or a second opportunity if Jan chooses).',
      '- Jan uploads + reviews + links + requests publish of at least one governed image.',
      '- Jan confirms `/property/<slug>` renders correctly with governed imagery and editorial copy.',
      '- Jan confirms `/concierge?intent=property&property=<slug>` carries the context.',
      '- Jan provides written confirmation on the sprint parent ticket: "platform is commercially usable for LuxeMaurice".',
      '',
      'Out of scope: code changes; new feature work; widening admin scope; introducing new env vars.',
      '',
      'Acceptance criteria:',
      '- Jan logs in successfully on production (operator may co-pilot only if required for provisioning).',
      '- Jan completes one end-to-end create → publish loop on a real opportunity.',
      '- Jan reviews live public render.',
      '- Jan posts confirmation message on the sprint parent ticket.',
    ].join('\n'),
    acceptance: [
      'Jan logs into `/properties/admin` on production.',
      'Jan completes one create-to-publish loop on a real opportunity.',
      'Jan signs off commercial usability in writing on the sprint parent ticket.',
    ],
    owners: ['Jan (primary)', 'Operator (provisioning support)'],
    dependencies: ['C2 (real opportunity to validate)', 'C1 + C3 (clean visual + clean public state)'],
  },
];

const PROGRAMME_OBJECTIVE =
  'Populate the live LuxeMaurice platform with real, client-approved content so the site can be used commercially.';

const REALITY_GATE = [
  '`https://lux.corpflowai.com/` shows real approved imagery (no placeholder gradients on published slots).',
  '`https://lux.corpflowai.com/properties` shows at least one real approved private opportunity, OR an intentional premium empty state if Jan has not authorised a listing.',
  '`https://lux.corpflowai.com/property/<real-slug>` shows real content and real governed imagery.',
  '`https://lux.corpflowai.com/concierge` links correctly to opportunity context (`property=<real-slug>`).',
  'No fake inventory appears publicly (no demo `lm-*` slug resolves as real inventory).',
  'Jan AND Anton both verify live and sign off on the sprint parent ticket.',
];

function nowIso() {
  return new Date().toISOString();
}

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

function buildChildConsoleJson(child, ts) {
  return {
    locale: 'en',
    parent_programme_ticket: MASTER_PROGRAMME_ID,
    parent_sprint_ticket: SPRINT_PARENT_ID,
    request_type: 'property_update',
    priority: 'High',
    property_reference: null,
    lux_request_meta: {
      request_type: 'property_update',
      priority: 'High',
      property_reference: null,
      title: child.title,
      description_preview: child.brief,
      created_at: ts,
      attachments: [],
      sprint_code: child.code,
      sprint_owners: child.owners,
      sprint_acceptance: child.acceptance,
      sprint_dependencies: child.dependencies,
    },
    brief: { summary: child.brief },
    messages: [
      {
        ts,
        role: 'assistant',
        content: `Content Population Sprint child request created (${child.code}). Parent sprint: ${SPRINT_PARENT_ID}. Parent programme: ${MASTER_PROGRAMME_ID}.`,
      },
    ],
    client_view: {
      change_type: 'property_update',
      workflow_state: 'awaiting_operator_review',
      workflow_next_action: 'Operator review required',
      progress_message: 'Sprint child request received — awaiting operator review.',
    },
  };
}

function buildParentLuxProgrammeMeta(childIds, ts) {
  return {
    schema_version: 1,
    programme_name: 'LuxeMaurice Content Population Sprint',
    programme_objective: PROGRAMME_OBJECTIVE,
    formalized_at: ts,
    parent_master_ticket: MASTER_PROGRAMME_ID,
    workstreams: CHILDREN.map((c) => ({
      code: c.code,
      title: c.title,
      brief: c.brief,
      owners: c.owners,
      acceptance: c.acceptance,
      dependencies: c.dependencies,
    })),
    reality_gate: REALITY_GATE,
    child_request_ids: childIds.slice(),
  };
}

function describeProgrammeForDescription() {
  const lines = [];
  lines.push(FORMALIZE_MARKER);
  lines.push('');
  lines.push('## LuxeMaurice Content Population Sprint — programme block (formalized 2026-06-11)');
  lines.push('');
  lines.push(`**Objective:** ${PROGRAMME_OBJECTIVE}`);
  lines.push('');
  lines.push(`**Sprint parent ticket:** \`${SPRINT_PARENT_ID}\` (this ticket).`);
  lines.push(`**Master strategic ticket:** \`${MASTER_PROGRAMME_ID}\` (remains open; not touched).`);
  lines.push('');
  lines.push('### Workstreams');
  for (const c of CHILDREN) {
    lines.push(`- **${c.code}** — ${c.title}  `);
    lines.push(`  Owners: ${c.owners.join(' + ')}  `);
    lines.push(`  Acceptance: ${c.acceptance.join(' ')}  `);
    if (c.dependencies.length) lines.push(`  Dependencies: ${c.dependencies.join('; ')}`);
  }
  lines.push('');
  lines.push('### Reality Gate (programme COMPLETE only when all hold)');
  for (const r of REALITY_GATE) lines.push(`- ${r}`);
  return lines.join('\n');
}

async function findExistingChildren(prisma) {
  const rows = await prisma.cmpTicket.findMany({
    where: { tenantId: LUX_TENANT_ID },
    select: { id: true, title: true, consoleJson: true, createdAt: true },
    take: 500,
  });
  const matches = [];
  for (const r of rows) {
    const cj = asObj(r.consoleJson);
    if (String(cj.parent_sprint_ticket || '') !== SPRINT_PARENT_ID) continue;
    const meta = asObj(cj.lux_request_meta);
    const code = String(meta.sprint_code || '').trim().toUpperCase();
    const title = String(r.title || '');
    let inferredCode = code;
    if (!inferredCode) {
      const m = title.match(/Content sprint (C\d+)/i);
      inferredCode = m ? m[1].toUpperCase() : '';
    }
    if (inferredCode) matches.push({ id: r.id, code: inferredCode, title, createdAt: r.createdAt });
  }
  return matches;
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('ERROR: POSTGRES_URL not set.');
    process.exit(2);
  }
  const prisma = new PrismaClient();
  const ts = nowIso();
  const summary = {
    generated_at: ts,
    mode: EXECUTE ? 'execute' : 'dry-run',
    tenant: LUX_TENANT_ID,
    master_programme_ticket: MASTER_PROGRAMME_ID,
    sprint_parent_ticket: SPRINT_PARENT_ID,
    actions: {
      parent_update: null,
      children_created: [],
      children_skipped_existing: [],
    },
    proposal: {
      programme_objective: PROGRAMME_OBJECTIVE,
      reality_gate: REALITY_GATE,
      children: CHILDREN.map((c) => ({
        code: c.code,
        title: c.title,
        brief: c.brief,
        owners: c.owners,
        acceptance: c.acceptance,
        dependencies: c.dependencies,
      })),
    },
  };

  try {
    const parent = await prisma.cmpTicket.findUnique({
      where: { id: SPRINT_PARENT_ID },
      select: {
        id: true,
        tenantId: true,
        title: true,
        description: true,
        consoleJson: true,
        status: true,
        stage: true,
      },
    });
    if (!parent) {
      throw new Error(`Sprint parent ticket ${SPRINT_PARENT_ID} not found.`);
    }
    if (parent.tenantId !== LUX_TENANT_ID) {
      throw new Error(`Sprint parent ${SPRINT_PARENT_ID} tenant=${parent.tenantId} (expected luxe-maurice).`);
    }

    const existingChildren = await findExistingChildren(prisma);
    const existingByCode = new Map(existingChildren.map((c) => [c.code, c]));

    const newChildIds = [];
    for (const child of CHILDREN) {
      const existing = existingByCode.get(child.code);
      if (existing) {
        summary.actions.children_skipped_existing.push({
          code: child.code,
          existing_id: existing.id,
          existing_title: existing.title,
        });
        newChildIds.push(existing.id);
        continue;
      }
      const cj = buildChildConsoleJson(child, ts);
      if (EXECUTE) {
        const row = await prisma.cmpTicket.create({
          data: {
            tenantId: LUX_TENANT_ID,
            title: child.title,
            description: child.description,
            status: 'Open',
            stage: 'Intake',
            locale: 'en',
            consoleJson: cj,
          },
          select: { id: true, createdAt: true },
        });
        summary.actions.children_created.push({
          code: child.code,
          id: row.id,
          title: child.title,
          created_at: row.createdAt.toISOString(),
        });
        newChildIds.push(row.id);
      } else {
        summary.actions.children_created.push({
          code: child.code,
          id: '(dry-run)',
          title: child.title,
          would_create: true,
        });
        newChildIds.push(`(dry-run-${child.code})`);
      }
    }

    const parentCj = asObj(parent.consoleJson);
    const existingMessages = Array.isArray(parentCj.messages) ? parentCj.messages.slice(0) : [];
    const existingChildIds = Array.isArray(parentCj.child_request_ids)
      ? parentCj.child_request_ids.filter((x) => typeof x === 'string')
      : [];
    const mergedChildIds = Array.from(
      new Set(
        [...existingChildIds, ...newChildIds.filter((x) => typeof x === 'string' && !x.startsWith('(dry-run'))],
      ),
    );
    const luxProgrammeMeta = buildParentLuxProgrammeMeta(mergedChildIds, ts);

    const formalizationMessage = {
      ts,
      role: 'assistant',
      content: `LuxeMaurice Content Population Sprint formalized. Workstreams: ${CHILDREN.map((c) => c.code).join(', ')}. Reality Gate: ${REALITY_GATE.length} items. Master programme ticket ${MASTER_PROGRAMME_ID} not modified.`,
    };

    const updatedConsoleJson = {
      ...parentCj,
      lux_programme_meta: luxProgrammeMeta,
      child_request_ids: mergedChildIds,
      messages: [...existingMessages, formalizationMessage].slice(-200),
    };

    const currentDescription = parent.description || '';
    let updatedDescription = currentDescription;
    if (currentDescription.indexOf(FORMALIZE_MARKER) === -1) {
      const block = describeProgrammeForDescription();
      const sep = currentDescription && currentDescription.length > 0 ? '\n\n---\n\n' : '';
      updatedDescription = `${currentDescription}${sep}${block}`;
    }

    const willChangeDescription = updatedDescription !== currentDescription;
    summary.actions.parent_update = {
      ticket_id: SPRINT_PARENT_ID,
      description_changed: willChangeDescription,
      description_added_chars: willChangeDescription ? updatedDescription.length - currentDescription.length : 0,
      lux_programme_meta_workstreams: CHILDREN.length,
      child_request_ids: mergedChildIds,
      message_appended: true,
    };

    if (EXECUTE) {
      await prisma.cmpTicket.update({
        where: { id: SPRINT_PARENT_ID },
        data: {
          description: updatedDescription,
          consoleJson: updatedConsoleJson,
        },
      });
      summary.actions.parent_update.applied_at = nowIso();
    }

    if (OUTPUT) {
      mkdirSync(path.dirname(path.resolve(OUTPUT)), { recursive: true });
      writeFileSync(path.resolve(OUTPUT), JSON.stringify(summary, null, 2), 'utf8');
      console.error(`wrote ${OUTPUT}`);
    }

    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
    process.stdout.write(`\n${EXECUTE ? 'EXECUTED' : 'DRY-RUN'}: pass --execute to actually write.\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('formalize failed:', e?.message || e);
  process.exit(1);
});

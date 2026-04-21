#!/usr/bin/env node
/**
 * Force operator-assisted escalation + governed draft on a ticket (admin emergency tool).
 *
 * Usage:
 *   node scripts/force-operator-assisted-ticket.mjs <ticket_id>
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { buildGovernedOperatorDraft, evaluateOperatorEscalation } from '../lib/cmp/_lib/cmp-operator-escalation.js';

const prisma = new PrismaClient();
const ticketId = process.argv[2] && !String(process.argv[2]).startsWith('-') ? String(process.argv[2]).trim() : '';
if (!ticketId) {
  console.error('Usage: node scripts/force-operator-assisted-ticket.mjs <ticket_id>');
  process.exit(1);
}

const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
if (!row) {
  console.error('Ticket not found:', ticketId);
  process.exit(1);
}

const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
const brief = cj.brief && typeof cj.brief === 'object' ? cj.brief : {};
const msgs = Array.isArray(cj.messages) ? cj.messages : [];
const lastUser = [...msgs].reverse().find((m) => m && typeof m === 'object' && m.role === 'user' && String(m.content || '').trim());
const lastUserTs = lastUser && lastUser.ts ? String(lastUser.ts) : null;
const desc = String(row.description || '');
const descHash = crypto.createHash('sha256').update(desc, 'utf8').digest('hex');
const nowIso = new Date().toISOString();

const assessment = evaluateOperatorEscalation({
  description: desc,
  brief,
  latestUserMessage: lastUser ? String(lastUser.content || '') : '',
  transcriptTail: msgs
    .slice(-8)
    .map((m) => String((m && m.content) || ''))
    .join('\n'),
  nowIso,
  lastUserMsgTs: lastUserTs,
  ticketDescriptionHash: descHash,
});

assessment.operator_assisted = true;
if (!assessment.reasons.includes('forced_operator_assisted')) assessment.reasons.unshift('forced_operator_assisted');

let attachmentCount = 0;
try {
  attachmentCount = await prisma.cmpTicketAttachment.count({ where: { ticketId } });
} catch {
  attachmentCount = 0;
}
const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
const auto = cv.automation && typeof cv.automation === 'object' ? cv.automation : {};
const prom = cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
const exists = {
  attachments: attachmentCount,
  preview_url: auto.client_site_preview_url || auto.preview_url || null,
  pr_url: prom.pr_url || null,
  branch: auto.branch_name || null,
};

const governed = buildGovernedOperatorDraft({
  rawAssistant: 'Operator-assisted ticket: draft generated for review.',
  brief,
  evidence: assessment.operator_escalation,
  exists,
});

const nextCj = {
  ...cj,
  mode: 'operator_assisted',
  operator_escalation_reasons: assessment.reasons,
  operator_escalation: assessment.operator_escalation,
  pending_operator_draft: {
    content: governed,
    ts: nowIso,
    ok: true,
    refinement_source: 'forced',
  },
};

await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: nextCj } });
console.log(
  JSON.stringify(
    {
      ok: true,
      ticket_id: ticketId,
      tenant_id: row.tenantId || null,
      mode: nextCj.mode,
      operator_escalation_reasons: nextCj.operator_escalation_reasons,
      has_pending_operator_draft: Boolean(nextCj.pending_operator_draft && nextCj.pending_operator_draft.content),
    },
    null,
    2,
  ),
);

await prisma.$disconnect();


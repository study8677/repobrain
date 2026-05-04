#!/usr/bin/env node
/**
 * Append Phase 1 production verification block to CMP ticket description (idempotent).
 *
 * Usage:
 *   node scripts/lux-ticket-append-phase1-production-verification.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d --execute
 *
 * Dry-run (prints block only):
 *   node scripts/lux-ticket-append-phase1-production-verification.mjs --ticket=cmo8mjijk0000jl04l1jz0v6d
 *
 * Env: POSTGRES_URL (production DB / same as /change)
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argValue(prefix) {
  const a = process.argv.find((s) => String(s).startsWith(prefix));
  if (!a) return '';
  const i = a.indexOf('=');
  if (i < 0) return '';
  return String(a.slice(i + 1)).trim();
}

const ticketId = argValue('--ticket') || '';
const execute = process.argv.includes('--execute');

const MARKER = '<!-- lux-phase1-production-verified:2026-05-04 -->';

const BLOCK = [
  '',
  '---',
  '',
  MARKER,
  '',
  '## Phase 1 — Production verification (recorded 2026-05-04)',
  '',
  '**Merged to main:** PR #128 — `feat(lux): Phase 1 luxury copy for lux.corpflowai.com` — commit `ad30e6d6`.',
  '',
  '**Live production checks (GET):**',
  '- `https://lux.corpflowai.com/` → **200**',
  '- `https://lux.corpflowai.com/concierge` → **200**',
  '- `https://lux.corpflowai.com/change` → **200** (Change Console reachable; not Vercel 403)',
  '',
  '**Client-visible `/` (rendered):**',
  '- No Preview / Draft / Tenant slug / CorpFlow footer in default view.',
  '- Luxury acquisition copy: off-market, invitation-only, limited clients; CTA **Request Private Access** → `/concierge`.',
  '- Contact placeholders show **By appointment** where email/phone unset.',
  '',
  '**Client-visible `/concierge`:**',
  '- **Private Client Concierge** (replaced AI Concierge Lite); dark + gold presentation; advisor + discretion language.',
  '',
  '**Not in scope for this verification:** Phase 2 IDX / property discovery; CRM; automation. Ticket remains open for programme delivery beyond homepage/concierge presentation.',
  '',
  '**Gate:** Client direction approval requested before Phase 2 (see client note in `docs/LUX/PHASE1_PRODUCTION_VERIFICATION_AND_CLIENT_NOTE.md`).',
  '',
].join('\n');

if (!ticketId) {
  console.error('Usage: node scripts/lux-ticket-append-phase1-production-verification.mjs --ticket=<id> [--execute]');
  process.exit(1);
}

const pg = String(process.env.POSTGRES_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL is required.');
  process.exit(1);
}

async function main() {
  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, description: true, tenantId: true },
  });
  if (!row) {
    console.error('Ticket not found:', ticketId);
    process.exit(1);
  }
  const prev = row.description != null ? String(row.description) : '';
  if (prev.includes(MARKER)) {
    console.log('Already recorded (marker present). No update.');
    process.exit(0);
  }
  const next = `${prev}${BLOCK}`;
  if (!execute) {
    console.log('Dry-run. Append the following to description:\n');
    console.log(BLOCK);
    console.log('\nRe-run with --execute to persist.');
    process.exit(0);
  }
  await prisma.cmpTicket.update({
    where: { id: ticketId },
    data: { description: next },
  });
  console.log('Updated ticket', ticketId, 'description length:', next.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => {});
  });

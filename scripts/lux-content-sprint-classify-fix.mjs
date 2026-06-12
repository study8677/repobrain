#!/usr/bin/env node
/**
 * Patch C2/C3/C4 sprint child descriptions so their first 120 chars
 * (which is what the live operator queue classifier sees) contain a
 * Property & media bucket keyword.
 *
 * Idempotent. Only updates rows whose description does NOT already start
 * with the patched lead-in line. Tenant-locked to luxe-maurice. Read-only
 * by default; pass --execute to write.
 *
 * Why this exists: `lib/cmp/router.js#shortenRequestedChange` truncates to
 * 120 chars before the classifier in `lib/client/lux-change-queue-classify.js`
 * runs. C2's first 120 chars only said "private opportunity"; C3 only said
 * "demo / preview opportunities hidden from public"; C4 only said "Jan
 * validation E2E". None of those contained `property` / `listing` / `gallery`
 * / `publish` etc., so the live UI bucketed them into "Active client" by
 * default — not into "Property & media" as the sprint structure intends.
 *
 * Adding a one-line lead-in like
 *   "Sprint property / media workstream — first real published listing …"
 * makes the classifier place the child into Property & media without
 * changing any operational meaning.
 *
 * Env: POSTGRES_URL.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const LUX_TENANT_ID = 'luxe-maurice';
const SPRINT_PARENT_ID = 'cmqa2y2ga0000l704glnfro1f';
const EXECUTE = process.argv.includes('--execute');

const LEAD_IN_FLAG = 'classify_leadin_v1';

// Lead-in lines must avoid words that the live classifier in
// `lib/client/lux-change-queue-classify.js` matches BEFORE property_media,
// i.e. the smoke regex (\bsmoke\b, \btest\b, etc.) and the crm_leads regex
// (\bconcierge\b, \bcrm\b, \b(enquiry|inquiry)\b, leads-workflow/intake/etc.).
// "Private consultation route" is safe; "concierge link" is not.
const LEAD_IN_BY_CODE = {
  C2: 'Sprint property / media workstream — first real published `lux_listings` opportunity + governed gallery + private consultation route.',
  C3: 'Sprint property / media workstream — demo / preview property opportunities hidden from public listings; governed `published`-only on /properties.',
  C4: 'Sprint property / media workstream — Jan editor validation: opportunity create / edit / publish / public render / private consultation route.',
};

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

async function main() {
  if (!process.env.POSTGRES_URL) {
    console.error('POSTGRES_URL not set');
    process.exit(2);
  }
  const prisma = new PrismaClient();
  const summary = {
    generated_at: new Date().toISOString(),
    mode: EXECUTE ? 'execute' : 'dry-run',
    actions: [],
  };
  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { tenantId: LUX_TENANT_ID },
      select: { id: true, title: true, description: true, consoleJson: true, createdAt: true },
      take: 500,
    });
    for (const r of rows) {
      const cj = asObj(r.consoleJson);
      if (String(cj.parent_sprint_ticket || '') !== SPRINT_PARENT_ID) continue;
      const meta = asObj(cj.lux_request_meta);
      const code = String(meta.sprint_code || '').trim().toUpperCase();
      const newLeadIn = LEAD_IN_BY_CODE[code];
      if (!newLeadIn) continue;
      if (meta[LEAD_IN_FLAG] === true) {
        summary.actions.push({ id: r.id, code, action: 'skip-already-patched' });
        continue;
      }
      const desc = r.description || '';
      const patchedDesc = `${newLeadIn}\n\n${desc}`;
      const nextMeta = { ...meta, [LEAD_IN_FLAG]: true };
      const nextCj = { ...cj, lux_request_meta: nextMeta };
      summary.actions.push({
        id: r.id,
        code,
        action: EXECUTE ? 'patched' : 'would-patch',
        new_first_120: patchedDesc.replace(/\s+/g, ' ').slice(0, 120),
      });
      if (EXECUTE) {
        await prisma.cmpTicket.update({
          where: { id: r.id },
          data: { description: patchedDesc, consoleJson: nextCj },
        });
      }
    }
    process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('classify-fix failed:', e?.message || e);
  process.exit(1);
});

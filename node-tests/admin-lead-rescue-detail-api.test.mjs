import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_PRODUCT,
  defaultAiLeadRescueOperator,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { loadAiLeadRescueDetailData } from '../lib/server/admin-lead-rescue-api.js';

function makeRow(overrides = {}) {
  const now = new Date('2026-06-06T08:00:00.000Z');
  return {
    id: overrides.id || 'lead_abc',
    tenantId: overrides.tenantId ?? 'corpflowai',
    name: overrides.name ?? 'Jane Doe',
    email: overrides.email ?? 'jane@acme.test',
    phone: overrides.phone ?? '+230 0000 0000',
    contact: null,
    message: overrides.message ?? 'Want a faster follow-up.',
    intent: overrides.intent ?? 'Want a faster follow-up.',
    market: null,
    listing: null,
    status: overrides.status ?? 'NEW_INTAKE',
    qualificationJson:
      overrides.qualificationJson === undefined
        ? {
            intake_meta: {
              product: AI_LEAD_RESCUE_PRODUCT,
              business_name: overrides.business_name ?? 'Acme Co',
              region_path: overrides.region_path ?? 'mauritius',
              lead_sources: overrides.lead_sources ?? 'Website + WhatsApp',
            },
            ai_lead_rescue_operator: defaultAiLeadRescueOperator(now.toISOString()),
          }
        : overrides.qualificationJson,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  };
}

describe('admin-lead-rescue-api: loadAiLeadRescueDetailData', () => {
  it('rejects an empty id with a 400 envelope', async () => {
    const fakePrisma = { lead: { findUnique: async () => null } };
    const out = await loadAiLeadRescueDetailData({ id: '', prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'ID_REQUIRED');
    assert.equal(out.http_status, 400);
  });

  it('rejects a non-string id with a 400 envelope', async () => {
    const fakePrisma = { lead: { findUnique: async () => null } };
    const out = await loadAiLeadRescueDetailData({ id: 12345, prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'ID_REQUIRED');
  });

  it('returns 404 when the row does not exist', async () => {
    const fakePrisma = { lead: { findUnique: async () => null } };
    const out = await loadAiLeadRescueDetailData({ id: 'nope', prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_NOT_FOUND');
    assert.equal(out.http_status, 404);
  });

  it('returns 404 when the row exists but is NOT an AI Lead Rescue lead', async () => {
    const fakePrisma = {
      lead: {
        findUnique: async () => makeRow({ qualificationJson: { intake_meta: { product: 'concierge' } } }),
      },
    };
    const out = await loadAiLeadRescueDetailData({ id: 'lead_abc', prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_NOT_FOUND');
  });

  it('returns the full detail envelope on success', async () => {
    const fakePrisma = { lead: { findUnique: async () => makeRow({ id: 'lead_abc' }) } };
    const out = await loadAiLeadRescueDetailData({ id: 'lead_abc', prismaClient: fakePrisma });
    assert.equal(out.ok, true);
    assert.ok(out.lead, 'lead must be present on success');
    assert.equal(out.lead.id, 'lead_abc');
    assert.ok(out.lead.prospect, 'prospect block must be present');
    assert.ok(out.lead.commercial, 'commercial block must be present');
    assert.ok(out.lead.operations, 'operations block must be present');
    assert.ok(out.lead.setup_checklist, 'setup_checklist block must be present');
    assert.equal(Array.isArray(out.lead.setup_checklist.items), true);
  });

  it('returns a stable failure envelope when prisma throws', async () => {
    const fakePrisma = {
      lead: {
        findUnique: async () => {
          throw new Error('connection refused');
        },
      },
    };
    const out = await loadAiLeadRescueDetailData({ id: 'lead_abc', prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_GET_FAILED');
    assert.equal(out.http_status, 500);
    assert.match(out.message, /connection refused/);
  });
});

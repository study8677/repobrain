import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_PRODUCT,
  defaultAiLeadRescueOperator,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import {
  buildAiLeadRescueListPayload,
  loadAiLeadRescueListData,
  normalizeListFilters,
} from '../lib/server/admin-lead-rescue-api.js';

function makeRow(overrides = {}) {
  const now = new Date('2026-06-06T08:00:00.000Z');
  return {
    id: overrides.id || 'lead_1',
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

describe('admin-lead-rescue-api: normalizeListFilters', () => {
  it('returns empty strings for missing fields', () => {
    assert.deepEqual(normalizeListFilters({}), {
      status: '',
      region: '',
      payment_status: '',
      q: '',
    });
  });

  it('trims whitespace', () => {
    assert.deepEqual(
      normalizeListFilters({ status: '  NEW_INTAKE  ', q: '  acme  ' }),
      { status: 'NEW_INTAKE', region: '', payment_status: '', q: 'acme' },
    );
  });

  it('coerces non-string values to empty strings', () => {
    const f = normalizeListFilters({ status: 42, region: null, payment_status: undefined, q: {} });
    assert.equal(f.status, '');
    assert.equal(f.region, '');
    assert.equal(f.payment_status, '');
    assert.equal(f.q, '');
  });
});

describe('admin-lead-rescue-api: buildAiLeadRescueListPayload', () => {
  it('returns ok=true with empty leads for empty rows', () => {
    const out = buildAiLeadRescueListPayload([], {});
    assert.equal(out.ok, true);
    assert.equal(out.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(out.count, 0);
    assert.deepEqual(out.leads, []);
    assert.equal(out.filters.status, '');
  });

  it('filters out leads without intake_meta.product=ai-lead-rescue', () => {
    const rows = [
      makeRow({ id: 'a' }),
      makeRow({
        id: 'b',
        qualificationJson: { intake_meta: { product: 'concierge' } },
      }),
      makeRow({ id: 'c', qualificationJson: null }),
      makeRow({ id: 'd', qualificationJson: { intake_meta: {} } }),
    ];
    const out = buildAiLeadRescueListPayload(rows, {});
    assert.equal(out.count, 1);
    assert.equal(out.leads[0].id, 'a');
  });

  it('applies status filter', () => {
    const rows = [
      makeRow({ id: 'a', status: 'NEW_INTAKE' }),
      makeRow({ id: 'b', status: 'QUALIFYING' }),
    ];
    const out = buildAiLeadRescueListPayload(rows, { status: 'QUALIFYING' });
    assert.equal(out.count, 1);
    assert.equal(out.leads[0].id, 'b');
  });

  it('applies region filter (case-insensitive)', () => {
    const rows = [
      makeRow({ id: 'a', region_path: 'mauritius' }),
      makeRow({ id: 'b', region_path: 'international' }),
    ];
    const out = buildAiLeadRescueListPayload(rows, { region: 'INTERNATIONAL' });
    assert.equal(out.count, 1);
    assert.equal(out.leads[0].id, 'b');
  });

  it('applies q (substring) filter across business / contact / email / phone / sources', () => {
    const rows = [
      makeRow({ id: 'a', business_name: 'DR-AUDIT TEST', email: 'anton+lr-dr-audit@corpflowai.com' }),
      makeRow({ id: 'b', business_name: 'Other Co', email: 'someone@example.com' }),
    ];
    const out = buildAiLeadRescueListPayload(rows, { q: 'dr-audit' });
    assert.equal(out.count, 1);
    assert.equal(out.leads[0].id, 'a');
  });

  it('returns a normalized filters object on success', () => {
    const out = buildAiLeadRescueListPayload([], { status: ' QUALIFYING ', extra: 'ignored' });
    assert.equal(out.filters.status, 'QUALIFYING');
    assert.equal(Object.prototype.hasOwnProperty.call(out.filters, 'extra'), false);
  });

  it('is safe when rows argument is not an array', () => {
    const out = buildAiLeadRescueListPayload(null, {});
    assert.equal(out.ok, true);
    assert.deepEqual(out.leads, []);
  });
});

describe('admin-lead-rescue-api: loadAiLeadRescueListData', () => {
  it('returns ok=true success envelope when prisma resolves', async () => {
    const rows = [makeRow({ id: 'lr_1' })];
    const fakePrisma = {
      lead: { findMany: async () => rows },
    };
    const out = await loadAiLeadRescueListData({ filters: {}, prismaClient: fakePrisma });
    assert.equal(out.ok, true);
    assert.equal(out.leads.length, 1);
    assert.equal(out.leads[0].id, 'lr_1');
  });

  it('returns stable failure envelope when prisma throws', async () => {
    const fakePrisma = {
      lead: {
        findMany: async () => {
          const err = new Error('connection refused');
          throw err;
        },
      },
    };
    const out = await loadAiLeadRescueListData({ filters: {}, prismaClient: fakePrisma });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_LIST_FAILED');
    assert.equal(out.http_status, 500);
    assert.match(out.message, /connection refused/);
  });

  it('returns ok=true with empty leads when no rows match the product', async () => {
    const fakePrisma = {
      lead: {
        findMany: async () => [
          makeRow({ id: 'x', qualificationJson: { intake_meta: { product: 'other' } } }),
        ],
      },
    };
    const out = await loadAiLeadRescueListData({ filters: {}, prismaClient: fakePrisma });
    assert.equal(out.ok, true);
    assert.deepEqual(out.leads, []);
    assert.equal(out.count, 0);
  });

  it('respects filters passed to the loader', async () => {
    const fakePrisma = {
      lead: {
        findMany: async () => [
          makeRow({ id: 'a', status: 'NEW_INTAKE' }),
          makeRow({ id: 'b', status: 'QUALIFYING' }),
        ],
      },
    };
    const out = await loadAiLeadRescueListData({
      filters: { status: 'QUALIFYING' },
      prismaClient: fakePrisma,
    });
    assert.equal(out.ok, true);
    assert.equal(out.count, 1);
    assert.equal(out.leads[0].id, 'b');
  });
});

/**
 * Integration tests for the AI Lead Rescue PATCH path.
 *
 * These tests exercise the full operator-cockpit save flow end-to-end against
 * an in-memory fake Prisma client, then re-read the row via the detail loader
 * to prove the change persisted. The 2026-06-06 P0 follow-up reported by
 * Anton — "status moved to PAID_SETUP, refresh, status is NOT PAID_SETUP and
 * the 13-item checklist does not appear" — is what these tests guard against.
 *
 * The full save flow is intentionally exercised through the same callable a
 * future PATCH handler can use (`applyAiLeadRescuePatch`), so the contract is
 * the same in production and under test.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_PRODUCT,
  AI_LEAD_RESCUE_SETUP_CHECKLIST_V1,
  defaultAiLeadRescueOperator,
  leadRowToAiLeadRescueDetail,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import {
  applyAiLeadRescuePatch,
  loadAiLeadRescueDetailData,
} from '../lib/server/admin-lead-rescue-api.js';

/**
 * Build a fake in-memory Prisma client that supports the two operations we
 * exercise. `findUnique` returns a CLONE so tests cannot accidentally mutate
 * the stored row, and `update` writes a CLONE so the call site cannot reach
 * back into the storage by reference.
 */
function makeFakePrisma(initialRows) {
  const rows = new Map();
  for (const r of initialRows) rows.set(r.id, JSON.parse(JSON.stringify(r)));
  return {
    lead: {
      findUnique: async ({ where, select }) => {
        const row = rows.get(where.id);
        if (!row) return null;
        const cloned = JSON.parse(JSON.stringify(row));
        // honour select-shape — the real Prisma client only returns selected fields,
        // but `applyAiLeadRescuePatch` does not depend on that behaviour so a full
        // clone is safe here.
        if (!select) return cloned;
        const out = {};
        for (const k of Object.keys(select)) {
          if (select[k] === true && k in cloned) out[k] = cloned[k];
        }
        return out;
      },
      update: async ({ where, data }) => {
        const row = rows.get(where.id);
        if (!row) throw new Error(`fake-prisma: row ${where.id} not found for update`);
        const updated = { ...JSON.parse(JSON.stringify(row)), ...JSON.parse(JSON.stringify(data)) };
        updated.updatedAt = new Date();
        rows.set(where.id, updated);
        return JSON.parse(JSON.stringify(updated));
      },
    },
    _rows: rows,
  };
}

function makeAiLeadRescueRow(id, overrides = {}) {
  const submittedAt = new Date('2026-06-06T08:00:00.000Z');
  return {
    id,
    tenantId: 'corpflowai',
    name: 'Audit Test',
    email: 'audit@acme.test',
    phone: '+230 0000 0000',
    contact: null,
    message: 'DR-AUDIT TEST — Lead Rescue 2026-06-06',
    intent: 'DR-AUDIT TEST — Lead Rescue 2026-06-06',
    market: null,
    listing: null,
    status: overrides.status || 'NEW_INTAKE',
    qualificationJson: overrides.qualificationJson || {
      intake_meta: {
        product: AI_LEAD_RESCUE_PRODUCT,
        business_name: 'Acme Co',
        region_path: 'mauritius',
        lead_sources: 'Website + WhatsApp',
        message: 'DR-AUDIT TEST — Lead Rescue 2026-06-06',
      },
      ai_lead_rescue_operator: defaultAiLeadRescueOperator(submittedAt.toISOString()),
    },
    createdAt: submittedAt,
    updatedAt: submittedAt,
  };
}

describe('applyAiLeadRescuePatch — input contract', () => {
  it('rejects a missing body', async () => {
    const out = await applyAiLeadRescuePatch({ body: null });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'BODY_REQUIRED');
    assert.equal(out.http_status, 400);
  });

  it('rejects a missing id', async () => {
    const out = await applyAiLeadRescuePatch({ body: { status: 'PAID_SETUP' } });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'ID_REQUIRED');
  });

  it('rejects a patch with no updates', async () => {
    const out = await applyAiLeadRescuePatch({ body: { id: 'x' } });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'NO_UPDATES');
  });

  it('rejects an invalid status value', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_1', status: 'NOT_A_REAL_STATUS' },
      prismaClient: fake,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'INVALID_STATUS');
  });

  it('rejects when the row exists but is not an AI Lead Rescue lead', async () => {
    const row = makeAiLeadRescueRow('lead_99', {
      qualificationJson: { intake_meta: { product: 'concierge' } },
    });
    const fake = makeFakePrisma([row]);
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_99', status: 'PAID_SETUP' },
      prismaClient: fake,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_NOT_FOUND');
  });
});

describe('applyAiLeadRescuePatch — status persistence (the P0 case)', () => {
  it('moves status to PAID_SETUP and the response shows the canonical 13-item checklist', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_1', status: 'PAID_SETUP' },
      prismaClient: fake,
      actorLabel: 'antonvdb',
      nowIso: '2026-06-06T12:00:00.000Z',
    });
    assert.equal(out.ok, true);
    assert.equal(out.lead.operations.status, 'PAID_SETUP');
    assert.equal(out.lead.setup_checklist_eligible, true);
    assert.equal(out.lead.setup_checklist.items.length, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);
    assert.equal(out.lead.setup_checklist.total_count, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);
    assert.equal(out.lead.setup_checklist.completed_count, 0);
  });

  it('PAID_SETUP persists to the DB row (read-back via detail loader returns PAID_SETUP)', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    await applyAiLeadRescuePatch({
      body: { id: 'lead_1', status: 'PAID_SETUP' },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.operations.status, 'PAID_SETUP');
    assert.equal(reread.lead.setup_checklist_eligible, true);
  });

  it('Next action persists after refresh (status-unchanged save)', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const after = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        next_action: 'DR audit — persistence check after save fix',
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    assert.equal(after.ok, true);
    assert.equal(after.lead.operations.next_action, 'DR audit — persistence check after save fix');

    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.operations.next_action, 'DR audit — persistence check after save fix');
  });

  it('the full save body the FE sends round-trips: status + next_action + payment_status', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    // Exactly the shape the FE's `save()` builds when the user picks PAID_SETUP.
    const feBody = {
      id: 'lead_1',
      status: 'PAID_SETUP',
      next_action: 'DR audit — detail page persistence check',
      owner: 'antonvdb',
      last_contacted: null,
      notes: '',
      setup_price: null,
      monthly_monitoring_price: null,
      currency: null,
      payment_route: null,
      payment_status: 'paid',
      invoice_reference: null,
      payment_notes: null,
    };
    const saved = await applyAiLeadRescuePatch({
      body: feBody,
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.lead.operations.status, 'PAID_SETUP');
    assert.equal(saved.lead.operations.next_action, 'DR audit — detail page persistence check');
    assert.equal(saved.lead.commercial.payment_status, 'paid');

    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.operations.status, 'PAID_SETUP', 'status must survive the round-trip');
    assert.equal(reread.lead.operations.next_action, 'DR audit — detail page persistence check');
    assert.equal(reread.lead.commercial.payment_status, 'paid');
    assert.equal(reread.lead.setup_checklist_eligible, true);
  });
});

describe('applyAiLeadRescuePatch — checklist item persistence', () => {
  it('rejects a checklist patch when status is not yet PAID_SETUP', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        setup_checklist_item: { key: 'intake_reviewed', state: 'done' },
      },
      prismaClient: fake,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'CHECKLIST_NOT_ELIGIBLE');
  });

  it('persists a checklist item once status is PAID_SETUP, and read-back shows it', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1', { status: 'PAID_SETUP' })]);
    const out = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        setup_checklist_item: {
          key: 'intake_reviewed',
          state: 'done',
          note: 'DR audit — checklist persistence check',
        },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    assert.equal(out.ok, true);
    const item = out.lead.setup_checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.ok(item, 'intake_reviewed must appear in the canonical 13-item list');
    assert.equal(item.state, 'done');
    assert.equal(item.note, 'DR audit — checklist persistence check');

    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    const itemAgain = reread.lead.setup_checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(itemAgain.state, 'done', 'checklist state must survive a refresh');
    assert.equal(itemAgain.note, 'DR audit — checklist persistence check');
    assert.equal(reread.lead.setup_checklist.completed_count, 1);
  });

  it('saving operator fields after a checklist save does NOT wipe checklist progress', async () => {
    // This is the pre-fix latent bug: `mergeAiLeadRescueOperatorPatch` used to
    // overwrite `qj.ai_lead_rescue_operator` and silently delete the stored
    // setup_checklist. The test pins the new behaviour: a non-checklist save
    // preserves the existing checklist state.
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1', { status: 'PAID_SETUP' })]);
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        setup_checklist_item: {
          key: 'intake_reviewed',
          state: 'done',
          note: 'Pre-existing progress',
        },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    // Then save an unrelated operator field.
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        next_action: 'Follow up with client',
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.operations.next_action, 'Follow up with client');
    const item = reread.lead.setup_checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(item.state, 'done', 'checklist progress must NOT be wiped by a non-checklist save');
    assert.equal(item.note, 'Pre-existing progress');
    assert.equal(reread.lead.setup_checklist.completed_count, 1);
  });
});

describe('applyAiLeadRescuePatch — DB failure surface', () => {
  it('returns LEAD_RESCUE_PATCH_FAILED when the update throws', async () => {
    const fake = {
      lead: {
        findUnique: async () => makeAiLeadRescueRow('lead_1'),
        update: async () => {
          throw new Error('connection refused');
        },
      },
    };
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_1', status: 'PAID_SETUP' },
      prismaClient: fake,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_PATCH_FAILED');
    assert.equal(out.http_status, 500);
    assert.match(out.message, /connection refused/);
  });
});

describe('leadRowToAiLeadRescueDetail — checklist eligibility derives from row.status', () => {
  it('PAID_SETUP → setup_checklist_eligible = true', () => {
    const row = makeAiLeadRescueRow('lead_1', { status: 'PAID_SETUP' });
    const out = leadRowToAiLeadRescueDetail(row);
    assert.equal(out.setup_checklist_eligible, true);
    assert.equal(out.setup_checklist.items.length, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);
  });

  it('NEW_INTAKE → setup_checklist_eligible = false', () => {
    const row = makeAiLeadRescueRow('lead_1');
    const out = leadRowToAiLeadRescueDetail(row);
    assert.equal(out.setup_checklist_eligible, false);
  });
});

describe('applyAiLeadRescuePatch — activity log persistence', () => {
  it('rejects an activity_append with an unknown channel', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'fax', type: 'outbound_opener' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'INVALID_ACTIVITY_CHANNEL');
    assert.equal(out.http_status, 400);
  });

  it('rejects an activity_append with an unknown type', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'whatsapp', type: 'hammer_time' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'INVALID_ACTIVITY_TYPE');
  });

  it('persists a valid activity_append, server-stamps actor + timestamp, and read-back includes it', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    const out = await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: {
          channel: 'whatsapp',
          type: 'outbound_opener',
          note: 'Sent the warm-network opener.',
          // Client tries to spoof — server must ignore.
          actor_label: 'spoofed@evil.test',
          at: '1990-01-01T00:00:00.000Z',
        },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
      nowIso: '2026-06-08T15:00:00.000Z',
    });
    assert.equal(out.ok, true);
    assert.equal(out.lead.activity.length, 1);
    assert.equal(out.lead.activity[0].channel, 'whatsapp');
    assert.equal(out.lead.activity[0].type, 'outbound_opener');
    assert.equal(out.lead.activity[0].note, 'Sent the warm-network opener.');
    assert.equal(out.lead.activity[0].actor_label, 'antonvdb', 'actor must come from session, not client');
    assert.equal(out.lead.activity[0].at, '2026-06-08T15:00:00.000Z', 'timestamp must be server-stamped');

    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.activity.length, 1);
    assert.equal(reread.lead.activity[0].note, 'Sent the warm-network opener.');
    assert.equal(reread.lead.activity[0].actor_label, 'antonvdb');
  });

  it('an operator-fields save AFTER an activity_append preserves the activity[]', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'whatsapp', type: 'outbound_opener', note: 'opener' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    await applyAiLeadRescuePatch({
      body: { id: 'lead_1', next_action: 'Follow up Friday', owner: 'antonvdb' },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.operations.next_action, 'Follow up Friday');
    assert.equal(reread.lead.activity.length, 1, 'activity[] must survive an unrelated operator save');
    assert.equal(reread.lead.activity[0].note, 'opener');
  });

  it('a checklist save AFTER an activity_append preserves the activity[]', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1', { status: 'PAID_SETUP' })]);
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: {
          channel: 'manual',
          type: 'payment_confirmed_manual',
          note: 'paid via SWIFT',
        },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        setup_checklist_item: { key: 'intake_reviewed', state: 'done' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.activity.length, 1, 'activity[] must survive checklist save');
    assert.equal(reread.lead.activity[0].note, 'paid via SWIFT');
    const item = reread.lead.setup_checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(item.state, 'done');
  });

  it('an activity_append AFTER a checklist save preserves checklist progress', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1', { status: 'PAID_SETUP' })]);
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        setup_checklist_item: { key: 'intake_reviewed', state: 'done', note: 'reviewed' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'whatsapp', type: 'outbound_followup', note: 'followup' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.activity.length, 1);
    const item = reread.lead.setup_checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(item.state, 'done', 'checklist progress must NOT be wiped by an activity append');
    assert.equal(item.note, 'reviewed');
  });

  it('appending two activities accumulates without dropping the first', async () => {
    const fake = makeFakePrisma([makeAiLeadRescueRow('lead_1')]);
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'whatsapp', type: 'outbound_opener', note: 'first' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
      nowIso: '2026-06-08T10:00:00.000Z',
    });
    await applyAiLeadRescuePatch({
      body: {
        id: 'lead_1',
        activity_append: { channel: 'whatsapp', type: 'prospect_replied', note: 'second' },
      },
      prismaClient: fake,
      actorLabel: 'antonvdb',
      nowIso: '2026-06-08T11:00:00.000Z',
    });
    const reread = await loadAiLeadRescueDetailData({ id: 'lead_1', prismaClient: fake });
    assert.equal(reread.ok, true);
    assert.equal(reread.lead.activity.length, 2);
    assert.equal(reread.lead.activity[0].note, 'first');
    assert.equal(reread.lead.activity[1].note, 'second');
  });
});

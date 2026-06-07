import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES,
  AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT,
  AI_LEAD_RESCUE_PRODUCT,
  AI_LEAD_RESCUE_SETUP_CHECKLIST_V1,
  AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION,
  AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES,
  AI_LEAD_RESCUE_STATUSES,
  aiLeadRescueRegionPathLabel,
  buildAiLeadRescueIntakeNotification,
  defaultAiLeadRescueOperator,
  getAiLeadRescueForwardStatuses,
  isAiLeadRescueLead,
  isAiLeadRescueSetupStatus,
  leadRowToAiLeadRescueDetail,
  leadRowToAiLeadRescueListItem,
  mergeAiLeadRescueChecklistItemPatch,
  mergeAiLeadRescueOperatorPatch,
  normalizeAiLeadRescueStatus,
  parseAiLeadRescueSetupChecklist,
  parseIntakeMeta,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

describe('ai-lead-rescue-operator', () => {
  it('normalizes status values', () => {
    assert.equal(normalizeAiLeadRescueStatus('new_intake'), 'NEW_INTAKE');
    assert.equal(normalizeAiLeadRescueStatus('INVALID'), null);
  });

  it('detects product from intake_meta', () => {
    const qj = { intake_meta: { product: AI_LEAD_RESCUE_PRODUCT } };
    assert.equal(isAiLeadRescueLead(qj), true);
    assert.equal(parseIntakeMeta(qj).product, AI_LEAD_RESCUE_PRODUCT);
  });

  it('does not classify other products as AI Lead Rescue (no notification trigger)', () => {
    /* tenant-intake.js emits corpflow.lead_rescue.intake_received only when isAiLeadRescueLead === true */
    assert.equal(isAiLeadRescueLead({ intake_meta: { product: 'concierge' } }), false);
    assert.equal(isAiLeadRescueLead({ intake_meta: {} }), false);
    assert.equal(isAiLeadRescueLead({}), false);
    assert.equal(isAiLeadRescueLead(null), false);
    assert.equal(isAiLeadRescueLead(undefined), false);
  });

  it('merges operator patch and list projection', () => {
    const now = '2026-05-19T12:00:00.000Z';
    const qj = {
      intake_meta: {
        product: AI_LEAD_RESCUE_PRODUCT,
        business_name: 'Acme Co',
        region_path: 'mauritius',
      },
      ai_lead_rescue_operator: defaultAiLeadRescueOperator(now),
    };
    const merged = mergeAiLeadRescueOperatorPatch(
      qj,
      { status: undefined, owner: 'anton', setup_price: 6900, currency: 'MUR' },
      'anton@corpflowai.com',
      now,
    );
    const row = {
      id: 'lead_1',
      tenantId: 'corpflowai',
      name: 'Jane',
      email: 'jane@acme.test',
      phone: '+230123',
      contact: null,
      message: 'Need faster follow-up',
      intent: 'Need faster follow-up',
      status: 'QUALIFYING',
      qualificationJson: merged,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    const item = leadRowToAiLeadRescueListItem(row);
    assert.equal(item.business_name, 'Acme Co');
    assert.equal(item.owner, 'anton');
    assert.equal(item.setup_price, 6900);
    assert.equal(item.currency, 'MUR');
    assert.equal(item.detail_path, '/admin/lead-rescue/lead_1');
  });

  it('uses notification event name corpflow.lead_rescue.intake_received', () => {
    assert.equal(AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT, 'corpflow.lead_rescue.intake_received');
  });

  it('labels region path for operator notification', () => {
    assert.equal(aiLeadRescueRegionPathLabel('mauritius'), 'Mauritius');
    assert.equal(aiLeadRescueRegionPathLabel('international'), 'International');
    assert.equal(aiLeadRescueRegionPathLabel(''), 'Not selected');
    assert.equal(aiLeadRescueRegionPathLabel('not_selected'), 'Not selected');
  });

  it('builds operator notification payload with required fields and formatted text', () => {
    const submittedAt = '2026-05-20T08:00:00.000Z';
    const out = buildAiLeadRescueIntakeNotification({
      leadId: 'lead_42',
      tenantId: 'corpflowai',
      submittedAt,
      prospect: {
        business_name: 'Acme Mauritius',
        contact_name: 'Jane Doe',
        email: 'jane@acme.test',
        phone: '+230 555 1234',
        region_path: 'mauritius',
        lead_sources: 'Website, WhatsApp',
        preferred_payment_path: 'SMB Mauritius / local invoice / MUR pricing',
        source_host: 'corpflowai.com',
      },
      publicBaseUrl: 'https://corpflowai.com',
    });

    assert.equal(out.product, AI_LEAD_RESCUE_PRODUCT);
    assert.equal(out.lead_id, 'lead_42');
    assert.equal(out.tenant_id, 'corpflowai');
    assert.equal(out.submitted_at, submittedAt);
    assert.equal(out.admin_detail_path, '/admin/lead-rescue/lead_42');
    assert.equal(out.admin_detail_url, 'https://corpflowai.com/admin/lead-rescue/lead_42');
    assert.equal(out.next_action, 'Review and reply within 2 business hours.');
    assert.equal(out.prospect.region_label, 'Mauritius');

    const text = out.notification_text;
    assert.match(text, /^New AI Lead Rescue intake$/m);
    assert.match(text, /Business: Acme Mauritius/);
    assert.match(text, /Contact: Jane Doe/);
    assert.match(text, /Email: jane@acme\.test/);
    assert.match(text, /Phone \/ WhatsApp: \+230 555 1234/);
    assert.match(text, /Region: Mauritius/);
    assert.match(text, /Lead sources: Website, WhatsApp/);
    assert.match(text, /Preferred payment path: SMB Mauritius/);
    assert.match(text, new RegExp(`Submitted at: ${submittedAt.replace(/[.+]/g, '\\$&')}`));
    assert.match(text, /Admin detail link: https:\/\/corpflowai\.com\/admin\/lead-rescue\/lead_42/);
    assert.match(text, /Next action: Review and reply within 2 business hours\./);
  });

  it('isAiLeadRescueSetupStatus matches the 5 eligible statuses only', () => {
    assert.deepEqual([...AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES], [
      'PAID_SETUP',
      'SETUP_IN_PROGRESS',
      'LIVE_PILOT',
      'MONITORING_OFFERED',
      'MONTHLY_ACTIVE',
    ]);
    for (const s of AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES) {
      assert.equal(isAiLeadRescueSetupStatus(s), true, `${s} should be eligible`);
    }
    for (const s of ['NEW_INTAKE', 'QUALIFYING', 'DEMO_OFFERED', 'DEMO_BOOKED', 'QUOTE_SENT', 'PAYMENT_PENDING', 'LOST', 'PAUSED']) {
      assert.equal(isAiLeadRescueSetupStatus(s), false, `${s} should NOT be eligible`);
    }
    assert.equal(isAiLeadRescueSetupStatus(''), false);
    assert.equal(isAiLeadRescueSetupStatus(null), false);
  });

  it('parseAiLeadRescueSetupChecklist returns v1 items with default pending state', () => {
    const out = parseAiLeadRescueSetupChecklist({ ai_lead_rescue_operator: {} });
    assert.equal(out.version, AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION);
    assert.equal(out.total_count, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);
    assert.equal(out.completed_count, 0);
    assert.equal(out.all_done, false);
    for (const item of out.items) {
      assert.equal(item.state, 'pending');
      assert.equal(item.completed_at, null);
      assert.equal(item.note, null);
      assert.ok(item.label, 'item label must be present');
    }
    assert.deepEqual(
      out.items.map((i) => i.key),
      AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.map((i) => i.key),
    );
  });

  it('v1 setup checklist matches the canonical 13-item Cursor requirement in order', () => {
    /* Source of truth: original Cursor requirement for Requirement 3 — 13 items, in order. */
    assert.deepEqual(
      AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.map((i) => i.label),
      [
        'Intake reviewed',
        'Payment / invoice confirmed',
        'Lead source selected',
        'Google Sheet created',
        'Telegram destination confirmed',
        'Test lead submitted',
        'Alert received',
        'Lead appears in sheet',
        'Follow-up status board created',
        'Daily summary configured',
        'Client hand-over message sent',
        '7-day monitoring started',
        'Monthly monitoring offered',
      ],
    );
    assert.equal(AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length, 13);
    const keys = AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.map((i) => i.key);
    assert.equal(new Set(keys).size, keys.length, 'checklist keys must be unique');
  });

  it('mergeAiLeadRescueChecklistItemPatch sets completed_at on done and clears on pending', () => {
    const now1 = '2026-05-20T08:00:00.000Z';
    const now2 = '2026-05-20T09:00:00.000Z';
    const qj0 = { intake_meta: { product: AI_LEAD_RESCUE_PRODUCT }, ai_lead_rescue_operator: defaultAiLeadRescueOperator(now1) };

    const r1 = mergeAiLeadRescueChecklistItemPatch(
      qj0,
      { key: 'intake_reviewed', state: 'done', note: 'Reviewed and verified business + region' },
      'anton@corpflowai.com',
      now1,
    );
    assert.equal(r1.ok, true);
    const parsed1 = parseAiLeadRescueSetupChecklist(r1.qj);
    const row1 = parsed1.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(row1.state, 'done');
    assert.equal(row1.completed_at, now1);
    assert.equal(row1.note, 'Reviewed and verified business + region');
    assert.equal(row1.actor_label, 'anton@corpflowai.com');
    assert.equal(parsed1.completed_count, 1);

    /* Other items remain pending. */
    for (const it of parsed1.items) {
      if (it.key !== 'intake_reviewed') assert.equal(it.state, 'pending');
    }

    const r2 = mergeAiLeadRescueChecklistItemPatch(
      r1.qj,
      { key: 'intake_reviewed', state: 'in_progress' },
      'anton@corpflowai.com',
      now2,
    );
    assert.equal(r2.ok, true);
    const row2 = parseAiLeadRescueSetupChecklist(r2.qj).items.find((i) => i.key === 'intake_reviewed');
    assert.equal(row2.state, 'in_progress');
    assert.equal(row2.completed_at, null, 'completed_at cleared when state regresses');
    assert.equal(row2.note, 'Reviewed and verified business + region', 'note preserved when patch omits note');
  });

  it('mergeAiLeadRescueChecklistItemPatch rejects unknown key and unknown state', () => {
    const qj0 = { intake_meta: { product: AI_LEAD_RESCUE_PRODUCT } };
    assert.deepEqual(
      mergeAiLeadRescueChecklistItemPatch(qj0, { key: 'not-a-real-key', state: 'done' }, 'op', '2026-05-20T08:00:00.000Z'),
      { ok: false, error: 'INVALID_CHECKLIST_KEY' },
    );
    assert.deepEqual(
      mergeAiLeadRescueChecklistItemPatch(qj0, { key: 'intake_reviewed', state: 'wat' }, 'op', '2026-05-20T08:00:00.000Z'),
      { ok: false, error: 'INVALID_CHECKLIST_STATE' },
    );
  });

  it('checklist item states cover pending/in_progress/done/skipped', () => {
    assert.deepEqual([...AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES], [
      'pending',
      'in_progress',
      'done',
      'skipped',
    ]);
  });

  it('leadRowToAiLeadRescueDetail flags setup_checklist_eligible from status', () => {
    const now = '2026-05-20T08:00:00.000Z';
    const baseRow = {
      id: 'lead_x',
      tenantId: 'corpflowai',
      name: 'Jane',
      email: 'jane@acme.test',
      phone: '',
      contact: null,
      message: '',
      intent: '',
      qualificationJson: { intake_meta: { product: AI_LEAD_RESCUE_PRODUCT } },
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    const eligible = leadRowToAiLeadRescueDetail({ ...baseRow, status: 'PAID_SETUP' });
    assert.equal(eligible.setup_checklist_eligible, true);
    assert.equal(eligible.setup_checklist.total_count, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);

    const notYet = leadRowToAiLeadRescueDetail({ ...baseRow, status: 'QUALIFYING' });
    assert.equal(notYet.setup_checklist_eligible, false);
    /* Checklist still parsed (UI just hides until eligible), so operators can pre-check progress in tests. */
    assert.equal(notYet.setup_checklist.total_count, AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.length);
  });

  it('falls back to relative admin path and "not provided" when fields missing', () => {
    const out = buildAiLeadRescueIntakeNotification({
      leadId: 'lead_99',
      tenantId: null,
      submittedAt: new Date('2026-05-20T08:00:00.000Z'),
      prospect: {
        email: 'only@example.test',
      },
    });
    assert.equal(out.admin_detail_url, '/admin/lead-rescue/lead_99');
    assert.match(out.notification_text, /Business: \(not provided\)/);
    assert.match(out.notification_text, /Contact: \(not provided\)/);
    assert.match(out.notification_text, /Phone \/ WhatsApp: \(not provided\)/);
    assert.match(out.notification_text, /Preferred payment path: \(not selected\)/);
    assert.match(out.notification_text, /Region: Not selected/);
  });
});

describe('getAiLeadRescueForwardStatuses — forward-only dropdown filter (PR #326)', () => {
  it('returns the current status plus every later status in canonical order', () => {
    const fromPaidSetup = getAiLeadRescueForwardStatuses('PAID_SETUP');
    const idx = AI_LEAD_RESCUE_STATUSES.indexOf('PAID_SETUP');
    assert.deepEqual(fromPaidSetup, AI_LEAD_RESCUE_STATUSES.slice(idx));
    assert.equal(fromPaidSetup[0], 'PAID_SETUP', 'current status must remain selectable');
    assert.ok(
      !fromPaidSetup.includes('NEW_INTAKE'),
      'earlier statuses must NOT be selectable from PAID_SETUP',
    );
    assert.ok(
      !fromPaidSetup.includes('QUALIFYING'),
      'earlier statuses must NOT be selectable from PAID_SETUP',
    );
    assert.ok(
      fromPaidSetup.includes('PAUSED'),
      'tail statuses (LOST/PAUSED) remain reachable',
    );
  });

  it('returns the full canonical list for the first status (NEW_INTAKE)', () => {
    const fromNew = getAiLeadRescueForwardStatuses('NEW_INTAKE');
    assert.equal(fromNew.length, AI_LEAD_RESCUE_STATUSES.length);
    assert.deepEqual([...fromNew], [...AI_LEAD_RESCUE_STATUSES]);
  });

  it('returns only the last status when currentStatus is the final entry (PAUSED)', () => {
    const fromPaused = getAiLeadRescueForwardStatuses('PAUSED');
    assert.deepEqual(fromPaused, ['PAUSED']);
  });

  it('returns [LOST, PAUSED] from LOST (canonical-order tail)', () => {
    const fromLost = getAiLeadRescueForwardStatuses('LOST');
    assert.deepEqual(fromLost, ['LOST', 'PAUSED']);
  });

  it('normalizes input case / whitespace before slicing (operator-safe)', () => {
    const fromLowercase = getAiLeadRescueForwardStatuses('paid_setup');
    const idx = AI_LEAD_RESCUE_STATUSES.indexOf('PAID_SETUP');
    assert.deepEqual(fromLowercase, AI_LEAD_RESCUE_STATUSES.slice(idx));
  });

  it('falls back to the full list for null / unknown / empty input (defensive)', () => {
    assert.deepEqual(getAiLeadRescueForwardStatuses(null), [...AI_LEAD_RESCUE_STATUSES]);
    assert.deepEqual(getAiLeadRescueForwardStatuses(undefined), [...AI_LEAD_RESCUE_STATUSES]);
    assert.deepEqual(getAiLeadRescueForwardStatuses(''), [...AI_LEAD_RESCUE_STATUSES]);
    assert.deepEqual(
      getAiLeadRescueForwardStatuses('NOT_A_REAL_STATUS'),
      [...AI_LEAD_RESCUE_STATUSES],
      'unknown input must never lock the dropdown empty',
    );
  });

  it('returned slice never mutates the canonical array', () => {
    const before = [...AI_LEAD_RESCUE_STATUSES];
    const slice = getAiLeadRescueForwardStatuses('PAID_SETUP');
    slice.length = 0;
    assert.deepEqual([...AI_LEAD_RESCUE_STATUSES], before, 'mutating the returned slice must not affect the source');
  });
});

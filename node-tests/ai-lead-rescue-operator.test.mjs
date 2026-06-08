import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AI_LEAD_RESCUE_ACTIVITY_CHANNELS,
  AI_LEAD_RESCUE_ACTIVITY_MAX_ENTRIES,
  AI_LEAD_RESCUE_ACTIVITY_TYPES,
  AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES,
  AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT,
  AI_LEAD_RESCUE_PRODUCT,
  AI_LEAD_RESCUE_SETUP_CHECKLIST_V1,
  AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION,
  AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES,
  AI_LEAD_RESCUE_STATUSES,
  aiLeadRescueActivityChannelLabel,
  aiLeadRescueActivityTypeLabel,
  aiLeadRescueRegionPathLabel,
  appendAiLeadRescueActivity,
  buildAiLeadRescueIntakeNotification,
  defaultAiLeadRescueOperator,
  getAiLeadRescueForwardStatuses,
  isAiLeadRescueLead,
  isAiLeadRescueSetupStatus,
  leadRowToAiLeadRescueDetail,
  leadRowToAiLeadRescueListItem,
  mergeAiLeadRescueChecklistItemPatch,
  mergeAiLeadRescueOperatorPatch,
  normalizeAiLeadRescueActivityChannel,
  normalizeAiLeadRescueActivityType,
  normalizeAiLeadRescueStatus,
  parseAiLeadRescueActivity,
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

describe('ai-lead-rescue-operator activity log', () => {
  const baseQj = (now = '2026-06-08T08:00:00.000Z') => ({
    intake_meta: { product: AI_LEAD_RESCUE_PRODUCT },
    ai_lead_rescue_operator: defaultAiLeadRescueOperator(now),
  });

  it('exposes a stable v1 channel set and type set', () => {
    assert.deepEqual([...AI_LEAD_RESCUE_ACTIVITY_CHANNELS], [
      'whatsapp',
      'linkedin',
      'email',
      'call',
      'manual',
      'internal',
    ]);
    assert.deepEqual([...AI_LEAD_RESCUE_ACTIVITY_TYPES], [
      'outbound_opener',
      'outbound_followup',
      'prospect_replied',
      'call_booked',
      'intake_reviewed',
      'manual_pro_forma_sent',
      'payment_confirmed_manual',
      'delivery_handoff',
      'bad_fit',
      'follow_up_scheduled',
      'note',
    ]);
  });

  it('normalises and labels channels/types case-insensitively', () => {
    assert.equal(normalizeAiLeadRescueActivityChannel('WhatsApp'), 'whatsapp');
    assert.equal(normalizeAiLeadRescueActivityChannel('Call'), 'call');
    assert.equal(normalizeAiLeadRescueActivityChannel('FAX'), null);
    assert.equal(normalizeAiLeadRescueActivityType('outbound-opener'), 'outbound_opener');
    assert.equal(normalizeAiLeadRescueActivityType('Bad Fit'), 'bad_fit');
    assert.equal(normalizeAiLeadRescueActivityType('hammer-time'), null);
    assert.equal(aiLeadRescueActivityChannelLabel('whatsapp'), 'WhatsApp');
    assert.equal(aiLeadRescueActivityTypeLabel('outbound_opener'), 'Outbound opener sent');
  });

  it('appendAiLeadRescueActivity stamps server time + actor and ignores client-supplied at/actor_label', () => {
    const now = '2026-06-08T09:00:00.000Z';
    const r = appendAiLeadRescueActivity(
      baseQj(),
      {
        channel: 'whatsapp',
        type: 'outbound_opener',
        note: 'Sent the warm-network opener.',
        next_action: 'Follow up Friday if no reply',
        next_action_date: '2026-06-12T09:00:00Z',
        // These two fields are ignored — server stamps both.
        at: '1990-01-01T00:00:00Z',
        actor_label: 'fake@spoofed.test',
      },
      'anton@corpflowai.com',
      now,
    );
    assert.equal(r.ok, true);
    const list = parseAiLeadRescueActivity(r.qj);
    assert.equal(list.length, 1);
    const e = list[0];
    assert.equal(e.at, now, 'timestamp must be server-stamped');
    assert.equal(e.actor_label, 'anton@corpflowai.com', 'actor must come from session, not client');
    assert.equal(e.channel, 'whatsapp');
    assert.equal(e.channel_label, 'WhatsApp');
    assert.equal(e.type, 'outbound_opener');
    assert.equal(e.type_label, 'Outbound opener sent');
    assert.equal(e.note, 'Sent the warm-network opener.');
    assert.equal(e.next_action, 'Follow up Friday if no reply');
    assert.equal(e.next_action_date, '2026-06-12T09:00:00.000Z');
    assert.equal(e.status_after, null);
  });

  it('rejects unknown channel and unknown type', () => {
    const now = '2026-06-08T09:00:00.000Z';
    assert.deepEqual(
      appendAiLeadRescueActivity(baseQj(), { channel: 'fax', type: 'outbound_opener' }, 'op', now),
      { ok: false, error: 'INVALID_ACTIVITY_CHANNEL' },
    );
    assert.deepEqual(
      appendAiLeadRescueActivity(baseQj(), { channel: 'whatsapp', type: 'hammer_time' }, 'op', now),
      { ok: false, error: 'INVALID_ACTIVITY_TYPE' },
    );
  });

  it('treats empty/whitespace note + next_action as null and ignores invalid next_action_date', () => {
    const now = '2026-06-08T10:00:00.000Z';
    const r = appendAiLeadRescueActivity(
      baseQj(),
      {
        channel: 'email',
        type: 'note',
        note: '   ',
        next_action: '',
        next_action_date: 'not-a-date',
      },
      'op',
      now,
    );
    assert.equal(r.ok, true);
    const e = parseAiLeadRescueActivity(r.qj)[0];
    assert.equal(e.note, null);
    assert.equal(e.next_action, null);
    assert.equal(e.next_action_date, null);
  });

  it('truncates long note + next_action to documented limits', () => {
    const now = '2026-06-08T10:00:00.000Z';
    const longNote = 'x'.repeat(5000);
    const longNext = 'y'.repeat(800);
    const r = appendAiLeadRescueActivity(
      baseQj(),
      { channel: 'internal', type: 'note', note: longNote, next_action: longNext },
      'op',
      now,
    );
    assert.equal(r.ok, true);
    const e = parseAiLeadRescueActivity(r.qj)[0];
    assert.equal(e.note.length, 4000);
    assert.equal(e.next_action.length, 500);
  });

  it('only accepts status_after values from the canonical AI_LEAD_RESCUE_STATUSES list', () => {
    const now = '2026-06-08T11:00:00.000Z';
    const ok = appendAiLeadRescueActivity(
      baseQj(),
      { channel: 'manual', type: 'payment_confirmed_manual', status_after: 'paid_setup' },
      'op',
      now,
    );
    assert.equal(ok.ok, true);
    assert.equal(parseAiLeadRescueActivity(ok.qj)[0].status_after, 'PAID_SETUP');

    const bad = appendAiLeadRescueActivity(
      baseQj(),
      { channel: 'manual', type: 'payment_confirmed_manual', status_after: 'BOGUS' },
      'op',
      now,
    );
    assert.equal(bad.ok, true);
    assert.equal(parseAiLeadRescueActivity(bad.qj)[0].status_after, null);
  });

  it('caps activity at AI_LEAD_RESCUE_ACTIVITY_MAX_ENTRIES (oldest dropped first)', () => {
    let qj = baseQj('2026-06-08T08:00:00.000Z');
    const overflow = AI_LEAD_RESCUE_ACTIVITY_MAX_ENTRIES + 5;
    for (let i = 0; i < overflow; i += 1) {
      const iso = new Date(`2026-06-08T08:00:${String(i % 60).padStart(2, '0')}.000Z`).toISOString();
      const r = appendAiLeadRescueActivity(
        qj,
        { channel: 'internal', type: 'note', note: `entry ${i}` },
        'op',
        iso,
      );
      assert.equal(r.ok, true);
      qj = r.qj;
    }
    const list = parseAiLeadRescueActivity(qj);
    assert.equal(list.length, AI_LEAD_RESCUE_ACTIVITY_MAX_ENTRIES);
    assert.equal(list[0].note, `entry ${overflow - AI_LEAD_RESCUE_ACTIVITY_MAX_ENTRIES}`);
    assert.equal(list[list.length - 1].note, `entry ${overflow - 1}`);
  });

  it('parseAiLeadRescueActivity drops invalid persisted entries silently', () => {
    const qj = {
      ai_lead_rescue_operator: {
        activity: [
          { at: '2026-06-08T08:00:00.000Z', channel: 'whatsapp', type: 'outbound_opener', note: 'good' },
          null,
          { at: '', channel: 'whatsapp', type: 'outbound_opener' },
          { at: '2026-06-08T08:00:00.000Z', channel: 'fax', type: 'outbound_opener' },
          { at: '2026-06-08T08:00:00.000Z', channel: 'email', type: 'hammer' },
          'not-an-object',
        ],
      },
    };
    const list = parseAiLeadRescueActivity(qj);
    assert.equal(list.length, 1);
    assert.equal(list[0].note, 'good');
  });

  it('detail projection exposes activity[] alongside operations and setup_checklist', () => {
    const now = '2026-06-08T12:00:00.000Z';
    let qj = baseQj(now);
    qj = appendAiLeadRescueActivity(
      qj,
      { channel: 'whatsapp', type: 'outbound_opener', note: 'opener' },
      'anton',
      now,
    ).qj;

    const row = {
      id: 'lead_42',
      tenantId: 'corpflowai',
      name: 'Jane',
      email: 'jane@acme.test',
      phone: '',
      contact: null,
      message: '',
      intent: '',
      status: 'QUALIFYING',
      qualificationJson: qj,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    };
    const detail = leadRowToAiLeadRescueDetail(row);
    assert.equal(Array.isArray(detail.activity), true);
    assert.equal(detail.activity.length, 1);
    assert.equal(detail.activity[0].channel, 'whatsapp');
    assert.equal(detail.activity[0].actor_label, 'anton');
  });

  it('REGRESSION: mergeAiLeadRescueOperatorPatch preserves persisted setup_checklist AND activity', () => {
    const now1 = '2026-06-08T12:00:00.000Z';
    const now2 = '2026-06-08T12:30:00.000Z';

    let qj = baseQj(now1);
    qj = mergeAiLeadRescueChecklistItemPatch(
      qj,
      { key: 'intake_reviewed', state: 'done', note: 'verified' },
      'anton',
      now1,
    ).qj;
    qj = appendAiLeadRescueActivity(
      qj,
      { channel: 'whatsapp', type: 'outbound_opener', note: 'opener' },
      'anton',
      now1,
    ).qj;

    // Run an unrelated operator save (no activity, no checklist) — historically this
    // dropped sibling jsonb keys. Now both must survive.
    const merged = mergeAiLeadRescueOperatorPatch(
      qj,
      { owner: 'anton', next_action: 'follow up' },
      'anton',
      now2,
    );

    const checklist = parseAiLeadRescueSetupChecklist(merged);
    const reviewed = checklist.items.find((i) => i.key === 'intake_reviewed');
    assert.equal(reviewed.state, 'done', 'setup_checklist must survive operator merge');
    assert.equal(reviewed.note, 'verified');

    const activity = parseAiLeadRescueActivity(merged);
    assert.equal(activity.length, 1, 'activity[] must survive operator merge');
    assert.equal(activity[0].note, 'opener');
  });

  it('checklist merge preserves activity[]', () => {
    const now = '2026-06-08T13:00:00.000Z';
    let qj = baseQj(now);
    qj = appendAiLeadRescueActivity(
      qj,
      { channel: 'manual', type: 'payment_confirmed_manual', note: 'paid via SWIFT' },
      'anton',
      now,
    ).qj;

    const merged = mergeAiLeadRescueChecklistItemPatch(
      qj,
      { key: 'intake_reviewed', state: 'done' },
      'anton',
      now,
    );
    assert.equal(merged.ok, true);
    const activity = parseAiLeadRescueActivity(merged.qj);
    assert.equal(activity.length, 1);
    assert.equal(activity[0].note, 'paid via SWIFT');
  });

  it('activity append preserves existing operator fields', () => {
    const now = '2026-06-08T14:00:00.000Z';
    let qj = baseQj(now);
    qj = mergeAiLeadRescueOperatorPatch(
      qj,
      { owner: 'anton', next_action: 'send opener', setup_price: 6900, currency: 'MUR' },
      'anton',
      now,
    );

    const r = appendAiLeadRescueActivity(
      qj,
      { channel: 'whatsapp', type: 'outbound_opener', note: 'opener sent' },
      'anton',
      now,
    );
    assert.equal(r.ok, true);

    const detail = leadRowToAiLeadRescueDetail({
      id: 'lead_99',
      tenantId: 'corpflowai',
      name: 'X',
      email: '',
      phone: '',
      contact: null,
      message: '',
      intent: '',
      status: 'QUALIFYING',
      qualificationJson: r.qj,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    });
    assert.equal(detail.operations.owner, 'anton', 'owner must survive activity append');
    assert.equal(detail.operations.next_action, 'send opener');
    assert.equal(detail.commercial.setup_price, 6900);
    assert.equal(detail.commercial.currency, 'MUR');
    assert.equal(detail.activity.length, 1);
  });
});

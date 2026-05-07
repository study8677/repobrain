import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LUX_LEAD_CRM_STAGES,
  luxLeadCrmStageLabel,
  mergeLuxOperatorWorkflowPatch,
  normalizeLuxLeadCrmStage,
  parseLuxOperatorWorkflow,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

test('normalizeLuxLeadCrmStage accepts aliases', () => {
  assert.equal(normalizeLuxLeadCrmStage('Follow-up'), 'follow_up');
  assert.equal(normalizeLuxLeadCrmStage('Viewing Requested'), 'viewing_requested');
  assert.equal(normalizeLuxLeadCrmStage('NEW'), 'new');
});

test('parseLuxOperatorWorkflow defaults', () => {
  const o = parseLuxOperatorWorkflow({});
  assert.equal(o.stage, 'new');
  assert.equal(o.internal_notes.length, 0);
  assert.equal(o.follow_up_status, null);
});

test('mergeLuxOperatorWorkflowPatch appends note and moves stage', () => {
  const t0 = '2026-05-07T12:00:00.000Z';
  const qj = mergeLuxOperatorWorkflowPatch(
    {},
    { stage: 'qualified', note: 'Called — interested in viewing.' },
    t0,
  );
  const o = parseLuxOperatorWorkflow(qj);
  assert.equal(o.stage, 'qualified');
  assert.equal(o.internal_notes.length, 1);
  assert.equal(o.internal_notes[0].text, 'Called — interested in viewing.');
});

test('LUX_LEAD_CRM_STAGES has six stages', () => {
  assert.equal(LUX_LEAD_CRM_STAGES.length, 6);
  assert.equal(luxLeadCrmStageLabel('lost'), 'Lost');
});

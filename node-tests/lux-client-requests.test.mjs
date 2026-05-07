import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  LUX_PARENT_PROGRAMME_TICKET_ID,
  buildLuxClientRequestConsoleJson,
  normalizeLuxRequestPriority,
  normalizeLuxRequestType,
  safeLuxRelatedRequestShape,
  validateLuxClientRequestBody,
} from '../lib/cmp/_lib/lux-client-requests.js';

test('normalizeLuxRequestType allowlists', () => {
  assert.equal(normalizeLuxRequestType('Website refinement'), 'website_refinement');
  assert.equal(normalizeLuxRequestType('crm_workflow'), 'crm_workflow');
  assert.equal(normalizeLuxRequestType(''), null);
});

test('normalizeLuxRequestPriority defaults to Normal', () => {
  assert.equal(normalizeLuxRequestPriority(''), 'Normal');
  assert.equal(normalizeLuxRequestPriority('low'), 'Low');
  assert.equal(normalizeLuxRequestPriority('HIGH'), 'High');
});

test('validateLuxClientRequestBody requires fields and trims', () => {
  assert.equal(validateLuxClientRequestBody({}).ok, false);
  assert.equal(
    validateLuxClientRequestBody({ request_type: 'website_refinement', title: 'x', description: 'y', priority: 'Normal' }).ok,
    true,
  );
  const ok = validateLuxClientRequestBody({
    request_type: 'website_refinement',
    title: '  Hello  ',
    description: '  Desc  ',
    priority: 'Normal',
    property_reference: '  lm-nc-ridge  ',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.value.title, 'Hello');
  assert.equal(ok.value.description, 'Desc');
  assert.equal(ok.value.property_reference, 'lm-nc-ridge');
});

test('buildLuxClientRequestConsoleJson sets awaiting_operator_review and parent linkage', () => {
  const cj = buildLuxClientRequestConsoleJson({
    request_type: 'website_refinement',
    priority: 'Normal',
    property_reference: null,
    nowIso: '2026-05-07T00:00:00.000Z',
    title: 't',
    description: 'd',
  });
  assert.equal(cj.parent_programme_ticket, LUX_PARENT_PROGRAMME_TICKET_ID);
  assert.equal(cj.client_view.workflow_state, 'awaiting_operator_review');
});

test('safeLuxRelatedRequestShape is minimal and safe', () => {
  const row = {
    id: 'tid1',
    createdAt: new Date('2026-05-07T00:00:00.000Z'),
    title: 'Update homepage wording',
    status: 'Open',
    stage: 'Intake',
    consoleJson: {
      request_type: 'website_refinement',
      priority: 'Normal',
      property_reference: 'lm-x',
      client_view: { workflow_state: 'awaiting_operator_review' },
    },
  };
  const s = safeLuxRelatedRequestShape(row);
  assert.equal(s.ticket_id, 'tid1');
  assert.equal(s.request_type, 'website_refinement');
  assert.equal(s.workflow_state, 'awaiting_operator_review');
  assert.equal(s.property_reference, 'lm-x');
});

test('Dormant gate allowlist includes Lux request actions (smoke)', async () => {
  // This is an extremely lightweight guardrail: it fails if someone removes the allowlist entries.
  const fs = await import('node:fs/promises');
  const p = new URL('../lib/cmp/router.js', import.meta.url);
  const s = await fs.readFile(p, 'utf8');
  assert.ok(s.includes("'lux-client-request-create'"));
  assert.ok(s.includes("'lux-client-requests-list'"));
});


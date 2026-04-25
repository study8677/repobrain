import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  applyClientDecisionAnswers,
  CLIENT_DECISION_KEYS,
  ensureClientDecisionsOnConsoleJson,
  evaluateClientDecisionsGate,
  mergeProgrammeInternalDecisionsForTicket,
  pickClientDecisionAnswersOnly,
  PROGRAMME_INTERNAL_DECISION_DEFAULTS,
  payloadLeaksInternals,
  UMBRELLA_CLIENT_DECISION_TICKET_IDS,
} from '../lib/cmp/_lib/client-decisions-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.join(__dirname, '..');

test('CLIENT_DECISION_KEYS: exactly four client-facing keys', () => {
  assert.deepEqual(CLIENT_DECISION_KEYS, [
    'first_slice_outcome',
    'first_market_or_country',
    'listings_feed_or_idx_provider_status',
    'human_handoff_owner_and_hours',
  ]);
});

test('evaluateClientDecisionsGate: insufficient until all four answered (or IDX waived)', () => {
  const partial = [
    { key: 'first_slice_outcome', status: 'answered', answer: 'x' },
    { key: 'first_market_or_country', status: 'pending', answer: '' },
    { key: 'listings_feed_or_idx_provider_status', status: 'pending', answer: '' },
    { key: 'human_handoff_owner_and_hours', status: 'pending', answer: '' },
  ];
  assert.equal(evaluateClientDecisionsGate(partial).sufficient_to_proceed, false);

  const complete = [
    { key: 'first_slice_outcome', status: 'answered', answer: 'a' },
    { key: 'first_market_or_country', status: 'answered', answer: 'b' },
    { key: 'listings_feed_or_idx_provider_status', status: 'waived', answer: '' },
    { key: 'human_handoff_owner_and_hours', status: 'answered', answer: 'e' },
  ];
  assert.equal(evaluateClientDecisionsGate(complete).sufficient_to_proceed, true);
});

test('ensureClientDecisionsOnConsoleJson: drops legacy CRM/AI items so gate uses four keys only', () => {
  const stored = {
    client_decisions: {
      items: [
        { key: 'first_slice_outcome', status: 'answered', answer: 'a' },
        { key: 'first_market_or_country', status: 'answered', answer: 'b' },
        { key: 'listings_feed_or_idx_provider_status', status: 'waived', answer: '' },
        { key: 'human_handoff_owner_and_hours', status: 'answered', answer: 'e' },
        { key: 'crm_destination_or_tooling_preference', status: 'pending', answer: '' },
        { key: 'first_ai_communication_channel', status: 'pending', answer: '' },
      ],
    },
  };
  const ensured = ensureClientDecisionsOnConsoleJson(stored);
  const items = Array.isArray(ensured.client_decisions?.items) ? ensured.client_decisions.items : [];
  assert.equal(items.length, 4);
  assert.equal(evaluateClientDecisionsGate(items.map((x) => (x && typeof x === 'object' ? x : {}))).sufficient_to_proceed, true);
});

test('applyClientDecisionAnswers: four answers sufficient; preserves internal_decisions blob', () => {
  const stored = {
    internal_decisions: { other: 'keep' },
    client_decisions: { items: [] },
    messages: [],
  };
  const answersByKey = {
    first_slice_outcome: { answer: 'Slice A' },
    first_market_or_country: { answer: 'CA' },
    listings_feed_or_idx_provider_status: { waive: true },
    human_handoff_owner_and_hours: { answer: 'Owner: Ops · Hours: 9-5 ET' },
  };
  const applied = applyClientDecisionAnswers({
    stored,
    answersByKey,
    meta: { nowIso: '2026-01-01T00:00:00.000Z', messageId: 'msg:test' },
  });
  assert.equal(applied.sufficient_to_proceed, true);
  assert.deepEqual(applied.next.internal_decisions, { other: 'keep' });
  const cd = applied.next.client_decisions && typeof applied.next.client_decisions === 'object' ? applied.next.client_decisions : {};
  assert.equal(cd.sufficient_to_proceed, true);
  const items = Array.isArray(cd.items) ? cd.items : [];
  assert.equal(items.length, 4);
  const byKey = new Map(items.map((x) => [String(x.key), x]));
  assert.equal(byKey.get('first_slice_outcome')?.status, 'answered');
  assert.equal(byKey.get('listings_feed_or_idx_provider_status')?.status, 'waived');
  assert.equal(byKey.has('crm_destination_or_tooling_preference'), false);
  assert.equal(byKey.has('first_ai_communication_channel'), false);
});

test('pickClientDecisionAnswersOnly: strips CRM and AI channel keys from client POST', () => {
  const raw = {
    first_slice_outcome: { answer: 'x' },
    crm_destination_or_tooling_preference: { answer: 'GoHighLevel' },
    first_ai_communication_channel: { answer: 'SMS' },
  };
  const picked = pickClientDecisionAnswersOnly(raw);
  assert.equal(Object.keys(picked).length, 1);
  assert.ok(picked.first_slice_outcome);
  assert.equal(picked.crm_destination_or_tooling_preference, undefined);
  assert.equal(picked.first_ai_communication_channel, undefined);
});

test('mergeProgrammeInternalDecisionsForTicket: umbrella id persists Postgres CRM + web_chat', () => {
  const id = [...UMBRELLA_CLIENT_DECISION_TICKET_IDS][0];
  const merged = mergeProgrammeInternalDecisionsForTicket(id, { client_decisions: { items: [] } });
  const intl = merged.internal_decisions && typeof merged.internal_decisions === 'object' ? merged.internal_decisions : {};
  assert.equal(intl.crm_destination, 'postgres_internal_crm');
  assert.equal(intl.ai_first_channel, 'web_chat');
  assert.equal(intl.crm_reason, PROGRAMME_INTERNAL_DECISION_DEFAULTS.crm_reason);
  assert.equal(String(JSON.stringify(merged)).toLowerCase().includes('gohighlevel'), false);
});

test('mergeProgrammeInternalDecisionsForTicket: other tickets unchanged', () => {
  const merged = mergeProgrammeInternalDecisionsForTicket('other-ticket-id', { foo: 1 });
  assert.deepEqual(merged, { foo: 1 });
});

test('payloadLeaksInternals: client-decisions-get/submit shapes are safe', () => {
  assert.equal(payloadLeaksInternals({ ok: true, client_decisions: { items: [] } }), false);
  assert.equal(payloadLeaksInternals({ internal_decisions: [] }), true);
});

test('client change decisions page: no forbidden leaks; no removed question keys; single CTA', () => {
  const p = path.join(repoRoot, 'pages', 'client', 'change-decisions.js');
  const src = fs.readFileSync(p, 'utf8');
  for (const needle of ['internal_decisions', 'console_json', 'reality_panel', 'change_stage_debug']) {
    assert.equal(src.includes(needle), false, `unexpected ${needle} in client page`);
  }
  for (const needle of ['crm_destination_or_tooling_preference', 'first_ai_communication_channel', 'GoHighLevel']) {
    assert.equal(src.includes(needle), false, `unexpected ${needle} in client page`);
  }
  const matches = src.match(/<button\b/gi) || [];
  assert.equal(matches.length, 1, 'client page should have exactly one button (single CTA)');
});

test('submit-client-decisions handler does not trigger sandbox dispatch', () => {
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  const start = chunk.indexOf('async function handleSubmitClientDecisions');
  assert.ok(start >= 0);
  const end = chunk.indexOf('async function handleSandboxStart', start);
  assert.ok(end > start);
  const fn = chunk.slice(start, end);
  assert.equal(fn.includes('dispatchCmpSandboxStart'), false);
});

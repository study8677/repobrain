import assert from 'node:assert/strict';
import { test } from 'node:test';

import { applyEscalatedRefinementMessages, evaluateOperatorEscalation } from '../lib/cmp/_lib/cmp-operator-escalation.js';

test('evaluateOperatorEscalation: multi-system (>=3) triggers', () => {
  const r = evaluateOperatorEscalation({
    description: 'Update postgres schema, react dashboard, stripe billing, and mobile app push',
    brief: { summary: 'x', confidence: 'high' },
    latestUserMessage: '',
    transcriptTail: '',
    nowIso: '2026-01-01T00:00:00.000Z',
    lastUserMsgTs: '2026-01-01T00:00:00.000Z',
    ticketDescriptionHash: 'abc',
  });
  assert.equal(r.operator_assisted, true);
  assert.ok(r.reasons.some((x) => String(x).startsWith('multi_system_build')));
  assert.equal(r.operator_escalation.signals.multi_system.count >= 3, true);
});

test('evaluateOperatorEscalation: strategy keyword triggers', () => {
  const r = evaluateOperatorEscalation({
    description: 'Need a GTM roadmap for Q3',
    brief: {},
    latestUserMessage: '',
    transcriptTail: '',
    nowIso: '2026-01-01T00:00:00.000Z',
    lastUserMsgTs: '2026-01-01T00:00:00.000Z',
    ticketDescriptionHash: 'abc',
  });
  assert.equal(r.operator_assisted, true);
  assert.ok(r.reasons.includes('strategy_request'));
  assert.equal(r.operator_escalation.signals.strategy, true);
});

test('evaluateOperatorEscalation: low confidence + many missing triggers undefined scope', () => {
  const r = evaluateOperatorEscalation({
    description: 'fix stuff',
    brief: {
      confidence: 'low',
      missing_information: ['What exactly?', 'Which environment?'],
    },
    latestUserMessage: '',
    transcriptTail: '',
    nowIso: '2026-01-01T00:00:00.000Z',
    lastUserMsgTs: '2026-01-01T00:00:00.000Z',
    ticketDescriptionHash: 'abc',
  });
  assert.equal(r.operator_assisted, true);
  assert.ok(r.reasons.includes('undefined_scope'));
  assert.equal(r.operator_escalation.signals.undefined_scope, true);
});

test('applyEscalatedRefinementMessages: withholds assistant when escalated', () => {
  const stored = { messages: [], brief: {} };
  const base = [{ role: 'user', content: 'hi', ts: 't0' }];
  const assistantMsg = { role: 'assistant', content: 'draft reply', ts: 't1', ok: true };
  const out = applyEscalatedRefinementMessages(stored, {
    baseMessages: base,
    assistantMsg,
    assessment: { operator_assisted: true, reasons: ['strategy_request'] },
    refinedMeta: { refinement_source: 'groq' },
  });
  assert.equal(out.withheld, true);
  assert.equal(stored.mode, 'operator_assisted');
  assert.equal(stored.messages.length, 1);
  assert.equal(stored.pending_operator_draft.content, 'draft reply');
});

test('applyEscalatedRefinementMessages: posts assistant when not escalated', () => {
  const stored = { messages: [] };
  const base = [{ role: 'user', content: 'hi', ts: 't0' }];
  const assistantMsg = { role: 'assistant', content: 'ok', ts: 't1', ok: true };
  const out = applyEscalatedRefinementMessages(stored, {
    baseMessages: base,
    assistantMsg,
    assessment: { operator_assisted: false, reasons: [] },
    refinedMeta: {},
  });
  assert.equal(out.withheld, false);
  assert.equal(stored.messages.length, 2);
  assert.equal(stored.pending_operator_draft, undefined);
});

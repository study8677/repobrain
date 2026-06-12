import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  LUX_TENANT_ID,
  PROTECTED_TICKETS,
  TARGET_TICKETS,
  CLOSURE_MESSAGE_CONTENT,
  CLOSURE_MESSAGE_SOURCE,
  KNOWN_OPERATOR_TEST_DRAFTS,
  preflightConfigCheck,
  preWriteCheck,
  applyHardCloseAndAppendMessage,
} from '../lib/cmp/_lib/lux-phase4c1-smoke-cleanup.js';

const SAMPLE_TARGET_ROW = Object.freeze({
  id: 'cmp50bue90000js04rlqa0r7i',
  tenantId: 'luxe-maurice',
  status: 'Open',
  stage: 'Intake',
  title: '',
  description:
    'Phase 4C.1 attachment review smoke test. Created and reviewed by automated round-trip; safe to leave open.',
  consoleJson: {
    messages: [
      { ts: '2026-05-13T00:00:00.000Z', role: 'user', content: 'prior intake' },
    ],
    client_view: { workflow_state: 'awaiting_operator_review' },
  },
});

test('preflightConfigCheck: target set is exactly 18 unique ids', () => {
  assert.equal(preflightConfigCheck().ok, true);
  assert.equal(TARGET_TICKETS.length, 18);
  assert.equal(new Set(TARGET_TICKETS).size, 18);
});

test('preflightConfigCheck: protected tickets are never in the target set', () => {
  for (const protectedId of PROTECTED_TICKETS) {
    assert.equal(TARGET_TICKETS.includes(protectedId), false, `${protectedId} must not be a target`);
  }
});

test('PROTECTED_TICKETS includes master programme + active content sprint parent', () => {
  assert.equal(PROTECTED_TICKETS.includes('cmo8mjijk0000jl04l1jz0v6d'), true);
  assert.equal(PROTECTED_TICKETS.includes('cmqa2y2ga0000l704glnfro1f'), true);
});

test('preWriteCheck: accepts a valid Phase 4C.1 smoke row', () => {
  assert.deepEqual(preWriteCheck(SAMPLE_TARGET_ROW), { ok: true });
});

test('preWriteCheck: refuses protected ticket id even if everything else looks right', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, id: 'cmo8mjijk0000jl04l1jz0v6d' });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^protected-ticket-in-target-set:cmo8/);
});

test('preWriteCheck: refuses active content sprint parent', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, id: 'cmqa2y2ga0000l704glnfro1f' });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^protected-ticket-in-target-set:cmqa/);
});

test('preWriteCheck: refuses wrong-tenant row', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, tenantId: 'apex' });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'wrong-tenant:apex');
});

test('preWriteCheck: refuses null-tenant row', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, tenantId: null });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'wrong-tenant:null');
});

test('preWriteCheck: already-closed is a soft skip, not a refusal abort', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, status: 'Closed' });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'already-closed');
});

test('preWriteCheck: refuses row whose description no longer matches Phase 4C.1 smoke heuristic', () => {
  const check = preWriteCheck({
    ...SAMPLE_TARGET_ROW,
    description: 'A real client request — first private opportunity in Bel Ombre.',
  });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'description-does-not-match-phase4c1-smoke-heuristic');
});

test('preWriteCheck: refuses row whose stage is already Closed', () => {
  const check = preWriteCheck({ ...SAMPLE_TARGET_ROW, stage: 'Closed' });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'stage-already-terminal:closed');
});

test('preWriteCheck: refuses row whose console_json workflow_state is already closed', () => {
  const check = preWriteCheck({
    ...SAMPLE_TARGET_ROW,
    consoleJson: { client_view: { workflow_state: 'closed' } },
  });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'workflow-already-terminal:closed');
});

test('preWriteCheck: accepts row where smoke phrase is in title (description blank)', () => {
  const check = preWriteCheck({
    ...SAMPLE_TARGET_ROW,
    title: 'Phase 4C.1 attachment review smoke test',
    description: '',
  });
  assert.equal(check.ok, true);
});

test('applyHardCloseAndAppendMessage: sets client_view.workflow_state=closed + closure record', () => {
  const nowIso = '2026-06-11T23:59:59.000Z';
  const next = applyHardCloseAndAppendMessage(SAMPLE_TARGET_ROW.consoleJson, nowIso);
  assert.equal(next.client_view.workflow_state, 'closed');
  assert.equal(typeof next.client_view.workflow_next_action, 'string');
  assert.equal(typeof next.client_view.progress_message, 'string');
  assert.equal(next.client_view.closure.kind, 'hard_close');
  assert.equal(next.client_view.closure.decided_at, nowIso);
  assert.match(String(next.client_view.closure.context_note), /LuxeMaurice operator queue cleanup/);
});

test('applyHardCloseAndAppendMessage: preserves prior messages, appends exactly one closure message', () => {
  const nowIso = '2026-06-11T23:59:59.000Z';
  const next = applyHardCloseAndAppendMessage(SAMPLE_TARGET_ROW.consoleJson, nowIso);
  assert.equal(Array.isArray(next.messages), true);
  assert.equal(next.messages.length, SAMPLE_TARGET_ROW.consoleJson.messages.length + 1);
  // Prior messages preserved verbatim (not just shape — identity of content).
  for (let i = 0; i < SAMPLE_TARGET_ROW.consoleJson.messages.length; i += 1) {
    assert.deepEqual(next.messages[i], SAMPLE_TARGET_ROW.consoleJson.messages[i]);
  }
  const closure = next.messages[next.messages.length - 1];
  assert.equal(closure.ts, nowIso);
  assert.equal(closure.role, 'assistant');
  assert.equal(closure.content, CLOSURE_MESSAGE_CONTENT);
  assert.equal(closure.source, CLOSURE_MESSAGE_SOURCE);
});

test('applyHardCloseAndAppendMessage: tolerates missing messages array on prior console_json', () => {
  const nowIso = '2026-06-11T23:59:59.000Z';
  const next = applyHardCloseAndAppendMessage({ client_view: { workflow_state: 'refining' } }, nowIso);
  assert.equal(Array.isArray(next.messages), true);
  assert.equal(next.messages.length, 1);
  assert.equal(next.messages[0].content, CLOSURE_MESSAGE_CONTENT);
});

test('applyHardCloseAndAppendMessage: tolerates null / non-object prior console_json', () => {
  const nowIso = '2026-06-11T23:59:59.000Z';
  const fromNull = applyHardCloseAndAppendMessage(null, nowIso);
  assert.equal(fromNull.client_view.workflow_state, 'closed');
  assert.equal(fromNull.messages.length, 1);
  const fromArray = applyHardCloseAndAppendMessage(['stray'], nowIso);
  assert.equal(fromArray.client_view.workflow_state, 'closed');
  assert.equal(fromArray.messages.length, 1);
});

test('LUX_TENANT_ID is "luxe-maurice"', () => {
  assert.equal(LUX_TENANT_ID, 'luxe-maurice');
});

test('KNOWN_OPERATOR_TEST_DRAFTS: every entry is in TARGET_TICKETS and matches a documented inspection signature', () => {
  for (const [id, sig] of KNOWN_OPERATOR_TEST_DRAFTS.entries()) {
    assert.equal(TARGET_TICKETS.includes(id), true, `${id} must be in TARGET_TICKETS`);
    assert.equal(typeof sig.expected_title_exact, 'string');
    assert.equal(typeof sig.expected_description_exact, 'string');
    assert.equal(typeof sig.max_message_count, 'number');
    assert.equal(typeof sig.max_attachment_count, 'number');
    assert.equal(typeof sig.rationale, 'string');
    assert.equal(sig.rationale.length > 0, true);
  }
});

test('preWriteCheck: accepts a known operator test draft when title + description + counts match exactly', () => {
  const check = preWriteCheck({
    id: 'cmov9fs050000kz04070wi23k',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Make changes to the website appearance',
    description: "Let's test this function",
    consoleJson: {
      messages: [],
      lux_request_meta: { attachments: [] },
      client_view: { workflow_state: 'awaiting_operator_review' },
    },
  });
  assert.deepEqual(check, { ok: true });
});

test('preWriteCheck: refuses operator test draft if title drifted', () => {
  const check = preWriteCheck({
    id: 'cmov9fs050000kz04070wi23k',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Real client request — Bel Ombre villa',
    description: "Let's test this function",
    consoleJson: { messages: [], client_view: { workflow_state: 'awaiting_operator_review' } },
  });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^operator-test-draft-title-mismatch:/);
});

test('preWriteCheck: refuses operator test draft if description drifted', () => {
  const check = preWriteCheck({
    id: 'cmov9fs050000kz04070wi23k',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Make changes to the website appearance',
    description: 'Please add a hero image for the villa listing.',
    consoleJson: { messages: [], client_view: { workflow_state: 'awaiting_operator_review' } },
  });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^operator-test-draft-description-mismatch:/);
});

test('preWriteCheck: refuses operator test draft if real messages were appended', () => {
  const check = preWriteCheck({
    id: 'cmov9fs050000kz04070wi23k',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Make changes to the website appearance',
    description: "Let's test this function",
    consoleJson: {
      messages: [{ ts: '2026-06-09T00:00:00Z', role: 'user', content: 'Actually, real client question…' }],
      client_view: { workflow_state: 'awaiting_operator_review' },
    },
  });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^operator-test-draft-message-count-too-high:/);
});

test('preWriteCheck: refuses operator test draft if attachments were added', () => {
  const check = preWriteCheck({
    id: 'cmov9fs050000kz04070wi23k',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Make changes to the website appearance',
    description: "Let's test this function",
    consoleJson: {
      messages: [],
      lux_request_meta: { attachments: [{ id: 'att-1' }] },
      client_view: { workflow_state: 'awaiting_operator_review' },
    },
  });
  assert.equal(check.ok, false);
  assert.match(String(check.reason), /^operator-test-draft-attachment-count-too-high:/);
});

test('preWriteCheck: still refuses unknown row that lacks Phase 4C.1 phrase even if title looks generic', () => {
  const check = preWriteCheck({
    id: 'cmsomethingelse',
    tenantId: 'luxe-maurice',
    status: 'Open',
    stage: 'Intake',
    title: 'Make changes to the website appearance',
    description: "Let's test this function",
    consoleJson: { messages: [], client_view: { workflow_state: 'awaiting_operator_review' } },
  });
  assert.equal(check.ok, false);
  assert.equal(check.reason, 'description-does-not-match-phase4c1-smoke-heuristic');
});

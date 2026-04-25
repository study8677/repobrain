import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deriveWorkflowState } from '../lib/cmp/_lib/change-workflow-state.js';

test('deriveWorkflowState: Closed row yields published even if client_view stuck in_review', () => {
  const consoleJson = {
    client_view: {
      workflow_state: 'in_review',
      automation: { preview_url: 'https://x.vercel.app', dispatch_ok: true },
      preview_review: { decision: 'approve' },
    },
    promotion: { pr_number: 1, merged: false },
  };
  const wf = deriveWorkflowState({
    status: 'Closed',
    stage: 'Closed',
    consoleJson,
  });
  assert.equal(wf, 'published');
});

test('deriveWorkflowState: hard_close closure stays closed', () => {
  const wf = deriveWorkflowState({
    status: 'Closed',
    stage: 'Closed',
    consoleJson: {
      client_view: {
        workflow_state: 'closed',
        closure: { kind: 'hard_close' },
      },
    },
  });
  assert.equal(wf, 'closed');
});

test('deriveWorkflowState: Approved/Build + incomplete client_decisions gates before automation dispatch', () => {
  const wf = deriveWorkflowState({
    status: 'Approved',
    stage: 'Build',
    consoleJson: {
      client_decisions: {
        sufficient_to_proceed: false,
        items: [
          { key: 'first_slice_outcome', status: 'pending', answer: '' },
          { key: 'first_market_or_country', status: 'pending', answer: '' },
          { key: 'listings_feed_or_idx_provider_status', status: 'pending', answer: '' },
          { key: 'human_handoff_owner_and_hours', status: 'pending', answer: '' },
        ],
      },
    },
  });
  assert.equal(wf, 'awaiting_client_programme_decisions');
});

test('deriveWorkflowState: Approved/Build + sufficient client_decisions returns approved_for_build (no dispatch yet)', () => {
  const wf = deriveWorkflowState({
    status: 'Approved',
    stage: 'Build',
    consoleJson: {
      client_decisions: {
        sufficient_to_proceed: true,
        items: [
          { key: 'first_slice_outcome', status: 'answered', answer: 'a' },
          { key: 'first_market_or_country', status: 'answered', answer: 'b' },
          { key: 'listings_feed_or_idx_provider_status', status: 'waived', answer: '' },
          { key: 'human_handoff_owner_and_hours', status: 'answered', answer: 'e' },
        ],
      },
    },
  });
  assert.equal(wf, 'approved_for_build');
});

test('deriveWorkflowState: Approved/Build without client_decisions object is unchanged', () => {
  const wf = deriveWorkflowState({
    status: 'Approved',
    stage: 'Build',
    consoleJson: {},
  });
  assert.equal(wf, 'approved_for_build');
});

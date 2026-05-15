import assert from 'node:assert/strict';
import { test } from 'node:test';

import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../lib/cmp/_lib/lux-client-requests.js';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../lib/cmp/_lib/client-decisions-client.js';
import {
  classifyLuxChangeQueueTicket,
  partitionLuxChangeQueueTickets,
} from '../lib/client/lux-change-queue-classify.js';
import { buildLuxChangeConsoleChrome } from '../lib/client/lux-change-console-theme.js';

test('classifyLuxChangeQueueTicket: programme ids', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: 'x' }).bucket,
    'programme',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: LUX_PHASE1_REVIEW_TICKET_ID, requested_change: 'x' }).bucket,
    'programme',
  );
});

test('classifyLuxChangeQueueTicket: smoke/test heuristics', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't1', requested_change: 'Phase 2 smoke verification' }).bucket,
    'smoke_test',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 't2', requested_change: 'QA fixture for example.invalid host' }).bucket,
    'smoke_test',
  );
});

test('classifyLuxChangeQueueTicket: media / property / client_request', () => {
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'a', requested_change: 'Hero slot media publish' }).bucket,
    'media',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'b', requested_change: 'Property editor listing slug lm-demo' }).bucket,
    'property',
  );
  assert.equal(
    classifyLuxChangeQueueTicket({ ticket_id: 'c', requested_change: 'CRM lead intake' }).bucket,
    'client_request',
  );
});

test('partitionLuxChangeQueueTickets: smoke last bucket only', () => {
  const { primary, smoke } = partitionLuxChangeQueueTickets([
    { ticket_id: 'sm', requested_change: 'smoke test' },
    { ticket_id: LUX_PARENT_PROGRAMME_TICKET_ID, requested_change: 'Programme' },
    { ticket_id: 'x', requested_change: 'Normal change' },
  ]);
  assert.equal(primary.length, 2);
  assert.equal(smoke.length, 1);
  assert.equal(smoke[0].ticket_id, 'sm');
});

test('buildLuxChangeConsoleChrome: exposes Lux panel tokens', () => {
  const c = buildLuxChangeConsoleChrome();
  assert.equal(typeof c.shellStyle, 'function');
  assert.equal(typeof c.pre, 'function');
  assert.equal(typeof c.badge, 'function');
  assert.ok(String(c.shellStyle().background || '').length > 0);
});

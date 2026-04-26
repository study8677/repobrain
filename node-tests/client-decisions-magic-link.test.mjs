import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  buildNewClientDecisionsAccessRecord,
  hashClientDecisionsToken,
  verifyClientDecisionsAccessToken,
} from '../lib/cmp/_lib/client-decisions-magic-link.js';

test('verifyClientDecisionsAccessToken: good token, not consumed', () => {
  const plain = 'a'.repeat(64);
  const { access } = buildNewClientDecisionsAccessRecord(plain);
  const v = verifyClientDecisionsAccessToken(access, plain, String(access.issued_at || new Date().toISOString()));
  assert.equal(v.ok, true);
  assert.equal(v.consumed, false);
});

test('verifyClientDecisionsAccessToken: wrong token fails', () => {
  const plain = 'b'.repeat(64);
  const { access } = buildNewClientDecisionsAccessRecord(plain);
  const v = verifyClientDecisionsAccessToken(access, 'c'.repeat(64), '2099-01-01T00:00:00.000Z');
  assert.equal(v.ok, false);
});

test('verifyClientDecisionsAccessToken: expired', () => {
  const plain = 'd'.repeat(64);
  const { access } = buildNewClientDecisionsAccessRecord(plain);
  const v = verifyClientDecisionsAccessToken(access, plain, '2100-01-01T00:00:00.000Z');
  assert.equal(v.ok, false);
});

test('verifyClientDecisionsAccessToken: consumed still verifies', () => {
  const plain = 'e'.repeat(64);
  const { access } = buildNewClientDecisionsAccessRecord(plain);
  access.issued_at = '2026-01-01T00:00:00.000Z';
  access.expires_at = '2027-01-01T00:00:00.000Z';
  access.consumed_at = '2026-01-02T00:00:00.000Z';
  const v = verifyClientDecisionsAccessToken(access, plain, '2026-06-01T00:00:00.000Z');
  assert.equal(v.ok, true);
  assert.equal(v.consumed, true);
});

test('router: client decisions gate helper exists and submit still skips sandbox', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.join(path.dirname(__filename), '..');
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  assert.equal(chunk.includes('assertClientDecisionsMagicOrDormantGate'), true);
  assert.equal(chunk.includes('CLIENT_DECISIONS_ACCESS_KEY'), true);
  const start = chunk.indexOf('async function handleSubmitClientDecisions');
  const end = chunk.indexOf('async function handleSandboxStart', start);
  const fn = chunk.slice(start, end);
  assert.equal(fn.includes('dispatchCmpSandboxStart'), false);
});

test('router: tenant-safe client-decisions-link-mint action exists and does not return plaintext token', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = path.join(path.dirname(__filename), '..');
  const p = path.join(repoRoot, 'lib', 'cmp', 'router.js');
  const chunk = fs.readFileSync(p, 'utf8');
  assert.equal(chunk.includes("case 'client-decisions-link-mint':"), true);
  assert.equal(chunk.includes('magic_link_url'), true);
  assert.equal(chunk.includes('expires_at'), true);
  // Ensure the mint response is constrained.
  const i = chunk.indexOf('async function handleClientDecisionsLinkMint');
  assert.ok(i >= 0);
  const j = chunk.indexOf('async function handleSandboxStart', i);
  assert.ok(j > i);
  const fn = chunk.slice(i, j);
  assert.equal(fn.includes('token:'), false, 'mint response must not include plaintext token field');
});

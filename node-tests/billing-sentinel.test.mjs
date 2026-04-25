import test from 'node:test';
import assert from 'node:assert/strict';
import handler, { __setSpawnSyncForTests } from '../lib/server/billing-sentinel.js';

function mkRes() {
  const r = { statusCode: 0, headers: {}, body: null };
  return {
    status(code) {
      r.statusCode = code;
      return this;
    },
    setHeader(k, v) {
      r.headers[k] = v;
    },
    json(obj) {
      r.body = obj;
      return this;
    },
    _raw: r,
  };
}

test('cron/billing-sentinel returns 401 without bearer', async () => {
  const prev = process.env.CORPFLOW_CRON_SECRET;
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  try {
    const req = { method: 'GET', headers: {} };
    const res = mkRes();
    await handler(req, res);
    assert.equal(res._raw.statusCode, 401);
    assert.equal(res._raw.body?.error, 'Unauthorized');
  } finally {
    if (prev == null) delete process.env.CORPFLOW_CRON_SECRET;
    else process.env.CORPFLOW_CRON_SECRET = prev;
  }
});

test('cron/billing-sentinel low-cost mode skips without spawning', async () => {
  const prevSecret = process.env.CORPFLOW_CRON_SECRET;
  const prevLow = process.env.LOW_COST_MODE;
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.LOW_COST_MODE = 'true';
  __setSpawnSyncForTests(() => {
    throw new Error('spawnSync should not be called in low cost mode');
  });
  try {
    const req = { method: 'GET', headers: { authorization: 'Bearer abc' } };
    const res = mkRes();
    await handler(req, res);
    assert.equal(res._raw.statusCode, 200);
    assert.deepEqual(res._raw.body, { ok: true, skipped: true, reason: 'low_cost_mode' });
  } finally {
    __setSpawnSyncForTests(() => ({ status: 0, stdout: '{}', stderr: '', error: null }));
    if (prevSecret == null) delete process.env.CORPFLOW_CRON_SECRET;
    else process.env.CORPFLOW_CRON_SECRET = prevSecret;
    if (prevLow == null) delete process.env.LOW_COST_MODE;
    else process.env.LOW_COST_MODE = prevLow;
  }
});

test('cron/billing-sentinel timeout returns controlled 504 JSON', async () => {
  const prevSecret = process.env.CORPFLOW_CRON_SECRET;
  const prevLow = process.env.LOW_COST_MODE;
  const prevTimeout = process.env.BILLING_SENTINEL_TIMEOUT_MS;
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.LOW_COST_MODE = 'false';
  process.env.BILLING_SENTINEL_TIMEOUT_MS = '1000';
  __setSpawnSyncForTests(() => ({ status: null, stdout: '', stderr: '', error: { code: 'ETIMEDOUT', message: 'timeout' } }));
  try {
    const req = { method: 'GET', headers: { authorization: 'Bearer abc' } };
    const res = mkRes();
    await handler(req, res);
    assert.equal(res._raw.statusCode, 504);
    assert.equal(res._raw.body?.ok, false);
    assert.equal(res._raw.body?.error, 'billing_sentinel_timeout');
    assert.equal(res._raw.body?.timeout_ms, 1000);
  } finally {
    __setSpawnSyncForTests(() => ({ status: 0, stdout: '{}', stderr: '', error: null }));
    if (prevSecret == null) delete process.env.CORPFLOW_CRON_SECRET;
    else process.env.CORPFLOW_CRON_SECRET = prevSecret;
    if (prevLow == null) delete process.env.LOW_COST_MODE;
    else process.env.LOW_COST_MODE = prevLow;
    if (prevTimeout == null) delete process.env.BILLING_SENTINEL_TIMEOUT_MS;
    else process.env.BILLING_SENTINEL_TIMEOUT_MS = prevTimeout;
  }
});

test('cron/billing-sentinel authenticated happy path parses JSON', async () => {
  const prevSecret = process.env.CORPFLOW_CRON_SECRET;
  const prevLow = process.env.LOW_COST_MODE;
  process.env.CORPFLOW_CRON_SECRET = 'abc';
  process.env.LOW_COST_MODE = 'false';
  __setSpawnSyncForTests(() => ({ status: 0, stdout: '{"ok":true}', stderr: '', error: null }));
  try {
    const req = { method: 'GET', headers: { authorization: 'Bearer abc' } };
    const res = mkRes();
    await handler(req, res);
    assert.equal(res._raw.statusCode, 200);
    assert.equal(res._raw.body?.ok, true);
    assert.deepEqual(res._raw.body?.sentinel, { ok: true });
  } finally {
    __setSpawnSyncForTests(() => ({ status: 0, stdout: '{}', stderr: '', error: null }));
    if (prevSecret == null) delete process.env.CORPFLOW_CRON_SECRET;
    else process.env.CORPFLOW_CRON_SECRET = prevSecret;
    if (prevLow == null) delete process.env.LOW_COST_MODE;
    else process.env.LOW_COST_MODE = prevLow;
  }
});


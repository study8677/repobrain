import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPasswordResetEmailPayload } from '../lib/server/password-reset-delivery.js';
import {
  resolveEmailFromAddress,
  resolveN8nEmailWebhookUrl,
  resolveN8nEmailWebhookSecret,
  sendN8nTransactionalEmail,
  n8nEmailDeliveryDiagnostics,
} from '../lib/server/email-delivery.js';

const ENV_KEYS = [
  'N8N_EMAIL_WEBHOOK_URL',
  'N8N_EMAIL_WEBHOOK_SECRET',
  'EMAIL_FROM',
  'CORPFLOW_PASSWORD_RESET_WEBHOOK_URL',
  'CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET',
  'CORPFLOW_PASSWORD_RESET_FROM_EMAIL',
];

function snapshotEnv() {
  const before = {};
  for (const k of ENV_KEYS) before[k] = process.env[k];
  return () => {
    for (const k of ENV_KEYS) {
      if (before[k] === undefined) delete process.env[k];
      else process.env[k] = before[k];
    }
  };
}

test('buildPasswordResetEmailPayload includes both new and legacy fields', () => {
  const now = Date.parse('2026-05-21T05:00:00.000Z');
  const expiresAt = '2026-05-21T05:30:00.000Z';
  const payload = buildPasswordResetEmailPayload({
    tenantId: 'luxe-maurice',
    email: 'client@example.com',
    token: 'abc-token-xyz',
    expiresAt,
    resetUrl: 'https://lux.corpflowai.com/login?reset_token=abc-token-xyz',
    resetPath: '/login?reset_token=abc-token-xyz',
    publicBaseUrl: 'https://lux.corpflowai.com',
    fromAddress: 'support@corpflowai.com',
    nowMs: now,
  });

  assert.equal(payload.schema, 'corpflow.email.password_reset.v1');
  assert.equal(payload.purpose, 'password_reset');
  assert.equal(payload.event, 'tenant_password_reset_requested');
  assert.equal(payload.tenant_id, 'luxe-maurice');
  assert.equal(payload.to, 'client@example.com');
  assert.equal(payload.email, 'client@example.com');
  assert.equal(payload.from, 'support@corpflowai.com');
  assert.equal(payload.reset_code, 'abc-token-xyz');
  assert.equal(payload.token, 'abc-token-xyz');
  assert.equal(payload.reset_url, 'https://lux.corpflowai.com/login?reset_token=abc-token-xyz');
  assert.equal(payload.reset_path, '/login?reset_token=abc-token-xyz');
  assert.equal(payload.public_base_url, 'https://lux.corpflowai.com');
  assert.equal(payload.expires_at, expiresAt);
  assert.equal(payload.expires_minutes, 30);
  assert.equal(payload.subject, 'Reset your CorpFlowAI password');
});

test('buildPasswordResetEmailPayload tolerates missing reset_url', () => {
  const payload = buildPasswordResetEmailPayload({
    tenantId: 't',
    email: 'a@b.co',
    token: 'tok',
    expiresAt: 'not-a-date',
    resetUrl: '',
    resetPath: '/login?reset_token=tok',
    publicBaseUrl: '',
    fromAddress: 'support@corpflowai.com',
  });
  assert.equal(payload.reset_url, null);
  assert.equal(payload.public_base_url, null);
  assert.equal(payload.expires_minutes, null);
});

test('resolveEmailFromAddress prefers EMAIL_FROM, then legacy, then default', () => {
  const restore = snapshotEnv();
  try {
    delete process.env.EMAIL_FROM;
    delete process.env.CORPFLOW_PASSWORD_RESET_FROM_EMAIL;
    assert.equal(resolveEmailFromAddress(), 'support@corpflowai.com');

    process.env.CORPFLOW_PASSWORD_RESET_FROM_EMAIL = 'legacy@corpflowai.com';
    assert.equal(resolveEmailFromAddress(), 'legacy@corpflowai.com');

    process.env.EMAIL_FROM = 'support@corpflowai.com';
    assert.equal(resolveEmailFromAddress(), 'support@corpflowai.com');
  } finally {
    restore();
  }
});

test('resolveN8nEmailWebhookUrl/secret prefer new env, fall back to legacy', () => {
  const restore = snapshotEnv();
  try {
    for (const k of ENV_KEYS) delete process.env[k];

    assert.equal(resolveN8nEmailWebhookUrl(), '');
    assert.equal(resolveN8nEmailWebhookSecret(), '');

    process.env.CORPFLOW_PASSWORD_RESET_WEBHOOK_URL = 'https://legacy.example/webhook';
    process.env.CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET = 'legacy-secret';
    assert.equal(resolveN8nEmailWebhookUrl(), 'https://legacy.example/webhook');
    assert.equal(resolveN8nEmailWebhookSecret(), 'legacy-secret');

    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://new.example/webhook';
    process.env.N8N_EMAIL_WEBHOOK_SECRET = 'new-secret';
    assert.equal(resolveN8nEmailWebhookUrl(), 'https://new.example/webhook');
    assert.equal(resolveN8nEmailWebhookSecret(), 'new-secret');
  } finally {
    restore();
  }
});

test('sendN8nTransactionalEmail returns configured=false without throwing when webhook unset', async () => {
  const restore = snapshotEnv();
  try {
    for (const k of ENV_KEYS) delete process.env[k];
    const r = await sendN8nTransactionalEmail({ purpose: 'password_reset' });
    assert.equal(r.attempted, false);
    assert.equal(r.configured, false);
    assert.equal(r.ok, false);
    assert.equal(r.status, null);
    assert.equal(r.error_kind, null);
  } finally {
    restore();
  }
});

test('sendN8nTransactionalEmail posts JSON with secret header when configured', async () => {
  const restore = snapshotEnv();
  try {
    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://example.test/webhook';
    process.env.N8N_EMAIL_WEBHOOK_SECRET = 'unit-secret';
    const calls = [];
    const fakeFetch = async (url, init) => {
      calls.push({ url, init });
      return { ok: true, status: 200 };
    };
    const r = await sendN8nTransactionalEmail({ purpose: 'password_reset', to: 'a@b.co' }, { fetchImpl: fakeFetch });
    assert.equal(r.attempted, true);
    assert.equal(r.configured, true);
    assert.equal(r.ok, true);
    assert.equal(r.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0].url, 'https://example.test/webhook');
    assert.equal(calls[0].init.method, 'POST');
    assert.equal(calls[0].init.headers['Content-Type'], 'application/json');
    assert.equal(calls[0].init.headers['x-corpflow-email-secret'], 'unit-secret');
    const body = JSON.parse(calls[0].init.body);
    assert.equal(body.purpose, 'password_reset');
    assert.equal(body.to, 'a@b.co');
  } finally {
    restore();
  }
});

test('sendN8nTransactionalEmail reports http_not_ok when ESP returns 5xx', async () => {
  const restore = snapshotEnv();
  try {
    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://example.test/webhook';
    const fakeFetch = async () => ({ ok: false, status: 503 });
    const r = await sendN8nTransactionalEmail({}, { fetchImpl: fakeFetch });
    assert.equal(r.ok, false);
    assert.equal(r.status, 503);
    assert.equal(r.error_kind, 'http_not_ok');
  } finally {
    restore();
  }
});

test('sendN8nTransactionalEmail reports fetch_failed without throwing', async () => {
  const restore = snapshotEnv();
  try {
    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://example.test/webhook';
    const fakeFetch = async () => {
      throw new TypeError('network down');
    };
    const r = await sendN8nTransactionalEmail({}, { fetchImpl: fakeFetch });
    assert.equal(r.ok, false);
    assert.equal(r.status, null);
    assert.equal(r.error_kind, 'fetch_failed');
  } finally {
    restore();
  }
});

test('n8nEmailDeliveryDiagnostics reports booleans only', () => {
  const restore = snapshotEnv();
  try {
    for (const k of ENV_KEYS) delete process.env[k];
    let d = n8nEmailDeliveryDiagnostics();
    assert.equal(d.webhook_configured, false);
    assert.equal(d.webhook_secret_configured, false);
    assert.equal(d.email_from_configured, false);

    process.env.N8N_EMAIL_WEBHOOK_URL = 'https://x.test/webhook';
    process.env.N8N_EMAIL_WEBHOOK_SECRET = 's';
    process.env.EMAIL_FROM = 'support@corpflowai.com';
    d = n8nEmailDeliveryDiagnostics();
    assert.equal(d.webhook_configured, true);
    assert.equal(d.webhook_secret_configured, true);
    assert.equal(d.email_from_configured, true);
  } finally {
    restore();
  }
});

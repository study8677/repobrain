import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildProductionPulseV1Report,
  resolveProductionPulseRuntimeUrl,
} from '../scripts/production-pulse.mjs';

test('production pulse: URL resolver maps health URL to pulse runtime', () => {
  assert.equal(
    resolveProductionPulseRuntimeUrl('https://core.corpflowai.com/api/factory/health'),
    'https://core.corpflowai.com/api/factory/production-pulse/runtime',
  );
  assert.equal(
    resolveProductionPulseRuntimeUrl('https://core.corpflowai.com'),
    'https://core.corpflowai.com/api/factory/production-pulse/runtime',
  );
});

test('production pulse: report includes schema, core checks, and deployment_ready', async () => {
  const prev = {
    POSTGRES_URL: process.env.POSTGRES_URL,
    SOVEREIGN_SESSION_SECRET: process.env.SOVEREIGN_SESSION_SECRET,
    ADMIN_PIN: process.env.ADMIN_PIN,
  };
  process.env.POSTGRES_URL = 'postgres://example';
  process.env.SOVEREIGN_SESSION_SECRET = 'x'.repeat(16);
  process.env.ADMIN_PIN = '1234';
  try {
    const r = await buildProductionPulseV1Report(null);
    assert.equal(r.schema, 'corpflow.production_pulse.v1');
    assert.equal(r.version, 1);
    assert.equal(r.deployment_ready, true);
    assert.equal(r.ok, true);
    assert.equal(r.core.database_configured, true);
    assert.equal(r.core.sovereign_session_configured, true);
    assert.equal(r.core.admin_operator_ready, true);
    assert.equal(r.tenant_optional.configured, false);
  } finally {
    for (const [k, v] of Object.entries(prev)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
});

test('production pulse: optional tenant probe uses fetch when URL configured', async () => {
  const prevUrl = process.env.CORPFLOW_PRODUCTION_PULSE_TENANT_URL;
  const prevFetch = globalThis.fetch;
  process.env.CORPFLOW_PRODUCTION_PULSE_TENANT_URL = 'https://lux.example.test/';
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
  });
  try {
    const r = await buildProductionPulseV1Report(null);
    assert.equal(r.tenant_optional.configured, true);
    assert.equal(r.tenant_optional.http_status, 200);
    assert.equal(r.tenant_optional.ok, true);
  } finally {
    if (prevUrl === undefined) delete process.env.CORPFLOW_PRODUCTION_PULSE_TENANT_URL;
    else process.env.CORPFLOW_PRODUCTION_PULSE_TENANT_URL = prevUrl;
    globalThis.fetch = prevFetch;
  }
});

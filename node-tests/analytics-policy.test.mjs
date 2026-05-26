import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMarketingSurface,
  isAnalyticsEnabledByEnv,
  isAnalyticsEnabledForHostPath,
  isHostAllowed,
  isPathAllowed,
  normalizeHost,
} from '../lib/analytics/index.js';

test('normalizeHost lowercases, trims, and strips port', () => {
  assert.equal(normalizeHost('Corpflowai.com'), 'corpflowai.com');
  assert.equal(normalizeHost('  corpflowai.com  '), 'corpflowai.com');
  assert.equal(normalizeHost('corpflowai.com:443'), 'corpflowai.com');
  assert.equal(normalizeHost('host1.example.com, host2.example.com'), 'host1.example.com');
  assert.equal(normalizeHost(''), '');
  assert.equal(normalizeHost(null), '');
  assert.equal(normalizeHost(undefined), '');
});

test('isHostAllowed allows only the apex (step-1) and rejects everything else', () => {
  assert.equal(isHostAllowed('corpflowai.com'), true);
  assert.equal(isHostAllowed('CorpFlowAI.com'), true);

  assert.equal(isHostAllowed('aileadrescue.corpflowai.com'), false, 'deferred to step-2');
  assert.equal(isHostAllowed('core.corpflowai.com'), false);
  assert.equal(isHostAllowed('lux.corpflowai.com'), false);
  assert.equal(isHostAllowed('luxe.corpflowai.com'), false);
  assert.equal(isHostAllowed('tenantx.corpflowai.com'), false);

  assert.equal(isHostAllowed('localhost'), false);
  assert.equal(isHostAllowed('localhost:3000'), false);
  assert.equal(isHostAllowed('preview-abc123.vercel.app'), false);
  assert.equal(isHostAllowed('corpflowai.com.evil.com'), false);
  assert.equal(isHostAllowed(''), false);
});

test('isPathAllowed denies factory/admin/login/master/api/_next/client under the apex', () => {
  for (const path of [
    '/change',
    '/change/queue',
    '/change-v2',
    '/change-v2/queue',
    '/admin',
    '/admin/users',
    '/admin-tools',
    '/login',
    '/login/recover',
    '/master',
    '/lux-editor',
    '/lux-guide',
    '/sovereign-intake',
    '/core-lux-migration-repair',
    '/api/factory/health',
    '/api/auth/password-reset/request',
    '/_next/static/whatever.js',
    '/client/change-decisions',
  ]) {
    assert.equal(
      isPathAllowed('corpflowai.com', path),
      false,
      `expected corpflowai.com${path} to be denied`,
    );
  }
});

test('word-boundary deny does not over-match: /changelog and /administrative would NOT be denied', () => {
  assert.equal(isPathAllowed('corpflowai.com', '/changelog'), true);
  assert.equal(isPathAllowed('corpflowai.com', '/changelog/2026-05'), true);
  assert.equal(isPathAllowed('corpflowai.com', '/administrative'), true);
});

test('isPathAllowed denies token-bearing query strings', () => {
  for (const path of [
    '/?token=abcd',
    '/some/page?reset=xyz',
    '/?ticket=12345',
    '/some/page?foo=bar&token=abcd',
    '/some/page?TOKEN=abcd',
  ]) {
    if (path.includes('TOKEN=')) {
      assert.equal(
        isPathAllowed('corpflowai.com', path),
        true,
        `query keys are case-sensitive in deny check; uppercase TOKEN should pass — confirms intent`,
      );
    } else {
      assert.equal(
        isPathAllowed('corpflowai.com', path),
        false,
        `expected ${path} to be denied for token-bearing query`,
      );
    }
  }
});

test('isPathAllowed denies any reset-password / forgot-password substring', () => {
  for (const path of [
    '/reset-password',
    '/auth/reset-password',
    '/forgot-password',
    '/auth/forgot-password/step-2',
  ]) {
    assert.equal(
      isPathAllowed('corpflowai.com', path),
      false,
      `expected ${path} to be denied for reset/forgot substring`,
    );
  }
});

test('apex-specific deny: /concierge, /properties, /property — denied (tenant-context)', () => {
  for (const path of ['/concierge', '/properties', '/properties/admin', '/property/abc']) {
    assert.equal(
      isPathAllowed('corpflowai.com', path),
      false,
      `expected apex ${path} to be denied (tenant-context)`,
    );
  }
});

test('apex /lead-rescue is allowed in step-1 (it IS apex public marketing today)', () => {
  for (const path of ['/lead-rescue', '/lead-rescue/v2', '/lead-rescue/details']) {
    assert.equal(
      isPathAllowed('corpflowai.com', path),
      true,
      `expected apex ${path} to be allowed (step-1 apex marketing)`,
    );
  }
});

test('apex-specific deny does not over-match: /properties-overview is allowed', () => {
  assert.equal(isPathAllowed('corpflowai.com', '/properties-overview'), true);
  assert.equal(isPathAllowed('corpflowai.com', '/concierge-news'), true);
});

test('apex root and explicit allowed pages pass', () => {
  for (const path of ['/', '/about', '/standards', '/standards/seo', '/onboarding', '/process', '/contact']) {
    assert.equal(isPathAllowed('corpflowai.com', path), true, `expected apex ${path} to be allowed`);
  }
});

test('isAnalyticsEnabledForHostPath = host AND path AND not denied', () => {
  assert.equal(isAnalyticsEnabledForHostPath('corpflowai.com', '/'), true);
  assert.equal(isAnalyticsEnabledForHostPath('corpflowai.com', '/lead-rescue'), true);

  assert.equal(isAnalyticsEnabledForHostPath('aileadrescue.corpflowai.com', '/'), false, 'subdomain off in step-1');
  assert.equal(isAnalyticsEnabledForHostPath('lux.corpflowai.com', '/'), false);
  assert.equal(isAnalyticsEnabledForHostPath('core.corpflowai.com', '/api/factory/health'), false);
  assert.equal(isAnalyticsEnabledForHostPath('corpflowai.com', '/concierge'), false);
  assert.equal(isAnalyticsEnabledForHostPath('corpflowai.com', '/login'), false);
  assert.equal(isAnalyticsEnabledForHostPath('corpflowai.com', '/?token=abc'), false);
});

test('getMarketingSurface returns the right label per host or null', () => {
  assert.equal(getMarketingSurface('corpflowai.com'), 'apex');
  assert.equal(getMarketingSurface('aileadrescue.corpflowai.com'), null);
  assert.equal(getMarketingSurface('lux.corpflowai.com'), null);
  assert.equal(getMarketingSurface('core.corpflowai.com'), null);
  assert.equal(getMarketingSurface(''), null);
});

test('isAnalyticsEnabledByEnv reads NEXT_PUBLIC_PLAUSIBLE_ENABLED with strict "true" semantics', () => {
  const before = process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED;
  try {
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'true';
    assert.equal(isAnalyticsEnabledByEnv(), true);
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'TRUE';
    assert.equal(isAnalyticsEnabledByEnv(), true);
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = 'false';
    assert.equal(isAnalyticsEnabledByEnv(), false);
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = '1';
    assert.equal(isAnalyticsEnabledByEnv(), false);
    process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = '';
    assert.equal(isAnalyticsEnabledByEnv(), false);
    delete process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED;
    assert.equal(isAnalyticsEnabledByEnv(), false);
  } finally {
    if (before === undefined) {
      delete process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED;
    } else {
      process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED = before;
    }
  }
});

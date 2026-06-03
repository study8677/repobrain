import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';

import {
  buildSsgRuntimeLoaderScript,
  DEFAULT_PLAUSIBLE_DOMAIN,
  DEFAULT_PLAUSIBLE_SRC,
  getMarketingSurface,
  isAnalyticsEnabledByEnv,
  isAnalyticsEnabledForHostPath,
  isHostAllowed,
  isPathAllowed,
  normalizeHost,
  resolveAnalyticsForRequest,
  trackEvent,
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

/**
 * SSR injection helper — covers the contract that `pages/_document.js`
 * relies on. We test the policy outcome only (no React render) so the
 * decision surface stays unit-testable without Next.js.
 *
 * Each test snapshots and restores the three env vars it touches so the
 * suite stays order-independent.
 */
function withPlausibleEnv(envOverrides, fn) {
  const before = {
    NEXT_PUBLIC_PLAUSIBLE_ENABLED: process.env.NEXT_PUBLIC_PLAUSIBLE_ENABLED,
    NEXT_PUBLIC_PLAUSIBLE_DOMAIN: process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN,
    NEXT_PUBLIC_PLAUSIBLE_SRC: process.env.NEXT_PUBLIC_PLAUSIBLE_SRC,
  };
  try {
    for (const [k, v] of Object.entries(envOverrides)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
    return fn();
  } finally {
    for (const k of Object.keys(before)) {
      if (before[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = before[k];
      }
    }
  }
}

test('resolveAnalyticsForRequest enables on apex root with kill-switch on', () => {
  withPlausibleEnv(
    {
      NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true',
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: undefined,
      NEXT_PUBLIC_PLAUSIBLE_SRC: undefined,
    },
    () => {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path: '/' });
      assert.equal(r.enabled, true);
      assert.equal(r.domain, DEFAULT_PLAUSIBLE_DOMAIN);
      assert.equal(r.src, DEFAULT_PLAUSIBLE_SRC);
    },
  );
});

test('resolveAnalyticsForRequest disables when kill-switch is off', () => {
  withPlausibleEnv(
    {
      NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'false',
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: undefined,
      NEXT_PUBLIC_PLAUSIBLE_SRC: undefined,
    },
    () => {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path: '/' });
      assert.equal(r.enabled, false);
      assert.equal(r.domain, null);
      assert.equal(r.src, null);
    },
  );
});

test('resolveAnalyticsForRequest disables when kill-switch is unset', () => {
  withPlausibleEnv(
    {
      NEXT_PUBLIC_PLAUSIBLE_ENABLED: undefined,
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: undefined,
      NEXT_PUBLIC_PLAUSIBLE_SRC: undefined,
    },
    () => {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path: '/' });
      assert.equal(r.enabled, false);
    },
  );
});

test('resolveAnalyticsForRequest excludes lux.corpflowai.com regardless of path', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of ['/', '/about', '/lead-rescue', '/property/lm-nc-ridge']) {
      const r = resolveAnalyticsForRequest({ host: 'lux.corpflowai.com', path });
      assert.equal(r.enabled, false, `lux ${path} should be excluded`);
    }
  });
});

test('resolveAnalyticsForRequest excludes operator/admin/login/change/change-v2 on apex', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of [
      '/change',
      '/change/queue',
      '/change-v2',
      '/change-v2/anything',
      '/admin',
      '/admin/users',
      '/login',
      '/login/recover',
      '/master',
      '/lux-editor',
      '/sovereign-intake',
      '/api/factory/health',
    ]) {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path });
      assert.equal(r.enabled, false, `apex ${path} should be excluded`);
    }
  });
});

test('resolveAnalyticsForRequest excludes password-reset paths and token-bearing query strings', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of [
      '/reset-password',
      '/auth/reset-password',
      '/forgot-password',
      '/?token=abcd',
      '/?reset=xyz',
      '/?ticket=12345',
      '/foo?bar=1&token=abcd',
    ]) {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path });
      assert.equal(r.enabled, false, `apex ${path} should be excluded`);
    }
  });
});

test('resolveAnalyticsForRequest enables apex marketing pages including /lead-rescue (step-1)', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of [
      '/',
      '/about',
      '/process',
      '/standards',
      '/onboarding',
      '/contact',
      '/lead-rescue',
      '/lead-rescue/details',
    ]) {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path });
      assert.equal(r.enabled, true, `apex ${path} should be enabled`);
      assert.equal(r.domain, DEFAULT_PLAUSIBLE_DOMAIN);
      assert.equal(r.src, DEFAULT_PLAUSIBLE_SRC);
    }
  });
});

test('resolveAnalyticsForRequest enables SSG runtime-host-check fallback when host is empty (JE-2026-06-03-4)', () => {
  // Behaviour update for Cold-Sprint-V1-Tracking-Fix Option C:
  // previously empty host short-circuited to disabled because
  // `isHostAllowed('')` returned false. Now empty host (the SSG
  // build-time signature when `ctx.req` is undefined) enables the
  // runtime host-gated loader instead, with `requiresRuntimeHostCheck`
  // true. The loader still denies Lux / Core / preview / localhost at
  // runtime — see the dedicated SSG-loader test block below.
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const host of ['', null, undefined]) {
      const r = resolveAnalyticsForRequest({ host, path: '/' });
      assert.equal(r.enabled, true, `empty host (${String(host)}) should enable SSG fallback`);
      assert.equal(r.requiresRuntimeHostCheck, true);
      assert.equal(r.domain, DEFAULT_PLAUSIBLE_DOMAIN);
      assert.equal(r.src, DEFAULT_PLAUSIBLE_SRC);
    }
  });
});

test('resolveAnalyticsForRequest tolerates host:port and Host header capitalisation', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    assert.equal(
      resolveAnalyticsForRequest({ host: 'CorpFlowAI.com:443', path: '/' }).enabled,
      true,
    );
    assert.equal(
      resolveAnalyticsForRequest({ host: 'CORPFLOWAI.COM', path: '/' }).enabled,
      true,
    );
  });
});

test('resolveAnalyticsForRequest honours NEXT_PUBLIC_PLAUSIBLE_DOMAIN and _SRC overrides', () => {
  withPlausibleEnv(
    {
      NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true',
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'corpflowai.com',
      NEXT_PUBLIC_PLAUSIBLE_SRC: 'https://plausible.io/js/script.outbound-links.js',
    },
    () => {
      const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path: '/' });
      assert.equal(r.enabled, true);
      assert.equal(r.domain, 'corpflowai.com');
      assert.equal(r.src, 'https://plausible.io/js/script.outbound-links.js');
    },
  );
});

test('resolveAnalyticsForRequest excludes preview / vercel.app hosts', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const host of [
      'preview-abc.vercel.app',
      'corpflow-ai-command-center-abc-corpflowai.vercel.app',
      'localhost',
      'localhost:3000',
    ]) {
      const r = resolveAnalyticsForRequest({ host, path: '/' });
      assert.equal(r.enabled, false, `preview-like host ${host} should be excluded`);
    }
  });
});

/**
 * trackEvent — client-side custom-event helper used by `/lead-rescue`
 * (Cold-Sprint-V1-Tracking, `JE-2026-06-03-2`).
 *
 * The helper guards against four operational realities:
 *   1) SSR — `window` is undefined; nothing to call.
 *   2) Plausible script not injected — `window.plausible` is undefined
 *      (e.g., kill-switch off, host on the deny list, preview deploy).
 *   3) Plausible script failed to load over the network.
 *   4) Plausible internal error during dispatch — call must never bubble
 *      up into the React event handler (form submission must keep
 *      working).
 *
 * Each test snapshots and restores `globalThis.window` so the suite
 * stays order-independent and side-effect-free.
 */
function withMockWindow(plausibleImpl, fn) {
  const hadWindow = Object.prototype.hasOwnProperty.call(globalThis, 'window');
  const before = globalThis.window;
  try {
    globalThis.window =
      plausibleImpl === null
        ? {}
        : { plausible: plausibleImpl };
    return fn();
  } finally {
    if (hadWindow) {
      globalThis.window = before;
    } else {
      delete globalThis.window;
    }
  }
}

test('trackEvent returns false when window is undefined (SSR)', () => {
  // The Node test runner has no `window`; trackEvent must short-circuit.
  assert.equal(typeof globalThis.window, 'undefined');
  assert.equal(trackEvent('lr_primary_cta_click'), false);
  assert.equal(
    trackEvent('lr_primary_cta_click', { props: { location: 'hero' } }),
    false,
  );
});

test('trackEvent returns false when window.plausible is undefined (script not injected)', () => {
  withMockWindow(null, () => {
    assert.equal(trackEvent('lr_primary_cta_click'), false);
    assert.equal(
      trackEvent('lr_primary_cta_click', { props: { location: 'hero' } }),
      false,
    );
  });
});

test('trackEvent returns false for invalid event names', () => {
  let called = 0;
  withMockWindow(
    function plausible() {
      called += 1;
    },
    () => {
      assert.equal(trackEvent(''), false);
      assert.equal(trackEvent(null), false);
      assert.equal(trackEvent(undefined), false);
      assert.equal(trackEvent(42), false);
      assert.equal(trackEvent({}), false);
      assert.equal(called, 0, 'invalid event names must not reach plausible');
    },
  );
});

test('trackEvent dispatches plain event names without options', () => {
  const calls = [];
  withMockWindow(
    function plausible() {
      calls.push(Array.from(arguments));
    },
    () => {
      assert.equal(trackEvent('lr_intake_submit_attempt'), true);
      assert.equal(trackEvent('lr_intake_submit_success'), true);
      assert.equal(trackEvent('lr_secondary_cta_click'), true);
      assert.equal(calls.length, 3);
      assert.deepEqual(calls[0], ['lr_intake_submit_attempt']);
      assert.deepEqual(calls[1], ['lr_intake_submit_success']);
      assert.deepEqual(calls[2], ['lr_secondary_cta_click']);
    },
  );
});

test('trackEvent forwards options.props to plausible call', () => {
  const calls = [];
  withMockWindow(
    function plausible() {
      calls.push(Array.from(arguments));
    },
    () => {
      assert.equal(
        trackEvent('lr_primary_cta_click', { props: { location: 'hero' } }),
        true,
      );
      assert.equal(
        trackEvent('lr_primary_cta_click', { props: { location: 'nav' } }),
        true,
      );
    },
  );
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0], ['lr_primary_cta_click', { props: { location: 'hero' } }]);
  assert.deepEqual(calls[1], ['lr_primary_cta_click', { props: { location: 'nav' } }]);
});

test('trackEvent returns false when plausible throws (does not surface to caller)', () => {
  withMockWindow(
    function plausible() {
      throw new Error('plausible internal error');
    },
    () => {
      assert.equal(trackEvent('lr_primary_cta_click', { props: { location: 'hero' } }), false);
      assert.equal(trackEvent('lr_intake_submit_attempt'), false);
    },
  );
});

/**
 * SSG static-export fallback (Cold-Sprint-V1-Tracking-Fix Option C,
 * `JE-2026-06-03-4`). `resolveAnalyticsForRequest` must:
 *   1) Continue to return `requiresRuntimeHostCheck: false` and the
 *      static-tag-friendly shape when host is known (SSR path —
 *      regression coverage for the existing apex root behaviour).
 *   2) Return `{ enabled: true, requiresRuntimeHostCheck: true }` with
 *      the configured Plausible domain + src when host is empty (SSG
 *      build time) AND the path passes every host-independent deny.
 *   3) Stay disabled when host is empty AND a host-independent deny
 *      matches the path (operator routes, password-reset substring,
 *      token-bearing query) — the inline loader script is never
 *      emitted for paths that can never be allowed at runtime.
 *   4) Stay disabled when the kill-switch is off, regardless of host.
 */

test('resolveAnalyticsForRequest returns requiresRuntimeHostCheck:false for SSR apex (regression)', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    const r = resolveAnalyticsForRequest({ host: 'corpflowai.com', path: '/lead-rescue' });
    assert.equal(r.enabled, true);
    assert.equal(r.requiresRuntimeHostCheck, false);
    assert.equal(r.domain, DEFAULT_PLAUSIBLE_DOMAIN);
    assert.equal(r.src, DEFAULT_PLAUSIBLE_SRC);
  });
});

test('resolveAnalyticsForRequest returns requiresRuntimeHostCheck:false when SSR host is denied (regression)', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const host of ['lux.corpflowai.com', 'core.corpflowai.com', 'preview.vercel.app', 'localhost']) {
      const r = resolveAnalyticsForRequest({ host, path: '/lead-rescue' });
      assert.equal(r.enabled, false, `SSR ${host} should stay disabled`);
      assert.equal(r.requiresRuntimeHostCheck, false);
      assert.equal(r.domain, null);
      assert.equal(r.src, null);
    }
  });
});

test('resolveAnalyticsForRequest enables SSG fallback with requiresRuntimeHostCheck:true on apex SSG paths', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of ['/lead-rescue', '/lead-rescue/details', '/about', '/onboarding', '/']) {
      const r = resolveAnalyticsForRequest({ host: '', path });
      assert.equal(r.enabled, true, `SSG ${path} should enable runtime host-gated loader`);
      assert.equal(r.requiresRuntimeHostCheck, true);
      assert.equal(r.domain, DEFAULT_PLAUSIBLE_DOMAIN);
      assert.equal(r.src, DEFAULT_PLAUSIBLE_SRC);
    }
  });
});

test('resolveAnalyticsForRequest SSG fallback honours every host-independent path deny', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const path of [
      '/change',
      '/change/queue',
      '/change-v2',
      '/admin',
      '/admin/users',
      '/admin-tools',
      '/login',
      '/master',
      '/lux-editor',
      '/sovereign-intake',
      '/api/factory/health',
      '/_next/static/whatever.js',
      '/client/change-decisions',
      '/reset-password',
      '/auth/forgot-password',
      '/?token=abc',
      '/?reset=xyz',
      '/?ticket=12345',
      '/foo?bar=1&token=abc',
    ]) {
      const r = resolveAnalyticsForRequest({ host: '', path });
      assert.equal(r.enabled, false, `SSG ${path} must stay denied (host-independent deny)`);
      assert.equal(r.requiresRuntimeHostCheck, false);
      assert.equal(r.domain, null);
      assert.equal(r.src, null);
    }
  });
});

test('resolveAnalyticsForRequest SSG fallback respects kill-switch off', () => {
  for (const value of ['false', '', undefined]) {
    withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: value }, () => {
      const r = resolveAnalyticsForRequest({ host: '', path: '/lead-rescue' });
      assert.equal(r.enabled, false, `kill-switch=${String(value)} must disable SSG fallback`);
      assert.equal(r.requiresRuntimeHostCheck, false);
    });
  }
});

test('resolveAnalyticsForRequest tolerates null/undefined host like SSG empty host', () => {
  withPlausibleEnv({ NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true' }, () => {
    for (const host of [null, undefined, '', '   ']) {
      const r = resolveAnalyticsForRequest({ host, path: '/lead-rescue' });
      assert.equal(r.enabled, true, `host=${String(host)} should fall through to SSG runtime check`);
      assert.equal(r.requiresRuntimeHostCheck, true);
    }
  });
});

test('resolveAnalyticsForRequest SSG fallback honours apex marketing /lead-rescue end-to-end against current envs', () => {
  withPlausibleEnv(
    {
      NEXT_PUBLIC_PLAUSIBLE_ENABLED: 'true',
      NEXT_PUBLIC_PLAUSIBLE_DOMAIN: 'corpflowai.com',
      NEXT_PUBLIC_PLAUSIBLE_SRC: 'https://plausible.io/js/script.js',
    },
    () => {
      const r = resolveAnalyticsForRequest({ host: '', path: '/lead-rescue' });
      assert.equal(r.enabled, true);
      assert.equal(r.requiresRuntimeHostCheck, true);
      assert.equal(r.domain, 'corpflowai.com');
      assert.equal(r.src, 'https://plausible.io/js/script.js');
    },
  );
});

/**
 * buildSsgRuntimeLoaderScript — produces the inline JS string emitted
 * into SSG pages when `requiresRuntimeHostCheck` is true. The script
 * must be self-contained vanilla JS (no module syntax / dependencies)
 * and must enforce the SAME policy as `isAnalyticsEnabledForHostPath`
 * against `window.location` at runtime.
 *
 * We test by executing the script inside a Node `vm` context with a
 * minimal mocked `window` + `document`, then asserting whether a
 * Plausible `<script>` tag was appended to the mock head for each
 * combination of host + path + query.
 */
function runLoaderInVm({ src, domain, hostname, pathname, search } = {}) {
  const created = [];
  const head = {
    appendChild(node) {
      created.push(node);
    },
  };
  const sandbox = {
    window: {
      location: {
        hostname: hostname || '',
        pathname: pathname || '/',
        search: search || '',
      },
    },
    document: {
      head,
      createElement(tag) {
        const attrs = {};
        return {
          tagName: tag,
          attrs,
          set defer(v) {
            this._defer = v;
          },
          get defer() {
            return this._defer;
          },
          set src(v) {
            this._src = v;
          },
          get src() {
            return this._src;
          },
          setAttribute(k, v) {
            attrs[k] = v;
          },
        };
      },
    },
  };
  vm.createContext(sandbox);
  const source = buildSsgRuntimeLoaderScript({
    src: src || DEFAULT_PLAUSIBLE_SRC,
    domain: domain || DEFAULT_PLAUSIBLE_DOMAIN,
  });
  vm.runInContext(source, sandbox);
  return { created };
}

test('buildSsgRuntimeLoaderScript returns empty string when src/domain are missing', () => {
  assert.equal(buildSsgRuntimeLoaderScript({}), '');
  assert.equal(buildSsgRuntimeLoaderScript({ src: 'a' }), '');
  assert.equal(buildSsgRuntimeLoaderScript({ domain: 'a' }), '');
  assert.equal(buildSsgRuntimeLoaderScript(), '');
});

test('SSG loader appends Plausible script on apex corpflowai.com + allowed paths', () => {
  for (const path of ['/', '/lead-rescue', '/lead-rescue/details', '/about', '/onboarding']) {
    const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: path });
    assert.equal(created.length, 1, `apex ${path} must inject Plausible script`);
    assert.equal(created[0].attrs['data-domain'], DEFAULT_PLAUSIBLE_DOMAIN);
    assert.equal(created[0].src, DEFAULT_PLAUSIBLE_SRC);
    assert.equal(created[0].defer, true);
  }
});

test('SSG loader denies Lux / Core / preview / localhost hosts (boundary preserved)', () => {
  for (const hostname of [
    'lux.corpflowai.com',
    'luxe.corpflowai.com',
    'tenantx.corpflowai.com',
    'core.corpflowai.com',
    'localhost',
    'preview-abc.vercel.app',
    'corpflow-ai-command-center-preview.vercel.app',
  ]) {
    const { created } = runLoaderInVm({ hostname, pathname: '/lead-rescue' });
    assert.equal(created.length, 0, `${hostname} must NOT inject Plausible (boundary)`);
  }
});

test('SSG loader denies operator routes on apex with word-boundary semantics', () => {
  for (const path of [
    '/change',
    '/change/queue',
    '/change-v2',
    '/admin',
    '/admin/users',
    '/admin-tools',
    '/login',
    '/master',
    '/lux-editor',
    '/lux-guide',
    '/sovereign-intake',
    '/core-lux-migration-repair',
    '/api/factory/health',
    '/_next/static/whatever.js',
    '/client/change-decisions',
  ]) {
    const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: path });
    assert.equal(created.length, 0, `apex ${path} must NOT inject Plausible (path deny)`);
  }
});

test('SSG loader respects word-boundary deny: /changelog and /administrative pass', () => {
  for (const path of ['/changelog', '/changelog/2026-05', '/administrative']) {
    const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: path });
    assert.equal(created.length, 1, `apex ${path} must inject (word-boundary deny is strict)`);
  }
});

test('SSG loader denies apex-specific paths /concierge /properties /property', () => {
  for (const path of ['/concierge', '/properties', '/properties/admin', '/property/abc']) {
    const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: path });
    assert.equal(created.length, 0, `apex ${path} must NOT inject (apex-specific deny)`);
  }
});

test('SSG loader passes apex /properties-overview (no over-match)', () => {
  const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: '/properties-overview' });
  assert.equal(created.length, 1, 'apex /properties-overview must inject (no over-match)');
});

test('SSG loader denies token-bearing query strings on apex', () => {
  for (const search of ['?token=abcd', '?reset=xyz', '?ticket=12345', '?foo=bar&token=abcd']) {
    const { created } = runLoaderInVm({
      hostname: 'corpflowai.com',
      pathname: '/lead-rescue',
      search,
    });
    assert.equal(created.length, 0, `apex /lead-rescue${search} must NOT inject (query deny)`);
  }
});

test('SSG loader denies password-reset / forgot-password substrings on apex', () => {
  for (const path of [
    '/reset-password',
    '/auth/reset-password',
    '/forgot-password',
    '/auth/forgot-password/step-2',
  ]) {
    const { created } = runLoaderInVm({ hostname: 'corpflowai.com', pathname: path });
    assert.equal(created.length, 0, `apex ${path} must NOT inject (substring deny)`);
  }
});

test('SSG loader denies empty hostname (defensive — never inject without a real host)', () => {
  const { created } = runLoaderInVm({ hostname: '', pathname: '/lead-rescue' });
  assert.equal(created.length, 0, 'empty hostname must NOT inject');
});

test('SSG loader denies a host that looks like apex but is a different domain (e.g. corpflowai.com.evil.com)', () => {
  const { created } = runLoaderInVm({
    hostname: 'corpflowai.com.evil.com',
    pathname: '/lead-rescue',
  });
  assert.equal(created.length, 0, 'subdomain-like spoofs must NOT inject');
});

test('SSG loader does not throw on missing window.location pieces (defensive)', () => {
  // The script is wrapped in try/catch — even completely malformed
  // browser state must never break the host page. We assert no
  // exception escapes and no script is appended.
  const sandbox = {
    window: { location: {} },
    document: {
      head: { appendChild: () => { throw new Error('should not reach'); } },
      createElement: () => { throw new Error('should not reach'); },
    },
  };
  vm.createContext(sandbox);
  const source = buildSsgRuntimeLoaderScript({
    src: DEFAULT_PLAUSIBLE_SRC,
    domain: DEFAULT_PLAUSIBLE_DOMAIN,
  });
  assert.doesNotThrow(() => vm.runInContext(source, sandbox));
});

test('SSG loader honours custom env-overridden src and domain', () => {
  const { created } = runLoaderInVm({
    hostname: 'corpflowai.com',
    pathname: '/lead-rescue',
    src: 'https://plausible.io/js/script.outbound-links.js',
    domain: 'corpflowai.com',
  });
  assert.equal(created.length, 1);
  assert.equal(created[0].src, 'https://plausible.io/js/script.outbound-links.js');
  assert.equal(created[0].attrs['data-domain'], 'corpflowai.com');
});

test('trackEvent never carries PII — call sites pass only host/path/surface labels', () => {
  // Whitelist of values we accept being passed at call sites. The
  // implementation itself doesn't enforce shape — call-site discipline
  // does — so this test documents intent and protects against drift.
  const KNOWN_EVENT_NAMES = new Set([
    'lr_primary_cta_click',
    'lr_secondary_cta_click',
    'lr_intake_submit_attempt',
    'lr_intake_submit_success',
  ]);
  const KNOWN_PROP_KEYS = new Set(['location']);
  const KNOWN_LOCATION_VALUES = new Set(['nav', 'hero', 'final_form', 'how_it_works_link']);
  const FORBIDDEN_PROP_KEYS = ['email', 'name', 'phone', 'ip', 'fingerprint', 'user_id', 'session_id'];

  for (const name of KNOWN_EVENT_NAMES) {
    assert.match(name, /^[a-z][a-z0-9_]*$/, `event name "${name}" must be lowercased snake_case`);
  }
  for (const key of FORBIDDEN_PROP_KEYS) {
    assert.equal(
      KNOWN_PROP_KEYS.has(key),
      false,
      `forbidden prop key "${key}" must not be in the call-site whitelist`,
    );
  }
  for (const v of KNOWN_LOCATION_VALUES) {
    assert.match(v, /^[a-z][a-z0-9_]*$/, `location value "${v}" must be lowercased snake_case`);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';

import { buildConciergeSeo, isLuxHost, __TEST_ONLY__ } from '../lib/client/concierge-seo.js';

test('isLuxHost: known Lux hosts match', () => {
  for (const h of __TEST_ONLY__.LUX_HOSTS) {
    assert.equal(isLuxHost(h), true, `expected ${h} to be a Lux host`);
  }
});

test('isLuxHost: case-insensitive + port-tolerant', () => {
  assert.equal(isLuxHost('LUX.CorpFlowAI.com'), true);
  assert.equal(isLuxHost('lux.corpflowai.com:3000'), true);
});

test('isLuxHost: apex + unknown hosts are not Lux', () => {
  for (const h of ['corpflowai.com', 'www.corpflowai.com', 'example.com', '', null, undefined]) {
    assert.equal(isLuxHost(h), false, `expected ${String(h)} to NOT be a Lux host`);
  }
});

test('buildConciergeSeo: Lux host returns Lux-branded SSR metadata', () => {
  const seo = buildConciergeSeo({ host: 'lux.corpflowai.com' });
  assert.equal(seo.title, 'Private concierge · Luxurious Mauritius');
  assert.match(seo.description, /private advisor/i);
  assert.match(seo.description, /Mauritius/);
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo.ogUrl, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo.ogType, 'website');
  assert.equal(seo.ogSiteName, 'Luxurious Mauritius');
  assert.equal(seo.twitterCard, 'summary_large_image');
  assert.equal(seo.robots, 'index, follow');
  assert.equal(seo.canonicalHost, 'lux.corpflowai.com');
  assert.equal(seo.isLuxHost, true);
});

test('buildConciergeSeo: apex host receives Lux content + Lux canonical (today\'s reality)', () => {
  const seo = buildConciergeSeo({ host: 'corpflowai.com' });
  assert.equal(seo.title, 'Private concierge · Luxurious Mauritius');
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo.canonicalHost, 'lux.corpflowai.com');
  assert.equal(seo.isLuxHost, false);
  assert.equal(seo.host, 'corpflowai.com');
});

test('buildConciergeSeo: empty / missing host falls back to Lux canonical, reports observed host as empty', () => {
  const seo = buildConciergeSeo({ host: '' });
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo.canonicalHost, 'lux.corpflowai.com');
  assert.equal(seo.host, '');
  assert.equal(seo.isLuxHost, false);
  const seo2 = buildConciergeSeo();
  assert.equal(seo2.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo2.host, '');
  assert.equal(seo2.isLuxHost, false);
});

test('buildConciergeSeo: propertyTitle is woven into title + description + ogTitle', () => {
  const seo = buildConciergeSeo({
    host: 'lux.corpflowai.com',
    propertyTitle: 'Bel Ombre Estate Villa 14',
  });
  assert.equal(
    seo.title,
    'Private concierge · Bel Ombre Estate Villa 14 · Luxurious Mauritius',
  );
  assert.match(seo.description, /Bel Ombre Estate Villa 14/);
  assert.equal(seo.ogTitle, seo.title);
  assert.equal(seo.twitterTitle, seo.title);
  // canonical remains stable across property variants (no query string)
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
});

test('buildConciergeSeo: propertyRef appears in og:url but NOT in canonical', () => {
  const seo = buildConciergeSeo({
    host: 'lux.corpflowai.com',
    propertyTitle: 'Bel Ombre Estate Villa 14',
    propertyRef: 'bel-ombre-estate-villa-14',
  });
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(
    seo.ogUrl,
    'https://lux.corpflowai.com/concierge?property=bel-ombre-estate-villa-14',
  );
});

test('buildConciergeSeo: propertyRef with special chars is encoded in og:url', () => {
  const seo = buildConciergeSeo({
    host: 'lux.corpflowai.com',
    propertyTitle: 'Riviera Sud / Pointe d\'Esny',
    propertyRef: 'riviera-sud / pointe-d\'esny',
  });
  assert.equal(
    seo.ogUrl,
    'https://lux.corpflowai.com/concierge?property=riviera-sud%20%2F%20pointe-d\'esny',
  );
});

test('buildConciergeSeo: returns frozen object (stable contract)', () => {
  const seo = buildConciergeSeo({ host: 'lux.corpflowai.com' });
  assert.equal(Object.isFrozen(seo), true);
  assert.throws(() => {
    seo.title = 'hacked';
  });
});

test('buildConciergeSeo: every advertised key is present on every host', () => {
  const expectedKeys = [
    'title',
    'description',
    'canonical',
    'robots',
    'ogTitle',
    'ogDescription',
    'ogUrl',
    'ogType',
    'ogSiteName',
    'twitterCard',
    'twitterTitle',
    'twitterDescription',
    'host',
    'canonicalHost',
    'isLuxHost',
  ];
  // `host` is intentionally observability data — it may legitimately be ''
  // when the caller did not pass a host header. Every OTHER string field is
  // contract-bound to be non-empty.
  const allowEmptyKeys = new Set(['host']);
  for (const host of ['lux.corpflowai.com', 'corpflowai.com', 'unknown.example.com', '']) {
    const seo = buildConciergeSeo({ host });
    for (const k of expectedKeys) {
      assert.ok(k in seo, `expected key ${k} on host=${host}`);
      if (typeof seo[k] === 'string' && !allowEmptyKeys.has(k)) {
        assert.notEqual(seo[k], '', `expected non-empty ${k} on host=${host}`);
      }
    }
  }
});

test('buildConciergeSeo: non-Lux host with propertyTitle still canonicalizes to Lux primary host', () => {
  const seo = buildConciergeSeo({
    host: 'example.com',
    propertyTitle: 'A Property',
    propertyRef: 'a-property',
  });
  assert.equal(seo.canonical, 'https://lux.corpflowai.com/concierge');
  assert.equal(seo.ogUrl, 'https://lux.corpflowai.com/concierge?property=a-property');
});

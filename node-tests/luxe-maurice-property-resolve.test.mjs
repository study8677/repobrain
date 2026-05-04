import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';

test('resolveLuxPropertyRef distinguishes curated vs feed', () => {
  const c = resolveLuxPropertyRef('lm-nc-ridge');
  assert.ok(c);
  assert.equal(c?.discovery_source, 'curated');
  assert.equal(c?.ref, 'lm-nc-ridge');
  assert.equal(c?.listing_provider, 'curated_staged');

  const f = resolveLuxPropertyRef('lxf-grand-baie-apt');
  assert.ok(f);
  assert.equal(f?.discovery_source, 'feed');
  assert.equal(f?.ref, 'lxf-grand-baie-apt');
  assert.equal(f?.listing_provider, 'mock_feed_v1');
  assert.ok(f?.price_range);
});

test('resolveLuxPropertyRef rejects unknown and pathological input', () => {
  assert.equal(resolveLuxPropertyRef('not-a-listing'), null);
  assert.equal(resolveLuxPropertyRef('../../../x'), null);
  assert.equal(resolveLuxPropertyRef(''), null);
});

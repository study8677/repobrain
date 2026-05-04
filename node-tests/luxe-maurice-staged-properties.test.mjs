import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findLuxStagedPropertyBySlug,
  isLuxStagedPropertySlug,
  LUXE_MAURICE_STAGED_PROPERTIES,
} from '../lib/client/luxe-maurice-staged-properties.js';

test('staged slugs are stable and discoverable', () => {
  assert.ok(LUXE_MAURICE_STAGED_PROPERTIES.length >= 3);
  assert.ok(isLuxStagedPropertySlug('lm-nc-ridge'));
  assert.equal(isLuxStagedPropertySlug('../../../etc/passwd'), false);
  const hit = findLuxStagedPropertyBySlug('lm-villa-belombre');
  assert.ok(hit);
  assert.equal(hit?.title.includes('Bel Ombre'), true);
});

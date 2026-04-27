import assert from 'node:assert/strict';
import test from 'node:test';

import { ENSURE_SCHEMA_STATEMENTS } from '../lib/server/postgres-ensure-schema-statements.js';

test('ensure-schema statements: additive-only guard', () => {
  assert.ok(Array.isArray(ENSURE_SCHEMA_STATEMENTS));
  assert.ok(ENSURE_SCHEMA_STATEMENTS.length > 0);
  for (let i = 0; i < ENSURE_SCHEMA_STATEMENTS.length; i++) {
    const s = String(ENSURE_SCHEMA_STATEMENTS[i] || '').trim().toLowerCase();
    assert.ok(s.length > 0, `empty statement at index ${i}`);
    assert.ok(!s.startsWith('drop '), `statement ${i} must not start with DROP`);
    assert.ok(!s.startsWith('truncate'), `statement ${i} must not start with TRUNCATE`);
  }
});

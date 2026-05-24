import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const SCRIPT_PATH = new URL('../scripts/diagnose-vercel-postgres-env.mjs', import.meta.url);

// The script runs `await main()` at module scope, which would call the Vercel API.
// Re-extract the helper functions by sourcing the file as text and evaluating only
// the safe parts (helpers without process.env or fetch).
async function loadHelpers() {
  const src = await readFile(SCRIPT_PATH, 'utf8');
  const m1 = src.match(/const DB_KEY_PATTERNS = \[[\s\S]*?\];/);
  const m2 = src.match(/function isDbKey\(name\) \{[\s\S]*?\n\}/);
  const m3 = src.match(/function tagValueShape\(value\) \{[\s\S]*?\n\}/);
  if (!m1 || !m2 || !m3) {
    throw new Error('script structure changed; update test extractor');
  }
  const moduleSrc = `${m1[0]}\n${m2[0]}\n${m3[0]}\nexport { isDbKey, tagValueShape, DB_KEY_PATTERNS };`;
  const { isDbKey, tagValueShape, DB_KEY_PATTERNS } = await import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(moduleSrc)}`
  );
  return { isDbKey, tagValueShape, DB_KEY_PATTERNS };
}

describe('diagnose-vercel-postgres-env / isDbKey', () => {
  it('matches every documented canonical key', async () => {
    const { isDbKey } = await loadHelpers();
    for (const k of [
      'POSTGRES_URL',
      'DATABASE_URL',
      'PRISMA_DATABASE_URL',
      'POSTGRES_PRISMA_URL',
      'DIRECT_URL',
      'POSTGRES_URL_NON_POOLING',
    ]) {
      assert.equal(isDbKey(k), true, `expected ${k} to match`);
    }
  });

  it('matches the documented unpooled aliases', async () => {
    const { isDbKey } = await loadHelpers();
    assert.equal(isDbKey('DATABASE_URL_UNPOOLED'), true);
    assert.equal(isDbKey('POSTGRES_URL_UNPOOLED'), true);
    assert.equal(isDbKey('PRISMA_DATABASE_URL_UNPOOLED'), true);
    assert.equal(isDbKey('POSTGRES_PRISMA_URL_NON_POOLING'), true);
  });

  it('rejects unrelated keys', async () => {
    const { isDbKey } = await loadHelpers();
    for (const k of ['POSTGRES_URL_FOO', 'NEXT_PUBLIC_API', 'GROQ_API_KEY', '']) {
      assert.equal(isDbKey(k), false, `expected ${k} to NOT match`);
    }
  });
});

describe('diagnose-vercel-postgres-env / tagValueShape', () => {
  it('flags Prisma Accelerate prisma:// protocol', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape('prisma://accelerate.prisma-data.net/?api_key=xxxxx');
    assert.equal(r.value_present_nonempty, true);
    assert.equal(r.value_starts_with_prisma_proto, true);
  });

  it('flags db.prisma.io hostname even when the protocol is postgresql://', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape('postgresql://user:secret@db.prisma.io:5432/database');
    assert.equal(r.value_starts_with_prisma_proto, false);
    assert.equal(r.value_host_contains_prisma_io, true);
    assert.equal(r.value_host_contains_neon_tech, false);
  });

  it('flags Neon pooled hostname', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape(
      'postgresql://user:secret@ep-foo-bar-pooler.us-east-1.aws.neon.tech:5432/db?sslmode=require'
    );
    assert.equal(r.value_host_contains_neon_tech, true);
    assert.equal(r.value_host_contains_pooler, true);
    assert.equal(r.value_host_contains_prisma_io, false);
  });

  it('flags Neon non-pooled hostname', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape(
      'postgresql://user:secret@ep-foo-bar.us-east-1.aws.neon.tech:5432/db?sslmode=require'
    );
    assert.equal(r.value_host_contains_neon_tech, true);
    assert.equal(r.value_host_contains_pooler, false);
  });

  it('returns false on empty / whitespace value', async () => {
    const { tagValueShape } = await loadHelpers();
    assert.equal(tagValueShape('').value_present_nonempty, false);
    assert.equal(tagValueShape('   ').value_present_nonempty, false);
  });

  it('returns null when value is missing entirely', async () => {
    const { tagValueShape } = await loadHelpers();
    assert.equal(tagValueShape(null), null);
    assert.equal(tagValueShape(undefined), null);
  });

  it('does NOT include the original value or hostname text in the result', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape('postgresql://user:secret@db.prisma.io:5432/database');
    const json = JSON.stringify(r);
    assert.ok(!json.includes('secret'), 'must not leak password');
    assert.ok(!json.includes('user:'), 'must not leak userinfo');
    assert.ok(!json.includes('db.prisma.io'), 'must not leak host literal');
  });
});

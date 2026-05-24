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
  const mScheme = src.match(/function detectScheme\(v\) \{[\s\S]*?\n\}/);
  const mClass = src.match(/function classifyFirstChar\(v\) \{[\s\S]*?\n\}/);
  const m3 = src.match(/function tagValueShape\(value\) \{[\s\S]*?\n\}/);
  if (!m1 || !m2 || !mScheme || !mClass || !m3) {
    throw new Error('script structure changed; update test extractor');
  }
  const moduleSrc = `${m1[0]}\n${m2[0]}\n${mScheme[0]}\n${mClass[0]}\n${m3[0]}\nexport { isDbKey, tagValueShape, DB_KEY_PATTERNS, detectScheme, classifyFirstChar };`;
  const { isDbKey, tagValueShape, DB_KEY_PATTERNS, detectScheme, classifyFirstChar } = await import(
    `data:text/javascript;charset=utf-8,${encodeURIComponent(moduleSrc)}`
  );
  return { isDbKey, tagValueShape, DB_KEY_PATTERNS, detectScheme, classifyFirstChar };
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

  it('flags Prisma Postgres marketplace prisma+postgres:// scheme', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape(
      'prisma+postgres://accelerate.prisma-data.net/?api_key=zzzz'
    );
    assert.equal(r.value_scheme, 'prisma+postgres');
    assert.equal(r.value_scheme_indicates_prisma_proxy, true);
    assert.equal(r.value_scheme_is_neon_safe, false);
    assert.equal(r.value_anywhere_prisma_data, true);
  });

  it('substring scan catches db.prisma.io even when hostname regex misses', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape(
      'something://??connection?fallback=db.prisma.io:5432&u=x'
    );
    assert.equal(r.value_anywhere_db_prisma_io, true);
    assert.equal(r.value_anywhere_prisma_io, true);
  });

  it('marks plain postgresql + Neon URLs as neon-safe with no prisma flags', async () => {
    const { tagValueShape } = await loadHelpers();
    const r = tagValueShape(
      'postgresql://user:secret@ep-foo-pooler.us-east-1.aws.neon.tech:5432/db?sslmode=require'
    );
    assert.equal(r.value_scheme, 'postgresql');
    assert.equal(r.value_scheme_is_neon_safe, true);
    assert.equal(r.value_scheme_indicates_prisma_proxy, false);
    assert.equal(r.value_anywhere_neon_tech, true);
    assert.equal(r.value_anywhere_prisma_io, false);
    assert.equal(r.value_anywhere_prisma_data, false);
  });
});

describe('diagnose-vercel-postgres-env / classifyFirstChar', () => {
  it('flags Vercel @ref placeholder', async () => {
    const { classifyFirstChar, tagValueShape } = await loadHelpers();
    assert.equal(classifyFirstChar('@my-secret-name'), 'at_ref');
    assert.equal(tagValueShape('@my-secret-name').value_first_char_class, 'at_ref');
  });

  it('flags shell-style $REF', async () => {
    const { classifyFirstChar } = await loadHelpers();
    assert.equal(classifyFirstChar('$DB_REF'), 'dollar_ref');
  });

  it('classifies normal URI scheme starts as letter', async () => {
    const { classifyFirstChar } = await loadHelpers();
    assert.equal(classifyFirstChar('postgresql://x'), 'letter');
  });

  it('reports value_length_bucket', async () => {
    const { tagValueShape } = await loadHelpers();
    assert.equal(tagValueShape('x').value_length_bucket, 'tiny');
    assert.equal(tagValueShape('x'.repeat(60)).value_length_bucket, 'short');
    assert.equal(tagValueShape('x'.repeat(120)).value_length_bucket, 'normal');
  });
});

describe('diagnose-vercel-postgres-env / detectScheme', () => {
  it('detects standard schemes', async () => {
    const { detectScheme } = await loadHelpers();
    assert.equal(detectScheme('postgres://x'), 'postgres');
    assert.equal(detectScheme('postgresql://x'), 'postgresql');
    assert.equal(detectScheme('prisma://x'), 'prisma');
    assert.equal(detectScheme('prisma+postgres://x'), 'prisma+postgres');
  });

  it('returns null for invalid input', async () => {
    const { detectScheme } = await loadHelpers();
    assert.equal(detectScheme(''), null);
    assert.equal(detectScheme('://nohost'), null);
  });
});

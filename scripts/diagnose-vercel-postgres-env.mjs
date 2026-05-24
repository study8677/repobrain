#!/usr/bin/env node
/**
 * Diagnose Vercel Production Postgres env configuration without printing secret values.
 *
 * Calls the Vercel REST API with `VERCEL_TOKEN` (read-only scope sufficient) and lists
 * the **names** of every env var matching DB-related patterns, plus per-var booleans:
 *
 *   - exists       — env var present in Production target
 *   - is_sensitive — Vercel "Sensitive" type (true if value cannot be read back)
 *   - decryptable  — value can be read by this token (false if Sensitive or RBAC)
 *   - value_present_nonempty — boolean only (no value)
 *   - value_starts_with_prisma_proto — strict boolean: starts with `prisma://`
 *   - value_host_contains_prisma_io — strict boolean: hostname contains `prisma.io`
 *   - value_host_contains_neon_tech — strict boolean: hostname contains `neon.tech`
 *   - value_host_contains_pooler    — strict boolean: hostname contains `-pooler.`
 *
 * NEVER prints the value, the host, the username, or any URL substring beyond the
 * boolean checks above.
 *
 * Usage:
 *   VERCEL_TOKEN=… VERCEL_PROJECT_ID=… VERCEL_TEAM_ID=… node scripts/diagnose-vercel-postgres-env.mjs
 *
 * Cross-reference: docs/operations/POSTGRES_PROVIDER.md §1 (six canonical env keys).
 */

const TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const TEAM_ID = process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID || '';

const DB_KEY_PATTERNS = [
  /^POSTGRES_URL$/,
  /^DATABASE_URL$/,
  /^PRISMA_DATABASE_URL$/,
  /^POSTGRES_PRISMA_URL$/,
  /^DIRECT_URL$/,
  /^POSTGRES_URL_NON_POOLING$/,
  /^DATABASE_URL_UNPOOLED$/,
  /^POSTGRES_URL_UNPOOLED$/,
  /^PRISMA_DATABASE_URL_UNPOOLED$/,
  /^POSTGRES_PRISMA_URL_NON_POOLING$/,
  /^NEON_DATABASE_URL$/,
];

function isDbKey(name) {
  return DB_KEY_PATTERNS.some((re) => re.test(String(name || '')));
}

function tagValueShape(value) {
  if (value == null) return null;
  const v = String(value);
  if (!v.trim()) return { value_present_nonempty: false };
  let host = '';
  try {
    const m = /^(?:postgres(?:ql)?|prisma):\/\/[^@]*@?([^:/?#]*)/i.exec(v);
    if (m) host = m[1] || '';
  } catch {
    host = '';
  }
  return {
    value_present_nonempty: true,
    value_starts_with_prisma_proto: /^prisma:\/\//i.test(v),
    value_host_contains_prisma_io: /\bprisma\.io\b/i.test(host),
    value_host_contains_neon_tech: /\bneon\.tech\b/i.test(host),
    value_host_contains_pooler: /-pooler\./i.test(host),
  };
}

async function fetchJSON(url, init = {}) {
  const r = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    /* tolerate */
  }
  if (!r.ok) {
    const msg = json && json.error ? json.error.message || json.error.code : `HTTP ${r.status}`;
    throw new Error(`Vercel API ${url}: ${msg}`);
  }
  return json;
}

async function main() {
  if (!TOKEN || !PROJECT_ID) {
    console.error('Missing VERCEL_TOKEN and/or VERCEL_PROJECT_ID env.');
    process.exit(2);
  }
  const teamQS = TEAM_ID ? `&teamId=${encodeURIComponent(TEAM_ID)}` : '';
  const listUrl = `https://api.vercel.com/v9/projects/${encodeURIComponent(PROJECT_ID)}/env?decrypt=true${teamQS}`;
  const list = await fetchJSON(listUrl);
  const envs = Array.isArray(list?.envs) ? list.envs : [];
  // Filter to DB keys + Production target
  const rows = [];
  for (const e of envs) {
    const key = String(e?.key || '');
    if (!isDbKey(key)) continue;
    const targets = Array.isArray(e?.target) ? e.target : [];
    if (!targets.includes('production')) continue;
    const isSensitive = String(e?.type || '').toLowerCase() === 'sensitive';
    const decryptable = !isSensitive && Object.prototype.hasOwnProperty.call(e, 'value');
    const shape = decryptable ? tagValueShape(e.value) : null;
    rows.push({
      key,
      exists: true,
      is_sensitive: isSensitive,
      decryptable,
      created_at: e?.createdAt ? new Date(e.createdAt).toISOString() : null,
      updated_at: e?.updatedAt ? new Date(e.updatedAt).toISOString() : null,
      ...(shape || {}),
    });
  }
  rows.sort((a, b) => a.key.localeCompare(b.key));

  // Aggregate verdict
  const anyPrismaProto = rows.some((r) => r.value_starts_with_prisma_proto === true);
  const anyPrismaIoHost = rows.some((r) => r.value_host_contains_prisma_io === true);
  const allDecryptedAreNeon = rows
    .filter((r) => r.decryptable === true)
    .every(
      (r) => r.value_host_contains_neon_tech === true && r.value_host_contains_prisma_io !== true
    );
  const sensitiveCount = rows.filter((r) => r.is_sensitive === true).length;

  const report = {
    schema: 'corpflow.diagnose_vercel_postgres_env.v1',
    generated_at: new Date().toISOString(),
    project_id: PROJECT_ID,
    team_scoped: Boolean(TEAM_ID),
    rows,
    summary: {
      db_var_count: rows.length,
      sensitive_count: sensitiveCount,
      any_prisma_proto: anyPrismaProto,
      any_prisma_io_host: anyPrismaIoHost,
      all_decrypted_are_neon: allDecryptedAreNeon,
      verdict:
        anyPrismaProto || anyPrismaIoHost
          ? 'DRIFT — at least one DB env references Prisma protocol or db.prisma.io'
          : sensitiveCount === rows.length && rows.length > 0
            ? 'INDETERMINATE — all DB envs are Sensitive (values not readable). Inspect via Vercel UI.'
            : allDecryptedAreNeon && rows.length > 0
              ? 'CLEAN — every readable DB env points at neon.tech'
              : 'NOTHING_FOUND — no DB env vars matched on Production target',
    },
  };
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

main().catch((err) => {
  console.error(`diagnose-vercel-postgres-env failed: ${err && err.message ? err.message : err}`);
  process.exit(1);
});

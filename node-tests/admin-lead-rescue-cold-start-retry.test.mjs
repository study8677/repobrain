/**
 * Regression tests for the Prisma cold-start retry behaviour on the
 * AI Lead Rescue admin paths.
 *
 * Background (2026-06-07):
 *   PR #324 fixed the missing Prisma query engine binary in the Vercel
 *   serverless function bundle. After that, the live operator-visible bug
 *   was a different (related) class of error coming from the engine's
 *   first-query lifecycle on cold-start:
 *
 *     Invalid `prisma.lead.findUnique()` invocation:
 *     Engine is not yet connected.
 *
 *     Invalid `prisma.lead.update()` invocation:
 *     Response from the Engine was empty.
 *
 *   Anton's live evidence showed the DB write was already landing in Neon
 *   even when the UI saw HTTP 500 — so this is a UX / response-delivery
 *   race, not a data-integrity problem.
 *
 * What this PR (PR #325) does and what these tests pin:
 *
 *   1. The module eagerly initiates `prisma.$connect()` at load so the
 *      engine + Neon connection are warm before the first incoming query.
 *      (Static check — we cannot exercise the live PrismaClient here.)
 *
 *   2. Every Prisma call site inside `loadAiLeadRescueListData`,
 *      `loadAiLeadRescueDetailData`, and `applyAiLeadRescuePatch` is
 *      wrapped in `withPrismaColdStartRetry(db, ...)` — a single-shot
 *      retry that fires *only* on the two documented cold-start error
 *      wordings and propagates every other error unchanged.
 *
 *   3. The retry helper is single-shot (never loops), runs after a brief
 *      backoff, and calls `db.$connect()` between attempts when the client
 *      exposes it. This intentionally caps the worst-case extra latency
 *      at one operation + ~250ms.
 *
 *   4. The two helpers `isTransientPrismaColdStartError` and
 *      `withPrismaColdStartRetry` are exported so they can be exercised
 *      directly by these tests without going through a fake PrismaClient.
 *
 * Scope guarantees pinned by static assertions:
 *   - Retry only applies to AI Lead Rescue admin paths in
 *     `lib/server/admin-lead-rescue-api.js`. No other server file is
 *     modified by PR #325. The broad PrismaClient singleton refactor is
 *     intentionally out of scope tonight.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyAiLeadRescuePatch,
  isTransientPrismaColdStartError,
  loadAiLeadRescueDetailData,
  loadAiLeadRescueListData,
  withPrismaColdStartRetry,
} from '../lib/server/admin-lead-rescue-api.js';
import {
  AI_LEAD_RESCUE_PRODUCT,
  defaultAiLeadRescueOperator,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_PATH = path.resolve(__dirname, '..', 'lib', 'server', 'admin-lead-rescue-api.js');

function readSrc() {
  return fs.readFileSync(SRC_PATH, 'utf8');
}

function makeAiLeadRescueRow(id, overrides = {}) {
  const submittedAt = new Date('2026-06-07T08:00:00.000Z');
  return {
    id,
    tenantId: 'corpflowai',
    name: 'Cold-start Test',
    email: 'cold-start@acme.test',
    phone: '+230 0000 0000',
    contact: null,
    message: 'cold-start retry test',
    intent: 'cold-start retry test',
    market: null,
    listing: null,
    status: overrides.status || 'NEW_INTAKE',
    qualificationJson: overrides.qualificationJson || {
      intake_meta: {
        product: AI_LEAD_RESCUE_PRODUCT,
        business_name: 'Cold Start Co',
        region_path: 'mauritius',
        lead_sources: 'Website',
        message: 'cold-start retry test',
      },
      ai_lead_rescue_operator: defaultAiLeadRescueOperator(submittedAt.toISOString()),
    },
    createdAt: submittedAt,
    updatedAt: submittedAt,
  };
}

/**
 * Build a fake PrismaClient whose `lead.findUnique` / `lead.update` / `lead.findMany`
 * throw a cold-start error on the FIRST call to each method, then succeed on
 * subsequent calls. Tracks call counts so tests can assert exactly one retry.
 */
function makeColdStartFakePrisma(initialRows, opts = {}) {
  const rows = new Map();
  for (const r of initialRows) rows.set(r.id, JSON.parse(JSON.stringify(r)));

  const counts = {
    findUnique: 0,
    update: 0,
    findMany: 0,
    $connect: 0,
  };

  const errorMessage =
    opts.errorMessage ||
    'Invalid `prisma.lead.findUnique()` invocation: Engine is not yet connected.';
  const failuresBeforeSuccess = typeof opts.failuresBeforeSuccess === 'number'
    ? opts.failuresBeforeSuccess
    : 1;

  function maybeFail(methodName) {
    counts[methodName] += 1;
    if (counts[methodName] <= failuresBeforeSuccess) {
      const err = new Error(errorMessage);
      throw err;
    }
  }

  return {
    counts,
    lead: {
      findUnique: async ({ where, select }) => {
        maybeFail('findUnique');
        const row = rows.get(where.id);
        if (!row) return null;
        const cloned = JSON.parse(JSON.stringify(row));
        if (!select) return cloned;
        const out = {};
        for (const k of Object.keys(select)) {
          if (select[k] === true && k in cloned) out[k] = cloned[k];
        }
        return out;
      },
      update: async ({ where, data }) => {
        maybeFail('update');
        const row = rows.get(where.id);
        if (!row) throw new Error(`fake-prisma: row ${where.id} not found for update`);
        const updated = {
          ...JSON.parse(JSON.stringify(row)),
          ...JSON.parse(JSON.stringify(data)),
        };
        updated.updatedAt = new Date();
        rows.set(where.id, updated);
        return JSON.parse(JSON.stringify(updated));
      },
      findMany: async () => {
        maybeFail('findMany');
        return [...rows.values()].map((r) => JSON.parse(JSON.stringify(r)));
      },
    },
    $connect: async () => {
      counts.$connect += 1;
    },
  };
}

describe('isTransientPrismaColdStartError — wording filter', () => {
  it('returns true for "Engine is not yet connected"', () => {
    assert.equal(
      isTransientPrismaColdStartError(new Error('Engine is not yet connected.')),
      true,
    );
  });

  it('returns true for "Response from the Engine was empty"', () => {
    assert.equal(
      isTransientPrismaColdStartError(
        new Error('prisma.lead.update() invocation: Response from the Engine was empty'),
      ),
      true,
    );
  });

  it('returns false for unrelated Prisma errors (e.g. validation)', () => {
    assert.equal(
      isTransientPrismaColdStartError(new Error('Invalid value for argument `id`')),
      false,
    );
  });

  it('returns false for "Can\'t reach database server" (real connectivity error)', () => {
    assert.equal(
      isTransientPrismaColdStartError(
        new Error("Can't reach database server at db.example.com:5432"),
      ),
      false,
    );
  });

  it('returns false for null / undefined / non-error inputs', () => {
    assert.equal(isTransientPrismaColdStartError(null), false);
    assert.equal(isTransientPrismaColdStartError(undefined), false);
    assert.equal(isTransientPrismaColdStartError(0), false);
    assert.equal(isTransientPrismaColdStartError(''), false);
  });
});

describe('withPrismaColdStartRetry — retry semantics', () => {
  it('returns the operation result without retry when the first call succeeds', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  it('retries exactly once when the first call throws "Engine is not yet connected"', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls === 1) throw new Error('Engine is not yet connected');
      return 'ok-on-retry';
    });
    assert.equal(result, 'ok-on-retry');
    assert.equal(calls, 2);
  });

  it('retries exactly once when the first call throws "Response from the Engine was empty"', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls === 1) throw new Error('Response from the Engine was empty');
      return 'ok-on-retry';
    });
    assert.equal(result, 'ok-on-retry');
    assert.equal(calls, 2);
  });

  it('does NOT retry when the error is unrelated; the original error propagates', async () => {
    let calls = 0;
    await assert.rejects(
      withPrismaColdStartRetry({}, async () => {
        calls += 1;
        throw new Error('Some unrelated validation error');
      }),
      /Some unrelated validation error/,
    );
    assert.equal(calls, 1, 'no retry should occur for non-cold-start errors');
  });

  it('propagates the second error if the retry also fails with a cold-start signature', async () => {
    let calls = 0;
    await assert.rejects(
      withPrismaColdStartRetry({}, async () => {
        calls += 1;
        throw new Error('Engine is not yet connected');
      }),
      /Engine is not yet connected/,
    );
    assert.equal(calls, 2, 'retry runs once, then the error propagates — no further retries');
  });

  it('calls db.$connect() between attempts when the client exposes it', async () => {
    let connectCalls = 0;
    let opCalls = 0;
    await withPrismaColdStartRetry(
      {
        $connect: async () => {
          connectCalls += 1;
        },
      },
      async () => {
        opCalls += 1;
        if (opCalls === 1) throw new Error('Engine is not yet connected');
        return 'ok';
      },
    );
    assert.equal(connectCalls, 1);
    assert.equal(opCalls, 2);
  });

  it('survives a client without $connect (mock or non-Prisma adapter)', async () => {
    let opCalls = 0;
    const result = await withPrismaColdStartRetry(null, async () => {
      opCalls += 1;
      if (opCalls === 1) throw new Error('Engine is not yet connected');
      return 'ok';
    });
    assert.equal(result, 'ok');
    assert.equal(opCalls, 2);
  });
});

describe('applyAiLeadRescuePatch — cold-start retry integration', () => {
  it('completes the patch after one cold-start failure on findUnique', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_1')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 1,
    });
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_cold_1', next_action: 'survives cold-start' },
      prismaClient: fake,
    });
    assert.equal(out.ok, true);
    assert.equal(out.http_status, 200);
    assert.equal(fake.counts.findUnique, 2, 'findUnique should retry exactly once');
  });

  it('completes the patch after one cold-start failure on update ("Response was empty")', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_2')], {
      errorMessage: 'Response from the Engine was empty',
      failuresBeforeSuccess: 1,
    });
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_cold_2', next_action: 'update path survives' },
      prismaClient: fake,
    });
    assert.equal(out.ok, true);
    assert.equal(out.http_status, 200);
    // findUnique succeeds on retry, then update fires; update also gets a retry.
    assert.equal(fake.counts.findUnique, 2);
    assert.equal(fake.counts.update, 2);
  });

  it('surfaces a non-transient error in the standard envelope (no retry, no masking)', async () => {
    // A `not_found`-style error or generic Prisma error must reach the caller
    // unchanged — the retry must not paper over real failures.
    const fake = {
      lead: {
        findUnique: async () => {
          throw new Error('PrismaClientKnownRequestError: P2025 record not found');
        },
        update: async () => {
          throw new Error('should not be called');
        },
      },
      $connect: async () => {},
    };
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_x', next_action: 'should fail' },
      prismaClient: fake,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_PATCH_FAILED');
    assert.match(out.message, /P2025/);
  });
});

describe('loadAiLeadRescueDetailData — cold-start retry integration', () => {
  it('returns the detail row after one cold-start failure on findUnique', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_3')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 1,
    });
    const out = await loadAiLeadRescueDetailData({ id: 'lead_cold_3', prismaClient: fake });
    assert.equal(out.ok, true);
    assert.equal(out.lead.id, 'lead_cold_3');
    assert.equal(fake.counts.findUnique, 2);
  });
});

describe('loadAiLeadRescueListData — cold-start retry integration', () => {
  it('returns the list payload after one cold-start failure on findMany', async () => {
    const fake = makeColdStartFakePrisma(
      [makeAiLeadRescueRow('lead_cold_4'), makeAiLeadRescueRow('lead_cold_5')],
      {
        errorMessage: 'Engine is not yet connected',
        failuresBeforeSuccess: 1,
      },
    );
    const out = await loadAiLeadRescueListData({ filters: {}, prismaClient: fake });
    assert.equal(out.ok, true);
    assert.equal(out.count, 2);
    assert.equal(fake.counts.findMany, 2);
  });
});

describe('source-level contract — admin-lead-rescue-api.js', () => {
  it('eagerly calls prisma.$connect() at module load', () => {
    const src = readSrc();
    assert.match(
      src,
      /prisma\.\$connect\(\)\.catch\s*\(/,
      'Module must call prisma.$connect().catch(...) at load time so the engine warms before the first query',
    );
  });

  it('exports both retry helpers so callers and tests can reuse the contract', () => {
    const src = readSrc();
    assert.match(src, /export\s+function\s+isTransientPrismaColdStartError\b/);
    assert.match(src, /export\s+async\s+function\s+withPrismaColdStartRetry\b/);
  });

  it('wraps every Prisma data operation in withPrismaColdStartRetry', () => {
    const src = readSrc();
    // The four call sites — findMany (list), findUnique (detail), findUnique (patch pre-check),
    // and update (patch write). Every `db.lead.X(...)` await must be inside a
    // `withPrismaColdStartRetry(db, () => ...)` block.
    const bareCalls = src.match(/\bawait\s+db\.lead\.(findUnique|findMany|update)\(/g) || [];
    assert.equal(
      bareCalls.length,
      0,
      `No bare \`await db.lead.X(...)\` calls allowed — they must be wrapped in withPrismaColdStartRetry. Found: ${JSON.stringify(bareCalls)}`,
    );
    // Sanity: there is at least one wrapped call per operation we care about.
    const wrapped = src.match(/withPrismaColdStartRetry\(db,\s*\(\)\s*=>\s*\n?\s*db\.lead\.(findUnique|findMany|update)\b/g) || [];
    assert.ok(
      wrapped.length >= 4,
      `Expected at least 4 wrapped Prisma calls (list+detail+patch.findUnique+patch.update), found ${wrapped.length}`,
    );
  });

  it('does NOT introduce a multi-attempt retry loop (single-shot only)', () => {
    const src = readSrc();
    assert.doesNotMatch(
      src,
      /for\s*\(\s*let\s+attempt\s*=|while\s*\(\s*attempt\s*<|exponential\s*backoff/i,
      'PR #325 scope forbids retry loops, exponential backoff, or background retry workers',
    );
  });
});

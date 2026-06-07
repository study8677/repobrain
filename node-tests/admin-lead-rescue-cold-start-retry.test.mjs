/**
 * Regression tests for the Prisma cold-start retry behaviour on the
 * AI Lead Rescue admin paths.
 *
 * Background (2026-06-07 — PR #325):
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
 *   PR #325 introduced eager `$connect()` + a single-shot retry with a
 *   250 ms backoff.
 *
 * Update (2026-06-08 — PR #326):
 *   Anton observed live failures where BOTH attempts of the single-shot
 *   retry hit "Engine is not yet connected" — the 250 ms backoff was
 *   too tight against Neon scale-to-zero wake-up on a fresh Vercel
 *   function instance. PR #326 widens the backoff to 1500 ms and allows
 *   one additional retry attempt (`COLD_START_RETRY_MAX_RETRIES = 2`,
 *   total = 3 attempts). The retry remains bounded — this is NOT a
 *   general-purpose retry loop; the strategic fix is the Neon driver
 *   adapter migration tracked in PR #327.
 *
 * What these tests pin:
 *
 *   1. Eager `prisma.$connect()` at module load (static check).
 *
 *   2. Every Prisma call site inside `loadAiLeadRescueListData`,
 *      `loadAiLeadRescueDetailData`, and `applyAiLeadRescuePatch` is
 *      wrapped in `withPrismaColdStartRetry(db, ...)`.
 *
 *   3. The retry helper is BOUNDED to `COLD_START_RETRY_MAX_RETRIES`
 *      additional attempts (default 2), runs the default backoff
 *      `COLD_START_RETRY_INITIAL_DELAY_MS` (1500 ms) between attempts,
 *      and calls `db.$connect()` before each retry when the client
 *      exposes it. Tests pass `delayMs: 0` to keep runtime fast.
 *
 *   4. Non-transient errors propagate unchanged on the FIRST throw — no
 *      retry, no masking.
 *
 *   5. Scope guarantees pinned by static assertions:
 *      - Retry only applies to AI Lead Rescue admin paths in
 *        `lib/server/admin-lead-rescue-api.js`.
 *      - No exponential backoff (fixed delay between attempts).
 *      - Bounded retry budget (no unbounded `while` / `for` loop on
 *        attempt counts that can grow past `COLD_START_RETRY_MAX_RETRIES`).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  applyAiLeadRescuePatch,
  COLD_START_RETRY_INITIAL_DELAY_MS,
  COLD_START_RETRY_MAX_RETRIES,
  isTransientPrismaColdStartError,
  loadAiLeadRescueDetailData,
  loadAiLeadRescueListData,
  withPrismaColdStartRetry,
} from '../lib/server/admin-lead-rescue-api.js';
import {
  AI_LEAD_RESCUE_PRODUCT,
  defaultAiLeadRescueOperator,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

/** Test-only fast retry options. Production callers pass nothing and get the defaults. */
const FAST_RETRY = { delayMs: 0 };

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
  it('exposes the canonical delay and retry-budget constants', () => {
    assert.equal(typeof COLD_START_RETRY_INITIAL_DELAY_MS, 'number');
    assert.ok(
      COLD_START_RETRY_INITIAL_DELAY_MS >= 1000,
      `Backoff must be >= 1000 ms (Neon scale-to-zero wake-up window); got ${COLD_START_RETRY_INITIAL_DELAY_MS}`,
    );
    assert.equal(typeof COLD_START_RETRY_MAX_RETRIES, 'number');
    assert.ok(
      COLD_START_RETRY_MAX_RETRIES >= 2,
      `Retry budget must allow at least 2 retries (PR #326); got ${COLD_START_RETRY_MAX_RETRIES}`,
    );
    // Defensive upper bound — anything bigger than 3 retries is a general-purpose loop and
    // belongs in the strategic driver-adapter migration, not this tactical cold-start guard.
    assert.ok(
      COLD_START_RETRY_MAX_RETRIES <= 3,
      `Retry budget capped at 3 (tactical guard, not general retry loop); got ${COLD_START_RETRY_MAX_RETRIES}`,
    );
  });

  it('returns the operation result without retry when the first call succeeds', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      return 'ok';
    }, FAST_RETRY);
    assert.equal(result, 'ok');
    assert.equal(calls, 1);
  });

  it('retries once when the first call throws "Engine is not yet connected"', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls === 1) throw new Error('Engine is not yet connected');
      return 'ok-on-retry';
    }, FAST_RETRY);
    assert.equal(result, 'ok-on-retry');
    assert.equal(calls, 2);
  });

  it('retries twice when the first two calls throw a cold-start error', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls <= 2) throw new Error('Engine is not yet connected');
      return 'ok-on-second-retry';
    }, FAST_RETRY);
    assert.equal(result, 'ok-on-second-retry');
    assert.equal(calls, 3, 'PR #326 must allow up to two retries (total 3 attempts)');
  });

  it('retries on "Response from the Engine was empty" with the same budget', async () => {
    let calls = 0;
    const result = await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls <= 2) throw new Error('Response from the Engine was empty');
      return 'ok';
    }, FAST_RETRY);
    assert.equal(result, 'ok');
    assert.equal(calls, 3);
  });

  it('does NOT retry when the error is unrelated; the original error propagates', async () => {
    let calls = 0;
    await assert.rejects(
      withPrismaColdStartRetry({}, async () => {
        calls += 1;
        throw new Error('Some unrelated validation error');
      }, FAST_RETRY),
      /Some unrelated validation error/,
    );
    assert.equal(calls, 1, 'no retry should occur for non-cold-start errors');
  });

  it('propagates the last cold-start error after the retry budget is exhausted', async () => {
    let calls = 0;
    await assert.rejects(
      withPrismaColdStartRetry({}, async () => {
        calls += 1;
        throw new Error('Engine is not yet connected');
      }, FAST_RETRY),
      /Engine is not yet connected/,
    );
    assert.equal(
      calls,
      COLD_START_RETRY_MAX_RETRIES + 1,
      `Total attempts must equal the documented budget (1 + ${COLD_START_RETRY_MAX_RETRIES} retries)`,
    );
  });

  it('respects an explicit maxRetries override (single-attempt mode)', async () => {
    let calls = 0;
    await assert.rejects(
      withPrismaColdStartRetry({}, async () => {
        calls += 1;
        throw new Error('Engine is not yet connected');
      }, { ...FAST_RETRY, maxRetries: 0 }),
      /Engine is not yet connected/,
    );
    assert.equal(calls, 1, 'maxRetries: 0 means a single attempt with no retry');
  });

  it('calls db.$connect() before each retry when the client exposes it', async () => {
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
        if (opCalls <= 2) throw new Error('Engine is not yet connected');
        return 'ok';
      },
      FAST_RETRY,
    );
    // 3 attempts total → 2 retries → 2 $connect calls (one before each retry).
    assert.equal(connectCalls, 2);
    assert.equal(opCalls, 3);
  });

  it('survives a client without $connect (mock or non-Prisma adapter)', async () => {
    let opCalls = 0;
    const result = await withPrismaColdStartRetry(null, async () => {
      opCalls += 1;
      if (opCalls === 1) throw new Error('Engine is not yet connected');
      return 'ok';
    }, FAST_RETRY);
    assert.equal(result, 'ok');
    assert.equal(opCalls, 2);
  });

  it('actually waits delayMs between attempts (timing check)', async () => {
    const start = Date.now();
    let calls = 0;
    await withPrismaColdStartRetry({}, async () => {
      calls += 1;
      if (calls === 1) throw new Error('Engine is not yet connected');
      return 'ok';
    }, { delayMs: 50 });
    const elapsed = Date.now() - start;
    assert.ok(
      elapsed >= 40,
      `Expected at least ~50 ms of backoff between attempts; got ${elapsed} ms`,
    );
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
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, true);
    assert.equal(out.http_status, 200);
    assert.equal(fake.counts.findUnique, 2, 'findUnique should retry once on the first failure');
  });

  it('completes the patch after TWO cold-start failures on findUnique (PR #326)', async () => {
    // PR #326 widens the retry budget from 1 to 2 retries (3 attempts total).
    // This pins the new behaviour against regression to the PR #325 single-shot
    // retry, which Anton observed losing the race against Neon scale-to-zero.
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_1b')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 2,
    });
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_cold_1b', status: 'PAID_SETUP' },
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, true);
    assert.equal(out.http_status, 200);
    assert.equal(fake.counts.findUnique, 3, 'findUnique should retry twice on the second failure');
  });

  it('completes the patch after one cold-start failure on update ("Response was empty")', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_2')], {
      errorMessage: 'Response from the Engine was empty',
      failuresBeforeSuccess: 1,
    });
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_cold_2', next_action: 'update path survives' },
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, true);
    assert.equal(out.http_status, 200);
    assert.equal(fake.counts.findUnique, 2);
    assert.equal(fake.counts.update, 2);
  });

  it('surfaces a non-transient error in the standard envelope (no retry, no masking)', async () => {
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
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_PATCH_FAILED');
    assert.match(out.message, /P2025/);
  });

  it('surfaces the cold-start error after the retry budget is exhausted (no infinite loop)', async () => {
    // If Neon stays asleep beyond the retry budget the API must return a 500
    // with the original message; it must NOT loop forever.
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_exhausted')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 99,
    });
    const out = await applyAiLeadRescuePatch({
      body: { id: 'lead_cold_exhausted', next_action: 'budget exhausted' },
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, false);
    assert.equal(out.error, 'LEAD_RESCUE_PATCH_FAILED');
    assert.match(out.message, /Engine is not yet connected/);
    assert.equal(
      fake.counts.findUnique,
      COLD_START_RETRY_MAX_RETRIES + 1,
      'Total findUnique calls must match the documented attempt budget',
    );
  });
});

describe('loadAiLeadRescueDetailData — cold-start retry integration', () => {
  it('returns the detail row after one cold-start failure on findUnique', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_3')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 1,
    });
    const out = await loadAiLeadRescueDetailData({
      id: 'lead_cold_3',
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, true);
    assert.equal(out.lead.id, 'lead_cold_3');
    assert.equal(fake.counts.findUnique, 2);
  });

  it('returns the detail row after two cold-start failures (PR #326)', async () => {
    const fake = makeColdStartFakePrisma([makeAiLeadRescueRow('lead_cold_3b')], {
      errorMessage: 'Engine is not yet connected',
      failuresBeforeSuccess: 2,
    });
    const out = await loadAiLeadRescueDetailData({
      id: 'lead_cold_3b',
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
    assert.equal(out.ok, true);
    assert.equal(out.lead.id, 'lead_cold_3b');
    assert.equal(fake.counts.findUnique, 3);
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
    const out = await loadAiLeadRescueListData({
      filters: {},
      prismaClient: fake,
      retryOpts: FAST_RETRY,
    });
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

  it('exports the retry helpers and tuning constants', () => {
    const src = readSrc();
    assert.match(src, /export\s+function\s+isTransientPrismaColdStartError\b/);
    assert.match(src, /export\s+async\s+function\s+withPrismaColdStartRetry\b/);
    assert.match(src, /export\s+const\s+COLD_START_RETRY_INITIAL_DELAY_MS\b/);
    assert.match(src, /export\s+const\s+COLD_START_RETRY_MAX_RETRIES\b/);
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
    // (Pattern is intentionally loose on inner whitespace — we just want to
    // confirm withPrismaColdStartRetry is wrapping a db.lead.X call.)
    const wrapped =
      src.match(
        /withPrismaColdStartRetry\(\s*db,[\s\S]*?db\.lead\.(findUnique|findMany|update)\b/g,
      ) || [];
    assert.ok(
      wrapped.length >= 4,
      `Expected at least 4 wrapped Prisma calls (list+detail+patch.findUnique+patch.update), found ${wrapped.length}`,
    );
  });

  it('keeps the retry budget bounded and free of exponential backoff', () => {
    const src = readSrc();
    // The bounded retry uses a single `for (let attempt = 0; attempt <= maxRetries; ...)`
    // loop — that pattern is explicitly allowed. We forbid unbounded `while` loops on
    // attempt counts and any "exponential" naming, both of which would signal scope creep
    // into a general-purpose retry that belongs in the strategic driver-adapter PR (#327).
    assert.doesNotMatch(
      src,
      /while\s*\(\s*true\s*\)|exponential\s*backoff|setTimeout\s*\([^)]*Math\.pow/i,
      'Cold-start retry must stay bounded — no unbounded loops, no exponential backoff',
    );
    // Confirm the constant cap is referenced inside the retry helper body.
    assert.match(
      src,
      /COLD_START_RETRY_MAX_RETRIES/,
      'withPrismaColdStartRetry must respect the documented retry budget constant',
    );
  });
});

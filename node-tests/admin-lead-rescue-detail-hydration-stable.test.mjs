/**
 * Hydration-stable date formatting contract for the AI Lead Rescue
 * factory-admin surface.
 *
 * The 2026-06-06 P0 on `/admin/lead-rescue/[id]` was a React hydration
 * failure caused by `new Date(iso).toLocaleString()` in render. PR #319
 * began SSR-rendering `initialLead`, so the Vercel server (UTC + en-US
 * default) and the operator browser (Mauritius UTC+4 + browser locale)
 * emitted different text for the same ISO timestamp. React aborted
 * hydration on the detail page, leaving the whole component inert —
 * exactly what the PR #320 diagnostic panel revealed (`Save handler
 * mounted: NO`).
 *
 * This suite pins the contract that prevents the bug from recurring:
 *
 *  1. `fmtDateStableUtc` lives in `lib/format/utc-date.js`, accepts
 *     null / undefined / Date / ISO string / number, and always
 *     returns the same string for the same input regardless of host
 *     locale or timezone.
 *  2. Output shape is `YYYY-MM-DD HH:mm:ss UTC` for valid input and
 *     `'—'` for null / empty / invalid input.
 *  3. `components/AiLeadRescueAdminDetail.js` and
 *     `components/AiLeadRescueAdminList.js`:
 *       - import `fmtDateStableUtc` from `../lib/format/utc-date.js`
 *       - contain NO calls to `toLocaleString`, `toLocaleDateString`,
 *         `toLocaleTimeString`, or the deprecated local `fmtDate`
 *         helper — only `fmtDateStableUtc(...)` is allowed.
 *       - contain NO `Math.random()` calls (another classic source of
 *         hydration mismatches).
 *
 * If you change the formatter shape or the render call sites, update
 * the operator runbook section "Troubleshooting — clicking Save
 * produces no visible reaction" so operators reading panel output
 * still match the documentation.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { fmtDateStableUtc } from '../lib/format/utc-date.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const DETAIL_PATH = path.join(REPO_ROOT, 'components', 'AiLeadRescueAdminDetail.js');
const LIST_PATH = path.join(REPO_ROOT, 'components', 'AiLeadRescueAdminList.js');

function readUtf8(p) {
  return fs.readFileSync(p, 'utf8');
}

// Helpers — when a regex appears inside a doc/block comment (`/* … */`
// or `// …`), the call-site forbidding tests should not falsely fail
// on documentation that explains the bug.
function stripJsComments(source) {
  // Strip `/* … */` block comments.
  let out = source.replace(/\/\*[\s\S]*?\*\//g, '');
  // Strip `// …` line comments (keep the newline so line counts match
  // roughly when debugging).
  out = out.replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  return out;
}

describe('lib/format/utc-date — fmtDateStableUtc', () => {
  it("returns '—' for null / undefined / empty string", () => {
    assert.equal(fmtDateStableUtc(null), '—');
    assert.equal(fmtDateStableUtc(undefined), '—');
    assert.equal(fmtDateStableUtc(''), '—');
  });

  it("returns '—' for unparseable values", () => {
    assert.equal(fmtDateStableUtc('not a date'), '—');
    assert.equal(fmtDateStableUtc(NaN), '—');
    assert.equal(fmtDateStableUtc({}), '—');
    assert.equal(fmtDateStableUtc([]), '—');
  });

  it('formats an ISO 8601 string deterministically in UTC', () => {
    assert.equal(
      fmtDateStableUtc('2026-06-06T07:41:38.906Z'),
      '2026-06-06 07:41:38 UTC',
    );
  });

  it('formats a Date instance deterministically in UTC', () => {
    const d = new Date(Date.UTC(2026, 0, 1, 0, 0, 0));
    assert.equal(fmtDateStableUtc(d), '2026-01-01 00:00:00 UTC');
  });

  it('formats a numeric epoch milliseconds value deterministically in UTC', () => {
    const ms = Date.UTC(2024, 11, 31, 23, 59, 59);
    assert.equal(fmtDateStableUtc(ms), '2024-12-31 23:59:59 UTC');
  });

  it('zero-pads single-digit components', () => {
    assert.equal(
      fmtDateStableUtc('2026-01-02T03:04:05Z'),
      '2026-01-02 03:04:05 UTC',
    );
  });

  it('is deterministic — repeated calls yield identical output', () => {
    const iso = '2026-06-06T07:41:38.906Z';
    const first = fmtDateStableUtc(iso);
    for (let i = 0; i < 100; i++) {
      assert.equal(fmtDateStableUtc(iso), first);
    }
  });

  it('is independent of the process timezone (simulated via Date.UTC math)', () => {
    // The formatter only consults `getUTC*` accessors, so the same ISO
    // string must always map to the same UTC components no matter what
    // `process.env.TZ` is set to. We assert this by computing the
    // expected UTC fields directly from `Date.UTC` and comparing.
    const iso = '2026-06-06T07:41:38.906Z';
    const out = fmtDateStableUtc(iso);
    assert.equal(out, '2026-06-06 07:41:38 UTC');
    // Sanity: even constructing the Date in a UTC+12 process locale,
    // the formatter output stays in UTC (we cannot mutate process.env.TZ
    // mid-test cleanly, but we can confirm the math by reading
    // getUTC* directly).
    const d = new Date(iso);
    const expected =
      `${d.getUTCFullYear()}-` +
      String(d.getUTCMonth() + 1).padStart(2, '0') +
      '-' +
      String(d.getUTCDate()).padStart(2, '0') +
      ' ' +
      String(d.getUTCHours()).padStart(2, '0') +
      ':' +
      String(d.getUTCMinutes()).padStart(2, '0') +
      ':' +
      String(d.getUTCSeconds()).padStart(2, '0') +
      ' UTC';
    assert.equal(out, expected);
  });
});

describe('AI Lead Rescue admin components — hydration-stable contract', () => {
  it('detail component imports fmtDateStableUtc from lib/format/utc-date.js', () => {
    const src = readUtf8(DETAIL_PATH);
    assert.match(
      src,
      /import\s*\{\s*fmtDateStableUtc\s*\}\s*from\s*['"]\.\.\/lib\/format\/utc-date\.js['"];?/,
      'AiLeadRescueAdminDetail.js must import fmtDateStableUtc from ../lib/format/utc-date.js.',
    );
  });

  it('list component imports fmtDateStableUtc from lib/format/utc-date.js', () => {
    const src = readUtf8(LIST_PATH);
    assert.match(
      src,
      /import\s*\{\s*fmtDateStableUtc\s*\}\s*from\s*['"]\.\.\/lib\/format\/utc-date\.js['"];?/,
      'AiLeadRescueAdminList.js must import fmtDateStableUtc from ../lib/format/utc-date.js.',
    );
  });

  for (const [label, p] of [
    ['detail', DETAIL_PATH],
    ['list', LIST_PATH],
  ]) {
    it(`${label} component code (comments stripped) contains no toLocaleString / Intl date calls`, () => {
      const src = stripJsComments(readUtf8(p));
      for (const forbidden of [
        '.toLocaleString',
        '.toLocaleDateString',
        '.toLocaleTimeString',
        'Intl.DateTimeFormat',
      ]) {
        assert.ok(
          !src.includes(forbidden),
          `${label} component must not call ${forbidden} in render — it is locale/timezone-sensitive and causes hydration mismatches.`,
        );
      }
    });

    it(`${label} component code (comments stripped) contains no Math.random in render`, () => {
      const src = stripJsComments(readUtf8(p));
      assert.ok(
        !src.includes('Math.random'),
        `${label} component must not call Math.random in render — it is a classic source of hydration mismatches.`,
      );
    });

    it(`${label} component code (comments stripped) does not call the deprecated fmtDate helper`, () => {
      const src = stripJsComments(readUtf8(p));
      // We want to forbid `fmtDate(` but allow `fmtDateStableUtc(`. The
      // simplest robust check is a regex with a negative lookahead.
      const offending = src.match(/\bfmtDate\((?!StableUtc)/g);
      assert.ok(
        !offending || offending.length === 0,
        `${label} component still calls the deprecated fmtDate helper: ${offending}. Use fmtDateStableUtc instead.`,
      );
    });
  }
});

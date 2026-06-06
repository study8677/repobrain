/**
 * Static regression tests for components/AiLeadRescueAdminList.js.
 *
 * Why static / regex-based: the component is React JSX and we want a low-cost
 * guarantee that the loading-never-stuck contract survives future edits without
 * dragging React testing-library + jsdom into node:test. These checks catch the
 * specific failure modes that produced the 2026-06-06 P0 (permanent "Loading…"
 * on `/admin/lead-rescue` in production):
 *
 *   1. The component MUST clear `loading` in a finally block (so an error path
 *      can never leave the UI stuck on the loading spinner).
 *   2. The component MUST use AbortController with a numeric timeout (so a
 *      hung fetch eventually surfaces as an error instead of an infinite spin).
 *   3. The component MUST accept SSR-provided `initialLeads` / `initialError`
 *      props (so the page paints data even when client-side hydration fails).
 *   4. The component MUST render an error block with HTTP status + a Retry
 *      control whenever the API returns a failure envelope.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.join(__dirname, '..', 'components', 'AiLeadRescueAdminList.js');
const pagePath = path.join(__dirname, '..', 'pages', 'admin', 'lead-rescue', 'index.js');
const apiPath = path.join(__dirname, '..', 'lib', 'server', 'admin-lead-rescue-api.js');

const componentSrc = fs.readFileSync(componentPath, 'utf8');
const pageSrc = fs.readFileSync(pagePath, 'utf8');
const apiSrc = fs.readFileSync(apiPath, 'utf8');

describe('AiLeadRescueAdminList — loading-never-stuck contract', () => {
  it('declares an AbortController with a numeric timeout on the list fetch', () => {
    assert.match(
      componentSrc,
      /new AbortController\(\)/,
      'fetch must use AbortController so a stalled request is forcibly cancelled',
    );
    assert.match(
      componentSrc,
      /LIST_FETCH_TIMEOUT_MS\s*=\s*\d/,
      'a numeric LIST_FETCH_TIMEOUT_MS constant must exist',
    );
    assert.match(
      componentSrc,
      /setTimeout\([\s\S]{0,200}LIST_FETCH_TIMEOUT_MS\)/,
      'the timeout must be wired to setTimeout(...) to actually trigger abort',
    );
  });

  it('always clears loading in finally', () => {
    assert.match(componentSrc, /finally\s*\{/, 'a finally block must exist in load()');
    // setLoading(false) must appear AFTER the last `finally {` token (i.e. inside the cleanup
    // block of load()). We assert this by checking that the substring after the last
    // "finally {" contains setLoading(false) before any "}\s*,\s*\[" callback close.
    const lastFinallyIdx = componentSrc.lastIndexOf('finally');
    assert.ok(lastFinallyIdx > 0, 'expected a finally keyword in the component source');
    const tail = componentSrc.slice(lastFinallyIdx);
    assert.match(
      tail,
      /setLoading\(false\)/,
      'finally block must call setLoading(false) so loading is always cleared',
    );
  });

  it('accepts SSR-provided initialLeads / initialError props', () => {
    assert.match(componentSrc, /initialLeads/);
    assert.match(componentSrc, /initialError/);
    assert.match(
      componentSrc,
      /Array\.isArray\(initialLeads\)/,
      'must check Array.isArray(initialLeads) when seeding state from SSR',
    );
    assert.match(
      componentSrc,
      /useState\(\s*hasInitial\s*\?\s*initialLeads\s*:\s*\[\]\s*\)/,
      'initialLeads must seed the leads state directly',
    );
  });

  it('does not refetch on first mount when SSR pre-populated the list', () => {
    assert.match(
      componentSrc,
      /skipFirstFetchRef/,
      'a first-fetch guard must exist so SSR data is not immediately overwritten by a client refetch',
    );
  });

  it('renders an error envelope with HTTP status, error code, and retry control', () => {
    assert.match(
      componentSrc,
      /role=["']alert["']/,
      'error block should be marked as role="alert" for accessibility',
    );
    assert.match(
      componentSrc,
      /HTTP\s+\$\{error\.http_status\}/,
      'error block should surface the HTTP status',
    );
    assert.match(componentSrc, /\{error\.code\}/, 'error block should surface the error code');
    assert.match(componentSrc, /\{error\.message\}/, 'error block should surface the error message');
    assert.match(
      componentSrc,
      /onClick=\{load\}/,
      'a Retry button (calling load) must exist in the error block',
    );
    assert.match(
      componentSrc,
      /Open raw API/i,
      'error block should expose a "Open raw API" diagnostic link for operators',
    );
  });

  it('distinguishes loading / error / empty / data rows in the table body', () => {
    assert.match(componentSrc, /showLoadingRow/);
    assert.match(componentSrc, /showErrorRow/);
    assert.match(componentSrc, /showEmptyRow/);
    // The three booleans should never be simultaneously true.
    assert.match(
      componentSrc,
      /showLoadingRow\s*=\s*loading\s*&&\s*!error\s*&&\s*leads\.length\s*===\s*0/,
      'loading row must require !error so an error never coexists with a spinner',
    );
  });

  it('uses credentials: include + Accept: application/json on the list fetch', () => {
    assert.match(componentSrc, /credentials:\s*['"]include['"]/);
    assert.match(componentSrc, /Accept:\s*['"]application\/json['"]/);
  });

  it('treats data.ok === false as a failure even when r.ok is true', () => {
    assert.match(
      componentSrc,
      /!r\.ok\s*\|\|\s*\(data\s*&&\s*data\.ok\s*===\s*false\)/,
      'the FE must reject responses that say ok:false even on HTTP 200',
    );
  });
});

describe('pages/admin/lead-rescue/index — SSR fallback contract', () => {
  it('imports loadAiLeadRescueListData from the API module', () => {
    assert.match(
      pageSrc,
      /import\s*\{\s*loadAiLeadRescueListData\s*\}\s*from\s*['"][^'"]*admin-lead-rescue-api[^'"]*['"]/,
      'getServerSideProps must import loadAiLeadRescueListData to pre-populate the list',
    );
  });

  it('passes initialLeads and initialError to the component', () => {
    assert.match(pageSrc, /initialLeads=\{initialLeads\}/);
    assert.match(pageSrc, /initialError=\{initialError\}/);
  });

  it('still honours requireAdminPageSession before fetching data', () => {
    assert.match(pageSrc, /requireAdminPageSession\(req,\s*['"]\/admin\/lead-rescue['"]\)/);
    assert.match(
      pageSrc,
      /['"]redirect['"]\s+in\s+gate/,
      'must return the redirect from the gate before doing any DB work',
    );
  });

  it('catches SSR DB failures and forwards them as initialError instead of crashing', () => {
    assert.match(pageSrc, /try\s*\{[\s\S]*loadAiLeadRescueListData/);
    assert.match(
      pageSrc,
      /initialError\s*=\s*\{[\s\S]*error:\s*['"]SSR_LOAD_FAILED['"]/,
      'an SSR-side throw must be converted into an initialError envelope',
    );
  });
});

describe('admin-lead-rescue-api — response contract', () => {
  it('exports a normalizeListFilters helper', () => {
    assert.match(apiSrc, /export\s+function\s+normalizeListFilters/);
  });

  it('exports a buildAiLeadRescueListPayload helper', () => {
    assert.match(apiSrc, /export\s+function\s+buildAiLeadRescueListPayload/);
  });

  it('exports an async loadAiLeadRescueListData usable from SSR', () => {
    assert.match(apiSrc, /export\s+async\s+function\s+loadAiLeadRescueListData/);
  });

  it('handler responses set Cache-Control: no-store', () => {
    assert.match(apiSrc, /Cache-Control['"]?,\s*['"]no-store/);
  });

  it('handler 403 / 404 / 405 / 500 responses use the {ok:false, error, message, http_status} envelope', () => {
    const blocks = ['FACTORY_AUTH_REQUIRED', 'UNKNOWN_ROUTE', 'METHOD_NOT_ALLOWED', 'LEAD_RESCUE_LIST_FAILED'];
    for (const code of blocks) {
      assert.match(apiSrc, new RegExp(`['\"]${code}['\"]`), `error code ${code} must be present`);
    }
    // Each error JSON block should include ok:false, error, message, http_status — sample one line.
    assert.match(
      apiSrc,
      /ok:\s*false,[\s\S]{0,400}error:\s*['"]FACTORY_AUTH_REQUIRED['"][\s\S]{0,400}http_status:\s*403/,
      '403 response should carry the full failure envelope',
    );
  });

  it('does NOT use Prisma JSON-path filter on qualificationJson (in-memory filter is the safe path)', () => {
    assert.equal(
      /qualificationJson\s*:\s*\{[\s\S]*?path:\s*\[/.test(apiSrc),
      false,
      'the SQL JSON-path filter was the suspected root cause of the production hang and must not be reintroduced without an explicit fallback',
    );
  });
});

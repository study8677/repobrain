/**
 * Static regression tests for components/AiLeadRescueAdminDetail.js and
 * pages/admin/lead-rescue/[id].js.
 *
 * These checks catch the specific failure modes that produced the 2026-06-06
 * P0 follow-up: clicking "Open" on a list row rendered a black/blank screen.
 * The contract the detail page must satisfy after this fix:
 *
 *   1. The page chrome (Back link, h1) is rendered UNCONDITIONALLY — never
 *      hidden behind a loading/error gate. This guarantees the operator
 *      always sees navigation, even if the body cannot render.
 *   2. SSR pre-populates the lead via getServerSideProps using a shared
 *      loader; failure is forwarded as `initialError`, not a thrown SSR.
 *   3. The component is wrapped in a React error boundary. A runtime throw
 *      during render is caught and converted into a visible error block
 *      with a Retry control, not a blank tree.
 *   4. Every nested lead-field access goes through a `normalizeLead()` shim
 *      that fills in safe defaults — so a missing prospect/commercial/etc.
 *      block can't crash the render.
 *   5. Fetches use AbortController with a numeric timeout.
 *   6. Errors surface HTTP status + code + message + Retry + Back-to-list +
 *      raw API diagnostic link.
 */

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.join(__dirname, '..', 'components', 'AiLeadRescueAdminDetail.js');
const pagePath = path.join(__dirname, '..', 'pages', 'admin', 'lead-rescue', '[id].js');
const apiPath = path.join(__dirname, '..', 'lib', 'server', 'admin-lead-rescue-api.js');

const componentSrc = fs.readFileSync(componentPath, 'utf8');
const pageSrc = fs.readFileSync(pagePath, 'utf8');
const apiSrc = fs.readFileSync(apiPath, 'utf8');

describe('AiLeadRescueAdminDetail — never-blank contract', () => {
  it('declares a React error boundary class for the detail body', () => {
    assert.match(
      componentSrc,
      /class\s+DetailErrorBoundary\s+extends\s+React\.Component/,
      'an ErrorBoundary class must exist so render-time throws cannot blank the page',
    );
    assert.match(
      componentSrc,
      /static\s+getDerivedStateFromError/,
      'the boundary must implement getDerivedStateFromError',
    );
    assert.match(
      componentSrc,
      /componentDidCatch/,
      'the boundary should log to console.error for ops triage',
    );
  });

  it('always renders the Back to pipeline link, regardless of loading or error', () => {
    // The Back link must live OUTSIDE the loading / error conditional so the
    // user is never stranded on a blank page.
    const backLinkRegex = /Back to pipeline/;
    assert.match(componentSrc, backLinkRegex);
    // Loading/error states render INSIDE the boundary; the Back link is in
    // the outer chrome above the boundary.
    const backIdx = componentSrc.indexOf('Back to pipeline');
    const boundaryIdx = componentSrc.indexOf('DetailErrorBoundary onReset');
    assert.ok(backIdx > 0 && boundaryIdx > 0, 'both Back link and boundary must exist');
    assert.ok(
      backIdx < boundaryIdx,
      'the Back link must be rendered BEFORE the error boundary so it survives a boundary fallback',
    );
  });

  it('defines and uses a normalizeLead() helper with safe defaults for every block', () => {
    assert.match(
      componentSrc,
      /function\s+normalizeLead\(/,
      'normalizeLead() must exist to defend against malformed payloads',
    );
    // Every nested block must be defended.
    const nested = ['prospect', 'commercial', 'operations', 'setup_checklist'];
    for (const block of nested) {
      const re = new RegExp(
        `lead\\.${block}\\s*&&\\s*typeof\\s+lead\\.${block}\\s*===\\s*['"]object['"]`,
      );
      assert.match(componentSrc, re, `normalizeLead must defend lead.${block}`);
    }
    // Items array specifically must be defensively coerced.
    assert.match(
      componentSrc,
      /Array\.isArray\(cl\.items\)\s*\?\s*cl\.items\s*:\s*\[\]/,
      'normalizeLead must coerce setup_checklist.items to an array',
    );
  });

  it('accepts SSR-provided initialLead / initialError / leadId props', () => {
    assert.match(componentSrc, /initialLead/, 'initialLead prop expected');
    assert.match(componentSrc, /initialError/, 'initialError prop expected');
    assert.match(componentSrc, /leadId:\s*leadIdFromProps/, 'leadId prop expected');
    assert.match(
      componentSrc,
      /useState\(\s*hasInitialLead\s*\?\s*normalizeLead\(initialLead\)\s*:\s*null\s*\)/,
      'initialLead must seed state through normalizeLead()',
    );
  });

  it('uses AbortController + numeric timeout on the detail fetch', () => {
    assert.match(componentSrc, /new AbortController\(\)/, 'fetch must use AbortController');
    assert.match(
      componentSrc,
      /DETAIL_FETCH_TIMEOUT_MS\s*=\s*\d/,
      'a numeric DETAIL_FETCH_TIMEOUT_MS constant must exist',
    );
    assert.match(
      componentSrc,
      /setTimeout\([\s\S]{0,200}DETAIL_FETCH_TIMEOUT_MS\)/,
      'the timeout must be wired to setTimeout(...)',
    );
  });

  it('always clears loading in finally on the detail fetch', () => {
    // Find the load = useCallback(...) block specifically (the detail fetch)
    // — NOT save() or saveChecklistItem(). Then assert its finally clause
    // contains setLoading(false).
    const loadIdx = componentSrc.indexOf('const load = useCallback');
    assert.ok(loadIdx > 0, 'a load() useCallback must exist');
    const loadFinallyRelIdx = componentSrc.indexOf('finally', loadIdx);
    assert.ok(loadFinallyRelIdx > 0, 'load() must contain a finally block');
    // Take a bounded window from load()'s finally and assert setLoading(false)
    // is the cleanup. Bounded window avoids running into save()'s finally.
    const window = componentSrc.slice(loadFinallyRelIdx, loadFinallyRelIdx + 600);
    assert.match(
      window,
      /setLoading\(false\)/,
      'load() finally block must call setLoading(false) so the detail spinner is always cleared',
    );
  });

  it('renders an error block with HTTP status, code, message, Retry, Back-to-list, raw API link', () => {
    assert.match(componentSrc, /role=["']alert["']/, 'error block must be role="alert"');
    assert.match(componentSrc, /HTTP\s+\$\{error\.http_status\}/, 'must surface the HTTP status');
    assert.match(componentSrc, /\{error\.code\}/, 'must surface the error code');
    assert.match(componentSrc, /\{error\.message\}/, 'must surface the error message');
    assert.match(componentSrc, /onClick=\{onRetry\}/, 'must provide a Retry control');
    assert.match(
      componentSrc,
      /href=["']\/admin\/lead-rescue["']/,
      'must provide a Back to list link from the error block',
    );
    assert.match(
      componentSrc,
      /Open raw API/i,
      'must provide an Open raw API diagnostic link from the error block',
    );
  });

  it('treats data.ok === false as a failure on detail load (not just !r.ok)', () => {
    assert.match(
      componentSrc,
      /!r\.ok\s*\|\|\s*\(data\s*&&\s*data\.ok\s*===\s*false\)/,
      'the FE must reject responses that say ok:false even on HTTP 200',
    );
  });

  it('save() and saveChecklistItem() handle the new envelope shape without throwing on parse', () => {
    // Both paths should attempt r.json() inside a try/catch and convert
    // any non-JSON response into a structured error envelope.
    const saveBlock = componentSrc.match(/async function save\(e\)\s*\{[\s\S]+?\n\s\s\}/);
    assert.ok(saveBlock, 'save() must exist');
    assert.match(saveBlock[0], /data = await r\.json\(\)/, 'save() must parse JSON safely');
    assert.match(
      saveBlock[0],
      /!r\.ok\s*\|\|\s*\(data\s*&&\s*data\.ok\s*===\s*false\)/,
      'save() must reject ok:false envelopes',
    );

    const checklistBlock = componentSrc.match(/async function saveChecklistItem\(itemKey\)\s*\{[\s\S]+?\n\s\s\}/);
    assert.ok(checklistBlock, 'saveChecklistItem() must exist');
    assert.match(
      checklistBlock[0],
      /!r\.ok\s*\|\|\s*\(data\s*&&\s*data\.ok\s*===\s*false\)/,
      'saveChecklistItem() must reject ok:false envelopes',
    );
  });

  it('renders the setup checklist only when eligible AND items[] is non-empty', () => {
    assert.match(
      componentSrc,
      /lead\.setup_checklist_eligible\s*&&\s*lead\.setup_checklist\.items\.length\s*>\s*0/,
      'checklist block must gate on both eligibility and a non-empty items[]',
    );
  });
});

describe('pages/admin/lead-rescue/[id] — SSR fallback contract', () => {
  it('imports loadAiLeadRescueDetailData from the API module', () => {
    assert.match(
      pageSrc,
      /import\s*\{\s*loadAiLeadRescueDetailData\s*\}\s*from\s*['"][^'"]*admin-lead-rescue-api[^'"]*['"]/,
      'getServerSideProps must import loadAiLeadRescueDetailData',
    );
  });

  it('passes initialLead, initialError, and leadId to the component', () => {
    assert.match(pageSrc, /initialLead=\{initialLead\}/);
    assert.match(pageSrc, /initialError=\{initialError\}/);
    assert.match(pageSrc, /leadId=\{leadId\}/);
  });

  it('still honours requireAdminPageSession before fetching data', () => {
    assert.match(pageSrc, /requireAdminPageSession\(req,\s*nextPath\)/);
    assert.match(
      pageSrc,
      /['"]redirect['"]\s+in\s+gate/,
      'must return the redirect from the gate before doing any DB work',
    );
  });

  it('catches SSR DB failures and forwards them as initialError instead of crashing', () => {
    assert.match(pageSrc, /try\s*\{[\s\S]*loadAiLeadRescueDetailData/);
    assert.match(
      pageSrc,
      /initialError\s*=\s*\{[\s\S]*error:\s*['"]SSR_LOAD_FAILED['"]/,
      'an SSR-side throw must be converted into an initialError envelope',
    );
  });

  it('rejects an empty id at the page boundary', () => {
    assert.match(
      pageSrc,
      /initialError\s*=\s*\{[\s\S]*error:\s*['"]ID_REQUIRED['"]/,
      'a missing :id segment must produce ID_REQUIRED, not a thrown 500',
    );
  });
});

describe('admin-lead-rescue-api — detail loader contract', () => {
  it('exports a loadAiLeadRescueDetailData helper', () => {
    assert.match(apiSrc, /export\s+async\s+function\s+loadAiLeadRescueDetailData/);
  });

  it('handleGet routes through the shared loader', () => {
    assert.match(
      apiSrc,
      /loadAiLeadRescueDetailData\(\{\s*id\s*\}\)/,
      'handleGet must call loadAiLeadRescueDetailData so the HTTP path and the SSR path share one code path',
    );
  });

  it('the loader normalizes ID_REQUIRED + LEAD_NOT_FOUND + LEAD_RESCUE_GET_FAILED codes', () => {
    for (const code of ['ID_REQUIRED', 'LEAD_NOT_FOUND', 'LEAD_RESCUE_GET_FAILED']) {
      assert.match(apiSrc, new RegExp(`['\"]${code}['\"]`), `${code} must be emitted by the loader`);
    }
  });
});

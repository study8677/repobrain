/**
 * Static regression tests pinning the SAVE-button wiring contract on
 * `components/AiLeadRescueAdminDetail.js`.
 *
 * The 2026-06-06 P0 (after PR #317 merged) was:
 *   "Clicking Save does not visibly react. No 'Saving…' label, no error,
 *    no 'Saved.' pill. Refresh: changes do not persist."
 *
 * The root cause is the Save button relying on the form's `onSubmit` to
 * dispatch the save handler. When a hydration mismatch leaves the form's
 * onSubmit unattached, the browser falls back to a native form POST that
 * silently reloads the page with the original SSR data — exactly matching
 * the operator's report.
 *
 * The contract we pin here:
 *
 *   1. The Save button is `type="button"` (NEVER `type="submit"`), so a
 *      click cannot trigger native form submission.
 *   2. The Save button has an explicit `onClick={save}` handler — wiring
 *      is independent of the surrounding form.
 *   3. The form's `onSubmit` is a no-op preventDefault, so an accidental
 *      Enter-key submission also cannot fall through to a native POST.
 *   4. The save handler immediately writes a visible "Saving…" status
 *      before awaiting the fetch — so the operator never sees zero
 *      reaction.
 *   5. The save handler is re-entrant-safe (guards on `saving`) and
 *      reports a structured error if `leadId` is missing instead of
 *      silently no-op'ing.
 *   6. The Save button exposes `data-testid="ai-lead-rescue-save"` so
 *      future automated smoke tests can target it.
 *   7. `[id].js` JSON-round-trips the SSR `initialLead` so SSR render
 *      and CSR hydration see the exact same value shapes (no Date vs
 *      ISO-string skew that would break hydration).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const componentPath = path.join(__dirname, '..', 'components', 'AiLeadRescueAdminDetail.js');
const pagePath = path.join(__dirname, '..', 'pages', 'admin', 'lead-rescue', '[id].js');

const componentSrc = fs.readFileSync(componentPath, 'utf8');
const pageSrc = fs.readFileSync(pagePath, 'utf8');

function extractSaveButtonBlock() {
  const idx = componentSrc.indexOf('data-testid="ai-lead-rescue-save"');
  assert.ok(idx > 0, 'Save button must carry data-testid="ai-lead-rescue-save"');
  // Walk back to the opening <button and forward to the closing </button>.
  const openIdx = componentSrc.lastIndexOf('<button', idx);
  const closeIdx = componentSrc.indexOf('</button>', idx);
  assert.ok(openIdx > 0 && closeIdx > openIdx, 'Save button block must be locatable');
  return componentSrc.slice(openIdx, closeIdx + '</button>'.length);
}

describe('AiLeadRescueAdminDetail — Save button wiring', () => {
  it('Save button is type="button" (NEVER type="submit")', () => {
    const block = extractSaveButtonBlock();
    assert.match(block, /type="button"/, 'Save button must be type="button"');
    assert.doesNotMatch(
      block,
      /type="submit"/,
      'Save button must NOT be type="submit" — clicking would fall through to native form submission',
    );
  });

  it('Save button has explicit onClick={save}', () => {
    const block = extractSaveButtonBlock();
    assert.match(
      block,
      /onClick=\{save\}/,
      'Save button must be wired to save() via an explicit onClick prop, not the form onSubmit',
    );
  });

  it('Save button exposes the data-testid for automated probes', () => {
    const block = extractSaveButtonBlock();
    assert.match(block, /data-testid="ai-lead-rescue-save"/);
  });

  it('Save button label reflects the saving state', () => {
    const block = extractSaveButtonBlock();
    assert.match(block, /saving \? 'Saving…' : 'Save changes'/);
  });

  it('Save button is disabled while saving (prevents double-click)', () => {
    const block = extractSaveButtonBlock();
    assert.match(block, /disabled=\{saving\}/);
  });
});

describe('AiLeadRescueAdminDetail — form-submit defence-in-depth', () => {
  it('the operator-fields <form> has a no-op preventDefault onSubmit', () => {
    // The form must NEVER use `<form onSubmit={save}>` again — that path was
    // the failure mode that PR #318 fixes. The form's submit handler is a
    // dedicated arrow that just preventDefaults so Enter-key submissions
    // (or anything else) cannot trigger a native browser POST.
    assert.doesNotMatch(
      componentSrc,
      /<form\s+onSubmit=\{save\}/,
      'form must NOT be wired directly to save() — that was the broken wiring',
    );
    assert.match(
      componentSrc,
      /<form[\s\S]{0,200}onSubmit=\{\(e\)\s*=>\s*\{[\s\S]{0,200}e\.preventDefault\(\)/,
      'form onSubmit must be an arrow that calls e.preventDefault() (no-op submit)',
    );
  });
});

describe('AiLeadRescueAdminDetail — save() handler contract', () => {
  // Pull just the save() body for tighter matching.
  const saveStart = componentSrc.indexOf('async function save(e)');
  assert.ok(saveStart > 0, 'save() must exist as an async function');
  const saveEnd = componentSrc.indexOf('\n  }', saveStart);
  const saveSrc = componentSrc.slice(saveStart, saveEnd + 4);

  it('calls e.preventDefault() defensively (works whether dispatched via onClick or onSubmit)', () => {
    assert.match(
      saveSrc,
      /e\s*&&\s*typeof\s+e\.preventDefault\s*===\s*['"]function['"]/,
      'save() must defensively guard the preventDefault call',
    );
  });

  it('emits an immediate "Saving…" status BEFORE awaiting the fetch', () => {
    const setSavingIdx = saveSrc.indexOf('setSaving(true)');
    const setMsgIdx = saveSrc.indexOf("setSavedMsg('Saving…')");
    const fetchIdx = saveSrc.indexOf('await fetch');
    assert.ok(setSavingIdx > 0, 'save() must call setSaving(true)');
    assert.ok(setMsgIdx > 0, 'save() must emit an immediate "Saving…" status');
    assert.ok(fetchIdx > 0, 'save() must call fetch()');
    assert.ok(setSavingIdx < fetchIdx, 'setSaving(true) must run before the fetch');
    assert.ok(setMsgIdx < fetchIdx, 'setSavedMsg("Saving…") must run before the fetch');
  });

  it('is re-entrancy safe (returns early if a save is already in flight)', () => {
    assert.match(
      saveSrc,
      /if\s*\(saving\)\s*return/,
      'save() must short-circuit if another save is already running',
    );
  });

  it('surfaces a structured ID_MISSING error instead of silently no-op when leadId is missing', () => {
    assert.match(
      saveSrc,
      /if\s*\(!leadId\)\s*\{[\s\S]{0,200}setError\(\{[\s\S]{0,200}code:\s*['"]ID_MISSING['"]/,
      'missing leadId must surface an error, never a silent no-op',
    );
  });

  it('clears "Saving…" on error so the operator does not see a stuck spinner', () => {
    // Match literal `setSavedMsg('')` or `setSavedMsg("")` — the clear call.
    const clearCalls = (saveSrc.match(/setSavedMsg\((?:''|"")\)/g) || []).length;
    assert.ok(
      clearCalls >= 2,
      `save() must call setSavedMsg('') in BOTH error paths (got ${clearCalls})`,
    );
  });

  it('sets savedMsg to "Saved." on a successful response', () => {
    assert.match(saveSrc, /setSavedMsg\(['"]Saved\.['"]\)/);
  });
});

describe('AiLeadRescueAdminDetail — error/success render near Save button', () => {
  it('renders DetailErrorBlock inline near the Save button (not only at the top)', () => {
    // The save error block must be inside the form, just above the Save button,
    // not only at the boundary top — so an operator who clicked Save at the
    // bottom of the form cannot miss a failure.
    const formIdx = componentSrc.indexOf('<form');
    const saveBtnIdx = componentSrc.indexOf('data-testid="ai-lead-rescue-save"');
    const slice = componentSrc.slice(formIdx, saveBtnIdx);
    assert.ok(slice.includes('<DetailErrorBlock'), 'an inline DetailErrorBlock must exist inside the form');
  });

  it('renders the savedMsg pill inside the form (above Save button)', () => {
    const formIdx = componentSrc.indexOf('<form');
    const saveBtnIdx = componentSrc.indexOf('data-testid="ai-lead-rescue-save"');
    const slice = componentSrc.slice(formIdx, saveBtnIdx);
    assert.match(slice, /role=["']status["']/);
    assert.match(slice, /\{savedMsg\}/);
  });
});

describe('pages/admin/lead-rescue/[id] — hydration-shape contract', () => {
  it('JSON-round-trips initialLead so SSR and CSR see identical shapes (no Date vs ISO string skew)', () => {
    assert.match(
      pageSrc,
      /initialLead\s*=\s*JSON\.parse\(JSON\.stringify\(result\.lead\)\)/,
      'initialLead must be JSON-roundtripped so Prisma Date fields cannot create a hydration mismatch',
    );
  });

  it('does NOT plumb buildInfo / Vercel commit metadata through the page (PR #328 cleanup)', () => {
    // The 2026-06-06 / 2026-06-08 investigation that ran from PR #319 through
    // PR #327 used a temporary diagnostic panel and Vercel commit/deployment
    // SSR props to verify which build was being served. With the engine-warm
    // root cause fixed in PR #327, the panel and its prop plumbing were
    // removed. These assertions pin that they stay removed — the production
    // page must not accumulate diagnostic scaffolding again.
    assert.doesNotMatch(
      pageSrc,
      /buildInfo/,
      'The page must not pass a buildInfo prop — the diagnostic panel is gone.',
    );
    assert.doesNotMatch(
      pageSrc,
      /VERCEL_GIT_COMMIT_SHA|VERCEL_DEPLOYMENT_ID/,
      'The page must not read Vercel deploy metadata for an in-page diagnostic surface.',
    );
  });
});

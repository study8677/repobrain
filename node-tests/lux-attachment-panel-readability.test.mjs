/**
 * Regression guards for the LuxeMaurice /change attachment panel readability +
 * operator-language cleanup shipped in PR #352 (P0 UX cleanup follow-up to PR #351).
 *
 * The earlier PRs (#348-#351) restored the upload + ATTACHMENTS pipeline. PR #352
 * is a UI language + readability cleanup only:
 *   - Hard-coded grey-on-dark slate values on attachment cards + summary boxes
 *     are swapped for a palette-aware `luxAttachInk` object that uses warm Lux
 *     ivory / charcoal / gold tokens for Lux operators and falls back to the
 *     existing slate palette for non-Lux operators (Core / other tenants).
 *   - Engineering / phase labels visible to operators ("Phase 4D.3", "Phase 4D.4",
 *     "Phase 4D.5", "Phase 4C.2", "Phase 4C.3 / 4D.1 / 4D.2", "client-side filters")
 *     are replaced with plain-English copy that answers the operator's question:
 *     what is this file, is it reviewed, is it linked, is it published, what
 *     should I do next.
 *   - Any remaining cleanup / hard-delete policy notes live inside a collapsed
 *     `<details data-testid="lux-attachment-technical-details">` block.
 *   - Behaviour is unchanged: review/link/publish/archive/restore handlers,
 *     upload API, attachment storage, and public media rules are not touched.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

function readRepo(p) {
  return fs.readFileSync(path.join(ROOT, p), 'utf8');
}

/**
 * Helper — strip JS line comments, block comments, and JSDoc from a source
 * file so the assertion only inspects what could actually render as operator
 * copy. Internal code-comment references to "Phase 4D" / "client-side" remain
 * acceptable; only operator-visible strings are forbidden.
 */
function stripJsComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

test('PR #352 — pages/change.js exposes a palette-aware luxAttachInk helper', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /const luxAttachInk = luxChangeChrome/);
  assert.match(change, /cardBg:\s*luxChangeChrome\.white/);
  assert.match(change, /summaryCellBg:\s*luxChangeChrome\.sand/);
  assert.match(change, /accent:\s*luxChangeChrome\.gold/);
  // Non-Lux operators (Core / other tenants) keep the dark slate fallback.
  assert.match(change, /cardBg:\s*'rgba\(2,6,23,0\.40\)'/);
});

test('PR #352 — no Phase 4C / 4D / 5D labels remain in operator-rendered copy', () => {
  const change = stripJsComments(readRepo('pages/change.js'));
  // None of these engineering labels may appear in operator-facing JSX.
  assert.equal(change.includes('Phase 4D.3'), false, 'Phase 4D.3 must not be visible to operators');
  assert.equal(change.includes('Phase 4D.4'), false, 'Phase 4D.4 must not be visible to operators');
  assert.equal(change.includes('Phase 4D.5'), false, 'Phase 4D.5 must not be visible to operators');
  assert.equal(change.includes('Phase 4C.2'), false, 'Phase 4C.2 must not be visible to operators');
  assert.equal(change.includes('Phase 4C.3 / 4D.1 / 4D.2'), false, 'Phase 4C.3 / 4D.1 / 4D.2 must not be visible');
  assert.equal(change.includes('client-side filters'), false, 'client-side filters must not appear in operator copy');
});

test('PR #352 — "Replace media safely" plain-English guidance is shown', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-replace-guidance"/);
  assert.match(change, /Replace media safely/);
  assert.match(
    change,
    /To replace an image, upload the new file, mark it reviewed, link it to the property, publish it/,
  );
});

test('PR #352 — "Archive or restore this attachment" lifecycle label replaces Phase 4D.3', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-lifecycle-label"/);
  assert.match(change, /Archive or restore this attachment/);
});

test('PR #352 — attachment filter note is plain-English', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-filter-note"/);
  // ridx of HTML-escaped apostrophe (ticket&rsquo;s) — both forms acceptable.
  assert.match(
    change,
    /Filter this ticket(?:&rsquo;s|'s) attachments\. Filters do not change what is public\./,
  );
});

test('PR #352 — public slot label is operator-friendly (no Phase 4C/4D code names)', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-public-slot-label"/);
  assert.match(change, /Public slot &mdash; visible on the LuxeMaurice site when published/);
});

test('PR #352 — "still linked to a public slot" warning replaces Phase 4D.5 hint', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-published-warning"/);
  assert.match(
    change,
    /This file is still linked to a public slot \(hero, gallery, or card\)\. Unpublish it from/,
  );
});

test('PR #352 — link hint replaces Phase 4C.2 jargon with operator guidance', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-link-hint"/);
  assert.match(change, /Link this reviewed file to a property or opportunity/);
});

test('PR #352 — operator-hint copy on smoke/test badges is plain-English', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-badge-note"/);
  assert.match(change, /These badges are operator hints, not security rules/);
});

test('PR #352 — cleanup / hard-delete policy lives inside a collapsed Technical details block', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /<details[\s\S]*?data-testid="lux-attachment-technical-details"/);
  assert.match(change, /<summary[^>]*>\s*Technical details\s*<\/summary>/);
  // The hard-delete policy text remains for audit, just collapsed by default.
  assert.match(change, /This console never permanently deletes attachment bytes\./);
});

test('PR #352 — attachment cards + summary cells use palette tokens, not raw slate hex', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-card"/);
  assert.match(change, /data-testid="lux-attachment-summary-cell"/);
  // The card and summary cell now reach for luxAttachInk tokens.
  assert.match(change, /background: isArchived \? luxAttachInk\.dangerBg : luxAttachInk\.cardBg/);
  assert.match(change, /background: luxAttachInk\.summaryCellBg/);
  assert.match(change, /color: luxAttachInk\.label/);
  assert.match(change, /color: luxAttachInk\.muted/);
});

test('PR #352 — existing review / link / publish / archive / restore behaviour is unchanged', () => {
  const change = readRepo('pages/change.js');
  // These handlers and state names must still exist — UX cleanup must not
  // touch the upload / review / link / publish / archive pipeline.
  assert.match(change, /submitAttachmentReview\(/);
  assert.match(change, /submitAttachmentPropertyLink\(/);
  assert.match(change, /submitAttachmentPropertyPublish\(/);
  assert.match(change, /submitAttachmentPropertyUnpublish\(/);
  assert.match(change, /submitAttachmentArchive\(/);
  assert.match(change, /submitAttachmentRestore\(/);
  assert.match(change, /attachmentReviewBusyId/);
  assert.match(change, /attachmentLinkBusyId/);
  assert.match(change, /attachmentArchiveBusyId/);
  assert.match(change, /attachmentRestoreBusyId/);
  // The end-to-end upload guard added in PR #351 must still be present so
  // sprint tickets keep the relaxed render guard for ATTACHMENTS list.
  assert.match(
    change,
    /selectedTicketId && \(!isEstimateMode \|\| isLuxContentSprintTicketSelected\)/,
  );
});

test('PR #352 — empty-filter state uses operator-friendly copy + palette tokens', () => {
  const change = readRepo('pages/change.js');
  assert.match(change, /data-testid="lux-attachment-filter-empty"/);
  assert.match(
    change,
    /No attachments match this filter\. Choose <strong>All<\/strong> or another filter to see items again\./,
  );
});

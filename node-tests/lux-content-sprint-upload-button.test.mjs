/**
 * P0 regression guard for the LuxeMaurice Content Population Sprint Upload content
 * button (PR #348 follow-up to PR #347).
 *
 * After PR #347 shipped, the new "Upload content" button on the C1–C4 sprint
 * tickets rendered as a static, non-clickable div because `pages/change.js`
 * passed no `onUploadClick` handler to `<LuxContentSprintPanel>`. PR #348 wires
 * the button to a real handler that scrolls to and focuses the existing
 * `POST /api/change-attachment/upload` UI inside `pages/change.js`.
 *
 * These tests guard:
 *   - The panel renders a real `<button>` when a handler is provided.
 *   - The panel falls back to the static affordance when no handler is provided.
 *   - `pages/change.js` wires the handler + exposes a stable upload anchor.
 *   - `pages/change.js` reuses the existing governed `POST /api/change-attachment/upload`
 *     endpoint (no second upload system, no public route).
 *   - Unavailable-state messaging is non-silent (alert + status text).
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

test('LuxContentSprintPanel renders a real <button> when onUploadClick is provided', () => {
  const src = readRepo('components/LuxContentSprintPanel.js');
  // Pre-PR #348 the file already had the branch — guard the *button branch*
  // exists and uses the handler.
  assert.match(
    src,
    /typeof onUploadClick === 'function' \? \(\s*\n\s*<button[\s\S]*?onClick=\{onUploadClick\}/m,
    'button branch must render a real <button onClick={onUploadClick}>',
  );
  assert.match(src, /data-testid="lux-content-sprint-upload-cta"/);
});

test('LuxContentSprintPanel still has a static fallback when no handler is provided', () => {
  const src = readRepo('components/LuxContentSprintPanel.js');
  assert.match(src, /data-testid="lux-content-sprint-upload-cta-static"/);
});

test('pages/change.js wires onUploadClick on the Content sprint panel', () => {
  const src = readRepo('pages/change.js');
  assert.match(
    src,
    /<LuxContentSprintPanel[\s\S]*?onUploadClick=\{handleSprintUploadContentClick\}[\s\S]*?\/>/m,
    'LuxContentSprintPanel must receive onUploadClick={handleSprintUploadContentClick}',
  );
});

test('pages/change.js defines handleSprintUploadContentClick with scroll + focus + unavailable fallback', () => {
  const src = readRepo('pages/change.js');
  assert.match(src, /function handleSprintUploadContentClick\(\)/);
  // Must scroll to the upload section.
  assert.match(src, /section\.scrollIntoView\(/);
  // Must focus the file input.
  assert.match(src, /input\.focus\(/);
  // Must NOT silently no-op when the section is missing: alert + status text.
  assert.match(src, /Upload area is not available right now/);
  assert.match(src, /window\?\.alert\?\.\(/);
});

test('pages/change.js exposes a stable upload anchor id + testid for the sprint button to target', () => {
  const src = readRepo('pages/change.js');
  // Both id and data-testid present per the brief.
  assert.match(src, /id="lux-ticket-attachment-upload"/);
  assert.match(src, /data-testid="lux-ticket-attachment-upload"/);
  // The hidden ref + file input are wired.
  assert.match(src, /ref=\{luxAttachmentUploadSectionRef\}/);
  assert.match(src, /ref=\{luxAttachmentUploadInputRef\}/);
  assert.match(src, /data-testid="lux-ticket-attachment-upload-input"/);
});

test('pages/change.js uploads through the existing governed endpoint (no second upload system)', () => {
  const src = readRepo('pages/change.js');
  // Single canonical endpoint — no new route, no /api/lux/*-upload variant.
  assert.match(
    src,
    /fetch\(\s*'\/api\/change-attachment\/upload'/,
    'must POST to the existing /api/change-attachment/upload endpoint',
  );
  // The handler must use the same loader used elsewhere so the attachments list refreshes.
  assert.match(src, /await loadAttachmentsForTicket\(ticketId\)/);
});

test('pages/change.js client-side pre-check matches the documented server allowlist (no allowlist drift)', () => {
  const src = readRepo('pages/change.js');
  // Server allowlist default (lib/server/change-attachments.js): image/,video/,application/pdf.
  assert.match(src, /LUX_UPLOAD_ALLOWED_MIME_PREFIXES = \['image\/', 'video\/'\]/);
  assert.match(src, /LUX_UPLOAD_ALLOWED_MIME_EXACT = \['application\/pdf'\]/);
});

test('pages/change.js surfaces a non-silent error if the operator picks an oversize / wrong-type file', () => {
  const src = readRepo('pages/change.js');
  assert.match(src, /setUploadStatus\(/);
  assert.match(src, /setUploadStatusKind\('error'\)/);
  assert.match(src, /data-testid="lux-ticket-attachment-upload-status"/);
  // Pre-check messaging mentions the limit + the supported types so the operator
  // gets immediate guidance.
  assert.match(src, /File is too large for this upload/);
  assert.match(src, /Unsupported file type/);
});

test('pages/change.js reuses one shared FileReader-based base64 helper (single upload path)', () => {
  const src = readRepo('pages/change.js');
  assert.match(src, /function readFileAsBase64\(file\)/);
  assert.match(src, /async function uploadFileToTicket\(ticketId, file\)/);
});

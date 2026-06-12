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

test('pages/change.js defines handleSprintUploadContentClick with scroll + focus + click + unavailable fallback', () => {
  const src = readRepo('pages/change.js');
  assert.match(src, /function handleSprintUploadContentClick\(\)/);
  // Must scroll to the upload section.
  assert.match(src, /section\.scrollIntoView\(/);
  // Must focus the file input.
  assert.match(src, /input\.focus\(/);
  // PR #349 (P0 follow-up to PR #348): must trigger the OS file picker directly,
  // not only scroll/focus. Option (b) from the brief: trigger existing file input
  // click. This works because the handler is inside the user-gesture click.
  assert.match(src, /input\.click\(\)/);
  // Must NOT silently no-op when the section is missing: alert + status text.
  assert.match(src, /Upload area is not available right now/);
  assert.match(src, /window\?\.alert\?\.\(/);
});

test('PR #349 regression guard: upload section renders without the !showIntakeSurface gate', () => {
  const src = readRepo('pages/change.js');
  // The Upload to this ticket section must NOT be gated on `!showIntakeSurface`.
  // Sprint child tickets C1–C4 sit in Intake by design (created by PR #345), so
  // any guard that includes `!showIntakeSurface` here will silently hide the
  // section and make the "Upload content" button reach the unavailable fallback.
  const ANCHOR = 'id="lux-ticket-attachment-upload"';
  const idx = src.indexOf(ANCHOR);
  assert.ok(idx > 0, 'Upload section anchor must be present');
  // The opening JSX condition is at most ~600 chars before the anchor.
  const windowStart = Math.max(0, idx - 1200);
  const preceding = src.slice(windowStart, idx);
  // Walk backwards to find the most recent `{...selectedTicketId... ? (` opener.
  const openerRe = /\{[^{}\n]*selectedTicketId[^{}\n]*\?\s*\(/g;
  let lastMatch = null;
  let m;
  while ((m = openerRe.exec(preceding)) !== null) {
    lastMatch = m;
  }
  assert.ok(lastMatch, 'Could not locate the JSX conditional that gates the upload section');
  const condition = lastMatch[0];
  assert.doesNotMatch(
    condition,
    /!\s*showIntakeSurface/,
    `Upload section conditional must not gate on !showIntakeSurface; got: ${condition}`,
  );
  // The condition must still respect estimate mode (but sprint tickets bypass it).
  assert.match(condition, /isEstimateMode/);
});

test('PR #350: upload section renders unconditionally when a sprint ticket is selected', () => {
  const src = readRepo('pages/change.js');
  // The JSX conditional that opens the upload section must include
  // `isLuxContentSprintTicketSelected` so that ANY sprint ticket renders the
  // section regardless of `isEstimateMode` (or any future guard that creeps in).
  const ANCHOR = 'id="lux-ticket-attachment-upload"';
  const idx = src.indexOf(ANCHOR);
  assert.ok(idx > 0, 'Upload section anchor must be present');
  const windowStart = Math.max(0, idx - 1200);
  const preceding = src.slice(windowStart, idx);
  const openerRe = /\{[^{}\n]*selectedTicketId[^{}\n]*\?\s*\(/g;
  let lastMatch = null;
  let m;
  while ((m = openerRe.exec(preceding)) !== null) {
    lastMatch = m;
  }
  assert.ok(lastMatch, 'Could not locate the JSX conditional that gates the upload section');
  const condition = lastMatch[0];
  assert.match(
    condition,
    /isLuxContentSprintTicketSelected/,
    `Upload section conditional must include isLuxContentSprintTicketSelected so sprint tickets always render; got: ${condition}`,
  );
});

test('PR #350: file input carries stable id="lux-ticket-attachment-upload-input" and name attribute', () => {
  const src = readRepo('pages/change.js');
  // Stable id + name on the file input give us:
  //   (a) a deterministic `document.getElementById` fallback when the React ref
  //       isn't attached for any reason, and
  //   (b) a fix for the secondary "form field missing id/name" browser warning.
  assert.match(src, /id="lux-ticket-attachment-upload-input"/);
  assert.match(src, /name="lux-ticket-attachment-upload-input"/);
});

test('PR #350: handleSprintUploadContentClick falls back to document.getElementById when React refs are null', () => {
  const src = readRepo('pages/change.js');
  assert.match(
    src,
    /document\.getElementById\('lux-ticket-attachment-upload-input'\)/,
    'Must fall back to document.getElementById for the input',
  );
  assert.match(
    src,
    /document\.getElementById\('lux-ticket-attachment-upload'\)/,
    'Must fall back to document.getElementById for the section anchor',
  );
});

test('PR #350: emits a diagnostic console.warn when the fallback path is reached', () => {
  const src = readRepo('pages/change.js');
  // Operator-pasteable diagnostic so we can debug any future regression from
  // production console output alone. Must include the upload-tag prefix.
  assert.match(src, /\[lux-upload\] Upload area is not in the DOM/);
});

// --- PR #351: end-to-end upload pipeline regression guards ---

test('PR #351: ATTACHMENTS list renders for sprint tickets (mirrors PR #350 upload-section bypass)', () => {
  const src = readRepo('pages/change.js');
  // Locate the per-ticket ATTACHMENTS list collapsible — identified by its summary.
  const SUMMARY = 'summary="This ticket · attachments, review, link, publish"';
  const idx = src.indexOf(SUMMARY);
  assert.ok(idx > 0, 'ATTACHMENTS list section must be present');
  // Walk backwards to find the JSX conditional that gates this section.
  const windowStart = Math.max(0, idx - 1500);
  const preceding = src.slice(windowStart, idx);
  const openerRe = /\{[^{}\n]*selectedTicketId[^{}\n]*\?\s*\(/g;
  let lastMatch = null;
  let m;
  while ((m = openerRe.exec(preceding)) !== null) {
    lastMatch = m;
  }
  assert.ok(lastMatch, 'Could not locate the JSX conditional that gates the ATTACHMENTS list');
  const condition = lastMatch[0];
  // The ATTACHMENTS list MUST include the sprint-ticket bypass so the operator
  // can see the uploaded row on C1–C4 tickets. PR #351 root cause:
  // intake-stage sprint tickets had `!showIntakeSurface === false`, so the list
  // was never rendered and the operator concluded "the file was dropped".
  assert.match(
    condition,
    /isLuxContentSprintTicketSelected/,
    `ATTACHMENTS list conditional must include isLuxContentSprintTicketSelected (sprint bypass); got: ${condition}`,
  );
  assert.doesNotMatch(
    condition,
    /!\s*showIntakeSurface\s*&&\s*!\s*isEstimateMode\s*&&\s*selectedTicketId\s*&&\s*attachments\.length\s*>\s*0/,
    `ATTACHMENTS list conditional must not be the legacy intake-blocked form; got: ${condition}`,
  );
});

test('PR #351: handleAttachmentUploadInputChange routes selected file into uploadFileToTicket', () => {
  const src = readRepo('pages/change.js');
  assert.match(src, /function handleAttachmentUploadInputChange\(e\)/);
  // Must read the FIRST file from the change event and pass the ticketId through.
  assert.match(src, /const files = e\?\.target\?\.files;/);
  assert.match(
    src,
    /uploadFileToTicket\(ticketId,\s*files\[0\]\);/,
    'must call uploadFileToTicket(ticketId, files[0])',
  );
  // Must derive the ticket id from selectedTicketId with attachmentsTicketId fallback.
  assert.match(src, /String\(selectedTicketId \|\| attachmentsTicketId \|\| ''\)\.trim\(\);/);
});

test('PR #351: uploadFileToTicket sends the exact payload contract /api/change-attachment/upload expects', () => {
  const src = readRepo('pages/change.js');
  // Single canonical endpoint.
  assert.match(src, /fetch\(\s*'\/api\/change-attachment\/upload'/);
  // Method, credentials, content-type.
  assert.match(src, /method:\s*'POST'/);
  assert.match(src, /credentials:\s*'include'/);
  assert.match(src, /'Content-Type':\s*'application\/json'/);
  // All four required body fields per lib/server/change-attachments.js.
  assert.match(src, /ticket_id:\s*ticketId/);
  assert.match(src, /file_name:\s*String\(file\.name \|\| 'upload\.bin'\)\.slice\(0, 240\)/);
  assert.match(src, /content_type:\s*contentType/);
  assert.match(src, /data_base64,/);
});

test('PR #351: successful upload calls loadAttachmentsForTicket(ticketId) before settling', () => {
  const src = readRepo('pages/change.js');
  // The refresh must use the SAME ticketId that the POST targeted (no stale state).
  assert.match(src, /await loadAttachmentsForTicket\(ticketId\)/);
  // Diagnostic line must include the refreshed count for operator debugging.
  assert.match(src, /\[lux-upload\] refreshed attachments for ticket=/);
});

test('PR #351: successful upload surfaces a green status + in-section "Just uploaded" confirmation', () => {
  const src = readRepo('pages/change.js');
  // Status pill uses the OK kind on success.
  assert.match(src, /setUploadStatusKind\(warn \? 'info' : 'ok'\)/);
  assert.match(src, /Uploaded and available on this ticket/);
  // In-section "Just uploaded" line so the operator never depends only on the
  // (potentially below-the-fold) ATTACHMENTS list for confirmation.
  assert.match(src, /setLastUploadedAttachment\(\{/);
  assert.match(src, /data-testid="lux-ticket-attachment-upload-last"/);
  assert.match(src, /Just uploaded:/);
});

test('PR #351: failed upload surfaces the verbatim server error in the status pill (no silent drop)', () => {
  const src = readRepo('pages/change.js');
  // HTTP error path must include the status code AND the server-supplied error text.
  assert.match(src, /Upload failed \(HTTP \$\{r\.status\}\): \$\{err\}/);
  // Network error path must be distinct from HTTP error path.
  assert.match(src, /Upload failed: network error \(\$\{msg\}\)/);
  // Any caught exception must surface the message text, never swallow.
  assert.match(src, /setUploadStatus\(`Upload failed: \$\{msg\}`\);/);
  // Error pill kind is 'error' so the operator sees the red treatment.
  assert.match(src, /setUploadStatusKind\('error'\);/);
});

test('PR #351: file input value resets in finally so the operator can re-pick the same file', () => {
  const src = readRepo('pages/change.js');
  // The reset MUST be in the finally block (covers both success AND failure).
  assert.match(src, /\}\s*finally\s*\{[\s\S]*?inp\.value = '';[\s\S]*?\}/m);
  // Reset must use the React ref first, with a document.getElementById fallback so
  // a re-pick still works even if the ref isn't attached (matches PR #350 pattern).
  assert.match(src, /luxAttachmentUploadInputRef\.current \|\|[\s\S]*?document\.getElementById\('lux-ticket-attachment-upload-input'\)/);
});

test('PR #351: small valid image/PDF is NOT rejected client-side (lenient MIME + tolerant of empty file.type)', () => {
  const src = readRepo('pages/change.js');
  // Empty/unknown file.type must pass the client check; server enforces the
  // canonical allowlist. This fixes the false-negative on Windows file pickers
  // that hand back `file.type === ''` for legitimate images.
  assert.match(
    src,
    /if \(!ct\) return true; \/\/ tolerate unknown/,
    'clientMimeAllowed must return true for empty/unknown content types so the server allowlist is authoritative',
  );
});

test('PR #351: pipeline emits structured [lux-upload] diagnostics at each step', () => {
  const src = readRepo('pages/change.js');
  // File picked / sent to handler.
  assert.match(src, /\[lux-upload\] picked file name=%s size=%s type=%s ticket=%s/);
  // Pre-fetch POST line so operators see what hit the wire.
  assert.match(src, /\[lux-upload\] POST \/api\/change-attachment\/upload ticket=/);
  // Server response (status + truncated body).
  assert.match(src, /\[lux-upload\] response status=/);
  // Refresh count after success.
  assert.match(src, /\[lux-upload\] refreshed attachments for ticket=/);
  // Empty FileReader result diagnostic.
  assert.match(src, /\[lux-upload\] FileReader returned empty result/);
  // Network error diagnostic.
  assert.match(src, /\[lux-upload\] network error/);
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

/**
 * Pure helpers for the 2026-06-11 LuxeMaurice operator queue cleanup packet.
 *
 * These helpers are intentionally side-effect-free (no Prisma, no env reads, no fs):
 *   - `TARGET_TICKETS`     — the exact 18 Phase 4C.1 attachment-review smoke / test
 *                             artifact ticket ids on the `luxe-maurice` tenant, taken
 *                             from `scripts/lux-queue-audit.mjs` output on 2026-06-11.
 *   - `PROTECTED_TICKETS`  — the master strategic programme ticket
 *                             `cmo8mjijk0000jl04l1jz0v6d` and the active content sprint
 *                             parent `cmqa2y2ga0000l704glnfro1f`. Must NEVER appear in
 *                             `TARGET_TICKETS`, and the cleanup script must refuse to
 *                             run if they do.
 *   - `preWriteCheck(row)` — per-row pre-write validation: tenant lock, status not
 *                             already Closed, title/description matches the Phase 4C.1
 *                             attachment-review smoke heuristic, stage/workflow_state
 *                             still non-terminal.
 *   - `applyHardCloseAndAppendMessage(consoleJson, nowIso)` — applies the canonical
 *                             `buildHardCloseConsoleJsonPatch` (so `client_view.workflow_state`
 *                             becomes `'closed'` with the same closure record the rest of
 *                             the repo uses for hard-closes) AND appends one assistant-role
 *                             closure message to `consoleJson.messages[]`, preserving every
 *                             prior message exactly.
 *
 * Tests live in `node-tests/lux-phase4c1-smoke-cleanup.test.mjs`.
 *
 * Tenant: `luxe-maurice`. Other tenants must not be touched by the cleanup script.
 */

import { buildHardCloseConsoleJsonPatch } from './ticket-hard-close-core.js';

export const LUX_TENANT_ID = 'luxe-maurice';

export const PROTECTED_TICKETS = Object.freeze([
  'cmo8mjijk0000jl04l1jz0v6d',
  'cmqa2y2ga0000l704glnfro1f',
]);

export const TARGET_TICKETS = Object.freeze([
  'cmp50bue90000js04rlqa0r7i',
  'cmp4yqdyd0000lb04m2qq3uyw',
  'cmp3lbcsx0000ih04iz7rwvfp',
  'cmp37wy1y0000ju04yy8ulkf5',
  'cmp2pavon0005l704fnc0o91f',
  'cmp2p8c4x0000js048eob9o8z',
  'cmp2l2o26000hl504qz1qf1pm',
  'cmp2l1g950000l70483fvjr43',
  'cmp0z0a340000ks04imsg5jnu',
  'cmp0vw6n90000kz04czf830g3',
  'cmp0u5nv50000l504r2zrjgjq',
  'cmp0rib6e0000l504f0ypkghb',
  'cmp0p5w0s0000kz0464ay60ks',
  'cmp0oy7uw0000jr046cj73p6b',
  'cmoy3oelf0000kz043zdfnqvf',
  'cmoy2uzrr0000jp04d88tkznw',
  'cmowqpyow0000jo04gjjaqwcu',
  'cmov9fs050000kz04070wi23k',
]);

/**
 * Narrow per-id signature for historical operator test drafts that are NOT Phase 4C.1
 * attachment-review smoke artifacts but are still safe to close as part of the same
 * cleanup packet. Inspection on 2026-06-11 (`scripts/lux-ticket-inspect.mjs`) shows the
 * row described below is a one-off operator test draft from 2026-05-07 with no client
 * value, no messages, and no attachments. The script will only accept this row if
 * every expected field still matches exactly — otherwise it refuses.
 *
 * @type {ReadonlyMap<string, {
 *   expected_title_exact: string,
 *   expected_description_exact: string,
 *   max_message_count: number,
 *   max_attachment_count: number,
 *   rationale: string,
 * }>}
 */
export const KNOWN_OPERATOR_TEST_DRAFTS = new Map([
  [
    'cmov9fs050000kz04070wi23k',
    {
      expected_title_exact: 'Make changes to the website appearance',
      expected_description_exact: "Let's test this function",
      max_message_count: 0,
      max_attachment_count: 0,
      rationale:
        '2026-05-07 operator test draft (intake-form smoke). Title is the default operator-intake placeholder; description literally reads "Let\'s test this function" (24 chars); no messages; no attachments.',
    },
  ],
]);

export const CLOSURE_REASON =
  'LuxeMaurice operator queue cleanup — historical Phase 4C.1 attachment-review smoke / test artifact (no client value).';

export const CLOSURE_CONTEXT =
  'Closed during 2026-06-11 LuxeMaurice operator queue cleanup — historical Phase 4C.1 smoke/test artifact. Audit history, attachments, and messages preserved. Master programme cmo8mjijk0000jl04l1jz0v6d remains open; active content sprint parent cmqa2y2ga0000l704glnfro1f remains open.';

export const CLOSURE_MESSAGE_CONTENT =
  'Closed during 2026-06-11 LuxeMaurice operator queue cleanup — historical Phase 4C.1 smoke/test artifact. Audit history, attachments, and messages preserved.';

export const CLOSURE_MESSAGE_SOURCE = 'lux-queue-cleanup-2026-06-11';

const SMOKE_PATTERN =
  /Phase\s*4C\.1\s*attachment\s*review\s*smoke\s*test|Phase\s*4C\s*attachment\s*review\s*smoke|attachment\s*review\s*smoke\s*test/i;

function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
}

/**
 * Refuses to proceed if any protected ticket id appears in the target list, or if the
 * target list is not exactly the audited 18 ids.
 *
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function preflightConfigCheck() {
  if (TARGET_TICKETS.length !== 18) {
    return { ok: false, reason: `target-count-not-18:${TARGET_TICKETS.length}` };
  }
  for (const id of PROTECTED_TICKETS) {
    if (TARGET_TICKETS.includes(id)) {
      return { ok: false, reason: `protected-ticket-in-target-set:${id}` };
    }
  }
  const set = new Set(TARGET_TICKETS);
  if (set.size !== TARGET_TICKETS.length) {
    return { ok: false, reason: 'duplicate-target-ticket' };
  }
  return { ok: true };
}

/**
 * Pre-write validation for a single row. Conservative: any failed check returns a refusal,
 * and the caller (CLI) must abort the whole run on any non-`already-closed` refusal.
 *
 * @param {{ id: string, tenantId?: string|null, status?: string|null, stage?: string|null, title?: string|null, description?: string|null, consoleJson?: unknown }} row
 * @returns {{ ok: true } | { ok: false, reason: string }}
 */
export function preWriteCheck(row) {
  if (!row || typeof row !== 'object') {
    return { ok: false, reason: 'missing-row' };
  }
  if (PROTECTED_TICKETS.includes(row.id)) {
    return { ok: false, reason: `protected-ticket-in-target-set:${row.id}` };
  }
  if (String(row.tenantId || '') !== LUX_TENANT_ID) {
    return { ok: false, reason: `wrong-tenant:${row.tenantId || 'null'}` };
  }
  if (String(row.status || '').toLowerCase() === 'closed') {
    return { ok: false, reason: 'already-closed' };
  }
  const description = String(row.description || '').trim();
  const title = String(row.title || '').trim();
  const cj = asObj(row.consoleJson);
  const matchesPhase4c1 = SMOKE_PATTERN.test(description) || SMOKE_PATTERN.test(title);
  const draftSig = KNOWN_OPERATOR_TEST_DRAFTS.get(String(row.id));
  if (!matchesPhase4c1) {
    if (!draftSig) {
      return { ok: false, reason: 'description-does-not-match-phase4c1-smoke-heuristic' };
    }
    if (title !== draftSig.expected_title_exact) {
      return {
        ok: false,
        reason: `operator-test-draft-title-mismatch:${JSON.stringify(title).slice(0, 80)}`,
      };
    }
    if (description !== draftSig.expected_description_exact) {
      return {
        ok: false,
        reason: `operator-test-draft-description-mismatch:${JSON.stringify(description).slice(0, 80)}`,
      };
    }
    const msgs = Array.isArray(cj.messages) ? cj.messages : [];
    if (msgs.length > draftSig.max_message_count) {
      return { ok: false, reason: `operator-test-draft-message-count-too-high:${msgs.length}` };
    }
    const attachments = Array.isArray(asObj(cj.lux_request_meta).attachments)
      ? asObj(cj.lux_request_meta).attachments
      : [];
    if (attachments.length > draftSig.max_attachment_count) {
      return { ok: false, reason: `operator-test-draft-attachment-count-too-high:${attachments.length}` };
    }
  }
  const cv = asObj(cj.client_view);
  const workflow = String(cv.workflow_state || '').toLowerCase();
  if (workflow === 'closed' || workflow === 'published' || workflow === 'discarded') {
    return { ok: false, reason: `workflow-already-terminal:${workflow}` };
  }
  const stage = String(row.stage || '').toLowerCase();
  if (stage === 'closed' || stage === 'discarded') {
    return { ok: false, reason: `stage-already-terminal:${stage}` };
  }
  return { ok: true };
}

/**
 * Build the new `consoleJson` for a hard-close: applies the canonical hard-close patch
 * (so `client_view.workflow_state='closed'` etc.) and appends one assistant-role closure
 * message to `messages[]` without modifying any prior message.
 *
 * @param {unknown} consoleJson
 * @param {string} nowIso
 * @returns {Record<string, unknown>}
 */
export function applyHardCloseAndAppendMessage(consoleJson, nowIso) {
  const merged = buildHardCloseConsoleJsonPatch(consoleJson, {
    reason: CLOSURE_REASON,
    contextNote: CLOSURE_CONTEXT,
    nowIso,
  });
  const prevMessages = Array.isArray(asObj(consoleJson).messages) ? asObj(consoleJson).messages : [];
  const closureMessage = {
    ts: nowIso,
    role: 'assistant',
    content: CLOSURE_MESSAGE_CONTENT,
    source: CLOSURE_MESSAGE_SOURCE,
  };
  return {
    ...merged,
    messages: [...prevMessages, closureMessage],
  };
}

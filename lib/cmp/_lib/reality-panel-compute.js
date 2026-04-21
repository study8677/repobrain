/**
 * Operator Console — Reality Panel: derived truth, contradictions, single blocker, single next action.
 * No raw JSON in the UI; this module returns display-ready strings and enums only.
 */

import { buildTenantSiteJsonForTenantId } from '../../server/tenant-site-public.js';
import {
  LUX_STATIC_DEFAULT_HERO_UNSPLASH_SUBSTR,
  isDefaultUnsplashFallbackUrl,
} from '../../server/delivery-integrity-visual.js';
import { resolveChangeTypeFromConsoleJson, shouldApplyVisualDeliveryGate } from '../../server/change-type-classification.js';

/** @typedef {'VALID' | 'MISLEADING' | 'MISSING'} PreviewTruth */

const PREVIEW_FETCH_MS = 10_000;

/**
 * @param {string} url
 * @returns {Promise<{ ok: boolean, status: number, snippet: string }>}
 */
async function fetchPreviewSnippet(url) {
  const u = String(url || '').trim();
  if (!u) return { ok: false, status: 0, snippet: '' };
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), PREVIEW_FETCH_MS);
  try {
    const r = await fetch(u, {
      method: 'GET',
      redirect: 'follow',
      signal: ac.signal,
      headers: {
        Accept: 'text/html,application/xhtml+xml',
        'User-Agent': 'CorpFlow-RealityPanel/1.0',
      },
    });
    const txt = await r.text();
    const snippet = String(txt || '').slice(0, 96_000);
    return { ok: r.ok, status: r.status, snippet };
  } catch {
    return { ok: false, status: 0, snippet: '' };
  } finally {
    clearTimeout(t);
  }
}

/**
 * @param {Record<string, unknown>} cj
 * @param {string} ticketId
 * @returns {boolean}
 */
function heroEvidenceForTicket(cj, ticketId) {
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const di = cv.delivery_integrity && typeof cv.delivery_integrity === 'object' ? cv.delivery_integrity : {};
  const last = di.last_hero_image_url != null ? String(di.last_hero_image_url) : '';
  if (last && ticketId && last.includes(`cmp-tickets/${ticketId}/`)) return true;
  if (last && ticketId && last.includes(ticketId)) return true;
  return false;
}

/**
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ id: string; tenantId?: string | null; consoleJson?: unknown; status?: string | null; stage?: string | null }} ticketRow
 * @returns {Promise<Record<string, unknown>>}
 */
export async function computeRealityPanel(prisma, ticketRow) {
  const ticketId = String(ticketRow.id || '').trim();
  const cj = ticketRow.consoleJson && typeof ticketRow.consoleJson === 'object' ? ticketRow.consoleJson : {};
  const brief = cj.brief && typeof cj.brief === 'object' ? cj.brief : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const auto = cv.automation && typeof cv.automation === 'object' ? cv.automation : {};
  const prom = cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
  const overseer = cj.overseer && typeof cj.overseer === 'object' ? cj.overseer : {};

  const requestedChange =
    typeof brief.requested_change === 'string' && brief.requested_change.trim()
      ? brief.requested_change.trim()
      : typeof brief.summary === 'string' && brief.summary.trim()
        ? brief.summary.trim()
        : '—';

  let intendedOutcomes = [];
  if (Array.isArray(brief.intended_outcomes) && brief.intended_outcomes.length) {
    intendedOutcomes = brief.intended_outcomes.map((x) => String(x || '').trim()).filter(Boolean);
  } else if (Array.isArray(brief.acceptance_criteria)) {
    intendedOutcomes = brief.acceptance_criteria.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 12);
  }

  const tenantId = ticketRow.tenantId != null ? String(ticketRow.tenantId).trim() : '';

  let attachmentCount = 0;
  try {
    attachmentCount = await prisma.cmpTicketAttachment.count({ where: { ticketId } });
  } catch {
    attachmentCount = 0;
  }

  const previewUrl =
    typeof auto.client_site_preview_url === 'string' && auto.client_site_preview_url.trim()
      ? auto.client_site_preview_url.trim()
      : typeof auto.preview_url === 'string' && auto.preview_url.trim()
        ? auto.preview_url.trim()
        : '';

  const prUrl = typeof prom.pr_url === 'string' && prom.pr_url.trim() ? prom.pr_url.trim() : '';
  const branchName =
    typeof overseer.branch_name === 'string' && overseer.branch_name.trim()
      ? overseer.branch_name.trim()
      : typeof auto.branch_name === 'string' && auto.branch_name.trim()
        ? auto.branch_name.trim()
        : '';

  const di = cv.delivery_integrity && typeof cv.delivery_integrity === 'object' ? cv.delivery_integrity : {};
  const lastHero =
    di.last_hero_image_url != null && String(di.last_hero_image_url).trim()
      ? String(di.last_hero_image_url).trim()
      : '';
  const blockReason = di.last_block_reason != null ? String(di.last_block_reason).trim() : '';
  const visualEval = di.visual_gate_evaluated === true;

  /** @type {{ hero_image_url: string | null }} */
  let prodHero = { hero_image_url: null };
  if (tenantId) {
    try {
      const built = await buildTenantSiteJsonForTenantId(prisma, tenantId);
      const site = built.site && typeof built.site === 'object' ? built.site : {};
      const media = site.media && typeof site.media === 'object' ? site.media : {};
      const h = media.hero_image_url != null ? String(media.hero_image_url).trim() : '';
      prodHero = { hero_image_url: h || null };
    } catch {
      prodHero = { hero_image_url: null };
    }
  }

  const resolvedType = resolveChangeTypeFromConsoleJson(cj);
  const visualGateApplies = shouldApplyVisualDeliveryGate(resolvedType);

  const exists = {
    hero_image_url: lastHero || prodHero.hero_image_url || null,
    production_hero_url: prodHero.hero_image_url,
    preview_url: previewUrl || null,
    pr_url: prUrl || null,
    branch: branchName || null,
    attachment_count: attachmentCount,
  };

  const missing = [];
  const mi = Array.isArray(brief.missing_information)
    ? brief.missing_information.map((x) => String(x || '').trim()).filter(Boolean)
    : [];
  for (const m of mi) missing.push({ kind: 'brief_question', text: m });

  if (!previewUrl && (String(cv.workflow_state || '').includes('build') || auto.dispatch_ok === true)) {
    missing.push({ kind: 'preview', text: 'No preview URL on ticket automation yet.' });
  }

  const prOpen = typeof prom.pr_state === 'string' && prom.pr_state.toLowerCase() === 'open';
  const promMerged = prom.merged === true || (prom.merged_at != null && String(prom.merged_at).trim());
  if (prUrl && prOpen && !promMerged) {
    missing.push({ kind: 'promotion', text: 'Pull request is open — not merged to production path.' });
  }

  /** @type {PreviewTruth} */
  let previewTruth = 'MISSING';
  let previewTruthDetail = '';

  if (!previewUrl) {
    previewTruth = 'MISSING';
    previewTruthDetail = 'No client preview URL recorded on this ticket.';
  } else if (cv.client_preview_blocked_message || blockReason) {
    previewTruth = 'MISLEADING';
    previewTruthDetail =
      'Preview was blocked or integrity failed — URL may exist but is not safe to treat as real delivery.';
  } else {
    const fetched = await fetchPreviewSnippet(previewUrl);
    if (!fetched.ok || fetched.status >= 400) {
      previewTruth = 'MISLEADING';
      previewTruthDetail = `Preview URL did not return a reliable HTML page (HTTP ${fetched.status || 'error'}). Often auth, protection, or network — do not trust as visual proof.`;
    } else if (fetched.snippet.includes(LUX_STATIC_DEFAULT_HERO_UNSPLASH_SUBSTR)) {
      previewTruth = 'MISLEADING';
      previewTruthDetail = 'Fetched preview HTML still contains the default Unsplash hero pattern — likely fallback, not tenant-specific delivery.';
    } else {
      previewTruth = 'VALID';
      previewTruthDetail = 'Preview URL returned HTML without obvious default-hero fallback markers.';
    }
  }

  let deliveryIntegrityStatus = 'UNKNOWN';
  let deliveryIntegrityDetail = 'Delivery integrity has not been evaluated for this change type or tenant.';
  if (visualGateApplies) {
    if (!visualEval) {
      deliveryIntegrityStatus = 'UNKNOWN';
      deliveryIntegrityDetail = 'Visual gate not run yet — run build/preview sync or wait for automation.';
    } else if (blockReason) {
      deliveryIntegrityStatus = 'FAIL';
      deliveryIntegrityDetail = `Blocked: ${blockReason}`;
    } else if (lastHero && !isDefaultUnsplashFallbackUrl(lastHero)) {
      deliveryIntegrityStatus = 'PASS';
      deliveryIntegrityDetail = 'Recorded hero URL is present and not the static default marker.';
    } else {
      deliveryIntegrityStatus = 'FAIL';
      deliveryIntegrityDetail = 'No trustworthy hero recorded for visual delivery.';
    }
  } else {
    deliveryIntegrityStatus = 'N/A';
    deliveryIntegrityDetail = 'Non-visual ticket — hero integrity checks are not required.';
  }

  const contradictions = [];

  const mode = typeof cj.mode === 'string' ? String(cj.mode).trim() : '';
  const pendingDraft = cj.pending_operator_draft && typeof cj.pending_operator_draft === 'object' ? cj.pending_operator_draft : null;
  const hasPendingDraft = pendingDraft && pendingDraft.content != null && String(pendingDraft.content).trim();
  const escReasons = Array.isArray(cj.operator_escalation_reasons) ? cj.operator_escalation_reasons : [];
  const escEvidence = cj.operator_escalation && typeof cj.operator_escalation === 'object' ? cj.operator_escalation : null;
  const escalationActive = mode === 'operator_assisted' || Boolean(hasPendingDraft) || escReasons.length > 0 || Boolean(escEvidence);

  if (previewUrl && previewTruth === 'MISLEADING') {
    contradictions.push('Preview exists but content looks like fallback, blocked, or unverifiable — not proof of delivery.');
  }

  if (escalationActive) {
    contradictions.push('Operator-assisted mode active — AI response withheld pending approval.');
  }

  if (mi.length > 0 && (heroEvidenceForTicket(cj, ticketId) || attachmentCount > 0)) {
    contradictions.push('System still lists missing_information while assets or hero evidence already exist — stale refinement.');
  }

  const wf = String(cv.workflow_state || '').toLowerCase();
  const claimsProgress =
    ['published', 'ready_for_client', 'preview_ready', 'client_approved', 'in_review'].includes(wf) ||
    String(cv.progress_message || '').toLowerCase().includes('delivered');
  if (claimsProgress && visualGateApplies && !lastHero && !prodHero.hero_image_url) {
    contradictions.push('Marked progress or late-stage workflow but no observable hero or production URL — possible fake progress.');
  }

  if (prUrl && prOpen && !promMerged) {
    contradictions.push('PR open but not merged — promotion incomplete.');
  }

  const buildish =
    wf === 'approved_for_build' ||
    wf === 'building' ||
    auto.dispatch_ok === true ||
    String(cv.progress_message || '').includes('sandbox');
  if (buildish && !previewUrl) {
    contradictions.push('Build or automation started but no preview URL — pipeline gap.');
  }

  const st = String(ticketRow.status || '').toLowerCase();
  if (st === 'closed') {
    contradictions.length = 0;
  }

  /** @type {{ code: string; label: string; priority: number }} */
  let blocker = { code: 'none', label: 'No critical blocker detected.', priority: 0 };

  if (st === 'closed') {
    blocker = { code: 'closed', label: 'Ticket is closed.', priority: 100 };
  } else if (escalationActive) {
    blocker = { code: 'operator_review_required', label: 'operator_review_required', priority: 95 };
  } else if (!requestedChange || requestedChange === '—') {
    blocker = { code: 'invalid_scope', label: 'No clear requested change — scope missing.', priority: 90 };
  } else if (contradictions.some((c) => c.includes('stale refinement'))) {
    blocker = { code: 'stale_refinement', label: 'Stale refinement — brief asks for information that is already satisfied.', priority: 85 };
  } else if (previewTruth === 'MISLEADING') {
    blocker = { code: 'preview_misleading', label: 'Preview is misleading or unverifiable — do not treat as delivery proof.', priority: 80 };
  } else if (buildish && !previewUrl) {
    blocker = { code: 'preview_pipeline', label: 'Automation/build without preview URL.', priority: 75 };
  } else if (prUrl && prOpen && !promMerged && String(cv.workflow_state || '').includes('client_approved')) {
    blocker = { code: 'missing_promotion', label: 'Client approved but PR not merged.', priority: 70 };
  } else if (deliveryIntegrityStatus === 'FAIL' && visualGateApplies) {
    blocker = { code: 'delivery_integrity', label: 'Delivery integrity failed — no safe visible hero for this visual change.', priority: 65 };
  } else if (mi.length > 0) {
    blocker = { code: 'missing_info', label: 'Open questions in brief — client or operator input required.', priority: 50 };
  }

  /** @type {'FIX' | 'ASK CLIENT' | 'SHOW TO CLIENT' | 'CLOSE'} */
  let nextAction = 'FIX';
  if (blocker.code === 'closed') nextAction = 'CLOSE';
  else if (blocker.code === 'operator_review_required') nextAction = 'FIX';
  else if (blocker.code === 'invalid_scope' || blocker.code === 'missing_info') nextAction = 'ASK CLIENT';
  else if (blocker.code === 'stale_refinement') nextAction = 'FIX';
  else if (
    blocker.code === 'preview_misleading' ||
    blocker.code === 'delivery_integrity' ||
    blocker.code === 'preview_pipeline' ||
    blocker.code === 'missing_promotion'
  ) {
    nextAction = 'FIX';
  } else if (blocker.code === 'none') {
    if (wf === 'intake' || wf === 'refining' || wf === 'ready_for_estimate') nextAction = 'ASK CLIENT';
    else if (wf === 'ready_for_client' || (previewTruth === 'VALID' && deliveryIntegrityStatus === 'PASS')) {
      nextAction = 'SHOW TO CLIENT';
    } else nextAction = 'FIX';
  }

  return {
    requested_change: requestedChange,
    intended_outcomes: intendedOutcomes,
    exists,
    missing,
    preview_truth: previewTruth,
    preview_truth_detail: previewTruthDetail,
    delivery_integrity: {
      status: deliveryIntegrityStatus,
      detail: deliveryIntegrityDetail,
    },
    contradictions,
    blocker: { code: blocker.code, label: blocker.label },
    next_action: nextAction,
  };
}

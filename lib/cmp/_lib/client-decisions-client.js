/**
 * Client-facing decision gate helpers (no internal_decisions / no operator diagnostics).
 *
 * These helpers are intentionally narrow: they only touch `console_json.client_decisions`
 * for apply/ensure; umbrella programme tickets also receive server-only internal_decisions
 * via `mergeProgrammeInternalDecisionsForTicket` (called from CMP router, not exposed to clients).
 */

/** Tickets that use CorpFlowAI-internal CRM + first AI channel defaults (not client questions). */
export const UMBRELLA_CLIENT_DECISION_TICKET_IDS = new Set(['cmo8mjijk0000jl04l1jz0v6d']);

/** Internal-only defaults for umbrella programme tickets (Postgres CRM, web chat first). */
export const PROGRAMME_INTERNAL_DECISION_DEFAULTS = {
  crm_destination: 'postgres_internal_crm',
  ai_first_channel: 'web_chat',
  crm_reason: 'single source of truth in Postgres, zero incremental cost, no vendor lock-in',
  ai_channel_reason: 'fastest deployment, no external approvals, lowest cost',
};

export const CLIENT_DECISION_KEYS = [
  'first_slice_outcome',
  'first_market_or_country',
  'listings_feed_or_idx_provider_status',
  'human_handoff_owner_and_hours',
];

/** @type {Record<string, string>} */
export const CLIENT_DECISION_QUESTIONS = {
  first_slice_outcome: 'What is the first live outcome you want (the smallest first slice)?',
  first_market_or_country: 'Which market or country should we optimize for first?',
  listings_feed_or_idx_provider_status: 'What is the status of your listings feed / IDX provider connection?',
  human_handoff_owner_and_hours: 'Who owns human handoffs, and what hours / SLA should we assume?',
};

/**
 * @param {unknown} v
 * @returns {Record<string, unknown>}
 */
function asObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v) ? /** @type {Record<string, unknown>} */ (v) : {};
}

/**
 * @param {unknown} consoleJson
 * @returns {Record<string, unknown>}
 */
export function ensureClientDecisionsOnConsoleJson(consoleJson) {
  const root = asObj(consoleJson);
  const prev = asObj(root.client_decisions);
  const prevItems = Array.isArray(prev.items) ? prev.items : [];

  /** @type {Array<Record<string, unknown>>} */
  const byKey = new Map();
  for (const it of prevItems) {
    const o = asObj(it);
    const k = typeof o.key === 'string' ? o.key.trim() : '';
    if (!k) continue;
    byKey.set(k, o);
  }

  const items = CLIENT_DECISION_KEYS.map((key) => {
    const existing = byKey.get(key) || {};
    const q =
      typeof existing.question === 'string' && existing.question.trim()
        ? String(existing.question).trim()
        : CLIENT_DECISION_QUESTIONS[key] || key;
    const status = typeof existing.status === 'string' && existing.status.trim() ? String(existing.status).trim() : 'pending';
    const answer = typeof existing.answer === 'string' ? existing.answer : '';
    const source_message_id =
      existing.source_message_id != null && String(existing.source_message_id).trim()
        ? String(existing.source_message_id).trim()
        : null;
    const answered_at =
      existing.answered_at != null && String(existing.answered_at).trim() ? String(existing.answered_at).trim() : null;
    return { key, question: q, status, answer, source_message_id, answered_at };
  });

  return { ...root, client_decisions: { ...prev, items } };
}

/**
 * @param {Array<Record<string, unknown>>} items
 * @returns {{ sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function evaluateClientDecisionsGate(items) {
  /** @type {string[]} */
  const missing = [];
  for (const it of items) {
    const key = typeof it.key === 'string' ? it.key.trim() : '';
    const status = typeof it.status === 'string' ? it.status.trim().toLowerCase() : '';
    const answer = typeof it.answer === 'string' ? it.answer.trim() : '';

    const waivedOk = key === 'listings_feed_or_idx_provider_status' && status === 'waived';

    if (waivedOk) continue;
    if (status === 'answered' && answer) continue;
    if (key) missing.push(key);
  }
  return { sufficient_to_proceed: missing.length === 0, missing_keys: missing };
}

/**
 * @param {Record<string, unknown>} stored
 * @param {Record<string, { answer?: unknown, waive?: unknown }>} answersByKey
 * @param {{ nowIso: string, messageId: string }} meta
 * @returns {{ next: Record<string, unknown>, sufficient_to_proceed: boolean, missing_keys: string[] }}
 */
export function applyClientDecisionAnswers({ stored, answersByKey, meta }) {
  const base = ensureClientDecisionsOnConsoleJson(stored);
  const cd0 = asObj(base.client_decisions);
  const items0 = Array.isArray(cd0.items) ? cd0.items.map((x) => asObj(x)) : [];

  /** @type {Record<string, Record<string, unknown>>} */
  const map = new Map();
  for (const it of items0) {
    const k = typeof it.key === 'string' ? it.key.trim() : '';
    if (k) map.set(k, { ...it });
  }

  for (const key of CLIENT_DECISION_KEYS) {
    const incoming = answersByKey[key] || {};
    const cur = map.get(key) || {
      key,
      question: CLIENT_DECISION_QUESTIONS[key] || key,
      status: 'pending',
      answer: '',
      source_message_id: null,
      answered_at: null,
    };

    const waive =
      incoming.waive === true ||
      incoming.waive === 'true' ||
      incoming.waive === 1 ||
      String(incoming.waive || '').toLowerCase() === 'true';

    if (key === 'listings_feed_or_idx_provider_status' && waive) {
      map.set(key, {
        ...cur,
        key,
        status: 'waived',
        answer: typeof incoming.answer === 'string' ? incoming.answer : '',
        source_message_id: meta.messageId,
        answered_at: meta.nowIso,
      });
      continue;
    }

    const answer = typeof incoming.answer === 'string' ? incoming.answer.trim() : '';
    map.set(key, {
      ...cur,
      key,
      status: answer ? 'answered' : 'pending',
      answer,
      source_message_id: answer ? meta.messageId : null,
      answered_at: answer ? meta.nowIso : null,
    });
  }

  const items = CLIENT_DECISION_KEYS.map((k) => map.get(k) || { key: k });
  const gate = evaluateClientDecisionsGate(items);
  const next = { ...base, client_decisions: { ...cd0, items, sufficient_to_proceed: gate.sufficient_to_proceed } };
  return { next, sufficient_to_proceed: gate.sufficient_to_proceed, missing_keys: gate.missing_keys };
}

/**
 * Strip disallowed keys from client POST body (CRM / AI channel are internal-only).
 *
 * @param {unknown} answers
 * @returns {Record<string, { answer?: unknown, waive?: unknown }>}
 */
export function pickClientDecisionAnswersOnly(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return {};
  const allow = new Set(CLIENT_DECISION_KEYS);
  /** @type {Record<string, { answer?: unknown, waive?: unknown }>} */
  const out = {};
  for (const [k, v] of Object.entries(answers)) {
    if (!allow.has(k)) continue;
    out[k] = v && typeof v === 'object' && !Array.isArray(v) ? /** @type {{ answer?: unknown, waive?: unknown }} */ (v) : {};
  }
  return out;
}

/**
 * Merge approved internal CRM / first-channel defaults for umbrella programme tickets.
 * Does not remove other `internal_decisions` keys.
 *
 * @param {string} ticketId
 * @param {Record<string, unknown>} stored
 * @returns {Record<string, unknown>}
 */
export function mergeProgrammeInternalDecisionsForTicket(ticketId, stored) {
  const id = String(ticketId || '').trim();
  if (!UMBRELLA_CLIENT_DECISION_TICKET_IDS.has(id)) return stored;
  const root = asObj(stored);
  const prev = asObj(root.internal_decisions);
  return {
    ...root,
    internal_decisions: { ...prev, ...PROGRAMME_INTERNAL_DECISION_DEFAULTS },
  };
}

/**
 * @param {string} ticketId
 * @param {Record<string, unknown>} stored normalized console json
 * @returns {boolean}
 */
export function umbrellaInternalDecisionsNeedPersist(ticketId, stored) {
  const id = String(ticketId || '').trim();
  if (!UMBRELLA_CLIENT_DECISION_TICKET_IDS.has(id)) return false;
  const prev = asObj(stored.internal_decisions);
  for (const [k, v] of Object.entries(PROGRAMME_INTERNAL_DECISION_DEFAULTS)) {
    if (prev[k] !== v) return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} payload
 * @returns {boolean}
 */
export function payloadLeaksInternals(payload) {
  const s = JSON.stringify(payload || {});
  return (
    s.includes('internal_decisions') ||
    s.includes('change_stage_debug') ||
    s.includes('reality_panel') ||
    s.includes('console_json')
  );
}

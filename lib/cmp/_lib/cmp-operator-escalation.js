/**
 * CMP operator escalation: high-complexity tickets require human review before AI replies are posted.
 */

/**
 * @typedef {{
 *   signals: {
 *     multi_system: { count: number, components: string[] },
 *     strategy: boolean,
 *     undefined_scope: boolean,
 *   },
 *   computed_at: string,
 *   computed_from: { ticket_description_hash: string | null, last_user_msg_ts: string | null },
 * }} OperatorEscalationEvidence
 */

/** @typedef {{ operator_assisted: boolean, reasons: string[], operator_escalation: OperatorEscalationEvidence }} OperatorEscalationResult */

const SYSTEM_PATTERNS = [
  { id: 'database', re: /\b(database|postgres|postgresql|mysql|mongodb|sqlite|prisma|sql\s*server)\b/i },
  { id: 'api_backend', re: /\b(api|graphql|grpc|rest|backend|server[-\s]?side|microservice)\b/i },
  { id: 'frontend', re: /\b(frontend|react|next\.?js|vue|angular|svelte|ui\s+layer|web\s+app)\b/i },
  { id: 'mobile', re: /\b(mobile|ios|android|flutter|react\s*native|swift|kotlin)\b/i },
  { id: 'billing', re: /\b(billing|stripe|payment|wallet|subscription|invoic(e|ing))\b/i },
  { id: 'auth', re: /\b(auth|oauth|sso|ldap|identity|jwt|mfa|permissions)\b/i },
  { id: 'infra', re: /\b(infra|docker|kubernetes|k8s|terraform|ci\/cd|github\s+actions|vercel|aws|gcp|azure)\b/i },
  { id: 'cms_content', re: /\b(cms|content\s+management|sanity|strapi|headless)\b/i },
  { id: 'email_messaging', re: /\b(email|smtp|sendgrid|mailgun|push\s+notification|sms)\b/i },
  { id: 'queue_data', re: /\b(queue|kafka|redis|rabbitmq|etl|warehouse|snowflake|bigquery|analytics\s+pipeline)\b/i },
  { id: 'integrations', re: /\b(integration|salesforce|hubspot|webhook|zapier|erp)\b/i },
];

const STRATEGY_RE =
  /\b(strategy|strategic|roadmap|positioning|gtm|go[-\s]?to[-\s]?market|business\s+plan|business\s+model|vision|north\s*star|market\s+sizing|competitive|moat|transformation|organizational|reorg|portfolio)\b/i;

/**
 * @param {string} text
 * @returns {number}
 */
function countDistinctSystems(text) {
  const t = String(text || '');
  const hit = new Set();
  for (const { id, re } of SYSTEM_PATTERNS) {
    if (re.test(t)) hit.add(id);
  }
  return hit.size;
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function looksLikeStrategyRequest(text) {
  return STRATEGY_RE.test(String(text || ''));
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function detectSystemComponents(text) {
  const t = String(text || '');
  /** @type {string[]} */
  const out = [];
  for (const { id, re } of SYSTEM_PATTERNS) {
    if (re.test(t)) out.push(id);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} brief
 * @param {string} description
 * @returns {boolean}
 */
function looksLikeUndefinedScope(brief, description) {
  const b = brief && typeof brief === 'object' ? brief : {};
  const conf = String(b.confidence || '')
    .trim()
    .toLowerCase();
  const miss = Array.isArray(b.missing_information) ? b.missing_information.filter((x) => String(x || '').trim()) : [];
  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  const rc = typeof b.requested_change === 'string' ? b.requested_change.trim() : '';
  const scopeIn = typeof b.scope_in === 'string' ? b.scope_in.trim() : '';
  const descWords = String(description || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  if (conf === 'low' && (miss.length >= 2 || (!summary && !rc))) return true;
  if (descWords > 0 && descWords < 12 && miss.length >= 1) return true;
  if (!summary && !rc && !scopeIn && String(description || '').trim().length < 80) return true;
  return false;
}

/**
 * @param {{
 *   description?: string | null,
 *   brief?: Record<string, unknown> | null,
 *   latestUserMessage?: string | null,
 *   transcriptTail?: string | null,
 * }} opts
 * @returns {OperatorEscalationResult}
 */
export function evaluateOperatorEscalation(opts) {
  const description = opts.description != null ? String(opts.description) : '';
  const latest = opts.latestUserMessage != null ? String(opts.latestUserMessage) : '';
  const tail = opts.transcriptTail != null ? String(opts.transcriptTail) : '';
  const brief = opts.brief && typeof opts.brief === 'object' ? opts.brief : {};
  const nowIso = opts.nowIso != null ? String(opts.nowIso) : new Date().toISOString();
  const lastUserMsgTs = opts.lastUserMsgTs != null ? String(opts.lastUserMsgTs) : null;
  const descriptionHash = opts.ticketDescriptionHash != null ? String(opts.ticketDescriptionHash) : null;

  const scopeIn = typeof brief.scope_in === 'string' ? brief.scope_in : '';
  const summary = typeof brief.summary === 'string' ? brief.summary : '';
  const rc = typeof brief.requested_change === 'string' ? brief.requested_change : '';
  const corpus = [description, latest, tail, scopeIn, summary, rc].filter(Boolean).join('\n');

  /** @type {string[]} */
  const reasons = [];

  const components = detectSystemComponents(corpus);
  const sysCount = components.length;
  const multiSystem = sysCount >= 3;
  const strategy = looksLikeStrategyRequest(corpus);
  const undefinedScope = looksLikeUndefinedScope(brief, description || latest);

  if (multiSystem) reasons.push(`multi_system_build:${sysCount}_major_component_areas`);
  if (strategy) reasons.push('strategy_request');
  if (undefinedScope) reasons.push('undefined_scope');

  return {
    operator_assisted: reasons.length > 0,
    reasons,
    operator_escalation: {
      signals: {
        multi_system: { count: sysCount, components },
        strategy,
        undefined_scope: undefinedScope,
      },
      computed_at: nowIso,
      computed_from: {
        ticket_description_hash: descriptionHash,
        last_user_msg_ts: lastUserMsgTs,
      },
    },
  };
}

/**
 * Enforced structured draft for operator-assisted tickets.
 * This is intentionally rigid so operators can approve quickly and clients receive a bounded, high-quality response.
 *
 * @param {{
 *   rawAssistant: string,
 *   brief: Record<string, unknown>,
 *   evidence: OperatorEscalationEvidence,
 *   exists?: { attachments?: number, preview_url?: string | null, pr_url?: string | null, branch?: string | null } | null,
 * }} args
 * @returns {string}
 */
export function buildGovernedOperatorDraft(args) {
  const brief = args.brief && typeof args.brief === 'object' ? args.brief : {};
  const requested =
    typeof brief.requested_change === 'string' && brief.requested_change.trim()
      ? brief.requested_change.trim()
      : typeof brief.summary === 'string' && brief.summary.trim()
        ? brief.summary.trim()
        : '';
  const outcomes = Array.isArray(brief.intended_outcomes)
    ? brief.intended_outcomes.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8)
    : [];
  const ac = Array.isArray(brief.acceptance_criteria)
    ? brief.acceptance_criteria.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 8)
    : [];
  const miss = Array.isArray(brief.missing_information)
    ? brief.missing_information.map((x) => String(x || '').trim()).filter(Boolean).slice(0, 6)
    : [];
  const scopeIn = typeof brief.scope_in === 'string' ? brief.scope_in.trim() : '';
  const scopeOut = typeof brief.scope_out === 'string' ? brief.scope_out.trim() : '';
  const components = args.evidence?.signals?.multi_system?.components || [];

  const ex = args.exists && typeof args.exists === 'object' ? args.exists : {};
  const exAtt = ex.attachments != null ? Number(ex.attachments) : null;
  const exPreview = ex.preview_url != null ? String(ex.preview_url).trim() : '';
  const exPr = ex.pr_url != null ? String(ex.pr_url).trim() : '';
  const exBranch = ex.branch != null ? String(ex.branch).trim() : '';

  const lines = [];
  lines.push('## 1. Understanding');
  lines.push(
    requested
      ? `You’re asking for: ${requested}`
      : 'You’re asking for a strategic / multi-system change. I need to confirm boundaries and success criteria before we proceed.',
  );
  if (String(args.rawAssistant || '').trim()) {
    lines.push('');
    lines.push('Draft summary (for operator review):');
    lines.push(String(args.rawAssistant || '').trim());
  }

  lines.push('');
  lines.push('## 2. Systems involved');
  if (components.length) {
    lines.push(`- Detected components: ${components.join(', ')}`);
  } else if (scopeIn) {
    lines.push(`- Scope in (current brief): ${scopeIn}`);
  } else {
    lines.push('- Not confirmed yet (operator-assisted ticket).');
  }

  lines.push('');
  lines.push('## 3. Intended outcomes');
  const outList = outcomes.length ? outcomes : ac;
  if (outList.length) {
    for (const o of outList) lines.push(`- ${o}`);
  } else {
    lines.push('- Not yet specified (must be made observable).');
  }

  lines.push('');
  lines.push('## 4. Assumptions / constraints');
  if (scopeIn) lines.push(`- Scope in: ${scopeIn}`);
  if (scopeOut) lines.push(`- Scope out: ${scopeOut}`);
  if (!scopeIn && !scopeOut) lines.push('- None recorded yet.');

  lines.push('');
  lines.push('## 5. What exists vs what is missing');
  const exParts = [];
  if (exAtt != null) exParts.push(`${exAtt} attachment(s)`);
  if (exPreview) exParts.push('preview URL present');
  if (exPr) exParts.push('PR link present');
  if (exBranch) exParts.push('branch name present');
  lines.push(`- Exists: ${exParts.length ? exParts.join(', ') : 'not confirmed yet'}`);
  lines.push(`- Missing: ${miss.length ? 'clarifications required (see questions below)' : 'no open questions recorded yet'}`);

  lines.push('');
  lines.push('## 6. One decision required now');
  lines.push(
    'Confirm the system boundaries: which major systems are in-scope for this ticket (and which are explicitly out-of-scope) for the first deliverable slice.',
  );

  lines.push('');
  lines.push('## 7. Max 6 questions');
  if (miss.length) {
    for (const q of miss) lines.push(`- ${q}`);
  } else {
    lines.push('- What is the single client-visible outcome that must be true in production for this to be “done”?');
    lines.push('- Which systems are in-scope vs out-of-scope for the first deliverable slice?');
    lines.push('- What data source is authoritative for contacts/leads/events?');
    lines.push('- Any compliance/consent constraints (PII, opt-in, retention)?');
    lines.push('- Who are the users and what is the volume (per day/week)?');
    lines.push('- Timeline: when is the first usable slice required?');
  }

  lines.push('');
  lines.push('## 8. One next step');
  lines.push('Reply with the boundary decision + answers to the questions above. After that, we will produce a build-ready plan and acceptance criteria.');

  return lines.join('\n');
}

/**
 * Append assistant to transcript, or hold draft when `operator_assisted`.
 *
 * @param {Record<string, unknown>} stored
 * @param {{
 *   baseMessages: Array<Record<string, unknown>>,
 *   assistantMsg: { role: string, content: string, ts: string, ok?: boolean },
  *   assessment: OperatorEscalationResult,
 *   refinedMeta?: { refinement_source?: string | null } | null,
 * }} args
 * @returns {{ withheld: boolean }}
 */
export function applyEscalatedRefinementMessages(stored, args) {
  const { baseMessages, assistantMsg, assessment, refinedMeta } = args;
  const content = String(assistantMsg.content || '').trim() || 'OK';

  if (assessment.operator_assisted) {
    stored.mode = 'operator_assisted';
    stored.operator_escalation_reasons = assessment.reasons;
    stored.operator_escalation = assessment.operator_escalation;
    stored.pending_operator_draft = {
      content,
      ts: assistantMsg.ts,
      ok: assistantMsg.ok === true,
      refinement_source: refinedMeta?.refinement_source != null ? String(refinedMeta.refinement_source) : null,
    };
    stored.messages = [...baseMessages].slice(-200);
    return { withheld: true };
  }

  delete stored.mode;
  delete stored.operator_escalation_reasons;
  delete stored.operator_escalation;
  delete stored.pending_operator_draft;
  stored.messages = [...baseMessages, { ...assistantMsg, content }].slice(-200);
  return { withheld: false };
}

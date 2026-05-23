/**
 * AI Lead Rescue operator workflow in lead.qualification_json.
 * Factory-admin APIs and /admin/lead-rescue only — not public surfaces.
 */

/** @type {readonly string[]} */
export const AI_LEAD_RESCUE_STATUSES = Object.freeze([
  'NEW_INTAKE',
  'QUALIFYING',
  'DEMO_OFFERED',
  'DEMO_BOOKED',
  'QUOTE_SENT',
  'PAYMENT_PENDING',
  'PAID_SETUP',
  'SETUP_IN_PROGRESS',
  'LIVE_PILOT',
  'MONITORING_OFFERED',
  'MONTHLY_ACTIVE',
  'LOST',
  'PAUSED',
]);

export const AI_LEAD_RESCUE_PRODUCT = 'ai-lead-rescue';

const STATUS_LABEL = {
  NEW_INTAKE: 'New intake',
  QUALIFYING: 'Qualifying',
  DEMO_OFFERED: 'Demo offered',
  DEMO_BOOKED: 'Demo booked',
  QUOTE_SENT: 'Quote sent',
  PAYMENT_PENDING: 'Payment pending',
  PAID_SETUP: 'Paid (setup)',
  SETUP_IN_PROGRESS: 'Setup in progress',
  LIVE_PILOT: 'Live pilot',
  MONITORING_OFFERED: 'Monitoring offered',
  MONTHLY_ACTIVE: 'Monthly active',
  LOST: 'Lost',
  PAUSED: 'Paused',
};

const MAX_NOTES = 120;

/**
 * AI Lead Rescue setup checklist — v1 (fixed list, single source of truth).
 * The checklist appears on /admin/lead-rescue/[id] only when status reaches PAID_SETUP
 * (i.e. payment confirmed, operator delivering the pilot). It persists inside
 * `qualification_json.ai_lead_rescue_operator.setup_checklist` — additive only,
 * no schema change required (jsonb).
 */
export const AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION = 'v1';

/** @type {readonly { key: string, label: string, hint?: string }[]} */
export const AI_LEAD_RESCUE_SETUP_CHECKLIST_V1 = Object.freeze([
  {
    key: 'intake_reviewed',
    label: 'Intake reviewed',
    hint: 'Read the intake message, confirm business, contact, region, and lead sources.',
  },
  {
    key: 'payment_invoice_confirmed',
    label: 'Payment / invoice confirmed',
    hint: 'Confirm the setup payment is received and the invoice reference is recorded.',
  },
  {
    key: 'lead_source_selected',
    label: 'Lead source selected',
    hint: 'Pick the one source the client already uses (form / email / WhatsApp / Google Form).',
  },
  {
    key: 'google_sheet_created',
    label: 'Google Sheet created',
    hint: 'Columns: date, name, contact, source, status. Shared with the client.',
  },
  {
    key: 'telegram_destination_confirmed',
    label: 'Telegram destination confirmed',
    hint: 'Confirm the operator / owner channel that should receive each new lead alert.',
  },
  {
    key: 'test_lead_submitted',
    label: 'Test lead submitted',
    hint: 'Submit a real-looking enquiry to verify the path end-to-end.',
  },
  {
    key: 'alert_received',
    label: 'Alert received',
    hint: 'The test enquiry triggered the configured Telegram / owner alert.',
  },
  {
    key: 'lead_appears_in_sheet',
    label: 'Lead appears in sheet',
    hint: 'The test enquiry landed in the Google Sheet with all expected columns.',
  },
  {
    key: 'follow_up_board_created',
    label: 'Follow-up status board created',
    hint: 'New / Replied / Booked / Won / Lost — minimum viable kanban for the owner.',
  },
  {
    key: 'daily_summary_configured',
    label: 'Daily summary configured',
    hint: 'Confirm channel (email / WhatsApp), time zone, and recipient.',
  },
  {
    key: 'client_handover_sent',
    label: 'Client hand-over message sent',
    hint: 'Plain-language note: what was set up, what to expect, who to contact.',
  },
  {
    key: 'monitoring_7_day_started',
    label: '7-day monitoring started',
    hint: 'CorpFlow watches alerts and sheet daily for the pilot window.',
  },
  {
    key: 'monthly_monitoring_offered',
    label: 'Monthly monitoring offered',
    hint: 'Offer made for the post-pilot monthly monitoring tier.',
  },
]);

/** @type {readonly string[]} */
export const AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES = Object.freeze([
  'PAID_SETUP',
  'SETUP_IN_PROGRESS',
  'LIVE_PILOT',
  'MONITORING_OFFERED',
  'MONTHLY_ACTIVE',
]);

/** @type {readonly string[]} */
export const AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES = Object.freeze([
  'pending',
  'in_progress',
  'done',
  'skipped',
]);

const CHECKLIST_KEYS_V1 = AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.map((i) => i.key);
const CHECKLIST_KEY_SET = new Set(CHECKLIST_KEYS_V1);

/**
 * @param {unknown} status
 */
export function isAiLeadRescueSetupStatus(status) {
  const v = String(status || '').trim().toUpperCase();
  if (!v) return false;
  return AI_LEAD_RESCUE_SETUP_ELIGIBLE_STATUSES.includes(v);
}

/**
 * @param {unknown} s
 */
export function normalizeAiLeadRescueChecklistItemState(s) {
  const v = s != null ? String(s).trim().toLowerCase().replace(/[\s-]+/g, '_') : '';
  if (!v) return null;
  return AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES.includes(v) ? v : null;
}

/**
 * @param {unknown} k
 */
export function normalizeAiLeadRescueChecklistItemKey(k) {
  const v = k != null ? String(k).trim() : '';
  return CHECKLIST_KEY_SET.has(v) ? v : null;
}

/**
 * @param {unknown} s
 * @returns {string | null}
 */
export function normalizeAiLeadRescueStatus(s) {
  const v = s != null ? String(s).trim().toUpperCase().replace(/\s+/g, '_') : '';
  if (!v) return null;
  return AI_LEAD_RESCUE_STATUSES.includes(v) ? v : null;
}

/**
 * @param {string} status
 */
export function aiLeadRescueStatusLabel(status) {
  const k = normalizeAiLeadRescueStatus(status) || 'NEW_INTAKE';
  return STATUS_LABEL[k] || k;
}

/**
 * @param {unknown} qj
 */
export function parseIntakeMeta(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const m = root.intake_meta && typeof root.intake_meta === 'object' ? root.intake_meta : {};
  return {
    product: m.product != null ? String(m.product).trim() : '',
    region_path: m.region_path != null ? String(m.region_path).trim() : '',
    business_name: m.business_name != null ? String(m.business_name).trim() : '',
    business_type: m.business_type != null ? String(m.business_type).trim() : '',
    lead_sources: m.lead_sources != null ? String(m.lead_sources).trim() : '',
    preferred_payment_path: m.preferred_payment_path != null ? String(m.preferred_payment_path).trim() : '',
    host: m.host != null ? String(m.host).trim() : '',
    page: m.page != null ? String(m.page).trim() : '',
    message: m.message != null ? String(m.message).trim() : '',
  };
}

/**
 * @param {string} nowIso
 */
export function defaultAiLeadRescueOperator(nowIso) {
  return {
    setup_price: null,
    monthly_monitoring_price: null,
    currency: null,
    payment_route: null,
    payment_status: 'none',
    invoice_reference: null,
    payment_notes: null,
    next_action: null,
    owner: null,
    last_contacted: null,
    notes: null,
    internal_notes: [],
    setup_checklist: null,
    updated_at: nowIso,
  };
}

/**
 * Parse the stored setup checklist (raw map keyed by item key) into the
 * canonical v1 ordered list. Always returns one entry per v1 key with the
 * declared label/hint, hydrating any persisted state. Unknown keys are
 * dropped silently so retiring a key is safe.
 *
 * @param {unknown} qj
 * @returns {{
 *   version: string,
 *   items: { key: string, label: string, hint?: string, state: string, updated_at: string | null, completed_at: string | null, note: string | null, actor_label: string | null }[],
 *   completed_count: number,
 *   total_count: number,
 *   all_done: boolean,
 * }}
 */
export function parseAiLeadRescueSetupChecklist(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const ow =
    root.ai_lead_rescue_operator && typeof root.ai_lead_rescue_operator === 'object'
      ? root.ai_lead_rescue_operator
      : {};
  const stored =
    ow.setup_checklist && typeof ow.setup_checklist === 'object' ? ow.setup_checklist : {};
  const storedItems =
    stored.items && typeof stored.items === 'object' && !Array.isArray(stored.items)
      ? stored.items
      : {};

  let completed = 0;
  const items = AI_LEAD_RESCUE_SETUP_CHECKLIST_V1.map((spec) => {
    const raw = storedItems[spec.key] && typeof storedItems[spec.key] === 'object' ? storedItems[spec.key] : {};
    const state = normalizeAiLeadRescueChecklistItemState(raw.state) || 'pending';
    if (state === 'done' || state === 'skipped') completed += 1;
    const updated_at = raw.updated_at != null ? String(raw.updated_at).trim().slice(0, 80) : null;
    const completed_at = raw.completed_at != null ? String(raw.completed_at).trim().slice(0, 80) : null;
    const note = raw.note != null && String(raw.note).trim() ? String(raw.note).trim().slice(0, 4000) : null;
    const actor_label =
      raw.actor_label != null && String(raw.actor_label).trim()
        ? String(raw.actor_label).trim().slice(0, 320)
        : null;
    return {
      key: spec.key,
      label: spec.label,
      hint: spec.hint,
      state,
      updated_at,
      completed_at,
      note,
      actor_label,
    };
  });

  return {
    version: AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION,
    items,
    completed_count: completed,
    total_count: items.length,
    all_done: completed === items.length,
  };
}

/**
 * Merge a single setup-checklist item patch into `qualification_json`.
 * - Unknown keys / states are rejected (no-op).
 * - `completed_at` is set when state → done; cleared when state → pending|in_progress.
 *   For `skipped`, `completed_at` is set so progress counts the row as resolved.
 * - `note` of '' or null clears, otherwise replaces.
 *
 * @param {Record<string, unknown>} qualificationJson
 * @param {{ key?: string | null, state?: string | null, note?: string | null | undefined }} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 * @returns {{ ok: true, qj: Record<string, unknown> } | { ok: false, error: string }}
 */
export function mergeAiLeadRescueChecklistItemPatch(qualificationJson, patch, actorLabel, nowIso) {
  const key = normalizeAiLeadRescueChecklistItemKey(patch.key);
  if (!key) return { ok: false, error: 'INVALID_CHECKLIST_KEY' };
  const state = normalizeAiLeadRescueChecklistItemState(patch.state);
  if (!state) return { ok: false, error: 'INVALID_CHECKLIST_STATE' };

  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const ow = qj.ai_lead_rescue_operator && typeof qj.ai_lead_rescue_operator === 'object'
    ? { ...qj.ai_lead_rescue_operator }
    : {};
  const checklist =
    ow.setup_checklist && typeof ow.setup_checklist === 'object'
      ? { ...ow.setup_checklist }
      : { version: AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION, items: {} };
  const items =
    checklist.items && typeof checklist.items === 'object' && !Array.isArray(checklist.items)
      ? { ...checklist.items }
      : {};

  const prev = items[key] && typeof items[key] === 'object' ? items[key] : {};
  const next = { ...prev, state, updated_at: nowIso };
  next.actor_label = String(actorLabel || 'unknown').trim().slice(0, 320) || 'unknown';

  if (state === 'done' || state === 'skipped') {
    next.completed_at = nowIso;
  } else {
    next.completed_at = null;
  }

  if (patch.note !== undefined) {
    if (patch.note === null || String(patch.note).trim() === '') {
      next.note = null;
    } else {
      next.note = String(patch.note).trim().slice(0, 4000);
    }
  }

  items[key] = next;
  checklist.items = items;
  checklist.version = AI_LEAD_RESCUE_SETUP_CHECKLIST_VERSION;
  checklist.updated_at = nowIso;
  ow.setup_checklist = checklist;
  ow.updated_at = nowIso;
  qj.ai_lead_rescue_operator = ow;
  return { ok: true, qj };
}

/**
 * @param {unknown} qj
 */
export function parseAiLeadRescueOperator(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const ow =
    root.ai_lead_rescue_operator && typeof root.ai_lead_rescue_operator === 'object'
      ? root.ai_lead_rescue_operator
      : {};

  const numOrNull = (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const rawNotes = Array.isArray(ow.internal_notes) ? ow.internal_notes : [];
  const internal_notes = rawNotes
    .map((n) => {
      if (!n || typeof n !== 'object') return null;
      const at = n.at != null ? String(n.at).trim() : '';
      const text = n.text != null ? String(n.text).trim() : '';
      if (!at || !text) return null;
      return { at, text: text.slice(0, 4000) };
    })
    .filter(Boolean)
    .slice(-MAX_NOTES);

  let last_contacted = ow.last_contacted != null ? String(ow.last_contacted).trim().slice(0, 80) : '';
  if (last_contacted) {
    const trial = new Date(last_contacted);
    if (Number.isNaN(trial.getTime())) last_contacted = '';
  }

  return {
    setup_price: numOrNull(ow.setup_price),
    monthly_monitoring_price: numOrNull(ow.monthly_monitoring_price),
    currency: ow.currency != null ? String(ow.currency).trim().slice(0, 12) : null,
    payment_route: ow.payment_route != null ? String(ow.payment_route).trim().slice(0, 500) : null,
    payment_status: ow.payment_status != null ? String(ow.payment_status).trim().slice(0, 64) : 'none',
    invoice_reference: ow.invoice_reference != null ? String(ow.invoice_reference).trim().slice(0, 200) : null,
    payment_notes: ow.payment_notes != null ? String(ow.payment_notes).trim().slice(0, 4000) : null,
    next_action: ow.next_action != null ? String(ow.next_action).trim().slice(0, 500) : null,
    owner: ow.owner != null ? String(ow.owner).trim().slice(0, 200) : null,
    last_contacted: last_contacted || null,
    notes: ow.notes != null ? String(ow.notes).trim().slice(0, 8000) : null,
    internal_notes,
    updated_at: ow.updated_at != null ? String(ow.updated_at).trim() : null,
  };
}

/**
 * @param {unknown} qj
 */
export function isAiLeadRescueLead(qj) {
  const meta = parseIntakeMeta(qj);
  return meta.product === AI_LEAD_RESCUE_PRODUCT;
}

/**
 * @param {import('@prisma/client').Lead} row
 */
export function leadRowToAiLeadRescueListItem(row) {
  const qj = row.qualificationJson;
  const intake = parseIntakeMeta(qj);
  const op = parseAiLeadRescueOperator(qj);
  const status = normalizeAiLeadRescueStatus(row.status) || 'NEW_INTAKE';
  return {
    id: row.id,
    submitted_at: row.createdAt,
    updated_at: row.updatedAt,
    business_name: intake.business_name || row.name || '',
    contact_name: row.name || '',
    email: row.email || '',
    phone: row.phone || row.contact || '',
    region_path: intake.region_path || '',
    business_type: intake.business_type || '',
    lead_sources: intake.lead_sources || '',
    preferred_payment_path: intake.preferred_payment_path || '',
    status,
    status_label: aiLeadRescueStatusLabel(status),
    setup_price: op.setup_price,
    monthly_monitoring_price: op.monthly_monitoring_price,
    currency: op.currency,
    payment_status: op.payment_status,
    next_action: op.next_action,
    owner: op.owner,
    last_contacted: op.last_contacted,
    notes_preview: op.notes ? op.notes.slice(0, 120) : '',
    detail_path: `/admin/lead-rescue/${row.id}`,
  };
}

/**
 * @param {import('@prisma/client').Lead} row
 */
export function leadRowToAiLeadRescueDetail(row) {
  const qj = row.qualificationJson;
  const intake = parseIntakeMeta(qj);
  const op = parseAiLeadRescueOperator(qj);
  const status = normalizeAiLeadRescueStatus(row.status) || 'NEW_INTAKE';
  return {
    id: row.id,
    tenant_id: row.tenantId,
    submitted_at: row.createdAt,
    updated_at: row.updatedAt,
    prospect: {
      business_name: intake.business_name || row.name || '',
      contact_name: row.name || '',
      email: row.email || '',
      phone: row.phone || row.contact || '',
      region_path: intake.region_path || '',
      business_type: intake.business_type || '',
      lead_sources: intake.lead_sources || '',
      intake_message: intake.message || row.message || row.intent || '',
      source_page: intake.page || '',
      source_host: intake.host || '',
    },
    commercial: {
      setup_price: op.setup_price,
      monthly_monitoring_price: op.monthly_monitoring_price,
      currency: op.currency,
      payment_route: op.payment_route || intake.preferred_payment_path || '',
      payment_status: op.payment_status,
      invoice_reference: op.invoice_reference,
      payment_notes: op.payment_notes,
    },
    operations: {
      status,
      status_label: aiLeadRescueStatusLabel(status),
      next_action: op.next_action,
      owner: op.owner,
      last_contacted: op.last_contacted,
      notes: op.notes,
      internal_notes: op.internal_notes,
    },
    setup_checklist: parseAiLeadRescueSetupChecklist(qj),
    setup_checklist_eligible: isAiLeadRescueSetupStatus(status),
  };
}

/**
 * @param {Record<string, unknown>} qualificationJson
 * @param {Record<string, unknown>} patch
 * @param {string} actorLabel
 * @param {string} nowIso
 */
export function mergeAiLeadRescueOperatorPatch(qualificationJson, patch, actorLabel, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parseAiLeadRescueOperator(qj);
  const actor = String(actorLabel || 'unknown').trim().slice(0, 320) || 'unknown';

  const next = {
    setup_price: prev.setup_price,
    monthly_monitoring_price: prev.monthly_monitoring_price,
    currency: prev.currency,
    payment_route: prev.payment_route,
    payment_status: prev.payment_status,
    invoice_reference: prev.invoice_reference,
    payment_notes: prev.payment_notes,
    next_action: prev.next_action,
    owner: prev.owner,
    last_contacted: prev.last_contacted,
    notes: prev.notes,
    internal_notes: [...prev.internal_notes],
    updated_at: nowIso,
  };

  const assign = (key, val, transform = (x) => x) => {
    if (val === undefined) return;
    next[key] = transform(val);
  };

  assign('setup_price', patch.setup_price, (v) => {
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : prev.setup_price;
  });
  assign('monthly_monitoring_price', patch.monthly_monitoring_price, (v) => {
    if (v === null || v === '') return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : prev.monthly_monitoring_price;
  });
  assign('currency', patch.currency, (v) => (v == null || v === '' ? null : String(v).trim().slice(0, 12)));
  assign('payment_route', patch.payment_route, (v) =>
    v == null || v === '' ? null : String(v).trim().slice(0, 500),
  );
  assign('payment_status', patch.payment_status, (v) =>
    v == null || v === '' ? 'none' : String(v).trim().slice(0, 64),
  );
  assign('invoice_reference', patch.invoice_reference, (v) =>
    v == null || v === '' ? null : String(v).trim().slice(0, 200),
  );
  assign('payment_notes', patch.payment_notes, (v) =>
    v == null || v === '' ? null : String(v).trim().slice(0, 4000),
  );
  assign('next_action', patch.next_action, (v) => (v == null || v === '' ? null : String(v).trim().slice(0, 500)));
  assign('owner', patch.owner, (v) => (v == null || v === '' ? null : String(v).trim().slice(0, 200)));

  if (patch.last_contacted !== undefined) {
    if (patch.last_contacted === null || patch.last_contacted === '') {
      next.last_contacted = null;
    } else {
      const d = new Date(String(patch.last_contacted));
      next.last_contacted = Number.isNaN(d.getTime()) ? prev.last_contacted : d.toISOString();
    }
  }

  assign('notes', patch.notes, (v) => (v == null || v === '' ? null : String(v).trim().slice(0, 8000)));

  if (patch.note_append !== undefined && patch.note_append !== null && String(patch.note_append).trim()) {
    const text = String(patch.note_append).trim().slice(0, 4000);
    next.internal_notes = [...next.internal_notes, { at: nowIso, text, actor_label: actor }].slice(-MAX_NOTES);
  }

  qj.ai_lead_rescue_operator = next;
  return qj;
}

export const AI_LEAD_RESCUE_INTAKE_NOTIFICATION_EVENT = 'corpflow.lead_rescue.intake_received';

const REGION_LABEL = {
  mauritius: 'Mauritius',
  international: 'International',
  not_selected: 'Not selected',
};

/**
 * Human-readable label for region path used in the operator notification.
 *
 * @param {string | null | undefined} regionPath
 * @returns {string}
 */
export function aiLeadRescueRegionPathLabel(regionPath) {
  const v = String(regionPath || '').trim().toLowerCase();
  if (!v) return 'Not selected';
  return REGION_LABEL[v] || regionPath || 'Not selected';
}

/**
 * Build the structured operator notification payload for a freshly captured
 * AI Lead Rescue intake. Includes both the machine fields and a pre-formatted
 * `notification_text` block n8n / Telegram / email can forward as-is.
 *
 * @param {{
 *   leadId: string,
 *   tenantId: string | null,
 *   submittedAt: Date | string,
 *   prospect: {
 *     business_name?: string | null,
 *     contact_name?: string | null,
 *     email?: string | null,
 *     phone?: string | null,
 *     region_path?: string | null,
 *     lead_sources?: string | null,
 *     preferred_payment_path?: string | null,
 *     source_host?: string | null,
 *   },
 *   publicBaseUrl?: string | null,
 * }} args
 */
export function buildAiLeadRescueIntakeNotification(args) {
  const submittedAtIso =
    args.submittedAt instanceof Date
      ? args.submittedAt.toISOString()
      : args.submittedAt
        ? new Date(args.submittedAt).toISOString()
        : new Date().toISOString();

  const detailPath = `/admin/lead-rescue/${args.leadId}`;
  const base = String(args.publicBaseUrl || '').trim().replace(/\/+$/, '');
  const adminUrl = base ? `${base}${detailPath}` : detailPath;

  const p = args.prospect || {};
  const business = String(p.business_name || '').trim() || '(not provided)';
  const contact = String(p.contact_name || '').trim() || '(not provided)';
  const email = String(p.email || '').trim() || '(not provided)';
  const phone = String(p.phone || '').trim() || '(not provided)';
  const region = aiLeadRescueRegionPathLabel(p.region_path);
  const sources = String(p.lead_sources || '').trim() || '(not provided)';
  const payment = String(p.preferred_payment_path || '').trim() || '(not selected)';

  const notification_text = [
    'New AI Lead Rescue intake',
    '',
    `Business: ${business}`,
    `Contact: ${contact}`,
    `Email: ${email}`,
    `Phone / WhatsApp: ${phone}`,
    `Region: ${region}`,
    `Lead sources: ${sources}`,
    `Preferred payment path: ${payment}`,
    `Submitted at: ${submittedAtIso}`,
    `Admin detail link: ${adminUrl}`,
    'Next action: Review and reply within 2 business hours.',
  ].join('\n');

  return {
    product: AI_LEAD_RESCUE_PRODUCT,
    lead_id: args.leadId,
    tenant_id: args.tenantId || null,
    submitted_at: submittedAtIso,
    admin_detail_path: detailPath,
    admin_detail_url: adminUrl,
    prospect: {
      business_name: business,
      contact_name: contact,
      email,
      phone,
      region_path: String(p.region_path || '').trim() || 'not_selected',
      region_label: region,
      lead_sources: sources,
      preferred_payment_path: payment,
      source_host: String(p.source_host || '').trim() || null,
    },
    next_action: 'Review and reply within 2 business hours.',
    notification_text,
  };
}

/**
 * @param {unknown} payload Session JWT payload (admin).
 */
export function aiLeadRescueActorLabelFromPayload(payload) {
  if (!payload || String(payload.typ || '').toLowerCase() !== 'admin') return 'unknown';
  const u = payload.username != null ? String(payload.username).trim() : '';
  if (u) return u.slice(0, 320);
  return 'factory_admin';
}

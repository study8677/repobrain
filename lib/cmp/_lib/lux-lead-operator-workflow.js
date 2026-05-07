/**
 * LuxeMaurice-only minimal CRM slice: operator stage + internal notes in lead.qualification_json.
 * Key: lux_operator_workflow — never exposed on public concierge surfaces by design (operator APIs only).
 */

/** @type {readonly string[]} */
export const LUX_LEAD_CRM_STAGES = Object.freeze([
  'new',
  'qualified',
  'viewing_requested',
  'follow_up',
  'closed',
  'lost',
]);

const STAGE_LABEL = {
  new: 'New',
  qualified: 'Qualified',
  viewing_requested: 'Viewing Requested',
  follow_up: 'Follow-up',
  closed: 'Closed',
  lost: 'Lost',
};

/**
 * @param {unknown} s
 * @returns {string | null}
 */
export function normalizeLuxLeadCrmStage(s) {
  const v = s != null ? String(s).trim().toLowerCase().replace(/\s+/g, '_') : '';
  if (!v) return null;
  const map = {
    new: 'new',
    qualified: 'qualified',
    viewing_requested: 'viewing_requested',
    'viewing-requested': 'viewing_requested',
    viewingrequested: 'viewing_requested',
    follow_up: 'follow_up',
    'follow-up': 'follow_up',
    followup: 'follow_up',
    closed: 'closed',
    lost: 'lost',
  };
  const x = map[v] || (LUX_LEAD_CRM_STAGES.includes(v) ? v : null);
  return x || null;
}

/**
 * @param {string} stage
 */
export function luxLeadCrmStageLabel(stage) {
  const k = normalizeLuxLeadCrmStage(stage) || 'new';
  return STAGE_LABEL[k] || 'New';
}

/**
 * @param {Record<string, unknown>} qj
 * @param {string} nowIso
 */
export function defaultLuxOperatorWorkflow(nowIso) {
  return {
    stage: 'new',
    stage_updated_at: nowIso,
    internal_notes: [],
    follow_up_status: null,
  };
}

/**
 * @param {unknown} qj
 * @returns {{
 *   stage: string,
 *   stage_updated_at: string | null,
 *   internal_notes: { at: string, text: string }[],
 *   follow_up_status: string | null,
 * }}
 */
export function parseLuxOperatorWorkflow(qj) {
  const root = qj && typeof qj === 'object' ? qj : {};
  const ow = root.lux_operator_workflow && typeof root.lux_operator_workflow === 'object' ? root.lux_operator_workflow : {};
  const stage = normalizeLuxLeadCrmStage(ow.stage) || 'new';
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
    .slice(-100);
  const stage_updated_at = ow.stage_updated_at != null ? String(ow.stage_updated_at).trim() : null;
  const follow_up_status =
    ow.follow_up_status != null && String(ow.follow_up_status).trim()
      ? String(ow.follow_up_status).trim().slice(0, 500)
      : null;
  return {
    stage,
    stage_updated_at: stage_updated_at || null,
    internal_notes,
    follow_up_status,
  };
}

/**
 * @param {Record<string, unknown>} qualificationJson
 * @param {{ stage?: string | null, note?: string | null, follow_up_status?: string | null }} patch
 * @param {string} nowIso
 */
export function mergeLuxOperatorWorkflowPatch(qualificationJson, patch, nowIso) {
  const qj = qualificationJson && typeof qualificationJson === 'object' ? { ...qualificationJson } : {};
  const prev = parseLuxOperatorWorkflow(qj);
  const next = {
    stage: prev.stage,
    stage_updated_at: prev.stage_updated_at || nowIso,
    internal_notes: [...prev.internal_notes],
    follow_up_status: prev.follow_up_status,
  };
  if (patch.stage != null && String(patch.stage).trim()) {
    const ns = normalizeLuxLeadCrmStage(patch.stage);
    if (ns) {
      next.stage = ns;
      next.stage_updated_at = nowIso;
    }
  }
  if (patch.follow_up_status !== undefined) {
    const f = patch.follow_up_status;
    if (f === null || f === '') next.follow_up_status = null;
    else next.follow_up_status = String(f).trim().slice(0, 500) || null;
  }
  if (patch.note != null && String(patch.note).trim()) {
    next.internal_notes.push({
      at: nowIso,
      text: String(patch.note).trim().slice(0, 4000),
    });
    next.internal_notes = next.internal_notes.slice(-100);
  }
  qj.lux_operator_workflow = next;
  return qj;
}

/**
 * @param {ReturnType<typeof parseLuxOperatorWorkflow>} ow
 */
export function luxOperatorWorkflowForApiList(ow) {
  const notes = ow.internal_notes || [];
  const latest = notes.length ? notes[notes.length - 1] : null;
  return {
    stage: ow.stage,
    stage_label: luxLeadCrmStageLabel(ow.stage),
    stage_updated_at: ow.stage_updated_at,
    follow_up_status: ow.follow_up_status,
    latest_note: latest,
    internal_notes: notes.slice(-25),
  };
}

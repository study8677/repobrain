export const LUX_PARENT_PROGRAMME_TICKET_ID = 'cmo8mjijk0000jl04l1jz0v6d';

export const LUX_REQUEST_TYPE_KEYS = Object.freeze([
  'property_update',
  'website_refinement',
  'concierge_workflow',
  'marketing_request',
  'crm_workflow',
  'new_feature',
  'support_issue',
]);

export const LUX_REQUEST_PRIORITY_KEYS = Object.freeze(['Low', 'Normal', 'High']);

export function normalizeLuxRequestType(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase().replace(/\s+/g, '_').replace(/-+/g, '_') : '';
  if (!v) return null;
  if (LUX_REQUEST_TYPE_KEYS.includes(v)) return v;
  const map = {
    'property update': 'property_update',
    property: 'property_update',
    website: 'website_refinement',
    refinement: 'website_refinement',
    concierge: 'concierge_workflow',
    marketing: 'marketing_request',
    crm: 'crm_workflow',
    feature: 'new_feature',
    support: 'support_issue',
  };
  return map[v] || null;
}

export function normalizeLuxRequestPriority(raw) {
  const v = raw != null ? String(raw).trim().toLowerCase() : '';
  if (!v) return 'Normal';
  if (v === 'low') return 'Low';
  if (v === 'high') return 'High';
  if (v === 'normal' || v === 'medium') return 'Normal';
  return 'Normal';
}

export function validateLuxClientRequestBody(body) {
  const b = body && typeof body === 'object' ? body : {};

  const requestType = normalizeLuxRequestType(b.request_type);
  if (!requestType) return { ok: false, error: 'request_type is required and must be allowlisted' };

  const title = b.title != null ? String(b.title).trim().slice(0, 140) : '';
  if (!title) return { ok: false, error: 'title is required' };

  const description = b.description != null ? String(b.description).trim().slice(0, 8000) : '';
  if (!description) return { ok: false, error: 'description is required' };

  const priority = normalizeLuxRequestPriority(b.priority);

  const propertyReference =
    b.property_reference != null && String(b.property_reference).trim()
      ? String(b.property_reference).trim().slice(0, 120)
      : null;

  return {
    ok: true,
    value: {
      request_type: requestType,
      title,
      description,
      priority,
      property_reference: propertyReference,
    },
  };
}

export function buildLuxClientRequestConsoleJson(args) {
  const nowIso = args.nowIso;
  const meta = {
    request_type: args.request_type,
    priority: args.priority,
    property_reference: args.property_reference || null,
    title: args.title || null,
    description_preview: args.description ? String(args.description).slice(0, 300) : null,
    created_at: nowIso,
  };

  return {
    locale: 'en',
    parent_programme_ticket: LUX_PARENT_PROGRAMME_TICKET_ID,
    request_type: args.request_type,
    priority: args.priority,
    property_reference: args.property_reference || null,
    lux_request_meta: meta,
    brief: {},
    messages: [],
    client_view: {
      workflow_state: 'awaiting_operator_review',
      workflow_next_action: 'Operator review required',
      progress_message: 'Request received — awaiting operator review.',
    },
  };
}

export function safeLuxRelatedRequestShape(row) {
  const cj = row && row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const request_type = cj.request_type != null ? String(cj.request_type) : null;
  const priority = cj.priority != null ? String(cj.priority) : null;
  const property_reference = cj.property_reference != null ? String(cj.property_reference) : null;
  const wf = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const workflow_state = wf.workflow_state != null ? String(wf.workflow_state) : null;
  const description_preview =
    row && row.description != null && String(row.description).trim()
      ? String(row.description).trim().slice(0, 300)
      : cj?.lux_request_meta?.description_preview != null
        ? String(cj.lux_request_meta.description_preview).slice(0, 300)
        : null;

  return {
    ticket_id: row.id,
    created_at: row.createdAt,
    title: row.title || null,
    description_preview,
    status: row.status || null,
    stage: row.stage || null,
    workflow_state,
    request_type,
    priority,
    property_reference,
  };
}


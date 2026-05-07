import { useEffect, useMemo, useState } from 'react';
import { LUX_PHASE1_REVIEW_TICKET_ID } from '../lib/cmp/_lib/client-decisions-client.js';
import {
  LUX_LEAD_CRM_STAGES,
  activityKindLabel,
  luxLeadCrmStageLabel,
} from '../lib/cmp/_lib/lux-lead-operator-workflow.js';

function normalizeLocale(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  if (!s) return 'en';
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('fr')) return 'fr';
  if (s.startsWith('de')) return 'de';
  if (s.startsWith('pt')) return 'pt';
  return 'en';
}

function stageForWorkflowState(wf) {
  const s = String(wf || '').trim();
  if (s === 'in_review' || s === 'preview_ready' || s === 'changes_requested' || s === 'client_approved')
    return 'Review';
  if (s === 'approved_for_build' || s === 'building' || s === 'publishing' || s === 'published') return 'Build';
  if (s === 'awaiting_client_programme_decisions') return 'Draft';
  if (s === 'ready_for_estimate' || s === 'estimated') return 'Draft';
  if (s === 'refining') return 'Clarify';
  return 'Intake';
}

function isoToDatetimeLocalValue(iso) {
  if (!iso) return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function pillStyle(active) {
  return {
    padding: '8px 10px',
    borderRadius: 999,
    border: `1px solid ${active ? '#38bdf8' : '#334155'}`,
    background: active ? 'rgba(56,189,248,0.12)' : 'rgba(2,6,23,0.35)',
    color: active ? '#e0f2fe' : '#cbd5e1',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
  };
}

/** Mirrors `public/change.html` workflow labels for Intake detection. */
function workflowLabel(state) {
  const s = String(state || '').trim().toLowerCase();
  const map = {
    intake: 'Intake',
    refining: 'Refining',
    ready_for_estimate: 'Ready for estimate',
    estimated: 'Estimated',
    approved_for_build: 'Approved for build',
    building: 'Building',
    preview_ready: 'Preview ready',
    in_review: 'In review',
    changes_requested: 'Changes requested',
    client_approved: 'Client approved',
    publishing: 'Publishing',
    published: 'Published',
    closed: 'Closed',
    not_delivered: 'NOT DELIVERED',
  };
  return map[s] || (s ? s : '—');
}

function computeIsIntakeUx(ticketLike) {
  const m = ticketLike && typeof ticketLike === 'object' ? ticketLike : {};
  const tp = m.ticket_progress && typeof m.ticket_progress === 'object' ? m.ticket_progress : null;
  const cv = tp && tp.client_view && typeof tp.client_view === 'object' ? tp.client_view : {};
  const wfRaw = cv.workflow_state != null ? String(cv.workflow_state).trim() : '';
  const wf = wfRaw.toLowerCase();
  const st = String((tp && tp.status) || m.status || '').trim().toLowerCase();
  if (st === 'closed') return false;
  const label = workflowLabel(wfRaw);
  if (label === 'Intake') return true;
  if (!wf && (st === 'open' || st === 'created' || !st)) return true;
  return false;
}

function formatExistingRequestText(ticketLike) {
  const m = ticketLike && typeof ticketLike === 'object' ? ticketLike : {};
  const d = m.description != null ? String(m.description).trim() : '';
  if (d) return d;
  const bs = m.brief_structured && typeof m.brief_structured === 'object' ? m.brief_structured : null;
  if (bs && typeof bs.summary === 'string' && bs.summary.trim()) return String(bs.summary).trim();
  const tp = m.ticket_progress && typeof m.ticket_progress === 'object' ? m.ticket_progress : null;
  const cv = tp && tp.client_view && typeof tp.client_view === 'object' ? tp.client_view : {};
  const pm = typeof cv.progress_message === 'string' ? cv.progress_message.trim() : '';
  if (pm) return pm;
  return 'No description has been saved on this request yet. Add your wording above.';
}

export default function ChangeConsolePage() {
  const [locale, setLocale] = useState('en');
  const [uiContext, setUiContext] = useState(null);
  const [session, setSession] = useState({ logged_in: false, level: 'anonymous', tenant_id: null });
  const [tickets, setTickets] = useState([]);
  const [selectedTicketId, setSelectedTicketId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [stage, setStage] = useState('Intake');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [clientDecisionBusy, setClientDecisionBusy] = useState(false);
  const [clientDecisionLink, setClientDecisionLink] = useState('');
  const [clientDecisionExpiresAt, setClientDecisionExpiresAt] = useState('');
  const [clientDecisionStatus, setClientDecisionStatus] = useState('');
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [leadPatchBusy, setLeadPatchBusy] = useState(false);
  const [leadStageDraft, setLeadStageDraft] = useState('new');
  const [leadFollowDraft, setLeadFollowDraft] = useState('');
  const [leadNoteDraft, setLeadNoteDraft] = useState('');
  const [leadOwnerDraft, setLeadOwnerDraft] = useState('');
  const [leadNextActionDraft, setLeadNextActionDraft] = useState('');
  const [leadNextActionNoteDraft, setLeadNextActionNoteDraft] = useState('');
  const [crmFilterStage, setCrmFilterStage] = useState('all');
  const [crmFilterOwner, setCrmFilterOwner] = useState('');
  const [crmFilterProperty, setCrmFilterProperty] = useState('');
  const [crmFilterHealth, setCrmFilterHealth] = useState('all');
  const [leadPatchStatus, setLeadPatchStatus] = useState('');
  const [requestDraft, setRequestDraft] = useState('');
  const [intakeNotice, setIntakeNotice] = useState('');

  useEffect(() => {
    try {
      setLocale(normalizeLocale(navigator.language));
    } catch {
      setLocale('en');
    }
  }, []);

  const stageTabs = useMemo(() => ['Intake', 'Clarify', 'Draft', 'Review', 'Build'], []);

  async function refreshUiContext() {
    const r = await fetch('/api/ui/context', { credentials: 'include' });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j || j.ok !== true) throw new Error(j?.error || 'ui/context failed');
    setUiContext(j);
    setSession(j.session || { logged_in: false, level: 'anonymous', tenant_id: null });
    return j;
  }

  async function loadQueue() {
    const r = await fetch('/api/cmp/router?action=ticket-operator-queue&limit=50', {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    const rows = Array.isArray(j.tickets) ? j.tickets : [];
    setTickets(rows);
    return rows;
  }

  async function loadTicketById(id) {
    const tid = String(id || '').trim();
    if (!tid) return null;
    const r = await fetch('/api/cmp/router?action=ticket-get&id=' + encodeURIComponent(tid), {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    setTicket(j);
    const wf = j?.ticket_progress?.client_view?.workflow_state || '';
    setStage(stageForWorkflowState(wf));
    return j;
  }

  async function loadLeads() {
    const r = await fetch('/api/cmp/router?action=concierge-leads-list&limit=100', {
      credentials: 'include',
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
    const rows = Array.isArray(j.leads) ? j.leads : [];
    setLeads(rows);
    return rows;
  }

  const luxLeadCrmEnabled = useMemo(() => {
    return (
      session.logged_in === true &&
      String(session.level || '').toLowerCase() === 'tenant' &&
      String(session.tenant_id || '').trim() === 'luxe-maurice'
    );
  }, [session.logged_in, session.level, session.tenant_id]);

  const crmStageCounts = useMemo(() => {
    const base = Object.fromEntries(LUX_LEAD_CRM_STAGES.map((s) => [s, 0]));
    if (!luxLeadCrmEnabled) return base;
    for (const lead of leads) {
      const st = lead?.operator_workflow?.stage;
      if (st && base[st] !== undefined) base[st] += 1;
    }
    return base;
  }, [leads, luxLeadCrmEnabled]);

  const crmOwnerHints = useMemo(() => {
    if (!luxLeadCrmEnabled) return [];
    const s = new Set();
    for (const lead of leads) {
      const u = lead?.operator_workflow?.owner?.username;
      if (u) s.add(String(u).trim());
    }
    return [...s].sort().slice(0, 40);
  }, [leads, luxLeadCrmEnabled]);

  const crmVisibleLeads = useMemo(() => {
    if (!luxLeadCrmEnabled) return leads;
    const ownerQ = String(crmFilterOwner || '').trim().toLowerCase();
    const propQ = String(crmFilterProperty || '').trim().toLowerCase();
    return leads.filter((lead) => {
      const ow = lead.operator_workflow;
      if (!ow) return true;
      if (crmFilterStage !== 'all' && String(ow.stage || '') !== crmFilterStage) return false;
      if (ownerQ) {
        const un = ow.owner?.username != null ? String(ow.owner.username).toLowerCase() : '';
        if (!un.includes(ownerQ)) return false;
      }
      if (propQ) {
        const slug = lead.property_interest?.slug != null ? String(lead.property_interest.slug).toLowerCase() : '';
        const title = lead.property_interest?.title != null ? String(lead.property_interest.title).toLowerCase() : '';
        const listing = lead.listing != null ? String(lead.listing).toLowerCase() : '';
        if (!slug.includes(propQ) && !title.includes(propQ) && !listing.includes(propQ)) return false;
      }
      if (crmFilterHealth === 'overdue_follow_up' && !ow.overdue_follow_up) return false;
      if (crmFilterHealth === 'stale_lead' && !ow.stale_lead) return false;
      if (crmFilterHealth === 'untouched_new' && !ow.untouched_new) return false;
      return true;
    });
  }, [leads, luxLeadCrmEnabled, crmFilterStage, crmFilterOwner, crmFilterProperty, crmFilterHealth]);

  const selectedLead = useMemo(
    () => leads.find((x) => String(x.id || '') === String(selectedLeadId || '')) || null,
    [leads, selectedLeadId],
  );

  useEffect(() => {
    if (!luxLeadCrmEnabled || !selectedLead?.operator_workflow) return;
    const ow = selectedLead.operator_workflow;
    setLeadStageDraft(String(ow.stage || 'new'));
    setLeadFollowDraft(ow.follow_up_status != null ? String(ow.follow_up_status) : '');
    setLeadOwnerDraft(ow.owner?.username != null ? String(ow.owner.username) : '');
    setLeadNextActionDraft(isoToDatetimeLocalValue(ow.next_action_at));
    setLeadNextActionNoteDraft(ow.next_action_note != null ? String(ow.next_action_note) : '');
    setLeadNoteDraft('');
  }, [
    luxLeadCrmEnabled,
    selectedLeadId,
    selectedLead?.operator_workflow?.stage,
    selectedLead?.operator_workflow?.follow_up_status,
    selectedLead?.operator_workflow?.owner?.username,
    selectedLead?.operator_workflow?.next_action_at,
    selectedLead?.operator_workflow?.next_action_note,
  ]);

  function intentLabel(intentVal) {
    const i = String(intentVal || '').trim();
    if (i === 'lux_property_enquiry') return 'Property enquiry';
    if (i === 'ai_concierge_lite') return 'Concierge (general)';
    return i || '—';
  }

  function discoveryLabel(ds) {
    if (String(ds || '') === 'feed') return 'Explore (feed preview)';
    if (String(ds || '') === 'manual_curated') return 'Manual (curated)';
    if (String(ds || '') === 'curated') return 'Featured (curated)';
    return ds ? String(ds) : '—';
  }

  async function applyLuxLeadOperatorPatch() {
    const id = String(selectedLeadId || '').trim();
    if (!id || !luxLeadCrmEnabled) return;
    setLeadPatchBusy(true);
    setLeadPatchStatus('');
    try {
      const ow = selectedLead?.operator_workflow;
      const curStage = ow ? String(ow.stage || 'new') : 'new';
      const curFollow = ow?.follow_up_status != null ? String(ow.follow_up_status) : '';
      const curOwner = ow?.owner?.username != null ? String(ow.owner.username) : '';
      const stageChanged = String(leadStageDraft || '') !== curStage;
      const followChanged = String(leadFollowDraft || '') !== curFollow;
      const ownerChanged = String(leadOwnerDraft || '').trim() !== curOwner;
      const noteTrim = String(leadNoteDraft || '').trim();
      const prevDtLocal = isoToDatetimeLocalValue(ow?.next_action_at);
      const nextActionChanged = String(leadNextActionDraft || '').trim() !== String(prevDtLocal || '').trim();
      const curNextNote = ow?.next_action_note != null ? String(ow.next_action_note) : '';
      const nextNoteChanged = String(leadNextActionNoteDraft || '').trim() !== curNextNote.trim();
      const body = { lead_id: id };
      if (stageChanged) body.stage = leadStageDraft;
      if (followChanged) body.follow_up_status = leadFollowDraft;
      if (ownerChanged) body.assign_owner = String(leadOwnerDraft || '').trim();
      if (noteTrim) body.note = noteTrim;
      if (nextActionChanged) {
        const trimDt = String(leadNextActionDraft || '').trim();
        if (!trimDt) body.next_action_at = null;
        else {
          const d = new Date(trimDt);
          if (Number.isNaN(d.getTime())) {
            setLeadPatchStatus('Invalid next action date/time.');
            return;
          }
          body.next_action_at = d.toISOString();
        }
      }
      if (nextNoteChanged) body.next_action_note = String(leadNextActionNoteDraft || '').trim();
      if (
        !body.stage &&
        body.follow_up_status === undefined &&
        !body.note &&
        body.assign_owner === undefined &&
        body.next_action_at === undefined &&
        body.next_action_note === undefined
      ) {
        setLeadPatchStatus('Nothing to save.');
        return;
      }
      const r = await fetch('/api/cmp/router?action=concierge-lead-operator-patch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      setLeadPatchStatus('Saved.');
      setLeadNoteDraft('');
      await loadLeads();
    } catch (e) {
      setLeadPatchStatus(String(e?.message || e));
    } finally {
      setLeadPatchBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const ctx = await refreshUiContext();
        if (cancelled) return;
        const loggedIn = ctx?.session?.logged_in === true;
        const isLuxTenant =
          loggedIn &&
          String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
          String(ctx?.session?.tenant_id || '').trim() === 'luxe-maurice';
        const isTenantScoped =
          loggedIn &&
          String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
          String(ctx?.session?.tenant_id || '').trim().length > 0;
        const shouldLoadQueue = loggedIn && (ctx?.surface === 'core' || isTenantScoped);
        if (!shouldLoadQueue) return;

        const rows = await loadQueue();
        if (cancelled) return;
        if (isLuxTenant) await loadLeads();
        if (cancelled) return;
        const first = rows[0]?.ticket_id ? String(rows[0].ticket_id) : '';
        if (first) {
          setSelectedTicketId(first);
          await loadTicketById(first);
        }
      } catch (e) {
        if (cancelled) return;
        setError(String(e?.message || e));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTicketId) {
      setRequestDraft('');
      return;
    }
    if (!ticket) return;
    if (String(ticket.ticket_id || '').trim() !== selectedTicketId) return;
    const d = ticket.description != null ? String(ticket.description) : '';
    setRequestDraft(d);
  }, [selectedTicketId, ticket]);

  async function onSelectTicket(id) {
    setError('');
    setIntakeNotice('');
    setClientDecisionLink('');
    setClientDecisionExpiresAt('');
    setClientDecisionStatus('');
    const tid = String(id || '').trim();
    if (!tid) return;
    setSelectedTicketId(tid);
    try {
      await loadTicketById(tid);
    } catch (e) {
      setError(String(e?.message || e));
    }
  }

  async function saveIntakeContinue() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) {
      setError('Select a ticket first.');
      return;
    }
    const msg = String(requestDraft || '').trim();
    if (!msg) {
      setError('Add a short description of your request first.');
      return;
    }
    setBusy(true);
    setError('');
    setIntakeNotice('');
    try {
      const r = await fetch('/api/cmp/router?action=change-chat', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid, message: msg, locale }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      await loadTicketById(tid);
      setIntakeNotice('Saved. Your wording is stored on this ticket for the team to review.');
      window.setTimeout(() => setIntakeNotice(''), 5000);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function mintClientDecisionLink() {
    const tid = String(selectedTicketId || '').trim();
    if (!tid) return;
    setClientDecisionBusy(true);
    setClientDecisionLink('');
    setClientDecisionExpiresAt('');
    setClientDecisionStatus('Generating link…');
    try {
      const r = await fetch('/api/cmp/router?action=client-decisions-link-mint', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: tid }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || j.hint || `http_${r.status}`);
      const url = String(j.magic_link_url || '').trim();
      const exp = String(j.expires_at || '').trim();
      if (!url) throw new Error('magic_link_url missing');
      setClientDecisionLink(url);
      setClientDecisionExpiresAt(exp);
      setClientDecisionStatus('Link ready.');
    } catch (e) {
      setClientDecisionStatus(String(e?.message || e));
    } finally {
      setClientDecisionBusy(false);
    }
  }

  async function copyToClipboard(text) {
    const v = String(text || '');
    if (!v) return false;
    try {
      await navigator.clipboard.writeText(v);
      return true;
    } catch {
      return false;
    }
  }

  const wf = ticket?.ticket_progress?.client_view?.workflow_state || '';
  const needClientDecision = String(wf || '').trim() === 'awaiting_client_programme_decisions';

  const approvedBuild =
    String(ticket?.status || '').trim().toLowerCase() === 'approved' &&
    String(ticket?.stage || '').trim().toLowerCase() === 'build';
  const luxPhase1ReviewDone = ticket?.client_decisions_summary?.sufficient_to_proceed === true;
  const showLuxPhase1ReviewPanel =
    String(selectedTicketId || '').trim() === LUX_PHASE1_REVIEW_TICKET_ID && approvedBuild && !luxPhase1ReviewDone;
  const showGenericClientDecisionPanel =
    needClientDecision &&
    String(selectedTicketId || '').trim() !== LUX_PHASE1_REVIEW_TICKET_ID &&
    approvedBuild;
  const showLuxPhase1ReviewComplete =
    String(selectedTicketId || '').trim() === LUX_PHASE1_REVIEW_TICKET_ID && approvedBuild && luxPhase1ReviewDone;

  const showIntakeSkin = Boolean(selectedTicketId && ticket && computeIsIntakeUx(ticket));
  const workflowStageLabel = ticket
    ? workflowLabel(String(ticket?.ticket_progress?.client_view?.workflow_state || ''))
    : '—';

  const page = {
    fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
    padding: 24,
    maxWidth: 1200,
    margin: '0 auto',
    color: '#e2e8f0',
  };

  const card = {
    border: '1px solid rgba(148,163,184,0.25)',
    borderRadius: 16,
    background: 'rgba(2,6,23,0.55)',
    padding: 16,
  };

  return (
    <div style={{ ...page, background: '#020617', minHeight: '100vh' }}>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 24, fontWeight: 950, color: '#f8fafc' }}>Change Console</div>
        <div style={{ marginTop: 6, color: '#94a3b8', fontSize: 13, lineHeight: 1.45 }}>
          Operator workspace: open, select a ticket, take one governed action.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 14 }}>
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
              OPERATOR QUEUE
            </div>
            <button
              type="button"
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const ctx = await refreshUiContext();
                  const rows = await loadQueue();
                  const isLuxTenant =
                    ctx?.session?.logged_in === true &&
                    String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
                    String(ctx?.session?.tenant_id || '').trim() === 'luxe-maurice';
                  if (isLuxTenant) await loadLeads();
                  const first = rows[0]?.ticket_id ? String(rows[0].ticket_id) : '';
                  if (!selectedTicketId && first) await onSelectTicket(first);
                } catch (e) {
                  setError(String(e?.message || e));
                } finally {
                  setBusy(false);
                }
              }}
              disabled={busy}
              style={{
                padding: '6px 10px',
                borderRadius: 10,
                border: '1px solid rgba(148,163,184,0.25)',
                background: 'rgba(15,23,42,0.35)',
                color: '#e2e8f0',
                fontWeight: 800,
                fontSize: 12,
                cursor: busy ? 'not-allowed' : 'pointer',
              }}
            >
              Refresh
            </button>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
            {session.logged_in ? (
              <span>
                Session: <strong style={{ color: '#e2e8f0' }}>{String(session.level || '')}</strong>
                {session.tenant_id ? (
                  <span>
                    {' '}
                    ({String(session.tenant_id)})
                  </span>
                ) : null}
              </span>
            ) : (
              <span>
                Not logged in. <a href="/login" style={{ color: '#7dd3fc' }}>Login</a>
              </span>
            )}
          </div>

          <div style={{ marginTop: 12 }}>
            {tickets.length ? (
              <div style={{ display: 'grid', gap: 8 }}>
                {tickets.map((t) => {
                  const id = String(t.ticket_id || '');
                  const active = id && id === selectedTicketId;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onSelectTicket(id)}
                      style={{
                        textAlign: 'left',
                        padding: 12,
                        borderRadius: 14,
                        border: `1px solid ${active ? 'rgba(56,189,248,0.6)' : 'rgba(148,163,184,0.25)'}`,
                        background: active ? 'rgba(56,189,248,0.10)' : 'rgba(15,23,42,0.35)',
                        color: '#e2e8f0',
                        cursor: 'pointer',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                          fontSize: 10,
                          color: '#94a3b8',
                        }}
                      >
                        {id}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 12, color: '#e2e8f0', lineHeight: 1.35 }}>
                        {String(t.requested_change || '—')}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ marginTop: 10, color: '#94a3b8', fontSize: 12, lineHeight: 1.4 }}>
                {session.logged_in
                  ? 'No open tickets found (or queue is unavailable for this session).'
                  : 'Log in to view your queue.'}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14 }}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                  STAGE
                </div>
                <div style={{ marginTop: 6, fontSize: 13, color: '#e2e8f0', lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 800 }}>
                    Stage:{' '}
                    {selectedTicketId
                      ? workflowStageLabel !== '—'
                        ? workflowStageLabel
                        : 'Intake'
                      : '—'}
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                      fontSize: 12,
                      color: '#94a3b8',
                    }}
                  >
                    Ticket: {selectedTicketId || '—'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {stageTabs.map((s) => (
                  <button key={s} type="button" onClick={() => setStage(s)} style={pillStyle(stage === s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 14, borderTop: '1px solid rgba(148,163,184,0.18)', paddingTop: 14 }}>
              {showLuxPhase1ReviewPanel ? (
                <div
                  style={{
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: 14,
                    padding: 14,
                    background: 'rgba(56,189,248,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#e0f2fe' }}>Next: Phase 1 client review</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                    Phase 1 is live on lux.corpflowai.com (presentation + concierge only). Send a one-time link so
                    the client can approve direction, classify images, and authorize (or hold) Phase 2. No login
                    required for the client.
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={mintClientDecisionLink}
                      disabled={clientDecisionBusy || !selectedTicketId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: 'none',
                        background: clientDecisionBusy ? '#94a3b8' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 950,
                        cursor: clientDecisionBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {clientDecisionBusy ? 'Generating…' : 'Send Phase 1 review request'}
                    </button>
                    {clientDecisionLink ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(clientDecisionLink);
                          setClientDecisionStatus(ok ? 'Copied.' : 'Copy failed — select and copy manually.');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(15,23,42,0.35)',
                          color: '#e2e8f0',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Copy link
                      </button>
                    ) : null}
                  </div>
                  {clientDecisionLink ? (
                    <div style={{ marginTop: 10 }}>
                      <input
                        readOnly
                        value={clientDecisionLink}
                        style={{
                          width: '100%',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                      {clientDecisionExpiresAt ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                          Expires: {clientDecisionExpiresAt}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {clientDecisionStatus ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{clientDecisionStatus}</div>
                  ) : null}
                </div>
              ) : null}

              {showGenericClientDecisionPanel ? (
                <div
                  style={{
                    border: '1px solid rgba(56,189,248,0.35)',
                    borderRadius: 14,
                    padding: 14,
                    background: 'rgba(56,189,248,0.08)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 950, color: '#e0f2fe' }}>Client input required</div>
                  <div style={{ marginTop: 6, fontSize: 12, color: '#cbd5e1', lineHeight: 1.45 }}>
                    Send a one-time link so the client can answer the programme decisions. No login required for the
                    client.
                  </div>
                  <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={mintClientDecisionLink}
                      disabled={clientDecisionBusy || !selectedTicketId}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: 'none',
                        background: clientDecisionBusy ? '#94a3b8' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 950,
                        cursor: clientDecisionBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {clientDecisionBusy ? 'Generating…' : 'Send client decision request'}
                    </button>
                    {clientDecisionLink ? (
                      <button
                        type="button"
                        onClick={async () => {
                          const ok = await copyToClipboard(clientDecisionLink);
                          setClientDecisionStatus(ok ? 'Copied.' : 'Copy failed — select and copy manually.');
                        }}
                        style={{
                          padding: '10px 12px',
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(15,23,42,0.35)',
                          color: '#e2e8f0',
                          fontWeight: 900,
                          cursor: 'pointer',
                        }}
                      >
                        Copy link
                      </button>
                    ) : null}
                  </div>
                  {clientDecisionLink ? (
                    <div style={{ marginTop: 10 }}>
                      <input
                        readOnly
                        value={clientDecisionLink}
                        style={{
                          width: '100%',
                          padding: 10,
                          borderRadius: 12,
                          border: '1px solid rgba(148,163,184,0.25)',
                          background: 'rgba(2,6,23,0.45)',
                          color: '#e2e8f0',
                          fontSize: 12,
                        }}
                      />
                      {clientDecisionExpiresAt ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#94a3b8' }}>
                          Expires: {clientDecisionExpiresAt}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {clientDecisionStatus ? (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#94a3b8' }}>{clientDecisionStatus}</div>
                  ) : null}
                </div>
              ) : null}

              {showLuxPhase1ReviewComplete ? (
                <div
                  style={{
                    marginTop: showLuxPhase1ReviewPanel || showGenericClientDecisionPanel ? 12 : 0,
                    border: '1px solid rgba(74,222,128,0.35)',
                    borderRadius: 14,
                    padding: 12,
                    background: 'rgba(74,222,128,0.08)',
                    fontSize: 12,
                    color: '#bbf7d0',
                    lineHeight: 1.45,
                  }}
                >
                  Phase 1 client review form is complete for this ticket. Phase 2 still waits on your delivery
                  process (no automatic build from this step).
                </div>
              ) : null}

              <div style={{ marginTop: 14, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, color: '#e2e8f0' }}>
                  {selectedTicketId && ticket ? workflowStageLabel : stage}
                </div>
                <div style={{ marginTop: 6, color: '#94a3b8' }}>
                  Next:{' '}
                  {showIntakeSkin
                    ? 'Next step: Add or refine your request, then continue.'
                    : String(ticket?.ticket_progress?.client_view?.workflow_next_action || '—')}
                </div>
                {ticket?.lux_programme_summary?.phase_2_status ? (
                  <div style={{ marginTop: 8, fontSize: 12, color: '#94a3b8', lineHeight: 1.45 }}>
                    Programme: Phase 1 {String(ticket.lux_programme_summary.phase_1_status || '—')} · Phase 2{' '}
                    {String(ticket.lux_programme_summary.phase_2_status || '—')}
                    {ticket.lux_programme_summary.listing_approach
                      ? ` · listing approach: ${String(ticket.lux_programme_summary.listing_approach)}`
                      : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {session.logged_in ? (
            <div style={card}>
              {session.logged_in && (!selectedTicketId || showIntakeSkin) ? (
                <div
                  style={{
                    marginBottom: 14,
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(56,189,248,0.22)',
                    background: 'rgba(14,165,233,0.06)',
                    fontSize: 13,
                    color: '#e2e8f0',
                    lineHeight: 1.5,
                  }}
                >
                  This is where you describe your request. The clearer this is, the faster we can help you.
                </div>
              ) : null}
              <div style={{ fontSize: showIntakeSkin ? 11 : 12, fontWeight: 600, color: '#cbd5e1', marginBottom: 8 }}>
                {showIntakeSkin ? 'Your request' : 'Describe the change'}
              </div>
              <textarea
                value={requestDraft}
                onChange={(e) => setRequestDraft(e.target.value)}
                placeholder="Describe what you want changed in plain language…"
                rows={showIntakeSkin ? 8 : 5}
                style={{
                  width: '100%',
                  minHeight: showIntakeSkin ? 220 : 140,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: '1px solid rgba(51,65,85,0.65)',
                  background: 'rgba(2,6,23,0.72)',
                  color: '#f1f5f9',
                  fontSize: 13,
                  lineHeight: 1.45,
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
              {showIntakeSkin ? (
                <>
                  <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: '#cbd5e1' }}>
                    Existing request
                  </div>
                  <div
                    style={{
                      marginTop: 8,
                      padding: '12px 14px',
                      borderRadius: 14,
                      border: '1px solid rgba(51,65,85,0.65)',
                      background: 'rgba(2,6,23,0.55)',
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      minHeight: '4.5rem',
                    }}
                  >
                    {ticket ? formatExistingRequestText(ticket) : '—'}
                  </div>
                  <div
                    style={{
                      marginTop: 14,
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid rgba(52,211,153,0.22)',
                      background: 'rgba(6,78,59,0.15)',
                      fontSize: 13,
                      color: '#e2e8f0',
                      lineHeight: 1.5,
                    }}
                  >
                    You are ready to continue when your request clearly explains what you want changed and what
                    outcome you expect.
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={() => void saveIntakeContinue()}
                      disabled={busy}
                      style={{
                        padding: '12px 18px',
                        borderRadius: 12,
                        border: 'none',
                        background: busy ? '#64748b' : '#38bdf8',
                        color: '#020617',
                        fontWeight: 700,
                        fontSize: 14,
                        cursor: busy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Save and continue
                    </button>
                  </div>
                </>
              ) : null}
              {intakeNotice ? (
                <div style={{ marginTop: 12, fontSize: 12, color: '#86efac' }}>{intakeNotice}</div>
              ) : null}
            </div>
          ) : null}

          {!showIntakeSkin ? (
            <div style={card}>
              <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
                TICKET SNAPSHOT
              </div>
              <div style={{ marginTop: 10 }}>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    borderRadius: 14,
                    border: '1px solid rgba(148,163,184,0.18)',
                    background: 'rgba(2,6,23,0.45)',
                    overflowX: 'auto',
                    fontSize: 12,
                    color: '#e2e8f0',
                  }}
                >
                  {JSON.stringify(
                    ticket
                      ? {
                          ticket_id: selectedTicketId,
                          status: ticket.status,
                          stage: ticket.stage,
                          workflow_state: ticket?.ticket_progress?.client_view?.workflow_state,
                          client_decisions_summary: ticket.client_decisions_summary || null,
                          lux_programme_summary: ticket.lux_programme_summary || null,
                          operator_signal: ticket.operator_signal || null,
                        }
                      : { hint: session.logged_in ? 'Select a ticket to load.' : 'Log in to load tickets.' },
                    null,
                    2,
                  )}
                </pre>
              </div>
            </div>
          ) : null}

          {!showIntakeSkin ? (
          <div style={card}>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#cbd5e1', letterSpacing: '0.08em' }}>
              LEADS
              {luxLeadCrmEnabled ? (
                <span style={{ marginLeft: 8, fontWeight: 700, color: '#67e8f9', letterSpacing: '0.04em' }}>
                  · LuxeMaurice CRM (concierge)
                </span>
              ) : null}
            </div>
            {luxLeadCrmEnabled ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 8,
                  alignItems: 'center',
                }}
              >
                {LUX_LEAD_CRM_STAGES.map((s) => (
                  <span
                    key={s}
                    style={{
                      fontSize: 11,
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(15,23,42,0.5)',
                      color: '#e2e8f0',
                      fontWeight: 700,
                    }}
                  >
                    {luxLeadCrmStageLabel(s)}: {crmStageCounts[s] ?? 0}
                  </span>
                ))}
              </div>
            ) : null}
            {luxLeadCrmEnabled ? (
              <div
                style={{
                  marginTop: 12,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 10,
                  alignItems: 'end',
                }}
              >
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Stage
                  <select
                    value={crmFilterStage}
                    onChange={(e) => setCrmFilterStage(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="all">All stages</option>
                    {LUX_LEAD_CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {luxLeadCrmStageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Owner contains
                  <input
                    list="crm-owner-hints"
                    value={crmFilterOwner}
                    onChange={(e) => setCrmFilterOwner(e.target.value)}
                    placeholder="Filter by owner"
                    style={{
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                  <datalist id="crm-owner-hints">
                    {crmOwnerHints.map((h) => (
                      <option key={h} value={h} />
                    ))}
                  </datalist>
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4, gridColumn: 'span 2' }}>
                  Property (slug / title / ref)
                  <input
                    value={crmFilterProperty}
                    onChange={(e) => setCrmFilterProperty(e.target.value)}
                    placeholder="e.g. lm- or partial title"
                    style={{
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  />
                </label>
                <label style={{ fontSize: 10, color: '#94a3b8', display: 'grid', gap: 4 }}>
                  Health
                  <select
                    value={crmFilterHealth}
                    onChange={(e) => setCrmFilterHealth(e.target.value)}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 12,
                    }}
                  >
                    <option value="all">All</option>
                    <option value="overdue_follow_up">Overdue next action</option>
                    <option value="stale_lead">Stale (7d+ no touch)</option>
                    <option value="untouched_new">Untouched New</option>
                  </select>
                </label>
              </div>
            ) : null}
            {luxLeadCrmEnabled && leads.length ? (
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b' }}>
                Showing {crmVisibleLeads.length} of {leads.length} loaded leads
              </div>
            ) : null}
            <div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
              {crmVisibleLeads.length ? (
                crmVisibleLeads.map((lead) => {
                  const lid = String(lead.id || '');
                  const activeLux = luxLeadCrmEnabled && lid && lid === selectedLeadId;
                  const ow = lead.operator_workflow;
                  return (
                    <button
                      key={lid}
                      type="button"
                      onClick={() => {
                        if (luxLeadCrmEnabled) setSelectedLeadId(lid);
                      }}
                      style={{
                        textAlign: 'left',
                        cursor: luxLeadCrmEnabled ? 'pointer' : 'default',
                        border:
                          activeLux && luxLeadCrmEnabled
                            ? '1px solid rgba(103,232,249,0.45)'
                            : '1px solid rgba(148,163,184,0.18)',
                        borderRadius: 12,
                        background: activeLux && luxLeadCrmEnabled ? 'rgba(103,232,249,0.07)' : 'rgba(2,6,23,0.45)',
                        padding: 10,
                        color: 'inherit',
                        font: 'inherit',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0' }}>{String(lead.name || 'Lead')}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#94a3b8' }}>{String(lead.contact || '—')}</div>
                      <div style={{ marginTop: 6, fontSize: 10, color: '#64748b' }}>
                        Intent: <span style={{ color: '#94a3b8' }}>{intentLabel(lead.intent)}</span>
                        {lead.created_at ? (
                          <span style={{ display: 'block', marginTop: 2 }}>
                            Created: {new Date(lead.created_at).toLocaleString()}
                          </span>
                        ) : null}
                        {lead.updated_at ? (
                          <span style={{ display: 'block', marginTop: 2 }}>
                            Updated: {new Date(lead.updated_at).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      {luxLeadCrmEnabled && ow ? (
                        <div style={{ marginTop: 8, fontSize: 11, color: '#a5f3fc', fontWeight: 750 }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                            <span>Stage: {String(ow.stage_label || luxLeadCrmStageLabel(ow.stage))}</span>
                            {ow.owner?.username ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(253,230,138,0.15)',
                                  border: '1px solid rgba(253,230,138,0.35)',
                                  color: '#fde68a',
                                }}
                              >
                                Owner · {String(ow.owner.username)}
                              </span>
                            ) : null}
                            {ow.overdue_follow_up ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(248,113,113,0.15)',
                                  border: '1px solid rgba(248,113,113,0.4)',
                                  color: '#fecaca',
                                }}
                              >
                                Overdue next action
                              </span>
                            ) : null}
                            {ow.stale_lead ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(251,191,36,0.12)',
                                  border: '1px solid rgba(251,191,36,0.35)',
                                  color: '#fcd34d',
                                }}
                              >
                                Stale
                              </span>
                            ) : null}
                            {ow.untouched_new ? (
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: '3px 8px',
                                  borderRadius: 999,
                                  background: 'rgba(96,165,250,0.12)',
                                  border: '1px solid rgba(96,165,250,0.35)',
                                  color: '#bfdbfe',
                                }}
                              >
                                Untouched New
                              </span>
                            ) : null}
                          </div>
                          {ow.next_action_at ? (
                            <span style={{ display: 'block', marginTop: 6, fontWeight: 600, color: '#94a3b8' }}>
                              Next action: {new Date(ow.next_action_at).toLocaleString()}
                            </span>
                          ) : null}
                          {ow.follow_up_status ? (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#94a3b8' }}>
                              Follow-up: {String(ow.follow_up_status)}
                            </span>
                          ) : null}
                          {ow.latest_note?.text ? (
                            <span style={{ display: 'block', marginTop: 4, fontWeight: 600, color: '#cbd5e1' }}>
                              Latest note: {String(ow.latest_note.text).slice(0, 160)}
                              {String(ow.latest_note.text).length > 160 ? '…' : ''}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {lead.property_interest && lead.property_interest.title ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#bef264', lineHeight: 1.35 }}>
                          Property: {String(lead.property_interest.title)}
                          {lead.property_interest.slug ? ` · ref ${String(lead.property_interest.slug)}` : ''}
                          <span style={{ display: 'block', marginTop: 4, color: '#86efac', fontSize: 10 }}>
                            Discovery: {discoveryLabel(lead.property_interest.discovery_source)}
                          </span>
                          {lead.property_interest.price_range ? (
                            <span style={{ display: 'block', marginTop: 2, color: '#a3e635', fontSize: 10 }}>
                              Range: {String(lead.property_interest.price_range)}
                            </span>
                          ) : null}
                        </div>
                      ) : lead.listing ? (
                        <div style={{ marginTop: 6, fontSize: 11, color: '#bef264' }}>Listing ref: {String(lead.listing)}</div>
                      ) : null}
                      <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', lineHeight: 1.35 }}>
                        Client message
                      </div>
                      <div style={{ marginTop: 4, fontSize: 12, color: '#cbd5e1', lineHeight: 1.4 }}>{String(lead.message || '—')}</div>
                    </button>
                  );
                })
              ) : leads.length ? (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No leads match filters.</div>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8' }}>No leads yet.</div>
              )}
            </div>

            {luxLeadCrmEnabled && selectedLeadId && selectedLead ? (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 14,
                  borderTop: '1px solid rgba(148,163,184,0.18)',
                  display: 'grid',
                  gap: 10,
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 900, color: '#67e8f9', letterSpacing: '0.06em' }}>
                  OPERATOR ACTIONS — internal only (not visible on concierge)
                </div>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Stage
                  <select
                    value={leadStageDraft}
                    onChange={(e) => setLeadStageDraft(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  >
                    {LUX_LEAD_CRM_STAGES.map((s) => (
                      <option key={s} value={s}>
                        {luxLeadCrmStageLabel(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Assigned operator (owner)
                  <input
                    value={leadOwnerDraft}
                    onChange={(e) => setLeadOwnerDraft(e.target.value)}
                    placeholder="Username or handle (clear field + save to unassign)"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Next action (local time)
                  <input
                    type="datetime-local"
                    value={leadNextActionDraft}
                    onChange={(e) => setLeadNextActionDraft(e.target.value)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#64748b' }}>Clear the field and save to remove the reminder.</span>
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Next action note (optional)
                  <input
                    value={leadNextActionNoteDraft}
                    onChange={(e) => setLeadNextActionNoteDraft(e.target.value)}
                    placeholder="Short reminder for operators"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Follow-up status
                  <input
                    value={leadFollowDraft}
                    onChange={(e) => setLeadFollowDraft(e.target.value)}
                    placeholder="e.g. Awaiting reply — Mon"
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                    }}
                  />
                </label>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'grid', gap: 6 }}>
                  Add internal note (appends)
                  <textarea
                    value={leadNoteDraft}
                    onChange={(e) => setLeadNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Visible only to operators on /change — not sent to the client."
                    style={{
                      padding: '8px 10px',
                      borderRadius: 10,
                      border: '1px solid rgba(148,163,184,0.25)',
                      background: 'rgba(2,6,23,0.65)',
                      color: '#e2e8f0',
                      fontSize: 13,
                      resize: 'vertical',
                    }}
                  />
                </label>
                {Array.isArray(selectedLead.operator_workflow?.activity) && selectedLead.operator_workflow.activity.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Activity</div>
                    <div
                      style={{
                        display: 'grid',
                        gap: 6,
                        maxHeight: 220,
                        overflowY: 'auto',
                        padding: 8,
                        borderRadius: 12,
                        border: '1px solid rgba(148,163,184,0.15)',
                        background: 'rgba(15,23,42,0.35)',
                      }}
                    >
                      {selectedLead.operator_workflow.activity.map((ev, idx) => (
                        <div
                          key={`${ev.at}-${ev.kind}-${idx}`}
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: '1px solid rgba(148,163,184,0.12)',
                            background: 'rgba(2,6,23,0.4)',
                          }}
                        >
                          <div style={{ fontSize: 10, color: '#64748b' }}>
                            {ev.at ? new Date(ev.at).toLocaleString() : ''} · {String(ev.actor_label || '')}
                          </div>
                          <div style={{ marginTop: 4, color: '#e2e8f0', fontWeight: 650 }}>
                            {activityKindLabel(ev.kind)}
                          </div>
                          {ev.kind === 'stage_changed' && ev.detail ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.from || '')} → {String(ev.detail.to || '')}
                            </div>
                          ) : null}
                          {ev.kind === 'follow_up_updated' && ev.detail?.status !== undefined ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.status || '—')}
                            </div>
                          ) : null}
                          {ev.kind === 'note_added' && ev.detail?.preview ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {String(ev.detail.preview)}
                              {String(ev.detail.preview).length >= 200 ? '…' : ''}
                            </div>
                          ) : null}
                          {ev.kind === 'owner_assigned' && ev.detail?.owner_username ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#fde68a' }}>
                              {String(ev.detail.owner_username)}
                            </div>
                          ) : null}
                          {ev.kind === 'next_action_updated' ? (
                            <div style={{ marginTop: 2, fontSize: 11, color: '#94a3b8' }}>
                              {ev.detail?.next_action_at
                                ? new Date(String(ev.detail.next_action_at)).toLocaleString()
                                : '—'}
                              {ev.detail?.next_action_note_preview ? (
                                <span style={{ display: 'block', marginTop: 2 }}>
                                  {String(ev.detail.next_action_note_preview)}
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedLead.operator_workflow?.stage_audit?.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Stage audit (last entries)</div>
                    <div style={{ display: 'grid', gap: 6, maxHeight: 140, overflowY: 'auto' }}>
                      {[...(selectedLead.operator_workflow.stage_audit || [])].reverse().map((a, idx) => (
                        <div
                          key={`${a.at}-${idx}`}
                          style={{ fontSize: 10, color: '#86efac', lineHeight: 1.4 }}
                        >
                          {a.at ? new Date(a.at).toLocaleString() : ''} · {String(a.operator_label || '')}:{' '}
                          {String(a.previous_stage || '')} → {String(a.new_stage || '')}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                {selectedLead.operator_workflow?.internal_notes?.length ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    <div style={{ fontWeight: 800, color: '#cbd5e1', marginBottom: 6 }}>Recent notes</div>
                    <div style={{ display: 'grid', gap: 8, maxHeight: 180, overflowY: 'auto' }}>
                      {[...(selectedLead.operator_workflow.internal_notes || [])].reverse().map((n, idx) => (
                        <div
                          key={`${n.at}-${idx}`}
                          style={{
                            padding: 8,
                            borderRadius: 10,
                            border: '1px solid rgba(148,163,184,0.15)',
                            background: 'rgba(15,23,42,0.45)',
                          }}
                        >
                          <div style={{ fontSize: 10, color: '#64748b' }}>{n.at ? new Date(n.at).toLocaleString() : ''}</div>
                          <div style={{ marginTop: 4, color: '#e2e8f0', whiteSpace: 'pre-wrap' }}>{String(n.text || '')}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={leadPatchBusy}
                  onClick={() => applyLuxLeadOperatorPatch()}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 12,
                    border: '1px solid rgba(103,232,249,0.35)',
                    background: 'rgba(103,232,249,0.12)',
                    color: '#ecfeff',
                    fontWeight: 850,
                    fontSize: 13,
                    cursor: leadPatchBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  {leadPatchBusy ? 'Saving…' : 'Save updates'}
                </button>
                {leadPatchStatus ? (
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{leadPatchStatus}</div>
                ) : null}
              </div>
            ) : null}
          </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border: '1px solid rgba(244,63,94,0.35)',
            background: 'rgba(244,63,94,0.10)',
            color: '#fecdd3',
            borderRadius: 14,
            padding: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      ) : null}
    </div>
  );
}


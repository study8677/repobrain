import { useEffect, useMemo, useState } from 'react';

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setError('');
      try {
        const ctx = await refreshUiContext();
        if (cancelled) return;
        const isTenant =
          ctx?.session?.logged_in === true &&
          String(ctx?.session?.level || '').toLowerCase() === 'tenant' &&
          String(ctx?.tenant_id || '').trim();
        if (!isTenant) return;

        const rows = await loadQueue();
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

  async function onSelectTicket(id) {
    setError('');
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
                  await refreshUiContext();
                  const rows = await loadQueue();
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
                <div style={{ marginTop: 6, fontSize: 13, color: '#e2e8f0' }}>
                  {selectedTicketId ? (
                    <span>
                      Ticket{' '}
                      <span style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                        {selectedTicketId}
                      </span>
                    </span>
                  ) : (
                    'Select a ticket'
                  )}
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
              {needClientDecision ? (
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
                    Send a one-time link so the client can answer the 4 decisions. No login required for the client.
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

              <div style={{ marginTop: 14, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 900, color: '#e2e8f0' }}>{stage}</div>
                <div style={{ marginTop: 6, color: '#94a3b8' }}>
                  Next: {String(ticket?.ticket_progress?.client_view?.workflow_next_action || '—')}
                </div>
              </div>
            </div>
          </div>

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
                        operator_signal: ticket.operator_signal || null,
                      }
                    : { hint: session.logged_in ? 'Select a ticket to load.' : 'Log in to load tickets.' },
                  null,
                  2,
                )}
              </pre>
            </div>
          </div>
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


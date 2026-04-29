import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * CorpFlow Change Console v2 — strict action governance.
 * Exactly one primary CTA is derived from `change_stage` (server `deriveChangeStage`).
 */

/** @param {unknown} v */
function safeObj(v) {
  return v && typeof v === 'object' ? v : null;
}

function recoveryCopyForDominantAction(code) {
  const d = String(code || '').trim();
  if (d === 'FIX_PREVIEW_TRUTH') return 'Rechecking preview…';
  if (d === 'RESTORE_PREVIEW_AUTOMATION') return 'Retrying build…';
  if (d === 'FIX_DELIVERY_INTEGRITY') return 'Rechecking delivery integrity…';
  return 'Refreshing checks…';
}

/**
 * Stage-only workspace (no extra CTAs). Primary action remains the single button below.
 * @param {{
 *   stage: string,
 *   changeStage: Record<string, unknown> | null,
 *   brief: Record<string, unknown> | null,
 *   messages: { role: string; content: string }[],
 *   realityPanel: Record<string, unknown> | null,
 *   ticketProgress: Record<string, unknown> | null,
 *   pendingDraft: Record<string, unknown> | null,
 *   chatInput: string,
 *   onChatInput: (s: string) => void,
 *   showChat: boolean,
 * }} props
 */
function StageWorkspace({
  stage,
  brief,
  messages,
  realityPanel,
  ticketProgress,
  pendingDraft,
  chatInput,
  onChatInput,
  showChat,
}) {
  const b = brief && typeof brief === 'object' ? brief : {};
  const missing = Array.isArray(b.missing_information) ? b.missing_information.map((x) => String(x || '').trim()).filter(Boolean) : [];
  const rp = realityPanel && !realityPanel.error ? realityPanel : null;
  const tpCv = safeObj(safeObj(ticketProgress)?.client_view);
  const auto = safeObj(tpCv?.automation) || {};
  const previewUrl =
    (typeof auto.client_site_preview_url === 'string' && auto.client_site_preview_url.trim()) ||
    (typeof auto.preview_url === 'string' && auto.preview_url.trim()) ||
    '';
  const dispatchOk = auto.dispatch_ok === true;
  const previewTruth = rp && typeof rp.preview_truth === 'string' ? rp.preview_truth : '';
  const costing = b.costing_preview && typeof b.costing_preview === 'object' ? b.costing_preview : null;
  const lastUser = messages.filter((m) => m.role === 'user').slice(-1)[0];

  const box = {
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    background: '#fff',
  };

  if (stage === 'CLARIFY' || stage === 'INTAKE') {
    return (
      <div style={box}>
        {missing.length ? (
          <ul style={{ margin: '0 0 12px 18px', padding: 0, color: '#0f172a', fontSize: 14 }}>
            {missing.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        ) : (
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>No explicit brief gaps listed — use chat if the refiner asked follow-ups.</div>
        )}
        {lastUser ? (
          <div style={{ fontSize: 12, color: '#64748b' }}>
            Last client message: <span style={{ color: '#334155' }}>{lastUser.content.slice(0, 280)}{lastUser.content.length > 280 ? '…' : ''}</span>
          </div>
        ) : null}
        {showChat ? (
          <>
            <div style={{ fontSize: 12, color: '#334155', marginTop: 14, marginBottom: 6 }}>Your reply</div>
            <textarea
              value={chatInput}
              onChange={(e) => onChatInput(e.target.value)}
              placeholder="Answer in chat — this is the only action for this stage."
              style={{ width: '100%', minHeight: 100, padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (stage === 'DRAFT_RESPONSE') {
    return (
      <div style={box}>
        <div style={{ fontSize: 14, color: '#334155', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
          {typeof b.summary === 'string' && b.summary.trim() ? b.summary : typeof b.requested_change === 'string' ? b.requested_change : '—'}
        </div>
        {showChat ? (
          <>
            <div style={{ fontSize: 12, color: '#334155', marginBottom: 6 }}>Message to refiner</div>
            <textarea
              value={chatInput}
              onChange={(e) => onChatInput(e.target.value)}
              placeholder="Refine wording or constraints…"
              style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 12, border: '1px solid #cbd5e1' }}
            />
          </>
        ) : null}
      </div>
    );
  }

  if (stage === 'REVIEW') {
    const body = pendingDraft && typeof pendingDraft.content === 'string' ? pendingDraft.content : '';
    return (
      <div style={box}>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 10 }}>
          Governed draft (read-only). Committing posts it to the client-visible transcript.
        </div>
        <div
          style={{
            fontSize: 14,
            color: '#0f172a',
            whiteSpace: 'pre-wrap',
            padding: 12,
            borderRadius: 10,
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            maxHeight: 220,
            overflow: 'auto',
          }}
        >
          {body || '—'}
        </div>
      </div>
    );
  }

  if (stage === 'APPROVE_SEND') {
    return (
      <div style={box}>
        <div style={{ fontSize: 14, color: '#334155', marginBottom: 12 }}>Confirm scope and cost before build. Estimate snapshot (if any) is read-only here.</div>
        {costing ? (
          <pre style={{ margin: 0, fontSize: 12, background: '#f1f5f9', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 180 }}>
            {JSON.stringify(costing, null, 2)}
          </pre>
        ) : (
          <div style={{ fontSize: 13, color: '#64748b' }}>No costing_preview blob on brief yet — run estimate from the primary action when offered.</div>
        )}
      </div>
    );
  }

  if (stage === 'BUILD_DELIVER') {
    return (
      <div style={box}>
        <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>Preview & automation status (server reality panel).</div>
        {previewUrl ? (
          <div style={{ marginBottom: 10 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Preview: </span>
            <a href={previewUrl} style={{ fontSize: 14, color: '#0369a1', wordBreak: 'break-all' }} target="_blank" rel="noreferrer">
              {previewUrl}
            </a>
          </div>
        ) : (
          <div style={{ fontSize: 13, color: '#b45309', marginBottom: 10 }}>No preview URL on ticket yet.</div>
        )}
        <div style={{ fontSize: 13, color: '#475569' }}>
          Dispatch OK: {dispatchOk ? 'yes' : 'no'}
          {previewTruth ? ` · Preview signal: ${previewTruth}` : ''}
        </div>
        {rp && typeof rp.blocker?.label === 'string' && rp.blocker.label ? (
          <div style={{ marginTop: 10, fontSize: 13, color: '#991b1b' }}>{rp.blocker.label}</div>
        ) : null}
      </div>
    );
  }

  if (stage === 'VERIFY_CLOSE') {
    const di = tpCv?.delivery_integrity && typeof tpCv.delivery_integrity === 'object' ? tpCv.delivery_integrity : null;
    return (
      <div style={box}>
        <div style={{ fontSize: 14, color: '#334155', marginBottom: 8 }}>Final validation and closure signals.</div>
        {di ? (
          <pre style={{ margin: 0, fontSize: 12, background: '#f1f5f9', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 160 }}>
            {JSON.stringify(di, null, 2)}
          </pre>
        ) : (
          <div style={{ fontSize: 13, color: '#64748b' }}>No delivery_integrity payload on client_view.</div>
        )}
      </div>
    );
  }

  return (
    <div style={box}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>WORKSPACE</div>
      <div style={{ fontSize: 14, color: '#64748b' }}>Stage {stage} — follow the headline and single action.</div>
    </div>
  );
}

function normalizeLocale(raw) {
  const s = String(raw || '').trim().toLowerCase().replace(/_/g, '-');
  if (!s) return 'en';
  if (s.startsWith('es')) return 'es';
  if (s.startsWith('fr')) return 'fr';
  if (s.startsWith('de')) return 'de';
  if (s.startsWith('pt')) return 'pt';
  return 'en';
}

function dominantActionButtonLabel(code) {
  return String(code || '')
    .trim()
    .replace(/_/g, ' ');
}

export default function ChangeConsoleV2Page() {
  const [accessToken, setAccessToken] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [locale, setLocale] = useState('en');
  const [busy, setBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [error, setError] = useState('');
  const [authRequired, setAuthRequired] = useState(false);

  const [changeStage, setChangeStage] = useState(null);
  const [ribbon, setRibbon] = useState([]);
  const [messages, setMessages] = useState([]);
  const [brief, setBrief] = useState(null);
  const [chatInput, setChatInput] = useState('');
  const [historyRibbonIdx, setHistoryRibbonIdx] = useState(null);
  const [ticketProgress, setTicketProgress] = useState(null);
  const [realityPanel, setRealityPanel] = useState(null);
  const [changeStageHistory, setChangeStageHistory] = useState(null);
  const [changeStageProgressFeedback, setChangeStageProgressFeedback] = useState('');
  const [changeStageDebug, setChangeStageDebug] = useState(null);
  const [pendingOperatorDraft, setPendingOperatorDraft] = useState(null);
  const [recoveryLine, setRecoveryLine] = useState('');
  const [operatorSignal, setOperatorSignal] = useState(null);
  const [clientDecisionLink, setClientDecisionLink] = useState('');
  const [clientDecisionLinkExp, setClientDecisionLinkExp] = useState('');
  const [clientDecisionLinkBusy, setClientDecisionLinkBusy] = useState(false);

  useEffect(() => {
    try {
      const l = normalizeLocale(navigator.language);
      setLocale(l);
    } catch {
      setLocale('en');
    }
    try {
      const t = localStorage.getItem('corpflow_change_access_token') || '';
      if (t) setAccessToken(t);
    } catch {}
    try {
      const tid = localStorage.getItem('corpflow_change_ticket_id') || '';
      if (tid) setTicketId(tid);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('corpflow_change_access_token', accessToken || '');
    } catch {}
  }, [accessToken]);

  useEffect(() => {
    try {
      if (ticketId) localStorage.setItem('corpflow_change_ticket_id', ticketId);
      else localStorage.removeItem('corpflow_change_ticket_id');
    } catch {}
  }, [ticketId]);

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' };
    if (accessToken) {
      h['x-session-token'] = accessToken;
      h['Authorization'] = `Bearer ${accessToken}`;
    }
    return h;
  }, [accessToken]);

  const getHeadersForGet = useMemo(() => {
    const h = { ...headers };
    delete h['Content-Type'];
    return h;
  }, [headers]);

  const applyTicketPayload = useCallback((j) => {
    if (!j || typeof j !== 'object') return;
    setAuthRequired(false);
    setChangeStage(j.change_stage && typeof j.change_stage === 'object' ? j.change_stage : null);
    setRibbon(Array.isArray(j.change_stage_ribbon) ? j.change_stage_ribbon : []);
    setTicketProgress(j.ticket_progress && typeof j.ticket_progress === 'object' ? j.ticket_progress : null);
    setRealityPanel(j.reality_panel && typeof j.reality_panel === 'object' ? j.reality_panel : null);
    setChangeStageHistory(j.change_stage_history && typeof j.change_stage_history === 'object' ? j.change_stage_history : null);
    setChangeStageProgressFeedback(typeof j.change_stage_progress_feedback === 'string' ? j.change_stage_progress_feedback : '');
    setChangeStageDebug(j.change_stage_debug && typeof j.change_stage_debug === 'object' ? j.change_stage_debug : null);
    setPendingOperatorDraft(
      j.pending_operator_draft && typeof j.pending_operator_draft === 'object' ? j.pending_operator_draft : null,
    );
    setOperatorSignal(j.operator_signal && typeof j.operator_signal === 'object' ? j.operator_signal : null);
    const bs = j.brief_structured != null ? j.brief_structured : j.brief;
    if (bs != null) setBrief(bs);
    if (Array.isArray(j.refinement_messages) && j.refinement_messages.length) {
      setMessages(
        j.refinement_messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: String(m.content || ''),
          ts: m.ts != null ? String(m.ts) : '',
        })),
      );
    } else {
      setMessages([]);
    }
  }, []);

  const refreshTicket = useCallback(async () => {
    const id = ticketId.trim();
    if (id.length < 18) {
      setAuthRequired(false);
      setChangeStage(null);
      setRibbon([]);
      return;
    }
    setSyncBusy(true);
    setError('');
    try {
      const r = await fetch(`/api/cmp/router?action=ticket-get&id=${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: getHeadersForGet,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        const msg = String(j?.error || '').trim();
        const needsLogin =
          r.status === 401 ||
          r.status === 403 ||
          msg.toLowerCase().includes('dormant gate') ||
          msg.toLowerCase().includes('session token required') ||
          msg.toLowerCase().includes('verification failed');
        if (needsLogin) {
          setAuthRequired(true);
          setChangeStage(null);
          setRibbon([]);
          setMessages([]);
          setBrief(null);
          setTicketProgress(null);
          setRealityPanel(null);
          setChangeStageHistory(null);
          setChangeStageDebug(null);
          setPendingOperatorDraft(null);
          setError('');
          return;
        }
        throw new Error(j.error || 'ticket-get failed');
      }
      applyTicketPayload(j);
      setHistoryRibbonIdx(null);
    } catch (e) {
      setError(String(e?.message || e));
      setAuthRequired(false);
      setChangeStage(null);
    } finally {
      setSyncBusy(false);
    }
  }, [ticketId, getHeadersForGet, applyTicketPayload]);

  async function mintClientDecisionLink() {
    const id = ticketId.trim();
    if (id.length < 18) return;
    setClientDecisionLinkBusy(true);
    setError('');
    try {
      const r = await fetch('/api/cmp/router?action=client-decisions-link-mint', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ticket_id: id }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Could not mint link');
      setClientDecisionLink(typeof j.magic_link_url === 'string' ? j.magic_link_url : '');
      setClientDecisionLinkExp(typeof j.expires_at === 'string' ? j.expires_at : '');
    } catch (e) {
      setClientDecisionLink('');
      setClientDecisionLinkExp('');
      setError(String(e?.message || e));
    } finally {
      setClientDecisionLinkBusy(false);
    }
  }

  useEffect(() => {
    const id = ticketId.trim();
    if (id.length < 18) return;
    const t = setTimeout(() => {
      refreshTicket();
    }, 450);
    return () => clearTimeout(t);
  }, [ticketId, refreshTicket]);

  const currentRibbonIdx = useMemo(() => {
    if (!changeStage?.current_stage || !ribbon.length) return -1;
    return ribbon.findIndex((x) => x.id === changeStage.current_stage);
  }, [changeStage, ribbon]);

  const inHistoryView = historyRibbonIdx != null && currentRibbonIdx >= 0 && historyRibbonIdx < currentRibbonIdx;

  async function runPrimaryCta() {
    if (!ticketId.trim() || !changeStage || inHistoryView) return;
    const kind = changeStage.primary_cta_kind;
    setBusy(true);
    setError('');
    try {
      if (kind === 'submit_chat') {
        const msg = chatInput.trim();
        if (!msg) throw new Error('Type your message before sending.');
        const r = await fetch('/api/cmp/router?action=change-chat', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ticket_id: ticketId.trim(), message: msg, locale }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'change-chat failed');
        setChatInput('');
        await refreshTicket();
        return;
      }
      if (kind === 'run_estimate') {
        const desc =
          (brief && typeof brief.summary === 'string' && brief.summary.trim()) ||
          (messages[0] && messages[0].content) ||
          '';
        const r = await fetch('/api/cmp/router?action=costing-preview', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            description: desc,
            ticketId: ticketId.trim(),
            is_demo: false,
            tier: 'standard',
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'costing-preview failed');
        await refreshTicket();
        return;
      }
      if (kind === 'approve_build') {
        const desc =
          (brief && typeof brief.summary === 'string' && brief.summary.trim()) ||
          (messages[0] && messages[0].content) ||
          '';
        const r = await fetch('/api/cmp/router?action=approve-build', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ticket_id: ticketId.trim(),
            tier: 'standard',
            is_demo: false,
            description: desc,
          }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'approve-build failed');
        await refreshTicket();
        return;
      }
      if (kind === 'commit_operator_draft') {
        const r = await fetch('/api/cmp/router?action=change-chat-commit-draft', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ticket_id: ticketId.trim() }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'change-chat-commit-draft failed');
        await refreshTicket();
        return;
      }
      if (kind === 'retry_reality') {
        setRecoveryLine(recoveryCopyForDominantAction(changeStage.dominant_action));
        const r = await fetch('/api/cmp/router?action=reality-gate-run', {
          method: 'POST',
          headers,
          body: JSON.stringify({ ticket_id: ticketId.trim() }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || 'reality-gate-run failed');
        await refreshTicket();
        return;
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setRecoveryLine('');
      setBusy(false);
    }
  }

  const showChatComposer =
    !inHistoryView && changeStage && changeStage.primary_cta_kind === 'submit_chat' && !changeStage.primary_cta_disabled;

  const ribbonProgressLabel = useMemo(() => {
    if (!ribbon.length) return '';
    const n = currentRibbonIdx >= 0 ? currentRibbonIdx + 1 : '—';
    return `${n} / ${ribbon.length}`;
  }, [ribbon.length, currentRibbonIdx]);

  const primaryDisabled =
    busy ||
    syncBusy ||
    !changeStage ||
    inHistoryView ||
    changeStage.primary_cta_disabled ||
    (changeStage.primary_cta_kind === 'submit_chat' && !chatInput.trim());

  if (authRequired) {
    return (
      <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', padding: 24, maxWidth: 740, margin: '0 auto' }}>
        <div
          style={{
            marginBottom: 10,
            padding: '8px 10px',
            borderRadius: 10,
            border: '1px solid #f59e0b',
            background: '#fffbeb',
            color: '#92400e',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Experimental UI - not production control surface
        </div>
        <h1 style={{ margin: '0 0 10px' }}>Change Console v2</h1>
        <div
          style={{
            borderRadius: 16,
            border: '1px solid #cbd5e1',
            background: '#fff',
            padding: 20,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 850, color: '#0f172a', marginBottom: 10 }}>You need to log in to continue</div>
          <button
            type="button"
            onClick={() => {
              window.location.href = '/login';
            }}
            style={{
              display: 'block',
              width: '100%',
              maxWidth: 420,
              padding: '16px 22px',
              borderRadius: 14,
              border: 'none',
              background: '#0f172a',
              color: '#fff',
              fontSize: 16,
              fontWeight: 850,
              cursor: 'pointer',
            }}
          >
            Login
          </button>
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 750, color: '#334155' }}>Ticket & session</summary>
            <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ fontSize: 12, color: '#334155', flex: '1 1 240px' }}>
                Ticket id
                <input
                  value={ticketId}
                  onChange={(e) => setTicketId(e.target.value)}
                  placeholder="Paste ticket id"
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>
              <label style={{ fontSize: 12, color: '#334155', flex: '1 1 260px' }}>
                Access token
                <input
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="If Dormant Gate is on"
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
                />
              </label>
            </div>
          </details>
        </div>
        {error ? (
          <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
            {error}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <div
        style={{
          marginBottom: 10,
          padding: '8px 10px',
          borderRadius: 10,
          border: '1px solid #f59e0b',
          background: '#fffbeb',
          color: '#92400e',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        Experimental UI - not production control surface
      </div>
      <style>{`
        @keyframes changeV2StageGlow {
          0%, 100% { box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.35); }
          50% { box-shadow: 0 0 0 4px rgba(125, 211, 252, 0.55); }
        }
      `}</style>
      <h1 style={{ margin: '0 0 6px' }}>Change Console v2</h1>
      <div style={{ marginTop: 0, color: '#64748b', fontSize: 13, maxWidth: 760 }}>
        Stage-first workspace. One governed action. Backend stage engine is the source of truth.
      </div>

      {syncBusy ? <div style={{ fontSize: 13, color: '#0369a1', marginTop: 10 }}>Syncing…</div> : null}

      {ribbon.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              gap: 12,
              marginBottom: 8,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', letterSpacing: '0.04em' }}>STAGES</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#0369a1' }}>{ribbonProgressLabel}</div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'stretch' }}>
            {ribbon.map((step, idx) => {
              const isCurrent = idx === currentRibbonIdx;
              const isFuture = currentRibbonIdx >= 0 && idx > currentRibbonIdx;
              const isPast = currentRibbonIdx >= 0 && idx < currentRibbonIdx;
              const isHistorySelected = historyRibbonIdx === idx;
              const activeLive = isCurrent && historyRibbonIdx == null;

              const base = {
                padding: '10px 14px',
                borderRadius: 999,
                fontSize: 13,
                border: '1px solid #e2e8f0',
                background: '#fff',
                color: '#0f172a',
                cursor: 'default',
                opacity: 1,
              };

              if (isFuture) {
                return (
                  <div
                    key={step.id}
                    title="Future stage — not available yet"
                    style={{ ...base, opacity: 0.38, cursor: 'not-allowed', pointerEvents: 'none' }}
                  >
                    {step.short}
                  </div>
                );
              }

              if (isPast) {
                return (
                  <button
                    key={step.id}
                    type="button"
                    title="View this stage (read-only)"
                    onClick={() => setHistoryRibbonIdx(idx)}
                    style={{
                      ...base,
                      cursor: 'pointer',
                      borderColor: isHistorySelected ? '#0ea5e9' : '#cbd5e1',
                      background: isHistorySelected ? '#e0f2fe' : '#f8fafc',
                      fontWeight: isHistorySelected ? 600 : 400,
                    }}
                  >
                    {step.short}
                  </button>
                );
              }

              return (
                <button
                  key={step.id}
                  type="button"
                  title="Current stage — click to return from history view"
                  onClick={() => {
                    if (historyRibbonIdx != null) setHistoryRibbonIdx(null);
                  }}
                  style={{
                    ...base,
                    cursor: 'pointer',
                    fontWeight: 700,
                    borderColor: activeLive ? '#0284c7' : '#7dd3fc',
                    background: activeLive ? '#e0f2fe' : '#f0f9ff',
                    boxShadow: activeLive ? 'none' : 'none',
                    animation: activeLive ? 'changeV2StageGlow 2.4s ease-in-out infinite' : undefined,
                  }}
                >
                  {step.short}
                </button>
              );
            })}
          </div>
          {inHistoryView ? (
            <div style={{ marginTop: 10, fontSize: 13, color: '#0c4a6e' }}>
              Viewing an earlier stage (read-only). Tap the <strong>current</strong> stage pill to return — no actions
              run here.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Stage-first focus area */}
      <div
        style={{
          borderRadius: 16,
          border: '1px solid #cbd5e1',
          background: '#fff',
          padding: 20,
          marginBottom: 22,
        }}
      >
        {changeStage ? (
          <>
            {operatorSignal && operatorSignal.type === 'client_answers_received' ? (
              <div
                style={{
                  borderRadius: 12,
                  border: operatorSignal.status === 'ready_for_review' ? '1px solid #bbf7d0' : '1px solid #fecaca',
                  background: operatorSignal.status === 'ready_for_review' ? '#f0fdf4' : '#fef2f2',
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 850, color: '#0f172a', marginBottom: 2 }}>Client answers received</div>
                <div style={{ fontSize: 13, color: operatorSignal.status === 'ready_for_review' ? '#14532d' : '#991b1b' }}>
                  {operatorSignal.status === 'ready_for_review' ? 'Ready for operator review' : 'Answers incomplete'}
                </div>
              </div>
            ) : null}
            {ticketId.trim().length >= 18 ? (
              <div
                style={{
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 850, color: '#334155', marginBottom: 8 }}>CLIENT DECISIONS</div>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    disabled={clientDecisionLinkBusy}
                    onClick={mintClientDecisionLink}
                    style={{
                      padding: '10px 12px',
                      borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: clientDecisionLinkBusy ? '#e2e8f0' : '#fff',
                      color: '#0f172a',
                      fontWeight: 800,
                      cursor: clientDecisionLinkBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    Generate client answer link
                  </button>
                  {clientDecisionLink ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(clientDecisionLink);
                        } catch {
                          /* ignore */
                        }
                      }}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: '1px solid #cbd5e1',
                        background: '#fff',
                        color: '#334155',
                        fontWeight: 800,
                        cursor: 'pointer',
                      }}
                    >
                      Copy link
                    </button>
                  ) : null}
                </div>
                {clientDecisionLink ? (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>
                      Link (expires {clientDecisionLinkExp ? clientDecisionLinkExp : '—'}):
                    </div>
                    <input
                      value={clientDecisionLink}
                      readOnly
                      style={{
                        width: '100%',
                        padding: 10,
                        borderRadius: 10,
                        border: '1px solid #cbd5e1',
                        fontSize: 12,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div style={{ fontSize: 18, fontWeight: 850, color: '#0f172a', marginBottom: 8 }}>{changeStage.stage_headline}</div>
            <div style={{ fontSize: 15, color: '#0f172a', marginBottom: 12, whiteSpace: 'pre-wrap' }}>
              {changeStage.stage_blocker}
            </div>
            <div style={{ fontSize: 14, color: '#334155', marginBottom: 6 }}>{changeStage.progress_situation}</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 18 }}>{changeStage.progress_hint}</div>

            {inHistoryView ? (
              <div style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 16 }}>
                History view: read-only snapshot. Return to the current stage to run the single governed action.
              </div>
            ) : null}

            {!inHistoryView ? (
              <StageWorkspace
                stage={String(changeStage.current_stage || '')}
                brief={brief}
                messages={messages}
                realityPanel={realityPanel}
                ticketProgress={ticketProgress}
                pendingDraft={pendingOperatorDraft}
                chatInput={chatInput}
                onChatInput={setChatInput}
                showChat={Boolean(showChatComposer)}
              />
            ) : null}

            {recoveryLine ? (
              <div style={{ margin: '6px 0 14px', fontSize: 14, color: '#0369a1', fontWeight: 700 }}>{recoveryLine}</div>
            ) : null}

            {!inHistoryView && changeStage.primary_cta_kind !== 'informational' ? (
              <div
                style={{
                  position: changeStage.current_stage === 'REVIEW' ? 'sticky' : 'static',
                  bottom: 12,
                  paddingTop: 10,
                  background: changeStage.current_stage === 'REVIEW' ? 'rgba(255,255,255,0.96)' : 'transparent',
                  backdropFilter: changeStage.current_stage === 'REVIEW' ? 'blur(4px)' : 'none',
                }}
              >
                <button
                  type="button"
                  disabled={primaryDisabled}
                  onClick={runPrimaryCta}
                  style={{
                    display: 'block',
                    width: '100%',
                    maxWidth: 520,
                    padding: '16px 22px',
                    borderRadius: 14,
                    border: 'none',
                    background: primaryDisabled ? '#94a3b8' : '#0f172a',
                    color: '#fff',
                    fontSize: 16,
                    fontWeight: 850,
                    cursor: primaryDisabled ? 'not-allowed' : 'pointer',
                  }}
                >
                  {dominantActionButtonLabel(changeStage.dominant_action)}
                </button>
              </div>
            ) : !inHistoryView && changeStage.primary_cta_kind === 'informational' ? (
              <div
                style={{
                  maxWidth: 520,
                  padding: '14px 14px',
                  borderRadius: 14,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  color: '#334155',
                  fontSize: 13,
                }}
              >
                <strong>No governed action</strong> — {changeStage.progress_hint}
              </div>
            ) : null}
          </>
        ) : ticketId.trim().length >= 18 && !syncBusy ? (
          <div style={{ fontSize: 14, color: '#64748b' }}>No stage payload — check ticket id / token and try again.</div>
        ) : (
          <div style={{ fontSize: 14, color: '#64748b' }}>
            Paste a ticket id to load the stage engine snapshot.
          </div>
        )}
      </div>

      {changeStageDebug ? (
        <details
          style={{
            marginBottom: 20,
            padding: 12,
            borderRadius: 12,
            border: '1px dashed #cbd5e1',
            background: '#fafafa',
            fontSize: 12,
            color: '#334155',
          }}
        >
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#475569' }}>Stage debug (operator)</summary>
          <pre style={{ marginTop: 10, whiteSpace: 'pre-wrap', fontSize: 11, overflow: 'auto', maxHeight: 220 }}>
            {JSON.stringify(
              {
                ...changeStageDebug,
                transition_tail: Array.isArray(changeStageHistory?.transitions)
                  ? changeStageHistory.transitions.slice(-8)
                  : [],
              },
              null,
              2,
            )}
          </pre>
        </details>
      ) : null}

      {/* Support layer (demoted) */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14 }}>
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 750, color: '#334155' }}>Ticket & session</summary>
          <div style={{ marginTop: 12, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <label style={{ fontSize: 12, color: '#334155', flex: '1 1 240px' }}>
              Ticket id
              <input
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
                placeholder="Paste ticket id"
                style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </label>
            <label style={{ fontSize: 12, color: '#334155' }}>
              Locale
              <select value={locale} onChange={(e) => setLocale(e.target.value)} style={{ display: 'block', marginTop: 6, padding: 8 }}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="pt">Português</option>
              </select>
            </label>
            <label style={{ fontSize: 12, color: '#334155', flex: '1 1 260px' }}>
              Access token
              <input
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder="If Dormant Gate is on"
                style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1' }}
              />
            </label>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
            For new requests without a ticket id, use <a href="/change" style={{ color: '#0369a1' }}>Change Console (classic)</a>.
          </div>
        </details>

        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: 'pointer', fontWeight: 750, color: '#334155' }}>Context (read-only)</summary>
          <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#fff' }}>
            {messages.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 13 }}>No messages on ticket yet.</div>
            ) : (
              messages.map((m, idx) => (
                <div key={idx} style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {m.role}
                    {m.ts ? ` · ${m.ts}` : ''}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{m.content}</div>
                </div>
              ))
            )}
          </div>
          <pre
            style={{
              marginTop: 12,
              whiteSpace: 'pre-wrap',
              fontSize: 11,
              background: '#0b1220',
              color: '#94a3b8',
              padding: 12,
              borderRadius: 10,
              maxHeight: 220,
              overflow: 'auto',
            }}
          >
            {brief ? JSON.stringify(brief, null, 2) : '{}'}
          </pre>
        </details>
      </div>

      {error ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

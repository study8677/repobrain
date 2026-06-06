import React, { useCallback, useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES,
  AI_LEAD_RESCUE_STATUSES,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

const DETAIL_FETCH_TIMEOUT_MS = 25_000;

const pageStyle = {
  minHeight: '100vh',
  background: '#050505',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};
const shell = { maxWidth: 960, margin: '0 auto', padding: '32px 20px 48px' };
const card = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: 20,
  marginBottom: 16,
};
const labelStyle = {
  fontSize: 11,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: '#8899aa',
  marginBottom: 4,
  display: 'block',
};
const input = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.35)',
  color: '#eef6ff',
  fontSize: 14,
};
const btn = {
  borderRadius: 8,
  border: 0,
  padding: '11px 16px',
  fontWeight: 700,
  cursor: 'pointer',
  background: '#2dd4bf',
  color: '#031018',
};
const errorBoxStyle = {
  background: 'rgba(248, 113, 113, 0.08)',
  border: '1px solid rgba(248, 113, 113, 0.35)',
  color: '#fecaca',
  padding: '14px 16px',
  borderRadius: 10,
  marginBottom: 16,
};

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return '—';
  }
}

function regionLabel(path) {
  const v = (path || '').toLowerCase();
  if (v === 'mauritius') return 'Mauritius';
  if (v === 'international') return 'International';
  if (!v || v === 'not_selected') return 'Not selected';
  return path;
}

/**
 * Defensive normalization for the detail payload. Every nested field has a
 * safe default so an unexpected/malformed response can never crash the render
 * tree (which would have produced the blank-black-screen failure reported in
 * the 2026-06-06 P0).
 *
 * @param {unknown} input
 */
function normalizeLead(input) {
  const lead = input && typeof input === 'object' ? input : {};
  const p = lead.prospect && typeof lead.prospect === 'object' ? lead.prospect : {};
  const c = lead.commercial && typeof lead.commercial === 'object' ? lead.commercial : {};
  const o = lead.operations && typeof lead.operations === 'object' ? lead.operations : {};
  const cl = lead.setup_checklist && typeof lead.setup_checklist === 'object' ? lead.setup_checklist : {};
  const rawItems = Array.isArray(cl.items) ? cl.items : [];
  const items = rawItems
    .filter((it) => it && typeof it === 'object' && typeof it.key === 'string')
    .map((it) => ({
      key: it.key,
      label: typeof it.label === 'string' ? it.label : it.key,
      hint: typeof it.hint === 'string' ? it.hint : '',
      state: typeof it.state === 'string' ? it.state : 'pending',
      updated_at: typeof it.updated_at === 'string' ? it.updated_at : null,
      completed_at: typeof it.completed_at === 'string' ? it.completed_at : null,
      note: typeof it.note === 'string' ? it.note : '',
      actor_label: typeof it.actor_label === 'string' ? it.actor_label : '',
    }));
  return {
    id: typeof lead.id === 'string' ? lead.id : '',
    tenant_id: lead.tenant_id != null ? String(lead.tenant_id) : '',
    submitted_at: lead.submitted_at != null ? String(lead.submitted_at) : '',
    updated_at: lead.updated_at != null ? String(lead.updated_at) : '',
    prospect: {
      business_name: typeof p.business_name === 'string' ? p.business_name : '',
      contact_name: typeof p.contact_name === 'string' ? p.contact_name : '',
      email: typeof p.email === 'string' ? p.email : '',
      phone: typeof p.phone === 'string' ? p.phone : '',
      region_path: typeof p.region_path === 'string' ? p.region_path : '',
      business_type: typeof p.business_type === 'string' ? p.business_type : '',
      lead_sources: typeof p.lead_sources === 'string' ? p.lead_sources : '',
      intake_message: typeof p.intake_message === 'string' ? p.intake_message : '',
      source_page: typeof p.source_page === 'string' ? p.source_page : '',
      source_host: typeof p.source_host === 'string' ? p.source_host : '',
    },
    commercial: {
      setup_price: c.setup_price != null && Number.isFinite(Number(c.setup_price)) ? Number(c.setup_price) : null,
      monthly_monitoring_price:
        c.monthly_monitoring_price != null && Number.isFinite(Number(c.monthly_monitoring_price))
          ? Number(c.monthly_monitoring_price)
          : null,
      currency: typeof c.currency === 'string' ? c.currency : '',
      payment_route: typeof c.payment_route === 'string' ? c.payment_route : '',
      payment_status: typeof c.payment_status === 'string' ? c.payment_status : 'none',
      invoice_reference: typeof c.invoice_reference === 'string' ? c.invoice_reference : '',
      payment_notes: typeof c.payment_notes === 'string' ? c.payment_notes : '',
    },
    operations: {
      status: typeof o.status === 'string' ? o.status : 'NEW_INTAKE',
      status_label: typeof o.status_label === 'string' ? o.status_label : '',
      next_action: typeof o.next_action === 'string' ? o.next_action : '',
      owner: typeof o.owner === 'string' ? o.owner : '',
      last_contacted: typeof o.last_contacted === 'string' ? o.last_contacted : '',
      notes: typeof o.notes === 'string' ? o.notes : '',
      internal_notes: Array.isArray(o.internal_notes) ? o.internal_notes : [],
    },
    setup_checklist: {
      version: typeof cl.version === 'string' ? cl.version : 'v1',
      items,
      completed_count: Number.isFinite(Number(cl.completed_count)) ? Number(cl.completed_count) : 0,
      total_count: Number.isFinite(Number(cl.total_count)) ? Number(cl.total_count) : items.length,
      all_done: Boolean(cl.all_done),
    },
    setup_checklist_eligible: Boolean(lead.setup_checklist_eligible),
  };
}

function normalizeErrorEnvelope(initialError) {
  if (!initialError || typeof initialError !== 'object') return null;
  return {
    code: typeof initialError.error === 'string' ? initialError.error : 'LOAD_FAILED',
    message:
      typeof initialError.message === 'string'
        ? initialError.message
        : 'Could not load this AI Lead Rescue lead.',
    http_status:
      Number.isFinite(Number(initialError.http_status)) ? Number(initialError.http_status) : null,
  };
}

function ReadField({ title, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={labelStyle}>{title}</span>
      <div style={{ fontSize: 15, lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

/**
 * React error boundary for the detail body. Any render-time throw is caught
 * and converted into a visible error block instead of unmounting the React
 * tree (which would leave the operator looking at the dark page background).
 */
class DetailErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    if (typeof console !== 'undefined' && console.error) {
      // Surface the underlying error for ops triage; this is operator-only UI.
      // eslint-disable-next-line no-console
      console.error('AiLeadRescueAdminDetail render error', error, info);
    }
  }
  reset = () => {
    this.setState({ error: null });
    if (typeof this.props.onReset === 'function') this.props.onReset();
  };
  render() {
    if (this.state.error) {
      return this.props.renderFallback(this.state.error, this.reset);
    }
    return this.props.children;
  }
}

function DetailErrorBlock({ error, leadId, loading, onRetry }) {
  if (!error) return null;
  const apiUrl = leadId ? `/api/factory/lead-rescue/get?id=${encodeURIComponent(leadId)}` : null;
  return (
    <div role="alert" style={errorBoxStyle}>
      <div style={{ marginBottom: 10 }}>
        <strong style={{ display: 'block', fontSize: 14, color: '#fca5a5', marginBottom: 4 }}>
          Could not load lead detail
          {error.http_status ? ` (HTTP ${error.http_status})` : ''} — {error.code}
        </strong>
        <span style={{ fontSize: 13, color: '#fecaca', wordBreak: 'break-word' }}>
          {error.message}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={onRetry}
          disabled={loading}
          style={{
            ...input,
            width: 'auto',
            cursor: loading ? 'wait' : 'pointer',
            fontWeight: 700,
            color: '#031018',
            background: '#fca5a5',
            border: '1px solid #fca5a5',
            padding: '8px 14px',
          }}
        >
          {loading ? 'Retrying…' : 'Retry'}
        </button>
        <Link
          href="/admin/lead-rescue"
          style={{
            ...input,
            width: 'auto',
            textDecoration: 'none',
            color: '#7dd3fc',
            fontWeight: 700,
            padding: '8px 14px',
          }}
        >
          Back to list
        </Link>
        {apiUrl ? (
          <a
            href={apiUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              ...input,
              width: 'auto',
              textDecoration: 'none',
              color: '#7dd3fc',
              fontWeight: 700,
              padding: '8px 14px',
            }}
          >
            Open raw API
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * @param {{
 *   initialLead?: object | null,
 *   initialError?: { error?: string, message?: string, http_status?: number } | null,
 *   leadId?: string,
 * }} props
 */
export default function AiLeadRescueAdminDetail(props = {}) {
  const { initialLead, initialError, leadId: leadIdFromProps } = props;
  const router = useRouter();
  const leadIdFromRouter = typeof router.query.id === 'string' ? router.query.id : '';
  const leadId = leadIdFromProps || leadIdFromRouter;

  const hasInitialLead = initialLead && typeof initialLead === 'object';
  const hasInitialError = Boolean(initialError);

  const [lead, setLead] = useState(hasInitialLead ? normalizeLead(initialLead) : null);
  const [loading, setLoading] = useState(!hasInitialLead && !hasInitialError);
  const [error, setError] = useState(() => normalizeErrorEnvelope(initialError));
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  const [status, setStatus] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [owner, setOwner] = useState('');
  const [lastContacted, setLastContacted] = useState('');
  const [notes, setNotes] = useState('');
  const [setupPrice, setSetupPrice] = useState('');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [currency, setCurrency] = useState('');
  const [paymentRoute, setPaymentRoute] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [checklistDrafts, setChecklistDrafts] = useState({});
  const [checklistSaving, setChecklistSaving] = useState(null);
  const [checklistError, setChecklistError] = useState(null);
  const skipFirstFetchRef = useRef(hasInitialLead || hasInitialError);
  const inFlightAbortRef = useRef(null);

  const hydrateForm = useCallback((rawRow) => {
    const row = normalizeLead(rawRow);
    setStatus(row.operations.status || 'NEW_INTAKE');
    setNextAction(row.operations.next_action || '');
    setOwner(row.operations.owner || '');
    setLastContacted(
      row.operations.last_contacted ? String(row.operations.last_contacted).slice(0, 16) : '',
    );
    setNotes(row.operations.notes || '');
    setSetupPrice(row.commercial.setup_price != null ? String(row.commercial.setup_price) : '');
    setMonthlyPrice(
      row.commercial.monthly_monitoring_price != null
        ? String(row.commercial.monthly_monitoring_price)
        : '',
    );
    setCurrency(row.commercial.currency || '');
    setPaymentRoute(row.commercial.payment_route || '');
    setPaymentStatus(row.commercial.payment_status || 'none');
    setInvoiceRef(row.commercial.invoice_reference || '');
    setPaymentNotes(row.commercial.payment_notes || '');
    const drafts = {};
    row.setup_checklist.items.forEach((item) => {
      drafts[item.key] = { state: item.state || 'pending', note: item.note || '' };
    });
    setChecklistDrafts(drafts);
  }, []);

  // Seed form state from SSR-provided lead on first render.
  useEffect(() => {
    if (hasInitialLead && initialLead) {
      hydrateForm(initialLead);
    }
  }, [hasInitialLead, initialLead, hydrateForm]);

  const load = useCallback(async () => {
    if (!leadId) {
      setError({
        code: 'ID_MISSING',
        message: 'No lead id present in the URL.',
        http_status: null,
      });
      setLoading(false);
      return;
    }
    if (inFlightAbortRef.current) {
      try {
        inFlightAbortRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    inFlightAbortRef.current = controller;
    const timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch {
            /* ignore */
          }
        }, DETAIL_FETCH_TIMEOUT_MS)
      : null;

    setLoading(true);
    setError(null);
    let httpStatus = null;
    try {
      const r = await fetch(`/api/factory/lead-rescue/get?id=${encodeURIComponent(leadId)}`, {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined,
      });
      httpStatus = r.status;
      let data = null;
      try {
        data = await r.json();
      } catch (parseErr) {
        throw new Error(
          `HTTP ${httpStatus}: response was not JSON (${parseErr instanceof Error ? parseErr.message : String(parseErr)}).`,
        );
      }
      if (!r.ok || (data && data.ok === false)) {
        const err = new Error(
          (data && (data.message || data.detail)) ||
            `Request failed with HTTP ${httpStatus}.`,
        );
        err.code = (data && data.error) || 'LOAD_FAILED';
        err.http_status = httpStatus;
        throw err;
      }
      const normalized = normalizeLead(data && data.lead);
      setLead(normalized);
      hydrateForm(data && data.lead);
    } catch (e) {
      const aborted = e && (e.name === 'AbortError' || e.code === 20);
      setError({
        code: aborted ? 'TIMEOUT' : (e && e.code) || 'LOAD_FAILED',
        message: aborted
          ? `Request timed out after ${Math.round(DETAIL_FETCH_TIMEOUT_MS / 1000)}s.`
          : e instanceof Error
            ? e.message
            : 'Could not load lead.',
        http_status: (e && e.http_status) || httpStatus || null,
      });
      setLead(null);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (inFlightAbortRef.current === controller) {
        inFlightAbortRef.current = null;
      }
      setLoading(false);
    }
  }, [leadId, hydrateForm]);

  useEffect(() => {
    if (!router.isReady && !leadIdFromProps) return;
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    load();
  }, [router.isReady, leadIdFromProps, load]);

  async function saveChecklistItem(itemKey) {
    if (!leadId) return;
    const draft = checklistDrafts[itemKey];
    if (!draft) return;
    setChecklistSaving(itemKey);
    setChecklistError(null);
    try {
      const r = await fetch('/api/factory/lead-rescue/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: leadId,
          setup_checklist_item: {
            key: itemKey,
            state: draft.state || 'pending',
            note: draft.note || null,
          },
        }),
      });
      let data = null;
      try {
        data = await r.json();
      } catch (_) {
        data = null;
      }
      if (!r.ok || (data && data.ok === false)) {
        const code = (data && data.error) || `HTTP_${r.status}`;
        const msg =
          (data && (data.message || data.detail)) || `Request failed with HTTP ${r.status}.`;
        setChecklistError({ code, message: msg, http_status: r.status });
        return;
      }
      setLead(normalizeLead(data && data.lead));
      hydrateForm(data && data.lead);
    } catch (err) {
      setChecklistError({
        code: (err && err.code) || 'CHECKLIST_SAVE_FAILED',
        message: err instanceof Error ? err.message : 'Could not save checklist item.',
        http_status: null,
      });
    } finally {
      setChecklistSaving(null);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!leadId) return;
    setSaving(true);
    setError(null);
    setSavedMsg('');
    try {
      const body = {
        id: leadId,
        status,
        next_action: nextAction,
        owner,
        last_contacted: lastContacted ? new Date(lastContacted).toISOString() : null,
        notes,
        setup_price: setupPrice === '' ? null : Number(setupPrice),
        monthly_monitoring_price: monthlyPrice === '' ? null : Number(monthlyPrice),
        currency: currency || null,
        payment_route: paymentRoute || null,
        payment_status: paymentStatus || 'none',
        invoice_reference: invoiceRef || null,
        payment_notes: paymentNotes || null,
      };
      const r = await fetch('/api/factory/lead-rescue/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      let data = null;
      try {
        data = await r.json();
      } catch (_) {
        data = null;
      }
      if (!r.ok || (data && data.ok === false)) {
        const code = (data && data.error) || `HTTP_${r.status}`;
        const msg =
          (data && (data.message || data.detail)) || `Request failed with HTTP ${r.status}.`;
        setError({ code, message: msg, http_status: r.status });
        return;
      }
      setLead(normalizeLead(data && data.lead));
      hydrateForm(data && data.lead);
      setSavedMsg('Saved.');
    } catch (err) {
      setError({
        code: 'SAVE_FAILED',
        message: err instanceof Error ? err.message : 'Could not save.',
        http_status: null,
      });
    } finally {
      setSaving(false);
    }
  }

  const renderBoundaryFallback = (boundaryError, reset) => (
    <DetailErrorBlock
      error={{
        code: 'RENDER_ERROR',
        message:
          boundaryError instanceof Error
            ? boundaryError.message
            : 'A rendering error prevented the detail page from displaying.',
        http_status: null,
      }}
      leadId={leadId}
      loading={loading}
      onRetry={() => {
        reset();
        load();
      }}
    />
  );

  const businessLabel =
    lead && (lead.prospect.business_name || lead.prospect.contact_name)
      ? lead.prospect.business_name || lead.prospect.contact_name
      : 'AI Lead Rescue lead';

  return (
    <div style={pageStyle}>
      <Head>
        <title>AI Lead Rescue · Lead detail</title>
      </Head>
      <main style={shell}>
        <p style={{ margin: '0 0 16px' }}>
          <Link href="/admin/lead-rescue" style={{ color: '#7dd3fc', fontSize: 13 }}>
            ← Back to pipeline
          </Link>
        </p>

        <header style={{ marginBottom: 20 }}>
          <p style={{ ...labelStyle, margin: 0 }}>AI Lead Rescue</p>
          <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800 }}>{businessLabel}</h1>
          {lead && lead.submitted_at ? (
            <p style={{ margin: '8px 0 0', color: '#8899aa', fontSize: 13 }}>
              Submitted {fmtDate(lead.submitted_at)}
              {lead.prospect.source_host ? ` · ${lead.prospect.source_host}` : ''}
            </p>
          ) : null}
        </header>

        <DetailErrorBoundary onReset={load} renderFallback={renderBoundaryFallback}>
          {error ? (
            <DetailErrorBlock error={error} leadId={leadId} loading={loading} onRetry={load} />
          ) : null}

          {loading && !lead && !error ? (
            <p style={{ color: '#8899aa' }}>Loading…</p>
          ) : null}

          {lead ? (
            <>
              <section style={card}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Prospect</h2>
                <ReadField title="Business name" value={lead.prospect.business_name} />
                <ReadField title="Contact name" value={lead.prospect.contact_name} />
                <ReadField title="Email" value={lead.prospect.email} />
                <ReadField title="Phone / WhatsApp" value={lead.prospect.phone} />
                <ReadField title="Region" value={regionLabel(lead.prospect.region_path)} />
                <ReadField title="Business type / niche" value={lead.prospect.business_type} />
                <ReadField title="Lead sources" value={lead.prospect.lead_sources} />
                <ReadField title="Intake message" value={lead.prospect.intake_message} />
                <ReadField
                  title="Source"
                  value={[lead.prospect.source_page, lead.prospect.source_host]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </section>

              <form onSubmit={save}>
                <section style={card}>
                  <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Commercial</h2>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: 12,
                    }}
                  >
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Setup price</span>
                      <input
                        style={input}
                        value={setupPrice}
                        onChange={(e) => setSetupPrice(e.target.value)}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Monthly monitoring price</span>
                      <input
                        style={input}
                        value={monthlyPrice}
                        onChange={(e) => setMonthlyPrice(e.target.value)}
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Currency</span>
                      <input
                        style={input}
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        placeholder="MUR / USD"
                      />
                    </label>
                    <label style={{ display: 'grid', gap: 4 }}>
                      <span style={labelStyle}>Payment status</span>
                      <input
                        style={input}
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value)}
                      />
                    </label>
                  </div>
                  <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                    <span style={labelStyle}>Payment route</span>
                    <input
                      style={input}
                      value={paymentRoute}
                      onChange={(e) => setPaymentRoute(e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                    <span style={labelStyle}>Invoice / reference</span>
                    <input
                      style={input}
                      value={invoiceRef}
                      onChange={(e) => setInvoiceRef(e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                    <span style={labelStyle}>Payment notes</span>
                    <textarea
                      style={{ ...input, minHeight: 72 }}
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </label>
                </section>

                <section style={card}>
                  <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>
                    Status and operations
                  </h2>
                  <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                    <span style={labelStyle}>Status</span>
                    <select
                      style={input}
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                    >
                      {AI_LEAD_RESCUE_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                    <span style={labelStyle}>Next action</span>
                    <input
                      style={input}
                      value={nextAction}
                      onChange={(e) => setNextAction(e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                    <span style={labelStyle}>Owner / operator</span>
                    <input style={input} value={owner} onChange={(e) => setOwner(e.target.value)} />
                  </label>
                  <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                    <span style={labelStyle}>Last contacted</span>
                    <input
                      type="datetime-local"
                      style={input}
                      value={lastContacted}
                      onChange={(e) => setLastContacted(e.target.value)}
                    />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Notes</span>
                    <textarea
                      style={{ ...input, minHeight: 100 }}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </label>
                </section>

                {/*
                  Render the save error inline next to the Save button so an
                  operator who clicks Save at the bottom of the form cannot
                  miss a failure. The same error is also visible at the top
                  of the boundary; this is a second, scroll-position-safe
                  surface for the 2026-06-06 persistence-not-visible failure.
                */}
                {error ? (
                  <div style={{ marginTop: 12, marginBottom: 12 }}>
                    <DetailErrorBlock
                      error={error}
                      leadId={leadId}
                      loading={saving}
                      onRetry={load}
                    />
                  </div>
                ) : null}
                {savedMsg ? (
                  <p
                    role="status"
                    style={{
                      color: '#031018',
                      background: '#6ee7b7',
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontWeight: 700,
                      display: 'inline-block',
                    }}
                  >
                    {savedMsg}
                  </p>
                ) : null}

                <div style={{ marginTop: 12 }}>
                  <button
                    type="submit"
                    disabled={saving}
                    style={{ ...btn, opacity: saving ? 0.6 : 1 }}
                  >
                    {saving ? 'Saving…' : 'Save changes'}
                  </button>
                </div>
              </form>

              {lead.setup_checklist_eligible && lead.setup_checklist.items.length > 0 ? (
                <section style={{ ...card, marginTop: 24 }}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      flexWrap: 'wrap',
                      gap: 8,
                    }}
                  >
                    <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Setup checklist</h2>
                    <span style={{ fontSize: 12, color: '#8899aa' }}>
                      {lead.setup_checklist.completed_count}/{lead.setup_checklist.total_count} complete
                      {lead.setup_checklist.all_done ? ' · pilot setup ready' : ''}
                    </span>
                  </div>
                  <p
                    style={{
                      color: '#8899aa',
                      fontSize: 12,
                      marginTop: 6,
                      marginBottom: 16,
                      lineHeight: 1.5,
                    }}
                  >
                    Available once status reaches <code style={{ color: '#7dd3fc' }}>PAID_SETUP</code>. Each item saves
                    independently. Use <strong>skipped</strong> only when the item does not apply to this client.
                  </p>
                  {checklistError ? (
                    <DetailErrorBlock
                      error={checklistError}
                      leadId={leadId}
                      loading={Boolean(checklistSaving)}
                      onRetry={() => {
                        if (checklistSaving) saveChecklistItem(checklistSaving);
                        else setChecklistError(null);
                      }}
                    />
                  ) : null}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                    {lead.setup_checklist.items.map((item) => {
                      const draft = checklistDrafts[item.key] || {
                        state: item.state,
                        note: item.note || '',
                      };
                      const dirty =
                        draft.state !== item.state || (draft.note || '') !== (item.note || '');
                      const itemSaving = checklistSaving === item.key;
                      const isDone = item.state === 'done' || item.state === 'skipped';
                      return (
                        <li
                          key={item.key}
                          style={{
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 10,
                            padding: 14,
                            background: isDone ? 'rgba(45,212,191,0.05)' : 'rgba(255,255,255,0.02)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              gap: 12,
                              alignItems: 'flex-start',
                              flexWrap: 'wrap',
                            }}
                          >
                            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
                              <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>
                                {item.label}
                              </div>
                              {item.hint ? (
                                <div
                                  style={{
                                    fontSize: 12,
                                    color: '#8899aa',
                                    marginTop: 4,
                                    lineHeight: 1.5,
                                  }}
                                >
                                  {item.hint}
                                </div>
                              ) : null}
                              {item.completed_at ? (
                                <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 6 }}>
                                  {item.state === 'skipped' ? 'Skipped' : 'Completed'}{' '}
                                  {fmtDate(item.completed_at)}
                                  {item.actor_label ? ` · ${item.actor_label}` : ''}
                                </div>
                              ) : item.updated_at ? (
                                <div style={{ fontSize: 11, color: '#8899aa', marginTop: 6 }}>
                                  Updated {fmtDate(item.updated_at)}
                                  {item.actor_label ? ` · ${item.actor_label}` : ''}
                                </div>
                              ) : null}
                            </div>
                            <div style={{ display: 'grid', gap: 6, minWidth: 180 }}>
                              <select
                                style={input}
                                value={draft.state}
                                onChange={(e) =>
                                  setChecklistDrafts((prev) => ({
                                    ...prev,
                                    [item.key]: { ...draft, state: e.target.value },
                                  }))
                                }
                              >
                                {AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES.map((s) => (
                                  <option key={s} value={s}>
                                    {s.replace(/_/g, ' ')}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => saveChecklistItem(item.key)}
                                disabled={!dirty || itemSaving}
                                style={{
                                  ...btn,
                                  padding: '8px 12px',
                                  fontSize: 12,
                                  opacity: !dirty || itemSaving ? 0.55 : 1,
                                  background: dirty ? '#2dd4bf' : 'rgba(255,255,255,0.08)',
                                  color: dirty ? '#031018' : '#9fb2c8',
                                  cursor: !dirty || itemSaving ? 'default' : 'pointer',
                                }}
                              >
                                {itemSaving ? 'Saving…' : 'Save'}
                              </button>
                            </div>
                          </div>
                          <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                            <span style={{ ...labelStyle, marginBottom: 0 }}>Note (optional)</span>
                            <textarea
                              style={{ ...input, minHeight: 56, fontSize: 13 }}
                              value={draft.note || ''}
                              placeholder="What was done, links, follow-up needed…"
                              onChange={(e) =>
                                setChecklistDrafts((prev) => ({
                                  ...prev,
                                  [item.key]: { ...draft, note: e.target.value },
                                }))
                              }
                            />
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ) : null}
            </>
          ) : null}

          {!lead && !loading && !error ? (
            <p style={{ color: '#8899aa' }}>No lead data available.</p>
          ) : null}
        </DetailErrorBoundary>
      </main>
    </div>
  );
}

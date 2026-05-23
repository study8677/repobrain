import React, { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import {
  AI_LEAD_RESCUE_CHECKLIST_ITEM_STATES,
  AI_LEAD_RESCUE_STATUSES,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

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

function ReadField({ title, value }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={labelStyle}>{title}</span>
      <div style={{ fontSize: 15, lineHeight: 1.5 }}>{value || '—'}</div>
    </div>
  );
}

export default function AiLeadRescueAdminDetail() {
  const router = useRouter();
  const leadId = typeof router.query.id === 'string' ? router.query.id : '';

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
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
  const [checklistError, setChecklistError] = useState('');

  const hydrateForm = useCallback((row) => {
    setStatus(row.operations?.status || 'NEW_INTAKE');
    setNextAction(row.operations?.next_action || '');
    setOwner(row.operations?.owner || '');
    setLastContacted(
      row.operations?.last_contacted ? String(row.operations.last_contacted).slice(0, 16) : '',
    );
    setNotes(row.operations?.notes || '');
    setSetupPrice(row.commercial?.setup_price != null ? String(row.commercial.setup_price) : '');
    setMonthlyPrice(
      row.commercial?.monthly_monitoring_price != null ? String(row.commercial.monthly_monitoring_price) : '',
    );
    setCurrency(row.commercial?.currency || '');
    setPaymentRoute(row.commercial?.payment_route || '');
    setPaymentStatus(row.commercial?.payment_status || 'none');
    setInvoiceRef(row.commercial?.invoice_reference || '');
    setPaymentNotes(row.commercial?.payment_notes || '');
    const items = Array.isArray(row.setup_checklist?.items) ? row.setup_checklist.items : [];
    const drafts = {};
    items.forEach((item) => {
      drafts[item.key] = { state: item.state || 'pending', note: item.note || '' };
    });
    setChecklistDrafts(drafts);
  }, []);

  const load = useCallback(async () => {
    if (!leadId) return;
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/factory/lead-rescue/get?id=${encodeURIComponent(leadId)}`, {
        credentials: 'include',
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'load_failed');
      setLead(data.lead);
      hydrateForm(data.lead);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load lead.');
      setLead(null);
    } finally {
      setLoading(false);
    }
  }, [leadId, hydrateForm]);

  useEffect(() => {
    if (router.isReady) load();
  }, [router.isReady, load]);

  async function saveChecklistItem(itemKey) {
    if (!leadId) return;
    const draft = checklistDrafts[itemKey];
    if (!draft) return;
    setChecklistSaving(itemKey);
    setChecklistError('');
    try {
      const r = await fetch('/api/factory/lead-rescue/patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'checklist_save_failed');
      setLead(data.lead);
      hydrateForm(data.lead);
    } catch (err) {
      setChecklistError(err instanceof Error ? err.message : 'Could not save checklist item.');
    } finally {
      setChecklistSaving(null);
    }
  }

  async function save(e) {
    e.preventDefault();
    if (!leadId) return;
    setSaving(true);
    setError('');
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
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || 'save_failed');
      setLead(data.lead);
      hydrateForm(data.lead);
      setSavedMsg('Saved.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

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

        {loading ? (
          <p style={{ color: '#8899aa' }}>Loading…</p>
        ) : !lead ? (
          <p style={{ color: '#fca5a5' }}>{error || 'Lead not found.'}</p>
        ) : (
          <>
            <header style={{ marginBottom: 20 }}>
              <p style={{ ...labelStyle, margin: 0 }}>AI Lead Rescue</p>
              <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800 }}>
                {lead.prospect?.business_name || lead.prospect?.contact_name || 'Lead'}
              </h1>
              <p style={{ margin: '8px 0 0', color: '#8899aa', fontSize: 13 }}>
                Submitted {fmtDate(lead.submitted_at)}
                {lead.prospect?.source_host ? ` · ${lead.prospect.source_host}` : ''}
              </p>
            </header>

            <section style={card}>
              <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Prospect</h2>
              <ReadField title="Business name" value={lead.prospect?.business_name} />
              <ReadField title="Contact name" value={lead.prospect?.contact_name} />
              <ReadField title="Email" value={lead.prospect?.email} />
              <ReadField title="Phone / WhatsApp" value={lead.prospect?.phone} />
              <ReadField title="Region" value={regionLabel(lead.prospect?.region_path)} />
              <ReadField title="Business type / niche" value={lead.prospect?.business_type} />
              <ReadField title="Lead sources" value={lead.prospect?.lead_sources} />
              <ReadField title="Intake message" value={lead.prospect?.intake_message} />
              <ReadField
                title="Source"
                value={[lead.prospect?.source_page, lead.prospect?.source_host].filter(Boolean).join(' · ')}
              />
            </section>

            <form onSubmit={save}>
              <section style={card}>
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Commercial</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Setup price</span>
                    <input style={input} value={setupPrice} onChange={(e) => setSetupPrice(e.target.value)} />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Monthly monitoring price</span>
                    <input style={input} value={monthlyPrice} onChange={(e) => setMonthlyPrice(e.target.value)} />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Currency</span>
                    <input style={input} value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="MUR / USD" />
                  </label>
                  <label style={{ display: 'grid', gap: 4 }}>
                    <span style={labelStyle}>Payment status</span>
                    <input style={input} value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} />
                  </label>
                </div>
                <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                  <span style={labelStyle}>Payment route</span>
                  <input style={input} value={paymentRoute} onChange={(e) => setPaymentRoute(e.target.value)} />
                </label>
                <label style={{ display: 'grid', gap: 4, marginTop: 12 }}>
                  <span style={labelStyle}>Invoice / reference</span>
                  <input style={input} value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} />
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
                <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>Status and operations</h2>
                <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                  <span style={labelStyle}>Status</span>
                  <select style={input} value={status} onChange={(e) => setStatus(e.target.value)}>
                    {AI_LEAD_RESCUE_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ display: 'grid', gap: 4, marginBottom: 12 }}>
                  <span style={labelStyle}>Next action</span>
                  <input style={input} value={nextAction} onChange={(e) => setNextAction(e.target.value)} />
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
                  <textarea style={{ ...input, minHeight: 100 }} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </section>

              {error ? <p style={{ color: '#fca5a5' }}>{error}</p> : null}
              {savedMsg ? <p style={{ color: '#6ee7b7' }}>{savedMsg}</p> : null}

              <button type="submit" disabled={saving} style={{ ...btn, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>

            {lead.setup_checklist_eligible && Array.isArray(lead.setup_checklist?.items) ? (
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
                <p style={{ color: '#8899aa', fontSize: 12, marginTop: 6, marginBottom: 16, lineHeight: 1.5 }}>
                  Available once status reaches <code style={{ color: '#7dd3fc' }}>PAID_SETUP</code>. Each item saves
                  independently. Use <strong>skipped</strong> only when the item does not apply to this client.
                </p>
                {checklistError ? (
                  <p style={{ color: '#fca5a5', fontSize: 12, marginBottom: 12 }}>{checklistError}</p>
                ) : null}
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 12 }}>
                  {lead.setup_checklist.items.map((item) => {
                    const draft = checklistDrafts[item.key] || { state: item.state, note: item.note || '' };
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
                            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.4 }}>{item.label}</div>
                            {item.hint ? (
                              <div style={{ fontSize: 12, color: '#8899aa', marginTop: 4, lineHeight: 1.5 }}>
                                {item.hint}
                              </div>
                            ) : null}
                            {item.completed_at ? (
                              <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 6 }}>
                                {item.state === 'skipped' ? 'Skipped' : 'Completed'} {fmtDate(item.completed_at)}
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
        )}
      </main>
    </div>
  );
}

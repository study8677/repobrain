import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { AI_LEAD_RESCUE_STATUSES } from '../lib/cmp/_lib/ai-lead-rescue-operator.js';
import { fmtDateStableUtc } from '../lib/format/utc-date.js';

const pageStyle = {
  minHeight: '100vh',
  background: '#050505',
  color: '#eef6ff',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
};
const shell = { maxWidth: 1400, margin: '0 auto', padding: '32px 20px 48px' };
const glass = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
};
const input = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(0,0,0,0.35)',
  color: '#eef6ff',
  fontSize: 13,
};
const th = {
  textAlign: 'left',
  fontSize: 10,
  letterSpacing: '0.2em',
  textTransform: 'uppercase',
  color: '#8899aa',
  padding: '10px 8px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  whiteSpace: 'nowrap',
};
const td = { padding: '12px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 13, verticalAlign: 'top' };

const LIST_FETCH_TIMEOUT_MS = 25_000;
const LIST_API_PATH = '/api/factory/lead-rescue/list';

// 2026-06-06 P0 — `fmtDate` previously used
// `new Date(iso).toLocaleString()`, which is locale + timezone
// dependent and produces different SSR vs CSR strings (causing a
// React hydration mismatch on `/admin/lead-rescue/[id]`; less
// noticeable here but the same anti-pattern). Replaced everywhere
// with `fmtDateStableUtc` from `lib/format/utc-date.js`.

function regionLabel(path) {
  const v = (path || '').toLowerCase();
  if (v === 'mauritius') return 'Mauritius';
  if (v === 'international') return 'International';
  if (!v || v === 'not_selected') return 'Not selected';
  return path;
}

/**
 * @param {{
 *   initialLeads?: Array<Record<string, unknown>>|null,
 *   initialError?: { error?: string, message?: string, http_status?: number }|null,
 * }} [props]
 */
export default function AiLeadRescueAdminList(props = {}) {
  const { initialLeads, initialError } = props;
  const hasInitial = Array.isArray(initialLeads);

  const [leads, setLeads] = useState(hasInitial ? initialLeads : []);
  // If SSR pre-populated the list (success OR error), we are NOT loading on first paint.
  // This is the safety net that prevents permanent "Loading…" when client-side hydration
  // doesn't run or the API hangs — the page always reflects the SSR result.
  const [loading, setLoading] = useState(!hasInitial && !initialError);
  const [error, setError] = useState(() => {
    if (!initialError) return null;
    return {
      code: initialError.error || 'LOAD_FAILED',
      message: initialError.message || 'Could not load AI Lead Rescue leads.',
      http_status: initialError.http_status || null,
    };
  });
  const [status, setStatus] = useState('');
  const [region, setRegion] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [q, setQ] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  // First effect run after mount should NOT immediately refetch when SSR already populated
  // the list (avoids an unnecessary round-trip and a flash of "Loading…").
  const skipFirstFetchRef = useRef(hasInitial || Boolean(initialError));
  const inFlightAbortRef = useRef(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (region) p.set('region', region);
    if (paymentStatus) p.set('payment_status', paymentStatus);
    if (q) p.set('q', q);
    const s = p.toString();
    return s ? `?${s}` : '';
  }, [status, region, paymentStatus, q]);

  const load = useCallback(async () => {
    if (inFlightAbortRef.current) {
      try {
        inFlightAbortRef.current.abort();
      } catch {
        /* ignore */
      }
    }
    const controller =
      typeof AbortController !== 'undefined' ? new AbortController() : null;
    inFlightAbortRef.current = controller;
    const timeoutId = controller
      ? setTimeout(() => {
          try {
            controller.abort();
          } catch {
            /* ignore */
          }
        }, LIST_FETCH_TIMEOUT_MS)
      : null;

    setLoading(true);
    setError(null);
    let httpStatus = null;
    try {
      const r = await fetch(`${LIST_API_PATH}${queryString}`, {
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
        const code = (data && data.error) || 'LOAD_FAILED';
        const msg =
          (data && (data.message || data.detail)) ||
          `Request failed with HTTP ${httpStatus}.`;
        const err = new Error(msg);
        err.code = code;
        err.http_status = httpStatus;
        throw err;
      }
      setLeads(Array.isArray(data.leads) ? data.leads : []);
    } catch (e) {
      const aborted = e && (e.name === 'AbortError' || e.code === 20);
      const code = aborted ? 'TIMEOUT' : (e && e.code) || 'LOAD_FAILED';
      const message = aborted
        ? `Request timed out after ${Math.round(LIST_FETCH_TIMEOUT_MS / 1000)}s (production may be cold-starting).`
        : e instanceof Error
          ? e.message
          : 'Could not load AI Lead Rescue leads.';
      setError({
        code,
        message,
        http_status: (e && e.http_status) || httpStatus || null,
      });
      setLeads([]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (inFlightAbortRef.current === controller) {
        inFlightAbortRef.current = null;
      }
      setLoading(false);
    }
  }, [queryString]);

  useEffect(() => {
    if (skipFirstFetchRef.current) {
      skipFirstFetchRef.current = false;
      return;
    }
    load();
  }, [load]);

  const paymentStatuses = useMemo(() => {
    const set = new Set(['none']);
    leads.forEach((l) => {
      if (l.payment_status) set.add(l.payment_status);
    });
    return Array.from(set).sort();
  }, [leads]);

  const showLoadingRow = loading && !error && leads.length === 0;
  const showErrorRow = !loading && error;
  const showEmptyRow = !loading && !error && leads.length === 0;

  return (
    <div style={pageStyle}>
      <Head>
        <title>AI Lead Rescue · Operator pipeline</title>
      </Head>
      <main style={shell}>
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: 16,
              marginBottom: 24,
            }}
          >
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  letterSpacing: '0.35em',
                  textTransform: 'uppercase',
                  color: '#6b7c8f',
                }}
              >
                Factory operator
              </p>
              <h1 style={{ margin: '6px 0 0', fontSize: 28, fontWeight: 800 }}>AI Lead Rescue pipeline</h1>
              <p style={{ margin: '8px 0 0', color: '#9fb2c8', fontSize: 14, maxWidth: 640 }}>
                Intakes from <code style={{ color: '#7dd3fc' }}>/lead-rescue</code> with product{' '}
                <code style={{ color: '#7dd3fc' }}>ai-lead-rescue</code>. Qualify, quote, onboard, and maintain from here.
              </p>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              style={{
                ...input,
                cursor: loading ? 'wait' : 'pointer',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontSize: 11,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Loading…' : 'Refresh'}
            </button>
          </header>

          <section
            style={{
              ...glass,
              padding: 16,
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              alignItems: 'flex-end',
            }}
          >
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Status
              <select value={status} onChange={(e) => setStatus(e.target.value)} style={input}>
                <option value="">All</option>
                {AI_LEAD_RESCUE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Region
              <select value={region} onChange={(e) => setRegion(e.target.value)} style={input}>
                <option value="">All</option>
                <option value="mauritius">Mauritius</option>
                <option value="international">International</option>
                <option value="not_selected">Not selected</option>
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa' }}>
              Payment status
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} style={input}>
                <option value="">All</option>
                {paymentStatuses.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: 'grid', gap: 4, fontSize: 11, color: '#8899aa', flex: '1 1 200px', minWidth: 200 }}>
              Search
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setQ(searchDraft.trim());
                }}
                placeholder="Business, contact, email…"
                style={{ ...input, width: '100%' }}
              />
            </label>
            <button
              type="button"
              onClick={() => setQ(searchDraft.trim())}
              style={{ ...input, cursor: 'pointer', fontWeight: 700 }}
            >
              Apply search
            </button>
          </section>

          {error ? (
            <div
              role="alert"
              style={{
                background: 'rgba(248, 113, 113, 0.08)',
                border: '1px solid rgba(248, 113, 113, 0.35)',
                color: '#fecaca',
                padding: '12px 14px',
                borderRadius: 10,
                marginBottom: 16,
                display: 'flex',
                flexWrap: 'wrap',
                gap: 12,
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 360px' }}>
                <strong style={{ display: 'block', fontSize: 13, color: '#fca5a5' }}>
                  Could not load AI Lead Rescue list
                  {error.http_status ? ` (HTTP ${error.http_status})` : ''} — {error.code}
                </strong>
                <span style={{ fontSize: 12, color: '#fecaca', wordBreak: 'break-word' }}>
                  {error.message}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={load}
                  disabled={loading}
                  style={{
                    ...input,
                    cursor: loading ? 'wait' : 'pointer',
                    fontWeight: 700,
                    color: '#031018',
                    background: '#fca5a5',
                    border: '1px solid #fca5a5',
                  }}
                >
                  {loading ? 'Retrying…' : 'Retry'}
                </button>
                <a
                  href={`${LIST_API_PATH}${queryString}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    ...input,
                    textDecoration: 'none',
                    color: '#7dd3fc',
                    fontWeight: 700,
                  }}
                >
                  Open raw API
                </a>
              </div>
            </div>
          ) : null}

          <div style={{ ...glass, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1500 }}>
              <thead>
                <tr>
                  <th style={th}>Submitted</th>
                  <th style={th}>Business</th>
                  <th style={th}>Contact</th>
                  <th style={th}>Email</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Region</th>
                  <th style={th}>Sources</th>
                  <th style={th}>Payment path</th>
                  <th style={th}>Status</th>
                  <th style={th}>Setup</th>
                  <th style={th}>Monthly</th>
                  <th style={th}>Cur</th>
                  <th style={th}>Payment</th>
                  <th style={th}>Owner</th>
                  <th style={th}>Last contact</th>
                  <th style={th}>Next action</th>
                  <th style={th}>Notes</th>
                  <th style={th} />
                </tr>
              </thead>
              <tbody>
                {showLoadingRow ? (
                  <tr>
                    <td colSpan={18} style={{ ...td, color: '#8899aa' }}>
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {showErrorRow ? (
                  <tr>
                    <td colSpan={18} style={{ ...td, color: '#fecaca' }}>
                      List could not be loaded — see the error above. Press <strong>Retry</strong>.
                    </td>
                  </tr>
                ) : null}
                {showEmptyRow ? (
                  <tr>
                    <td colSpan={18} style={{ ...td, color: '#8899aa' }}>
                      No AI Lead Rescue intakes match these filters.
                    </td>
                  </tr>
                ) : null}
                {!loading && leads.length > 0
                  ? leads.map((row) => (
                      <tr key={row.id}>
                        <td style={{ ...td, color: '#8899aa', fontFamily: 'monospace', fontSize: 12 }}>
                          {fmtDateStableUtc(row.submitted_at)}
                        </td>
                        <td style={{ ...td, fontWeight: 600 }}>{row.business_name || '—'}</td>
                        <td style={td}>{row.contact_name || '—'}</td>
                        <td style={td}>{row.email || '—'}</td>
                        <td style={td}>{row.phone || '—'}</td>
                        <td style={td}>{regionLabel(row.region_path)}</td>
                        <td style={{ ...td, maxWidth: 120 }}>{row.lead_sources || '—'}</td>
                        <td style={{ ...td, maxWidth: 140 }}>{row.preferred_payment_path || '—'}</td>
                        <td style={td}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#2dd4bf' }}>
                            {row.status_label || row.status}
                          </span>
                        </td>
                        <td style={td}>{row.setup_price != null ? row.setup_price : '—'}</td>
                        <td style={td}>{row.monthly_monitoring_price != null ? row.monthly_monitoring_price : '—'}</td>
                        <td style={td}>{row.currency || '—'}</td>
                        <td style={td}>{row.payment_status || 'none'}</td>
                        <td style={td}>{row.owner || '—'}</td>
                        <td style={{ ...td, fontSize: 12, color: '#8899aa' }}>{fmtDateStableUtc(row.last_contacted)}</td>
                        <td style={{ ...td, maxWidth: 140 }}>{row.next_action || '—'}</td>
                        <td style={{ ...td, maxWidth: 120 }}>{row.notes_preview || '—'}</td>
                        <td style={td}>
                          <Link href={row.detail_path} style={{ color: '#7dd3fc', fontWeight: 700, fontSize: 12 }}>
                            Open
                          </Link>
                        </td>
                      </tr>
                    ))
                  : null}
              </tbody>
            </table>
          </div>
      </main>
    </div>
  );
}

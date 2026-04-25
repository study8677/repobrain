import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

/** @param {unknown} v */
function safeObj(v) {
  return v && typeof v === 'object' ? /** @type {Record<string, unknown>} */ (v) : null;
}

/** @param {import('next/router').NextRouter['query'] | undefined} q */
function ticketIdFromQuery(q) {
  if (!q) return '';
  const raw = q.id != null ? q.id : q.ticket_id != null ? q.ticket_id : '';
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s.trim() : '';
}

export default function ClientChangeDecisionsPage() {
  const router = useRouter();

  const [accessToken, setAccessToken] = useState('');
  const [ticketId, setTicketId] = useState('');

  const [busy, setBusy] = useState(false);
  const [loadBusy, setLoadBusy] = useState(false);
  const [error, setError] = useState('');

  const [heading, setHeading] = useState('Decisions before we build');
  const [explanation, setExplanation] = useState('We need your input on four topics before the first live slice.');
  const [items, setItems] = useState(/** @type {Array<Record<string, unknown>>} */ ([]));
  const [answersByKey, setAnswersByKey] = useState(/** @type {Record<string, { answer: string, waive: boolean }>} */ ({}));
  const [sufficientToProceed, setSufficientToProceed] = useState(false);
  const [submittedOk, setSubmittedOk] = useState(false);

  const idFromUrl = router.isReady ? ticketIdFromQuery(router.query) : '';

  useEffect(() => {
    try {
      const t = localStorage.getItem('corpflow_change_access_token') || '';
      if (t) setAccessToken(t);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('corpflow_change_access_token', accessToken || '');
    } catch {}
  }, [accessToken]);

  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = ticketIdFromQuery(router.query);
    if (fromQuery.length >= 18) {
      setTicketId(fromQuery);
    }
  }, [router.isReady, router.query]);

  const hasTicket = ticketId.trim().length >= 18;
  const idProvidedByLink = idFromUrl.length >= 18;

  const headers = useMemo(() => {
    const h = { 'Content-Type': 'application/json' };
    if (accessToken) {
      h['x-session-token'] = accessToken;
      h.Authorization = `Bearer ${accessToken}`;
    }
    return h;
  }, [accessToken]);

  const getHeadersForGet = useMemo(() => {
    const h = { ...headers };
    delete h['Content-Type'];
    return h;
  }, [headers]);

  const seedAnswers = useCallback((list) => {
    /** @type {Record<string, { answer: string, waive: boolean }>} */
    const next = {};
    for (const it of list) {
      const o = safeObj(it) || {};
      const key = typeof o.key === 'string' ? o.key.trim() : '';
      if (!key) continue;
      const st = typeof o.status === 'string' ? o.status.trim().toLowerCase() : '';
      const ans = typeof o.answer === 'string' ? o.answer : '';
      next[key] = { answer: ans, waive: st === 'waived' };
    }
    setAnswersByKey(next);
  }, []);

  const load = useCallback(async () => {
    const id = ticketId.trim();
    setError('');
    setSubmittedOk(false);
    if (id.length < 18) {
      setItems([]);
      setSufficientToProceed(false);
      return;
    }
    setLoadBusy(true);
    try {
      const r = await fetch(`/api/cmp/router?action=client-decisions-get&id=${encodeURIComponent(id)}`, {
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
          window.location.href = '/login';
          return;
        }
        throw new Error(msg || 'Unable to load decisions');
      }
      if (typeof j.heading === 'string' && j.heading.trim()) setHeading(j.heading.trim());
      if (typeof j.explanation === 'string' && j.explanation.trim()) setExplanation(j.explanation.trim());

      const cd = safeObj(j.client_decisions) || {};
      const list = Array.isArray(cd.items) ? cd.items.map((x) => (safeObj(x) ? { ...x } : {})) : [];
      setItems(list);
      setSufficientToProceed(cd.sufficient_to_proceed === true);
      seedAnswers(list);
      if (cd.sufficient_to_proceed === true) setSubmittedOk(true);
    } catch (e) {
      setError(String(e?.message || e));
      setItems([]);
      setSufficientToProceed(false);
    } finally {
      setLoadBusy(false);
    }
  }, [ticketId, getHeadersForGet, seedAnswers]);

  useEffect(() => {
    if (!router.isReady) return;
    const id = ticketId.trim();
    if (id.length < 18) return;
    const t = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(t);
  }, [router.isReady, ticketId, load]);

  async function submit() {
    const id = ticketId.trim();
    if (id.length < 18) {
      setError(idProvidedByLink ? 'Something went wrong loading this page. Please refresh or contact your team.' : 'Use the link your team sent you, or enter your ticket reference below.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      /** @type {Record<string, { answer: string, waive?: boolean }>} */
      const answers = {};
      for (const it of items) {
        const o = safeObj(it) || {};
        const key = typeof o.key === 'string' ? o.key.trim() : '';
        if (!key) continue;
        const cur = answersByKey[key] || { answer: '', waive: false };
        if (key === 'listings_feed_or_idx_provider_status' && cur.waive) {
          answers[key] = { answer: cur.answer, waive: true };
        } else {
          answers[key] = { answer: cur.answer };
        }
      }

      const r = await fetch('/api/cmp/router?action=submit-client-decisions', {
        method: 'POST',
        headers,
        body: JSON.stringify({ ticket_id: id, answers }),
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
          window.location.href = '/login';
          return;
        }
        throw new Error(msg || 'Submit failed');
      }

      const cd = safeObj(j.client_decisions) || {};
      const list = Array.isArray(cd.items) ? cd.items.map((x) => (safeObj(x) ? { ...x } : {})) : [];
      setItems(list);
      setSufficientToProceed(cd.sufficient_to_proceed === true);
      seedAnswers(list);
      if (cd.sufficient_to_proceed === true) {
        setSubmittedOk(true);
      } else {
        setSubmittedOk(false);
        setError('Thanks — we saved your answers. A few required items are still incomplete.');
      }
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', padding: 24, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 12px', color: '#0f172a', fontSize: '1.35rem', fontWeight: 700, lineHeight: 1.3 }}>{heading}</h1>
      <p style={{ margin: '0 0 16px', color: '#475569', fontSize: 15, lineHeight: 1.55 }}>{explanation}</p>

      {loadBusy && hasTicket ? (
        <p style={{ margin: '0 0 16px', fontSize: 14, color: '#64748b' }}>Loading questions…</p>
      ) : null}

      {!idProvidedByLink ? (
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 13, color: '#334155', display: 'block', marginBottom: 6 }}>Ticket reference</label>
          <input
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            placeholder="Paste the id from your invite link"
            style={{ width: '100%', maxWidth: 480, padding: 12, borderRadius: 12, border: '1px solid #cbd5e1', fontSize: 14 }}
          />
        </div>
      ) : null}

      <details style={{ marginBottom: 20, fontSize: 13, color: '#64748b' }}>
        <summary style={{ cursor: 'pointer', color: '#475569' }}>Having trouble? (session access)</summary>
        <p style={{ margin: '10px 0 8px', lineHeight: 1.45 }}>
          If your organization uses an extra sign-in step, paste the access token you were given, then reload this page.
        </p>
        <input
          value={accessToken}
          onChange={(e) => setAccessToken(e.target.value)}
          placeholder="Access token (optional)"
          style={{ width: '100%', maxWidth: 480, padding: 10, borderRadius: 10, border: '1px solid #cbd5e1', fontSize: 13 }}
        />
      </details>

      {submittedOk && sufficientToProceed ? (
        <div
          style={{
            borderRadius: 14,
            border: '1px solid #bbf7d0',
            background: '#f0fdf4',
            padding: 16,
            color: '#14532d',
            fontSize: 15,
            lineHeight: 1.55,
          }}
        >
          Thanks — we’ll review these and prepare the first-slice plan.
        </div>
      ) : null}

      {!submittedOk || !sufficientToProceed ? (
        <div style={{ display: 'grid', gap: 14 }}>
          {items.length === 0 && hasTicket && !loadBusy ? (
            <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>
              No decision questions are set up for this ticket yet. Your team can enable them when ready.
            </p>
          ) : null}

          {items.map((it, idx) => {
            const o = safeObj(it) || {};
            const key = typeof o.key === 'string' ? o.key.trim() : `item_${idx}`;
            const q = typeof o.question === 'string' && o.question.trim() ? String(o.question) : key;
            const cur = answersByKey[key] || { answer: '', waive: false };
            return (
              <div key={key || idx} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#fff' }}>
                <div style={{ fontSize: 14, fontWeight: 650, color: '#0f172a', marginBottom: 8 }}>{q}</div>
                {key === 'listings_feed_or_idx_provider_status' ? (
                  <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13, color: '#334155', marginBottom: 10 }}>
                    <input
                      type="checkbox"
                      checked={cur.waive}
                      onChange={(e) =>
                        setAnswersByKey((prev) => ({
                          ...prev,
                          [key]: { answer: prev[key]?.answer || '', waive: e.target.checked },
                        }))
                      }
                    />
                    Waive for now (we will revisit IDX/listings before go-live)
                  </label>
                ) : null}
                <textarea
                  value={cur.answer}
                  disabled={key === 'listings_feed_or_idx_provider_status' ? cur.waive : false}
                  onChange={(e) =>
                    setAnswersByKey((prev) => ({
                      ...prev,
                      [key]: { waive: prev[key]?.waive || false, answer: e.target.value },
                    }))
                  }
                  placeholder="Your answer"
                  style={{
                    width: '100%',
                    minHeight: 88,
                    padding: 12,
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    fontSize: 14,
                    lineHeight: 1.45,
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {!submittedOk || !sufficientToProceed ? (
        <button
          type="button"
          onClick={() => submit()}
          disabled={busy || !hasTicket}
          style={{
            marginTop: 18,
            width: '100%',
            maxWidth: 480,
            padding: '14px 18px',
            borderRadius: 14,
            border: 'none',
            background: busy || !hasTicket ? '#94a3b8' : '#0f172a',
            color: '#fff',
            fontSize: 16,
            fontWeight: 750,
            cursor: busy || !hasTicket ? 'not-allowed' : 'pointer',
          }}
        >
          Send answers
        </button>
      ) : null}

      {error ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
          {error}
        </div>
      ) : null}
    </div>
  );
}

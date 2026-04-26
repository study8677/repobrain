import { useMemo, useState } from 'react';

function str(v) {
  return v != null ? String(v) : '';
}

export default function FranceLanding() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [leadId, setLeadId] = useState('');
  const [autoResponse, setAutoResponse] = useState(null);
  const [answers, setAnswers] = useState({ budget: '', intent: '', timeline: '' });
  const [qualified, setQualified] = useState(false);
  const [thanks, setThanks] = useState(false);

  const canSubmitLead = useMemo(() => name.trim() && email.trim(), [name, email]);

  async function submitLead() {
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/tenant/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() || undefined }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Lead submit failed');
      setLeadId(str(j.lead_id));
      setAutoResponse(j.auto_response || null);
    } catch (e) {
      setError(str(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function submitQual() {
    if (!leadId) return;
    setBusy(true);
    setError('');
    try {
      const r = await fetch('/api/tenant/leads/qualify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, answers }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'Qualification failed');
      setQualified(j.qualified === true);
      setThanks(true);
    } catch (e) {
      setError(str(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const card = {
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    background: '#fff',
    padding: 18,
  };

  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', padding: 24, maxWidth: 980, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, color: '#0f172a' }}>
        Private listings — France
      </h1>
      <div style={{ color: '#475569', maxWidth: 720, lineHeight: 1.55, marginBottom: 18 }}>
        Curated private inventory. Request access, answer a few questions, and a human will follow up.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 16, alignItems: 'start' }}>
        <div style={card}>
          <div style={{ fontSize: 13, fontWeight: 900, color: '#64748b', letterSpacing: '0.06em', marginBottom: 10 }}>
            SHOWCASE (SAMPLE)
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            {[
              { title: 'Paris · Off-market apartment', body: 'Private access only. Quiet building, premium renovation.' },
              { title: 'Côte d’Azur · Sea-view villa', body: 'Shortlisted private inventory. Discreet viewings.' },
              { title: 'French Alps · Chalet', body: 'Seasonal access. High privacy, concierge handoff.' },
            ].map((x) => (
              <div key={x.title} style={{ border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#f8fafc' }}>
                <div style={{ fontWeight: 850, color: '#0f172a', marginBottom: 6 }}>{x.title}</div>
                <div style={{ color: '#475569', fontSize: 14, lineHeight: 1.5 }}>{x.body}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={card}>
          <div style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', marginBottom: 8 }}>Request details / Get access</div>
          {!autoResponse && !thanks ? (
            <>
              <label style={{ display: 'block', fontSize: 12, color: '#334155', marginBottom: 8 }}>
                Name
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              </label>
              <label style={{ display: 'block', fontSize: 12, color: '#334155', marginBottom: 8 }}>
                Email
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              </label>
              <label style={{ display: 'block', fontSize: 12, color: '#334155', marginBottom: 12 }}>
                Phone (optional)
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !canSubmitLead}
                onClick={submitLead}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: 'none',
                  background: busy || !canSubmitLead ? '#94a3b8' : '#0f172a',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: busy || !canSubmitLead ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Submitting…' : 'Request details'}
              </button>
            </>
          ) : null}

          {autoResponse && !thanks ? (
            <>
              <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: '#f0f9ff', border: '1px solid #bae6fd', color: '#0c4a6e' }}>
                {str(autoResponse.message)}
              </div>
              <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#334155' }}>
                  Budget range (optional)
                  <input
                    value={answers.budget}
                    onChange={(e) => setAnswers((p) => ({ ...p, budget: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label style={{ display: 'block', fontSize: 12, color: '#334155' }}>
                  What are you looking for?
                  <textarea
                    value={answers.intent}
                    onChange={(e) => setAnswers((p) => ({ ...p, intent: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, minHeight: 80, borderRadius: 12, border: '1px solid #cbd5e1' }}
                  />
                </label>
                <label style={{ display: 'block', fontSize: 12, color: '#334155' }}>
                  Timeline
                  <input
                    value={answers.timeline}
                    onChange={(e) => setAnswers((p) => ({ ...p, timeline: e.target.value }))}
                    style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={busy || !answers.intent.trim() || !answers.timeline.trim()}
                onClick={submitQual}
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '12px 14px',
                  borderRadius: 14,
                  border: 'none',
                  background: busy || !answers.intent.trim() || !answers.timeline.trim() ? '#94a3b8' : '#0f172a',
                  color: '#fff',
                  fontWeight: 900,
                  cursor: busy ? 'not-allowed' : 'pointer',
                }}
              >
                {busy ? 'Submitting…' : 'Send answers'}
              </button>
            </>
          ) : null}

          {thanks ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#14532d' }}>
              Thank you — we’ve received your answers. {qualified ? 'A human has been alerted.' : 'A human will follow up.'}
            </div>
          ) : null}

          {error ? (
            <div style={{ marginTop: 10, padding: 12, borderRadius: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}


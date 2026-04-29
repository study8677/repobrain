import { useMemo, useState } from 'react';

function str(v) {
  return v != null ? String(v) : '';
}

export default function ConciergePage() {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payload, setPayload] = useState(null);

  const canSubmit = useMemo(
    () => name.trim().length > 1 && contact.trim().length > 2 && message.trim().length > 2,
    [name, contact, message],
  );

  async function onSubmit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    setSuccess('');
    setPayload(null);
    try {
      const r = await fetch('/api/cmp/router?action=concierge-lead-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          contact: contact.trim(),
          message: message.trim(),
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || j.detail || `http_${r.status}`);
      setPayload(j);
      setSuccess('Thanks. Your message was received.');
      setName('');
      setContact('');
      setMessage('');
    } catch (err) {
      setError(str(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif', maxWidth: 720, margin: '0 auto', padding: 24 }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 30, fontWeight: 900, color: '#0f172a' }}>AI Concierge Lite</h1>
      <p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.5 }}>
        Tell us what you need. A human operator will follow up.
      </p>

      <form
        onSubmit={onSubmit}
        style={{ border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff', padding: 16, display: 'grid', gap: 12 }}
      >
        <label style={{ fontSize: 13, color: '#334155' }}>
          Name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Contact (email or phone)
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="name@email.com or +230..."
            style={{ display: 'block', width: '100%', marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
          />
        </label>

        <label style={{ fontSize: 13, color: '#334155' }}>
          Message
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can we help?"
            style={{ display: 'block', width: '100%', minHeight: 120, marginTop: 6, padding: 10, borderRadius: 12, border: '1px solid #cbd5e1' }}
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit || busy}
          style={{
            border: 'none',
            borderRadius: 12,
            padding: '12px 14px',
            background: !canSubmit || busy ? '#94a3b8' : '#0f172a',
            color: '#fff',
            fontWeight: 900,
            cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
          }}
        >
          {busy ? 'Submitting...' : 'Send message'}
        </button>
      </form>

      {success ? (
        <div style={{ marginTop: 12, border: '1px solid #bbf7d0', background: '#f0fdf4', color: '#14532d', borderRadius: 12, padding: 10 }}>
          {success}
        </div>
      ) : null}

      {error ? (
        <div style={{ marginTop: 12, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b', borderRadius: 12, padding: 10 }}>
          {error}
        </div>
      ) : null}

      {payload ? (
        <pre
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 12,
            border: '1px solid #e2e8f0',
            background: '#f8fafc',
            color: '#0f172a',
            overflowX: 'auto',
            fontSize: 12,
          }}
        >
          {JSON.stringify(payload, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}

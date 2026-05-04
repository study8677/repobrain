import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

function str(v) {
  return v != null ? String(v) : '';
}

const theme = {
  bg: '#0a0a0a',
  surface: '#0f0f10',
  text: '#f5f5f5',
  muted: '#bdbdbd',
  gold: '#d4af37',
  border: 'rgba(255,255,255,0.10)',
  inputBg: 'rgba(0,0,0,0.35)',
};

export default function ConciergePage() {
  const router = useRouter();
  const showDebugPayload = router.query?.debug === '1';

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
      setSuccess('Thank you. A private advisor will be in touch shortly.');
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
    <div
      style={{
        fontFamily: 'system-ui, Segoe UI, Roboto, sans-serif',
        minHeight: '100vh',
        background: theme.bg,
        color: theme.text,
      }}
    >
      <Head>
        <title>Private Client Concierge · Lux Mauritius</title>
      </Head>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 22px 56px' }}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: 12,
              letterSpacing: 0.08,
              textTransform: 'uppercase',
              color: theme.muted,
              textDecoration: 'none',
              fontWeight: 650,
            }}
          >
            ← Residence overview
          </Link>
        </div>

        <p
          style={{
            margin: '0 0 10px',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: theme.muted,
            fontWeight: 700,
          }}
        >
          Lux Mauritius
        </p>
        <h1
          style={{
            margin: '0 0 14px',
            fontSize: 34,
            lineHeight: 1.12,
            fontWeight: 700,
            letterSpacing: 0.02,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}
        >
          Private Client Concierge
        </h1>
        <p style={{ margin: '0 0 10px', fontSize: 16, lineHeight: 1.55, color: theme.muted, maxWidth: 560 }}>
          Share a brief introduction and the best way to reach you. Your message goes to a single private advisor—not a
          shared inbox—who reads it personally and treats every detail as confidential.
        </p>
        <p style={{ margin: '0 0 32px', fontSize: 14, lineHeight: 1.5, color: 'rgba(245,245,245,0.72)', maxWidth: 560 }}>
          That advisor will respond within one business day. Nothing you share is used for marketing lists; discretion
          is absolute from first contact.
        </p>

        <form
          onSubmit={onSubmit}
          style={{
            border: `1px solid ${theme.border}`,
            borderRadius: 18,
            background: theme.surface,
            padding: 22,
            display: 'grid',
            gap: 16,
          }}
        >
          <label style={{ fontSize: 13, color: theme.muted, fontWeight: 650 }}>
            Name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: theme.muted, fontWeight: 650 }}>
            Preferred contact
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Direct email or telephone line"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: theme.muted, fontWeight: 650 }}>
            Your brief
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Interest, timing, and any context you are comfortable sharing."
              style={{
                display: 'block',
                width: '100%',
                minHeight: 140,
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: 12,
                border: `1px solid ${theme.border}`,
                background: theme.inputBg,
                color: theme.text,
                fontSize: 15,
                lineHeight: 1.45,
              }}
            />
          </label>

          <button
            type="submit"
            disabled={!canSubmit || busy}
            style={{
              border: 'none',
              borderRadius: 14,
              padding: '14px 18px',
              background: !canSubmit || busy ? '#5c5c5c' : theme.gold,
              color: '#0a0a0a',
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: 0.03,
              cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Submitting…' : 'Speak with a Private Advisor'}
          </button>
        </form>

        {success ? (
          <div
            style={{
              marginTop: 16,
              border: '1px solid rgba(212,175,55,0.35)',
              background: 'rgba(212,175,55,0.08)',
              color: theme.text,
              borderRadius: 14,
              padding: 14,
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {success}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 16,
              border: '1px solid rgba(248,113,113,0.45)',
              background: 'rgba(127,29,29,0.25)',
              color: '#fecaca',
              borderRadius: 14,
              padding: 14,
              fontSize: 14,
            }}
          >
            {error}
          </div>
        ) : null}

        {showDebugPayload && payload ? (
          <pre
            style={{
              marginTop: 16,
              padding: 14,
              borderRadius: 14,
              border: `1px solid ${theme.border}`,
              background: theme.surface,
              color: theme.muted,
              overflowX: 'auto',
              fontSize: 11,
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}

        <p style={{ marginTop: 36, textAlign: 'center', fontSize: 12, color: theme.muted, lineHeight: 1.5 }}>
          Private client access · Information is used solely to respond to your enquiry.
        </p>
      </main>
    </div>
  );
}

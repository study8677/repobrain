import { useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

function str(v) {
  return v != null ? String(v) : '';
}

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
        fontFamily: T.fontUi,
        minHeight: '100vh',
        background: T.pageBg,
        color: T.ink,
      }}
    >
      <Head>
        <title>Private concierge · Luxurious Mauritius</title>
      </Head>
      <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 28px 64px' }}>
        <div style={{ marginBottom: 28 }}>
          <Link
            href="/"
            style={{
              fontSize: 12,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: T.goldDeep,
              textDecoration: 'none',
              fontWeight: 750,
            }}
          >
            ← Luxurious Mauritius
          </Link>
        </div>

        <p
          style={{
            margin: '0 0 10px',
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: T.inkMuted,
            fontWeight: 700,
          }}
        >
          LuxeMaurice
        </p>
        <h1
          style={{
            margin: '0 0 14px',
            fontSize: 34,
            lineHeight: 1.12,
            fontWeight: 700,
            letterSpacing: 0.02,
            fontFamily: T.fontDisplay,
            color: T.ink,
          }}
        >
          Private concierge
        </h1>
        <p style={{ margin: '0 0 10px', fontSize: 17, lineHeight: 1.6, color: T.inkMuted, maxWidth: 560 }}>
          Share how we can help with Mauritius property — developments you like, timing, and the best way to reach you.
          Your note is read by a single advisor who works directly with the developer pipeline.
        </p>
        <p style={{ margin: '0 0 36px', fontSize: 15, lineHeight: 1.55, color: T.inkMuted, maxWidth: 560 }}>
          We respond within one business day. Developer-backed opportunities only; nothing here is an offer until
          agreed in writing.
        </p>

        <form
          onSubmit={onSubmit}
          style={{
            border: `1px solid ${T.border}`,
            borderRadius: T.radiusLg,
            background: T.white,
            padding: 26,
            display: 'grid',
            gap: 16,
            boxShadow: '0 16px 48px rgba(28,25,23,0.06)',
          }}
        >
          <label style={{ fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
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
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.pageBg,
                color: T.ink,
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
            Preferred contact
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or telephone"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.pageBg,
                color: T.ink,
                fontSize: 15,
              }}
            />
          </label>

          <label style={{ fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
            Your enquiry
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Developments of interest, budget range, and when you would like to visit."
              style={{
                display: 'block',
                width: '100%',
                minHeight: 140,
                marginTop: 8,
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.pageBg,
                color: T.ink,
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
              borderRadius: T.radiusMd,
              padding: '15px 20px',
              background: !canSubmit || busy ? '#a8a29e' : T.gold,
              color: T.white,
              fontWeight: 800,
              fontSize: 15,
              letterSpacing: 0.02,
              cursor: !canSubmit || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Submitting…' : 'Speak with a Private Advisor'}
          </button>
        </form>

        {success ? (
          <div
            style={{
              marginTop: 18,
              border: `1px solid ${T.border}`,
              background: T.sand,
              color: T.ink,
              borderRadius: T.radiusMd,
              padding: 16,
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            {success}
          </div>
        ) : null}

        {error ? (
          <div
            style={{
              marginTop: 18,
              border: '1px solid rgba(220,38,38,0.35)',
              background: '#fef2f2',
              color: '#991b1b',
              borderRadius: T.radiusMd,
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
              marginTop: 18,
              padding: 14,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.border}`,
              background: T.white,
              color: T.inkMuted,
              overflowX: 'auto',
              fontSize: 11,
            }}
          >
            {JSON.stringify(payload, null, 2)}
          </pre>
        ) : null}

        <p style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: T.inkMuted, lineHeight: 1.55 }}>
          Information is used solely to respond to your enquiry.
        </p>
      </main>
    </div>
  );
}

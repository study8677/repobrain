import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';
import { buildConciergeSeo } from '../lib/client/concierge-seo.js';

function str(v) {
  return v != null ? String(v) : '';
}

export default function ConciergePage({ seoHost = '' } = {}) {
  const router = useRouter();
  const showDebugPayload = router.query?.debug === '1';

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [payload, setPayload] = useState(null);
  const [propertyInterest, setPropertyInterest] = useState(null);
  /** After client resolve: whether we finished matching `property` query (staged or `/api/lux/listing`). */
  const [propertyRefState, setPropertyRefState] = useState({ ready: false, matched: false });

  useEffect(() => {
    if (!router.isReady) return;
    const rawProp = router.query?.property != null ? String(router.query.property).trim() : '';
    if (!rawProp) {
      setPropertyInterest(null);
      setPropertyRefState({ ready: false, matched: false });
      return;
    }
    const sync = resolveLuxPropertyRef(rawProp);
    if (sync) {
      setPropertyInterest(sync);
      setPropertyRefState({ ready: true, matched: true });
      return;
    }
    let cancelled = false;
    setPropertyInterest(null);
    setPropertyRefState({ ready: false, matched: false });
    (async () => {
      try {
        const r = await fetch(`/api/lux/listing?slug=${encodeURIComponent(rawProp)}`);
        const j = await r.json().catch(() => ({}));
        if (cancelled) return;
        if (r.ok && j && j.ok === true && j.listing && typeof j.listing === 'object') {
          const L = j.listing;
          setPropertyInterest({
            ref: String(L.slug || '').trim(),
            title: String(L.title || '').trim(),
            location: String(L.region_label || '').trim(),
            property_type: String(L.property_type || '').trim(),
            status: L.listing_status != null ? String(L.listing_status).trim() : null,
            price_range: L.price_range != null ? String(L.price_range).trim() : null,
            discovery_source: 'lux_postgres',
            summary_text: L.short_teaser != null ? String(L.short_teaser).trim() : '',
            highlights: Array.isArray(L.highlights) ? L.highlights.map((h) => String(h)).filter(Boolean) : [],
          });
          setPropertyRefState({ ready: true, matched: true });
        } else {
          setPropertyInterest(null);
          setPropertyRefState({ ready: true, matched: false });
        }
      } catch {
        if (!cancelled) {
          setPropertyInterest(null);
          setPropertyRefState({ ready: true, matched: false });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router.isReady, router.query?.property]);

  useEffect(() => {
    if (!propertyInterest) return;
    setMessage((prev) => {
      const p = prev.trim();
      if (p.length > 0 && p.includes(propertyInterest.ref)) return prev;
      const seed = `I am writing about "${propertyInterest.title}" (${propertyInterest.ref}).\n\n`;
      if (p.length > 0) return prev;
      return seed;
    });
  }, [propertyInterest?.ref]);

  const seo = useMemo(
    () =>
      buildConciergeSeo({
        host: seoHost,
        propertyTitle: propertyInterest ? propertyInterest.title : '',
        propertyRef: propertyInterest ? propertyInterest.ref : '',
      }),
    [seoHost, propertyInterest],
  );

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
      const body = {
        name: name.trim(),
        contact: contact.trim(),
        message: message.trim(),
      };
      if (propertyInterest) {
        body.property_slug = propertyInterest.ref;
        body.property_title = propertyInterest.title;
      }
      const r = await fetch('/api/cmp/router?action=concierge-lead-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta name="robots" content={seo.robots} />
        <link rel="canonical" href={seo.canonical} />
        <meta property="og:title" content={seo.ogTitle} />
        <meta property="og:description" content={seo.ogDescription} />
        <meta property="og:url" content={seo.ogUrl} />
        <meta property="og:type" content={seo.ogType} />
        <meta property="og:site_name" content={seo.ogSiteName} />
        <meta name="twitter:card" content={seo.twitterCard} />
        <meta name="twitter:title" content={seo.twitterTitle} />
        <meta name="twitter:description" content={seo.twitterDescription} />
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

        {propertyInterest ? (
          <div
            style={{
              marginBottom: 22,
              padding: 16,
              borderRadius: T.radiusMd,
              border:
                propertyInterest.discovery_source === 'feed'
                  ? `1px dashed ${T.border}`
                  : propertyInterest.discovery_source === 'manual_curated' ||
                      propertyInterest.discovery_source === 'lux_postgres'
                    ? `2px solid ${T.goldDeep}`
                    : `1px solid ${T.goldDeep}`,
              background: T.sand,
              color: T.ink,
              fontSize: 15,
              lineHeight: 1.55,
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 800 }}>
              Property interest
              {propertyInterest.discovery_source === 'feed' ? (
                <span style={{ color: T.inkMuted, fontWeight: 700 }}> · Explore listing (feed preview)</span>
              ) : propertyInterest.discovery_source === 'manual_curated' ? (
                <span style={{ color: T.inkMuted, fontWeight: 700 }}> · Manual curated listing</span>
              ) : propertyInterest.discovery_source === 'lux_postgres' ? (
                <span style={{ color: T.inkMuted, fontWeight: 700 }}> · Private showcase</span>
              ) : (
                <span style={{ color: T.inkMuted, fontWeight: 700 }}> · Featured (developer-led)</span>
              )}
            </div>
            <div style={{ marginTop: 8, fontWeight: 750 }}>
              {propertyInterest.title}
              {propertyInterest.status ? (
                <span style={{ color: T.inkMuted, fontWeight: 600 }}> · {propertyInterest.status}</span>
              ) : null}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: T.inkMuted }}>
              {propertyInterest.location} · {propertyInterest.property_type}
            </div>
            {propertyInterest.price_range ? (
              <div style={{ marginTop: 8, fontSize: 14, fontWeight: 650, color: T.ink }}>{propertyInterest.price_range}</div>
            ) : null}
          </div>
        ) : router.isReady &&
          String(router.query?.property || '').trim() &&
          propertyRefState.ready &&
          !propertyRefState.matched ? (
          <div
            style={{
              marginBottom: 22,
              padding: 14,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.border}`,
              background: T.white,
              color: T.inkMuted,
              fontSize: 14,
            }}
          >
            We could not match that property reference. You can still send a general enquiry below.
          </div>
        ) : null}

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


// __concierge_gssp_v1__
// Server-side capture of the request host so the SEO canonical + og:url
// reflect the host the visitor actually arrived on (vs. always hard-coding
// the primary host). This runs in `getServerSideProps` because the value
// must be in the SSR'd HTML for crawlers and social-preview generators
// that do not execute client JS.
//
// Today the `/concierge` route renders Lux-branded content regardless of
// host (see `lib/client/concierge-seo.js` header). When the host-aware
// tenant rendering described in `docs/quality/LUX_TRUST_AND_POLICY_REMEDIATION_PLAN.md`
// ships, this function gains the tenant lookup; today it stays minimal.
export async function getServerSideProps({ req }) {
  let seoHost = '';
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    seoHost = raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    seoHost = '';
  }
  return { props: { seoHost } };
}

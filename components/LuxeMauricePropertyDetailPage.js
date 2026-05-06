import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice-only property detail (Phase 2C). Props must be server-built — do not trust client-supplied listing fields.
 * @param {{ property: { ref: string, title: string, location: string, property_type: string, status: string | null, price_display: string, discovery_source: 'curated' | 'manual_curated' | 'feed', summary_text: string, highlights: string[], hero_image?: string | null } }} props
 */
export default function LuxeMauricePropertyDetailPage({ property }) {
  const p = property || {};
  const ref = safeStr(p.ref);
  const isFeed = p.discovery_source === 'feed';
  const isManual = p.discovery_source === 'manual_curated';
  const conciergeHref = `/concierge?intent=property&property=${encodeURIComponent(ref)}`;
  const pageTitle = ref ? `${safeStr(p.title)} · Luxurious Mauritius` : 'Property · Luxurious Mauritius';

  const heroImg = (() => {
    const s = p.hero_image != null ? String(p.hero_image).trim() : '';
    if (!s.startsWith('/')) return null;
    if (s.includes('..') || s.includes('//')) return null;
    return s;
  })();

  const heroBorder = isFeed
    ? `1px dashed ${T.border}`
    : isManual
      ? `2px solid ${T.goldDeep}`
      : `1px solid ${T.goldDeep}`;
  const heroBg = isFeed ? T.white : T.sand;

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
        <title>{pageTitle}</title>
      </Head>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '18px 28px',
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
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
        {isFeed ? (
          <span style={{ fontSize: 11, color: T.inkMuted, fontWeight: 650 }}>Explore · market preview</span>
        ) : isManual ? (
          <span style={{ fontSize: 11, color: T.goldDeep, fontWeight: 750 }}>Manual · operator curated</span>
        ) : (
          <span style={{ fontSize: 11, color: T.goldDeep, fontWeight: 750 }}>Featured · developer-led</span>
        )}
      </header>

      <main style={{ maxWidth: 800, margin: '0 auto', padding: '40px 28px 72px' }}>
        <div
          style={{
            borderRadius: T.radiusLg,
            border: heroBorder,
            background: heroBg,
            padding: '28px 26px 30px',
            boxShadow: isFeed ? 'none' : '0 12px 40px rgba(28,25,23,0.06)',
            overflow: 'hidden',
          }}
        >
          {heroImg ? (
            <div style={{ margin: '-28px -26px 18px', height: 200, background: T.placeholder }}>
              <img src={heroImg} alt="" style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          ) : null}
          <p
            style={{
              margin: '0 0 8px',
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: T.inkMuted,
              fontWeight: 700,
            }}
          >
            {safeStr(p.location)} · {safeStr(p.property_type)}
          </p>
          <h1
            style={{
              margin: '0 0 12px',
              fontSize: 'clamp(1.55rem, 3.5vw, 2.1rem)',
              lineHeight: 1.15,
              fontWeight: 700,
              fontFamily: T.fontDisplay,
              color: T.ink,
            }}
          >
            {safeStr(p.title)}
          </h1>
          {p.status ? (
            <p style={{ margin: '0 0 10px', fontSize: 14, fontWeight: 650, color: isFeed ? T.inkMuted : T.goldDeep }}>{safeStr(p.status)}</p>
          ) : null}
          <p style={{ margin: 0, fontSize: 18, fontWeight: 750, color: T.ink }}>{safeStr(p.price_display)}</p>
        </div>

        <section style={{ marginTop: 32 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontFamily: T.fontDisplay, color: T.ink }}>Overview</h2>
          <p style={{ margin: 0, fontSize: 16, lineHeight: 1.65, color: T.inkMuted }}>{safeStr(p.summary_text)}</p>
        </section>

        {Array.isArray(p.highlights) && p.highlights.length ? (
          <section style={{ marginTop: 28 }}>
            <h2 style={{ margin: '0 0 12px', fontSize: 18, fontFamily: T.fontDisplay, color: T.ink }}>Highlights</h2>
            <ul style={{ margin: 0, paddingLeft: 20, color: T.inkMuted, lineHeight: 1.65, fontSize: 15 }}>
              {p.highlights.map((h, i) => (
                <li key={i} style={{ marginBottom: 8 }}>
                  {safeStr(h)}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 18, fontFamily: T.fontDisplay, color: T.ink }}>At a glance</h2>
          <dl
            style={{
              margin: 0,
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 160px) 1fr',
              gap: '10px 16px',
              fontSize: 14,
              color: T.inkMuted,
            }}
          >
            <dt style={{ fontWeight: 700, color: T.ink }}>Reference</dt>
            <dd style={{ margin: 0 }}>{ref}</dd>
            <dt style={{ fontWeight: 700, color: T.ink }}>Region</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.location)}</dd>
            <dt style={{ fontWeight: 700, color: T.ink }}>Type</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.property_type)}</dd>
            {p.status ? (
              <>
                <dt style={{ fontWeight: 700, color: T.ink }}>Status</dt>
                <dd style={{ margin: 0 }}>{safeStr(p.status)}</dd>
              </>
            ) : null}
            <dt style={{ fontWeight: 700, color: T.ink }}>Pricing</dt>
            <dd style={{ margin: 0 }}>{safeStr(p.price_display)}</dd>
          </dl>
        </section>

        <div style={{ marginTop: 36 }}>
          <a
            href={conciergeHref}
            style={{
              display: 'inline-block',
              padding: '14px 22px',
              borderRadius: 999,
              background: T.ink,
              color: T.white,
              fontWeight: 800,
              fontSize: 15,
              textDecoration: 'none',
            }}
          >
            Request private details
          </a>
          <p style={{ marginTop: 14, fontSize: 13, color: T.inkMuted, lineHeight: 1.5 }}>
            You will reach the same private concierge flow as from the main listings — your advisor sees this property reference.
          </p>
        </div>
      </main>
    </div>
  );
}

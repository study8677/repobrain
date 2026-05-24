import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice-only property detail (Phase 2C). Props must be server-built — do not trust client-supplied listing fields.
 * @param {{ property: { ref: string, title: string, location: string, property_type: string, status: string | null, price_display: string, discovery_source: 'curated' | 'manual_curated' | 'feed' | 'lux_postgres', summary_text: string, highlights: string[], hero_image?: string | null, published_hero?: { src: string, src_set?: string, alt: string, caption: string | null } | null, published_gallery?: { src: string, src_set?: string, alt: string, caption: string | null, gallery_order?: number | null, is_gallery_cover?: boolean }[] }, editor_preview?: boolean }} props
 */
export default function LuxeMauricePropertyDetailPage({ property, editor_preview }) {
  const p = property || {};
  const ref = safeStr(p.ref);
  const isFeed = p.discovery_source === 'feed';
  const isManual = p.discovery_source === 'manual_curated';
  const isLuxPostgres = p.discovery_source === 'lux_postgres';
  const conciergeHref = `/concierge?intent=property&property=${encodeURIComponent(ref)}`;
  const pageTitle = ref ? `${safeStr(p.title)} · Luxurious Mauritius` : 'Property · Luxurious Mauritius';

  // SEO description: prefer the curated summary, fall back to a synthesized line
  // built from location + property type + price so the page is always indexable
  // even when summary_text is empty.
  const summaryRaw = safeStr(p.summary_text);
  const propertyType = safeStr(p.property_type);
  const location = safeStr(p.location);
  const priceLine = safeStr(p.price_display);
  const synthesizedSummary = [
    propertyType ? `${propertyType}` : null,
    location ? `in ${location}` : null,
    priceLine ? `· ${priceLine}` : null,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();
  const seoDescriptionRaw =
    summaryRaw ||
    synthesizedSummary ||
    'Luxurious Mauritius — private previews of developer-led residences. Request a private enquiry through our concierge.';
  const seoDescription =
    seoDescriptionRaw.length > 320 ? `${seoDescriptionRaw.slice(0, 317)}…` : seoDescriptionRaw;
  const seoCanonical = ref ? `https://lux.corpflowai.com/property/${ref}` : 'https://lux.corpflowai.com/';
  const seoOgImage =
    (p.published_hero && typeof p.published_hero === 'object' && p.published_hero.src && /^https?:\/\//.test(p.published_hero.src))
      ? p.published_hero.src
      : '';

  const publishedHero = p.published_hero && typeof p.published_hero === 'object' ? p.published_hero : null;
  const publishedGallery = Array.isArray(p.published_gallery)
    ? p.published_gallery.filter((g) => g && typeof g === 'object' && safeStr(g.src))
    : [];

  const heroImg = (() => {
    if (publishedHero && publishedHero.src) {
      const ss = publishedHero.src_set != null ? String(publishedHero.src_set).trim() : '';
      return {
        src: String(publishedHero.src),
        srcSet: ss || undefined,
        sizes: ss ? '(max-width: 900px) 100vw, 820px' : undefined,
        alt: safeStr(publishedHero.alt),
        caption: publishedHero.caption ? safeStr(publishedHero.caption) : null,
      };
    }
    const s = p.hero_image != null ? String(p.hero_image).trim() : '';
    if (!s.startsWith('/')) return null;
    if (s.includes('..') || s.includes('//')) return null;
    return { src: s, srcSet: undefined, sizes: undefined, alt: '', caption: null };
  })();

  const heroAltText = heroImg?.alt ? safeStr(heroImg.alt) : ref ? `${ref} · hero` : 'Property hero image';
  const galleryAltText = (g) => (safeStr(g.alt) ? safeStr(g.alt) : ref ? `${ref} · gallery` : 'Gallery image');

  const heroBorder = isFeed
    ? `1px dashed ${T.border}`
    : isManual || isLuxPostgres
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
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={seoCanonical} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={seoCanonical} />
        {seoOgImage ? <meta property="og:image" content={seoOgImage} /> : null}
        <meta name="twitter:card" content={seoOgImage ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {seoOgImage ? <meta name="twitter:image" content={seoOgImage} /> : null}
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
        ) : isLuxPostgres ? (
          <span style={{ fontSize: 11, color: T.goldDeep, fontWeight: 750 }}>Private showcase</span>
        ) : (
          <span style={{ fontSize: 11, color: T.goldDeep, fontWeight: 750 }}>Featured · developer-led</span>
        )}
      </header>

      {editor_preview ? (
        <div
          style={{
            margin: '0 auto',
            maxWidth: 800,
            padding: '14px 28px 0',
            fontSize: 14,
            lineHeight: 1.5,
            color: T.heroDeep,
            fontWeight: 650,
          }}
        >
          <div
            style={{
              borderRadius: T.radiusMd,
              border: `1px solid ${T.goldDeep}`,
              background: T.sand,
              padding: '12px 16px',
            }}
          >
            Private preview — this URL is for editors only and is not the public listing. Remove{' '}
            <code style={{ fontSize: 12 }}>?preview=1</code> to open the visitor-facing page when the property is published.
          </div>
        </div>
      ) : null}

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
              <img
                src={heroImg.src}
                srcSet={heroImg.srcSet}
                sizes={heroImg.sizes}
                alt={heroAltText}
                decoding="async"
                fetchPriority="high"
                loading="eager"
                style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ) : null}
          {heroImg?.caption ? (
            <p style={{ margin: '-6px 0 14px', fontSize: 12, color: T.inkMuted, lineHeight: 1.5 }}>{heroImg.caption}</p>
          ) : null}
          {publishedGallery.length > 0 ? (
            <section style={{ marginTop: 20 }}>
              <h2
                style={{
                  margin: '0 0 12px',
                  fontSize: 15,
                  fontFamily: T.fontDisplay,
                  color: T.ink,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                }}
              >
                Gallery
              </h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                  gap: 12,
                }}
              >
                {publishedGallery.map((g, gi) => {
                  const gs = g.src_set != null ? String(g.src_set).trim() : '';
                  return (
                  <figure key={gi} style={{ margin: 0 }}>
                    <img
                      src={safeStr(g.src)}
                      srcSet={gs || undefined}
                      sizes={gs ? '(max-width: 900px) 50vw, 200px' : undefined}
                      alt={galleryAltText(g)}
                      decoding="async"
                      loading="lazy"
                      style={{
                        display: 'block',
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderRadius: 10,
                        border: `1px solid ${T.border}`,
                      }}
                    />
                    {g.caption ? (
                      <figcaption style={{ marginTop: 6, fontSize: 11, color: T.inkMuted, lineHeight: 1.45 }}>
                        {safeStr(g.caption)}
                      </figcaption>
                    ) : null}
                  </figure>
                  );
                })}
              </div>
            </section>
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

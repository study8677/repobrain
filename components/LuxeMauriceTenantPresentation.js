import React, { useMemo, useState } from 'react';
import Head from 'next/head';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { resolveLuxPropertyRef, safeLuxSameOriginPublicImagePath } from '../lib/client/luxe-maurice-property-resolve.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

/**
 * LuxeMaurice-only marketing shell for `lux.corpflowai.com` (and preview hosts with same tenant).
 * Gated by `site.client_ui.lux_acquisition` from SSR — other tenants keep using `TenantSite`.
 */
export default function LuxeMauriceTenantPresentation({ site }) {
  const s = site || {};
  const operatorDebug = s.client_ui?.operator_debug === true;
  const hero = s.hero || {};
  const about = s.sections?.about || {};
  const services = s.sections?.services || {};
  const contact = s.sections?.contact || {};
  const media = s.media || {};
  const languages = Array.isArray(s.languages) ? s.languages : ['en', 'fr', 'ru'];
  const langDefault = typeof s.lang_default === 'string' && s.lang_default ? s.lang_default : 'en';
  const lang =
    typeof s.lang_active === 'string' && s.lang_active ? s.lang_active : langDefault;

  const i18n = s.i18n && typeof s.i18n === 'object' ? s.i18n : {};
  const i18nBlock = i18n[lang] && typeof i18n[lang] === 'object' ? i18n[lang] : null;
  const tHero = i18nBlock?.hero && typeof i18nBlock.hero === 'object' ? i18nBlock.hero : null;
  const tAbout = i18nBlock?.about && typeof i18nBlock.about === 'object' ? i18nBlock.about : null;

  const meta = s.meta && typeof s.meta === 'object' ? s.meta : {};
  const pageTitle = safeStr(meta.page_title) || 'Luxurious Mauritius';

  const headline =
    safeStr(tHero?.headline) || safeStr(tHero?.subtitle) || safeStr(hero.headline) || safeStr(hero.subtitle) || '';
  const tagline = safeStr(tHero?.tagline) || safeStr(hero.tagline) || '';
  const aboutTitle = safeStr(tAbout?.title) || safeStr(about.title) || 'Why Mauritius?';
  const aboutBody = safeStr(tAbout?.body) || safeStr(about.body) || '';
  const servicesTitle = safeStr(services.title) || 'Upcoming properties';
  const servicesIntro = safeStr(services.intro) || '';

  const items = Array.isArray(services.items) ? services.items : [];
  const staged = Array.isArray(s.staged_properties) ? s.staged_properties : [];
  const feedList = Array.isArray(s.feed_properties) ? s.feed_properties : [];
  const cardMediaObj =
    s.lux_published_card_media && typeof s.lux_published_card_media === 'object' && !Array.isArray(s.lux_published_card_media)
      ? s.lux_published_card_media
      : {};
  const [listFilter, setListFilter] = useState('all');
  const visibleStaged = useMemo(() => {
    if (!staged.length) return [];
    if (listFilter === 'all') return staged;
    return staged.filter((p) => p && String(p.group || '').toLowerCase() === listFilter);
  }, [staged, listFilter]);

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        background: T.pageBg,
        color: T.ink,
        minHeight: '100vh',
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
          gap: 20,
          flexWrap: 'wrap',
          padding: '20px 28px',
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {media.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media.logo_url}
              alt=""
              style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                border: `2px solid ${T.gold}`,
                background: `linear-gradient(145deg, ${T.heroDeep}, ${T.goldDeep})`,
              }}
            />
          )}
          <div>
            <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 700 }}>
              Luxurious Mauritius
            </div>
            <div style={{ fontSize: 19, fontWeight: 750, color: T.ink, letterSpacing: 0.02, fontFamily: T.fontDisplay }}>
              {safeStr(hero.title) || 'LuxeMaurice'}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: T.inkMuted }}>Language</span>
            <select
              defaultValue={lang}
              onChange={(e) => {
                try {
                  const u = new URL(window.location.href);
                  u.searchParams.set('lang', e.target.value);
                  window.location.href = u.toString();
                } catch {
                  /* ignore */
                }
              }}
              style={{
                background: T.sand,
                border: `1px solid ${T.border}`,
                borderRadius: 10,
                padding: '6px 10px',
                color: T.ink,
                fontSize: 12,
              }}
            >
              {languages.map((l) => (
                <option key={l} value={l}>
                  {String(l).toUpperCase()}
                </option>
              ))}
            </select>
          </div>
          <a
            href={safeStr(hero.cta_href) || '/concierge'}
            style={{
              display: 'inline-block',
              padding: '11px 18px',
              borderRadius: 999,
              background: T.gold,
              color: T.white,
              fontWeight: 750,
              fontSize: 13,
              textDecoration: 'none',
              boxShadow: '0 2px 12px rgba(184,149,46,0.35)',
            }}
          >
            {safeStr(hero.cta_label) || 'Private concierge'}
          </a>
        </div>
      </header>

      {operatorDebug ? (
        <div style={{ padding: '10px 28px', fontSize: 12, color: T.inkMuted, background: T.sand }}>
          Operator debug enabled — client view unchanged.
        </div>
      ) : null}

      <section
        style={{
          padding: '56px 28px 64px',
          background: `linear-gradient(165deg, ${T.heroDeep} 0%, ${T.heroMid} 42%, #7d6e5c 100%)`,
          color: '#fdfaf4',
        }}
      >
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(2rem, 4.5vw, 2.85rem)',
              lineHeight: 1.12,
              fontWeight: 700,
              fontFamily: T.fontDisplay,
              maxWidth: 720,
            }}
          >
            {headline}
          </h1>
          {tagline ? (
            <p
              style={{
                marginTop: 18,
                fontSize: 'clamp(1.05rem, 2.2vw, 1.25rem)',
                lineHeight: 1.55,
                maxWidth: 640,
                color: 'rgba(253,250,244,0.92)',
              }}
            >
              {tagline}
            </p>
          ) : null}
          <p style={{ marginTop: 16, fontSize: 15, lineHeight: 1.55, maxWidth: 620, color: 'rgba(253,250,244,0.85)' }}>
            Buy direct from the developer. Explore upcoming island residences and request a private preview with our
            concierge team.
          </p>
          <div style={{ marginTop: 32, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            <a
              href="/concierge"
              style={{
                display: 'inline-block',
                padding: '14px 22px',
                borderRadius: 999,
                background: T.gold,
                color: T.white,
                fontWeight: 800,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Private concierge
            </a>
            <a
              href="#upcoming"
              style={{
                display: 'inline-block',
                padding: '14px 22px',
                borderRadius: 999,
                border: '2px solid rgba(253,250,244,0.55)',
                color: '#fdfaf4',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Upcoming properties
            </a>
            <a
              href="#explore-more-properties"
              style={{
                display: 'inline-block',
                padding: '14px 22px',
                borderRadius: 999,
                background: 'rgba(253,250,244,0.12)',
                color: '#fdfaf4',
                fontWeight: 700,
                fontSize: 14,
                textDecoration: 'none',
              }}
            >
              Explore properties
            </a>
          </div>
        </div>
      </section>

      <div
        style={{
          padding: '20px 28px',
          textAlign: 'center',
          background: T.sand,
          borderTop: `1px solid ${T.border}`,
          borderBottom: `1px solid ${T.border}`,
          fontSize: 12,
          letterSpacing: '0.22em',
          fontWeight: 800,
          color: T.ink,
        }}
      >
        BUY DIRECT FROM THE DEVELOPER
      </div>

      <section id="upcoming" style={{ padding: '56px 28px', background: T.white }}>
        <div style={{ maxWidth: 1040, margin: '0 auto' }}>
          {staged.length ? (
            <div
              style={{
                marginBottom: 10,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: T.goldDeep,
                fontWeight: 800,
              }}
            >
              Featured · developer introductions
            </div>
          ) : null}
          <h2 style={{ margin: 0, fontSize: 26, fontFamily: T.fontDisplay, color: T.ink }}>{servicesTitle}</h2>
          {servicesIntro ? (
            <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.65, color: T.inkMuted, maxWidth: 720 }}>{servicesIntro}</p>
          ) : null}
          {staged.length ? (
            <div
              role="tablist"
              aria-label="Filter listings"
              style={{ marginTop: 22, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'north', label: 'North & plateau' },
                { id: 'villa', label: 'Villas' },
                { id: 'pipeline', label: 'Pipeline' },
              ].map((chip) => {
                const active = listFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setListFilter(chip.id)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 999,
                      border: `1px solid ${active ? T.goldDeep : T.border}`,
                      background: active ? T.sand : T.white,
                      color: active ? T.ink : T.inkMuted,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: 'pointer',
                    }}
                  >
                    {chip.label}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div
            style={{
              marginTop: 36,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 22,
            }}
          >
            {staged.length ? (
              visibleStaged.length ? (
                visibleStaged.map((p) => {
                  const href = `/concierge?intent=property&property=${encodeURIComponent(p.slug)}`;
                  const detailHref = `/property/${encodeURIComponent(p.slug)}`;
                  const refKey = safeStr(p.slug).toLowerCase();
                  const pubCard = cardMediaObj[refKey];
                  const cardSrc = pubCard && typeof pubCard.src === 'string' ? pubCard.src.trim() : '';
                  const staticHero = safeLuxSameOriginPublicImagePath(p?.images?.hero);
                  const heroPath = cardSrc || staticHero;
                  const cardAlt = pubCard && typeof pubCard.alt === 'string' ? pubCard.alt.trim() : '';
                  const imgAlt = cardAlt || safeStr(p.title) || 'Property';
                  return (
                    <article
                      key={p.slug}
                      style={{
                        borderRadius: T.radiusLg,
                        overflow: 'hidden',
                        border: `1px solid ${T.border}`,
                        background: T.pageBg,
                        boxShadow: '0 12px 40px rgba(28,25,23,0.06)',
                      }}
                    >
                      <div
                        style={{
                          height: 168,
                          background: heroPath ? T.white : T.placeholder,
                          borderBottom: `1px solid ${T.border}`,
                        }}
                      >
                        {heroPath ? (
                          <img
                            src={heroPath}
                            alt={imgAlt}
                            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>
                      <div style={{ padding: '18px 18px 22px' }}>
                        <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>
                          {safeStr(p.region)} · {safeStr(p.property_type)}
                        </div>
                        {String(p.source || '') === 'manual_curated' ? (
                          <div
                            style={{
                              marginTop: 6,
                              fontSize: 10,
                              letterSpacing: '0.08em',
                              textTransform: 'uppercase',
                              color: T.goldDeep,
                              fontWeight: 750,
                            }}
                          >
                            Manual curated
                          </div>
                        ) : null}
                        <div style={{ marginTop: 8, fontSize: 17, fontWeight: 750, color: T.ink }}>{safeStr(p.title)}</div>
                        <div style={{ marginTop: 8, fontSize: 12, fontWeight: 650, color: T.goldDeep }}>{safeStr(p.status)}</div>
                        {p.price_range != null && String(p.price_range).trim() ? (
                          <div style={{ marginTop: 8, fontSize: 14, fontWeight: 650, color: T.ink }}>{safeStr(p.price_range)}</div>
                        ) : null}
                        {p.teaser ? (
                          <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: T.inkMuted }}>{safeStr(p.teaser)}</p>
                        ) : null}
                        <a
                          href={detailHref}
                          style={{
                            display: 'inline-block',
                            marginTop: 12,
                            fontSize: 13,
                            fontWeight: 700,
                            color: T.goldDeep,
                            textDecoration: 'none',
                          }}
                        >
                          Property overview →
                        </a>
                        <a
                          href={href}
                          style={{
                            display: 'inline-block',
                            marginTop: 10,
                            padding: '10px 16px',
                            borderRadius: 999,
                            background: T.ink,
                            color: T.white,
                            fontSize: 13,
                            fontWeight: 750,
                            textDecoration: 'none',
                          }}
                        >
                          Private enquiry
                        </a>
                      </div>
                    </article>
                  );
                })
              ) : (
                <p style={{ color: T.inkMuted, fontSize: 15 }}>No listings in this group. Try another filter.</p>
              )
            ) : items.length ? (
              items.map((it, idx) => (
                <article
                  key={idx}
                  style={{
                    borderRadius: T.radiusLg,
                    overflow: 'hidden',
                    border: `1px solid ${T.border}`,
                    background: T.pageBg,
                    boxShadow: '0 12px 40px rgba(28,25,23,0.06)',
                  }}
                >
                  <div
                    style={{
                      height: 168,
                      background: T.placeholder,
                      borderBottom: `1px solid ${T.border}`,
                    }}
                  />
                  <div style={{ padding: '18px 18px 22px' }}>
                    <div style={{ fontSize: 17, fontWeight: 750, color: T.ink }}>{safeStr(it?.name) || `Development ${idx + 1}`}</div>
                    {it?.detail ? (
                      <p style={{ marginTop: 10, fontSize: 14, lineHeight: 1.55, color: T.inkMuted }}>{safeStr(it.detail)}</p>
                    ) : null}
                    <a
                      href="/concierge"
                      style={{
                        display: 'inline-block',
                        marginTop: 14,
                        fontSize: 13,
                        fontWeight: 700,
                        color: T.goldDeep,
                        textDecoration: 'none',
                      }}
                    >
                      Enquire →
                    </a>
                  </div>
                </article>
              ))
            ) : (
              <p style={{ color: T.inkMuted, fontSize: 15 }}>New releases are announced here first. Ask the concierge to join the preview list.</p>
            )}
          </div>
        </div>
      </section>

      {feedList.length ? (
        <section id="explore-more-properties" style={{ padding: '56px 28px', background: T.pageBg, borderTop: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1040, margin: '0 auto' }}>
            <div
              style={{
                marginBottom: 10,
                fontSize: 11,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: T.inkMuted,
                fontWeight: 800,
              }}
            >
              Explore · broader market
            </div>
            <h2 style={{ margin: 0, fontSize: 26, fontFamily: T.fontDisplay, color: T.ink }}>Explore more properties</h2>
            <p style={{ marginTop: 14, fontSize: 15, lineHeight: 1.65, color: T.inkMuted, maxWidth: 820 }}>
              Indicative market-style listings for orientation. Availability and pricing are confirmed privately — this
              layer will connect to your IDX or data feed when configured; today it uses a non-production preview set.
            </p>
            <div
              style={{
                marginTop: 32,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 22,
              }}
            >
              {feedList.map((p) => {
                const id = safeStr(p?.id);
                if (!id) return null;
                const href = `/concierge?intent=property&property=${encodeURIComponent(id)}`;
                const detailHref = `/property/${encodeURIComponent(id)}`;
                const resolvedFeed = resolveLuxPropertyRef(id);
                const feedRefKey = resolvedFeed ? String(resolvedFeed.ref).toLowerCase() : '';
                const pubCardFeed = feedRefKey ? cardMediaObj[feedRefKey] : null;
                const cardFeedSrc = pubCardFeed && typeof pubCardFeed.src === 'string' ? pubCardFeed.src.trim() : '';
                const cardFeedAlt =
                  (pubCardFeed && typeof pubCardFeed.alt === 'string' ? pubCardFeed.alt.trim() : '') || safeStr(p.title) || 'Property';
                return (
                  <article
                    key={id}
                    style={{
                      borderRadius: T.radiusLg,
                      overflow: 'hidden',
                      border: `1px dashed ${T.border}`,
                      background: T.white,
                      boxShadow: '0 8px 28px rgba(28,25,23,0.04)',
                    }}
                  >
                    <div
                      style={{
                        height: 120,
                        background: cardFeedSrc ? T.white : `linear-gradient(135deg, ${T.sand}, ${T.placeholder})`,
                        borderBottom: `1px solid ${T.border}`,
                      }}
                    >
                      {cardFeedSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cardFeedSrc}
                          alt={cardFeedAlt}
                          style={{ display: 'block', width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : null}
                    </div>
                    <div style={{ padding: '16px 16px 20px' }}>
                      <div style={{ fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: T.inkMuted }}>
                        Feed preview · {safeStr(p.location)}
                      </div>
                      <div style={{ marginTop: 8, fontSize: 16, fontWeight: 750, color: T.ink }}>{safeStr(p.title)}</div>
                      <div style={{ marginTop: 6, fontSize: 13, color: T.inkMuted }}>{safeStr(p.property_type)}</div>
                      {p.price_range ? (
                        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 650, color: T.ink }}>{safeStr(p.price_range)}</div>
                      ) : null}
                      {p.status ? (
                        <div style={{ marginTop: 6, fontSize: 11, fontWeight: 650, color: T.inkMuted }}>{safeStr(p.status)}</div>
                      ) : null}
                      <a
                        href={detailHref}
                        style={{
                          display: 'inline-block',
                          marginTop: 10,
                          fontSize: 12,
                          fontWeight: 700,
                          color: T.inkMuted,
                          textDecoration: 'none',
                        }}
                      >
                        Property overview →
                      </a>
                      <a
                        href={href}
                        style={{
                          display: 'inline-block',
                          marginTop: 8,
                          padding: '9px 14px',
                          borderRadius: 999,
                          border: `1px solid ${T.goldDeep}`,
                          color: T.goldDeep,
                          fontSize: 13,
                          fontWeight: 750,
                          textDecoration: 'none',
                          background: T.white,
                        }}
                      >
                        Request details
                      </a>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section style={{ padding: '56px 28px', background: T.pageBg }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 26, fontFamily: T.fontDisplay, color: T.ink }}>{aboutTitle}</h2>
          <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.75, color: T.inkMuted }}>{aboutBody}</p>
        </div>
      </section>

      <section style={{ padding: '48px 28px', background: T.sand }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 24, fontFamily: T.fontDisplay, color: T.ink }}>Advisory conversation</h2>
          <p style={{ marginTop: 14, fontSize: 16, lineHeight: 1.65, color: T.inkMuted }}>
            Already have a brief or timing in mind? Our concierge matches you to developer-backed inventory and
            market context — we respond within one business day.
          </p>
          <a
            href="/concierge"
            style={{
              display: 'inline-block',
              marginTop: 22,
              padding: '14px 26px',
              borderRadius: 999,
              background: T.ink,
              color: T.white,
              fontWeight: 750,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Private concierge enquiry
          </a>
        </div>
      </section>

      <section style={{ padding: '48px 28px', background: T.white }}>
        <div style={{ maxWidth: 920, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: T.fontDisplay, color: T.ink }}>Contact</h2>
          <div
            style={{
              marginTop: 22,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                borderRadius: T.radiusMd,
                border: `1px solid ${T.border}`,
                background: T.pageBg,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>Email</div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>
                {contact.email ? (
                  <a style={{ color: T.goldDeep }} href={`mailto:${contact.email}`}>
                    {contact.email}
                  </a>
                ) : (
                  <span style={{ color: T.ink }}>By appointment</span>
                )}
              </div>
            </div>
            <div
              style={{
                borderRadius: T.radiusMd,
                border: `1px solid ${T.border}`,
                background: T.pageBg,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>Phone</div>
              <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600 }}>
                {contact.phone ? (
                  <a style={{ color: T.goldDeep }} href={`tel:${contact.phone}`}>
                    {contact.phone}
                  </a>
                ) : (
                  <span style={{ color: T.ink }}>By appointment</span>
                )}
              </div>
            </div>
            <div
              style={{
                borderRadius: T.radiusMd,
                border: `1px solid ${T.border}`,
                background: T.pageBg,
                padding: 16,
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.inkMuted }}>Website</div>
              <div style={{ marginTop: 8, fontSize: 15 }}>
                {contact.website ? (
                  <a style={{ color: T.goldDeep, fontWeight: 650 }} href={contact.website}>
                    {contact.website}
                  </a>
                ) : (
                  <span style={{ color: T.ink }}>By appointment</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="enquire" style={{ padding: '56px 28px 72px', background: T.pageBg }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ margin: 0, fontSize: 22, fontFamily: T.fontDisplay, color: T.ink }}>Enquire</h2>
          <p style={{ marginTop: 10, fontSize: 14, color: T.inkMuted, lineHeight: 1.55 }}>
            Tell us how we can help with Mauritius property. High-net-worth enquiries only — we respond within one business day.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                const f = e.target;
                const fd = new FormData(f);
                const payload = {
                  name: String(fd.get('name') || '').trim(),
                  email: String(fd.get('email') || '').trim(),
                  intent: String(fd.get('message') || '').trim(),
                  meta: {
                    language: lang,
                    region_focus: String(fd.get('region') || '').trim(),
                    budget_usd: String(fd.get('budget') || '').trim(),
                    host: safeStr(s.host) || null,
                    page: '/',
                  },
                };
                const r = await fetch('/api/tenant/intake', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(payload),
                });
                const j = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(j.error || 'intake_failed');
                alert('Thank you. We will contact you shortly.');
                f.reset();
              } catch {
                alert('Could not submit. Please try again.');
              }
            }}
            style={{ marginTop: 20, display: 'grid', gap: 12 }}
          >
            <input
              name="name"
              placeholder="Name"
              style={{
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.white,
                color: T.ink,
                fontSize: 15,
              }}
            />
            <input
              required
              name="email"
              placeholder="Email"
              style={{
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.white,
                color: T.ink,
                fontSize: 15,
              }}
            />
            <select
              name="region"
              style={{
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.white,
                color: T.ink,
                fontSize: 15,
              }}
            >
              <option value="">Region focus (optional)</option>
              <option value="FR">France / French-speaking Europe</option>
              <option value="ZA">South Africa</option>
              <option value="EE">Eastern Europe</option>
              <option value="RU">Russia</option>
            </select>
            <select
              name="budget"
              style={{
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.white,
                color: T.ink,
                fontSize: 15,
              }}
            >
              <option value="">Budget (USD, optional)</option>
              <option value="2-3M">2–3M</option>
              <option value="3-5M">3–5M</option>
              <option value="5-10M">5–10M</option>
              <option value="10M+">10M+</option>
            </select>
            <textarea
              required
              name="message"
              placeholder="Message"
              rows={4}
              style={{
                padding: '12px 14px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.borderStrong}`,
                background: T.white,
                color: T.ink,
                fontSize: 15,
                lineHeight: 1.45,
              }}
            />
            <button
              type="submit"
              style={{
                padding: '14px 18px',
                borderRadius: T.radiusMd,
                border: 'none',
                background: T.gold,
                color: T.white,
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Submit enquiry
            </button>
          </form>
        </div>
      </section>

      <footer
        style={{
          padding: '22px 28px 36px',
          textAlign: 'center',
          fontSize: 12,
          color: T.inkMuted,
          lineHeight: 1.55,
          background: T.white,
          borderTop: `1px solid ${T.border}`,
        }}
      >
        {operatorDebug
          ? 'Operator debug: internal platform references may appear when ?debug=1 is set.'
          : 'Information on this site is indicative and subject to availability. Nothing here constitutes an offer or solicitation.'}
      </footer>
    </div>
  );
}

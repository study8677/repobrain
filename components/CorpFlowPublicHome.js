import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import PublicSiteFooter from './PublicSiteFooter.js';
import VisualAssetRenderer, { isAiGeneratedManifest } from './VisualAssetRenderer.js';
import AssetProvenanceDisclosure from './AssetProvenanceDisclosure.js';

const s = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { maxWidth: 1120, margin: '0 auto', padding: '42px 20px 56px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  brand: { fontWeight: 900, fontSize: 22 },
  sub: { color: '#9fb2c8', fontSize: 13 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h1: { margin: '16px 0 0', fontSize: 'clamp(32px, 6vw, 52px)', lineHeight: 1.05, letterSpacing: '-0.04em', maxWidth: 820 },
  lead: { marginTop: 18, fontSize: 'clamp(16px, 2vw, 20px)', lineHeight: 1.6, color: '#c9d8e8', maxWidth: 760 },
  section: { marginTop: 36 },
  h2: { margin: '8px 0 0', fontSize: 28, letterSpacing: '-0.03em' },
  muted: { color: '#aebfd1', lineHeight: 1.65 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginTop: 16 },
  card: { border: '1px solid rgba(255,255,255,0.13)', borderRadius: 22, background: 'rgba(255,255,255,0.06)', padding: 20 },
  highlight: { border: '1px solid rgba(45,212,191,0.34)', borderRadius: 22, background: 'rgba(45,212,191,0.08)', padding: 20 },
  cta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '13px 16px', fontWeight: 800, textDecoration: 'none', cursor: 'pointer' },
  primary: { background: '#2dd4bf', color: '#031018', border: 0 },
  secondary: { background: 'rgba(255,255,255,0.09)', color: '#eef6ff', border: '1px solid rgba(255,255,255,0.15)' },
  list: { margin: '12px 0 0', paddingLeft: 18, color: '#d6e4f2', lineHeight: 1.75 },
  heroVisualWrap: {
    marginTop: 28,
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.13)',
    background: 'rgba(255,255,255,0.04)',
    padding: 14,
    overflow: 'hidden',
  },
  servicesVisualWrap: {
    margin: '12px 0 18px',
    display: 'flex',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 12,
  },
  trustBandWrap: {
    marginTop: 16,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.04)',
    padding: 12,
    display: 'flex',
    justifyContent: 'center',
  },
};

function Section({ id, label, title, children }) {
  return (
    <section id={id} style={s.section}>
      {label ? <div style={s.label}>{label}</div> : null}
      {title ? <h2 style={s.h2}>{title}</h2> : null}
      {children}
    </section>
  );
}

/**
 * Render a single homepage slot from a governed manifest.
 *
 * Rules:
 * - If `manifest` is null/undefined, returns `null` (slot is empty;
 *   layout collapses gracefully).
 * - If the manifest is AI-generated, an `AssetProvenanceDisclosure`
 *   is rendered just below the asset; otherwise no disclosure.
 * - Above-fold slots (hero) opt into eager loading via `eager`.
 *
 * `wrapperStyle` lets each slot integrate visually with its
 * surrounding section without leaking layout details into the
 * renderer itself.
 */
function HomepageSlot({ manifest, slotId, eager = false, wrapperStyle, rendererStyle }) {
  if (!manifest) return null;
  return (
    <div data-slot-id={slotId} style={wrapperStyle}>
      <VisualAssetRenderer manifest={manifest} eager={eager} style={rendererStyle} />
      {isAiGeneratedManifest(manifest) ? <AssetProvenanceDisclosure manifest={manifest} /> : null}
    </div>
  );
}

/**
 * @typedef {import('../lib/visualAssets/selectHomepageAssets.js').HomepageAssetSelection} HomepageAssetSelection
 */

/**
 * @param {{ homepageAssets?: HomepageAssetSelection | null }} props
 */
export default function CorpFlowPublicHome(props) {
  const homepageAssets = (props && typeof props.homepageAssets === 'object' && props.homepageAssets) || null;
  const heroAsset = homepageAssets?.homepage_hero || null;
  const servicesGraphicAsset = homepageAssets?.homepage_services_graphic || null;
  const trustBandAsset = homepageAssets?.homepage_trust_band || null;
  const socialCardAsset = homepageAssets?.homepage_social_card || null;

  const socialCardUrl = (() => {
    if (!socialCardAsset) return null;
    const src = socialCardAsset.source;
    if (!src || typeof src !== 'object') return null;
    if (typeof src.url === 'string' && /^https:\/\//.test(src.url)) return src.url;
    return null;
  })();
  const socialCardAlt = socialCardAsset?.accessibility?.alt || '';

  return (
    <div style={s.page}>
      <Head>
        <title>CorpFlowAI · Practical AI-assisted workflow systems</title>
        <meta
          name="description"
          content="CorpFlowAI helps small businesses capture enquiries, route work, alert owners, log follow-ups, and keep daily operations visible."
        />
        {socialCardUrl ? <meta property="og:image" content={socialCardUrl} /> : null}
        {socialCardUrl ? <meta name="twitter:image" content={socialCardUrl} /> : null}
        {socialCardUrl && socialCardAlt ? <meta property="og:image:alt" content={socialCardAlt} /> : null}
        {socialCardUrl ? (
          <meta name="twitter:card" content="summary_large_image" />
        ) : null}
      </Head>
      <main style={s.shell}>
        <nav style={s.nav}>
          <div>
            <div style={s.brand}>CorpFlowAI</div>
            <div style={s.sub}>Practical workflow systems for small businesses</div>
          </div>
          <Link href="/lead-rescue" style={{ ...s.cta, ...s.primary }}>
            Start with AI Lead Rescue
          </Link>
        </nav>

        <header style={{ marginTop: 40 }}>
          <div style={s.label}>Business services</div>
          <h1 style={s.h1}>Practical AI-assisted workflow systems for small businesses.</h1>
          <p style={s.lead}>
            CorpFlowAI helps businesses capture enquiries, route work, alert owners and operators, log follow-ups, and
            keep daily operations visible — without forcing a full CRM rebuild.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
            <Link href="/lead-rescue" style={{ ...s.cta, ...s.primary }}>
              Start with AI Lead Rescue
            </Link>
            <a href="#services" style={{ ...s.cta, ...s.secondary }}>
              See services
            </a>
          </div>
          <HomepageSlot
            manifest={heroAsset}
            slotId="homepage_hero"
            eager
            wrapperStyle={s.heroVisualWrap}
            rendererStyle={{ width: '100%', maxWidth: '100%', height: 'auto', borderRadius: 14 }}
          />
        </header>

        <Section label="What we do" title="Make work visible so it gets followed up.">
          <p style={{ ...s.muted, marginTop: 12, maxWidth: 820 }}>
            We design and deploy lightweight operating workflows for businesses that receive enquiries through websites,
            forms, email, WhatsApp, and listings. Our focus is practical delivery: capture the work, alert the right
            person, log the record, and summarize what still needs attention.
          </p>
          <ul style={s.list}>
            <li>Lead capture and follow-up visibility</li>
            <li>Workflow automation for forms, sheets, alerts, and handoffs</li>
            <li>Owner and operator alerts when new work arrives</li>
            <li>Lightweight dashboards and daily summaries</li>
            <li>Production monitoring and evidence logs for deployed workflows where relevant</li>
          </ul>
        </Section>

        <Section id="services" label="Services" title="Productized setup and monitoring.">
          <HomepageSlot
            manifest={servicesGraphicAsset}
            slotId="homepage_services_graphic"
            wrapperStyle={s.servicesVisualWrap}
            rendererStyle={{ maxWidth: 64, height: 'auto' }}
          />
          <div style={s.grid}>
            <div style={s.card}>
              <h3>AI Lead Rescue</h3>
              <p style={s.muted}>
                48-hour pilot setup for lead capture, owner/operator alerts, a Google Sheet lead log, a simple follow-up
                board, and a daily summary.
              </p>
              <Link href="/lead-rescue" style={{ ...s.cta, ...s.primary, marginTop: 12 }}>
                View AI Lead Rescue
              </Link>
            </div>
            <div style={s.card}>
              <h3>Workflow Automation Setup</h3>
              <p style={s.muted}>
                Lightweight automations for forms, sheets, alerts, summaries, and operational handoffs between people and
                tools you already use.
              </p>
            </div>
            <div style={s.card}>
              <h3>Operations Visibility Dashboards</h3>
              <p style={s.muted}>
                Simple dashboards and evidence logs so owners can see what needs attention without adopting a heavy CRM.
              </p>
            </div>
            <div style={s.card}>
              <h3>Monitoring and Support</h3>
              <p style={s.muted}>
                Scheduled checks, alerts, and maintenance for deployed workflows after the initial pilot is live.
              </p>
            </div>
          </div>
        </Section>

        <Section label="Featured offer" title="AI Lead Rescue — 48-hour pilot setup">
          <div style={{ ...s.highlight, marginTop: 16 }}>
            <p style={s.muted}>
              Stop losing leads because follow-up is too slow. AI Lead Rescue captures enquiries, alerts the
              owner/operator, logs every lead, and sends a daily summary — without rebuilding your website or forcing you
              into a CRM.
            </p>
            <ul style={s.list}>
              <li>Pilot from $150 / MUR 6,900 after intake review</li>
              <li>Payment handled after scope confirmation — no card or banking details on this website</li>
              <li>Mauritius businesses: local invoice and MUR route</li>
              <li>International businesses: USD route through PayPal, Wise, or Google Pay where available</li>
            </ul>
            <p style={{ ...s.muted, fontSize: 13 }}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed
              up.
            </p>
            <Link href="/lead-rescue" style={{ ...s.cta, ...s.primary, marginTop: 12 }}>
              Start my 48-hour setup
            </Link>
          </div>
        </Section>

        <Section label="How engagement works" title="Simple intake-first process.">
          <ol style={s.list}>
            <li>Submit intake through our public form</li>
            <li>We review fit and scope</li>
            <li>We confirm setup path and payment route</li>
            <li>We build the first workflow</li>
            <li>We verify and monitor the pilot</li>
          </ol>
        </Section>

        <Section label="Pricing" title="Starting points — final scope confirmed after intake.">
          <ul style={s.list}>
            <li>AI Lead Rescue pilot from $150 / MUR 6,900</li>
            <li>Final scope and payment route confirmed after intake review</li>
            <li>Mauritius businesses use local invoice / MUR pricing where applicable</li>
            <li>International businesses use USD pricing through PayPal, Wise, or Google Pay where available</li>
            <li>We do not collect card or banking details on this website</li>
          </ul>
        </Section>

        <Section label="Trust" title="Built for real operators, not hype.">
          <ul style={s.list}>
            <li>We do not guarantee new revenue.</li>
            <li>We help make existing enquiries and follow-ups visible.</li>
            <li>We do not replace your website, CRM, WhatsApp, or sales process.</li>
            <li>We start with lightweight pilots before larger systems.</li>
          </ul>
          <HomepageSlot
            manifest={trustBandAsset}
            slotId="homepage_trust_band"
            wrapperStyle={s.trustBandWrap}
            rendererStyle={{ maxWidth: '100%', height: 'auto' }}
          />
        </Section>

        <Section id="contact" label="Contact" title="Get in touch">
          <p style={s.muted}>
            The fastest way to reach us is the intake form on{' '}
            <Link href="/lead-rescue" style={{ color: '#7dd3fc' }}>
              /lead-rescue
            </Link>
            . Tell us where your enquiries arrive and what follow-up problem you want fixed first.
          </p>
          <p style={s.muted}>
            For general questions, use the <Link href="/contact">contact page</Link>. Official business contact details
            and contracting entity will be confirmed on the invoice or service agreement.
          </p>
        </Section>

        <PublicSiteFooter extra="CorpFlowAI provides AI-assisted workflow setup and monitoring services for small businesses." />
      </main>
    </div>
  );
}

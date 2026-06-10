import React from 'react';
import Head from 'next/head';

import { trackEvent } from '../lib/analytics/index.js';
import PublicSiteFooter from './PublicSiteFooter.js';

/**
 * AI Lead Rescue — Mauritius property landing page.
 *
 * Niche-specific landing page for Mauritius property operators (real
 * estate agencies, villa rental operators, property managers, serviced
 * apartments / short-term rentals). The pan-vertical AI Lead Rescue
 * page at `/lead-rescue` is unchanged.
 *
 * Visual treatment:
 *  - Light editorial luxury palette (warm cream background, deep teal
 *    accent, charcoal text). The brand identity v1 ratifies `#2dd4bf`
 *    as the canonical accent on apex CorpFlowAI surfaces, but the
 *    user explicitly directed a property-aware aesthetic referenced
 *    against Beach Properties Mauritius and Expat Immobilier — i.e.
 *    "restrained luxury, not hype". Deep teal `#0F4C4C` is used on
 *    this surface only; `/lead-rescue` keeps the canonical `#2dd4bf`.
 *  - Inter Variable (self-hosted at `/assets/fonts/InterVariable.woff2`,
 *    declared in `pages/_document.js`) at editorial weights:
 *    200–300 for display, 400 for body, 600–700 for CTAs / labels.
 *  - Three hand-authored editorial SVG marks live in
 *    `/public/assets/visuals/lead-rescue-property-*.svg`:
 *      · `…hero.svg`     — hero-side editorial composition (horizon
 *                          + coastline contours + brushed-brass margin
 *                          + small north arrow + tracked caption
 *                          "Mauritius North & West"). No real
 *                          property, agency, or person depicted.
 *      · `…workflow.svg` — abstract 5-node workflow ribbon
 *                          (channels → log → alert → board → summary).
 *      · `…region.svg`   — abstract region mark used at low
 *                          opacity as a decorative watermark.
 *                          Hand-drawn, intentionally not a traced map.
 *    All three are CorpFlowAI-owned (no third-party IP), pure SVG
 *    (no photographs, no logos), each well under 4 KB. Decorative
 *    role only; alt text on the wrapping `<img>` describes the
 *    composition for screen readers.
 *  - The "what you see every morning" cockpit panel remains rendered
 *    as HTML/CSS with explicit "illustrative example" labelling and
 *    fake property leads (`EXAMPLE: …`).
 *
 * CTA wiring (no new env vars, no new schema):
 *  - The intake form posts to the existing `/api/tenant/intake`
 *    handler in `lib/server/tenant-intake.js` with
 *    `meta.product = 'ai-lead-rescue'` (exact match for the AI Lead
 *    Rescue notification path), `meta.lead_rescue_variant =
 *    'property-mauritius'`, and `meta.page =
 *    '/lead-rescue/property-mauritius'`. The handler stores meta in
 *    `qualificationJson.intake_meta`, so the variant is visible on
 *    `/admin/lead-rescue/[id]`. The operator alert path is unchanged.
 *
 * Doctrine compliance:
 *  - Single offer rule preserved (USD 150 launch pilot, invoiced after
 *    intake review; no card on the page).
 *  - Required no-guarantee copy is present verbatim:
 *    "We do not guarantee new revenue. We help make sure existing
 *    enquiries are captured, visible, and followed up."
 *  - Required payment trust copy is present.
 *  - The user-required line "We do not replace WhatsApp Business."
 *    is present verbatim in the hero subhead block.
 *  - CTA describes the buyer action ("Request the Mauritius property
 *    pilot outline") — no route-as-CTA wording.
 */

const palette = {
  cream: '#FAF6F0',
  warmSand: '#F1E8D8',
  paper: '#FFFFFF',
  ink: '#1A1A1A',
  muted: '#5A5A5A',
  faint: '#8A8A8A',
  hairline: 'rgba(15, 76, 76, 0.14)',
  hairlineSoft: 'rgba(26, 26, 26, 0.08)',
  teal: '#0F4C4C',
  tealSoft: 'rgba(15, 76, 76, 0.08)',
  brass: '#9C7A3D',
};

const styles = {
  page: {
    minHeight: '100vh',
    background: palette.cream,
    color: palette.ink,
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontFeatureSettings: '"ss01", "cv11"',
  },
  shell: { maxWidth: 1080, margin: '0 auto', padding: '32px 24px 80px' },
  nav: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 16, flexWrap: 'wrap', paddingBottom: 24,
    borderBottom: `1px solid ${palette.hairlineSoft}`,
  },
  brandMark: { fontWeight: 600, fontSize: 18, letterSpacing: '0.01em', color: palette.ink },
  brandSub: { color: palette.faint, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 2 },
  navLink: {
    color: palette.ink, fontSize: 13, textDecoration: 'none',
    borderBottom: `1px solid ${palette.hairline}`, paddingBottom: 2,
  },
  hero: { paddingTop: 72, paddingBottom: 48 },
  heroLayout: {
    display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(0, 1fr)',
    gap: 56, alignItems: 'start',
  },
  heroBody: { maxWidth: 720, minWidth: 0 },
  heroVisualWrap: {
    position: 'relative', width: '100%',
    border: `1px solid ${palette.hairlineSoft}`,
    background: palette.cream, borderRadius: 6, overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(15, 76, 76, 0.04), 0 14px 40px rgba(15, 76, 76, 0.05)',
  },
  heroVisual: { width: '100%', height: 'auto', display: 'block' },
  eyebrow: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.teal, fontWeight: 700, marginBottom: 28,
  },
  h1: {
    margin: 0,
    fontSize: 'clamp(40px, 6vw, 64px)',
    lineHeight: 1.04,
    letterSpacing: '-0.025em',
    fontWeight: 300,
    color: palette.ink,
  },
  h1Accent: { color: palette.teal, fontWeight: 400, fontStyle: 'italic' },
  lead: {
    marginTop: 24, fontSize: 'clamp(17px, 1.6vw, 20px)',
    lineHeight: 1.55, color: palette.muted, maxWidth: 720, fontWeight: 400,
  },
  trustLine: {
    marginTop: 28, paddingLeft: 18,
    borderLeft: `2px solid ${palette.teal}`,
    fontSize: 16, color: palette.ink, lineHeight: 1.55, maxWidth: 640, fontWeight: 500,
  },
  ctaRow: { display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 36 },
  ctaPrimary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: palette.teal, color: palette.cream, fontWeight: 600, fontSize: 15,
    padding: '14px 22px', borderRadius: 4, border: 0, cursor: 'pointer',
    textDecoration: 'none', letterSpacing: '0.01em',
    transition: 'background 220ms ease, transform 220ms ease, box-shadow 220ms ease',
  },
  ctaSecondary: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: 'transparent', color: palette.ink, fontWeight: 500, fontSize: 15,
    padding: '13px 20px', borderRadius: 4, border: `1px solid ${palette.hairline}`,
    cursor: 'pointer', textDecoration: 'none', letterSpacing: '0.01em',
    transition: 'border-color 220ms ease, background 220ms ease',
  },
  section: { paddingTop: 64, paddingBottom: 8 },
  sectionLabel: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.teal, fontWeight: 700, marginBottom: 12,
  },
  h2: {
    margin: 0, fontSize: 'clamp(28px, 3.4vw, 38px)',
    lineHeight: 1.15, letterSpacing: '-0.02em', fontWeight: 300,
    maxWidth: 720, color: palette.ink,
  },
  body: { marginTop: 18, color: palette.muted, lineHeight: 1.65, fontSize: 16, maxWidth: 680 },
  divider: { height: 1, background: palette.hairlineSoft, margin: '64px 0 0' },
  workflowVisualWrap: {
    marginTop: 28, padding: '8px 12px',
    border: `1px solid ${palette.hairlineSoft}`,
    background: palette.paper, borderRadius: 4, overflow: 'hidden',
  },
  workflowVisual: { width: '100%', height: 'auto', display: 'block' },
  workflowBand: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 12, marginTop: 16,
  },
  workflowStep: {
    background: palette.paper, border: `1px solid ${palette.hairlineSoft}`,
    padding: '20px 18px', borderRadius: 4, position: 'relative',
  },
  workflowStepIndex: {
    fontSize: 11, letterSpacing: '0.22em', color: palette.teal,
    fontWeight: 700, marginBottom: 8,
  },
  workflowStepTitle: { fontSize: 16, color: palette.ink, fontWeight: 600, marginBottom: 6 },
  workflowStepBody: { color: palette.muted, fontSize: 13, lineHeight: 1.55 },
  cockpit: {
    marginTop: 28, background: palette.paper,
    border: `1px solid ${palette.hairlineSoft}`, borderRadius: 6, overflow: 'hidden',
    boxShadow: '0 1px 0 rgba(15, 76, 76, 0.04), 0 14px 40px rgba(15, 76, 76, 0.06)',
  },
  cockpitHeader: {
    padding: '18px 24px', borderBottom: `1px solid ${palette.hairlineSoft}`,
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 12, flexWrap: 'wrap', background: palette.warmSand,
  },
  cockpitTitleStack: { display: 'flex', flexDirection: 'column', gap: 2 },
  cockpitTitle: { fontSize: 13, color: palette.ink, fontWeight: 600, letterSpacing: '0.01em' },
  cockpitSubtitle: { fontSize: 12, color: palette.faint },
  cockpitTag: {
    fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase',
    background: 'rgba(156, 122, 61, 0.14)', color: palette.brass,
    padding: '4px 8px', borderRadius: 3, fontWeight: 700,
  },
  cockpitMetricsRow: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
    gap: 1, background: palette.hairlineSoft,
  },
  cockpitMetric: { background: palette.paper, padding: '18px 22px' },
  cockpitMetricLabel: {
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: palette.faint, fontWeight: 600,
  },
  cockpitMetricValue: { fontSize: 28, color: palette.ink, fontWeight: 300, marginTop: 6, letterSpacing: '-0.02em' },
  cockpitTableHead: {
    padding: '14px 22px', borderTop: `1px solid ${palette.hairlineSoft}`,
    borderBottom: `1px solid ${palette.hairlineSoft}`,
    display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.6fr',
    gap: 12, fontSize: 11, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: palette.faint, fontWeight: 600,
  },
  cockpitRow: {
    padding: '16px 22px', borderBottom: `1px solid ${palette.hairlineSoft}`,
    display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.8fr 0.6fr',
    gap: 12, alignItems: 'center', fontSize: 14,
  },
  cockpitName: { color: palette.ink, fontWeight: 500 },
  cockpitMeta: { color: palette.muted, fontSize: 13 },
  badge: {
    fontSize: 11, letterSpacing: '0.06em', padding: '3px 8px',
    borderRadius: 3, fontWeight: 600, display: 'inline-block',
  },
  badgeNew: { background: 'rgba(15, 76, 76, 0.10)', color: palette.teal },
  badgeReplied: { background: 'rgba(156, 122, 61, 0.16)', color: palette.brass },
  badgeFollowup: { background: 'rgba(26, 26, 26, 0.07)', color: palette.ink },
  badgeBooked: { background: 'rgba(15, 76, 76, 0.18)', color: palette.teal },
  cockpitFootnote: {
    padding: '14px 22px', fontSize: 12, color: palette.faint,
    background: palette.warmSand, borderTop: `1px solid ${palette.hairlineSoft}`,
  },
  segmentsHeader: { position: 'relative' },
  regionMotifWrap: {
    position: 'absolute', top: -28, right: -16,
    width: 188, height: 232, opacity: 0.45,
    pointerEvents: 'none',
  },
  regionMotif: { width: '100%', height: '100%', display: 'block' },
  segments: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16, marginTop: 36,
  },
  segmentCard: {
    background: palette.paper, border: `1px solid ${palette.hairlineSoft}`,
    padding: '24px 22px', borderRadius: 4,
  },
  segmentLabel: {
    fontSize: 10, letterSpacing: '0.22em', color: palette.teal,
    textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
  },
  segmentTitle: { fontSize: 18, color: palette.ink, fontWeight: 600, marginBottom: 8 },
  segmentBody: { color: palette.muted, fontSize: 14, lineHeight: 1.6 },
  multilingualCard: {
    marginTop: 28, padding: '22px 24px',
    background: palette.warmSand, border: `1px solid ${palette.hairlineSoft}`,
    borderRadius: 4,
  },
  multilingualHeading: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.teal, fontWeight: 700, marginBottom: 8,
  },
  multilingualBody: { fontSize: 15, color: palette.ink, lineHeight: 1.6, fontWeight: 400 },
  trustList: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 0, marginTop: 28,
    border: `1px solid ${palette.hairlineSoft}`, background: palette.hairlineSoft,
  },
  trustItem: { background: palette.paper, padding: '20px 22px' },
  trustItemTitle: { fontSize: 14, color: palette.ink, fontWeight: 600, marginBottom: 6 },
  trustItemBody: { fontSize: 13, color: palette.muted, lineHeight: 1.55 },
  pricingCard: {
    marginTop: 28, padding: '28px 30px', background: palette.paper,
    border: `1px solid ${palette.hairlineSoft}`, borderRadius: 4,
    display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start',
  },
  pricingNumber: {
    fontSize: 40, color: palette.ink, fontWeight: 300,
    letterSpacing: '-0.025em', lineHeight: 1, whiteSpace: 'nowrap',
  },
  pricingLabel: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.faint, fontWeight: 600, marginTop: 8,
  },
  pricingBody: { color: palette.muted, fontSize: 15, lineHeight: 1.6 },
  intakeCard: {
    marginTop: 36, padding: '32px 32px 28px',
    background: palette.paper, border: `1px solid ${palette.hairlineSoft}`,
    borderRadius: 6, maxWidth: 640,
  },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginTop: 22 },
  input: {
    width: '100%', boxSizing: 'border-box', padding: '12px 14px',
    border: `1px solid ${palette.hairlineSoft}`, background: palette.cream,
    color: palette.ink, fontFamily: 'inherit', fontSize: 14, borderRadius: 3,
  },
  formNote: { fontSize: 12, color: palette.faint, lineHeight: 1.5, marginTop: 14 },
  noGuarantee: {
    marginTop: 12, padding: '14px 18px', background: palette.warmSand,
    borderLeft: `2px solid ${palette.teal}`, fontSize: 13, color: palette.ink,
    lineHeight: 1.55, maxWidth: 620,
  },
  footerWrap: { marginTop: 56, paddingTop: 28, borderTop: `1px solid ${palette.hairlineSoft}`, color: palette.muted },
};

const workflowSteps = [
  {
    index: '01',
    title: 'Channel intake',
    body: 'WhatsApp, Facebook, website forms, listing portals, and missed calls — every enquiry route you already use.',
  },
  {
    index: '02',
    title: 'Lead log',
    body: 'A single, time-stamped record per enquiry. No duplicate, no lost message, no "did anyone reply?".',
  },
  {
    index: '03',
    title: 'Owner / operator alert',
    body: 'The right person is told the moment a new enquiry lands — no waiting for the next inbox check.',
  },
  {
    index: '04',
    title: 'Follow-up board',
    body: 'Open enquiries, replies sent, viewings scheduled, and stale leads — all visible without chasing colleagues.',
  },
  {
    index: '05',
    title: 'Daily summary',
    body: 'A short morning view: new enquiries, follow-ups due, and what slipped past 48 hours without a reply.',
  },
];

const cockpitMetrics = [
  { label: 'New today', value: '4' },
  { label: 'Awaiting reply', value: '2' },
  { label: 'Viewings booked', value: '1' },
  { label: 'Stale > 48h', value: '0' },
];

const cockpitRows = [
  {
    name: 'EXAMPLE: 4-bed villa enquiry — Tamarin',
    meta: 'WhatsApp · Buyer · EUR budget',
    when: '08:42 today',
    badgeStyle: 'badgeNew',
    badgeText: 'New',
  },
  {
    name: 'EXAMPLE: Long-let inquiry — Grand Baie',
    meta: 'Website form · Tenant · 12 mo',
    when: 'Yesterday',
    badgeStyle: 'badgeReplied',
    badgeText: 'Replied',
  },
  {
    name: 'EXAMPLE: Site visit request — Black River',
    meta: 'Facebook DM · Buyer · weekend',
    when: 'Yesterday',
    badgeStyle: 'badgeBooked',
    badgeText: 'Viewing',
  },
  {
    name: 'EXAMPLE: Serviced apt — 6-night stay — Flic en Flac',
    meta: 'Listing portal · Guest · Aug',
    when: '2 days ago',
    badgeStyle: 'badgeFollowup',
    badgeText: 'Follow-up',
  },
];

const segments = [
  {
    label: 'Real estate agencies',
    title: 'Agency front desk + agent inboxes, one workflow.',
    body: 'Buyer enquiries, viewing requests, and listing portal leads logged once and routed to the right agent — without changing how your agents already use WhatsApp and email.',
  },
  {
    label: 'Villa rental operators',
    title: 'Every enquiry on a property is captured, even on weekends.',
    body: 'Direct enquiries from the website, Facebook, and listing portals are logged with the property reference and the requested dates, so nothing is forgotten between Monday morning and a quiet Saturday.',
  },
  {
    label: 'Property managers',
    title: 'Owner alerts, tenant follow-ups, and contractor requests in one log.',
    body: 'Routine enquiries (move-in, move-out, maintenance) and one-off owner conversations get a record so handovers between staff or seasons do not lose context.',
  },
  {
    label: 'Serviced apartments / short-term rentals',
    title: 'Booking enquiries from multiple channels, captured before they cool.',
    body: 'WhatsApp, listing portal messages, and direct site enquiries are alerted and logged together so a guest who messages on three platforms does not get three uncoordinated answers.',
  },
];

const trustBoundaries = [
  {
    title: 'No revenue guarantees',
    body: 'We do not promise more leads. We help make sure existing enquiries are captured, visible, and followed up.',
  },
  {
    title: 'No CRM rebuild',
    body: 'Your sales process, agent allocation, and existing tools stay as they are. We do not migrate you onto a new CRM.',
  },
  {
    title: 'No replacement of WhatsApp, website, or sales process',
    body: 'WhatsApp Business, your website, your listing portal accounts, and your agent workflow are unchanged. We sit alongside them.',
  },
  {
    title: 'No transaction handling',
    body: 'We do not collect payments, hold deposits, or sign agreements on your behalf. The lead workflow ends at "ready to talk".',
  },
  {
    title: 'No tenant or buyer PII beyond the lead log',
    body: 'We capture the contact information you would already write down: name, channel, basic enquiry detail, follow-up status. No identity documents, no banking detail, no tenancy history.',
  },
];

export default function AiLeadRescuePropertyMauritiusLanding({ host = '' }) {
  async function submitLead(e) {
    e.preventDefault();
    trackEvent('lr_property_intake_submit_attempt');
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        lead_rescue_variant: 'property-mauritius',
        business_name: String(fd.get('business_name') || '').trim(),
        property_segment: String(fd.get('property_segment') || '').trim(),
        lead_sources: String(fd.get('lead_sources') || '').trim(),
        host,
        page: '/lead-rescue/property-mauritius',
      },
    };
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('intake_failed');
      trackEvent('lr_property_intake_submit_success');
      alert('Thank you. We will send the Mauritius property pilot outline to your email within 2 business hours.');
      form.reset();
    } catch {
      alert('Could not submit the request. Please contact us at support@corpflowai.com or try again shortly.');
    }
  }

  return (
    <div style={styles.page}>
      <Head>
        <title>AI Lead Rescue for Mauritius property operators · CorpFlowAI</title>
        <meta
          name="description"
          content="A 48-hour pilot for Mauritius property operators that captures, alerts, and tracks enquiries from WhatsApp, Facebook, website forms, listing portals, and calls — without replacing WhatsApp Business or your CRM."
        />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://corpflowai.com/lead-rescue/property-mauritius" />
      </Head>

      <main style={styles.shell}>
        <nav style={styles.nav} aria-label="Primary">
          <div>
            <div style={styles.brandMark}>AI Lead Rescue</div>
            <div style={styles.brandSub}>Mauritius property edition</div>
          </div>
          <a
            href="#pilot-outline"
            style={styles.navLink}
            onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'nav' } })}
          >
            Request the pilot outline
          </a>
        </nav>

        <section style={styles.hero}>
          <div style={styles.heroLayout} className="lr-property-hero-layout">
            <div style={styles.heroBody}>
              <div style={styles.eyebrow}>Mauritius property operations</div>
              <h1 style={styles.h1}>
                Property enquiries do not get lost on purpose. <span style={styles.h1Accent}>They get lost between channels.</span>
              </h1>
              <p style={styles.lead}>
                Buyers and tenants reach you on WhatsApp, Facebook, your website form, listing portals, and calls — sometimes the same person on three of them in one weekend. The enquiry that does not get a reply within a day is the one that quietly walks to another agency.
              </p>
              <p style={styles.trustLine}>
                We do not replace WhatsApp Business. We make sure the enquiries inside it are logged, visible, and followed up.
              </p>
              <div style={styles.ctaRow}>
                <a
                  href="#pilot-outline"
                  style={styles.ctaPrimary}
                  className="lr-property-cta-primary"
                  onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'hero' } })}
                >
                  Request the Mauritius property pilot outline
                </a>
                <a
                  href="#how-it-works"
                  style={styles.ctaSecondary}
                  className="lr-property-cta-secondary"
                  onClick={() => trackEvent('lr_property_secondary_cta_click', { props: { location: 'hero' } })}
                >
                  See how it works
                </a>
              </div>
            </div>
            <aside style={styles.heroVisualWrap} className="lr-property-hero-aside" aria-hidden="false">
              <img
                src="/assets/visuals/lead-rescue-property-hero.svg"
                alt="Editorial composition with three thin teal horizon lines, a soft coastline curve echoed by two faint topographic contours, a brushed-brass margin rule with two small register dots, a small north arrow, and a tracked-out caption reading Mauritius North and West."
                width="600"
                height="750"
                style={styles.heroVisual}
                loading="eager"
                decoding="async"
              />
            </aside>
          </div>
        </section>

        <div style={styles.divider} />

        <section id="how-it-works" style={styles.section}>
          <div style={styles.sectionLabel}>The workflow</div>
          <h2 style={styles.h2}>From channel to follow-up, on one accountable surface.</h2>
          <p style={styles.body}>
            Five steps, all visible. WhatsApp, Facebook, the website form, listing portals, and calls flow into one lead log. The owner or operator is alerted. A follow-up board shows what has been replied to, what is awaiting a response, and what has gone cold. A short daily summary keeps everyone honest about the leads that quietly slipped past forty-eight hours.
          </p>
          <div style={styles.workflowVisualWrap} className="lr-property-workflow-visual-wrap">
            <img
              src="/assets/visuals/lead-rescue-property-workflow.svg"
              alt="Abstract horizontal flow with five thin nodes connected on a single hairline. Left to right: a cluster of small dots labelled CHANNELS for WhatsApp, Facebook, site, listing, and calls; a small rectangle labelled LEAD LOG; a chevron labelled ALERT for the owner or operator; a small grid labelled FOLLOW-UP for replied, awaiting, and stale; a stack of three lines labelled SUMMARY for the morning view."
              width="1200"
              height="200"
              style={styles.workflowVisual}
              loading="lazy"
              decoding="async"
            />
          </div>
          <div style={styles.workflowBand}>
            {workflowSteps.map((step) => (
              <div key={step.index} style={styles.workflowStep}>
                <div style={styles.workflowStepIndex}>{step.index}</div>
                <div style={styles.workflowStepTitle}>{step.title}</div>
                <div style={styles.workflowStepBody}>{step.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section} aria-labelledby="cockpit-heading">
          <div style={styles.sectionLabel}>What you see every morning</div>
          <h2 id="cockpit-heading" style={styles.h2}>A calm operator view, not another dashboard to manage.</h2>
          <p style={styles.body}>
            The view below is an illustrative example. Your actual operator view shows the enquiries from your channels, with the same restraint: new leads first, follow-ups due next, and the few that have slipped past two days flagged so they do not stay forgotten.
          </p>
          <div style={styles.cockpit} role="figure" aria-label="Illustrative example of the property operator view, showing fake demonstration leads only">
            <div style={styles.cockpitHeader}>
              <div style={styles.cockpitTitleStack}>
                <div style={styles.cockpitTitle}>Daily summary · 09:00</div>
                <div style={styles.cockpitSubtitle}>Property operator view</div>
              </div>
              <span style={styles.cockpitTag}>Illustrative example</span>
            </div>
            <div style={styles.cockpitMetricsRow}>
              {cockpitMetrics.map((m) => (
                <div key={m.label} style={styles.cockpitMetric}>
                  <div style={styles.cockpitMetricLabel}>{m.label}</div>
                  <div style={styles.cockpitMetricValue}>{m.value}</div>
                </div>
              ))}
            </div>
            <div style={styles.cockpitTableHead} className="lr-property-cockpit-thead">
              <div>Enquiry</div>
              <div>Source</div>
              <div>When</div>
              <div>Status</div>
            </div>
            {cockpitRows.map((row) => (
              <div key={row.name} style={styles.cockpitRow} className="lr-property-cockpit-row">
                <div style={styles.cockpitName}>{row.name}</div>
                <div style={styles.cockpitMeta}>{row.meta}</div>
                <div style={styles.cockpitMeta}>{row.when}</div>
                <div>
                  <span style={{ ...styles.badge, ...styles[row.badgeStyle] }}>{row.badgeText}</span>
                </div>
              </div>
            ))}
            <div style={styles.cockpitFootnote}>
              Demonstration data. No real prospects, properties, or contacts are shown. Names prefixed <code>EXAMPLE:</code> are fabricated for illustration.
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.segmentsHeader}>
            <div style={styles.regionMotifWrap} className="lr-property-region-motif-wrap" aria-hidden="true">
              <img
                src="/assets/visuals/lead-rescue-property-region.svg"
                alt=""
                width="400"
                height="500"
                style={styles.regionMotif}
                loading="lazy"
                decoding="async"
              />
            </div>
            <div style={styles.sectionLabel}>Who this is for</div>
            <h2 style={styles.h2}>Property operators who already get the enquiries — they just need the workflow that keeps them.</h2>
          </div>
          <div style={styles.segments}>
            {segments.map((seg) => (
              <article key={seg.label} style={styles.segmentCard} className="lr-property-segment">
                <div style={styles.segmentLabel}>{seg.label}</div>
                <div style={styles.segmentTitle}>{seg.title}</div>
                <div style={styles.segmentBody}>{seg.body}</div>
              </article>
            ))}
          </div>
          <div style={styles.multilingualCard}>
            <div style={styles.multilingualHeading}>Language</div>
            <div style={styles.multilingualBody}>
              Calls are easiest in English, but the written workflow can support French lead summaries and French enquiry handling where required. Customer-facing replies are reviewed before sending.
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>What this is not</div>
          <h2 style={styles.h2}>Honest limits — so you know exactly what you are buying.</h2>
          <div style={styles.trustList}>
            {trustBoundaries.map((item) => (
              <div key={item.title} style={styles.trustItem}>
                <div style={styles.trustItemTitle}>{item.title}</div>
                <div style={styles.trustItemBody}>{item.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>Pricing &amp; path</div>
          <h2 style={styles.h2}>One offer. One price. No buyer payment decision on this page.</h2>
          <div style={styles.pricingCard}>
            <div>
              <div style={styles.pricingNumber}>USD 150</div>
              <div style={styles.pricingLabel}>Launch pilot · 48-hour setup</div>
            </div>
            <div style={styles.pricingBody}>
              You request the pilot outline below. We review your intake within two business hours, confirm the first lead source we should connect, and email a USD invoice through the agreed route. Payment is handled after intake review. You do not enter card or banking details on this page. Once payment lands, the 48-hour clock starts and we run the pilot for seven monitored days.
            </div>
          </div>
        </section>

        <section id="pilot-outline" style={styles.section}>
          <div style={styles.sectionLabel}>Final step</div>
          <h2 style={styles.h2}>Request the Mauritius property pilot outline.</h2>
          <p style={styles.body}>
            Tell us your business, the property segment you operate in, and where your enquiries arrive today. We send the pilot outline within two business hours.
          </p>
          <div style={styles.intakeCard}>
            <form onSubmit={submitLead} style={styles.formGrid} aria-label="Mauritius property pilot outline request">
              <input required name="business_name" placeholder="Business name" style={styles.input} autoComplete="organization" />
              <select required name="property_segment" defaultValue="" style={styles.input} aria-label="Property segment">
                <option value="" disabled>Property segment</option>
                <option value="real_estate_agency">Real estate agency</option>
                <option value="villa_rental">Villa rental operator</option>
                <option value="property_manager">Property manager</option>
                <option value="serviced_apartment_str">Serviced apartments / short-term rentals</option>
                <option value="other_property">Other property</option>
              </select>
              <input required name="name" placeholder="Your name" style={styles.input} autoComplete="name" />
              <input required type="email" name="email" placeholder="Email" style={styles.input} autoComplete="email" />
              <input name="phone" placeholder="Phone or WhatsApp (optional)" style={styles.input} autoComplete="tel" />
              <input name="lead_sources" placeholder="Where do enquiries arrive today? (e.g. WhatsApp, website, Facebook, listing portal, calls)" style={styles.input} />
              <textarea required name="message" rows="3" placeholder="What follow-up problem should we fix first?" style={styles.input} />
              <button type="submit" style={styles.ctaPrimary} className="lr-property-cta-primary" onClick={() => trackEvent('lr_property_primary_cta_click', { props: { location: 'final' } })}>
                Request the Mauritius property pilot outline
              </button>
            </form>
            <p style={styles.formNote}>
              Payment links and invoice details are issued after intake review. Do not enter card or banking details on this page. We only store what is needed to run the lead log: business name, contact name, channel, and basic enquiry detail.
            </p>
            <p style={styles.noGuarantee}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </div>
        </section>

        <div style={styles.footerWrap}>
          <PublicSiteFooter extra="AI Lead Rescue Mauritius property edition is powered by CorpFlowAI. The USD 150 launch pilot is invoiced after intake review; this page collects intake only and does not collect card or banking details. Calls in English; written workflow supports French summaries and French enquiry handling on request, with reviewed replies." />
        </div>
      </main>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .lr-property-cta-primary {
            transition: background 220ms ease, transform 220ms ease, box-shadow 220ms ease;
          }
          .lr-property-cta-primary:hover {
            background: #1A1A1A;
            transform: translateY(-1px);
            box-shadow: 0 12px 32px rgba(15, 76, 76, 0.18);
          }
          .lr-property-cta-secondary {
            transition: border-color 220ms ease, background 220ms ease;
          }
          .lr-property-cta-secondary:hover {
            border-color: rgba(15, 76, 76, 0.5);
            background: rgba(15, 76, 76, 0.04);
          }
          .lr-property-segment {
            transition: border-color 280ms ease, transform 280ms ease, box-shadow 280ms ease;
          }
          .lr-property-segment:hover {
            transform: translateY(-1px);
            border-color: rgba(15, 76, 76, 0.32);
            box-shadow: 0 14px 36px rgba(15, 76, 76, 0.08);
          }
        }
        .lr-property-cockpit-row:last-child {
          border-bottom: 0;
        }
        @media (prefers-reduced-motion: no-preference) {
          .lr-property-hero-aside img {
            animation: lrPropHeroSettle 1400ms ease-out 120ms both;
          }
          @keyframes lrPropHeroSettle {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .lr-property-workflow-visual-wrap img,
          .lr-property-region-motif-wrap img {
            animation: lrPropFadeIn 1100ms ease-out 220ms both;
          }
          @keyframes lrPropFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }
        @media (max-width: 900px) {
          .lr-property-hero-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 32px !important;
          }
          .lr-property-hero-aside {
            order: -1;
            max-width: 360px;
            margin-bottom: 8px;
          }
        }
        @media (max-width: 560px) {
          .lr-property-hero-aside {
            display: none !important;
          }
          .lr-property-region-motif-wrap {
            display: none !important;
          }
        }
        @media (max-width: 720px) {
          .lr-property-cockpit-thead {
            display: none !important;
          }
          .lr-property-cockpit-row {
            grid-template-columns: 1fr 0.6fr !important;
            row-gap: 4px;
          }
          .lr-property-cockpit-row > div:nth-child(2),
          .lr-property-cockpit-row > div:nth-child(3) {
            grid-column: 1 / -1;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

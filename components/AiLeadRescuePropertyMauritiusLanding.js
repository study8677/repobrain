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
 *  - Visuals shipped from `/public/assets/visuals/`:
 *      · `lead-rescue-property-hero-{640,1024,1600}.webp` and
 *        `lead-rescue-property-hero-1024.jpg` — an editorial aerial
 *        photograph of the Mauritius West coast (turquoise lagoon
 *        meeting volcanic mountains, no people, no identifiable
 *        property, no boats, no logos). The image was generated
 *        with explicit restraint guardrails by the Cursor
 *        image-generation tool and optimised by
 *        `scripts/optimize-property-hero.mjs` (Sharp). The hero
 *        aside no longer carries the white-card framing that user
 *        feedback flagged as restraining the photograph; the image
 *        now sits on its own with a soft drop-shadow and a small
 *        editorial "Mauritius · West coast" eyebrow chip in its
 *        bottom-left corner.
 *      · `lead-rescue-property-map-{640,1024,1600}.webp` and
 *        `lead-rescue-property-map-1024.jpg` — a real, public-domain
 *        NASA satellite image of the island of Mauritius (NASA
 *        World Wind / OnEarth WMS pseudocolor layer, 2006), via
 *        Wikimedia Commons (`File:Mauritius_OnEarth_WMS.jpg`,
 *        public-domain US-government work). Lightly graded by
 *        `scripts/optimize-property-map.mjs` (Sharp) — small
 *        saturation lift + gentle gamma; geographic content
 *        unchanged. Replaces the previous hand-drawn region SVG
 *        (which user feedback said "simply does not work") and is
 *        now the centrepiece of a combined Operating-area panel
 *        that subsumes the Service-area and Language cards into a
 *        single coherent block. A small "Public domain · NASA /
 *        NASA World Wind" credit sits in the image corner.
 *    All workflow icons are now hand-authored inline SVG marks
 *    rendered inside each step card (`WorkflowStepIcon`); the
 *    standalone abstract workflow ribbon SVG that shipped in #338
 *    has been retired because user feedback called it "an
 *    afterthought" and asked for the graphic and step content to
 *    live together. The icons reuse the same channel-cluster /
 *    log / alert / board / summary visual language so the page
 *    still has a consistent flow grammar.
 *  - The "what you see every morning" cockpit panel remains rendered
 *    as HTML/CSS with explicit "illustrative example" labelling and
 *    fake property leads (`EXAMPLE: …`).
 *
 * CTA wiring (no new env vars, no new schema):
 *  - The intake form posts to the existing `/api/tenant/intake`
 *    handler in `lib/server/tenant-intake.js` with
 *    `meta.product = 'ai-lead-rescue'` (exact match for the AI Lead
 *    Rescue notification path), `meta.lead_rescue_variant =
 *    'property-mauritius'`, `meta.property_segments` (an array,
 *    because almost every Mauritius property prospect we have
 *    identified runs more than one of these segments at once —
 *    user feedback explicitly rejected the previous single-select
 *    dropdown), and `meta.property_segment` (a legacy single-string
 *    field set to the only chosen segment when exactly one is
 *    ticked, or to `'multiple'` otherwise — kept for backward
 *    compatibility with any existing operator-cockpit reads), and
 *    `meta.page = '/lead-rescue/property-mauritius'`. The handler
 *    stores meta verbatim in `qualificationJson.intake_meta`, so
 *    both fields are visible on `/admin/lead-rescue/[id]`. The
 *    operator alert path is unchanged.
 *
 * Doctrine compliance:
 *  - Single offer rule preserved: the public page advertises only the
 *    launch pilot. No monthly continuation figure is shown on the page;
 *    continuation, if elected, is quoted operator-side after the
 *    7-day pilot per the operator-side pricing guide.
 *  - Mauritius-local payment framing: the launch pilot is invoiced as
 *    the MUR equivalent of USD 150 on a local pro-forma, paid by bank
 *    transfer to a Mauritius bank account, with proof of payment
 *    shared manually and setup beginning only after manual
 *    confirmation. This local-on-the-public-page framing is permitted
 *    on the Mauritius property surface only — see
 *    `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Mauritius
 *    property page localisation note*. The pan-vertical `/lead-rescue`
 *    page continues to use the USD-anchor / USD-invoice trust copy.
 *  - Required no-guarantee copy is present verbatim:
 *    "We do not guarantee new revenue. We help make sure existing
 *    enquiries are captured, visible, and followed up."
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
  inkDeep: '#0F0F0F',
  muted: '#5A5A5A',
  faint: '#8A8A8A',
  hairline: 'rgba(15, 76, 76, 0.14)',
  hairlineSoft: 'rgba(26, 26, 26, 0.08)',
  hairlineMid: 'rgba(26, 26, 26, 0.16)',
  teal: '#0F4C4C',
  tealSoft: 'rgba(15, 76, 76, 0.08)',
  tealStrong: '#0A3636',
  brass: '#9C7A3D',
  brassSoft: 'rgba(156, 122, 61, 0.16)',
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
    aspectRatio: '4 / 5',
    borderRadius: 4, overflow: 'hidden',
    boxShadow: '0 26px 60px rgba(15, 76, 76, 0.18), 0 6px 14px rgba(15, 76, 76, 0.10)',
  },
  heroVisual: {
    width: '100%', height: '100%', display: 'block',
    objectFit: 'cover', objectPosition: 'center 42%',
  },
  heroVisualEyebrow: {
    position: 'absolute', left: 16, bottom: 14,
    display: 'inline-flex', alignItems: 'center', gap: 8,
    background: 'rgba(10, 54, 54, 0.62)',
    color: '#FAF6F0',
    padding: '8px 12px',
    borderRadius: 2,
    fontSize: 10, letterSpacing: '0.24em', textTransform: 'uppercase',
    fontWeight: 700,
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
  },
  heroVisualEyebrowDot: {
    width: 4, height: 4, borderRadius: '50%',
    background: '#E2C892',
  },
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
  workflowBand: {
    display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 14, marginTop: 36,
  },
  workflowStep: {
    background: palette.paper, border: `1px solid ${palette.hairlineSoft}`,
    padding: '22px 20px 20px', borderRadius: 4,
    display: 'flex', flexDirection: 'column', gap: 14,
    position: 'relative', minHeight: 220,
  },
  workflowStepIconWrap: {
    width: 56, height: 56, borderRadius: 4,
    background: palette.warmSand,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderTop: `1px solid ${palette.brassSoft}`,
  },
  workflowStepIndex: {
    fontSize: 10, letterSpacing: '0.24em', color: palette.brass,
    fontWeight: 700,
  },
  workflowStepTitle: { fontSize: 15, color: palette.ink, fontWeight: 600, lineHeight: 1.3 },
  workflowStepBody: { color: palette.muted, fontSize: 13, lineHeight: 1.55, marginTop: 'auto' },
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
    display: 'grid', gridTemplateColumns: '1.5fr 0.95fr 0.8fr 0.85fr 0.6fr',
    gap: 12, fontSize: 11, letterSpacing: '0.18em',
    textTransform: 'uppercase', color: palette.faint, fontWeight: 600,
  },
  cockpitRow: {
    padding: '16px 22px', borderBottom: `1px solid ${palette.hairlineSoft}`,
    display: 'grid', gridTemplateColumns: '1.5fr 0.95fr 0.8fr 0.85fr 0.6fr',
    gap: 12, alignItems: 'center', fontSize: 14,
  },
  cockpitName: { color: palette.ink, fontWeight: 500 },
  cockpitMeta: { color: palette.muted, fontSize: 13 },
  cockpitAssignee: {
    display: 'inline-flex', alignItems: 'center', gap: 8,
    color: palette.ink, fontSize: 13,
  },
  cockpitAssigneeAvatar: {
    width: 22, height: 22, borderRadius: '50%',
    background: palette.warmSand, color: palette.teal,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
    border: `1px solid ${palette.brassSoft}`,
    flex: '0 0 auto',
  },
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
  segments: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 16, marginTop: 36,
  },
  segmentCard: {
    background: palette.paper, border: `1px solid ${palette.hairlineSoft}`,
    padding: '26px 24px', borderRadius: 4,
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  segmentLabel: {
    fontSize: 10, letterSpacing: '0.22em', color: palette.teal,
    textTransform: 'uppercase', fontWeight: 700,
  },
  segmentTitle: { fontSize: 18, color: palette.ink, fontWeight: 600, lineHeight: 1.35 },
  segmentBody: { color: palette.muted, fontSize: 14, lineHeight: 1.6 },
  operatingArea: {
    marginTop: 36,
    background: palette.paper,
    border: `1px solid ${palette.hairlineSoft}`,
    borderRadius: 4, overflow: 'hidden',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
    boxShadow: '0 1px 0 rgba(15, 76, 76, 0.04), 0 18px 50px rgba(15, 76, 76, 0.06)',
  },
  operatingAreaMapWrap: {
    position: 'relative',
    background: '#0A1A2A',
    minHeight: 320,
    overflow: 'hidden',
  },
  operatingAreaMap: {
    width: '100%', height: '100%', display: 'block',
    objectFit: 'cover', objectPosition: 'center center',
  },
  operatingAreaCredit: {
    position: 'absolute', right: 12, bottom: 10,
    color: 'rgba(250, 246, 240, 0.78)',
    fontSize: 10, letterSpacing: '0.10em',
    background: 'rgba(10, 26, 42, 0.55)',
    padding: '4px 8px',
    borderRadius: 2,
  },
  operatingAreaBody: {
    padding: '32px 32px 28px',
    display: 'flex', flexDirection: 'column', gap: 22,
  },
  operatingAreaSection: {
    display: 'flex', flexDirection: 'column', gap: 10,
  },
  operatingAreaDivider: {
    height: 1, background: palette.hairlineSoft, margin: '4px 0 4px',
  },
  operatingAreaHeading: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.teal, fontWeight: 700,
  },
  operatingAreaText: { color: palette.ink, fontSize: 15, lineHeight: 1.6, fontWeight: 400 },
  operatingAreaTowns: {
    display: 'flex', flexWrap: 'wrap', gap: '6px 14px',
    fontSize: 12, color: palette.muted, letterSpacing: '0.04em',
  },
  operatingAreaTown: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
  },
  operatingAreaTownDot: {
    width: 4, height: 4, borderRadius: '50%', background: palette.brass,
  },
  trustList: {
    marginTop: 28,
    border: `1px solid ${palette.hairlineSoft}`,
    background: palette.paper,
    borderRadius: 4,
  },
  trustItem: {
    display: 'grid',
    gridTemplateColumns: 'minmax(160px, 0.7fr) minmax(0, 1.5fr)',
    gap: 24,
    padding: '22px 26px',
    borderBottom: `1px solid ${palette.hairlineSoft}`,
    alignItems: 'baseline',
  },
  trustItemTitle: { fontSize: 15, color: palette.ink, fontWeight: 600, letterSpacing: '0.005em' },
  trustItemBody: { fontSize: 14, color: palette.muted, lineHeight: 1.6 },
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
  paymentSteps: {
    marginTop: 20,
    padding: '24px 26px',
    background: palette.paper,
    border: `1px solid ${palette.hairlineSoft}`,
    borderRadius: 4,
  },
  paymentStepsHeading: {
    fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase',
    color: palette.teal, fontWeight: 700, marginBottom: 16,
  },
  paymentList: {
    margin: 0, padding: 0, listStyle: 'none',
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px 24px',
  },
  paymentListItem: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    fontSize: 14, color: palette.ink, lineHeight: 1.5,
  },
  paymentListBullet: {
    width: 6, height: 6, borderRadius: '50%',
    background: palette.brass,
    flex: '0 0 auto', marginTop: 7,
  },
  paymentListLabel: {
    color: palette.ink, fontWeight: 600,
  },
  continuationNote: {
    marginTop: 18,
    padding: '14px 18px',
    background: palette.tealSoft,
    borderLeft: `2px solid ${palette.teal}`,
    fontSize: 13, color: palette.ink, lineHeight: 1.6,
    maxWidth: 720,
  },
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
  formGroup: {
    display: 'flex', flexDirection: 'column', gap: 10,
    padding: '14px 16px',
    border: `1px solid ${palette.hairlineSoft}`,
    background: palette.cream,
    borderRadius: 3,
  },
  formGroupLabel: {
    fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase',
    color: palette.faint, fontWeight: 600,
  },
  formGroupHint: { fontSize: 12, color: palette.faint, lineHeight: 1.5 },
  checkboxGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '10px 16px',
  },
  checkboxItem: {
    display: 'flex', alignItems: 'flex-start', gap: 10,
    fontSize: 14, color: palette.ink, lineHeight: 1.4,
    cursor: 'pointer',
  },
  checkboxControl: {
    width: 16, height: 16, marginTop: 2,
    accentColor: palette.teal, flex: '0 0 auto',
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
    iconKey: 'channels',
    title: 'Channel intake',
    body: 'WhatsApp, Facebook, website forms, listing portals, and missed calls — every enquiry route you already use.',
  },
  {
    index: '02',
    iconKey: 'log',
    title: 'Lead log',
    body: 'A single, time-stamped record per enquiry. No duplicate, no lost message, no "did anyone reply?".',
  },
  {
    index: '03',
    iconKey: 'alert',
    title: 'Owner / operator alert',
    body: 'The right person is told the moment a new enquiry lands — no waiting for the next inbox check.',
  },
  {
    index: '04',
    iconKey: 'board',
    title: 'Follow-up board',
    body: 'Open enquiries, replies sent, viewings scheduled, and stale leads — all visible without chasing colleagues.',
  },
  {
    index: '05',
    iconKey: 'summary',
    title: 'Daily summary',
    body: 'A short morning view: new enquiries, follow-ups due, and what slipped past 48 hours without a reply.',
  },
];

function WorkflowStepIcon({ iconKey }) {
  const stroke = '#1A1A1A';
  const accent = '#9C7A3D';
  switch (iconKey) {
    case 'channels':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <circle cx="9" cy="9" r="2.4" fill={stroke} />
          <circle cx="22" cy="9" r="2.4" fill={stroke} />
          <circle cx="9" cy="22" r="2.4" fill={stroke} />
          <circle cx="22" cy="22" r="2.4" fill={stroke} />
          <circle cx="16" cy="16" r="3" fill={accent} />
        </svg>
      );
    case 'log':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect x="5" y="7" width="22" height="18" rx="1" stroke={stroke} strokeWidth="1.4" />
          <line x1="8.5" y1="12" x2="23.5" y2="12" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8.5" y1="16" x2="20" y2="16" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" />
          <line x1="8.5" y1="20" x2="22" y2="20" stroke={accent} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'alert':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <path
            d="M16 6 L25 18 H7 L16 6 Z"
            stroke={stroke}
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <line x1="16" y1="11" x2="16" y2="15" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="16" cy="22.5" r="1.4" fill={accent} />
          <line x1="16" y1="18" x2="16" y2="20.5" stroke={stroke} strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case 'board':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <rect x="5" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="13" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="21" y="8" width="6" height="16" rx="1" stroke={stroke} strokeWidth="1.4" />
          <rect x="6.5" y="9.5" width="3" height="3" fill={accent} rx="0.6" />
          <rect x="14.5" y="13" width="3" height="3" fill={stroke} rx="0.6" opacity="0.7" />
          <rect x="22.5" y="17" width="3" height="3" fill={stroke} rx="0.6" opacity="0.4" />
        </svg>
      );
    case 'summary':
      return (
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none" aria-hidden="true">
          <line x1="6" y1="10" x2="26" y2="10" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="16" x2="22" y2="16" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
          <line x1="6" y1="22" x2="18" y2="22" stroke={accent} strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

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
    assignee: 'AR',
    assigneeName: 'EXAMPLE: A. Ramdoyal',
    badgeStyle: 'badgeNew',
    badgeText: 'New',
  },
  {
    name: 'EXAMPLE: Long-let inquiry — Grand Baie',
    meta: 'Website form · Tenant · 12 mo',
    when: 'Yesterday',
    assignee: 'JF',
    assigneeName: 'EXAMPLE: J. Fanchette',
    badgeStyle: 'badgeReplied',
    badgeText: 'Replied',
  },
  {
    name: 'EXAMPLE: Site visit request — Black River',
    meta: 'Facebook DM · Buyer · weekend',
    when: 'Yesterday',
    assignee: 'FD',
    assigneeName: 'EXAMPLE: Front desk',
    badgeStyle: 'badgeBooked',
    badgeText: 'Viewing',
  },
  {
    name: 'EXAMPLE: Serviced apt — 6-night stay — Flic en Flac',
    meta: 'Listing portal · Guest · Aug',
    when: '2 days ago',
    assignee: '—',
    assigneeName: 'EXAMPLE: Unassigned',
    badgeStyle: 'badgeFollowup',
    badgeText: 'Follow-up',
  },
];

const segmentOptions = [
  { value: 'real_estate_agency', label: 'Real estate agency' },
  { value: 'villa_rental', label: 'Villa rental operator' },
  { value: 'property_manager', label: 'Property manager' },
  { value: 'serviced_apartment_str', label: 'Serviced apartments / short-term rentals' },
  { value: 'commercial_property', label: 'Commercial / office space' },
  { value: 'other_property', label: 'Other property' },
];

const operatingAreaTowns = [
  'Cap Malheureux', 'Grand Baie', 'Pereybère', 'Trou aux Biches', 'Pointe aux Cannoniers',
  'Port Louis', 'Tamarin', 'Black River', 'Flic en Flac', 'Le Morne',
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

    const propertySegments = fd.getAll('property_segment').map((v) => String(v).trim()).filter(Boolean);
    if (propertySegments.length === 0) {
      alert('Please select at least one property segment that fits your operation.');
      return;
    }

    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        lead_rescue_variant: 'property-mauritius',
        business_name: String(fd.get('business_name') || '').trim(),
        property_segments: propertySegments,
        property_segment: propertySegments.length === 1 ? propertySegments[0] : 'multiple',
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
                Property enquiries often arrive through WhatsApp, Facebook, website forms, listing portals, and calls — but after the first reply, follow-up can become hard to see. The enquiry that quietly walks to another agency is usually the one no one realised was still waiting for a reply.
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
              <picture>
                <source
                  type="image/webp"
                  srcSet="/assets/visuals/lead-rescue-property-hero-640.webp 640w, /assets/visuals/lead-rescue-property-hero-1024.webp 1024w, /assets/visuals/lead-rescue-property-hero-1600.webp 1600w"
                  sizes="(max-width: 900px) min(420px, calc(100vw - 48px)), 460px"
                />
                <img
                  src="/assets/visuals/lead-rescue-property-hero-1024.jpg"
                  alt="Editorial aerial view of a quiet Mauritius West-coast lagoon at calm morning light. A curving sand beach meets clear turquoise water, with dark volcanic mountains rising in the distance. No people, no buildings, no boats."
                  width="1024"
                  height="683"
                  style={styles.heroVisual}
                  loading="eager"
                  decoding="async"
                />
              </picture>
              <span style={styles.heroVisualEyebrow} aria-hidden="true">
                <span style={styles.heroVisualEyebrowDot} />
                Mauritius · West coast
              </span>
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
          <div style={styles.workflowBand} className="lr-property-workflow-band">
            {workflowSteps.map((step) => (
              <div key={step.index} style={styles.workflowStep} className="lr-property-workflow-step">
                <div style={styles.workflowStepIconWrap} aria-hidden="true">
                  <WorkflowStepIcon iconKey={step.iconKey} />
                </div>
                <div style={styles.workflowStepIndex}>STEP {step.index}</div>
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
              <div>Assigned to</div>
              <div>Status</div>
            </div>
            {cockpitRows.map((row) => (
              <div key={row.name} style={styles.cockpitRow} className="lr-property-cockpit-row">
                <div style={styles.cockpitName}>{row.name}</div>
                <div style={styles.cockpitMeta}>{row.meta}</div>
                <div style={styles.cockpitMeta}>{row.when}</div>
                <div style={styles.cockpitAssignee}>
                  <span style={styles.cockpitAssigneeAvatar} aria-hidden="true">{row.assignee}</span>
                  <span>{row.assigneeName}</span>
                </div>
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
          <div style={styles.sectionLabel}>Who this is for</div>
          <h2 style={styles.h2}>Property operators who already get the enquiries — they just need the workflow that keeps them.</h2>
          <div style={styles.segments} className="lr-property-segments-grid">
            {segments.map((seg) => (
              <article key={seg.label} style={styles.segmentCard} className="lr-property-segment">
                <div style={styles.segmentLabel}>{seg.label}</div>
                <div style={styles.segmentTitle}>{seg.title}</div>
                <div style={styles.segmentBody}>{seg.body}</div>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.section} aria-labelledby="operating-area-heading">
          <div style={styles.sectionLabel}>Operating in Mauritius</div>
          <h2 id="operating-area-heading" style={styles.h2}>Where we run the pilot — and how the workflow handles language.</h2>
          <div style={styles.operatingArea} className="lr-property-operating-area">
            <div style={styles.operatingAreaMapWrap}>
              <picture>
                <source
                  type="image/webp"
                  srcSet="/assets/visuals/lead-rescue-property-map-640.webp 640w, /assets/visuals/lead-rescue-property-map-1024.webp 1024w, /assets/visuals/lead-rescue-property-map-1600.webp 1600w"
                  sizes="(max-width: 720px) 100vw, 540px"
                />
                <img
                  src="/assets/visuals/lead-rescue-property-map-1024.jpg"
                  alt="Real public-domain NASA satellite image of the island of Mauritius, viewed from above. The island fills most of the frame, surrounded by deep navy ocean. The mountainous green interior, paler coastal plains, and turquoise lagoon along the coast are clearly visible. Some natural cloud cover crosses the island. Used as a service-area illustration; no roads or place names overlaid."
                  width="1024"
                  height="1465"
                  style={styles.operatingAreaMap}
                  loading="lazy"
                  decoding="async"
                />
              </picture>
              <span style={styles.operatingAreaCredit}>
                Public domain · NASA / NASA World Wind
              </span>
            </div>
            <div style={styles.operatingAreaBody}>
              <div style={styles.operatingAreaSection}>
                <div style={styles.operatingAreaHeading}>Service area</div>
                <p style={styles.operatingAreaText}>
                  The pilot is run for property operators on the North and West coast — Cap Malheureux through Grand Baie, Port Louis, Tamarin, Black River, and down to Le Morne. Other parts of the island on request.
                </p>
                <div style={styles.operatingAreaTowns} aria-label="Towns covered by the pilot">
                  {operatingAreaTowns.map((town) => (
                    <span key={town} style={styles.operatingAreaTown}>
                      <span style={styles.operatingAreaTownDot} aria-hidden="true" />
                      {town}
                    </span>
                  ))}
                </div>
              </div>
              <div style={styles.operatingAreaDivider} />
              <div style={styles.operatingAreaSection}>
                <div style={styles.operatingAreaHeading}>Language</div>
                <p style={styles.operatingAreaText}>
                  Calls are easiest in English, but the written workflow can support French lead summaries and French enquiry handling where required. Customer-facing replies are reviewed before sending.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>What this is not</div>
          <h2 style={styles.h2}>Honest limits — so you know exactly what you are buying.</h2>
          <div style={styles.trustList}>
            {trustBoundaries.map((item) => (
              <div key={item.title} style={styles.trustItem} className="lr-property-trust-list-item">
                <div style={styles.trustItemTitle}>{item.title}</div>
                <div style={styles.trustItemBody}>{item.body}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionLabel}>Pricing &amp; path</div>
          <h2 style={styles.h2}>One launch pilot. Local pro-forma. No card on the page.</h2>
          <div style={styles.pricingCard}>
            <div>
              <div style={styles.pricingNumber}>USD 150</div>
              <div style={styles.pricingLabel}>Launch pilot · invoiced as the MUR equivalent</div>
            </div>
            <div style={styles.pricingBody}>
              Submitting the form does not commit you to payment. After we review your intake within two business hours, we issue a local pro-forma invoice in Mauritian rupees — the MUR equivalent of USD 150 at the day&rsquo;s rate, with the final MUR amount confirmed on the invoice itself. You pay by bank transfer to a Mauritius bank account, share the proof of payment, and the 48-hour setup begins only after we manually confirm receipt. No card details, no online checkout, and no automated subscription on this page.
            </div>
          </div>
          <div style={styles.paymentSteps} aria-label="How payment works on the Mauritius property pilot">
            <div style={styles.paymentStepsHeading}>How payment works</div>
            <ul style={styles.paymentList} className="lr-property-payment-list">
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>Intake review first</span> — within two business hours of submitting the form.</span>
              </li>
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>No card or banking details on this page</span> — and no online checkout.</span>
              </li>
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>Local pro-forma invoice</span> — issued in MUR, with the day&rsquo;s rate noted.</span>
              </li>
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>Bank transfer</span> — to a Mauritius bank account.</span>
              </li>
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>Proof of payment shared manually</span> — email or WhatsApp is fine.</span>
              </li>
              <li style={styles.paymentListItem}>
                <span style={styles.paymentListBullet} aria-hidden="true" />
                <span><span style={styles.paymentListLabel}>Setup starts after manual confirmation</span> — never automatically.</span>
              </li>
            </ul>
          </div>
          <p style={styles.continuationNote}>
            If you choose to continue after the pilot, ongoing monitoring is quoted separately after review. There is no auto-renewal, and no monthly figure is published on this page.
          </p>
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
              <fieldset style={styles.formGroup} className="lr-property-form-group">
                <legend style={styles.formGroupLabel}>Property segment · select all that apply</legend>
                <div style={styles.checkboxGrid} className="lr-property-checkbox-grid">
                  {segmentOptions.map((opt) => (
                    <label key={opt.value} style={styles.checkboxItem} className="lr-property-checkbox-item">
                      <input
                        type="checkbox"
                        name="property_segment"
                        value={opt.value}
                        style={styles.checkboxControl}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div style={styles.formGroupHint}>
                  Many Mauritius property operators run more than one of these in parallel — tick every segment that fits.
                </div>
              </fieldset>
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
              Submitting this form does not commit you to payment. There is no automated subscription, no online checkout, and no card or banking details on this page. We review fit first, then confirm the local pro-forma invoice and the setup steps. The pilot is manually onboarded after payment is confirmed by bank transfer. We only store what is needed to run the lead log: business name, contact name, channel, and basic enquiry detail.
            </p>
            <p style={styles.noGuarantee}>
              We do not guarantee new revenue. We help make sure existing enquiries are captured, visible, and followed up.
            </p>
          </div>
        </section>

        <div style={styles.footerWrap}>
          <PublicSiteFooter extra="AI Lead Rescue Mauritius property edition is powered by CorpFlowAI. The launch pilot is invoiced as the MUR equivalent of USD 150 on a local pro-forma after intake review; this page collects intake only, does not collect card or banking details, and does not create any automated subscription. Calls in English; written workflow supports French summaries and French enquiry handling on request, with reviewed replies." />
        </div>
      </main>

      <style jsx global>{`
        @media (prefers-reduced-motion: no-preference) {
          .lr-property-cta-primary {
            transition: background 220ms ease, transform 220ms ease, box-shadow 220ms ease;
          }
          .lr-property-cta-primary:hover {
            background: #0A3636;
            transform: translateY(-1px);
            box-shadow: 0 16px 38px rgba(15, 76, 76, 0.22);
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
          .lr-property-workflow-step {
            transition: border-color 260ms ease, box-shadow 260ms ease, transform 260ms ease;
          }
          .lr-property-workflow-step:hover {
            transform: translateY(-1px);
            border-color: rgba(15, 76, 76, 0.32);
            box-shadow: 0 14px 36px rgba(15, 76, 76, 0.08);
          }
          .lr-property-hero-aside picture img {
            animation: lrPropHeroSettle 1400ms ease-out 120ms both;
            transition: transform 1200ms ease;
          }
          @keyframes lrPropHeroSettle {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          .lr-property-operating-area picture img {
            animation: lrPropFadeIn 1100ms ease-out 220ms both;
          }
          @keyframes lrPropFadeIn {
            from { opacity: 0; }
            to   { opacity: 1; }
          }
        }

        .lr-property-trust-list-item:last-child {
          border-bottom: 0 !important;
        }
        .lr-property-cockpit-row:last-of-type {
          border-bottom: 0;
        }

        .lr-property-checkbox-item:hover span {
          color: #0F4C4C;
        }

        @media (max-width: 1100px) {
          .lr-property-workflow-band {
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          }
        }
        @media (max-width: 900px) {
          .lr-property-hero-layout {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 32px !important;
          }
          .lr-property-hero-aside {
            order: -1;
            max-width: 480px;
            margin-bottom: 8px;
          }
          .lr-property-operating-area {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-operating-area picture img {
            aspect-ratio: 4 / 3;
            object-fit: cover;
          }
        }
        @media (max-width: 720px) {
          .lr-property-segments-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-workflow-band {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .lr-property-checkbox-grid {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-payment-list {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-trust-list-item {
            grid-template-columns: minmax(0, 1fr) !important;
            gap: 6px !important;
            padding: 18px 22px !important;
          }
          .lr-property-cockpit-thead {
            display: none !important;
          }
          .lr-property-cockpit-row {
            grid-template-columns: 1fr 0.7fr !important;
            row-gap: 6px;
          }
          .lr-property-cockpit-row > div:nth-child(2),
          .lr-property-cockpit-row > div:nth-child(3),
          .lr-property-cockpit-row > div:nth-child(4) {
            grid-column: 1 / -1;
            font-size: 12px;
          }
        }
        @media (max-width: 540px) {
          .lr-property-workflow-band {
            grid-template-columns: minmax(0, 1fr) !important;
          }
          .lr-property-hero-aside {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

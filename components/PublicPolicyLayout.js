import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

/**
 * Editorial layout shared by CorpFlowAI policy pages and the institutional
 * trust-architecture pages (`/about`, `/process`, `/standards`,
 * `/onboarding`).
 *
 * Two width modes:
 * - `narrow` (default, 800px) — used for policy text where short measure
 *   reinforces the institutional voice (Privacy, Terms, Refund policy,
 *   Contact).
 * - `wide` (960px) — used for trust-architecture pages that include
 *   horizontal timeline visuals and side-by-side "do / do not" panels.
 *
 * The layout is intentionally restrained: no flashy nav, no animated
 * decoration, single editorial column. Per
 * `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and
 * `.cursor/rules/delivery-reality.mdc`, trust comes from clarity, not
 * volume.
 */

const baseStyles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 32 },
  brand: { fontWeight: 900, fontSize: 20, color: '#eef6ff', textDecoration: 'none' },
  navLinks: { display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 13 },
  link: { color: '#7dd3fc', textDecoration: 'none' },
  h1: { margin: '0 0 8px', fontSize: 'clamp(28px, 4.6vw, 38px)', letterSpacing: '-0.03em', lineHeight: 1.15 },
  updated: { color: '#9fb2c8', fontSize: 13, marginBottom: 24 },
  footer: { marginTop: 48, paddingTop: 22, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: '#9fb2c8', lineHeight: 1.65 },
};

const NAV_LINKS = [
  { href: '/lead-rescue', label: 'AI Lead Rescue' },
  { href: '/about', label: 'About' },
  { href: '/process', label: 'Process' },
  { href: '/standards', label: 'Standards' },
  { href: '/contact', label: 'Contact' },
];

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/lead-rescue', label: 'AI Lead Rescue' },
  { href: '/about', label: 'About' },
  { href: '/process', label: 'Process' },
  { href: '/standards', label: 'Standards' },
  { href: '/onboarding', label: 'Onboarding' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
  { href: '/refund-policy', label: 'Refunds' },
];

export const policyStyles = {
  section: { marginTop: 28 },
  h2: { fontSize: 22, margin: '0 0 12px', color: '#c9d8e8', letterSpacing: '-0.01em' },
  p: { color: '#aebfd1', lineHeight: 1.75, margin: '0 0 14px', fontSize: 15.5 },
  ul: { color: '#aebfd1', lineHeight: 1.8, paddingLeft: 22, margin: '0 0 14px', fontSize: 15.5 },
};

/**
 * Style utilities shared by trust-architecture pages. Kept here so every
 * trust page has identical typography and spacing without re-declaring
 * the same constants in four places.
 */
export const trustStyles = {
  lead: {
    color: '#dbe7f5',
    fontSize: 'clamp(17px, 2vw, 19px)',
    lineHeight: 1.65,
    margin: '0 0 28px',
    maxWidth: 720,
  },
  sectionLabel: {
    fontSize: 11.5,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
    color: '#7dd3fc',
    margin: '0 0 12px',
  },
  divider: {
    border: 0,
    borderTop: '1px solid rgba(255,255,255,0.10)',
    margin: '40px 0',
  },
  card: {
    background: 'rgba(255,255,255,0.035)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: 18,
    padding: '22px 24px',
  },
  cardTitle: {
    fontSize: 17,
    margin: '0 0 8px',
    color: '#eef6ff',
    letterSpacing: '-0.01em',
  },
  cardBody: {
    color: '#aebfd1',
    fontSize: 14.5,
    lineHeight: 1.7,
    margin: 0,
  },
  pillarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 16,
    margin: '12px 0 8px',
  },
  twoColumn: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 18,
    margin: '12px 0 8px',
  },
  doCard: {
    background: 'rgba(45,212,191,0.05)',
    border: '1px solid rgba(45,212,191,0.22)',
    borderRadius: 18,
    padding: '22px 24px',
  },
  dontCard: {
    background: 'rgba(248,113,113,0.04)',
    border: '1px solid rgba(248,113,113,0.18)',
    borderRadius: 18,
    padding: '22px 24px',
  },
  doDontTitle: {
    fontSize: 13,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    margin: '0 0 12px',
    fontWeight: 600,
  },
  doDontList: {
    margin: 0,
    paddingLeft: 18,
    color: '#cfdde9',
    lineHeight: 1.7,
    fontSize: 14.5,
  },
  ctaRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 14,
    alignItems: 'center',
    margin: '18px 0 6px',
  },
  ctaPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    background: 'linear-gradient(135deg, rgba(45,212,191,0.18), rgba(125,211,252,0.16))',
    border: '1px solid rgba(125,211,252,0.35)',
    borderRadius: 999,
    color: '#eef6ff',
    fontWeight: 600,
    textDecoration: 'none',
    fontSize: 14,
  },
  ctaSecondary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 20px',
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    color: '#cfdde9',
    fontWeight: 500,
    textDecoration: 'none',
    fontSize: 14,
  },
  visualFrame: {
    margin: '20px 0 8px',
    padding: '18px 20px',
    background: 'rgba(255,255,255,0.025)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 18,
  },
  founderQuote: {
    margin: '32px 0 8px',
    padding: '24px 26px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderLeft: '3px solid rgba(125,211,252,0.55)',
    borderRadius: 16,
    color: '#dbe7f5',
    lineHeight: 1.75,
    fontSize: 15.5,
  },
  founderSignoff: {
    marginTop: 14,
    fontSize: 13,
    color: '#9fb2c8',
    fontStyle: 'normal',
    letterSpacing: '0.04em',
  },
};

function PolicyFooter() {
  return (
    <footer style={baseStyles.footer}>
      This website provides general service information. Final terms may be confirmed in the applicable invoice or
      service agreement. CorpFlowAI does not guarantee new revenue. Results vary by business and lead volume. This
      is not legal, tax, or accounting advice.
      <div style={{ marginTop: 14 }}>
        {FOOTER_LINKS.map((l, i) => (
          <React.Fragment key={l.href}>
            {i > 0 ? ' · ' : null}
            <Link href={l.href} style={baseStyles.link}>
              {l.label}
            </Link>
          </React.Fragment>
        ))}
      </div>
    </footer>
  );
}

/**
 * @param {{
 *   title: string;
 *   description?: string;
 *   showUpdated?: boolean;
 *   updatedLabel?: string;
 *   width?: 'narrow' | 'wide';
 *   children: React.ReactNode;
 * }} props
 */
export default function PublicPolicyLayout({
  title,
  description,
  showUpdated = true,
  updatedLabel,
  width = 'narrow',
  children,
}) {
  const maxWidth = width === 'wide' ? 960 : 800;
  const shellStyle = { maxWidth, margin: '0 auto', padding: '42px 20px 56px' };

  return (
    <div style={baseStyles.page}>
      <Head>
        <title>{title} · CorpFlowAI</title>
        {description ? <meta name="description" content={description} /> : null}
      </Head>
      <main style={shellStyle}>
        <nav style={baseStyles.nav}>
          <Link href="/" style={baseStyles.brand}>
            CorpFlowAI
          </Link>
          <div style={baseStyles.navLinks}>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} style={baseStyles.link}>
                {l.label}
              </Link>
            ))}
          </div>
        </nav>
        <h1 style={baseStyles.h1}>{title}</h1>
        {showUpdated ? (
          <p style={baseStyles.updated}>
            {updatedLabel || 'Last updated: May 2026. This page may be updated from time to time.'}
          </p>
        ) : null}
        {children}
        <PolicyFooter />
      </main>
    </div>
  );
}

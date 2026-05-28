import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';

/**
 * /standards - Operational standards: review cadence, monitoring,
 * payment-after-review, no-guarantee positioning, and governance.
 *
 * Companion to /about, /process, and /onboarding. Text-first; no
 * decorative imagery. The institutional voice carries the trust here.
 *
 * Per `.cursor/rules/delivery-reality.mdc`, "operational completion"
 * is defined by live verification on the real production URL, not by
 * health checks alone. The "Live verification" section reflects that
 * standard publicly so clients understand the bar.
 */

const PILLARS = [
  {
    label: 'Review cadence',
    body: 'Every active engagement has at least one operator review per week. During the seven-day pilot monitoring window, that becomes one review per business day. Reviews are scheduled by the operator, not the client - you do not have to chase us.',
  },
  {
    label: 'Monitoring',
    body: 'On a live engagement we monitor: every lead-source capture path with a synthetic test ping, the alert delivery path on the owner\'s preferred channel (email, SMS, or WhatsApp), the daily summary delivery, and the running log of captured leads versus follow-up status so we can spot drift early.',
  },
  {
    label: 'Payment after review',
    body: 'No card or banking details are collected on this website. After intake review, we issue a USD invoice for the pilot. The cancellation window before pilot setup begins is published separately on the refund-policy page.',
  },
  {
    label: 'No revenue guarantees',
    body: 'We do not promise revenue, lead volume, or conversion lift. Our marketing pages avoid revenue claims and "X% uplift" language by policy. If you need revenue forecasting, that is a different engagement - and one we do not currently offer.',
  },
];

export default function StandardsPage() {
  return (
    <PublicPolicyLayout
      title="Operational standards"
      description="How CorpFlowAI runs engagements: review cadence, monitoring, payment after review, no-guarantee positioning, and the governance applied to visual assets and security."
      width="wide"
    >
      <p style={ts.lead}>
        This page describes the operational standards we apply to every CorpFlowAI engagement.
        It is not a contract &mdash; final terms are confirmed on the invoice or service
        agreement &mdash; but it is an honest description of how we work, written so a
        prospective client can decide whether the standard fits before any payment is taken.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>The four pillars</p>
        <h2 style={ps.h2}>How an engagement is run</h2>
        <div style={ts.pillarGrid}>
          {PILLARS.map((p) => (
            <div key={p.label} style={ts.card}>
              <h3 style={ts.cardTitle}>{p.label}</h3>
              <p style={ts.cardBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What &ldquo;done&rdquo; means</p>
        <h2 style={ps.h2}>Live verification, not just health checks</h2>
        <p style={ps.p}>
          A change is only operationally complete when the customer-facing surface is
          verified live in production. CI green and a successful deploy are necessary, but
          they are not sufficient on their own. For every change we ship on your behalf, we
          record:
        </p>
        <ul style={ps.ul}>
          <li>The deployment id and the exact commit deployed</li>
          <li>The live URLs and flows we tested after deployment</li>
          <li>Expected versus actual behaviour</li>
          <li>A final verdict: complete, partial, or failed</li>
        </ul>
        <p style={ps.p}>
          If a change is not on the production deployment&rsquo;s commit, the verdict cannot
          be &ldquo;complete&rdquo;. If a client-facing URL is broken, the verdict is
          &ldquo;failed&rdquo; &mdash; even when internal endpoints are healthy. This standard is
          codified in our internal delivery rules and applied to factory infrastructure work
          and client engagement work alike.
        </p>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Governance</p>
        <h2 style={ps.h2}>Visual assets and AI provenance</h2>
        <p style={ps.p}>
          Every visual that ships on a CorpFlowAI surface is governed by a manifest that
          records the asset&rsquo;s source, licence tier, accessibility metadata, and
          allowed surfaces. AI-generated images carry an additional provenance record that
          names the prompt used (linked to our internal prompt library), the model and
          version, and the human reviewer. AI-generated images appear on the page with an
          unobtrusive &ldquo;About this visual&rdquo; disclosure so visitors can see that the
          asset was machine-generated and human-reviewed.
        </p>
        <p style={ps.p}>
          The hand-crafted SVG diagrams on this site (including the timeline at the top of
          the{' '}
          <Link href="/process" style={{ color: '#7dd3fc' }}>
            process
          </Link>{' '}
          page and the journey on the{' '}
          <Link href="/onboarding" style={{ color: '#7dd3fc' }}>
            onboarding
          </Link>{' '}
          page) are CorpFlowAI-owned artwork and do not carry an AI provenance disclosure -
          there is no AI to disclose.
        </p>
      </section>

      <section style={ps.section}>
        <h2 style={ps.h2}>Security posture</h2>
        <ul style={ps.ul}>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Tenant isolation.</strong> Tenant data is
            isolated server-side. Webhooks validate HMAC. Authentication never collects card
            data on this site.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Intake first, payment second.</strong> The
            public website does not capture card or banking details. A USD invoice is
            issued only after intake review, off-site.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Least-access pilots.</strong> A pilot
            requires access to one lead source and an owner notification channel - nothing
            more. If a pilot would need broader access (deep CRM, production database,
            payment processor), we say so before payment, not after.
          </li>
          <li>
            <strong style={{ color: '#dbe7f5' }}>Hand-over by default.</strong> Every
            artifact we build (Google Sheets, scripts, configurations) belongs to the client.
            If you choose to step away, you take everything with you.
          </li>
        </ul>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Boundaries of this page</p>
        <h2 style={ps.h2}>What this page is, and what it is not</h2>
        <p style={ps.p}>
          This page describes how we operate. It is not a contract and it is not legal,
          tax, or accounting advice. Final terms are confirmed on the invoice or service
          agreement. The published standard may be updated; we will continue to honour
          whatever standard was in effect at the time of your engagement.
        </p>

        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>
            Start with intake &rarr;
          </Link>
          <Link href="/process" style={ts.ctaSecondary}>
            See the engagement process
          </Link>
          <Link href="/contact" style={ts.ctaSecondary}>
            Ask a question first
          </Link>
        </div>
      </section>
    </PublicPolicyLayout>
  );
}

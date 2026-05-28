import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';

/**
 * /process - The five stages of a CorpFlowAI engagement, plus the
 * explicit "what we do / what we do not do" panels.
 *
 * Companion to /about (principles), /standards (review cadence and
 * monitoring), and /onboarding (the first 14 days, day by day).
 *
 * Visual anchor: the governed `corpflow-process-timeline` SVG manifest
 * (see `data/visual-assets/corpflow-process-timeline.manifest.json`).
 * The image is referenced statically here so the page renders correctly
 * even before the runtime manifest loader is on `main`. When the
 * runtime stack lands, this can be retrofitted to use
 * `loadVisualAssetManifest('corpflow-process-timeline')` without
 * changing the alt text or path.
 */

const STAGES = [
  {
    n: 1,
    title: 'Intake review',
    duration: '1 business day',
    body: 'A CorpFlowAI operator reads your intake form, asks one to three clarifying questions, and decides whether we can help. If we cannot, we say so directly and explain why before any payment is taken.',
  },
  {
    n: 2,
    title: 'Pilot scope',
    duration: 'half a day to one day',
    body: 'We confirm in writing exactly what the pilot will and will not include. Out-of-scope items are listed explicitly. We then issue a USD invoice for the pilot.',
  },
  {
    n: 3,
    title: '48-hour pilot setup',
    duration: '2 days, after invoice is paid',
    body: 'We connect one lead source (form, email, WhatsApp, or Google Form), wire owner alerts, set up a Google Sheet log that you own, and configure a daily summary email. Setup happens against your existing tools, not against a new platform.',
  },
  {
    n: 4,
    title: '7-day pilot monitoring',
    duration: '7 days, operator-watched',
    body: 'A CorpFlowAI operator monitors the live system every business day. We test the alert path, verify the daily summary delivers, fix issues quickly, and answer operator questions in writing.',
  },
  {
    n: 5,
    title: 'Pilot review meeting',
    duration: 'with the owner',
    body: 'We meet with the business owner, review actual lead-capture and follow-up data from the pilot, and decide together what happens next: continue with explicit next-month scope, or close cleanly with everything we built handed over to you.',
  },
];

const DO_LIST = [
  'Capture, alert, log, and summarise leads from one source at a time',
  'Configure lightweight workflows around your existing tools (Google Workspace, Sheets, Mail, WhatsApp)',
  'Run a 7-day operator-monitored pilot before any larger commitment',
  'Hand over what we built so you can keep running it without us',
  'Decline work we cannot deliver lightly, before payment',
];

const DONT_LIST = [
  'Rebuild your website',
  'Replace your CRM, accounting system, or invoicing',
  'Run paid ads, SEO, or content campaigns',
  'Promise revenue, conversion lift, or "AI-driven growth"',
  'Hold a client account hostage - every artifact (Sheets, scripts, configs) is yours',
];

export default function ProcessPage() {
  return (
    <PublicPolicyLayout
      title="How a CorpFlowAI engagement runs"
      description="Every CorpFlowAI engagement begins as a 48-hour or 7-day pilot scoped to one capture-and-follow-up problem. This page describes the five stages, what we do, and what we do not do."
      width="wide"
    >
      <p style={ts.lead}>
        Every CorpFlowAI engagement begins as a short pilot scoped to one specific capture-and-follow-up
        problem. We do not start month-long projects on day one. We do not take payment before review.
        The five stages below are how a typical engagement runs.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>The five stages</p>
        <h2 style={ps.h2}>Pilot first, decide together</h2>

        <div style={ts.visualFrame}>
          <img
            src="/assets/visuals/corpflow-process-timeline.svg"
            alt="Five-stage CorpFlowAI engagement timeline: intake review (1 business day), pilot scope, 48-hour setup, 7-day operator-watched pilot monitoring, and pilot review meeting where the owner and operator decide together to continue or close."
            width={1080}
            height={220}
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }}
          />
        </div>

        <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 8px', display: 'grid', gap: 14 }}>
          {STAGES.map((s) => (
            <li key={s.n} style={ts.card}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', marginBottom: 6 }}>
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 12,
                    letterSpacing: '0.18em',
                    color: '#7dd3fc',
                    fontWeight: 700,
                  }}
                >
                  STAGE {s.n}
                </span>
                <h3 style={{ ...ts.cardTitle, margin: 0 }}>{s.title}</h3>
                <span style={{ color: '#9fb2c8', fontSize: 13 }}>&middot; {s.duration}</span>
              </div>
              <p style={ts.cardBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Boundaries</p>
        <h2 style={ps.h2}>What we do, and what we do not do</h2>
        <p style={ps.p}>
          The list on the right exists because confusion about scope is the most common
          reason an engagement goes badly. We would rather you read this page and decide
          we are not the right fit than start a project we cannot finish well.
        </p>
        <div style={ts.twoColumn}>
          <div style={ts.doCard}>
            <p style={{ ...ts.doDontTitle, color: '#5eead4' }}>What we do</p>
            <ul style={ts.doDontList}>
              {DO_LIST.map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={ts.dontCard}>
            <p style={{ ...ts.doDontTitle, color: '#fda4af' }}>What we do not do</p>
            <ul style={ts.doDontList}>
              {DONT_LIST.map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Money</p>
        <h2 style={ps.h2}>Payment after review</h2>
        <p style={ps.p}>
          We do not take payment before intake review. After a CorpFlowAI operator confirms
          we can help, you receive a USD invoice for the pilot. Payment is processed
          off-site; this site does not collect card or banking details. The refund window
          for cancellation before pilot setup begins is published separately on{' '}
          <Link href="/refund-policy" style={{ color: '#7dd3fc' }}>
            the refund policy page
          </Link>
          .
        </p>
        <p style={ps.p}>
          We do not promise revenue, lead volume, or conversion lift. We help make sure your
          existing enquiries are captured, visible, and followed up. Whether that produces
          new revenue depends on your business and your conversation with each lead.
        </p>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>
            Start with intake &rarr;
          </Link>
          <Link href="/onboarding" style={ts.ctaSecondary}>
            See the first 14 days
          </Link>
          <Link href="/standards" style={ts.ctaSecondary}>
            Operational standards
          </Link>
        </div>
      </section>
    </PublicPolicyLayout>
  );
}

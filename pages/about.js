import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';

/**
 * /about - Institutional principles + founder's note.
 *
 * Part of the CorpFlowAI trust-architecture layer (companions:
 * /process, /standards, /onboarding). Text-first by design - there is
 * no decorative photograph here. Per
 * `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`:
 *   "Effectiveness beats decoration. Clarity beats cleverness."
 * The institutional voice lands harder when the page reads like a
 * service brief, not a brochure.
 */

const PRINCIPLES = [
  {
    title: 'Effectiveness over decoration.',
    body: "A workflow is not a website. We measure success by whether the operator's day is calmer and the customer's enquiry is captured \u2014 not by how many features ship.",
  },
  {
    title: 'Operational over impressive.',
    body: 'We avoid demos, dashboards, and metrics that look good in a deck but do not move work forward. The first deliverable is always something an operator can use on Monday morning.',
  },
  {
    title: 'Pilots, not platforms.',
    body: 'Every engagement begins as a 48-hour or 7-day pilot scoped to one capture-and-follow-up problem. Anything broader is a separate paid scoping engagement, agreed in writing.',
  },
  {
    title: 'Honest scope.',
    body: 'If a request requires rebuilding a website, replacing a CRM, or migrating data, we say so before any payment is taken. We will decline a project we cannot deliver lightly.',
  },
  {
    title: 'Lightweight by default.',
    body: "We prefer Google Sheets over a CRM, a webhook over a portal, an email over a chatbot \u2014 until the operator's real volume requires more. Every layer of complexity has to be earned.",
  },
  {
    title: 'Intake first, payment after review.',
    body: 'No card or banking details are collected on this website. Payment routes (MUR for Mauritius, USD for international clients) are sent only after a CorpFlowAI operator reviews your intake and confirms the work fits.',
  },
  {
    title: 'No revenue guarantees.',
    body: 'We help make sure existing enquiries are captured, visible, and followed up. We do not promise that doing this will produce new revenue. That depends on the business, the market, and the conversation.',
  },
];

export default function AboutPage() {
  return (
    <PublicPolicyLayout
      title="About CorpFlowAI"
      description="CorpFlowAI is a small operations company that builds lightweight AI-assisted workflow systems for small businesses. Pilots, not platforms. Operational, not impressive."
      width="wide"
    >
      <p style={ts.lead}>
        CorpFlowAI is a small operations company that builds lightweight AI-assisted workflow
        systems for small businesses. We focus on what is real, lightweight, and operational
        {' \u2014 '}not on what is hyped. The work is plumbing first: capturing every enquiry,
        alerting the owner, leaving a daily summary. Anything bigger is a separate, scoped
        engagement.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>How we operate</p>
        <h2 style={ps.h2}>Operating principles</h2>
        <p style={ps.p}>
          These are the working rules our team uses to decide what to build, what to decline,
          and how to talk to clients. They are not aspirational. If you are working with
          CorpFlowAI and an interaction does not match one of these, please tell us.
        </p>
        <div style={{ ...ts.pillarGrid, marginTop: 18 }}>
          {PRINCIPLES.map((p) => (
            <div key={p.title} style={ts.card}>
              <h3 style={ts.cardTitle}>{p.title}</h3>
              <p style={ts.cardBody}>{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Founder&rsquo;s note</p>
        <h2 style={ps.h2}>Why CorpFlowAI exists</h2>
        <div style={ts.founderQuote}>
          <p style={{ margin: '0 0 14px' }}>
            I started CorpFlowAI because most small businesses do not need another platform.
            They need their existing enquiries to stop falling through the cracks. The fastest
            way to help them is to install a small, calm system that captures every lead,
            alerts the owner, and leaves a daily summary. After that, we can talk about CRMs,
            automation, and &ldquo;AI&rdquo;. Before that, the priority is plumbing
            {' \u2014 '}and the plumbing is unglamorous, which is exactly why it works.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            The team is intentionally small. Every engagement is run by an operator
            {' \u2014 '}not a sales rep, not an assistant, not a chatbot. If you submit an
            intake form on this site, a person reads it within one business day. If we cannot
            help, we say so directly, and we say it before money changes hands.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            We are based in Mauritius and work with clients in Mauritius and internationally.
            Pricing is split on purpose: MUR for local SMBs, USD for international clients.
            The technical setup is the same in both cases. The split exists because billing
            in the right currency is part of the calm we are trying to install
            {' \u2014 '}not a negotiation point.
          </p>
          <p style={{ margin: 0 }}>
            CorpFlowAI is not a growth platform. It is an operations company. The number we
            care about is whether your follow-ups happen. If we get that right, the rest of
            the conversation gets a lot easier.
          </p>
          <div style={ts.founderSignoff}>&mdash; Anton, founder, CorpFlowAI</div>
        </div>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>Where to next</p>
        <h2 style={ps.h2}>If you want to dig further</h2>
        <p style={ps.p}>
          The trust-architecture pages describe how we run engagements end-to-end. None of
          them are sales pitches{' \u2014 '}they are operating documents.
        </p>
        <ul style={ps.ul}>
          <li>
            <Link href="/process" style={{ color: '#7dd3fc' }}>
              Process
            </Link>{' '}
            &mdash; the five stages of a CorpFlowAI engagement, including what we do and
            what we do not do.
          </li>
          <li>
            <Link href="/onboarding" style={{ color: '#7dd3fc' }}>
              Onboarding
            </Link>{' '}
            &mdash; the first fourteen days of an engagement, day by day.
          </li>
          <li>
            <Link href="/standards" style={{ color: '#7dd3fc' }}>
              Operational standards
            </Link>{' '}
            &mdash; review cadence, monitoring, payment-after-review, and the no-guarantee
            position written plainly.
          </li>
        </ul>

        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>
            Start with intake &rarr;
          </Link>
          <Link href="/contact" style={ts.ctaSecondary}>
            Ask a question first
          </Link>
        </div>
      </section>
    </PublicPolicyLayout>
  );
}

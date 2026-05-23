import React from 'react';
import Link from 'next/link';
import PublicPolicyLayout, { policyStyles as ps, trustStyles as ts } from '../components/PublicPolicyLayout.js';

/**
 * /onboarding - The first fourteen days of a CorpFlowAI engagement,
 * day by day. Companion to /about, /process, and /standards.
 *
 * Visual anchor: the governed `corpflow-onboarding-journey` SVG
 * manifest (see
 * `data/visual-assets/corpflow-onboarding-journey.manifest.json`).
 * Referenced statically here for the same reason as /process - the
 * runtime manifest loader is staged behind a separate PR and this page
 * must render correctly on `main` regardless of the loader landing.
 */

const STEPS = [
  {
    label: 'Day 0',
    title: 'Intake submitted',
    body: "You submit the AI Lead Rescue intake form (or an equivalent intake link we send you). We capture the business name, how enquiries arrive today, the follow-up problem you want fixed first, and the owner's preferred alert channel.",
  },
  {
    label: 'Day 1',
    title: 'Operator review',
    body: 'A CorpFlowAI operator (a person, not an auto-router) reads your intake. If anything is unclear, they reply by email with one to three short questions. If we cannot help, they tell you on Day 1, before money is discussed.',
  },
  {
    label: 'Day 2',
    title: 'Decision and scoping',
    body: 'If the engagement fits, we send a written pilot scope: what is in, what is out, and what counts as "pilot complete". We also send the appropriate invoice route - MUR for Mauritius clients, USD for international clients.',
  },
  {
    label: 'Day 3 to Day 5',
    title: '48-hour pilot setup',
    body: "Once the invoice is paid, the 48-hour clock starts. We connect one lead source (form, email, WhatsApp, or Google Form), wire the alert path on the owner's preferred channel, set up a Google Sheet log that you own from day one, and configure a daily summary email. By the end of Day 5 the system is live.",
  },
  {
    label: 'Day 6 to Day 12',
    title: 'Operator-watched pilot',
    body: 'Seven business days of operator-watched monitoring. Every business day we test the alert path, confirm the daily summary delivered, and check the lead log against the operator follow-up status. We fix issues quickly and answer your operator\'s questions in writing.',
  },
  {
    label: 'Day 13',
    title: 'Pilot review meeting',
    body: 'A scheduled meeting with the business owner. We review the actual lead-capture and follow-up data from the pilot - what was captured, what alerts fired, what the daily summary looked like, and where the operator follow-up sits. No slides; the data is the artifact.',
  },
  {
    label: 'Day 14',
    title: 'Continue or close',
    body: 'You decide, with the data in front of you. Continue means a written next-month scope, billed on the same currency channel. Close means we hand over everything we built (the Sheet, the alert config, the summary template) and step back. Either way, you keep the artifacts.',
  },
];

const PROVIDE_LIST = [
  'Login or forwarding access for one lead source (form, mailbox, WhatsApp, or Google Form)',
  'An owner notification channel: email, SMS, or WhatsApp',
  'Access to a single Google Sheet (we share, you own)',
  'A 30-minute review meeting on Day 13',
];

const NOT_ASKED_LIST = [
  'No card or banking details on this website',
  'No deep CRM credentials',
  'No production database access',
  'No long-term commitments before the pilot review',
];

export default function OnboardingPage() {
  return (
    <PublicPolicyLayout
      title="Client onboarding"
      description="The first fourteen days of a CorpFlowAI engagement, day by day. Operator review, written scoping, 48-hour setup, seven-day operator-watched pilot, review meeting, continue or close."
      width="wide"
    >
      <p style={ts.lead}>
        This is what the first two weeks of a CorpFlowAI engagement look like. Each step
        below is real work that a person does &mdash; nothing is auto-routed, nothing is
        templated past the point where templating would do harm. If a step is going to
        slip, we tell you on the day it slips, not at the end.
      </p>

      <section style={ps.section}>
        <p style={ts.sectionLabel}>The first 14 days</p>
        <h2 style={ps.h2}>From intake to continue-or-close</h2>

        <div style={ts.visualFrame}>
          <img
            src="/assets/visuals/corpflow-onboarding-journey.svg"
            alt="CorpFlowAI 14-day onboarding timeline: day 0 intake, day 1 operator review, day 2 decision and scoping, days 3-5 48-hour setup, days 6-12 operator-watched pilot, day 13 review with the owner, day 14 continue or close."
            width={1080}
            height={260}
            loading="lazy"
            style={{ width: '100%', height: 'auto', display: 'block', maxWidth: '100%' }}
          />
        </div>

        <ol style={{ listStyle: 'none', padding: 0, margin: '20px 0 8px', display: 'grid', gap: 14 }}>
          {STEPS.map((s) => (
            <li key={s.label} style={ts.card}>
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
                  {s.label.toUpperCase()}
                </span>
                <h3 style={{ ...ts.cardTitle, margin: 0 }}>{s.title}</h3>
              </div>
              <p style={ts.cardBody}>{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <p style={ts.sectionLabel}>What we ask for, and what we do not</p>
        <h2 style={ps.h2}>Access boundaries</h2>
        <p style={ps.p}>
          A CorpFlowAI pilot is intentionally low-access. If a pilot would need more than
          this list, we say so on Day 2 (in writing) and you decide whether to proceed
          before any payment is taken.
        </p>

        <div style={ts.twoColumn}>
          <div style={ts.doCard}>
            <p style={{ ...ts.doDontTitle, color: '#5eead4' }}>What you provide</p>
            <ul style={ts.doDontList}>
              {PROVIDE_LIST.map((item) => (
                <li key={item} style={{ marginBottom: 6 }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div style={ts.dontCard}>
            <p style={{ ...ts.doDontTitle, color: '#fda4af' }}>What we do not ask for</p>
            <ul style={ts.doDontList}>
              {NOT_ASKED_LIST.map((item) => (
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
        <p style={ts.sectionLabel}>What &ldquo;pilot complete&rdquo; means</p>
        <h2 style={ps.h2}>Done is defined before we start</h2>
        <p style={ps.p}>
          A pilot is complete when all four conditions below are true. We confirm them
          together at the Day 13 review meeting; the continue-or-close decision is made
          after that, not before.
        </p>
        <ul style={ps.ul}>
          <li>One lead source has been captured live for at least 5 business days</li>
          <li>The owner has received at least one real alert and at least one real daily summary</li>
          <li>The Google Sheet log is up to date and owned by the client</li>
          <li>The Day 13 review meeting has taken place with the owner</li>
        </ul>
        <p style={ps.p}>
          What happens after Day 14 is a separate decision. If we continue, the next
          month&rsquo;s scope is written down before any further invoice. If we close, the
          artifacts are yours and we step back cleanly.
        </p>
      </section>

      <hr style={ts.divider} />

      <section style={ps.section}>
        <div style={ts.ctaRow}>
          <Link href="/lead-rescue" style={ts.ctaPrimary}>
            Submit intake &rarr;
          </Link>
          <Link href="/process" style={ts.ctaSecondary}>
            See the engagement process
          </Link>
          <Link href="/standards" style={ts.ctaSecondary}>
            Operational standards
          </Link>
        </div>
      </section>
    </PublicPolicyLayout>
  );
}

/**
 * Living Word Mauritius — visual sandbox page (`/site-preview`).
 *
 * Tenant-scoped, host-gated, `noindex,nofollow`, conservatively-worded
 * test environment used to exercise the chatbot, future scheduling logic,
 * future AI features, and future process-routing work without touching the
 * external WordPress site.
 *
 * URL (only meaningful host):
 *   https://living-word-mauritius.corpflowai.com/site-preview
 *
 * On any other host this route returns `notFound: true`. See
 * `artifacts/quality-audits/2026-06-11-living-word-mauritius/visual-sandbox-plan.md`
 * for the full plan and safety rationale.
 *
 * The chat widget bundle loads via the same `/api/chat-widget/loader.js` endpoint
 * used by `/chat-widget-demo`. The widget remains `enabled = false` server-side
 * for this tenant, so the loader returns the no-op disabled stub on the sandbox
 * unless an explicit operator-controlled enable window flips it.
 */

import Head from 'next/head';

import {
  SANDBOX_BANNER,
  SANDBOX_SECTIONS,
} from '../lib/sandbox/living-word-sandbox-content.js';
import {
  PLACEHOLDER_SCHEDULE,
} from '../lib/sandbox/living-word-schedule-shape.js';
import { TestEnvironmentRibbon } from '../lib/sandbox/test-environment-ribbon.js';

const TEST_RIBBON_MESSAGE =
  'TEST ENVIRONMENT \u2014 Not the live Living Word Mauritius website';

const ALLOWED_HOSTS = new Set([
  'living-word-mauritius.corpflowai.com',
]);

const SANDBOX_TENANT_ID = 'living-word-mauritius';

const COLOURS = {
  background: '#FAFAFA',
  text: '#111',
  muted: '#555',
  border: '#E5E7EB',
  banner_bg: '#FEF3C7',
  banner_border: '#F59E0B',
  banner_text: '#92400E',
  accent: '#1E3A8A',
  card_bg: '#FFFFFF',
  card_border: '#E5E7EB',
  warning_bg: '#FEE2E2',
  warning_border: '#FCA5A5',
  warning_text: '#7F1D1D',
};

export async function getServerSideProps(ctx) {
  const rawHost = ctx?.req?.headers?.host || '';
  const host = String(rawHost).toLowerCase().split(':')[0];
  if (!ALLOWED_HOSTS.has(host)) {
    return { notFound: true };
  }
  const placeholderCount = PLACEHOLDER_SCHEDULE.length;
  return {
    props: {
      tenantId: SANDBOX_TENANT_ID,
      host,
      placeholderCount,
    },
  };
}

function SandboxBanner({ children }) {
  return (
    <div
      style={{
        background: COLOURS.warning_bg,
        border: `2px solid ${COLOURS.warning_border}`,
        color: COLOURS.warning_text,
        padding: '12px 16px',
        borderRadius: 8,
        margin: '0 0 16px',
        fontSize: 13,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
}

function SectionBlock({ section }) {
  return (
    <section
      id={section.id}
      style={{
        background: COLOURS.card_bg,
        border: `1px solid ${COLOURS.card_border}`,
        borderRadius: 10,
        padding: '20px 22px',
        margin: '16px 0',
      }}
    >
      <SandboxBanner>{SANDBOX_BANNER}</SandboxBanner>
      <h2 style={{ fontSize: 20, margin: '0 0 8px', color: COLOURS.text }}>{section.title}</h2>
      <p style={{ margin: '0 0 12px', color: COLOURS.muted, lineHeight: 1.55 }}>
        {section.body}
      </p>
      {section.chatCta ? (
        <p style={{ margin: 0, fontSize: 13, color: COLOURS.accent, fontWeight: 600 }}>
          → {section.chatCta} (opens via the chat bubble when enabled).
        </p>
      ) : null}
    </section>
  );
}

function ScheduleBlock({ entries }) {
  return (
    <section
      id="schedule-fixtures"
      style={{
        background: COLOURS.card_bg,
        border: `1px dashed ${COLOURS.card_border}`,
        borderRadius: 10,
        padding: '20px 22px',
        margin: '16px 0',
      }}
    >
      <SandboxBanner>
        Schedule placeholder entries — operator-only fixtures for testing the schedule
        data shape. Not real event listings.
      </SandboxBanner>
      <h2 style={{ fontSize: 20, margin: '0 0 8px', color: COLOURS.text }}>
        Schedule fixtures (placeholder)
      </h2>
      <p style={{ margin: '0 0 12px', color: COLOURS.muted, fontSize: 14 }}>
        These entries exercise the future-ready schedule data shape (see{' '}
        <code>lib/sandbox/living-word-schedule-shape.js</code>). Every entry is{' '}
        <code>approved: false</code> and <code>source: &apos;placeholder&apos;</code>.
        They are <strong>not</strong> real services, events, or programmes.
      </p>
      <ul style={{ paddingLeft: 18, margin: 0, color: COLOURS.text }}>
        {entries.map((e) => (
          <li key={e.id} style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>{e.title}</span>{' '}
            <span style={{ color: COLOURS.muted, fontSize: 13 }}>
              ({e.category} · {e.recurrence} · approval pending — not for public use)
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function SitePreviewPage({ tenantId, host, placeholderCount }) {
  return (
    <>
      <Head>
        <title>Living Word Mauritius — CorpFlow sandbox (test environment)</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta
          name="description"
          content="CorpFlow test environment for Living Word Mauritius. Not the church website."
        />
        <script
          async
          src="/api/chat-widget/loader.js"
          data-flow="default"
          data-position="bottom-right"
        />
      </Head>

      {/*
        Persistent high-visibility test-environment ribbon. Fixed at the top of
        the viewport, non-dismissible, sits above the chat widget panel
        (z-index 2147483640 vs widget panel 2147483601). See
        lib/sandbox/test-environment-ribbon.js for the posture rule.
      */}
      <TestEnvironmentRibbon message={TEST_RIBBON_MESSAGE} />

      <div
        style={{
          minHeight: '100vh',
          background: COLOURS.background,
          color: COLOURS.text,
          font: '15px/1.55 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          // Top padding clears the fixed ribbon. 80px handles the 2-line wrap
          // case on narrow mobile viewports (~320px wide) where the ribbon
          // text wraps to two lines at 14px font.
          padding: '80px 16px 64px',
        }}
      >
        <main style={{ maxWidth: 720, margin: '0 auto' }}>
          <header style={{ marginBottom: 24 }}>
            <h1 style={{ fontSize: 28, margin: '0 0 4px', color: COLOURS.text }}>
              Living Word Mauritius — sandbox preview
            </h1>
            <p style={{ margin: '0 0 4px', color: COLOURS.muted, fontSize: 14 }}>
              CorpFlow internal test surface · tenant <code>{tenantId}</code> · host{' '}
              <code>{host}</code>
            </p>
            <p style={{ margin: 0, color: COLOURS.muted, fontSize: 13 }}>
              Used for chatbot, AI, scheduling, and process-routing iteration. Not
              indexed. Not the church website.
            </p>
          </header>

          <nav
            aria-label="Sandbox sections"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              margin: '0 0 24px',
              fontSize: 13,
            }}
          >
            {SANDBOX_SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  color: COLOURS.accent,
                  textDecoration: 'none',
                  border: `1px solid ${COLOURS.border}`,
                  borderRadius: 999,
                  padding: '4px 12px',
                  background: '#FFF',
                }}
              >
                {s.title}
              </a>
            ))}
            <a
              href="#schedule-fixtures"
              style={{
                color: COLOURS.accent,
                textDecoration: 'none',
                border: `1px solid ${COLOURS.border}`,
                borderRadius: 999,
                padding: '4px 12px',
                background: '#FFF',
              }}
            >
              Schedule fixtures
            </a>
          </nav>

          {SANDBOX_SECTIONS.map((s) => (
            <SectionBlock key={s.id} section={s} />
          ))}

          <ScheduleBlock entries={PLACEHOLDER_SCHEDULE} />

          <footer
            style={{
              color: COLOURS.muted,
              fontSize: 12,
              marginTop: 32,
              paddingTop: 16,
              borderTop: `1px solid ${COLOURS.border}`,
            }}
          >
            <p style={{ margin: '0 0 6px' }}>
              CorpFlow sandbox · {placeholderCount} placeholder schedule entries · widget
              kill-switch is independent of this page.
            </p>
            <p style={{ margin: 0 }}>
              For real Living Word Mauritius information, visit{' '}
              <code>livingwordmauritius.com</code>.
            </p>
          </footer>
        </main>
      </div>
    </>
  );
}

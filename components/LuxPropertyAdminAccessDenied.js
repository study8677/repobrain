import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

/**
 * Stable 403-style screen when a Lux tenant session exists but the account is not on the property-editor allowlist.
 * Avoids redirecting to `/login` (which would auto-bounce back here and flash).
 *
 * @param {{ signedInUsername?: string | null, signedInTenantId?: string | null, variant?: 'not_editor' | 'wrong_session' }} props
 */
export default function LuxPropertyAdminAccessDenied({ signedInUsername, signedInTenantId, variant = 'not_editor' }) {
  const u = signedInUsername != null && String(signedInUsername).trim() ? String(signedInUsername).trim() : null;
  const tid = signedInTenantId != null && String(signedInTenantId).trim() ? String(signedInTenantId).trim() : null;
  const wrongSession = variant === 'wrong_session';

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        minHeight: '100vh',
        background: T.pageBg,
        color: T.ink,
        padding: '48px 24px',
      }}
    >
      <Head>
        <title>Property desk access · Luxurious Mauritius</title>
      </Head>
      <main style={{ maxWidth: 560, margin: '0 auto' }}>
        <p style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 800 }}>
          Property desk
        </p>
        <h1 style={{ margin: '12px 0 0', fontFamily: T.fontDisplay, fontSize: 28, color: T.heroDeep }}>
          {wrongSession ? 'Wrong sign-in for this desk' : 'Access not enabled'}
        </h1>
        <p style={{ marginTop: 16, fontSize: 16, lineHeight: 1.65, color: T.inkMuted }}>
          {wrongSession ? (
            <>
              This sign-in cannot open the property desk on this site. Use a <strong>LuxeMaurice tenant staff</strong> login
              from this hostname, or continue in the Change Console if you are already in the right workspace.
            </>
          ) : (
            <>
              You are signed in, but this account is not enabled as a LuxeMaurice property editor. The property desk is limited to
              specific staff logins so listing changes stay governed.
            </>
          )}
        </p>
        <div
          style={{
            marginTop: 24,
            padding: 16,
            borderRadius: T.radiusMd,
            border: `1px solid ${T.border}`,
            background: T.white,
            fontSize: 14,
            color: T.ink,
          }}
        >
          {wrongSession && !u ? (
            <p style={{ margin: 0 }}>
              <strong>Session type</strong> — this desk requires a LuxeMaurice <strong>tenant</strong> email and password login (or
              an editor-enabled one). Factory admin or other login types cannot open this page.
            </p>
          ) : u ? (
            <p style={{ margin: 0 }}>
              <strong>Signed in as</strong> {u}
            </p>
          ) : (
            <p style={{ margin: 0 }}>
              <strong>Signed in with PIN only</strong> — the property desk needs an email and password login so your identity
              can be checked. Use Sign out, then sign in with the email and password your operator issued.
            </p>
          )}
          {tid ? (
            <p style={{ margin: '10px 0 0', fontSize: 13, color: T.inkMuted }}>
              {wrongSession ? (
                <>
                  Session workspace: <strong style={{ color: T.ink }}>{tid}</strong>
                  <span style={{ display: 'block', marginTop: 6 }}>This page is only for the LuxeMaurice tenant on this hostname.</span>
                </>
              ) : (
                <>
                  Workspace: <strong style={{ color: T.ink }}>{tid}</strong>
                </>
              )}
            </p>
          ) : null}
        </div>
        {!wrongSession ? (
          <p style={{ marginTop: 20, fontSize: 14, lineHeight: 1.6, color: T.inkMuted }}>
            Need access? Ask your CorpFlow operator to add your staff email to the property editor allowlist in code, or use an
            already-enabled editor account.
          </p>
        ) : null}
        <div style={{ marginTop: 28, display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
          <button
            type="button"
            onClick={async () => {
              try {
                await fetch('/api/auth/logout', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: '{}',
                });
              } catch {
                /* ignore */
              }
              window.location.href = '/login?next=%2Fproperties%2Fadmin';
            }}
            style={{
              padding: '10px 18px',
              borderRadius: T.radiusMd,
              border: `1px solid ${T.border}`,
              background: T.white,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer',
              color: T.ink,
            }}
          >
            Sign out
          </button>
          <Link
            href="/change"
            style={{
              fontWeight: 750,
              color: T.goldDeep,
              textDecoration: 'none',
              fontSize: 15,
            }}
          >
            Open Change Console →
          </Link>
        </div>
      </main>
    </div>
  );
}

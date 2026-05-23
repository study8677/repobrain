import React from 'react';
import Link from 'next/link';

const linkStyle = { color: '#7dd3fc', textDecoration: 'none' };

export default function PublicSiteFooter({ extra }) {
  return (
    <footer style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.12)', fontSize: 12, color: '#9fb2c8', lineHeight: 1.65 }}>
      {extra ? <div style={{ marginBottom: 12 }}>{extra}</div> : null}
      <div>
        <Link href="/lead-rescue" style={linkStyle}>
          AI Lead Rescue
        </Link>
        {' · '}
        <Link href="/about" style={linkStyle}>
          About
        </Link>
        {' · '}
        <Link href="/process" style={linkStyle}>
          Process
        </Link>
        {' · '}
        <Link href="/standards" style={linkStyle}>
          Standards
        </Link>
        {' · '}
        <Link href="/onboarding" style={linkStyle}>
          Onboarding
        </Link>
        {' · '}
        <Link href="/contact" style={linkStyle}>
          Contact
        </Link>
        {' · '}
        <Link href="/privacy" style={linkStyle}>
          Privacy
        </Link>
        {' · '}
        <Link href="/terms" style={linkStyle}>
          Terms
        </Link>
        {' · '}
        <Link href="/refund-policy" style={linkStyle}>
          Refund policy
        </Link>
        {' · '}
        <Link href="/login" style={linkStyle}>
          Client login
        </Link>
      </div>
      <div style={{ marginTop: 12 }}>
        This website provides general service information. Final terms may be confirmed in the applicable invoice or
        service agreement. We do not guarantee new revenue. Results vary by business and lead volume. This is not legal,
        tax, or accounting advice.
      </div>
    </footer>
  );
}


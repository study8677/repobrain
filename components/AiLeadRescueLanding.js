import React, { useMemo, useState } from 'react';
import Head from 'next/head';

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #06111f 0%, #0b1f33 45%, #101827 100%)',
    color: '#eef6ff',
    fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  shell: { maxWidth: 1120, margin: '0 auto', padding: '42px 20px 56px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.16)', borderRadius: 999, padding: '8px 12px', background: 'rgba(255,255,255,0.06)', color: '#c6d7ea', fontSize: 13 },
  hero: { marginTop: 44, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, alignItems: 'start' },
  h1: { margin: 0, fontSize: 'clamp(38px, 7vw, 76px)', lineHeight: 0.96, letterSpacing: '-0.055em', maxWidth: 790 },
  lead: { marginTop: 20, fontSize: 'clamp(17px, 2vw, 22px)', lineHeight: 1.55, color: '#c9d8e8', maxWidth: 760 },
  card: { border: '1px solid rgba(255,255,255,0.13)', borderRadius: 26, background: 'rgba(255,255,255,0.07)', boxShadow: '0 24px 80px rgba(0,0,0,0.28)', padding: 22, backdropFilter: 'blur(14px)' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 },
  cta: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: '13px 16px', border: 0, fontWeight: 800, cursor: 'pointer', textDecoration: 'none' },
  primary: { background: '#2dd4bf', color: '#031018' },
  secondary: { background: 'rgba(255,255,255,0.09)', color: '#eef6ff', border: '1px solid rgba(255,255,255,0.15)' },
  section: { marginTop: 28 },
  label: { fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7dd3fc', fontWeight: 800 },
  h2: { margin: '8px 0 0', fontSize: 30, letterSpacing: '-0.03em' },
  muted: { color: '#aebfd1', lineHeight: 1.65 },
  list: { margin: '14px 0 0', paddingLeft: 18, color: '#d6e4f2', lineHeight: 1.8 },
  tabButton: { borderRadius: 999, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#c9d8e8', padding: '10px 14px', fontWeight: 750, cursor: 'pointer' },
  activeTab: { background: '#2dd4bf', color: '#031018', borderColor: '#2dd4bf' },
  input: { width: '100%', boxSizing: 'border-box', padding: '11px 12px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.20)', color: '#eef6ff' },
};

const regionCopy = {
  mauritius: {
    title: 'Mauritius businesses',
    price: 'from MUR 6,900',
    subtitle: 'For local SMBs that want a simple lead capture, alert, and follow-up system with Mauritius payment/accounting flow.',
    payments: ['SMB Mauritius payment path', 'Local invoice', 'MUR pricing'],
    cta: 'Start Mauritius intake',
  },
  international: {
    title: 'International businesses',
    price: 'from USD 150',
    subtitle: 'For businesses outside Mauritius that want the same 48-hour setup with international payment rails.',
    payments: ['PayPal', 'Google Pay where available', 'Wise', 'USD pricing'],
    cta: 'Start international intake',
  },
};

function RegionCard({ active, region, onSelect }) {
  const c = regionCopy[region];
  return (
    <div style={{ ...styles.card, outline: active ? '2px solid #2dd4bf' : 'none' }}>
      <div style={styles.label}>{region === 'mauritius' ? 'Domestic path' : 'International path'}</div>
      <h3 style={{ margin: '8px 0 0', fontSize: 24 }}>{c.title}</h3>
      <div style={{ marginTop: 8, color: '#2dd4bf', fontWeight: 850, fontSize: 22 }}>{c.price}</div>
      <p style={styles.muted}>{c.subtitle}</p>
      <ul style={styles.list}>
        {c.payments.map((p) => <li key={p}>{p}</li>)}
      </ul>
      <button type="button" onClick={() => onSelect(region)} style={{ ...styles.cta, ...styles.primary, marginTop: 16, width: '100%' }}>
        {c.cta}
      </button>
    </div>
  );
}

export default function AiLeadRescueLanding({ host = '' }) {
  const [region, setRegion] = useState('mauritius');
  const selected = useMemo(() => regionCopy[region], [region]);

  async function submitLead(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const payload = {
      name: String(fd.get('name') || '').trim(),
      email: String(fd.get('email') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      intent: String(fd.get('message') || '').trim(),
      meta: {
        product: 'ai-lead-rescue',
        region_path: region,
        business_name: String(fd.get('business_name') || '').trim(),
        lead_sources: String(fd.get('lead_sources') || '').trim(),
        preferred_payment_path: region === 'mauritius' ? 'SMB Mauritius' : 'PayPal / Google Pay / Wise',
        host,
        page: '/lead-rescue',
      },
    };
    try {
      const r = await fetch('/api/tenant/intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error('intake_failed');
      alert('Thank you — your AI Lead Rescue intake was submitted. We will contact you shortly.');
      form.reset();
    } catch {
      alert('Could not submit the intake. Please contact us directly or try again shortly.');
    }
  }

  return (
    <div style={styles.page}>
      <Head>
        <title>AI Lead Rescue · Powered by CorpFlowAI</title>
        <meta name="description" content="48-hour lead capture, instant alerts, follow-up logging, and daily lead summaries for small businesses." />
      </Head>
      <main style={styles.shell}>
        <nav style={styles.nav}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 22 }}>AI Lead Rescue</div>
            <div style={{ color: '#9fb2c8', fontSize: 13 }}>Powered by CorpFlowAI</div>
          </div>
          <a style={{ ...styles.cta, ...styles.secondary }} href="#intake">Start the 48-hour setup</a>
        </nav>

        <section style={styles.hero}>
          <div>
            <span style={styles.badge}>48-hour setup · lead capture · instant alerts · follow-up log</span>
            <h1 style={styles.h1}>Stop losing leads because follow-up is too slow.</h1>
            <p style={styles.lead}>
              AI Lead Rescue captures new enquiries, alerts the owner instantly, logs follow-ups, and gives a simple daily lead summary — without forcing you to rebuild your website or CRM.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 24 }}>
              <a style={{ ...styles.cta, ...styles.primary }} href="#payment-paths">Choose payment path</a>
              <a style={{ ...styles.cta, ...styles.secondary }} href="#how-it-works">How it works</a>
            </div>
          </div>

          <aside style={styles.card}>
            <div style={styles.label}>Launch offer</div>
            <h2 style={{ ...styles.h2, fontSize: 28 }}>Pilot setup from $150 / MUR 6,900</h2>
            <ul style={styles.list}>
              <li>Lead intake or form capture</li>
              <li>Owner alert through Telegram/email path</li>
              <li>Google Sheet lead log</li>
              <li>Follow-up status board</li>
              <li>Daily lead summary</li>
              <li>7 days of monitoring</li>
            </ul>
            <p style={{ ...styles.muted, fontSize: 13 }}>
              First pilots are intentionally simple: no CRM rebuild, no website rebuild, no long strategy project.
            </p>
          </aside>
        </section>

        <section id="payment-paths" style={styles.section}>
          <div style={styles.label}>Two payment/accounting paths</div>
          <h2 style={styles.h2}>One offer, separate domestic and international routes.</h2>
          <p style={styles.muted}>
            We keep the brand and delivery simple while separating Mauritius and international payment/accounting flows.
          </p>
          <div style={{ ...styles.grid, marginTop: 16 }}>
            <RegionCard region="mauritius" active={region === 'mauritius'} onSelect={setRegion} />
            <RegionCard region="international" active={region === 'international'} onSelect={setRegion} />
          </div>
        </section>

        <section id="how-it-works" style={styles.section}>
          <div style={styles.grid}>
            <div style={styles.card}>
              <div style={styles.label}>Step 1</div>
              <h3>Connect your lead source</h3>
              <p style={styles.muted}>We start with what you already use: your website form, email inbox, WhatsApp/manual intake, or a lightweight Google Form.</p>
            </div>
            <div style={styles.card}>
              <div style={styles.label}>Step 2</div>
              <h3>Alert and log every enquiry</h3>
              <p style={styles.muted}>New enquiries are logged and pushed to the business owner or operator so follow-up can happen quickly.</p>
            </div>
            <div style={styles.card}>
              <div style={styles.label}>Step 3</div>
              <h3>Daily summary and follow-up board</h3>
              <p style={styles.muted}>A daily summary keeps the owner aware of open leads, stale follow-ups, and missed opportunities.</p>
            </div>
          </div>
        </section>

        <section id="intake" style={styles.section}>
          <div style={{ ...styles.card, maxWidth: 760 }}>
            <div style={styles.label}>Start intake</div>
            <h2 style={styles.h2}>{selected.title}: {selected.price}</h2>
            <p style={styles.muted}>Selected payment route: {selected.payments.join(' / ')}.</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              {Object.keys(regionCopy).map((r) => (
                <button key={r} type="button" onClick={() => setRegion(r)} style={{ ...styles.tabButton, ...(region === r ? styles.activeTab : {}) }}>
                  {regionCopy[r].title}
                </button>
              ))}
            </div>
            <form onSubmit={submitLead} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
              <input required name="business_name" placeholder="Business name" style={styles.input} />
              <input required name="name" placeholder="Your name" style={styles.input} />
              <input required type="email" name="email" placeholder="Email" style={styles.input} />
              <input name="phone" placeholder="Phone / WhatsApp" style={styles.input} />
              <input name="lead_sources" placeholder="Where do leads arrive now? Website, email, WhatsApp, Facebook..." style={styles.input} />
              <textarea required name="message" rows="4" placeholder="What lead follow-up problem should we fix first?" style={styles.input} />
              <button type="submit" style={{ ...styles.cta, ...styles.primary }}>Request AI Lead Rescue setup</button>
            </form>
            <p style={{ ...styles.muted, fontSize: 12 }}>
              Payment links/invoice details are issued after intake review. Do not enter card or banking details on this page.
            </p>
          </div>
        </section>

        <footer style={{ marginTop: 36, color: '#9fb2c8', fontSize: 12, lineHeight: 1.6 }}>
          AI Lead Rescue is powered by CorpFlowAI. Payment paths are separated for Mauritius and international clients. This page collects intake only; payment is handled through the appropriate route after review. Results vary by business and lead volume; this is not legal, tax, or accounting advice.
        </footer>
      </main>
    </div>
  );
}

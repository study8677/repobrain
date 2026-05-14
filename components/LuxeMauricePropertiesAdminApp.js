import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';
import { LUX_PARENT_PROGRAMME_TICKET_ID } from '../lib/cmp/_lib/lux-client-requests.js';

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

async function cmpLux(action, body) {
  const r = await fetch(`/api/cmp/router?action=${encodeURIComponent(action)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body && typeof body === 'object' ? body : {}),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = j.error || j.hint || j.detail || `http_${r.status}`;
    throw new Error(msg);
  }
  return j;
}

const VIS_OPTIONS = ['draft', 'preview', 'published', 'archived'];
const SLOT_OPTIONS = ['hero', 'card', 'gallery', 'reference'];

function emptyForm() {
  return {
    id: '',
    slug: '',
    title: '',
    region_label: '',
    property_type: '',
    listing_status: '',
    price_range: '',
    short_teaser: '',
    description: '',
    highlights_text: '',
    bedrooms: '',
    bathrooms: '',
    area_sqm: '',
    visibility_status: 'draft',
  };
}

function listingToForm(row) {
  const hl = Array.isArray(row.highlights) ? row.highlights.join('\n') : '';
  return {
    id: safeStr(row.id),
    slug: safeStr(row.slug),
    title: safeStr(row.title),
    region_label: safeStr(row.region_label),
    property_type: safeStr(row.property_type),
    listing_status: row.listing_status != null ? safeStr(row.listing_status) : '',
    price_range: row.price_range != null ? safeStr(row.price_range) : '',
    short_teaser: row.short_teaser != null ? safeStr(row.short_teaser) : '',
    description: row.description != null ? String(row.description) : '',
    highlights_text: hl,
    bedrooms: row.bedrooms != null ? String(row.bedrooms) : '',
    bathrooms: row.bathrooms != null ? String(row.bathrooms) : '',
    area_sqm: row.area_sqm != null ? String(row.area_sqm) : '',
    visibility_status: safeStr(row.visibility_status) || 'draft',
  };
}

export default function LuxeMauricePropertiesAdminApp() {
  const [listings, setListings] = useState([]);
  const [counts, setCounts] = useState({ draft: 0, preview: 0, published: 0, archived: 0 });
  const [form, setForm] = useState(emptyForm());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [mediaTicket, setMediaTicket] = useState(LUX_PARENT_PROGRAMME_TICKET_ID);
  const [mediaAttachment, setMediaAttachment] = useState('');
  const [mediaSlot, setMediaSlot] = useState('hero');

  const canLinkMedia = useMemo(() => Boolean(safeStr(form.slug)), [form.slug]);

  const reload = useCallback(async () => {
    const j = await cmpLux('lux-listing-admin-list', {});
    setListings(Array.isArray(j.listings) ? j.listings : []);
    setCounts(
      j.counts && typeof j.counts === 'object' ? j.counts : { draft: 0, preview: 0, published: 0, archived: 0 },
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await reload();
      } catch (e) {
        setError(String(e?.message || e));
      }
    })();
  }, [reload]);

  async function loadListing(id) {
    setError('');
    setStatusMsg('');
    setBusy(true);
    try {
      const j = await cmpLux('lux-listing-admin-get', { id });
      if (j.listing) setForm(listingToForm(j.listing));
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function onSave(e) {
    e.preventDefault();
    setError('');
    setStatusMsg('');
    setBusy(true);
    try {
      const highlights = safeStr(form.highlights_text)
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 24);
      const body = {
        id: safeStr(form.id) || undefined,
        slug: safeStr(form.slug) || undefined,
        title: safeStr(form.title),
        region_label: safeStr(form.region_label),
        property_type: safeStr(form.property_type),
        listing_status: safeStr(form.listing_status) || null,
        price_range: safeStr(form.price_range) || null,
        short_teaser: safeStr(form.short_teaser) || null,
        description: form.description,
        highlights,
        bedrooms: safeStr(form.bedrooms) || null,
        bathrooms: safeStr(form.bathrooms) || null,
        area_sqm: safeStr(form.area_sqm) || null,
        visibility_status: safeStr(form.visibility_status) || 'draft',
      };
      const j = await cmpLux('lux-listing-admin-save', body);
      if (j.listing) setForm(listingToForm(j.listing));
      setStatusMsg('Saved.');
      await reload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function onQuickVisibility(vis) {
    if (!safeStr(form.id)) {
      setError('Save the listing first to set visibility.');
      return;
    }
    setError('');
    setStatusMsg('');
    setBusy(true);
    try {
      const j = await cmpLux('lux-listing-admin-set-visibility', { id: form.id, visibility_status: vis });
      if (j.listing) setForm(listingToForm(j.listing));
      setStatusMsg(`Visibility: ${vis}`);
      await reload();
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  async function mediaAction(action) {
    if (!canLinkMedia) {
      setError('Save a draft with a slug before linking media.');
      return;
    }
    const ticket_id = safeStr(mediaTicket);
    const attachment_id = safeStr(mediaAttachment);
    if (!ticket_id || !attachment_id) {
      setError('Programme ticket id and attachment id are required.');
      return;
    }
    setError('');
    setStatusMsg('');
    setBusy(true);
    try {
      const base = {
        ticket_id,
        attachment_id,
        property_slug: safeStr(form.slug),
        intended_slot: mediaSlot,
      };
      if (action === 'lux-attachment-property-link-set') {
        await cmpLux(action, { ...base, link_note: null });
      } else if (action === 'lux-attachment-property-link-remove') {
        await cmpLux(action, base);
      } else if (action === 'lux-attachment-property-publish' || action === 'lux-attachment-property-unpublish') {
        await cmpLux(action, base);
      }
      setStatusMsg('Media action completed. Refresh Change Console to confirm.');
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        fontFamily: T.fontUi,
        minHeight: '100vh',
        background: T.pageBg,
        color: T.ink,
      }}
    >
      <Head>
        <title>Property desk · Luxurious Mauritius</title>
      </Head>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          padding: '18px 28px',
          background: T.white,
          borderBottom: `1px solid ${T.border}`,
        }}
      >
        <Link
          href="/properties"
          style={{
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: T.goldDeep,
            textDecoration: 'none',
            fontWeight: 750,
          }}
        >
          ← Properties
        </Link>
        <span style={{ fontSize: 11, color: T.inkMuted, fontWeight: 650 }}>Private acquisitions desk</span>
      </header>

      <main style={{ maxWidth: 1120, margin: '0 auto', padding: '32px 24px 80px', display: 'grid', gap: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontFamily: T.fontDisplay, fontSize: 32, color: T.heroDeep }}>Property content</h1>
          <p style={{ margin: '10px 0 0', maxWidth: 720, fontSize: 16, lineHeight: 1.6, color: T.inkMuted }}>
            Curate listings for Luxurious Mauritius. Nothing here publishes itself — choose visibility explicitly. Media stays
            under the same review and publish rules as the Change Console.
          </p>
        </div>

        {error ? (
          <div
            style={{
              padding: 14,
              borderRadius: T.radiusMd,
              border: `1px solid ${T.borderStrong}`,
              background: T.white,
              color: T.heroDeep,
              fontWeight: 650,
            }}
          >
            {error}
          </div>
        ) : null}
        {statusMsg ? <div style={{ fontSize: 15, color: T.goldDeep, fontWeight: 700 }}>{statusMsg}</div> : null}

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) 1fr', gap: 24 }}>
          <section
            style={{
              borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`,
              background: T.white,
              padding: 18,
              boxShadow: '0 12px 36px rgba(28,25,23,0.05)',
              alignSelf: 'start',
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: T.goldDeep, fontWeight: 800 }}>
              Inventory
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: T.inkMuted }}>
              Draft {counts.draft} · Preview {counts.preview} · Published {counts.published} · Archived {counts.archived}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setForm(emptyForm());
                setError('');
                setStatusMsg('New listing — fill in fields and save.');
              }}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '10px 12px',
                borderRadius: T.radiusMd,
                border: `1px solid ${T.goldDeep}`,
                background: T.sand,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              New listing
            </button>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420, overflow: 'auto' }}>
              {listings.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  disabled={busy}
                  onClick={() => loadListing(row.id)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: T.radiusMd,
                    border: `1px solid ${T.border}`,
                    background: form.id === row.id ? T.sand : T.white,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 750, fontSize: 14 }}>{safeStr(row.title)}</div>
                  <div style={{ fontSize: 12, color: T.inkMuted }}>
                    {safeStr(row.slug)} · {safeStr(row.visibility_status)}
                  </div>
                </button>
              ))}
            </div>
          </section>

          <section
            style={{
              borderRadius: T.radiusLg,
              border: `1px solid ${T.border}`,
              background: T.white,
              padding: 22,
              boxShadow: '0 12px 36px rgba(28,25,23,0.05)',
            }}
          >
            <form onSubmit={onSave} style={{ display: 'grid', gap: 14 }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.inkMuted }}>Quick visibility</span>
                {VIS_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    disabled={busy}
                    onClick={() => onQuickVisibility(v)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: 999,
                      border: `1px solid ${T.border}`,
                      background: form.visibility_status === v ? T.goldDeep : T.white,
                      color: form.visibility_status === v ? T.white : T.ink,
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Slug (create only)
                  <input
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    disabled={Boolean(safeStr(form.id)) || busy}
                    placeholder="lm-villa-north"
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Title
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Region / location
                  <input
                    value={form.region_label}
                    onChange={(e) => setForm((f) => ({ ...f, region_label: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Property type
                  <input
                    value={form.property_type}
                    onChange={(e) => setForm((f) => ({ ...f, property_type: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Status label
                  <input
                    value={form.listing_status}
                    onChange={(e) => setForm((f) => ({ ...f, listing_status: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Price range
                  <input
                    value={form.price_range}
                    onChange={(e) => setForm((f) => ({ ...f, price_range: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Bedrooms
                  <input
                    value={form.bedrooms}
                    onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Bathrooms
                  <input
                    value={form.bathrooms}
                    onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Area (m²)
                  <input
                    value={form.area_sqm}
                    onChange={(e) => setForm((f) => ({ ...f, area_sqm: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  />
                </label>
                <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                  Visibility (save)
                  <select
                    value={form.visibility_status}
                    onChange={(e) => setForm((f) => ({ ...f, visibility_status: e.target.value }))}
                    style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                  >
                    {VIS_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Teaser
                <textarea
                  value={form.short_teaser}
                  onChange={(e) => setForm((f) => ({ ...f, short_teaser: e.target.value }))}
                  rows={2}
                  style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}`, resize: 'vertical' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={6}
                  style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}`, resize: 'vertical' }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Highlights (one per line)
                <textarea
                  value={form.highlights_text}
                  onChange={(e) => setForm((f) => ({ ...f, highlights_text: e.target.value }))}
                  rows={4}
                  style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}`, resize: 'vertical' }}
                />
              </label>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button
                  type="submit"
                  disabled={busy}
                  style={{
                    padding: '12px 22px',
                    borderRadius: 999,
                    border: 'none',
                    background: T.goldDeep,
                    color: T.white,
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Save listing
                </button>
                {safeStr(form.slug) ? (
                  <Link
                    href={`/property/${encodeURIComponent(form.slug)}?preview=1`}
                    style={{
                      alignSelf: 'center',
                      fontWeight: 750,
                      color: T.goldDeep,
                      textDecoration: 'none',
                    }}
                  >
                    Open private preview →
                  </Link>
                ) : null}
              </div>
            </form>

            <div
              style={{
                marginTop: 28,
                paddingTop: 22,
                borderTop: `1px solid ${T.border}`,
                display: 'grid',
                gap: 12,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 800, color: T.heroDeep }}>Media (governed)</div>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: T.inkMuted }}>
                Attachments live on the programme ticket in the Change Console. Link reviewed images to this listing slug,
                then publish per slot — same rules as operators use today. Upload and review still happen in{' '}
                <Link href="/change" style={{ color: T.goldDeep, fontWeight: 750 }}>
                  /change
                </Link>
                .
              </p>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Programme ticket id
                <input
                  value={mediaTicket}
                  onChange={(e) => setMediaTicket(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: T.radiusMd,
                    border: `1px solid ${T.border}`,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Attachment id
                <input
                  value={mediaAttachment}
                  onChange={(e) => setMediaAttachment(e.target.value)}
                  style={{
                    padding: 10,
                    borderRadius: T.radiusMd,
                    border: `1px solid ${T.border}`,
                    fontFamily: 'ui-monospace, monospace',
                    fontSize: 12,
                  }}
                />
              </label>
              <label style={{ display: 'grid', gap: 6, fontSize: 13, color: T.inkMuted, fontWeight: 650 }}>
                Intended slot
                <select
                  value={mediaSlot}
                  onChange={(e) => setMediaSlot(e.target.value)}
                  style={{ padding: 10, borderRadius: T.radiusMd, border: `1px solid ${T.border}` }}
                >
                  {SLOT_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                <button
                  type="button"
                  disabled={busy || !canLinkMedia}
                  onClick={() => mediaAction('lux-attachment-property-link-set')}
                  style={{ padding: '8px 14px', borderRadius: T.radiusMd, border: `1px solid ${T.border}`, fontWeight: 700 }}
                >
                  Link
                </button>
                <button
                  type="button"
                  disabled={busy || !canLinkMedia}
                  onClick={() => mediaAction('lux-attachment-property-link-remove')}
                  style={{ padding: '8px 14px', borderRadius: T.radiusMd, border: `1px solid ${T.border}`, fontWeight: 700 }}
                >
                  Unlink
                </button>
                <button
                  type="button"
                  disabled={busy || !canLinkMedia}
                  onClick={() => mediaAction('lux-attachment-property-publish')}
                  style={{
                    padding: '8px 14px',
                    borderRadius: T.radiusMd,
                    border: `1px solid ${T.goldDeep}`,
                    fontWeight: 700,
                    color: T.goldDeep,
                  }}
                >
                  Publish slot
                </button>
                <button
                  type="button"
                  disabled={busy || !canLinkMedia}
                  onClick={() => mediaAction('lux-attachment-property-unpublish')}
                  style={{ padding: '8px 14px', borderRadius: T.radiusMd, border: `1px solid ${T.border}`, fontWeight: 700 }}
                >
                  Unpublish slot
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

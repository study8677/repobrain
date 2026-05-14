import React from 'react';

import LuxeMauricePropertyDetailPage from '../../components/LuxeMauricePropertyDetailPage.js';
import { resolveLuxPropertyRef } from '../../lib/client/luxe-maurice-property-resolve.js';
import {
  fetchLuxListingDraftPreviewRow,
  resolveLuxPropertyRefWithPublishedDb,
} from '../../lib/server/lux-listing-published-query.js';
import { collectPublishedLuxPropertyMedia } from '../../lib/server/lux-published-property-media.js';
import { PrismaClient } from '@prisma/client';
import { verifyTenantPreviewToken } from '../../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../../lib/server/ghost-host.js';
import { getSessionFromRequest } from '../../lib/server/session.js';
import { isLuxPropertyEditorSession } from '../../lib/server/lux-property-editor-access.js';

function normalizeHost(req) {
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    return raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

function safeStr(v) {
  return v != null ? String(v).trim() : '';
}

function parseSearchParam(req, name) {
  try {
    const raw = req?.url || '';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    return (u.searchParams.get(name) || '').trim();
  } catch {
    return '';
  }
}

export default function PropertySlugPage({ property, editor_preview }) {
  return <LuxeMauricePropertyDetailPage property={property} editor_preview={editor_preview === true} />;
}

export async function getServerSideProps({ req, params, query }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
  }

  const raw = params?.slug != null ? String(params.slug).trim() : '';
  if (!raw || raw.length > 80) {
    return { notFound: true };
  }

  const prisma = new PrismaClient();
  try {
    if (!host) {
      return { notFound: true };
    }

    const root = String(process.env.CORPFLOW_ROOT_DOMAIN || 'corpflowai.com')
      .toLowerCase()
      .replace(/^\./, '')
      .trim();
    if (host === root || host === `www.${root}`) {
      return { notFound: true };
    }

    const row = await prisma.tenantHostname.findUnique({
      where: { host },
      select: { tenantId: true, enabled: true },
    });
    let tenantId = row && row.enabled === true ? safeStr(row.tenantId) : '';
    if (!tenantId) {
      const cfPreview = parseSearchParam(req, 'cf_preview');
      if (cfPreview) {
        const verified = verifyTenantPreviewToken(cfPreview);
        if (verified.ok) {
          const tExists = await prisma.tenant.findUnique({
            where: { tenantId: verified.tenantId },
            select: { tenantId: true },
          });
          if (tExists?.tenantId) tenantId = safeStr(tExists.tenantId);
        }
      }
    }

    if (tenantId !== 'luxe-maurice') {
      return { notFound: true };
    }

    const preview = query && String(query.preview || '') === '1';
    if (preview) {
      const sess = getSessionFromRequest(req);
      if (!sess.ok || !isLuxPropertyEditorSession(sess.payload)) {
        return { notFound: true };
      }
      const row = await fetchLuxListingDraftPreviewRow(prisma, raw);
      if (!row) {
        return { notFound: true };
      }
      const customHl = Array.isArray(row.highlightsJson)
        ? row.highlightsJson.map((h) => String(h).trim()).filter(Boolean).slice(0, 12)
        : [];
      const desc = row.description != null ? String(row.description).trim() : '';
      const teaser = row.shortTeaser != null ? String(row.shortTeaser).trim() : '';
      const defaultHighlights = [
        `${row.propertyType} · ${row.regionLabel}`,
        'Availability and private previews are arranged through the concierge.',
        'Nothing on this page is an offer; terms are agreed in writing when you proceed.',
      ];
      const resolved = {
        discovery_source: 'lux_postgres',
        ref: row.slug,
        title: row.title,
        location: row.regionLabel,
        property_type: row.propertyType,
        status: row.listingStatus || null,
        price_range: row.priceRange != null ? String(row.priceRange).trim() : null,
        summary_text: teaser || desc.slice(0, 400) || `${row.title} — ${row.regionLabel}.`,
        highlights: customHl.length >= 1 ? customHl : defaultHighlights,
        hero_image: null,
      };
      let publishedHero = null;
      let publishedGallery = [];
      try {
        const pub = await collectPublishedLuxPropertyMedia(prisma, resolved.ref, { take: 80 });
        publishedHero = pub.published_hero;
        publishedGallery = Array.isArray(pub.published_gallery) ? pub.published_gallery : [];
      } catch {
        publishedHero = null;
        publishedGallery = [];
      }
      const pr = resolved.price_range != null ? String(resolved.price_range).trim() : '';
      const price_display = pr ? pr : 'On application';
      return {
        props: {
          editor_preview: true,
          property: {
            ref: resolved.ref,
            title: resolved.title,
            location: resolved.location,
            property_type: resolved.property_type,
            status: resolved.status,
            price_display,
            discovery_source: resolved.discovery_source,
            summary_text: resolved.summary_text,
            highlights: Array.isArray(resolved.highlights) ? resolved.highlights : [],
            hero_image: resolved.hero_image != null ? String(resolved.hero_image) : null,
            published_hero: publishedHero,
            published_gallery: publishedGallery,
          },
        },
      };
    }

    let resolved = resolveLuxPropertyRef(raw);
    if (!resolved) {
      resolved = await resolveLuxPropertyRefWithPublishedDb(prisma, raw);
    }
    if (!resolved) {
      return { notFound: true };
    }

    // Phase 4C.3 / 4D.1: published hero + gallery from recent Lux request tickets (bounded scan).
    let publishedHero = null;
    let publishedGallery = [];
    try {
      const pub = await collectPublishedLuxPropertyMedia(prisma, resolved.ref, { take: 80 });
      publishedHero = pub.published_hero;
      publishedGallery = Array.isArray(pub.published_gallery) ? pub.published_gallery : [];
    } catch {
      publishedHero = null;
      publishedGallery = [];
    }

    const pr = resolved.price_range != null ? String(resolved.price_range).trim() : '';
    const price_display = pr ? pr : 'On application';

    return {
      props: {
        editor_preview: false,
        property: {
          ref: resolved.ref,
          title: resolved.title,
          location: resolved.location,
          property_type: resolved.property_type,
          status: resolved.status,
          price_display,
          discovery_source: resolved.discovery_source,
          summary_text: resolved.summary_text,
          highlights: Array.isArray(resolved.highlights) ? resolved.highlights : [],
          hero_image: resolved.hero_image != null ? String(resolved.hero_image) : null,
          published_hero: publishedHero,
          published_gallery: publishedGallery,
        },
      },
    };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

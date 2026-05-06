import React from 'react';

import LuxeMauricePropertyDetailPage from '../../components/LuxeMauricePropertyDetailPage.js';
import { resolveLuxPropertyRef } from '../../lib/client/luxe-maurice-property-resolve.js';
import { PrismaClient } from '@prisma/client';
import { verifyTenantPreviewToken } from '../../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../../lib/server/ghost-host.js';

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

export default function PropertySlugPage({ property }) {
  return <LuxeMauricePropertyDetailPage property={property} />;
}

export async function getServerSideProps({ req, params }) {
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

    const resolved = resolveLuxPropertyRef(raw);
    if (!resolved) {
      return { notFound: true };
    }

    const pr = resolved.price_range != null ? String(resolved.price_range).trim() : '';
    const price_display = pr ? pr : 'On application';

    return {
      props: {
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
        },
      },
    };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

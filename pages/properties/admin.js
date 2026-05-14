import React from 'react';

import LuxeMauricePropertiesAdminApp from '../../components/LuxeMauricePropertiesAdminApp.js';
import { getSessionFromRequest } from '../../lib/server/session.js';
import { isLuxPropertyEditorSession } from '../../lib/server/lux-property-editor-access.js';
import { verifyTenantPreviewToken } from '../../lib/server/tenant-preview-token.js';
import { isGhostHost } from '../../lib/server/ghost-host.js';
import { PrismaClient } from '@prisma/client';

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

export default function LuxPropertiesAdminPage() {
  return <LuxeMauricePropertiesAdminApp />;
}

export async function getServerSideProps({ req }) {
  const host = normalizeHost(req);
  if (host && isGhostHost(host)) {
    return { redirect: { destination: '/log-stream.html', permanent: false } };
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

    const sess = getSessionFromRequest(req);
    if (!sess.ok || !isLuxPropertyEditorSession(sess.payload)) {
      return {
        redirect: {
          destination: `/login?next=${encodeURIComponent('/properties/admin')}`,
          permanent: false,
        },
      };
    }

    return { props: {} };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

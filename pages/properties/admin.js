import React from 'react';

import LuxeMauricePropertiesAdminApp from '../../components/LuxeMauricePropertiesAdminApp.js';
import LuxPropertyAdminAccessDenied from '../../components/LuxPropertyAdminAccessDenied.js';
import { getSessionFromRequest } from '../../lib/server/session.js';
import { resolveLuxPropertyAdminPageAccess } from '../../lib/server/lux-property-admin-gate.js';
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

export default function LuxPropertiesAdminPage({ accessDenied, signedInUsername, signedInTenantId, denialVariant }) {
  if (accessDenied === true) {
    return (
      <LuxPropertyAdminAccessDenied
        signedInUsername={signedInUsername}
        signedInTenantId={signedInTenantId}
        variant={denialVariant === 'wrong_session' ? 'wrong_session' : 'not_editor'}
      />
    );
  }
  return <LuxeMauricePropertiesAdminApp />;
}

export async function getServerSideProps({ req, res }) {
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

    const access = resolveLuxPropertyAdminPageAccess({
      hostResolvedTenantId: tenantId,
      session: getSessionFromRequest(req),
    });

    if (access.kind === 'wrong_host_tenant') {
      return { notFound: true };
    }

    if (access.kind === 'needs_login') {
      return {
        redirect: {
          destination: `/login?next=${encodeURIComponent('/properties/admin')}`,
          permanent: false,
        },
      };
    }

    if (access.kind === 'allowed_editor') {
      return {
        props: {
          accessDenied: false,
          signedInUsername: null,
          signedInTenantId: null,
          denialVariant: null,
        },
      };
    }

    if (access.kind === 'editor_forbidden') {
      try {
        console.info(
          '[lux-property-admin-denied]',
          JSON.stringify({
            tenant_id: access.signed_in_tenant_id,
            username: access.signed_in_username,
            editor_allowed: false,
          }),
        );
      } catch {
        /* ignore */
      }
      res.statusCode = 403;
      return {
        props: {
          accessDenied: true,
          signedInUsername: access.signed_in_username,
          signedInTenantId: access.signed_in_tenant_id,
          denialVariant: 'not_editor',
        },
      };
    }

    /* not_tenant_session or tenant_mismatch on Lux host — treat as not authorized for this desk */
    try {
      console.info(
        '[lux-property-admin-denied]',
        JSON.stringify({
          reason: access.kind,
          session_tenant_id: access.kind === 'tenant_mismatch' ? access.session_tenant_id : null,
          editor_allowed: false,
        }),
      );
    } catch {
      /* ignore */
    }
    res.statusCode = 403;
    const mismatchTid = access.kind === 'tenant_mismatch' ? access.session_tenant_id : null;
    return {
      props: {
        accessDenied: true,
        signedInUsername: null,
        signedInTenantId: mismatchTid,
        denialVariant: 'wrong_session',
      },
    };
  } catch {
    return { notFound: true };
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

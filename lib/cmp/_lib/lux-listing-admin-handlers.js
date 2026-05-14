/**
 * CMP handlers — Lux listing admin (Phase 2 Slice C).
 * Wired from `lib/cmp/router.js`; uses same tenant session + Dormant Gate as other tenant CMP actions.
 */

import { getSessionFromRequest } from '../../server/session.js';
import { isLuxPropertyEditorSession } from '../../server/lux-property-editor-access.js';
import {
  luxListingAdminGet,
  luxListingAdminList,
  luxListingAdminSave,
  luxListingAdminSetVisibility,
} from '../../server/lux-listing-admin-service.js';

function resolveLuxAdminTenantScope(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'tenant') {
    const tid = sess.payload?.tenant_id != null ? String(sess.payload.tenant_id).trim() : '';
    if (!tid) return { kind: 'invalid_tenant_session' };
    return { kind: 'tenant', tenantId: tid };
  }
  return { kind: 'unknown' };
}

function getClientIdFromHostContext(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return '';
    return ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
  } catch {
    return '';
  }
}

function str(v) {
  return v != null ? String(v).trim() : '';
}

function parseJsonBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { ok: false, error: 'Invalid JSON body' };
    }
  }
  const base = body == null ? {} : body;
  if (typeof base !== 'object' || Array.isArray(base)) {
    return { ok: true, body: {} };
  }
  const { cmp_action: _omitCmpAction, ...rest } = base;
  return { ok: true, body: rest };
}

/**
 * @returns {Promise<{ userId: string | null, username: string } | null>}
 */
async function assertLuxListingAdmin(req, res) {
  const listScope = resolveLuxAdminTenantScope(req);
  if (listScope.kind !== 'tenant' || listScope.tenantId !== 'luxe-maurice') {
    res.status(403).json({
      error: 'LUX_LISTING_ADMIN_TENANT_ONLY',
      hint: 'Listing editor requires a LuxeMaurice tenant login on the Lux hostname.',
    });
    return null;
  }
  const hostTid = getClientIdFromHostContext(req);
  if (hostTid !== 'luxe-maurice') {
    res.status(403).json({ error: 'LUX_HOST_REQUIRED' });
    return null;
  }
  const sess = getSessionFromRequest(req);
  if (!sess.ok || !sess.payload) {
    res.status(401).json({ error: 'SESSION_REQUIRED' });
    return null;
  }
  if (!isLuxPropertyEditorSession(sess.payload)) {
    res.status(403).json({
      error: 'LUX_LISTING_EDITOR_FORBIDDEN',
      hint: 'Use the provisioned editor account (email/password tenant login, not PIN-only).',
    });
    return null;
  }
  const userId = sess.payload.user_id != null ? String(sess.payload.user_id).trim() : null;
  const username = str(sess.payload.username);
  return { userId: userId || null, username: username || 'unknown' };
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {import('@prisma/client').PrismaClient} prisma
 */
export async function handleLuxListingAdminList(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const actor = await assertLuxListingAdmin(req, res);
  if (!actor) return;
  const out = await luxListingAdminList(prisma, actor);
  return res.status(200).json(out);
}

export async function handleLuxListingAdminGet(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const actor = await assertLuxListingAdmin(req, res);
  if (!actor) return;
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const out = await luxListingAdminGet(prisma, parsed.body || {});
  if (!out.ok) return res.status(out.error === 'NOT_FOUND' ? 404 : 400).json(out);
  return res.status(200).json(out);
}

export async function handleLuxListingAdminSave(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const actor = await assertLuxListingAdmin(req, res);
  if (!actor) return;
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const out = await luxListingAdminSave(prisma, parsed.body || {}, {
    userId: actor.userId,
    username: actor.username,
  });
  if (!out.ok) {
    const st = out.error === 'NOT_FOUND' ? 404 : out.error === 'SLUG_CONFLICT' ? 409 : 400;
    return res.status(st).json(out);
  }
  return res.status(200).json(out);
}

export async function handleLuxListingAdminSetVisibility(req, res, prisma) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const actor = await assertLuxListingAdmin(req, res);
  if (!actor) return;
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const out = await luxListingAdminSetVisibility(prisma, parsed.body || {}, { userId: actor.userId });
  if (!out.ok) return res.status(out.error === 'NOT_FOUND' ? 404 : 400).json(out);
  return res.status(200).json(out);
}

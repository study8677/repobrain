import crypto from 'crypto';

import { cfg } from './runtime-config.js';
import { PrismaClient } from '@prisma/client';
import { verifyPinAgainstStored } from '../cmp/_lib/tenant-pin.js';
import {
  clearCookie,
  CORPFLOW_SESSION_COOKIE,
  getSessionFromRequest,
  setCookie,
  signSession,
} from './session.js';
import { getTenantHostSessionConflict } from './tenant-host-session-gate.js';
import { deliverPasswordResetNotification } from './password-reset-delivery.js';
import { isLuxPropertyEditorSession } from './lux-property-editor-access.js';

const prisma = new PrismaClient();

const PASSWORD_RESET_TOKEN_TTL_MIN = Math.min(
  180,
  Math.max(5, parseInt(String(cfg('CORPFLOW_PASSWORD_RESET_TTL_MIN', '30')), 10) || 30),
);
const PASSWORD_RESET_RATE_LIMIT_MIN = Math.min(
  120,
  Math.max(1, parseInt(String(cfg('CORPFLOW_PASSWORD_RESET_RATE_LIMIT_MIN', '10')), 10) || 10),
);
const PASSWORD_RESET_DEBUG_RETURN_TOKEN =
  String(cfg('CORPFLOW_PASSWORD_RESET_DEBUG_RETURN_TOKEN', 'false')).toLowerCase() === 'true';

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return { ok: true, body };
  return { ok: false, error: 'Missing JSON body (Vercel must parse it).' };
}

function timingSafeStringEquals(a, b) {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

function computePasswordHash(password, salt) {
  const pw = String(password || '').trim();
  const s = String(salt || '').trim();
  if (!pw || !s) return '';
  return crypto.pbkdf2Sync(pw, s, 120000, 32, 'sha256').toString('hex');
}

function generateResetToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(String(s || ''), 'utf8').digest('hex');
}

function normalizeEmailish(s) {
  return String(s || '').trim().toLowerCase();
}

function newSaltHex() {
  return crypto.randomBytes(16).toString('hex');
}

async function findRecentPasswordResetRequest({ tenantId, username }) {
  const since = new Date(Date.now() - PASSWORD_RESET_RATE_LIMIT_MIN * 60 * 1000);
  try {
    return await prisma.recoveryVaultEntry.findFirst({
      where: {
        category: 'password_reset',
        occurredAt: { gte: since },
        AND: [
          { payload: { path: ['tenant_id'], equals: tenantId } },
          { payload: { path: ['username'], equals: username } },
        ],
      },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, occurredAt: true, payload: true },
    });
  } catch {
    // Best-effort: do not block password reset if JSON-path filtering is unsupported in this runtime.
    return null;
  }
}

async function createPasswordResetEntry({ tenantId, username, tokenHash, expiresAtIso }) {
  return await prisma.recoveryVaultEntry.create({
    data: {
      category: 'password_reset',
      status: 'PENDING_SYNC',
      payload: {
        tenant_id: tenantId,
        username: username,
        token_hash: tokenHash,
        expires_at: expiresAtIso,
        used_at: null,
      },
    },
    select: { id: true, occurredAt: true },
  });
}

async function findValidPasswordResetEntry({ tokenHash }) {
  const nowIso = new Date().toISOString();
  try {
    return await prisma.recoveryVaultEntry.findFirst({
      where: {
        category: 'password_reset',
        payload: {
          path: ['token_hash'],
          equals: tokenHash,
        },
      },
      orderBy: { occurredAt: 'desc' },
      select: { id: true, payload: true, occurredAt: true },
    });
  } catch {
    return null;
  }
}

async function markPasswordResetUsed({ entryId }) {
  try {
    const row = await prisma.recoveryVaultEntry.findUnique({ where: { id: entryId }, select: { payload: true } });
    const payload = row?.payload && typeof row.payload === 'object' ? row.payload : {};
    await prisma.recoveryVaultEntry.update({
      where: { id: entryId },
      data: {
        status: 'USED',
        payload: { ...(payload || {}), used_at: new Date().toISOString() },
      },
    });
  } catch {
    /* best-effort */
  }
}

function getAdminCreds() {
  const username = String(cfg('CORPFLOW_ADMIN_USERNAME', '')).trim();
  const password = String(cfg('CORPFLOW_ADMIN_PASSWORD', '')).trim();
  const passwordHash = String(cfg('CORPFLOW_ADMIN_PASSWORD_HASH', '')).trim();
  const passwordSalt = String(cfg('CORPFLOW_ADMIN_PASSWORD_SALT', '')).trim();
  return { username, password, passwordHash, passwordSalt };
}

function verifyAdminPassword(inputPassword, creds) {
  const pw = String(inputPassword || '').trim();
  if (!pw) return false;
  if (creds.password && timingSafeStringEquals(pw, creds.password)) return true;
  if (creds.passwordHash && creds.passwordSalt) {
    const derived = computePasswordHash(pw, creds.passwordSalt);
    return timingSafeStringEquals(derived, creds.passwordHash);
  }
  return false;
}

async function tryPostgresAuthUserLogin({ level, username, password, tenantId }) {
  const backend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();
  if (backend !== 'postgres') return { ok: false, code: 'POSTGRES_AUTH_DISABLED' };
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return { ok: false, code: 'POSTGRES_URL_MISSING' };

  let u = String(username || '').trim();
  const p = String(password || '').trim();
  if (!u || !p) return { ok: false, code: 'MISSING_CREDENTIALS' };
  // Must match `scripts/provision-tenant-test-access.mjs` (stores usernames lowercased).
  if (level === 'tenant') u = normalizeEmailish(u);

  const row = await prisma.authUser.findUnique({ where: { username: u } });
  if (!row) return { ok: false, code: 'USER_NOT_FOUND' };
  if (row.enabled === false) return { ok: false, code: 'USER_DISABLED' };

  const rowLevel = String(row.level || '').trim().toLowerCase();
  if (!rowLevel) return { ok: false, code: 'LEVEL_NOT_SET' };
  if (rowLevel === 'disabled') return { ok: false, code: 'USER_DISABLED' };
  if (rowLevel !== level) return { ok: false, code: 'LEVEL_MISMATCH' };

  if (level === 'tenant') {
    const rowTenantId = String(row.tenantId || '').trim();
    if (!rowTenantId) return { ok: false, code: 'TENANT_ID_NOT_SET' };
    // Password proves identity; scope is always auth_users.tenant_id (ignore request tenant_id mismatch).
    // PIN login uses a separate path and still keys off the requested tenant + tenants.sovereign_pin_hash.
  }

  const derived = computePasswordHash(p, row.passwordSalt);
  if (!derived || !timingSafeStringEquals(derived, row.passwordHash)) return { ok: false, code: 'INVALID_CREDENTIALS' };

  return {
    ok: true,
    user: {
      id: row.id,
      level: rowLevel,
      username: row.username,
      tenant_id: row.tenantId || null,
    },
  };
}

/**
 * Tenant PIN vs `tenants.sovereign_pin_hash` (scrypt v1 or legacy plaintext for migration).
 *
 * @param {string} tenantId
 * @param {string} pin
 * @returns {Promise<{ ok: true, tenant_id: string, row_id: string } | { ok: false, code: string }>}
 */
async function tryPostgresTenantPinLogin(tenantId, pin) {
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return { ok: false, code: 'POSTGRES_URL_MISSING' };

  const row = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!row) return { ok: false, code: 'TENANT_NOT_FOUND' };

  const stored = row.sovereignPinHash != null ? String(row.sovereignPinHash) : '';
  if (!stored.trim()) return { ok: false, code: 'TENANT_PIN_NOT_PROVISIONED' };
  if (!verifyPinAgainstStored(pin, stored)) return { ok: false, code: 'INVALID_PIN' };

  return { ok: true, tenant_id: tenantId, row_id: row.id };
}

export async function handleAuthLogin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const level = String(body?.level || '').trim().toLowerCase();
  const ttlSec = Math.min(86400, Math.max(600, parseInt(cfg('CORPFLOW_SESSION_TTL_SEC', '43200'), 10) || 43200));

  if (level === 'admin') {
    const u = String(body?.username || '').trim();
    const p = String(body?.password || '').trim();
    if (!u || !p) return deny(res, 400, 'username and password required');

    try {
      const pg = await tryPostgresAuthUserLogin({ level: 'admin', username: u, password: p, tenantId: null });
      if (pg.ok) {
        const signed = signSession({ typ: 'admin', username: pg.user.username, user_id: pg.user.id }, { ttlSec });
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'postgres' });
      }
    } catch {
      /* relation missing or DB down — fall through to env admin */
    }

    const creds = getAdminCreds();
    if (!creds.username) {
      return deny(res, 503, 'ADMIN_LOGIN_DISABLED', {
        hint:
          'Set CORPFLOW_ADMIN_USERNAME and CORPFLOW_ADMIN_PASSWORD in Vercel (bootstrap), or create rows in Postgres auth_users.',
      });
    }
    if (!timingSafeStringEquals(u, creds.username) || !verifyAdminPassword(p, creds)) return deny(res, 401, 'INVALID_CREDENTIALS');

    const signed = signSession({ typ: 'admin', username: u }, { ttlSec });
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({ ok: true, level: 'admin', expires_sec: ttlSec, source: 'env' });
  }

  if (level === 'tenant') {
    const mappedFromDb =
      req.corpflowTenantIdSource === 'postgres' &&
      req.corpflowContext &&
      req.corpflowContext.surface === 'tenant' &&
      req.corpflowContext.tenant_id
        ? String(req.corpflowContext.tenant_id).trim()
        : '';
    const pin = String(body?.pin || '').trim();
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '').trim();
    const isPasswordLogin = Boolean(username && password);

    let tenantId = String(body?.tenant_id || body?.tenantId || '').trim();
    if (mappedFromDb) {
      if (!tenantId) tenantId = mappedFromDb;
      else if (tenantId !== mappedFromDb && !isPasswordLogin) {
        return deny(res, 400, 'TENANT_ID_HOST_MISMATCH', {
          expected_tenant_id: mappedFromDb,
          hint:
            'This hostname is mapped in Postgres to that tenant. Use it as-is, or open /login from a host that matches the tenant you need.',
        });
      }
    }
    if (!tenantId && !isPasswordLogin) return deny(res, 400, 'tenant_id required');

    const backend = String(cfg('CORPFLOW_AUTH_BACKEND', 'postgres')).trim().toLowerCase();
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();

    if (username && password) {
      if (backend !== 'postgres' || !pgUrl) {
        return deny(res, 503, 'TENANT_AUTH_POSTGRES_REQUIRED', {
          hint: 'Set CORPFLOW_AUTH_BACKEND=postgres and POSTGRES_URL; manage tenant users in auth_users.',
        });
      }
      const pg = await tryPostgresAuthUserLogin({ level: 'tenant', username, password, tenantId });
      if (pg.ok) {
        const signed = signSession(
          { typ: 'tenant', tenant_id: pg.user.tenant_id, username: pg.user.username, user_id: pg.user.id },
          { ttlSec },
        );
        if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
        setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
        return res.status(200).json({
          ok: true,
          level: 'tenant',
          tenant_id: pg.user.tenant_id,
          expires_sec: ttlSec,
          source: 'postgres',
        });
      }
      return deny(res, 401, pg.code || 'INVALID_CREDENTIALS');
    }

    if (!pin) return deny(res, 400, 'Provide either (username+password) or pin.');

    if (!pgUrl) {
      return deny(res, 503, 'POSTGRES_URL_MISSING', {
        hint: 'Tenant PIN is verified against Postgres tenants.sovereign_pin_hash.',
      });
    }

    const pinResult = await tryPostgresTenantPinLogin(tenantId, pin);
    if (!pinResult.ok) {
      const code = pinResult.code || 'INVALID_PIN';
      const status = code === 'TENANT_NOT_FOUND' ? 404 : code === 'TENANT_PIN_NOT_PROVISIONED' ? 403 : 401;
      return deny(res, status, code);
    }

    const signed = signSession(
      { typ: 'tenant', tenant_id: pinResult.tenant_id, row_id: pinResult.row_id },
      { ttlSec },
    );
    if (!signed.ok) return deny(res, 503, 'SESSION_SECRET_MISSING');
    setCookie(res, CORPFLOW_SESSION_COOKIE, signed.token, { maxAgeSec: ttlSec });
    return res.status(200).json({
      ok: true,
      level: 'tenant',
      tenant_id: pinResult.tenant_id,
      expires_sec: ttlSec,
      source: 'pin',
    });
  }

  return deny(res, 400, 'INVALID_LEVEL', { allowed: ['admin', 'tenant'] });
}

export async function handleAuthMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const s = getSessionFromRequest(req);
  if (!s.ok) return res.status(200).json({ ok: true, logged_in: false });
  const p = s.payload || {};
  const conflict = getTenantHostSessionConflict(req);
  const out = {
    ok: true,
    logged_in: true,
    level: p.typ || null,
    username: p.username || null,
    tenant_id: p.tenant_id || null,
    exp: p.exp || null,
  };
  if (conflict && String(p.typ || '').toLowerCase() === 'tenant') {
    Object.assign(out, {
      tenant_host_session_mismatch: true,
      host_tenant_id: conflict.host_tenant_id,
      session_tenant_id: conflict.session_tenant_id,
      hint:
        'This hostname belongs to a different workspace than your current session. Open /login, use Logout, then sign in again on this site.',
    });
  }
  if (!conflict && String(p.typ || '') === 'tenant' && String(p.tenant_id || '').trim() === 'luxe-maurice') {
    out.lux_property_editor = isLuxPropertyEditorSession(p);
  }
  return res.status(200).json(out);
}

/**
 * Tenant password reset request (by email/username within a tenant).
 *
 * POST /api/auth/password-reset/request
 * Body: { email, tenant_id? } — tenant_id optional; scope is taken from auth_users when the email exists.
 *
 * Response is intentionally non-enumerating: always ok when input shape is valid.
 */
export async function handleAuthPasswordResetRequest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const tenantIdFromBody = String(body?.tenant_id || body?.tenantId || '').trim();
  const email = normalizeEmailish(body?.email || body?.username || '');
  if (!email) {
    return deny(res, 400, 'email is required');
  }
  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    // Still respond ok to avoid information leakage.
    return res.status(200).json({ ok: true });
  }

  // Verify user exists but do not reveal this in the response.
  let user = null;
  try {
    user = await prisma.authUser.findUnique({
      where: { username: email },
      select: { id: true, enabled: true, level: true, tenantId: true },
    });
  } catch {
    user = null;
  }

  const rowTenantId = user && user.tenantId != null ? String(user.tenantId).trim() : '';
  const okUser =
    user &&
    user.enabled !== false &&
    String(user.level || '').toLowerCase() === 'tenant' &&
    Boolean(rowTenantId);

  const tenantIdForVault = okUser ? rowTenantId : tenantIdFromBody;
  const rateTenant = okUser ? rowTenantId : tenantIdFromBody || '_unknown_tenant';

  // Rate limit (best-effort).
  const recent = await findRecentPasswordResetRequest({ tenantId: rateTenant, username: email });
  if (recent) {
    return res.status(200).json({ ok: true });
  }

  const token = generateResetToken();
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MIN * 60 * 1000).toISOString();

  if (okUser) {
    await createPasswordResetEntry({
      tenantId: tenantIdForVault,
      username: email,
      tokenHash,
      expiresAtIso: expiresAt,
    });

    await deliverPasswordResetNotification({
      req,
      tenantId: tenantIdForVault,
      email,
      token,
      expiresAt,
    });
  }

  const resp = { ok: true };
  if (PASSWORD_RESET_DEBUG_RETURN_TOKEN && okUser) {
    Object.assign(resp, { debug_token: token, debug_expires_at: expiresAt });
  }
  return res.status(200).json(resp);
}

/**
 * Tenant password reset confirm.
 *
 * POST /api/auth/password-reset/confirm
 * Body: { token, new_password }
 */
export async function handleAuthPasswordResetConfirm(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const token = String(body?.token || '').trim();
  const newPassword = String(body?.new_password || body?.newPassword || '').trim();
  if (!token || !newPassword) {
    return deny(res, 400, 'token and new_password are required');
  }
  if (newPassword.length < 10) {
    return deny(res, 400, 'Password too short', { hint: 'Use at least 10 characters.' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return deny(res, 503, 'POSTGRES_URL_MISSING');
  }

  const tokenHash = sha256Hex(token);
  const entry = await findValidPasswordResetEntry({ tokenHash });
  const payload = entry?.payload && typeof entry.payload === 'object' ? entry.payload : null;
  const tenantId = payload?.tenant_id != null ? String(payload.tenant_id).trim() : '';
  const username = payload?.username != null ? normalizeEmailish(payload.username) : '';
  const expiresAt = payload?.expires_at != null ? String(payload.expires_at).trim() : '';
  const usedAt = payload?.used_at != null ? String(payload.used_at).trim() : '';

  if (!entry || !tenantId || !username || usedAt) {
    return deny(res, 400, 'INVALID_TOKEN');
  }
  if (expiresAt && !Number.isNaN(Date.parse(expiresAt)) && Date.now() > Date.parse(expiresAt)) {
    return deny(res, 400, 'TOKEN_EXPIRED');
  }

  const u = await prisma.authUser.findUnique({
    where: { username },
    select: { id: true, enabled: true, level: true, tenantId: true },
  });
  const okUser =
    u &&
    u.enabled !== false &&
    String(u.level || '').toLowerCase() === 'tenant' &&
    String(u.tenantId || '').trim() === tenantId;
  if (!okUser) {
    return deny(res, 400, 'INVALID_TOKEN');
  }

  const salt = newSaltHex();
  const hash = computePasswordHash(newPassword, salt);
  await prisma.authUser.update({
    where: { id: u.id },
    data: { passwordSalt: salt, passwordHash: hash },
  });
  await markPasswordResetUsed({ entryId: entry.id });
  return res.status(200).json({ ok: true });
}

export async function handleAuthLogout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  clearCookie(res, CORPFLOW_SESSION_COOKIE);
  return res.status(200).json({ ok: true });
}

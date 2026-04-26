/**
 * One-time magic links for `/client/change-decisions` (no login).
 * Stores only a SHA-256 hash of the secret token on `console_json.client_decisions_access`.
 */

import crypto from 'crypto';
import { cfg } from '../../server/runtime-config.js';

export const CLIENT_DECISIONS_ACCESS_KEY = 'client_decisions_access';

/** Shown after magic-link submit or when revisiting a consumed / complete link. */
export const THANK_YOU_CLIENT_DECISIONS_MAGIC =
  "Thank you — we've received your answers and will prepare the first-slice plan.";

export function clientDecisionsLinkTtlDays() {
  const d = parseInt(String(cfg('CORPFLOW_CLIENT_DECISIONS_LINK_TTL_DAYS', '30') || '30'), 10);
  if (Number.isFinite(d) && d >= 1 && d <= 365) return d;
  return 30;
}

/**
 * @returns {string} 64-char hex (256-bit)
 */
export function generatePlainClientDecisionsToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * @param {string} plain
 * @returns {string} 64-char hex sha256
 */
export function hashClientDecisionsToken(plain) {
  return crypto.createHash('sha256').update(String(plain), 'utf8').digest('hex');
}

/**
 * @param {string} plainToken
 * @returns {{ access: Record<string, unknown>, expires_at: string }}
 */
export function buildNewClientDecisionsAccessRecord(plainToken) {
  const now = new Date();
  const ttlMs = clientDecisionsLinkTtlDays() * 86400000;
  const expires = new Date(now.getTime() + ttlMs);
  const expires_at = expires.toISOString();
  const access = {
    token_hash: hashClientDecisionsToken(plainToken),
    issued_at: now.toISOString(),
    expires_at,
    consumed_at: null,
  };
  return { access, expires_at };
}

/**
 * @param {unknown} access
 * @param {string} plainToken
 * @param {string} nowIso
 * @returns {{ ok: boolean, consumed?: boolean, reason?: string }}
 */
export function verifyClientDecisionsAccessToken(access, plainToken, nowIso) {
  const a = access && typeof access === 'object' && !Array.isArray(access) ? access : {};
  const th = typeof a.token_hash === 'string' ? a.token_hash.trim().toLowerCase() : '';
  const exp = typeof a.expires_at === 'string' ? a.expires_at.trim() : '';
  const consumedAt = a.consumed_at != null && String(a.consumed_at).trim() ? String(a.consumed_at).trim() : '';
  if (!th || !exp) return { ok: false, reason: 'not_configured' };
  if (th.length !== 64) return { ok: false, reason: 'bad_config' };
  const now = Date.parse(nowIso || new Date().toISOString());
  if (!Number.isFinite(now)) return { ok: false, reason: 'clock' };
  if (Date.parse(exp) < now) return { ok: false, reason: 'expired' };
  const got = hashClientDecisionsToken(plainToken).toLowerCase();
  try {
    const aBuf = Buffer.from(got, 'hex');
    const bBuf = Buffer.from(th, 'hex');
    if (aBuf.length !== bBuf.length || aBuf.length !== 32) return { ok: false, reason: 'bad_token' };
    if (!crypto.timingSafeEqual(aBuf, bBuf)) return { ok: false, reason: 'bad_token' };
  } catch {
    return { ok: false, reason: 'bad_token' };
  }
  return { ok: true, consumed: Boolean(consumedAt) };
}

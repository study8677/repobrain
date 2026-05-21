/**
 * Generic transactional email delivery via an n8n Webhook → Gmail (or other ESP) workflow.
 *
 * Server-side only — never imported by the browser. Reads URL/secret through `cfg()` so the
 * value can live in a normal Vercel env var or in `CORPFLOW_RUNTIME_CONFIG_JSON`.
 *
 * Env vars (preferred):
 *   N8N_EMAIL_WEBHOOK_URL       — full URL to the n8n Webhook node (production URL)
 *   N8N_EMAIL_WEBHOOK_SECRET    — shared secret; sent as `x-corpflow-email-secret`
 *   EMAIL_FROM                  — default From address hint (e.g. support@corpflowai.com)
 *
 * Legacy fallbacks (kept for compatibility):
 *   CORPFLOW_PASSWORD_RESET_WEBHOOK_URL
 *   CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET
 *   CORPFLOW_PASSWORD_RESET_FROM_EMAIL
 *
 * Security:
 *   - Never logs the payload (token, reset_code, email body) — only kind / HTTP status.
 *   - Best-effort: returns structured result, never throws to the caller.
 *   - 8-second timeout so a stuck webhook does not block the password-reset request.
 */

import { cfg } from './runtime-config.js';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_FROM_FALLBACK = 'support@corpflowai.com';
const SECRET_HEADER = 'x-corpflow-email-secret';

/**
 * Resolve the n8n email webhook URL — prefer new name, fall back to legacy password-reset name.
 *
 * @returns {string}
 */
export function resolveN8nEmailWebhookUrl() {
  const direct = String(cfg('N8N_EMAIL_WEBHOOK_URL', '')).trim();
  if (direct) return direct;
  return String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_URL', '')).trim();
}

/**
 * Resolve the shared secret for the n8n email webhook.
 *
 * @returns {string}
 */
export function resolveN8nEmailWebhookSecret() {
  const direct = String(cfg('N8N_EMAIL_WEBHOOK_SECRET', '')).trim();
  if (direct) return direct;
  return String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET', '')).trim();
}

/**
 * Resolve the default From address — prefer `EMAIL_FROM`, then password-reset legacy, then a
 * hard-coded support alias as a last resort so the n8n Gmail node still has a hint.
 *
 * @returns {string}
 */
export function resolveEmailFromAddress() {
  const direct = String(cfg('EMAIL_FROM', '')).trim();
  if (direct) return direct;
  const legacy = String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim();
  if (legacy) return legacy;
  return DEFAULT_FROM_FALLBACK;
}

/**
 * Fire-and-forget POST to the n8n Webhook. Never throws.
 *
 * @param {Record<string, unknown>} payload — the JSON body the n8n workflow consumes
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [opts]
 * @returns {Promise<{
 *   attempted: boolean,
 *   configured: boolean,
 *   ok: boolean,
 *   status: number | null,
 *   error_kind: string | null,
 * }>}
 */
export async function sendN8nTransactionalEmail(payload, opts = {}) {
  const url = resolveN8nEmailWebhookUrl();
  const secret = resolveN8nEmailWebhookSecret();
  const configured = Boolean(url);
  const result = {
    attempted: false,
    configured,
    ok: false,
    status: /** @type {number | null} */ (null),
    error_kind: /** @type {string | null} */ (null),
  };
  if (!configured) return result;

  const safePayload = payload && typeof payload === 'object' ? payload : {};
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? Number(opts.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const fetchImpl = typeof opts.fetchImpl === 'function' ? opts.fetchImpl : fetch;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), Math.max(1000, timeoutMs));
  result.attempted = true;
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (secret) headers[SECRET_HEADER] = secret;
    const r = await fetchImpl(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(safePayload),
      signal: ctrl.signal,
    });
    result.status = r && typeof r.status === 'number' ? r.status : null;
    result.ok = Boolean(r && r.ok);
    if (!result.ok) result.error_kind = 'http_not_ok';
    return result;
  } catch (e) {
    if (e && e.name === 'AbortError') {
      result.error_kind = 'timeout';
    } else {
      result.error_kind = 'fetch_failed';
    }
    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Booleans only — safe to embed in `/api/factory/health`. No values, no secret material.
 *
 * @returns {{
 *   webhook_configured: boolean,
 *   webhook_secret_configured: boolean,
 *   email_from_configured: boolean,
 * }}
 */
export function n8nEmailDeliveryDiagnostics() {
  return {
    webhook_configured: Boolean(resolveN8nEmailWebhookUrl()),
    webhook_secret_configured: Boolean(resolveN8nEmailWebhookSecret()),
    email_from_configured: Boolean(
      String(cfg('EMAIL_FROM', '')).trim() ||
        String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim(),
    ),
  };
}

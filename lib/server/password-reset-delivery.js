/**
 * Tenant password reset delivery: optional n8n webhook (Gmail/SMTP) and/or Resend API.
 *
 * Configure in Vercel — see `.env.template` § password reset and `docs/n8n/password-reset-email-recipe.md`.
 *
 * Webhook env (preferred): `N8N_EMAIL_WEBHOOK_URL` / `N8N_EMAIL_WEBHOOK_SECRET` / `EMAIL_FROM`.
 * Legacy fallbacks (kept compatible): `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL` /
 * `CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET` / `CORPFLOW_PASSWORD_RESET_FROM_EMAIL`.
 */

import { cfg } from './runtime-config.js';
import {
  resolveEmailFromAddress,
  resolveN8nEmailWebhookUrl,
  resolveN8nEmailWebhookSecret,
  sendN8nTransactionalEmail,
} from './email-delivery.js';

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
export function inferPublicBaseUrl(req) {
  const explicit = String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const proto =
      String(req.headers['x-forwarded-proto'] || 'https')
        .split(',')[0]
        .trim() || 'https';
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim()
      .replace(/:\d+$/, '');
    if (host) return `${proto}://${host}`;
  } catch {
    /* ignore */
  }
  return '';
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Build the JSON payload posted to the n8n email webhook. Pure function; safe to unit test.
 *
 * Includes both legacy field names (`event`, `email`, `token`) and the documented n8n schema
 * (`purpose`, `to`, `from`, `reset_code`, `expires_minutes`) so existing workflows keep working
 * while new ones can rely on the cleaner names.
 *
 * @param {{
 *   tenantId: string,
 *   email: string,
 *   token: string,
 *   expiresAt: string,
 *   resetUrl: string,
 *   resetPath: string,
 *   publicBaseUrl: string,
 *   fromAddress: string,
 *   nowMs?: number,
 * }} args
 * @returns {Record<string, unknown>}
 */
export function buildPasswordResetEmailPayload(args) {
  const {
    tenantId,
    email,
    token,
    expiresAt,
    resetUrl,
    resetPath,
    publicBaseUrl,
    fromAddress,
  } = args;
  const now = Number.isFinite(args.nowMs) ? Number(args.nowMs) : Date.now();
  const expMs = Date.parse(String(expiresAt || ''));
  const expires_minutes = Number.isFinite(expMs) ? Math.max(1, Math.round((expMs - now) / 60000)) : null;

  return {
    schema: 'corpflow.email.password_reset.v1',
    purpose: 'password_reset',
    event: 'tenant_password_reset_requested',
    tenant_id: tenantId,
    to: email,
    email,
    from: fromAddress,
    reset_code: token,
    token,
    reset_url: resetUrl || null,
    reset_path: resetPath,
    public_base_url: publicBaseUrl || null,
    expires_at: expiresAt,
    expires_minutes,
    subject: 'Reset your CorpFlowAI password',
  };
}

/**
 * @param {{
 *   req: import('http').IncomingMessage,
 *   tenantId: string,
 *   email: string,
 *   token: string,
 *   expiresAt: string,
 * }} opts
 * @returns {Promise<void>}
 */
export async function deliverPasswordResetNotification(opts) {
  const { req, tenantId, email, token, expiresAt } = opts;
  const base = inferPublicBaseUrl(req);
  const resetPath = `/login?reset_token=${encodeURIComponent(token)}`;
  const reset_url = base ? `${base}${resetPath}` : '';
  const fromAddress = resolveEmailFromAddress();

  const payload = buildPasswordResetEmailPayload({
    tenantId,
    email,
    token,
    expiresAt,
    resetUrl: reset_url,
    resetPath,
    publicBaseUrl: base,
    fromAddress,
  });

  if (resolveN8nEmailWebhookUrl()) {
    await sendN8nTransactionalEmail(payload);
  }

  const resendKey = String(cfg('CORPFLOW_PASSWORD_RESET_RESEND_API_KEY', '')).trim();
  if (resendKey && fromAddress) {
    const ttl = String(cfg('CORPFLOW_PASSWORD_RESET_TTL_MIN', '30')).trim() || '30';
    const subject = 'Reset your CorpFlowAI password';
    const text = [
      `We received a request to reset the password for ${email} (workspace: ${tenantId}).`,
      reset_url
        ? `Open this link to choose a new password (link expires in about ${ttl} minutes):\n${reset_url}`
        : `On the login page, open "Forgot password?" and paste this one-time code:\n\n${token}`,
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `<p>We received a request to reset the password for <strong>${escapeHtml(email)}</strong> (workspace: <strong>${escapeHtml(tenantId)}</strong>).</p>${
      reset_url
        ? `<p><a href="${escapeHtml(reset_url)}">Choose a new password</a></p><p>This link expires in about ${escapeHtml(ttl)} minutes.</p>`
        : `<p>Copy this one-time code into the login page (Forgot password):</p><pre style="word-break:break-all">${escapeHtml(token)}</pre>`
    }<p>If you did not request this, ignore this email.</p>`;

    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [email],
          subject,
          text,
          html,
        }),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => '');
        console.warn('[password-reset] Resend HTTP', r.status, String(t).slice(0, 300));
      }
    } catch (e) {
      console.warn('[password-reset] Resend error', e instanceof Error ? e.message : e);
    }
  }
}

/**
 * Booleans only — safe for `/api/factory/health`. Reflects new (`N8N_EMAIL_*`, `EMAIL_FROM`)
 * and legacy (`CORPFLOW_PASSWORD_RESET_*`) env names; `webhook` is true when **either**
 * webhook env is set so health stays green during a renaming rollout.
 *
 * @returns {{
 *   webhook: boolean,
 *   webhook_secret_configured: boolean,
 *   n8n_email_webhook: boolean,
 *   n8n_email_webhook_secret_configured: boolean,
 *   email_from_configured: boolean,
 *   resend: boolean,
 *   public_base_configured: boolean,
 *   debug_token_return_enabled: boolean,
 * }}
 */
export function passwordResetDeliveryDiagnostics() {
  const newWebhook = Boolean(resolveN8nEmailWebhookUrl());
  const newSecret = Boolean(resolveN8nEmailWebhookSecret());
  const legacyWebhook = Boolean(String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_URL', '')).trim());
  const legacySecret = Boolean(String(cfg('CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET', '')).trim());
  const emailFrom = Boolean(
    String(cfg('EMAIL_FROM', '')).trim() ||
      String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim(),
  );
  return {
    webhook: newWebhook || legacyWebhook,
    webhook_secret_configured: newSecret || legacySecret,
    n8n_email_webhook: newWebhook,
    n8n_email_webhook_secret_configured: newSecret,
    email_from_configured: emailFrom,
    resend: Boolean(
      String(cfg('CORPFLOW_PASSWORD_RESET_RESEND_API_KEY', '')).trim() &&
        String(cfg('CORPFLOW_PASSWORD_RESET_FROM_EMAIL', '')).trim(),
    ),
    public_base_configured: Boolean(
      String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim() ||
        String(cfg('CORPFLOW_ROOT_DOMAIN', '')).trim(),
    ),
    debug_token_return_enabled:
      String(cfg('CORPFLOW_PASSWORD_RESET_DEBUG_RETURN_TOKEN', 'false')).toLowerCase() === 'true',
  };
}

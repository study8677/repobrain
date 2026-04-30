/**
 * Single Vercel serverless entry for /api/* (Hobby 12-function cap).
 * Routes via `__path` from vercel.json rewrite, or from URL path after /api/.
 */
import '../lib/server/suppress-node-deprecations.js';
import { PrismaClient } from '@prisma/client';

import adminLeadsHandler from '../lib/server/admin-leads.js';
import auditHandler from '../lib/server/audit.js';
import billingSentinelHandler from '../lib/server/billing-sentinel.js';
import technicalLeadCronHandler, {
  handleTechnicalLeadAuditsList,
  handleTechnicalLeadFactoryMaster,
} from '../lib/server/technical-lead-cron.js';
import cmpMonitorCronHandler from '../lib/server/cmp-monitor-cron.js';
import cmpHandler from '../lib/cmp/router.js';
import feedbackHandler from '../lib/server/feedback.js';
import legalSearchHandler from '../lib/server/legal-search.js';
import mainHandler from '../lib/server/main.js';
import provisionHandler from '../lib/server/provision.js';
import webhookHandler from '../lib/server/webhook.js';
import tenantsOverviewHandler from '../lib/server/tenants-overview.js';
import postgresFactorySchemaHandler from '../lib/server/postgres-factory-schema.js';
import tenantHostMapUpsertHandler from '../lib/server/tenant-host-map.js';
import tenantSiteHandler from '../lib/server/tenant-site.js';
import tenantSiteReadHandler from '../lib/server/tenant-site-read.js';
import tenantIntakeHandler from '../lib/server/tenant-intake.js';
import tenantSitePublicHandler from '../lib/server/tenant-site-public.js';
import { handleTenantLeadCreate, handleTenantLeadQualify } from '../lib/server/tenant-leads.js';
import tenantLoginDebugHandler from '../lib/server/tenant-login-debug.js';
import { handleCoreLuxTicketMigrationRepair } from '../lib/server/core-lux-ticket-migration-repair.js';
import factoryGithubPrCreateHandler from '../lib/server/factory-github-pr-create.js';
import factoryResearchFetchHandler from '../lib/server/factory-research-fetch.js';
import factoryCmpPushHandler from '../lib/server/factory-cmp-push.js';
import factoryCmpTicketSetDescriptionHandler from '../lib/server/factory-cmp-ticket-set-description.js';
import factoryCmpActiveWorkSignalHandler from '../lib/server/factory-cmp-active-work-signal.js';
import {
  handleFactoryAuthUsersList,
  handleFactoryAuthUsersSetPassword,
} from '../lib/server/factory-auth-users-admin.js';
import { handleFactoryTenantBootstrap } from '../lib/server/tenant-onboarding-bootstrap.js';
import {
  handleAuthLogin,
  handleAuthLogout,
  handleAuthMe,
  handleAuthPasswordResetConfirm,
  handleAuthPasswordResetRequest,
} from '../lib/server/auth.js';
import {
  handleAutomationEventsList,
  handleAutomationIngest,
  handleAutomationPlaybooksList,
} from '../lib/automation/gateway.js';
import { buildCorpflowHostContext, isApexHostname } from '../lib/server/host-tenant-context.js';
import { getTenantHostSessionConflict } from '../lib/server/tenant-host-session-gate.js';
import { cfg, runtimeConfigDiagnostics } from '../lib/server/runtime-config.js';
import { getGroqApiKey, groqChatCompletionsFetch, resolveGroqModel } from '../lib/server/groq-client.js';
import { passwordResetDeliveryDiagnostics } from '../lib/server/password-reset-delivery.js';
import { getSessionFromRequest } from '../lib/server/session.js';
import { getTenantWalletSnapshot } from '../lib/factory/costing.js';
import {
  handleChangeAttachmentDownload,
  handleChangeAttachmentList,
  handleChangeAttachmentPublic,
  handleChangeAttachmentUpload,
} from '../lib/server/change-attachments.js';
import { getChangeConsoleReadinessForTenant } from '../lib/server/change-console-readiness.js';
import { growthPipelineHandler } from '../lib/server/growth-pipeline.js';
import { recordTrustedAutomationEvent } from '../lib/automation/internal.js';
import { emitLogicFailure } from '../lib/cmp/_lib/telemetry.js';
import factoryCmpTicketSummariesHandler from '../lib/server/factory-cmp-ticket-summaries.js';
import handleClientDecisionsLinkMint from '../lib/server/factory-client-decisions-link-mint.js';

const prisma = new PrismaClient();

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return undefined;
  const v = query[key];
  if (Array.isArray(v)) return v[0];
  return v;
}

function normalizeRoutingPath(req) {
  let pathSeg = firstQuery(req.query, '__path');
  if (pathSeg != null && String(pathSeg).trim() !== '') {
    return String(pathSeg).replace(/^\/+/, '').replace(/\/+$/, '');
  }
  try {
    const raw = req.url || '/';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    return u.pathname.replace(/^\/api\//, '').replace(/\/$/, '') || '';
  } catch (_) {
    return '';
  }
}

/**
 * Some serverless runtimes only expose `__path` on `req.query` after the Vercel rewrite while
 * leaving `cf_preview` (and other pass-through params) on `req.url` only. Merge so tenant preview works.
 *
 * @param {import('http').IncomingMessage & { query?: Record<string, unknown> }} req
 * @returns {void}
 */
function augmentReqQueryFromUrl(req) {
  try {
    const raw = req.url || '';
    if (raw.indexOf('?') < 0) return;
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    const q = req.query && typeof req.query === 'object' ? { ...req.query } : {};
    for (const [k, v] of u.searchParams.entries()) {
      const cur = q[k];
      const empty =
        cur === undefined ||
        cur === null ||
        (Array.isArray(cur) && cur.length === 0) ||
        (typeof cur === 'string' && cur.trim() === '');
      if (empty) q[k] = v;
    }
    req.query = q;
  } catch {
    /* ignore */
  }
}

/**
 * Sync tenant hint from Host (no I/O). Sets req.corpflowContext for downstream handlers (e.g. CMP).
 *
 * **Surface rules:** `surface: "core"` = factory ops host (no client tenant derived from subdomain).
 * See `lib/server/host-tenant-context.js`.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {void}
 */
function attachTenantFromHost(req) {
  req.corpflowContext = buildCorpflowHostContext(req);
}

/**
 * Tag how `tenant_id` was derived when not already set from Postgres `tenant_hostnames`.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {void}
 */
function annotateCorpflowTenantIdSourceIfUnset(req) {
  if (req.corpflowTenantIdSource) return;
  const ctx = req.corpflowContext;
  if (!ctx || !ctx.host) return;
  const host = String(ctx.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '');
  const root = String(cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com'))
    .toLowerCase()
    .replace(/^\./, '');
  if (host === root || host === `www.${root}`) {
    req.corpflowTenantIdSource = 'apex';
    return;
  }
  const mapJson = cfg('CORPFLOW_TENANT_HOST_MAP', '');
  if (mapJson) {
    try {
      const m = JSON.parse(mapJson);
      if (m && typeof m === 'object' && typeof m[host] === 'string' && m[host].trim() !== '') {
        req.corpflowTenantIdSource = 'env_map';
        return;
      }
    } catch {
      /* ignore */
    }
  }
  if (host.endsWith(`.${root}`)) {
    req.corpflowTenantIdSource = 'subdomain';
    return;
  }
  req.corpflowTenantIdSource = 'other';
}

/**
 * When a user is on a tenant surface host, prefer the tenant_id from their session (auth_users)
 * over **subdomain** heuristics (e.g. `lux` vs canonical `luxe-maurice`).
 *
 * Never override **apex**, **env host map**, or **Postgres hostname** binding — those are authoritative
 * for which workspace this hostname represents (avoids Lux session cookie painting CorpFlow apex).
 *
 * @param {import('http').IncomingMessage} req
 * @returns {void}
 */
function reconcileCorpflowTenantContextWithSession(req) {
  try {
    const ctx = req.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return;

    if (isApexHostname(ctx.host)) return;
    if (req.corpflowTenantIdSource === 'postgres') return;
    if (req.corpflowTenantIdSource === 'env_map') return;

    const sess = getSessionFromRequest(req);
    if (!sess?.ok || sess.payload?.typ !== 'tenant' || sess.payload?.tenant_id == null) return;
    const stid = String(sess.payload.tenant_id).trim();
    if (!stid) return;
    req.corpflowContext = { ...ctx, tenant_id: stid };
  } catch (_) {
    /* ignore */
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {Promise<void>}
 */
async function applyCorpflowHostTenantResolution(req) {
  await attachTenantFromHostPg(req);
  annotateCorpflowTenantIdSourceIfUnset(req);
  const ctx = req.corpflowContext;
  const snap =
    ctx && ctx.surface === 'tenant' && ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
  req.corpflowHostTenantIdBeforeSession = snap;
  reconcileCorpflowTenantContextWithSession(req);
}

async function attachTenantFromHostPg(req) {
  // Start with the sync, no-I/O resolver.
  attachTenantFromHost(req);

  const ctx = req.corpflowContext;
  if (!ctx || ctx.surface !== 'tenant' || !ctx.host) return;

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return;

  const hostNorm = String(ctx.host || '')
    .toLowerCase()
    .replace(/:\d+$/, '');
  const rootDomain = String(cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com'))
    .toLowerCase()
    .replace(/^\./, '');
  const apexDbOverride =
    String(cfg('CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE', 'false')).toLowerCase() === 'true';
  if ((hostNorm === rootDomain || hostNorm === `www.${rootDomain}`) && !apexDbOverride) {
    // Apex: do not let `tenant_hostnames` override sync resolution. A bad row (e.g. corpflowai.com
    // -> luxe-maurice) used to paint Luxe branding on login/change for the whole apex domain.
    // Control apex tenant via CORPFLOW_TENANT_HOST_MAP and CORPFLOW_DEFAULT_TENANT_ID only.
    return;
  }

  try {
    const row = await prisma.tenantHostname.findUnique({
      where: { host: hostNorm },
      select: { tenantId: true, mode: true, enabled: true },
    });
    if (!row || row.enabled !== true) return;
    const tenantId = String(row.tenantId || '').trim();
    if (!tenantId) return;

    req.corpflowContext = {
      ...ctx,
      surface: 'tenant',
      tenant_id: tenantId,
      host_slug: tenantId,
    };
    /** Set when `tenant_id` came from `tenant_hostnames` (authoritative), not subdomain heuristics. */
    req.corpflowTenantIdSource = 'postgres';
    // Provide mode hint to UI context.
    req.corpflowUiMode = row.mode ? String(row.mode).trim().toLowerCase() : null;
  } catch (_) {
    // best-effort only
  }
}

/**
 * After vercel rewrite, pathname is /api/factory_router; CMP router expects
 * `action` in query or legacy pathname segments — set action from __path when needed.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} pathSeg
 * @returns {void}
 */
function prepareCmpRequest(req, pathSeg) {
  const q = { ...(req.query || {}) };
  delete q.__path;
  const cmpRest = pathSeg.replace(/^cmp\/?/, '');
  if (cmpRest && cmpRest !== 'router') {
    const hasAction = q.action != null && String(q.action).trim() !== '';
    if (!hasAction) {
      const parts = cmpRest.split('/').filter(Boolean);
      q.action = parts[parts.length - 1] || '';
    }
  }
  req.query = q;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleHealth(req, res) {
  return res.status(200).json({ status: 'operational', model: 'llama-3.3-70b-versatile' });
}

/**
 * Factory health: readiness aligned with vanguard/vercel-env-policy.json
 * (non–break-glass admin paths for ok; break-glass key not named in JSON).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleFactoryHealth(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rcFull = runtimeConfigDiagnostics();
  const runtime_config = {
    present: rcFull.present,
    parse_ok: rcFull.parse_ok,
    key_count: Array.isArray(rcFull.keys) ? rcFull.keys.length : 0,
    ...(rcFull.present && !rcFull.parse_ok && rcFull.parse_error
      ? { parse_error: rcFull.parse_error }
      : {}),
    ...(rcFull.first_char ? { first_char: rcFull.first_char } : {}),
  };

  const coreRaw = cfg('CORPFLOW_CORE_HOSTS', '').trim();
  const coreHostCount = coreRaw
    ? coreRaw.split(',').map((s) => s.trim()).filter(Boolean).length
    : 0;

  const postgresOk = Boolean(String(cfg('POSTGRES_URL', '')).trim());
  const sessionOk = Boolean(String(cfg('SOVEREIGN_SESSION_SECRET', '')).trim());
  const adminPin = String(cfg('ADMIN_PIN', '')).trim();
  const adminPw = String(cfg('CORPFLOW_ADMIN_PASSWORD', '')).trim();
  const adminHash = String(cfg('CORPFLOW_ADMIN_PASSWORD_HASH', '')).trim();
  const adminOperatorReady = Boolean(adminPin || adminPw || adminHash);

  const masterKey = String(cfg('MASTER_ADMIN_KEY', '')).trim();
  const headerBearerAuthAvailable = Boolean(masterKey || adminPin);
  const adminUser = String(cfg('CORPFLOW_ADMIN_USERNAME', '')).trim();
  const factoryAdminWebLoginConfigured = Boolean(adminUser && (adminPw || adminHash));

  const runtimeJsonOk = !rcFull.present || rcFull.parse_ok === true;
  const ok = postgresOk && sessionOk && adminOperatorReady && runtimeJsonOk;

  const automation = {
    cmp_mirror_enabled: String(cfg('CORPFLOW_AUTOMATION_CMP_MIRROR', 'true')).toLowerCase() !== 'false',
    ingest_secret_configured: Boolean(String(cfg('CORPFLOW_AUTOMATION_INGEST_SECRET', '')).trim()),
    approval_secret_configured: Boolean(String(cfg('CORPFLOW_AUTOMATION_APPROVAL_SECRET', '')).trim()),
    forward_url_configured: Boolean(String(cfg('CORPFLOW_AUTOMATION_FORWARD_URL', '')).trim()),
    tenant_bootstrap_secret_configured: Boolean(String(cfg('CORPFLOW_TENANT_BOOTSTRAP_SECRET', '')).trim()),
    tenant_bootstrap_ingest_enabled:
      String(cfg('CORPFLOW_AUTOMATION_TENANT_BOOTSTRAP', '')).toLowerCase() === 'true',
  };

  const password_reset_delivery = passwordResetDeliveryDiagnostics();
  const password_reset_ok =
    password_reset_delivery.webhook ||
    password_reset_delivery.resend ||
    password_reset_delivery.debug_token_return_enabled;

  let hint = 'All readiness checks passed.';
  if (!ok) {
    if (rcFull.present && !rcFull.parse_ok) {
      hint =
        'CORPFLOW_RUNTIME_CONFIG_JSON is present but invalid JSON. See runtime_config.parse_error; use strict JSON (no trailing commas, double quotes only).';
    } else if (!postgresOk || !sessionOk || !adminOperatorReady) {
      hint =
        'One or more readiness checks failed. Set POSTGRES_URL, SOVEREIGN_SESSION_SECRET, and at least one operator admin credential (ADMIN_PIN or CORPFLOW_ADMIN_PASSWORD / CORPFLOW_ADMIN_PASSWORD_HASH) per deployment policy.';
    } else {
      hint = 'Service degraded; see checks object.';
    }
  }

  let auth_hint =
    'Configure ADMIN_PIN or CORPFLOW_ADMIN_PASSWORD / HASH for script and policy-aligned healthy status; use /login with CORPFLOW_ADMIN_* for browser admin when set.';
  if (adminOperatorReady && headerBearerAuthAvailable) {
    auth_hint =
      'Operator admin credentials are configured; factory routes accept x-session-token / Bearer where applicable.';
  } else if (adminOperatorReady) {
    auth_hint =
      'Operator admin credentials are configured for policy-aligned readiness and supported automation paths.';
  } else if (headerBearerAuthAvailable && factoryAdminWebLoginConfigured) {
    auth_hint =
      'Add ADMIN_PIN or CORPFLOW_ADMIN_PASSWORD / HASH (or rely on configured browser admin) for healthy operator-readiness alongside optional header access.';
  } else if (headerBearerAuthAvailable) {
    auth_hint =
      'Add ADMIN_PIN or CORPFLOW_ADMIN_PASSWORD / HASH for healthy status; optional header or /login paths may still be configured separately.';
  } else if (factoryAdminWebLoginConfigured) {
    auth_hint =
      'Browser admin at /login is available; add ADMIN_PIN or CORPFLOW_ADMIN_PASSWORD / HASH in env for healthy operator-readiness per policy.';
  }

  return res.status(ok ? 200 : 503).json({
    ok,
    status: ok ? 'healthy' : 'degraded',
    checks: {
      database_configured: postgresOk,
      sovereign_session_configured: sessionOk,
      admin_operator_ready: adminOperatorReady,
      runtime_config_valid: runtimeJsonOk,
    },
    runtime_config,
    automation,
    password_reset_delivery_configured: password_reset_ok,
    password_reset_hint: password_reset_ok
      ? 'Tenant forgot-password can deliver via webhook and/or Resend when user exists.'
      : 'Set CORPFLOW_PASSWORD_RESET_WEBHOOK_URL (n8n → email) and/or CORPFLOW_PASSWORD_RESET_RESEND_API_KEY + CORPFLOW_PASSWORD_RESET_FROM_EMAIL, or use debug token only in non-prod.',
    factory_browser_admin_configured: factoryAdminWebLoginConfigured,
    tenancy_boundary: {
      core_hosts_configured: coreHostCount > 0,
      core_host_count: coreHostCount,
      default_apex_tenant_id: cfg('CORPFLOW_DEFAULT_TENANT_ID', 'root'),
      tenant_host_map_configured: Boolean(cfg('CORPFLOW_TENANT_HOST_MAP', '').trim()),
      root_domain: cfg('CORPFLOW_ROOT_DOMAIN', 'corpflowai.com'),
      /** Same value must exist on Preview + Production so `cf_preview` verifies on `*.vercel.app` deployments. */
      tenant_preview_secret_configured: Boolean(String(cfg('CORPFLOW_TENANT_PREVIEW_SECRET', '')).trim()),
    },
    hint,
    auth_hint,
  });
}

/**
 * Groq chat — parity with former `api/index.py` FastAPI route.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleChat(req, res) {
  const message = firstQuery(req.query, 'message');
  const mode = String(firstQuery(req.query, 'mode') || '').trim().toLowerCase();
  const key = getGroqApiKey();
  if (!key) {
    return res.status(200).json({ response: 'API Key missing. Please set GROQ_API_KEY in Vercel.' });
  }
  if (!message || String(message).trim() === '') {
    return res.status(400).json({ error: 'Missing query parameter: message' });
  }

  const ctx = req.corpflowContext || buildCorpflowHostContext(req);
  const tenantId = ctx?.surface === 'tenant' && ctx?.tenant_id ? String(ctx.tenant_id) : null;
  const correlationId =
    String(firstQuery(req.query, 'correlation_id') || firstQuery(req.query, 'correlationId') || '').trim() || null;

  if (mode === 'escalate' || mode === 'i_dont_know' || mode === 'unknown') {
    const brief = {
      kind: 'needs_brain',
      message: String(message),
      surface: ctx?.surface || null,
      tenant_id: tenantId,
      host: ctx?.host || null,
      correlation_id: correlationId,
      requested_at: new Date().toISOString(),
    };

    try {
      await recordTrustedAutomationEvent(prisma, {
        tenantId,
        eventType: 'client.question.needs_brain',
        payload: brief,
        idempotencyKey: `needs_brain:${tenantId || 'anon'}:${correlationId || String(message).slice(0, 64)}`,
        correlationId,
        source: 'api_chat',
      });
    } catch (e) {
      emitLogicFailure({
        source: 'api/chat',
        severity: 'warning',
        error: e,
        cmp: { ticket_id: 'n/a', action: 'chat-needs-brain' },
        recommended_action: 'Verify Postgres connectivity and automation_events table schema.',
        meta: { tenant_id: tenantId, host: ctx?.host || null },
      });
    }

    return res.status(200).json({
      response:
        "I don’t know confidently enough to answer that safely right now. I’ve escalated it to the operator so we can respond with the correct, verified answer.",
      outcome: 'needs_brain',
      client_options: [
        { id: 'escalate', label: "Escalate (I don't know)", enabled: true, hint: 'Creates an operator task.' },
      ],
      next_actions: [
        { id: 'ask_clarifying', label: 'Ask 1–2 clarifying questions', owner: 'client' },
        { id: 'operator_review', label: 'Operator reviews existing playbooks and answers', owner: 'operator' },
        { id: 'playbook_upsert', label: 'If repeatable, write/update an automation playbook', owner: 'operator' },
      ],
      escalation_brief: brief,
    });
  }

  try {
    const r = await groqChatCompletionsFetch({
      model: resolveGroqModel('primary'),
      messages: [
        {
          role: 'system',
          content:
            'You are the Serenity Wellness Concierge. You are professional, empathetic, and luxury-focused. You assist clients in Mauritius with beauty and wellness inquiries.',
        },
        { role: 'user', content: String(message) },
      ],
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      const errText =
        data?.error?.message || data?.message || `groq_http_${r.status}`;
      return res.status(200).json({ response: `System error: ${errText}` });
    }
    const text = data?.choices?.[0]?.message?.content ?? '';
    return res.status(200).json({
      response: text,
      outcome: 'answered',
      client_options: [{ id: 'escalate', label: "Escalate (I don't know)", enabled: true, mode: 'escalate' }],
    });
  } catch (e) {
    return res.status(200).json({ response: `System error: ${String(e?.message || e)}` });
  }
}

/**
 * Dashboard stats for `results.html` (legacy path; uses Prisma when available).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
async function handleStats(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const rows = leads.map((lead) => ({
      name: lead.name || lead.email || 'Lead',
      status: lead.status || 'NEW',
    }));
    return res.status(200).json({ count: rows.length, leads: rows });
  } catch (e) {
    return res.status(500).json({ error: 'STATS_FAILED', details: String(e?.message || e) });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

function firstCoreHostLoginUrl() {
  const raw = String(cfg('CORPFLOW_CORE_HOSTS', '')).trim();
  const first = raw
    .split(',')
    .map((s) => s.trim().toLowerCase().replace(/:\d+$/, ''))
    .filter(Boolean)[0];
  if (first) return `https://${first}/login`;
  const root = String(cfg('CORPFLOW_ROOT_DOMAIN', '')).trim().replace(/^\./, '');
  return root ? `https://core.${root}/login` : null;
}

function resolveUiMode(host, surface) {
  // Prefer DB-provided ui mode if present.
  // Note: attachTenantFromHostPg sets req.corpflowUiMode.
  const mapRaw = String(cfg('CORPFLOW_HOST_MODE_MAP', '')).trim();
  if (mapRaw) {
    try {
      const m = JSON.parse(mapRaw);
      if (m && typeof m === 'object') {
        const v = m[String(host || '').toLowerCase()];
        if (typeof v === 'string' && v.trim() !== '') return v.trim().toLowerCase();
      }
    } catch (_) {
      // ignore invalid JSON
    }
  }
  if (surface === 'core') return 'core';
  return 'client';
}

async function handleUiContext(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const ctx = req.corpflowContext || buildCorpflowHostContext(req);
  const sess = getSessionFromRequest(req);
  const session = sess?.ok
    ? {
        logged_in: true,
        level: sess.payload?.typ || 'unknown',
        tenant_id: sess.payload?.tenant_id != null ? String(sess.payload.tenant_id) : null,
      }
    : { logged_in: false, level: 'anonymous', tenant_id: null };

  const mode =
    req.corpflowUiMode ||
    resolveUiMode(ctx.host, ctx.surface);
  const rootDomain = String(cfg('CORPFLOW_ROOT_DOMAIN', '')).trim();
  const suggestedTenantConsoleUrl =
    ctx.surface === 'core' && rootDomain ? `https://${rootDomain}/change` : null;
  let billing_exempt = false;
  let token_credit_balance_usd = null;
  let show_approve_build = false;
  const tenantClientSession =
    session.logged_in === true &&
    session.tenant_id &&
    String(session.level || '').toLowerCase() === 'tenant';
  if (tenantClientSession) {
    try {
      const snap = await getTenantWalletSnapshot({ tenantId: session.tenant_id });
      billing_exempt = snap.billingExemptEffective === true;
      const bal = Number(snap.tokenCreditBalanceUsd);
      token_credit_balance_usd = Number.isFinite(bal) ? Math.round(bal * 100) / 100 : 0;
      show_approve_build =
        billing_exempt === true || (token_credit_balance_usd != null && token_credit_balance_usd > 0);
    } catch (_) {
      token_credit_balance_usd = null;
      billing_exempt = false;
      show_approve_build = false;
    }
  }

  /** One round-trip preflight for demos: DB tables + GitHub env (tenant sessions only). */
  let change_console_readiness = null;
  if (tenantClientSession && session.tenant_id) {
    try {
      change_console_readiness = await getChangeConsoleReadinessForTenant(session.tenant_id);
    } catch {
      change_console_readiness = {
        postgres_configured: false,
        cmp_tickets_ok: false,
        tenant_personas_ok: false,
        token_debits_table_ok: false,
        attachments_table_ok: false,
        github_dispatch_ready: false,
        warnings: ['Could not run Change Console readiness probe — check POSTGRES_URL and Prisma.'],
      };
    }
  }

  const core_login_url = firstCoreHostLoginUrl();
  /** @type {'operator' | 'client' | 'onboarding'} */
  let login_route = 'operator';
  let tenant_registered = null;
  let resolved_tenant_name = null;

  if (ctx.surface === 'core') {
    login_route = 'operator';
  } else if (ctx.surface === 'tenant') {
    const tid = ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
    if (!tid) {
      login_route = 'onboarding';
      tenant_registered = false;
    } else {
      try {
        const trow = await prisma.tenant.findUnique({
          where: { tenantId: tid },
          select: { tenantId: true, name: true },
        });
        tenant_registered = Boolean(trow);
        resolved_tenant_name = trow?.name != null ? String(trow.name) : null;
        login_route = trow ? 'client' : 'onboarding';
      } catch {
        tenant_registered = false;
        login_route = 'onboarding';
      }
    }
  }

  const hostSessionConflict = getTenantHostSessionConflict(req);

  return res.status(200).json({
    ok: true,
    host: ctx.host,
    surface: ctx.surface,
    tenant_id: ctx.tenant_id,
    mode,
    session,
    billing_exempt,
    token_credit_balance_usd,
    show_approve_build,
    change_console_readiness,
    root_domain: rootDomain || null,
    suggested_tenant_console_url: suggestedTenantConsoleUrl,
    login_route,
    tenant_registered,
    resolved_tenant_name,
    core_login_url,
    tenant_host_session_mismatch: Boolean(hostSessionConflict),
    tenant_host_session: hostSessionConflict,
  });
}

export default async function handler(req, res) {
  try {
    augmentReqQueryFromUrl(req);
    const pathSeg = normalizeRoutingPath(req);
    await applyCorpflowHostTenantResolution(req);

    if (!pathSeg || pathSeg === 'factory_router') {
      return res.status(200).json({ ok: true, service: 'factory_router' });
    }

    if (pathSeg === 'health') {
      return handleHealth(req, res);
    }
    if (pathSeg === 'factory/health') {
      return handleFactoryHealth(req, res);
    }
    if (pathSeg === 'chat') {
      return handleChat(req, res);
    }
    if (pathSeg === 'stats') {
      return handleStats(req, res);
    }
    if (pathSeg === 'ui/context') {
      return handleUiContext(req, res);
    }

  if (pathSeg === 'change-attachment/upload') {
    return handleChangeAttachmentUpload(req, res);
  }
  if (pathSeg === 'change-attachment/list') {
    return handleChangeAttachmentList(req, res);
  }
  if (pathSeg === 'change-attachment/download') {
    return handleChangeAttachmentDownload(req, res);
  }
  if (pathSeg === 'change-attachment/public') {
    return handleChangeAttachmentPublic(req, res);
  }

  if (pathSeg === 'growth' || pathSeg.startsWith('growth/')) {
    return growthPipelineHandler(req, res, pathSeg);
  }

  if (pathSeg === 'factory/cmp/push') {
    return factoryCmpPushHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/active-work-signal') {
    return factoryCmpActiveWorkSignalHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/ticket-set-description') {
    return factoryCmpTicketSetDescriptionHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/ticket-summaries') {
    return factoryCmpTicketSummariesHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/client-decisions-link-mint') {
    return handleClientDecisionsLinkMint(req, res);
  }

  if (pathSeg.startsWith('cmp') || pathSeg.startsWith('cmp/')) {
    prepareCmpRequest(req, pathSeg);
    // Minimal operator notification hook for AI Concierge Lite:
    // emit a structured event only after CMP returns 200 for concierge lead creation.
    try {
      const action = req?.query?.action != null ? String(req.query.action).trim() : '';
      const isConciergeCreate = req.method === 'POST' && action === 'concierge-lead-create';
      if (isConciergeCreate && typeof res.json === 'function') {
        const origJson = res.json.bind(res);
        res.json = (payload) => {
          try {
            const ok = payload && typeof payload === 'object' && payload.ok === true;
            if (ok && res.statusCode === 200) {
              const ctx = req.corpflowContext;
              const tenantId =
                ctx && ctx.surface === 'tenant' && ctx.tenant_id ? String(ctx.tenant_id).trim() : null;
              const leadId = payload?.lead?.id != null ? String(payload.lead.id) : null;
              const b = req.body && typeof req.body === 'object' ? req.body : {};
              const name = b?.name != null ? String(b.name).trim() : null;
              const contact = b?.contact != null ? String(b.contact).trim() : null;
              const message = b?.message != null ? String(b.message).trim() : null;

              // Console log: immediate visibility in Vercel logs.
              console.warn(
                '[concierge_lead_notification]',
                JSON.stringify({
                  tenant_id: tenantId,
                  lead_id: leadId,
                  name,
                  contact,
                  message,
                  occurred_at: new Date().toISOString(),
                }),
              );

              // Persist a structured event for future hooks (n8n/email can subscribe later).
              void recordTrustedAutomationEvent(prisma, {
                tenantId,
                eventType: 'concierge.lead.created',
                correlationId: leadId,
                idempotencyKey: leadId ? `concierge.lead.created:${leadId}` : null,
                source: 'api/cmp/router:concierge-lead-create',
                payload: { lead_id: leadId, name, contact, message },
              });
            }
          } catch (_) {
            // never block response
          }
          return origJson(payload);
        };
      }
    } catch {
      // never block CMP routing
    }
    return cmpHandler(req, res);
  }

  if (pathSeg === 'factory/tenants-overview') {
    return tenantsOverviewHandler(req, res);
  }
  if (pathSeg === 'factory/postgres/ensure-schema') {
    return postgresFactorySchemaHandler(req, res);
  }
  if (pathSeg === 'factory/tenant-site/upsert') {
    return tenantSiteHandler(req, res);
  }
  if (pathSeg === 'factory/tenant-site/read') {
    return tenantSiteReadHandler(req, res);
  }
  if (pathSeg === 'tenant/intake') {
    return tenantIntakeHandler(req, res);
  }
  if (pathSeg === 'tenant/site') {
    return tenantSitePublicHandler(req, res);
  }
  if (pathSeg === 'tenant/leads') {
    return handleTenantLeadCreate(req, res);
  }
  if (pathSeg === 'tenant/leads/qualify') {
    return handleTenantLeadQualify(req, res);
  }
  if (pathSeg === 'factory/host-map/upsert') {
    return tenantHostMapUpsertHandler(req, res);
  }
  if (pathSeg === 'factory/tenant-login-debug') {
    return tenantLoginDebugHandler(req, res);
  }
  if (pathSeg === 'factory/core-lux-ticket-migration-repair') {
    return handleCoreLuxTicketMigrationRepair(req, res, prisma);
  }
  if (pathSeg === 'factory/auth-users/list') {
    return handleFactoryAuthUsersList(req, res);
  }
  if (pathSeg === 'factory/auth-users/set-password') {
    return handleFactoryAuthUsersSetPassword(req, res);
  }
  if (pathSeg === 'factory/tenant/bootstrap') {
    return handleFactoryTenantBootstrap(req, res);
  }
  if (pathSeg === 'factory/technical-lead/run') {
    return handleTechnicalLeadFactoryMaster(req, res);
  }
  if (pathSeg === 'factory/technical-lead/audits') {
    return handleTechnicalLeadAuditsList(req, res);
  }
  if (pathSeg === 'factory/github/pr-create') {
    return factoryGithubPrCreateHandler(req, res);
  }
  if (pathSeg === 'factory/research/fetch') {
    return factoryResearchFetchHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/push') {
    return factoryCmpPushHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/ticket-set-description') {
    return factoryCmpTicketSetDescriptionHandler(req, res);
  }
  if (pathSeg === 'factory/cmp/ticket-summaries') {
    return factoryCmpTicketSummariesHandler(req, res);
  }

    switch (pathSeg) {
      case 'auth/login':
        return handleAuthLogin(req, res);
      case 'auth/password-reset/request':
        return handleAuthPasswordResetRequest(req, res);
      case 'auth/password-reset/confirm':
        return handleAuthPasswordResetConfirm(req, res);
      case 'auth/me':
        return handleAuthMe(req, res);
      case 'auth/logout':
        return handleAuthLogout(req, res);
      case 'automation/ingest':
        return handleAutomationIngest(req, res);
      case 'automation/playbooks':
        return handleAutomationPlaybooksList(req, res);
      case 'automation/events':
        return handleAutomationEventsList(req, res);
      case 'main':
        return mainHandler(req, res);
      case 'intake':
        return mainHandler(req, res);
      case 'audit':
        return auditHandler(req, res);
      case 'feedback':
        return feedbackHandler(req, res);
      case 'admin-leads':
        return adminLeadsHandler(req, res);
      case 'legal-search':
        return legalSearchHandler(req, res);
      case 'provision':
        return provisionHandler(req, res);
      case 'webhook':
        return webhookHandler(req, res);
      case 'cron/billing-sentinel':
        return billingSentinelHandler(req, res);
      case 'cron/technical-lead':
        return technicalLeadCronHandler(req, res);
      case 'cron/cmp-monitor':
        return cmpMonitorCronHandler(req, res);
      default:
        return res.status(404).json({ error: 'Unknown route', path: pathSeg });
    }
  } catch (e) {
    try {
      console.error('factory_router fatal', e);
    } catch (_) {}
    const detail = e instanceof Error ? e.message : String(e);
    let rc = null;
    try {
      rc = runtimeConfigDiagnostics();
    } catch (_) {
      rc = null;
    }
    return res.status(500).json({
      error: 'FACTORY_ROUTER_FATAL',
      detail,
      runtime_config: rc,
    });
  }
}

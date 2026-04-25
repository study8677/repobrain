import { signSovereignSession, verifySovereignSessionToken, getSovereignSessionSecret } from './_lib/sovereign-session.js';
import { generateSecureTenantPin, hashPinForStorage, verifyPinAgainstStored } from './_lib/tenant-pin.js';
import { recordSovereignAuditEvent } from '../server/audit.js';
import { readTenantTelemetryTail, readTenantTelemetryTailPg } from '../server/tenant-telemetry-tail.js';
import { computeMarketValueCost } from './_lib/costing-engine.js';
import {
  buildImpactSummary,
  inferComplexityFromDescription,
  inferEffortHoursBand,
  inferRiskFromDescription,
} from './_lib/preview-heuristics.js';
import { fetchVercelPreviewUrlForCmpBranch } from './_lib/vercel-preview.js';
import { buildClarificationQuestions } from './_lib/ai-interview.js';
import {
  dispatchCmpSandboxStart,
  fetchCmpOverseerSummary,
  fetchCmpPullRequest,
  fetchCmpTicketActivity,
  mergeCmpPullRequest,
  addLabelsToCmpPullRequest,
  notifyCmpAutomationWebhook,
} from './_lib/github-dispatch.js';
import { recordTrustedAutomationEvent } from '../automation/internal.js';
import { emitLogicFailure } from './_lib/telemetry.js';
import {
  buildTicketProgress,
  deriveWorkflowState,
  nextActionForWorkflowState,
} from './_lib/change-workflow-state.js';
import {
  applyClientDecisionAnswers,
  ensureClientDecisionsOnConsoleJson,
  evaluateClientDecisionsGate,
  mergeProgrammeInternalDecisionsForTicket,
  pickClientDecisionAnswersOnly,
  umbrellaInternalDecisionsNeedPersist,
} from './_lib/client-decisions-client.js';
import {
  getRequiredRealityUrls,
  runRealityGateFetch,
  isRealityGateStale,
  mergeRealityGateIntoConsoleJson,
} from './_lib/reality-gate.js';
import { runStuckSelfRepair } from './_lib/cmp-stuck-self-repair.js';
import { verifyRigorNode, verifyRigorBypassEthics } from './_lib/verify-rigor-node.js';
import { debitTokenCreditBalancePg, getTenantWalletSnapshot } from '../factory/costing.js';
import { getSessionFromRequest } from '../server/session.js';
import { PrismaClient } from '@prisma/client';
import { cfg } from '../server/runtime-config.js';
import { runGovernedGroqChangeRefiner } from '../server/groq-change-refiner-service.js';
import { computeRefinementWorkflowPatch } from './_lib/change-refine-workflow.js';
import { computeRealityPanel } from './_lib/reality-panel-compute.js';
import {
  applyEscalatedRefinementMessages,
  buildGovernedOperatorDraft,
  evaluateOperatorEscalation,
} from './_lib/cmp-operator-escalation.js';
import { syncChangeTypeFromBriefToConsoleViews } from '../server/change-type-classification.js';
import { getTenantHostSessionConflict } from '../server/tenant-host-session-gate.js';
import { evaluateOnboardingHostnamePolicy } from '../server/tenant-hostname-policy.js';
import { withClientSitePreviewFields } from '../server/tenant-preview-token.js';
import { applyVisualClientPreviewGate, mergeDeliveryIntegrityIntoClientView } from '../server/client-preview-gate.js';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Vercel serverless functions run with `process.cwd()` at the repo root (`/var/task`).
// Avoid `import.meta.url` so this module can execute under CJS-wrapped runtimes.
const REPO_ROOT = path.resolve(process.cwd());
const SECRETS_MANIFEST_PATH = path.join(REPO_ROOT, 'vanguard', 'secrets-manifest.json');

/** Bounded subprocess I/O for Python helpers (no unbounded stdout on pathological runs). */
const PYTHON_SPAWN_OPTS = { encoding: 'utf8', timeout: 120_000, maxBuffer: 2_000_000 };

const DORMANT_GATE_ENABLED =
  String(process.env.DORMANT_GATE_ENABLED || 'true').toLowerCase() === 'true';

/**
 * CMP actions allowed when the caller has a tenant login session (password/PIN → HttpOnly cookie).
 * Without this, Change Console shows "logged in" but ticket-operator-queue / ticket-get / etc. return 403.
 * Factory-only routes remain gated separately; tenant rows are still scoped in handlers.
 */
const TENANT_LOGIN_SESSION_CMP_ACTIONS = new Set([
  'approve-build',
  'assist-request',
  'change-chat',
  'change-chat-commit-draft',
  'client-decisions-get',
  'submit-client-decisions',
  'costing-preview',
  'preview-review',
  'promote-status',
  'technical-lead-latest',
  'ticket-activity',
  'ticket-create',
  'ticket-get',
  'ticket-list',
  'ticket-operator-queue',
  'reality-gate-run',
]);

function timingSafeEquals(a, b) {
  try {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const aBuf = Buffer.from(a, 'utf8');
    const bBuf = Buffer.from(b, 'utf8');
    if (aBuf.length !== bBuf.length) return false;
    return crypto.timingSafeEqual(aBuf, bBuf);
  } catch (_) {
    return false;
  }
}

function readJsonFileSafe(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function getClientIdFromBody(body) {
  return (
    body?.client_id ||
    body?.clientId ||
    body?.tenant_id ||
    body?.tenantId ||
    null
  );
}

function getClientIdFromHostContext(req) {
  try {
    const ctx = req?.corpflowContext;
    if (!ctx || ctx.surface !== 'tenant') return null;
    const tid = ctx.tenant_id != null ? String(ctx.tenant_id).trim() : '';
    return tid || null;
  } catch {
    return null;
  }
}

/**
 * Canonical tenant id for CMP writes (cmp_tickets.tenant_id, rigor client_id, token balance, etc.).
 * Password/PIN sessions carry Postgres `auth_users.tenant_id` (e.g. `luxe-maurice`). Host-derived
 * `req.corpflowContext.tenant_id` can differ (e.g. subdomain `lux` vs real tenant id) when
 * `tenant_hostnames` is missing or out of sync — session wins for tenant logins to avoid orphan tickets.
 *
 * @param {import('http').IncomingMessage} req
 * @param {Record<string, unknown> | null | undefined} body
 * @returns {string | null}
 */
function resolveCmpClientIdForWrite(req, body) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id != null) {
    const tid = String(sess.payload.tenant_id).trim();
    if (tid) return tid;
  }
  const b = body && typeof body === 'object' ? body : {};
  return getClientIdFromBody(b) || getClientIdFromHostContext(req) || null;
}

function getClientTier(clientId) {
  if (!clientId) return 'PERIODIC';
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const tenantAccess = manifest?.tenant_access?.[clientId];
  const tier = tenantAccess?.client_tier;
  if (tier === 'STATIC' || tier === 'PERIODIC' || tier === 'EVOLVING') return tier;
  return 'PERIODIC';
}

function getClusterEnabled(clientId, subUserId, clusterName) {
  if (!clientId || !subUserId) return false;
  // Prefer staff-matrix.json (if tenant provides it) to determine staff cluster membership.
  const staffMatrixPath1 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff-matrix.json');
  const staffMatrixPath2 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff_matrix.json');
  const staffMatrix =
    readJsonFileSafe(staffMatrixPath1) || readJsonFileSafe(staffMatrixPath2) || null;

  const fromMatrix = staffMatrix?.staff_members?.[subUserId]?.clusters_enabled;
  if (Array.isArray(fromMatrix)) {
    if (fromMatrix.includes(clusterName)) return true;
    // Back-compat: allow "Comms" <-> "Operations" when tenant uses different naming.
    if (clusterName === 'Comms' && fromMatrix.includes('Operations')) return true;
    if (clusterName === 'Operations' && fromMatrix.includes('Comms')) return true;
    return false;
  }

  // Backwards-compatible fallback to secrets-manifest access_clusters.
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters;
  const enabled = accessClusters?.sub_users?.[subUserId]?.clusters_enabled || [];
  return Array.isArray(enabled) && enabled.includes(clusterName);
}

function loadStaffMatrixForTenant(clientId) {
  const staffMatrixPath1 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff-matrix.json');
  const staffMatrixPath2 = path.join(REPO_ROOT, 'tenants', clientId, 'config', 'staff_matrix.json');
  return readJsonFileSafe(staffMatrixPath1) || readJsonFileSafe(staffMatrixPath2) || null;
}

function getAuthorizedRepWhatsAppNumbers(clientId) {
  const sm = loadStaffMatrixForTenant(clientId);
  const fromMatrix =
    sm?.authorized_representatives?.map((r) => r?.contact_details?.whatsapp_number).filter(Boolean) || [];
  const normalized = fromMatrix
    .map((n) => String(n).trim())
    .filter((n) => n !== '');
  return normalized;
}

function isAuthorizedRepresentative(clientId, staffId) {
  const sm = loadStaffMatrixForTenant(clientId);
  if (sm?.authorized_representatives && Array.isArray(sm.authorized_representatives)) {
    if (sm.authorized_representatives.some((r) => String(r?.staff_id || '') === String(staffId))) {
      return true;
    }
  }

  // Fallback: use secrets-manifest client_admins as "Authorized Representatives".
  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH);
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters;
  const clientAdmins = accessClusters?.client_admins || [];
  return clientAdmins.includes(staffId);
}

function requiredClusterForAction(action) {
  if (action === 'evolution-request') return 'Financials';
  if (action === 'market-research') return 'Marketing';
  if (action === 'supplier-onboard') return 'Comms';
  return null;
}

function getSubUserId(req) {
  const headerVal =
    req?.headers?.get?.('x-subuser-id') ||
    req?.headers?.['x-subuser-id'] ||
    req?.query?.sub_user_id ||
    req?.body?.sub_user_id ||
    req?.body?.subUserId ||
    null;
  return headerVal ? String(headerVal) : null;
}

function requireDormantGate(req, res, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  if (verifyDormantGateCredentials(req, action)) return true;

  emitLogicFailure({
    source: 'api/cmp/router.js:dormant-gate',
    severity: 'warning',
    error: new Error(`Dormant Gate blocked action=${action}`),
    cmp: { ticket_id: 'n/a', action },
    recommended_action:
      'Provide factory master token, or (if allowed for this action) a valid sovereign session JWT.',
  });

  return deny(res, 403, 'Dormant Gate: session token required.', { action });
}

/**
 * Factory master only (tenant sovereign JWT must not provision PINs).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} action
 * @returns {true | import('http').ServerResponse}
 */
function requireFactoryMasterOnly(req, res, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  const sess = getSessionFromRequest(req);
  if (sess?.ok === true && sess.payload?.typ === 'admin') return true;
  if (verifyFactoryMasterToken(req)) return true;

  emitLogicFailure({
    source: 'api/cmp/router.js:factory-master-only',
    severity: 'warning',
    error: new Error(`Factory master required for action=${action}`),
    cmp: { ticket_id: 'n/a', action },
    recommended_action: 'Provide MASTER_ADMIN_KEY or ADMIN_PIN via token / x-session-token.',
  });

  return deny(res, 403, 'Factory master token required.', { action });
}

function redactPotentialSecrets(input) {
  const redactKeys = ['token', 'api_key', 'apikey', 'secret', 'auth_token', 'access_token', 'password'];

  if (input == null) return input;
  if (typeof input !== 'object') return input;

  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const lk = String(k).toLowerCase();
        if (redactKeys.includes(lk) || lk.endsWith('_token') || lk.includes('password')) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = walk(val);
        }
      }
      return out;
    }
    return v;
  };

  return walk(input);
}

/**
 * Factory master lane: query/body `token` or `x-session-token` header vs env secret.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {boolean}
 */
function verifyFactoryMasterToken(req) {
  const token =
    (req.query?.token ||
      req.body?.token ||
      req.headers?.get?.('x-session-token') ||
      req.headers?.['x-session-token'] ||
      '')?.toString();
  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  if (!token || !master) return false;
  return timingSafeEquals(token, master);
}

/**
 * @param {import('http').IncomingMessage} req
 * @returns {string}
 */
function extractSovereignBearer(req) {
  const h =
    req.headers?.authorization ||
    req.headers?.Authorization ||
    req.headers?.get?.('authorization');
  const s = h ? String(h) : '';
  if (/^\s*Bearer\s+/i.test(s)) {
    return s.replace(/^\s*Bearer\s+/i, '').trim();
  }
  const xh = req.headers?.['x-sovereign-session'] || req.headers?.get?.('x-sovereign-session');
  return xh ? String(xh).trim() : '';
}

/**
 * @param {string} action
 * @returns {boolean}
 */
function tenantJwtSatisfiesDormantGate(action) {
  const raw = process.env.CORPFLOW_TENANT_JWT_DORMANT_ACTIONS || '';
  const set = new Set(
    raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return set.has(String(action || '').toLowerCase());
}

/**
 * Tenant sovereign lane: Bearer / x-sovereign-session HMAC token from bootstrap.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {{ ok: boolean, payload?: Record<string, unknown> | null }}
 */
function verifyTenantSovereignJwt(req) {
  const secret = getSovereignSessionSecret();
  if (!secret) return { ok: false, payload: null };
  const token = extractSovereignBearer(req);
  if (!token) return { ok: false, payload: null };
  const v = verifySovereignSessionToken(token, secret);
  if (!v.ok || v.payload?.typ !== 'sovereign') return { ok: false, payload: null };
  return { ok: true, payload: v.payload };
}

/**
 * When non-null, ticket-scoped reads must only expose rows for this tenant id.
 *
 * @param {import('http').IncomingMessage} req
 * @returns {string | null}
 */
function resolveTenantIdForScopedTicketRead(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'admin') return null;
  if (verifyFactoryMasterToken(req)) return null;
  if (sess?.ok && sess.payload?.typ === 'tenant' && sess.payload?.tenant_id) {
    return String(sess.payload.tenant_id).trim() || null;
  }
  const t = verifyTenantSovereignJwt(req);
  if (t.ok && t.payload?.tenant_id) return String(t.payload.tenant_id).trim() || null;
  return null;
}

/**
 * Ticket list visibility: core (admin) vs one tenant vs break-glass factory master (all rows).
 *
 * @param {import('http').IncomingMessage} req
 * @returns
 *   | { kind: 'core' }
 *   | { kind: 'tenant', tenantId: string }
 *   | { kind: 'factory_master' }
 *   | { kind: 'invalid_tenant_session' }
 *   | { kind: 'unknown' }
 */
function resolveCmpTicketListScope(req) {
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'admin') {
    return { kind: 'core' };
  }
  if (sess?.ok && sess.payload?.typ === 'tenant') {
    const tid = sess.payload?.tenant_id != null ? String(sess.payload.tenant_id).trim() : '';
    if (!tid) return { kind: 'invalid_tenant_session' };
    return { kind: 'tenant', tenantId: tid };
  }
  if (verifyFactoryMasterToken(req)) {
    return { kind: 'factory_master' };
  }
  const jwt = verifyTenantSovereignJwt(req);
  if (jwt.ok && jwt.payload?.tenant_id != null) {
    const tid = String(jwt.payload.tenant_id).trim();
    if (!tid) return { kind: 'unknown' };
    return { kind: 'tenant', tenantId: tid };
  }
  return { kind: 'unknown' };
}

/**
 * Two-lane dormant gate: factory_master (env) or tenant_sovereign (JWT) when action is allowlisted.
 *
 * @param {import('http').IncomingMessage} req
 * @param {string} action
 * @returns {boolean}
 */
function verifyDormantGateCredentials(req, action) {
  if (!DORMANT_GATE_ENABLED) return true;
  // Prefer cookie sessions (admin or tenant) so users never paste long secrets into the UI.
  const sess = getSessionFromRequest(req);
  if (sess?.ok && sess.payload?.typ === 'admin') return true;
  const a = String(action || '').toLowerCase();
  if (sess?.ok && sess.payload?.typ === 'tenant' && TENANT_LOGIN_SESSION_CMP_ACTIONS.has(a)) {
    return true;
  }
  if (sess?.ok && sess.payload?.typ === 'tenant' && tenantJwtSatisfiesDormantGate(action)) return true;
  if (verifyFactoryMasterToken(req)) return true;
  if (tenantJwtSatisfiesDormantGate(action)) {
    const t = verifyTenantSovereignJwt(req);
    return t.ok === true;
  }
  return false;
}

function deny(res, status, error, extra) {
  const payload = { error };
  if (extra) Object.assign(payload, extra);
  return res.status(status).json(payload);
}

function verifyRigorViaPython({
  description,
  costUsd,
  clientId,
  action,
  ticketId,
  authorizedRepWhatsAppNumbers,
  clientAcknowledged,
  rigorReportId,
}) {
  const scriptPath = path.join(REPO_ROOT, 'vanguard', 'verify-rigor.py');

  const repNums = Array.isArray(authorizedRepWhatsAppNumbers)
    ? authorizedRepWhatsAppNumbers
    : [];

  const args = [
    scriptPath,
    '--description',
    String(description || ''),
    '--cost_usd',
    String(costUsd ?? 0),
    '--client_id',
    clientId || 'root',
    '--action',
    action,
    '--ticket_id',
    ticketId || 'n/a',
    '--authorized_rep_whatsapp_numbers',
    repNums.join(','),
  ];

  if (clientAcknowledged) args.push('--client_acknowledged');
  if (rigorReportId) {
    args.push('--rigor_report_id');
    args.push(String(rigorReportId));
  }

  const result = spawnSync('python', args, PYTHON_SPAWN_OPTS);

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString();
    throw new Error(`verify-rigor failed (exit ${result.status}): ${stderr.slice(0, 500)}`);
  }

  const stdout = (result.stdout || '').toString().trim();
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`verify-rigor returned non-JSON output: ${stdout.slice(0, 500)}`);
  }
}

/**
 * @param {unknown} e
 * @returns {boolean}
 */
function isPythonSpawnEnoent(e) {
  if (!e) return false;
  if (typeof e === 'object' && e !== null && 'code' in e && String(/** @type {{ code?: unknown }} */ (e).code) === 'ENOENT') {
    return true;
  }
  const m = e instanceof Error ? e.message : String(e);
  const lower = m.toLowerCase();
  return lower.includes('enoent') && (lower.includes('python') || lower.includes('spawn'));
}

/**
 * Vanguard gate: Python verifier when available; on Vercel (no `python`) auto-falls back to Node.
 *
 * Env `CORPFLOW_VANGUARD_MODE`:
 * - `auto` (default): try Python, then Node on ENOENT
 * - `node`: Node heuristic only (budget + keyword/length ethical score)
 * - `python`: Python only (throws if unavailable)
 * - `off` / `disabled`: ethics bypass — **still enforces** HARD_BUDGET_CAP_USD (dangerous)
 *
 * @param {Parameters<typeof verifyRigorViaPython>[0]} opts
 * @returns {ReturnType<typeof verifyRigorViaPython>}
 */
function resolveVerifyRigorVerdict(opts) {
  const mode = String(cfg('CORPFLOW_VANGUARD_MODE', 'auto')).trim().toLowerCase();
  if (mode === 'off' || mode === 'disabled') {
    return verifyRigorBypassEthics({ costUsd: opts.costUsd });
  }
  if (mode === 'node') {
    return verifyRigorNode(opts);
  }
  if (mode === 'python') {
    return verifyRigorViaPython(opts);
  }
  try {
    return verifyRigorViaPython(opts);
  } catch (e) {
    if (isPythonSpawnEnoent(e)) {
      emitLogicFailure({
        source: 'api/cmp/router.js:resolveVerifyRigorVerdict',
        severity: 'warning',
        error: e instanceof Error ? e : new Error(String(e)),
        cmp: { ticket_id: opts.ticketId || 'n/a', action: opts.action || 'verify-rigor' },
        recommended_action:
          'Python executable not found (typical on Vercel). Fell back to Node ethical heuristic. Set CORPFLOW_VANGUARD_MODE=node to skip the Python attempt.',
        meta: { fallback_engine: 'node' },
      });
      return verifyRigorNode(opts);
    }
    throw e;
  }
}

function ensureTenantProvisionedViaPython(tenantId) {
  const scriptPath = path.join(REPO_ROOT, 'core', 'engine', 'provisioning.py');
  const result = spawnSync('python', [scriptPath, '--tenant_id', String(tenantId || 'root')], PYTHON_SPAWN_OPTS);
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const stderr = (result.stderr || '').toString();
    throw new Error(`provisioning failed (exit ${result.status}): ${stderr.slice(0, 500)}`);
  }
  const stdout = (result.stdout || '').toString().trim();
  if (!stdout) return {};
  try {
    return JSON.parse(stdout);
  } catch (_) {
    return {};
  }
}

/**
 * Single CMP serverless entry (Hobby-friendly). Routed via:
 * - `vercel.json` rewrite: `/api/cmp/...` → `/api/factory_router?__path=cmp/...` (query preserved)
 * - Optional: `?action=ticket-create` on `/api/cmp/router`
 */
function resolveAction(req) {
  let a = req.query?.action;
  if (Array.isArray(a)) a = a[0];
  if (a != null && String(a).trim() !== '') {
    return String(a).replace(/\.js$/i, '').trim().toLowerCase();
  }
  const bod = req.body;
  if (bod && typeof bod === 'object' && !Array.isArray(bod) && bod.cmp_action != null) {
    const ca = String(bod.cmp_action).trim();
    if (ca) return ca.replace(/\.js$/i, '').toLowerCase();
  }
  try {
    const raw = req.url || '/';
    const u = raw.startsWith('http') ? new URL(raw) : new URL(raw, 'http://localhost');
    const fromQ = u.searchParams.get('action');
    if (fromQ) return fromQ.replace(/\.js$/i, '').trim().toLowerCase();
    const parts = u.pathname.split('/').filter(Boolean);
    const i = parts.indexOf('cmp');
    if (i >= 0 && parts[i + 1]) {
      const seg = parts[i + 1].replace(/\.js$/i, '').toLowerCase();
      if (seg !== 'router') return seg;
    }
  } catch (_) {}
  return '';
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
 * Use inline description if present; otherwise load from CMP storage (Postgres only).
 *
 * @param {string} ticketId
 * @param {unknown} inlineDescription
 * @returns {Promise<string>}
 */
async function resolveCmpDescriptionFromTicket(ticketId, inlineDescription) {
  let description = typeof inlineDescription === 'string' ? inlineDescription.trim() : '';
  if (description) return description;
  const tid = ticketId != null ? String(ticketId).trim() : '';
  if (!tid) return '';

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return '';
  const t = await prisma.cmpTicket.findUnique({ where: { id: tid } });
  return typeof t?.description === 'string' ? t.description.trim() : '';
}

/**
 * Build an "authoritative" build-ready description from a stored brief.
 * This is tenant-safe content (summary/scope/acceptance criteria), not secrets.
 *
 * @param {string} descriptionBase
 * @param {unknown} brief
 * @returns {string}
 */
function buildAuthoritativeDescriptionFromBrief(descriptionBase, brief) {
  const base = String(descriptionBase || '').trim();
  const b = brief && typeof brief === 'object' ? brief : null;
  if (!b) return base;

  const summary = typeof b.summary === 'string' ? b.summary.trim() : '';
  const requestedChange = typeof b.requested_change === 'string' ? b.requested_change.trim() : '';
  const scopeIn =
    typeof b.scope_in === 'string' && b.scope_in.trim()
      ? b.scope_in.trim()
      : typeof b.scope === 'string'
        ? b.scope.trim()
        : '';
  const scopeOut = typeof b.scope_out === 'string' ? b.scope_out.trim() : '';
  const acRaw = Array.isArray(b.acceptance_criteria) ? b.acceptance_criteria : [];
  const acceptance = acRaw
    .map((x) => (typeof x === 'string' ? x.trim() : String(x || '').trim()))
    .filter(Boolean)
    .slice(0, 24);
  const riskRaw = Array.isArray(b.risks) ? b.risks : [];
  const risks = riskRaw
    .map((x) => (typeof x === 'string' ? x.trim() : String(x || '').trim()))
    .filter(Boolean)
    .slice(0, 12);

  const parts = [];
  if (base) parts.push(base);
  if (summary) parts.push(`Brief summary:\n${summary}`);
  if (requestedChange) parts.push(`Requested change:\n${requestedChange}`);
  if (scopeIn) parts.push(`Scope in:\n${scopeIn}`);
  if (scopeOut) parts.push(`Scope out:\n${scopeOut}`);
  if (acceptance.length) parts.push(`Acceptance criteria:\n- ${acceptance.join('\n- ')}`);
  if (risks.length) parts.push(`Risks:\n- ${risks.join('\n- ')}`);
  return parts.join('\n\n').trim();
}

async function handleTicketCreate(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-create');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;
  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  try {
    const clientId = resolveCmpClientIdForWrite(req, body);
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }

    const locale0 =
      typeof body?.locale === 'string' && body.locale.trim() ? body.locale.trim() : 'en';
    const row = await prisma.cmpTicket.create({
      data: {
        tenantId: clientId ? String(clientId) : null,
        description,
        status: 'Open',
        stage: 'Intake',
        locale: locale0,
        consoleJson: {
          locale: locale0,
          brief: {},
          messages: [],
          client_view: {
            workflow_state: 'intake',
            workflow_next_action: nextActionForWorkflowState('intake'),
            progress_message: 'Ticket created — preparing guided refinement…',
          },
        },
      },
    });

    const existingBriefCreate = {};
    const createMessages = [{ role: 'user', content: description, ts: new Date().toISOString() }];
    const nowCreateIso = new Date().toISOString();
    const descHash = crypto.createHash('sha256').update(String(description || ''), 'utf8').digest('hex');
    const refinedCreate = await runGovernedGroqChangeRefiner({
      prisma,
      ticketId: row.id,
      tenantId: row.tenantId != null ? String(row.tenantId) : null,
      messages: createMessages,
      locale: locale0,
      existingBrief: existingBriefCreate,
    });
    const assistantCreate = {
      role: 'assistant',
      content: String(refinedCreate.assistant || '').trim() || 'OK',
      ts: nowCreateIso,
      ok: Boolean(refinedCreate.llm_ok),
    };
    const briefForEscalation =
      refinedCreate.brief && typeof refinedCreate.brief === 'object' ? refinedCreate.brief : {};
    const escalationCreate = evaluateOperatorEscalation({
      description,
      brief: /** @type {Record<string, unknown>} */ (briefForEscalation),
      latestUserMessage: description,
      transcriptTail: description,
      nowIso: nowCreateIso,
      lastUserMsgTs: nowCreateIso,
      ticketDescriptionHash: descHash,
    });

    let storedCreate = {
      locale: locale0,
      brief: briefForEscalation,
      messages: [],
      client_view: {
        workflow_state: 'intake',
        workflow_next_action: nextActionForWorkflowState('intake'),
        progress_message: '',
      },
    };
    const withholdCreate = applyEscalatedRefinementMessages(storedCreate, {
      baseMessages: createMessages,
      assistantMsg: {
        ...assistantCreate,
        content: escalationCreate.operator_assisted
          ? buildGovernedOperatorDraft({
              rawAssistant: assistantCreate.content,
              brief: /** @type {Record<string, unknown>} */ (briefForEscalation),
              evidence: escalationCreate.operator_escalation,
              exists: null,
            })
          : assistantCreate.content,
      },
      assessment: escalationCreate,
      refinedMeta: refinedCreate,
    });
    try {
      const briefObj = storedCreate.brief && typeof storedCreate.brief === 'object' ? storedCreate.brief : {};
      const wfCreate = computeRefinementWorkflowPatch(/** @type {Record<string, unknown>} */ (briefObj));
      const prevCv = storedCreate.client_view && typeof storedCreate.client_view === 'object' ? storedCreate.client_view : {};
      storedCreate.client_view = { ...prevCv, ...wfCreate };
    } catch (_) {}
    storedCreate = syncChangeTypeFromBriefToConsoleViews(
      storedCreate && typeof storedCreate === 'object' ? storedCreate : {},
    );

    await prisma.cmpTicket.update({
      where: { id: row.id },
      data: {
        consoleJson: storedCreate,
        locale: storedCreate.locale,
        brief: storedCreate?.brief?.summary ? String(storedCreate.brief.summary) : undefined,
      },
    });

    const ticketProgressCreate = buildTicketProgress(storedCreate, row.status || 'Open', row.stage || 'Intake', {
      ticketId: row.id,
      tenantId: row.tenantId,
    });
    const normCreate = normalizeConsoleJson(storedCreate);
    const briefStructuredCreate =
      normCreate.brief && typeof normCreate.brief === 'object' ? normCreate.brief : null;
    const refinementMessagesCreate = Array.isArray(normCreate.messages)
      ? normCreate.messages
          .slice(-60)
          .map((m) => {
            if (!m || typeof m !== 'object') return null;
            const role = m.role === 'assistant' ? 'assistant' : 'user';
            const content = String(m.content || '').trim();
            const ts = m.ts != null ? String(m.ts) : null;
            if (!content) return null;
            return { role, content, ts };
          })
          .filter(Boolean)
      : [];

    await recordTrustedAutomationEvent(prisma, {
      tenantId: row.tenantId,
      eventType: 'cmp.ticket.created',
      payload: {
        ticket_id: row.id,
        status: row.status || 'Open',
        stage: row.stage || 'Intake',
        locale: row.locale || null,
        initial_refinement: true,
        refinement_source: refinedCreate.refinement_source || (refinedCreate.llm_ok ? 'groq' : 'deterministic'),
      },
      idempotencyKey: `cmp:ticket:created:${row.id}`,
      source: 'cmp',
    });
    const missCreate = Array.isArray(storedCreate.brief?.missing_information)
      ? storedCreate.brief.missing_information
      : [];
    return res.status(200).json({
      ticket_id: row.id,
      source: 'postgres',
      assistant: withholdCreate.withheld ? null : assistantCreate.content,
      pending_approval: withholdCreate.withheld === true,
      draft_assistant: withholdCreate.withheld ? assistantCreate.content : undefined,
      mode: storedCreate.mode || undefined,
      pending_operator_draft: withholdCreate.withheld ? storedCreate.pending_operator_draft : undefined,
      operator_escalation_reasons: escalationCreate.reasons.length ? escalationCreate.reasons : undefined,
      brief: storedCreate.brief,
      ticket_progress: ticketProgressCreate,
      brief_structured: briefStructuredCreate || undefined,
      refinement_messages: refinementMessagesCreate.length ? refinementMessagesCreate : undefined,
      initial_refinement: true,
      refinement_source: refinedCreate.refinement_source || (refinedCreate.llm_ok ? 'groq' : 'deterministic'),
      missing_information: missCreate,
      clarification_needed: Array.isArray(missCreate) && missCreate.length > 0,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-create',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-create' },
      recommended_action: 'Retry with a valid payload (description required) and verify POSTGRES_URL connectivity.',
    });
    console.error('ticket-create', e);
    return res.status(500).json({ error: 'Ticket create failed', detail: String(e?.message || e) });
  }
}

/**
 * Refresh stored Reality Gate checks for closed tickets (stale) or when ?reality_refresh=1.
 * Emits `delivery_failure_real_world` when ticket is Closed and checks fail (bucketed idempotency).
 *
 * @param {import('@prisma/client').PrismaClient} prismaClient
 * @param {{ id: string, tenantId?: string | null, status?: string | null, stage?: string | null, consoleJson?: unknown }} row
 * @param {{ force?: boolean }} opts
 */
async function applyRealityGateRefreshForTicketRow(prismaClient, row, opts = {}) {
  const force = opts.force === true;
  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const closure = cv.closure && typeof cv.closure === 'object' ? cv.closure : {};
  const closureKind = typeof closure.kind === 'string' ? String(closure.kind).trim().toLowerCase() : '';
  if (closureKind === 'hard_close' || closureKind === 'replaced' || closureKind === 'terminated') return row;

  const st = String(row.status || '').trim().toLowerCase();
  const sg = String(row.stage || '').trim().toLowerCase();
  const isClosed = st === 'closed' || sg === 'closed';
  if (!force) {
    if (!isClosed) return row;
    if (!isRealityGateStale(cj)) return row;
  }

  const urls = getRequiredRealityUrls(cj, row.tenantId);
  const run = await runRealityGateFetch(urls);
  const nextCj = mergeRealityGateIntoConsoleJson(cj, urls, run);

  const updated = await prismaClient.cmpTicket.update({
    where: { id: row.id },
    data: { consoleJson: nextCj },
  });

  if (!run.all_ok && isClosed) {
    const bucket = Math.floor(Date.now() / 600000);
    try {
      await recordTrustedAutomationEvent(prismaClient, {
        tenantId: row.tenantId,
        eventType: 'delivery_failure_real_world',
        idempotencyKey: `dfw:${row.id}:${bucket}`,
        payload: {
          ticket_id: row.id,
          failed: true,
          checks: run.checks,
          required_urls: urls,
        },
        source: 'api/cmp/router.js:reality-gate',
      });
    } catch (_) {
      /* non-blocking */
    }
  }

  return updated;
}

async function handleTicketGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-get');
  if (guard !== true) return guard;

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }
    let row = await prisma.cmpTicket.findUnique({ where: { id: String(id) } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const sess = getSessionFromRequest(req);
    const isAdmin = sess?.ok === true && sess.payload?.typ === 'admin';

    const refreshParam = req.query?.reality_refresh != null ? String(req.query.reality_refresh).toLowerCase() : '';
    const forceRg = refreshParam === '1' || refreshParam === 'true' || refreshParam === 'yes';
    try {
      row = await applyRealityGateRefreshForTicketRow(prisma, row, { force: forceRg });
    } catch (e) {
      emitLogicFailure({
        source: 'api/cmp/router.js:ticket-get:reality-gate',
        severity: 'error',
        error: e,
        cmp: { ticket_id: String(id), action: 'ticket-get' },
      });
    }

    const ticket_progress = buildTicketProgress(row.consoleJson, row.status || '', row.stage || '', {
      ticketId: row.id,
      tenantId: row.tenantId,
    });

    // Closed ticket + stale persisted workflow_state: derived UI is source of truth for /change; mirror once to automation (idempotent).
    try {
      const stLo = String(row.status || '').trim().toLowerCase();
      if (stLo === 'closed' && row.id) {
        const cj0 = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
        const cv0 = cj0.client_view && typeof cj0.client_view === 'object' ? cj0.client_view : {};
        const closure0 = cv0.closure && typeof cv0.closure === 'object' ? cv0.closure : {};
        const rawWf = cv0.workflow_state != null ? String(cv0.workflow_state).trim().toLowerCase() : '';
        const derivedWf =
          ticket_progress.client_view && ticket_progress.client_view.workflow_state != null
            ? String(ticket_progress.client_view.workflow_state).trim().toLowerCase()
            : '';
        const ck0 = typeof closure0.kind === 'string' ? String(closure0.kind).trim().toLowerCase() : '';
        const closureSkipsDeriveMismatch =
          ck0 === 'hard_close' || ck0 === 'replaced' || ck0 === 'terminated';
        if (rawWf && derivedWf && rawWf !== derivedWf && !closureSkipsDeriveMismatch) {
          await recordTrustedAutomationEvent(prisma, {
            tenantId: row.tenantId,
            eventType: 'cmp.delivery.change_console_ui_derived_mismatch',
            idempotencyKey: `cmp:ui_derive:${String(row.id)}:${rawWf}:${derivedWf}`,
            payload: {
              ticket_id: row.id,
              persisted_client_view_workflow_state: rawWf,
              derived_workflow_state_for_ui: derivedWf,
            },
            source: 'api/cmp/router.js:ticket-get',
          });
        }
      }
    } catch (_) {
      /* non-blocking */
    }

    const itinerary = buildTicketItinerary(row);

    /** Operator Console — Reality Panel (derived; no raw console_json). */
    let reality_panel = null;
    try {
      reality_panel = await computeRealityPanel(prisma, row);
    } catch (e) {
      emitLogicFailure({
        source: 'api/cmp/router.js:ticket-get:reality-panel',
        severity: 'error',
        error: e,
        cmp: { ticket_id: String(id), action: 'ticket-get' },
      });
      reality_panel = { error: 'reality_panel_compute_failed', detail: String(e?.message || e) };
    }

    // Tenant-safe refinement tail: persisted follow-up Q/A visible on /change without exposing admin-only console_json.
    const norm = normalizeConsoleJson(row.consoleJson);
    const brief_structured = norm.brief && typeof norm.brief === 'object' ? norm.brief : null;
    const refinement_messages = Array.isArray(norm.messages)
      ? norm.messages
          .slice(-60)
          .map((m) => {
            if (!m || typeof m !== 'object') return null;
            const role = m.role === 'assistant' ? 'assistant' : 'user';
            const content = String(m.content || '').trim();
            const ts = m.ts != null ? String(m.ts) : null;
            if (!content) return null;
            return { role, content, ts };
          })
          .filter(Boolean)
      : [];

    const cjx = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
    const modeOut = typeof cjx.mode === 'string' ? cjx.mode : null;
    const pendingDraft =
      cjx.pending_operator_draft && typeof cjx.pending_operator_draft === 'object' ? cjx.pending_operator_draft : null;
    const escReasons = Array.isArray(cjx.operator_escalation_reasons) ? cjx.operator_escalation_reasons : undefined;
    const escEvidence =
      cjx.operator_escalation && typeof cjx.operator_escalation === 'object' ? cjx.operator_escalation : undefined;

    return res.status(200).json({
      ticket_id: row.id,
      description: row.description || '',
      status: row.status || '',
      stage: row.stage || '',
      ticket_progress,
      itinerary,
      reality_panel,
      mode: modeOut || undefined,
      pending_operator_draft: pendingDraft || undefined,
      operator_escalation_reasons: escReasons,
      operator_escalation: escEvidence,
      console_json: isAdmin ? row.consoleJson || null : undefined,
      brief_structured: brief_structured || undefined,
      refinement_messages: refinement_messages.length ? refinement_messages : undefined,
      source: 'postgres',
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-get',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-get' },
    });
    console.error('ticket-get', e);
    return res.status(500).json({ error: 'Ticket get failed', detail: String(e?.message || e) });
  }
}

/**
 * POST `action=reality-gate-run` — force refresh Reality Gate checks and persist to console_json.
 * Body: `{ ticket_id }`
 */
async function handleRealityGateRun(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'reality-gate-run');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};
  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  try {
    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const updated = await applyRealityGateRefreshForTicketRow(prisma, row, { force: true });
    const cjx = updated.consoleJson && typeof updated.consoleJson === 'object' ? updated.consoleJson : {};
    const rg = cjx.reality_gate && typeof cjx.reality_gate === 'object' ? cjx.reality_gate : {};
    const lr = rg.last_run && typeof rg.last_run === 'object' ? rg.last_run : {};
    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      all_ok: lr.all_ok === true,
      last_run: lr,
      required_urls: Array.isArray(rg.required_urls) ? rg.required_urls : [],
    });
  } catch (e) {
    return res.status(500).json({ error: 'reality_gate_run_failed', detail: String(e?.message || e) });
  }
}

/**
 * Latest Technical Lead audit row for a ticket (tenant-scoped; no raw evidence_json).
 * GET `action=technical-lead-latest&id=<ticket_id>`
 */
async function handleTechnicalLeadLatest(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'technical-lead-latest');
  if (guard !== true) return guard;

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }
    const ticketId = String(id).trim();
    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const latest = await prisma.technicalLeadAudit.findFirst({
      where: { ticketId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        checklistVersion: true,
        summaryText: true,
        gapsJson: true,
        evidenceJson: true,
      },
    });

    if (!latest) {
      return res.status(200).json({
        ok: true,
        ticket_id: ticketId,
        latest: null,
        hint: 'No Technical Lead audit rows yet (observer cron or npm run technical-lead:run).',
      });
    }

    const ev =
      latest.evidenceJson && typeof latest.evidenceJson === 'object'
        ? /** @type {Record<string, unknown>} */ (latest.evidenceJson)
        : {};
    const llm =
      typeof ev.llm_summary_rephrase === 'string' && ev.llm_summary_rephrase.trim()
        ? ev.llm_summary_rephrase.trim()
        : null;

    const gapsRaw = latest.gapsJson;
    const gaps = Array.isArray(gapsRaw) ? gapsRaw : [];

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      latest: {
        audit_id: latest.id,
        created_at: latest.createdAt?.toISOString?.() || String(latest.createdAt),
        checklist_version: latest.checklistVersion,
        summary_text: latest.summaryText,
        summary_llm: llm,
        gap_count: gaps.length,
        gaps,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/technical_lead_audits|does not exist|Unknown model/i.test(msg)) {
      return res.status(503).json({
        error: 'TECHNICAL_LEAD_TABLE_MISSING',
        hint: 'Run prisma migrate deploy or POST /api/factory/postgres/ensure-schema.',
      });
    }
    emitLogicFailure({
      source: 'api/cmp/router.js:technical-lead-latest',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: String(id), action: 'technical-lead-latest' },
    });
    console.error('technical-lead-latest', e);
    return res.status(500).json({ error: 'technical_lead_latest_failed', detail: msg.slice(0, 400) });
  }
}

/**
 * GitHub Actions + branch presence for a ticket (tenant-safe summary only).
 *
 * GET/POST `action=ticket-activity` — query `id` or body `ticket_id` / `id`.
 */
async function handleTicketActivity(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-activity');
  if (guard !== true) return guard;

  let ticketId = '';
  if (req.method === 'GET') {
    ticketId = req.query?.id != null ? String(req.query.id).trim() : '';
  } else {
    let b = req.body;
    if (typeof b === 'string') {
      try {
        b = JSON.parse(b);
      } catch {
        b = {};
      }
    }
    if (b && typeof b === 'object') {
      ticketId =
        b.ticket_id != null
          ? String(b.ticket_id).trim()
          : b.id != null
            ? String(b.id).trim()
            : '';
    }
  }
  if (!ticketId) {
    return res.status(400).json({ error: 'id or ticket_id is required' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
    });
  }

  const scopeTenantId = resolveTenantIdForScopedTicketRead(req);

  try {
    if (scopeTenantId) {
      const row = await prisma.cmpTicket.findUnique({
        where: { id: ticketId },
        select: { tenantId: true },
      });
      if (!row) return res.status(404).json({ error: 'Ticket not found' });
      if (String(row.tenantId || '') !== scopeTenantId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
    }

    const activity = await fetchCmpTicketActivity({ ticketId });
    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      checked_at: new Date().toISOString(),
      activity,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-activity',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId, action: 'ticket-activity' },
    });
    console.error('ticket-activity', e);
    return res.status(500).json({ error: 'ticket-activity failed', detail: String(e?.message || e) });
  }
}

/**
 * Request operator/agent assistance for a stuck ticket (tenant-safe snapshot).
 *
 * POST `action=assist-request`
 * Body: { ticket_id, reason?, snapshot? }
 *
 * - Tenants can request help for their own tickets; payload is redacted.
 * - Admin/factory master can request for any ticket.
 * - Writes to Postgres recovery_vault_entries (best-effort) and emits telemetry.
 */
async function handleAssistRequest(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'assist-request');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const reason = body?.reason != null ? String(body.reason).trim().slice(0, 500) : '';
  const snapshotRaw = body?.snapshot && typeof body.snapshot === 'object' ? body.snapshot : {};
  const snapshot = redactPotentialSecrets(snapshotRaw);

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING', hint: 'Configure POSTGRES_URL to record assist requests.' });
  }

  const scopeTenantId = resolveTenantIdForScopedTicketRead(req);

  try {
    if (scopeTenantId) {
      const row = await prisma.cmpTicket.findUnique({
        where: { id: ticketId },
        select: { tenantId: true },
      });
      if (!row) return res.status(404).json({ error: 'Ticket not found' });
      if (String(row.tenantId || '') !== scopeTenantId) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
    }

    const id = crypto.randomUUID();
    const payload = {
      kind: 'assist_request',
      ticket_id: ticketId,
      reason: reason || null,
      requested_at: new Date().toISOString(),
      requester: {
        tenant_id: scopeTenantId || null,
      },
      snapshot,
    };

    // Best-effort durable journal entry for later triage.
    await prisma.$executeRaw`
      insert into recovery_vault_entries (id, occurred_at, category, payload_json, status)
      values (${id}, now(), ${'assist_request'}, ${payload}, ${'PENDING_SYNC'})
    `;

    emitLogicFailure({
      source: 'api/cmp/router.js:assist-request',
      severity: 'warning',
      error: new Error('Assist requested'),
      cmp: { ticket_id: ticketId, action: 'assist-request' },
      recommended_action: 'Review recovery_vault_entries payload_json and GitHub Actions / CMP activity.',
      meta: { tenant_id: scopeTenantId || null, reason: reason || null },
    });

    return res.status(200).json({ ok: true, request_id: id, ticket_id: ticketId });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:assist-request',
      severity: 'error',
      error: e,
      cmp: { ticket_id: ticketId, action: 'assist-request' },
      recommended_action: 'Inspect Postgres connectivity and ensure-schema for recovery_vault_entries.',
      meta: { tenant_id: scopeTenantId || null },
    });
    return res.status(500).json({ error: 'assist-request failed', detail: String(e?.message || e) });
  }
}

function ticketListLimit(req) {
  let raw =
    req.query?.limit != null
      ? Array.isArray(req.query.limit)
        ? req.query.limit[0]
        : req.query.limit
      : '';
  if (req.method === 'POST' && !raw) {
    let b = req.body;
    if (typeof b === 'string') {
      try {
        b = JSON.parse(b);
      } catch {
        b = {};
      }
    }
    if (b && typeof b === 'object' && b.limit != null) raw = String(b.limit);
  }
  const n = parseInt(String(raw || '30'), 10);
  return Math.min(100, Math.max(1, Number.isFinite(n) ? n : 30));
}

/**
 * List recent CMP tickets (Postgres only).
 * - Admin session: only unscoped (`tenant_id` null) “factory / core” tickets — not client-tenant rows.
 * - Tenant session (or sovereign JWT): only that tenant’s rows.
 * - Factory master token (no session): all rows (break-glass).
 *
 * GET or POST `action=ticket-list` — optional `limit` (default 30, max 100).
 */
async function handleTicketList(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-list');
  if (guard !== true) return guard;

  const limit = ticketListLimit(req);
  const listScope = resolveCmpTicketListScope(req);
  if (listScope.kind === 'invalid_tenant_session') {
    return res.status(403).json({
      error: 'TENANT_SESSION_MISSING_TENANT_ID',
      hint: 'Tenant login is missing tenant scope. Log out and sign in again with a valid tenant account or PIN.',
    });
  }
  if (listScope.kind === 'unknown') {
    return res.status(403).json({
      error: 'TICKET_LIST_SCOPE_DENIED',
      hint: 'No ticket list scope for this credential.',
    });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();

  try {
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }

    let where = {};
    let list_scope = 'factory_master';
    let scope_tenant_id = null;
    if (listScope.kind === 'core') {
      where = { tenantId: null };
      list_scope = 'core';
    } else if (listScope.kind === 'tenant') {
      where = { tenantId: listScope.tenantId };
      list_scope = 'tenant';
      scope_tenant_id = listScope.tenantId;
    } else {
      where = {};
      list_scope = 'factory_master';
    }

    const rows = await prisma.cmpTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        tenantId: true,
        status: true,
        stage: true,
        description: true,
        updatedAt: true,
        createdAt: true,
      },
    });
    const tickets = rows.map((r) => ({
      ticket_id: r.id,
      tenant_id: r.tenantId,
      status: r.status || '',
      stage: r.stage || '',
      description_preview: (r.description || '').slice(0, 200),
      updated_at: r.updatedAt.toISOString(),
      created_at: r.createdAt.toISOString(),
    }));
    return res.status(200).json({
      ok: true,
      source: 'postgres',
      list_scope,
      scope_tenant_id,
      tickets,
      count: tickets.length,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-list',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-list' },
    });
    return res.status(500).json({ error: 'ticket-list failed', detail: String(e?.message || e) });
  }
}

function deriveDeliveryStatusFromRealityPanel(rp) {
  const di = rp && typeof rp === 'object' ? rp.delivery_integrity : null;
  const st = di && typeof di === 'object' ? String(di.status || '').trim().toUpperCase() : '';
  const pt = rp && typeof rp === 'object' ? rp.preview_truth : null;
  const pv = pt && typeof pt === 'object' ? String(pt.status || '').trim().toUpperCase() : '';
  if (st === 'PASS' && (pv === 'VALID' || pv === 'N/A')) return 'DELIVERED';
  if (st === 'FAIL' || pv === 'MISLEADING') return 'NOT_DELIVERED';
  if (st === 'N/A' && pv === 'VALID') return 'DELIVERED';
  if (st === 'UNKNOWN' && pv === 'VALID') return 'PARTIAL';
  return 'PARTIAL';
}

function derivePreviewStatusFromRealityPanel(rp) {
  const pt = rp && typeof rp === 'object' ? rp.preview_truth : null;
  const pv = pt && typeof pt === 'object' ? String(pt.status || '').trim().toUpperCase() : '';
  if (pv === 'VALID') return 'VALID';
  if (pv === 'MISLEADING') return 'MISLEADING';
  return 'MISSING';
}

function shortenRequestedChange(s) {
  const raw = String(s || '').trim();
  if (!raw) return '—';
  const one = raw.replace(/\s+/g, ' ');
  return one.length > 120 ? one.slice(0, 117) + '…' : one;
}

async function mapWithConcurrency(items, limit, fn) {
  const n = Math.max(1, Number.isFinite(limit) ? limit : 3);
  const out = new Array(items.length);
  let idx = 0;
  async function worker() {
    for (;;) {
      const i = idx++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }
  const workers = Array.from({ length: Math.min(n, items.length) }, () => worker());
  await Promise.all(workers);
  return out;
}

/**
 * Operator queue list for /change (derived truth per ticket).
 *
 * GET or POST `action=ticket-operator-queue` — optional `limit` (default 30, max 60).
 */
async function handleTicketOperatorQueue(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ticket-operator-queue');
  if (guard !== true) return guard;

  const limit = Math.min(60, ticketListLimit(req));
  const listScope = resolveCmpTicketListScope(req);
  if (listScope.kind === 'invalid_tenant_session') {
    return res.status(403).json({
      error: 'TENANT_SESSION_MISSING_TENANT_ID',
      hint: 'Tenant login is missing tenant scope. Log out and sign in again with a valid tenant account or PIN.',
    });
  }
  if (listScope.kind !== 'tenant') {
    return res.status(403).json({
      error: 'TICKET_OPERATOR_QUEUE_DENIED',
      hint: 'Operator queue is tenant-scoped. Sign in on a tenant hostname to view the operator queue.',
    });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
    });
  }

  try {
    const rows = await prisma.cmpTicket.findMany({
      where: { tenantId: listScope.tenantId },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(1, limit),
      select: {
        id: true,
        tenantId: true,
        status: true,
        stage: true,
        description: true,
        consoleJson: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    const openish = rows.filter((r) => String(r.status || '').trim().toLowerCase() !== 'closed');

    const items = await mapWithConcurrency(openish, 3, async (r) => {
      const rp = await computeRealityPanel(prisma, r);
      const blocker = rp && typeof rp === 'object' ? rp.blocker : null;
      const next = rp && typeof rp === 'object' ? rp.next_action : null;
      const blockerCode = blocker && typeof blocker === 'object' ? String(blocker.code || '').trim() : '';
      const nextAction = next && typeof next === 'object' ? String(next.action || '').trim() : '';
      const requested = rp && typeof rp === 'object' ? rp.requested_change : '';
      return {
        ticket_id: r.id,
        requested_change: shortenRequestedChange(requested || r.description || ''),
        delivered: deriveDeliveryStatusFromRealityPanel(rp),
        preview: derivePreviewStatusFromRealityPanel(rp),
        blocker: blockerCode || 'none',
        next_action: nextAction || 'FIX',
        updated_at: r.updatedAt.toISOString(),
        reality_panel: rp,
      };
    });

    return res.status(200).json({
      ok: true,
      list_scope: 'tenant',
      scope_tenant_id: listScope.tenantId,
      count: items.length,
      tickets: items,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:ticket-operator-queue',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'ticket-operator-queue' },
      meta: { tenant_id: listScope.tenantId },
    });
    return res.status(500).json({ error: 'ticket-operator-queue failed', detail: String(e?.message || e) });
  }
}

async function handleApproveBuild(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'approve-build');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }

  try {
    const clientId = resolveCmpClientIdForWrite(req, body) || 'root';
    const adminSess = getSessionFromRequest(req);
    const isAdminApprove = adminSess?.ok === true && adminSess.payload?.typ === 'admin';
    const walletSnap = await getTenantWalletSnapshot({ tenantId: clientId });
    const billingExempt = isAdminApprove === true || walletSnap.billingExemptEffective === true;

    // First-run provisioning: auto-create tenants/<tenant_id>/persona.json when missing.
    try {
      ensureTenantProvisionedViaPython(clientId);
    } catch (e) {
      if (isPythonSpawnEnoent(e)) {
        emitLogicFailure({
          source: 'api/cmp/router.js:approve-build:provisioning',
          severity: 'warning',
          error: e instanceof Error ? e : new Error(String(e)),
          cmp: { ticket_id: ticketId, action: 'approve-build' },
          recommended_action:
            'Skipping filesystem tenant provisioning (Python missing — e.g. Vercel). Rely on Postgres tenant rows if used.',
          meta: { client_id: clientId },
        });
      } else {
        throw e;
      }
    }

    // Hard rejection guard before any costly processing (tenant pre-paid float).
    // Admin sessions bypass; DB billing_exempt or env CORPFLOW_BILLING_EXEMPT_TENANT_IDS skips credits.
    if (!isAdminApprove && !billingExempt) {
      const tokenBalanceUsd = Number(walletSnap.tokenCreditBalanceUsd);
      if (!Number.isFinite(tokenBalanceUsd) || tokenBalanceUsd <= 0) {
        return deny(
          res,
          402,
          'FACTORY_DORMANT: INSUFFICIENT_CREDITS',
          {
            code: 'FACTORY_DORMANT',
            reason: 'INSUFFICIENT_CREDITS',
            token_credit_balance_usd: Number.isFinite(tokenBalanceUsd) ? tokenBalanceUsd : 0,
          }
        );
      }
    }

    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }

    // Reconstruct description to re-run ethical/budget gate (body or stored ticket text),
    // then enrich with the latest structured brief (if present) so approval reflects the refined request.
    const exists = await prisma.cmpTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, tenantId: true, consoleJson: true, description: true },
    });
    if (!exists) {
      return res.status(404).json({
        error: 'Ticket not found',
        ticket_id: ticketId,
        hint: 'Check Ticket ID or pick the ticket from Recent tickets.',
      });
    }

    const scopeTenantApprove = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantApprove) {
      const rowTid = String(exists.tenantId || '').trim();
      if (rowTid !== scopeTenantApprove) {
        return res.status(404).json({
          error: 'Ticket not found',
          ticket_id: ticketId,
          hint: 'This ticket is not in your organization’s workspace.',
        });
      }
    }

    const baseDescription = await resolveCmpDescriptionFromTicket(ticketId, body?.description);
    const normExists = normalizeConsoleJson(exists.consoleJson);
    const description = buildAuthoritativeDescriptionFromBrief(baseDescription, normExists.brief);
    if (!description) {
      emitLogicFailure({
        source: 'api/cmp/router.js:approve-build',
        severity: 'fatal',
        error: new Error('Missing description for ethical sentinel re-check'),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action:
          'Add a description in the Change Console, or ensure the ticket row has description stored (Postgres cmp_tickets.description).',
      });
      return deny(res, 400, 'Approve blocked: missing description.', {
        hint: 'Paste or type the change description, or pick the ticket again so text loads from the database.',
        ticket_id: ticketId,
      });
    }

    const tier =
      body?.tier === 'premium' || body?.tier === 'enterprise' || body?.tier === 'internal'
        ? body.tier
        : 'standard';
    const is_demo = Boolean(body?.is_demo);

    let complexity = body?.complexity;
    let risk = body?.risk;
    if (!complexity || !['low', 'medium', 'high'].includes(complexity)) {
      complexity = inferComplexityFromDescription(description);
    }
    if (!risk || !['low', 'medium', 'high'].includes(risk)) {
      risk = inferRiskFromDescription(description);
    }

    const cost = computeMarketValueCost({
      complexity,
      risk,
      tier,
      is_demo,
    });

    const costUsd = Number(cost?.full_market_value_usd);

    const verdict = resolveVerifyRigorVerdict({
      description,
      costUsd,
      clientId,
      action: 'approve-build',
      ticketId,
      authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId || 'root'),
      clientAcknowledged: false,
    });

    if (!verdict?.ok) {
      emitLogicFailure({
        source: 'vanguard/verify-rigor.py',
        severity: 'fatal',
        error: new Error(verdict?.reject_reason || 'Rejected by ethical sentinel'),
        cmp: { ticket_id: ticketId, action: 'approve-build' },
        recommended_action: 'Build blocked by Vanguard Ethical Sentinel.',
      });
      return deny(
        res,
        403,
        verdict?.reject_reason || 'Build rejected by ethical sentinel',
        {
          ethical_score: verdict?.ethical_score ?? null,
          budget_cap_usd: verdict?.budget_cap_usd ?? null,
          cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd,
          rejected_by: verdict?.rejected_by || [],
          requires_client_ack: verdict?.requires_client_ack ?? false,
          rigor_report_id: verdict?.rigor_report_id ?? null,
          executive_escalated: verdict?.executive_escalated ?? false,
        }
      );
    }

    // Token Reservoir (Cash-Positive guardrail): debit tenant float before build proceeds.
    // Admin and billing-exempt tenants (DB or env) skip debit.
    if (!isAdminApprove && !billingExempt) {
      try {
        const chargeUsd = Number(cost?.displayed_client_usd ?? 0);
        const debitUsd =
          Number.isFinite(chargeUsd) && chargeUsd > 0
            ? chargeUsd
            : Number(verdict?.cost_estimate_usd ?? costUsd ?? 0);
        await debitTokenCreditBalancePg({
          tenantId: clientId || 'root',
          debitUsd: debitUsd,
          invoiceUsd: costUsd,
          context: { ticket_id: ticketId, action: 'approve-build', client_charge_usd: chargeUsd },
        });
      } catch (e) {
        emitLogicFailure({
          source: 'api/cmp/router.js:approve-build:cash-positive-debit',
          severity: 'fatal',
          error: e instanceof Error ? e : new Error(String(e)),
          cmp: { ticket_id: ticketId, action: 'approve-build' },
          recommended_action:
            'Token credit balance depleted or insufficient. Client must top up token_credit_balance to proceed.',
          meta: { client_id: clientId, ticket_id: ticketId, cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd },
        });
        return deny(
          res,
          402,
          'Inflow required: insufficient token_credit_balance to execute this build.',
          { cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd }
        );
      }
    }

    const sandboxDispatch = await dispatchCmpSandboxStart({
      ticketId,
      baseRef: process.env.CMP_SANDBOX_BASE_REF || 'main',
    });
    await notifyCmpAutomationWebhook({
      ticket_id: ticketId,
      source: 'approve-build',
      dispatch_ok: sandboxDispatch.ok,
      dispatch_error: sandboxDispatch.error || null,
    });

    const norm = normExists;
    const prevCv = norm.client_view && typeof norm.client_view === 'object' ? norm.client_view : {};
    const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
    const automation = {
      ...prevAuto,
      dispatch_ok: sandboxDispatch.ok,
      github_repo: sandboxDispatch.repo_full_name || prevAuto.github_repo || null,
      branch_name: sandboxDispatch.branch_name || prevAuto.branch_name || null,
      branch_url: sandboxDispatch.branch_url || prevAuto.branch_url || null,
      compare_url: sandboxDispatch.compare_url || prevAuto.compare_url || null,
      workflow_url: sandboxDispatch.workflow_url || prevAuto.workflow_url || null,
      actions_url: sandboxDispatch.actions_url || prevAuto.actions_url || null,
      last_error: sandboxDispatch.ok ? null : sandboxDispatch.error || null,
      updated_at: new Date().toISOString(),
    };
    const client_view = {
      ...prevCv,
      status: 'Approved',
      stage: 'Build',
      automation,
      progress_message: sandboxDispatch.ok
        ? 'Build approved; sandbox automation started.'
        : 'Build approved; connect GitHub token and repo to enable branch automation.',
      workflow_state: 'approved_for_build',
      workflow_next_action: nextActionForWorkflowState('approved_for_build'),
    };
    const nextConsole = { ...norm, client_view };

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: {
        stage: 'Build',
        status: 'Approved',
        consoleJson: nextConsole,
        // Persist the enriched brief-driven description so the ticket becomes build-ready on the record.
        description: description || exists.description || undefined,
      },
    });

    const ticket_progress = buildTicketProgress(nextConsole, 'Approved', 'Build');

    await recordTrustedAutomationEvent(prisma, {
      tenantId: exists.tenantId,
      eventType: 'cmp.build.approved',
      payload: {
        ticket_id: ticketId,
        dispatch_ok: sandboxDispatch.ok,
        branch_name: sandboxDispatch.branch_name || null,
        branch_url: sandboxDispatch.branch_url || null,
        workflow_url: sandboxDispatch.workflow_url || null,
        actions_url: sandboxDispatch.actions_url || null,
        error: sandboxDispatch.ok ? null : sandboxDispatch.error || null,
      },
      idempotencyKey: `cmp:build:approved:${ticketId}`,
      source: 'cmp',
    });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      source: 'postgres',
      ticket_progress,
      token_credit_billing_exempt: isAdminApprove === true || billingExempt === true || undefined,
      sandbox_branch: {
        dispatch_triggered: sandboxDispatch.ok,
        branch_name: sandboxDispatch.branch_name || undefined,
        branch_url: sandboxDispatch.branch_url || undefined,
        compare_url: sandboxDispatch.compare_url || undefined,
        workflow_url: sandboxDispatch.workflow_url || undefined,
        actions_url: sandboxDispatch.actions_url || undefined,
        error: sandboxDispatch.ok ? undefined : sandboxDispatch.error,
      },
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:approve-build',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId || 'n/a', action: 'approve-build' },
    });
    console.error('approve-build', e);
    const pCode = e && typeof e === 'object' && e !== null && 'code' in e ? String(e.code) : '';
    const pMsg = e instanceof Error ? e.message : String(e);
    if (pCode === 'P2025') {
      return res.status(404).json({
        error: 'Ticket not found',
        detail: pMsg,
        ticket_id: ticketId,
      });
    }
    return res.status(500).json({
      error: 'Approve build failed',
      detail: pMsg,
      code: pCode || undefined,
      hint:
        pMsg.toLowerCase().includes('python') || pMsg.toLowerCase().includes('verify-rigor')
          ? 'Ethical verifier (Python) may be missing on the server. Check deployment logs.'
          : pMsg.includes('INSUFFICIENT') || pMsg.includes('402')
            ? 'Token/credit balance may be zero — see token_credit_balance_usd in a 402 response.'
            : undefined,
    });
  }
}

async function handleCostingPreview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'costing-preview');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketRef =
    body.ticket_id != null
      ? String(body.ticket_id).trim()
      : body.ticketId != null
        ? String(body.ticketId).trim()
        : '';

  if (ticketRef) {
    const scopeCost = resolveTenantIdForScopedTicketRead(req);
    if (scopeCost) {
      const tCheck = await prisma.cmpTicket.findUnique({
        where: { id: ticketRef },
        select: { tenantId: true },
      });
      if (!tCheck || String(tCheck.tenantId || '') !== scopeCost) {
        return res.status(404).json({ error: 'Ticket not found' });
      }
    }
  }

  const description = await resolveCmpDescriptionFromTicket(ticketRef, body?.description);
  if (!description) {
    return res.status(400).json({
      error: 'description is required',
      hint:
        'Type text in "Describe the change", or select a ticket from Recent tickets (full text loads automatically on click).',
      ticket_id: ticketRef || undefined,
    });
  }

  const tier =
    body.tier === 'premium' || body.tier === 'enterprise' || body.tier === 'internal'
      ? body.tier
      : 'standard';

  let complexity = body.complexity;
  let risk = body.risk;
  if (!complexity || !['low', 'medium', 'high'].includes(complexity)) {
    complexity = inferComplexityFromDescription(description);
  }
  if (!risk || !['low', 'medium', 'high'].includes(risk)) {
    risk = inferRiskFromDescription(description);
  }

  const is_demo = Boolean(body.is_demo);

  const impact = buildImpactSummary(description, { complexity, risk });
  const cost = computeMarketValueCost({
    complexity,
    risk,
    tier,
    is_demo,
  });

  const clientId = resolveCmpClientIdForWrite(req, body);
  const ticketId = ticketRef || 'n/a';
  const costUsd = Number(cost?.full_market_value_usd);
  const walletPreview = await getTenantWalletSnapshot({ tenantId: clientId });
  const billingExemptPreview = walletPreview.billingExemptEffective === true;
  const clientCost = billingExemptPreview
    ? {
        ...cost,
        displayed_client_usd: 0,
        breakdown: {
          ...(typeof cost.breakdown === 'object' && cost.breakdown ? cost.breakdown : {}),
          billing_exempt: true,
        },
      }
    : cost;

  try {
    const verdict = resolveVerifyRigorVerdict({
      description,
      costUsd,
      clientId: clientId || 'root',
      action: 'costing-preview',
      ticketId,
      authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId || 'root'),
      clientAcknowledged: false,
    });

    if (!verdict?.ok) {
      emitLogicFailure({
        source: 'vanguard/verify-rigor.py',
        severity: 'fatal',
        error: new Error(verdict?.reject_reason || 'Rejected by ethical sentinel'),
        cmp: { ticket_id: ticketId, action: 'costing-preview' },
        recommended_action: 'Human review required for this change request.',
      });
      return deny(
        res,
        403,
        verdict?.reject_reason || 'Rejected by ethical sentinel',
        {
          ethical_score: verdict?.ethical_score ?? null,
          budget_cap_usd: verdict?.budget_cap_usd ?? null,
          cost_estimate_usd: verdict?.cost_estimate_usd ?? costUsd,
          rejected_by: verdict?.rejected_by || [],
          requires_client_ack: verdict?.requires_client_ack ?? false,
          rigor_report_id: verdict?.rigor_report_id ?? null,
          executive_escalated: verdict?.executive_escalated ?? false,
        }
      );
    }
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:costing-preview:verify-rigor',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: ticketId, action: 'costing-preview' },
    });
    return deny(res, 500, 'Ethical Sentinel verification failed (build blocked by default).');
  }

  const effortBand = inferEffortHoursBand(complexity, risk);

  let ticket_progress = null;
  if (ticketRef) {
    try {
      const row = await prisma.cmpTicket.findUnique({ where: { id: ticketRef } });
      if (row) {
        const norm = normalizeConsoleJson(row.consoleJson);
        const prevCv = norm.client_view && typeof norm.client_view === 'object' ? norm.client_view : {};
        const client_view = {
          ...prevCv,
          status: row.status || prevCv.status || '',
          stage: row.stage || prevCv.stage || '',
          last_estimate_at: new Date().toISOString(),
          effort_hours_low: effortBand.effort_hours_low,
          effort_hours_high: effortBand.effort_hours_high,
          complexity,
          risk,
          display_currency: 'USD',
          display_amount_usd: clientCost.displayed_client_usd,
          /** Billable line item for the client (same as displayed_client_usd from costing engine). */
          actual_cost_to_client_usd: clientCost.displayed_client_usd,
          /** Market-style reference for audit / comparison (full_market_value_usd). */
          market_reference_usd: cost.full_market_value_usd,
          full_market_value_usd: cost.full_market_value_usd,
          billing_exempt: billingExemptPreview ? true : undefined,
          progress_message: billingExemptPreview
            ? 'Estimate saved. Partner/demo billing: $0 client charge; market reference kept for audit.'
            : 'Estimate saved. Indicative effort and cost are on your ticket.',
          workflow_state: 'estimated',
          workflow_next_action: nextActionForWorkflowState('estimated'),
        };
        await prisma.cmpTicket.update({
          where: { id: ticketRef },
          data: { consoleJson: { ...norm, client_view } },
        });
        const fresh = await prisma.cmpTicket.findUnique({ where: { id: ticketRef } });
        if (fresh) {
          ticket_progress = buildTicketProgress(fresh.consoleJson, fresh.status || '', fresh.stage || '');
        }
      }
    } catch (persistErr) {
      emitLogicFailure({
        source: 'api/cmp/router.js:costing-preview:persist-client-view',
        severity: 'warning',
        error: persistErr instanceof Error ? persistErr : new Error(String(persistErr)),
        cmp: { ticket_id: ticketRef, action: 'costing-preview' },
        recommended_action: 'Ticket estimate displayed but not persisted; check POSTGRES_URL and cmp_tickets.console_json.',
      });
    }
  }

  if (ticketRef) {
    await recordTrustedAutomationEvent(prisma, {
      tenantId: clientId ? String(clientId) : null,
      eventType: 'cmp.estimate.recorded',
      payload: {
        ticket_id: ticketRef,
        displayed_client_usd: clientCost.displayed_client_usd,
        full_market_value_usd: cost.full_market_value_usd,
        complexity,
        risk,
        tier,
        is_demo: cost.is_demo,
        billing_exempt: billingExemptPreview ? true : undefined,
      },
      source: 'cmp',
    });
  }

  return res.status(200).json({
    ticket_id: ticketRef || null,
    ticket_progress,
    effort_hours_low: effortBand.effort_hours_low,
    effort_hours_high: effortBand.effort_hours_high,
    billing_exempt: billingExemptPreview ? true : undefined,
    impact: {
      summary: impact.summary,
      risk_level: impact.risk_level,
      technical_risks: impact.technical_risks,
      complexity_inferred: impact.complexity_inferred,
    },
    cost: {
      full_market_value_usd: cost.full_market_value_usd,
      displayed_client_usd: clientCost.displayed_client_usd,
      /** Amount the factory bills / shows as the client price (equals displayed_client_usd). */
      actual_cost_to_client_usd: clientCost.displayed_client_usd,
      /** Market-style reference (audit); not necessarily the invoice line. */
      market_reference_usd: cost.full_market_value_usd,
      traditional_developer_benchmark_usd: cost.full_market_value_usd,
      corpflow_build_price_usd: clientCost.displayed_client_usd,
      pricing_labels: {
        benchmark_usd:
          'What traditional custom development often costs (market benchmark — for comparison only)',
        your_build_usd: 'What you pay CorpFlow for this build (estimate — your commitment decision)',
      },
      is_demo: cost.is_demo,
      demo_discount_rate: cost.demo_discount_rate,
      breakdown: clientCost.breakdown,
    },
  });
}

async function handleAiInterview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'ai-interview');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const description = typeof body?.description === 'string' ? body.description.trim() : '';
  if (!description) {
    return res.status(400).json({ error: 'description is required' });
  }

  const localeHint =
    typeof body?.locale === 'string'
      ? body.locale
      : typeof body?.lang === 'string'
        ? body.lang
        : '';
  const result = buildClarificationQuestions(description, localeHint);
  return res.status(200).json(result);
}

function safeJsonParse(raw, fallback) {
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    const parsed = safeJsonParse(v, null);
    if (parsed) return normalizeConsoleJson(parsed);
    return { messages: [], brief: {}, locale: 'en' };
  }
  if (typeof v === 'object' && v !== null) {
    const messages = Array.isArray(v.messages) ? v.messages.slice(0, 200) : [];
    const brief = v.brief && typeof v.brief === 'object' ? v.brief : {};
    const locale = typeof v.locale === 'string' ? v.locale : 'en';
    // Preserve client_view, promotion, overseer, etc. for durable Change Console state.
    return { ...v, messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

/**
 * Tenant-safe audit trail from Postgres row timestamps and `console_json` milestones.
 *
 * @param {{ id: string, createdAt?: Date, updatedAt?: Date, status?: string | null, stage?: string | null, consoleJson?: unknown }} row
 * @returns {Array<{ at: string, label: string, detail: string }>}
 */
function buildTicketItinerary(row) {
  /** @type {Array<{ at: string, label: string, detail: string }>} */
  const items = [];
  const push = (atRaw, label, detail) => {
    const lab = String(label || '').trim();
    if (!lab) return;
    let atIso = '';
    if (atRaw instanceof Date && !Number.isNaN(atRaw.getTime())) {
      atIso = atRaw.toISOString();
    } else if (atRaw != null && String(atRaw).trim()) {
      const p = Date.parse(String(atRaw));
      if (Number.isFinite(p)) {
        atIso = new Date(p).toISOString();
      } else if (row?.updatedAt instanceof Date && !Number.isNaN(row.updatedAt.getTime())) {
        atIso = row.updatedAt.toISOString();
      } else {
        return;
      }
    } else if (row?.updatedAt instanceof Date && !Number.isNaN(row.updatedAt.getTime())) {
      atIso = row.updatedAt.toISOString();
    } else {
      return;
    }
    const det = String(detail || '').trim().slice(0, 2000);
    items.push({ at: atIso, label: lab, detail: det });
  };

  const id = row?.id != null ? String(row.id) : '';
  if (row?.createdAt) {
    push(row.createdAt, 'Ticket opened', id ? `Ticket ${id} recorded in the factory database.` : 'Ticket recorded in the factory database.');
  }

  const cj = row?.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const cv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};

  if (cv.last_estimate_at != null && String(cv.last_estimate_at).trim()) {
    push(cv.last_estimate_at, 'Estimate recorded', 'Indicative effort and cost were saved on this ticket.');
  }

  const auto = cv.automation && typeof cv.automation === 'object' ? cv.automation : {};
  if (auto.dispatch_ok === true || auto.dispatch_ok === false || auto.updated_at != null) {
    const ok = auto.dispatch_ok === true;
    const err = auto.last_error != null ? String(auto.last_error).trim().slice(0, 500) : '';
    const bn = auto.branch_name != null ? String(auto.branch_name).trim() : '';
    const detail = ok
      ? `Vercel called GitHub repository_dispatch successfully. Expected sandbox branch: ${bn || 'cmp/<ticket_id>'}. If the branch never appears, open GitHub Actions for workflow "CMP Sandbox Branch" (runs often show on the default branch, not on cmp/…).`
      : `GitHub dispatch did not return success. ${err || 'See approve-build response or factory logs.'}`;
    push(auto.updated_at || row?.updatedAt, 'Sandbox automation (GitHub dispatch)', detail);
  }

  const prom = cj.promotion && typeof cj.promotion === 'object' ? cj.promotion : {};
  if (prom.merged_at != null && String(prom.merged_at).trim()) {
    const pru = prom.pr_url != null ? String(prom.pr_url).trim() : '';
    push(prom.merged_at, 'Promotion merged', pru ? `Pull request merged: ${pru}` : 'Sandbox work merged toward production.');
  } else if ((prom.pr_number != null || (prom.pr_url != null && String(prom.pr_url).trim())) && prom.updated_at != null) {
    const n = prom.pr_number != null ? String(prom.pr_number) : '';
    const pru = prom.pr_url != null ? String(prom.pr_url).trim() : '';
    push(prom.updated_at, 'Pull request tracked', [n && `PR #${n}`, pru].filter(Boolean).join(' · ') || 'PR metadata updated.');
  }

  const ov = cj.overseer && typeof cj.overseer === 'object' ? cj.overseer : {};
  if (ov.updated_at != null && String(ov.updated_at).trim()) {
    const oerr = ov.error != null ? String(ov.error).trim().slice(0, 400) : '';
    push(ov.updated_at, 'Operator overseer snapshot', oerr || 'Sandbox diff / commits snapshot from GitHub.');
  }

  if (row?.updatedAt) {
    push(
      row.updatedAt,
      'Latest database update',
      `Ticket row status/stage: ${String(row.status || '—')} · ${String(row.stage || '—')}`,
    );
  }

  items.sort((a, b) => a.at.localeCompare(b.at));
  return items;
}

/**
 * @param {string} previewRaw
 * @returns {string | null}
 */
function normalizePreviewUrlInput(previewRaw) {
  if (previewRaw == null) return null;
  const s = String(previewRaw).trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-z0-9][-a-z0-9.]*\.vercel\.app$/i.test(s)) return `https://${s}`;
  return s;
}

/**
 * Change Console chat: append transcript + refine brief; stores a single JSON blob in the CMP ticket row.
 *
 * Body: { ticket_id, message, locale? }
 */
async function handleChangeChat(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'change-chat');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  const locale = typeof body?.locale === 'string' ? body.locale.trim() : '';

  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });
  if (!message) return res.status(400).json({ error: 'message is required' });

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) {
      return res.status(503).json({
        error: 'POSTGRES_URL_MISSING',
        hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to use CMP.',
      });
    }

    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantIdChat = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantIdChat && String(row.tenantId || '') !== scopeTenantIdChat) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    const existing = normalizeConsoleJson(row?.consoleJson);
    const now = new Date().toISOString();
    const next = {
      locale: locale || existing.locale || 'en',
      brief: existing.brief || {},
      messages: [...(existing.messages || []), { role: 'user', content: message, ts: now }].slice(-200),
    };

    const existingBrief =
      existing.brief && typeof existing.brief === 'object' && !Array.isArray(existing.brief)
        ? /** @type {Record<string, unknown>} */ (existing.brief)
        : {};
    const refined = await runGovernedGroqChangeRefiner({
      prisma,
      ticketId,
      tenantId: row.tenantId != null ? String(row.tenantId) : null,
      messages: next.messages,
      locale: next.locale,
      existingBrief,
    });

    const assistantMsg = {
      role: 'assistant',
      content: String(refined.assistant || '').trim() || 'OK',
      ts: new Date().toISOString(),
      ok: Boolean(refined.llm_ok),
    };

    const briefAfter = refined.brief && typeof refined.brief === 'object' ? refined.brief : next.brief || {};
    const transcriptTail = (next.messages || [])
      .slice(-8)
      .map((m) => (m && typeof m === 'object' ? String(m.content || '') : ''))
      .join('\n');
    const escalationChat = evaluateOperatorEscalation({
      description: row.description != null ? String(row.description) : '',
      brief: /** @type {Record<string, unknown>} */ (briefAfter),
      latestUserMessage: message,
      transcriptTail,
      nowIso: now,
      lastUserMsgTs: now,
      ticketDescriptionHash: crypto
        .createHash('sha256')
        .update(String(row.description || ''), 'utf8')
        .digest('hex'),
    });

    let attachmentCount = 0;
    try {
      attachmentCount = await prisma.cmpTicketAttachment.count({ where: { ticketId } });
    } catch {
      attachmentCount = 0;
    }
    const prevCv = existing.client_view && typeof existing.client_view === 'object' ? existing.client_view : {};
    const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
    const promPrev = existing.promotion && typeof existing.promotion === 'object' ? existing.promotion : {};
    const existsForDraft = {
      attachments: attachmentCount,
      preview_url:
        typeof prevAuto.client_site_preview_url === 'string' && prevAuto.client_site_preview_url.trim()
          ? prevAuto.client_site_preview_url.trim()
          : typeof prevAuto.preview_url === 'string' && prevAuto.preview_url.trim()
            ? prevAuto.preview_url.trim()
            : null,
      pr_url: typeof promPrev.pr_url === 'string' && promPrev.pr_url.trim() ? promPrev.pr_url.trim() : null,
      branch:
        typeof prevAuto.branch_name === 'string' && prevAuto.branch_name.trim() ? prevAuto.branch_name.trim() : null,
    };

    const stored = {
      ...existing,
      locale: next.locale,
      brief: briefAfter,
      messages: [],
    };

    const withholdChat = applyEscalatedRefinementMessages(stored, {
      baseMessages: next.messages,
      assistantMsg: {
        ...assistantMsg,
        content: escalationChat.operator_assisted
          ? buildGovernedOperatorDraft({
              rawAssistant: assistantMsg.content,
              brief: /** @type {Record<string, unknown>} */ (briefAfter),
              evidence: escalationChat.operator_escalation,
              exists: existsForDraft,
            })
          : assistantMsg.content,
      },
      assessment: escalationChat,
      refinedMeta: refined,
    });

    try {
      const briefObj = stored.brief && typeof stored.brief === 'object' ? stored.brief : {};
      const wf = computeRefinementWorkflowPatch(/** @type {Record<string, unknown>} */ (briefObj));
      const prevCv = stored.client_view && typeof stored.client_view === 'object' ? stored.client_view : {};
      stored.client_view = { ...prevCv, ...wf };
    } catch (_) {}
    Object.assign(
      stored,
      syncChangeTypeFromBriefToConsoleViews(stored && typeof stored === 'object' ? stored : {}),
    );

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: { consoleJson: stored, locale: stored.locale, brief: stored?.brief?.summary ? String(stored.brief.summary) : undefined },
    });

    const missChat = Array.isArray(stored.brief?.missing_information) ? stored.brief.missing_information : [];
    const ticketProgressChat = buildTicketProgress(stored, row.status || 'Open', row.stage || 'Intake', {
      ticketId,
      tenantId: row.tenantId,
    });
    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      assistant: withholdChat.withheld ? null : assistantMsg.content,
      pending_approval: withholdChat.withheld === true,
      draft_assistant: withholdChat.withheld ? assistantMsg.content : undefined,
      mode: stored.mode || undefined,
      pending_operator_draft: withholdChat.withheld ? stored.pending_operator_draft : undefined,
      operator_escalation_reasons: escalationChat.reasons.length ? escalationChat.reasons : undefined,
      brief: stored.brief,
      stored_messages: stored.messages.length,
      source: 'postgres',
      ticket_progress: ticketProgressChat,
      refinement_source: refined.refinement_source || (refined.llm_ok ? 'groq' : 'deterministic'),
      missing_information: missChat,
      clarification_needed: Array.isArray(missChat) && missChat.length > 0,
    });
  } catch (e) {
    return res.status(500).json({ error: 'change-chat failed', detail: String(e?.message || e) });
  }
}

/**
 * POST `action=change-chat-commit-draft` — post operator-edited AI draft to the ticket transcript.
 * Body: `{ ticket_id, content? }` (defaults to pending draft when `content` omitted)
 */
async function handleChangeChatCommitDraft(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'change-chat-commit-draft');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};
  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  const contentRaw = typeof body?.content === 'string' ? body.content.trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const existing = normalizeConsoleJson(row?.consoleJson);
    const pending =
      existing.pending_operator_draft && typeof existing.pending_operator_draft === 'object'
        ? existing.pending_operator_draft
        : {};
    const fromDraft = pending.content != null ? String(pending.content).trim() : '';
    const content = contentRaw || fromDraft;
    if (!content) {
      return res.status(400).json({ error: 'content is required (or save a pending draft first)' });
    }

    const now = new Date().toISOString();
    const assistantMsg = {
      role: 'assistant',
      content,
      ts: now,
      ok: true,
    };
    const msgs = Array.isArray(existing.messages) ? existing.messages.slice(0, 200) : [];
    const stored = {
      ...existing,
      messages: [...msgs, assistantMsg].slice(-200),
    };
    delete stored.pending_operator_draft;
    delete stored.mode;
    delete stored.operator_escalation_reasons;
    delete stored.operator_escalation;

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: { consoleJson: stored, locale: stored.locale, brief: stored?.brief?.summary ? String(stored.brief.summary) : undefined },
    });

    const ticketProgress = buildTicketProgress(stored, row.status || 'Open', row.stage || 'Intake', {
      ticketId,
      tenantId: row.tenantId,
    });
    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      assistant: content,
      pending_approval: false,
      ticket_progress: ticketProgress,
      stored_messages: stored.messages.length,
      source: 'postgres',
    });
  } catch (e) {
    return res.status(500).json({ error: 'change-chat-commit-draft failed', detail: String(e?.message || e) });
  }
}

/**
 * GET `action=client-decisions-get` — client-safe payload for the four client decision questions only.
 * Query: `id=<ticket_id>`
 */
async function handleClientDecisionsGet(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'client-decisions-get');
  if (guard !== true) return guard;

  const id = req.query?.id;
  if (!id || String(id).trim() === '') {
    return res.status(400).json({ error: 'id query parameter is required' });
  }

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

    const row = await prisma.cmpTicket.findUnique({ where: { id: String(id) } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const st = String(row.status || '').trim().toLowerCase();
    const sg = String(row.stage || '').trim().toLowerCase();
    if (st !== 'approved' || sg !== 'build') {
      return res.status(409).json({
        error: 'CLIENT_DECISIONS_NOT_READY',
        hint: 'Decisions are only collected when the ticket is Approved / Build.',
      });
    }

    const norm = normalizeConsoleJson(row.consoleJson);
    const hasCd = norm.client_decisions != null && typeof norm.client_decisions === 'object';
    if (!hasCd) {
      return res.status(200).json({
        ok: true,
        ticket_id: row.id,
        heading: 'A few decisions first',
        explanation: 'We need your input on four topics before the first live slice.',
        client_decisions: { items: [], sufficient_to_proceed: false },
        source: 'postgres',
      });
    }

    let working = norm;
    if (umbrellaInternalDecisionsNeedPersist(row.id, working)) {
      working = mergeProgrammeInternalDecisionsForTicket(row.id, working);
      await prisma.cmpTicket.update({
        where: { id: row.id },
        data: {
          consoleJson: working,
          locale: working.locale,
          brief: working?.brief?.summary ? String(working.brief.summary) : undefined,
        },
      });
    }

    const stored = ensureClientDecisionsOnConsoleJson(working);
    const cd = stored.client_decisions && typeof stored.client_decisions === 'object' ? stored.client_decisions : {};
    const items = Array.isArray(cd.items) ? cd.items : [];
    const gate = evaluateClientDecisionsGate(items.map((x) => (x && typeof x === 'object' ? x : {})));

    return res.status(200).json({
      ok: true,
      ticket_id: row.id,
      heading: 'A few decisions first',
      explanation: 'We need your input on four topics before the first live slice.',
      client_decisions: { items, sufficient_to_proceed: gate.sufficient_to_proceed },
      source: 'postgres',
    });
  } catch (e) {
    return res.status(500).json({ error: 'client-decisions-get failed', detail: String(e?.message || e) });
  }
}

/**
 * POST `action=submit-client-decisions` — persist allowed client answers to `console_json.client_decisions`.
 * Umbrella programme tickets also persist approved `internal_decisions` server-side (never in this JSON body).
 * Body: `{ ticket_id, answers: { [key]: { answer?: string, waive?: boolean } } }`
 */
async function handleSubmitClientDecisions(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'submit-client-decisions');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};
  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  const answers = body?.answers && typeof body.answers === 'object' ? body.answers : null;
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });
  if (!answers) return res.status(400).json({ error: 'answers is required' });

  try {
    const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
    if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });
    const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
    if (scopeTenantId && String(row.tenantId || '') !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const st = String(row.status || '').trim().toLowerCase();
    const sg = String(row.stage || '').trim().toLowerCase();
    if (st !== 'approved' || sg !== 'build') {
      return res.status(409).json({
        error: 'CLIENT_DECISIONS_NOT_READY',
        hint: 'Decisions can only be submitted when the ticket is Approved / Build.',
      });
    }

    const existing = normalizeConsoleJson(row.consoleJson);
    const prevCd = existing.client_decisions && typeof existing.client_decisions === 'object' ? existing.client_decisions : {};
    if (!existing.client_decisions || typeof existing.client_decisions !== 'object') {
      return res.status(409).json({ error: 'CLIENT_DECISIONS_NOT_CONFIGURED' });
    }
    const prevItems = Array.isArray(prevCd.items) ? prevCd.items : [];
    if (!prevItems.length) {
      return res.status(409).json({ error: 'CLIENT_DECISIONS_NOT_CONFIGURED' });
    }
    if (prevCd.sufficient_to_proceed === true) {
      return res.status(409).json({ error: 'CLIENT_DECISIONS_ALREADY_COMPLETE' });
    }

    const filteredAnswers = pickClientDecisionAnswersOnly(answers);

    const nowIso = new Date().toISOString();
    const summaryLines = Object.entries(filteredAnswers)
      .map(([k, v]) => {
        const o = v && typeof v === 'object' ? v : {};
        const waive = o.waive === true || o.waive === 'true';
        const ans = typeof o.answer === 'string' ? o.answer.trim() : '';
        if (waive) return `- ${k}: (waived)`;
        if (!ans) return `- ${k}: (empty)`;
        return `- ${k}: ${ans}`;
      })
      .filter(Boolean);
    const userMsg = {
      role: 'user',
      content: `Client decisions submitted:\n${summaryLines.join('\n')}`.slice(0, 8000),
      ts: nowIso,
      ok: true,
      source: 'client_decisions_submit',
    };
    const msgs = Array.isArray(existing.messages) ? existing.messages.slice(0, 200) : [];
    const appended = [...msgs, userMsg].slice(-200);
    const messageId = `msg:${String(appended.length - 1)}:${nowIso}`;

    const applied = applyClientDecisionAnswers({
      stored: { ...existing, messages: appended },
      answersByKey: /** @type {Record<string, { answer?: unknown, waive?: unknown }>} */ (filteredAnswers),
      meta: { nowIso, messageId },
    });

    const persisted = mergeProgrammeInternalDecisionsForTicket(ticketId, applied.next);

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: {
        consoleJson: persisted,
        locale: persisted.locale,
        brief: persisted?.brief?.summary ? String(persisted.brief.summary) : undefined,
      },
    });

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      client_decisions: {
        items: persisted.client_decisions?.items || [],
        sufficient_to_proceed: applied.sufficient_to_proceed,
      },
      source: 'postgres',
    });
  } catch (e) {
    return res.status(500).json({ error: 'submit-client-decisions failed', detail: String(e?.message || e) });
  }
}

async function handleSandboxStart(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'sandbox-start');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) {
    return res.status(400).json({ error: 'ticket_id is required' });
  }
  const baseRef =
    typeof body?.base_ref === 'string' && body.base_ref.trim()
      ? body.base_ref.trim()
      : 'main';

  const dispatched = await dispatchCmpSandboxStart({ ticketId, baseRef });
  await notifyCmpAutomationWebhook({
    ticket_id: ticketId,
    base_ref: baseRef,
    source: 'sandbox-start',
    dispatch_ok: dispatched.ok,
    dispatch_error: dispatched.error || null,
  });

  if (!dispatched.ok) {
    return res.status(503).json({
      error: 'Sandbox dispatch failed',
      detail: dispatched.error,
      hint: 'Set CMP_GITHUB_TOKEN (repo scope) and GITHUB_REPO=owner/repo on Vercel.',
    });
  }

  return res.status(200).json({
    ok: true,
    ticket_id: ticketId,
    base_ref: baseRef,
    message: 'GitHub Actions repository_dispatch cmp_sandbox_start sent.',
  });
}

async function handleSessionVerify(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!DORMANT_GATE_ENABLED) {
    return res.status(200).json({ ok: true, dormant_gate: false });
  }

  const masterToken = (req.query?.token || req.body?.token || '').toString();
  const master = (process.env.MASTER_ADMIN_KEY || process.env.ADMIN_PIN || '').toString();
  if (masterToken && master && timingSafeEquals(masterToken, master)) {
    return res.status(200).json({ ok: true, dormant_gate: true, lane: 'factory_master' });
  }

  const secret = getSovereignSessionSecret();
  if (secret) {
    const bearer = extractSovereignBearer(req);
    if (bearer) {
      const v = verifySovereignSessionToken(bearer, secret);
      if (v.ok && v.payload?.typ === 'sovereign') {
        return res.status(200).json({ ok: true, dormant_gate: true, lane: 'tenant_sovereign' });
      }
    }
  }

  return deny(res, 401, 'Dormant Gate verification failed.');
}

const SOVEREIGN_SESSION_TTL_SEC = Math.min(
  86400 * 7,
  Math.max(300, parseInt(process.env.SOVEREIGN_SESSION_TTL_SEC || '86400', 10) || 86400),
);

const SOVEREIGN_HANDOVER_OATH =
  (process.env.SOVEREIGN_HANDOVER_OATH || '').toString().trim() ||
  "Even I don't know your PIN. Your data is sovereign to you. If you lose it, I have to physically break the lock and give you a new one.";

/**
 * One-shot PIN verify against Postgres tenant row; returns signed sovereign session (fail-closed).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleTenantSessionBootstrap(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getSovereignSessionSecret();
  if (!secret) {
    return deny(res, 503, 'SOVEREIGN_SESSION_SECRET is not configured.');
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const tenantIdRaw =
    body?.tenant_id ||
    body?.tenantId ||
    req.corpflowContext?.tenant_id ||
    getClientIdFromBody(body);
  const tenantId = tenantIdRaw != null ? String(tenantIdRaw).trim() : '';
  if (!tenantId) {
    return deny(res, 400, 'tenant_id is required.');
  }

  const pin = body?.pin != null ? String(body.pin) : '';
  if (!pin) {
    return deny(res, 400, 'pin is required.');
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return deny(res, 503, 'POSTGRES_URL_MISSING', { hint: 'Configure POSTGRES_URL to enable tenant sessions.' });
  }

  try {
    const t = await prisma.tenant.findUnique({
      where: { tenantId },
      select: { tenantId: true, sovereignPinHash: true, enabled: true },
    });
    if (!t || !t.tenantId) {
      return deny(res, 404, 'Tenant not found.');
    }
    const stored = t.sovereignPinHash != null ? String(t.sovereignPinHash) : '';
    if (!stored || !verifyPinAgainstStored(pin, stored)) {
      emitLogicFailure({
        source: 'api/cmp/router.js:tenant-session-bootstrap',
        severity: 'warning',
        error: new Error('PIN verification failed'),
        cmp: { ticket_id: 'n/a', action: 'tenant-session-bootstrap' },
        meta: { tenant_id: tenantId },
      });
      return deny(res, 401, 'Invalid PIN.');
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      typ: 'sovereign',
      tenant_id: tenantId,
      iat: now,
      exp: now + SOVEREIGN_SESSION_TTL_SEC,
    };
    const sovereignSession = signSovereignSession(payload, secret);

    return res.status(200).json({
      ok: true,
      lane: 'tenant_sovereign',
      sovereign_session: sovereignSession,
      expires_in: SOVEREIGN_SESSION_TTL_SEC,
      tenant_id: tenantId,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-session-bootstrap',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-session-bootstrap' },
    });
    return res.status(500).json({ error: 'tenant-session-bootstrap failed', detail: String(e?.message || e) });
  }
}

/**
 * Factory-only: generate PIN, store scrypt hash in Postgres, return plaintext PIN once + oath text.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleProvisionTenantPin(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireFactoryMasterOnly(req, res, 'provision-tenant-pin');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const tenantId =
    body?.tenant_id || body?.tenantId || req.corpflowContext?.tenant_id || getClientIdFromBody(body);
  const tid = tenantId != null ? String(tenantId).trim() : '';
  if (!tid) {
    return deny(res, 400, 'tenant_id is required.');
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return deny(res, 503, 'POSTGRES_URL_MISSING', { hint: 'Configure POSTGRES_URL to enable tenant PIN provisioning.' });
  }

  try {
    const plainPin = generateSecureTenantPin();
    const hashed = hashPinForStorage(plainPin);

    // Ensure tenant exists; if not, create minimal tenant record.
    await prisma.tenant.upsert({
      where: { tenantId: tid },
      update: { sovereignPinHash: hashed },
      create: {
        tenantId: tid,
        slug: tid,
        name: tid,
        sovereignPinHash: hashed,
      },
    });

    recordSovereignAuditEvent({
      tenant_id: tid,
      action: 'provision-tenant-pin',
      meta: { pin_issued: true },
    });

    return res.status(200).json({
      ok: true,
      tenant_id: tid,
      pin: plainPin,
      oath: SOVEREIGN_HANDOVER_OATH,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:provision-tenant-pin',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'provision-tenant-pin' },
    });
    return res.status(500).json({ error: 'provision-tenant-pin failed', detail: String(e?.message || e) });
  }
}

/**
 * Factory-only: create or update a tenant record (onboarding).
 *
 * POST `action=tenant-onboard`
 * Body:
 *   { tenant_id, slug?, name?, fqdn?, execution_only?, lifecycle?, tenant_status? }
 *
 * Notes:
 * - This is intentionally separate from `provision-tenant-pin` so creating a tenant
 *   does not require issuing credentials.
 */
async function handleTenantOnboard(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireFactoryMasterOnly(req, res, 'tenant-onboard');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const tenantIdRaw = body?.tenant_id || body?.tenantId || req.corpflowContext?.tenant_id || getClientIdFromBody(body);
  const tenantId = tenantIdRaw != null ? String(tenantIdRaw).trim() : '';
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });

  const slugRaw = body?.slug != null ? String(body.slug).trim() : '';
  const nameRaw = body?.name != null ? String(body.name).trim() : '';
  const fqdnRaw = body?.fqdn != null ? String(body.fqdn).trim() : '';
  const lifecycleRaw = body?.lifecycle != null ? String(body.lifecycle).trim() : '';
  const tenantStatusRaw = body?.tenant_status != null ? String(body.tenant_status).trim() : '';
  const executionOnly = body?.execution_only != null ? Boolean(body.execution_only) : undefined;

  const slug = slugRaw || tenantId;
  const name = nameRaw || tenantId;
  const fqdn = fqdnRaw || null;
  const lifecycle = lifecycleRaw || undefined;
  const tenantStatus = tenantStatusRaw || undefined;

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to onboard tenants.',
    });
  }

  try {
    const row = await prisma.tenant.upsert({
      where: { tenantId },
      update: {
        slug,
        name,
        fqdn,
        ...(lifecycle != null ? { lifecycle } : {}),
        ...(tenantStatus != null ? { tenantStatus } : {}),
        ...(executionOnly !== undefined ? { executionOnly } : {}),
      },
      create: {
        tenantId,
        slug,
        name,
        fqdn,
        ...(lifecycle != null ? { lifecycle } : {}),
        ...(tenantStatus != null ? { tenantStatus } : {}),
        ...(executionOnly !== undefined ? { executionOnly } : {}),
      },
      select: {
        tenantId: true,
        slug: true,
        name: true,
        fqdn: true,
        lifecycle: true,
        tenantStatus: true,
        executionOnly: true,
        updatedAt: true,
        createdAt: true,
      },
    });

    recordSovereignAuditEvent({
      tenant_id: tenantId,
      action: 'tenant-onboard',
      meta: {
        slug,
        name,
        fqdn,
        lifecycle: row.lifecycle || null,
        tenant_status: row.tenantStatus || null,
        execution_only: row.executionOnly === true,
      },
    });

    return res.status(200).json({
      ok: true,
      tenant: {
        tenant_id: row.tenantId,
        slug: row.slug,
        name: row.name,
        fqdn: row.fqdn,
        lifecycle: row.lifecycle,
        tenant_status: row.tenantStatus,
        execution_only: row.executionOnly,
        created_at: row.createdAt instanceof Date ? row.createdAt.toISOString() : null,
        updated_at: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : null,
      },
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-onboard',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-onboard' },
      meta: { tenant_id: tenantId },
    });
    return res.status(500).json({ error: 'tenant-onboard failed', detail: String(e?.message || e) });
  }
}

/**
 * Factory-only: upsert `tenant_hostnames` mapping (host -> tenant_id).
 *
 * POST `action=tenant-hostname-upsert`
 * Body:
 *   { host, tenant_id, mode?, enabled? }
 *
 * Notes:
 * - We use raw SQL because Prisma schema does not currently model tenant_hostnames.
 * - This is critical for demo sites (e.g. legal.corpflowai.com) so the runtime can
 *   route requests to the correct tenant.
 */
async function handleTenantHostnameUpsert(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireFactoryMasterOnly(req, res, 'tenant-hostname-upsert');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const hostRaw = body?.host != null ? String(body.host).trim().toLowerCase() : '';
  const tenantIdRaw = body?.tenant_id || body?.tenantId || req.corpflowContext?.tenant_id || getClientIdFromBody(body);
  const tenantId = tenantIdRaw != null ? String(tenantIdRaw).trim() : '';
  const modeRaw = body?.mode != null ? String(body.mode).trim() : '';
  const enabled = body?.enabled != null ? Boolean(body.enabled) : true;

  if (!hostRaw) return res.status(400).json({ error: 'host is required' });
  if (!tenantId) return res.status(400).json({ error: 'tenant_id is required' });
  if (!/^[a-z0-9.-]+$/.test(hostRaw)) {
    return res.status(400).json({ error: 'host must be a simple hostname (letters, digits, dot, dash)' });
  }

  const bypassHostnamePolicy = body?.bypass_client_hostname_policy === true;
  const hostnamePolicy = evaluateOnboardingHostnamePolicy(hostRaw, {
    bypass: bypassHostnamePolicy,
    tenantId,
  });
  if (!hostnamePolicy.allowed) {
    return res.status(400).json({
      error: hostnamePolicy.code || 'ONBOARDING_HOSTNAME_POLICY',
      hint: hostnamePolicy.hint,
    });
  }

  const mode = modeRaw || 'tenant';

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({
      error: 'POSTGRES_URL_MISSING',
      hint: 'Configure POSTGRES_URL (Prisma pooled URL is fine) to write tenant_hostnames.',
    });
  }

  try {
    const id = crypto.randomUUID();
    // Ensure table exists (it is created by /api/factory/postgres/ensure-schema).
    await prisma.$executeRaw`
      insert into tenant_hostnames (id, host, tenant_id, mode, enabled, created_at, updated_at)
      values (${id}, ${hostRaw}, ${tenantId}, ${mode}, ${enabled}, now(), now())
      on conflict (host)
      do update set
        tenant_id = excluded.tenant_id,
        mode = excluded.mode,
        enabled = excluded.enabled,
        updated_at = now()
    `;
    const rows = await prisma.$queryRaw`
      select host, tenant_id, mode, enabled, created_at, updated_at
      from tenant_hostnames
      where host = ${hostRaw}
      limit 1
    `;
    const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
    recordSovereignAuditEvent({
      tenant_id: tenantId,
      action: 'tenant-hostname-upsert',
      meta: {
        host: hostRaw,
        mode,
        enabled: enabled === true,
        hostname_policy_bypass: bypassHostnamePolicy === true,
        hostname_policy_notice: hostnamePolicy.notice || undefined,
      },
    });
    return res.status(200).json({
      ok: true,
      mapping: row,
      ...(hostnamePolicy.notice ? { policy_notice: hostnamePolicy.notice } : {}),
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-hostname-upsert',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-hostname-upsert' },
      meta: { tenant_id: tenantId, host: hostRaw },
      recommended_action:
        'Run POST /api/factory/postgres/ensure-schema to create tenant_hostnames, then retry. Verify POSTGRES_URL and permissions.',
    });
    return res.status(500).json({ error: 'tenant-hostname-upsert failed', detail: String(e?.message || e) });
  }
}

/**
 * Sovereign-gated telemetry tail for execution-only / ghost clients.
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleTenantLogStream(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = getSovereignSessionSecret();
  if (!secret) {
    return deny(res, 503, 'SOVEREIGN_SESSION_SECRET is not configured.');
  }

  const token = extractSovereignBearer(req);
  if (!token) {
    return deny(res, 401, 'Sovereign session required (Authorization Bearer or x-sovereign-session).');
  }

  const v = verifySovereignSessionToken(token, secret);
  if (!v.ok || !v.payload || v.payload.typ !== 'sovereign') {
    return deny(res, 401, 'Invalid or expired tenant session.');
  }

  const tenantId = v.payload.tenant_id != null ? String(v.payload.tenant_id).trim() : '';
  if (!tenantId) {
    return deny(res, 401, 'Invalid tenant session payload.');
  }

  const limitRaw = req.query?.limit;
  const limit = Math.min(200, Math.max(1, parseInt(String(Array.isArray(limitRaw) ? limitRaw[0] : limitRaw || '80'), 10) || 80));

  try {
    const logs = await readTenantTelemetryTailPg(tenantId, limit).catch(() => readTenantTelemetryTail(tenantId, limit));
    return res.status(200).json({ ok: true, tenant_id: tenantId, logs });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:tenant-log-stream',
      severity: 'error',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'tenant-log-stream' },
      meta: { tenant_id: tenantId },
    });
    return res.status(500).json({ error: 'tenant-log-stream failed', detail: String(e?.message || e) });
  }
}

/**
 * UAT signoff: deprecated (legacy config storage removed).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<import('http').ServerResponse>}
 */
async function handleSignoff(req, res) {
  return res.status(503).json({
    error: 'SIGNOFF_NOT_AVAILABLE',
    hint:
      'Signoff previously promoted pending_config→live_config in a legacy store. That store has been removed; migrate tenant config storage to Postgres before re-enabling signoff.',
  });
}

async function handleEvolutionRequest(req, res) {
  const gate = requireDormantGate(req, res, 'evolution-request');
  if (gate !== true) return gate;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const tier = getClientTier(clientId);
  if (tier === 'STATIC') {
    emitLogicFailure({
      source: 'api/cmp/router.js:TierGate',
      severity: 'fatal',
      error: new Error('STATIC tier blocked evolution-request'),
      cmp: { ticket_id: 'n/a', action: 'evolution-request' },
      recommended_action: 'Request admin escalation or upgrade client tier.',
      meta: { client_id: clientId, client_tier: tier },
    });
    return deny(res, 403, 'STATIC clients cannot run evolution-request.');
  }

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('evolution-request');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'evolution-request' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'evolution-request',
    });
  }

  return res.status(501).json({ error: 'evolution-request not implemented', tier });
}

async function handleMarketResearch(req, res) {
  const gate = requireDormantGate(req, res, 'market-research');
  if (gate !== true) return gate;
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const tier = getClientTier(clientId);
  if (tier === 'STATIC') {
    emitLogicFailure({
      source: 'api/cmp/router.js:TierGate',
      severity: 'fatal',
      error: new Error('STATIC tier blocked market-research'),
      cmp: { ticket_id: 'n/a', action: 'market-research' },
      recommended_action: 'Request admin escalation or upgrade client tier.',
      meta: { client_id: clientId, client_tier: tier },
    });
    return deny(res, 403, 'STATIC clients cannot run market-research.');
  }

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('market-research');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'market-research' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'market-research',
    });
  }

  return res.status(501).json({ error: 'market-research not implemented', tier });
}

function writeJsonFileSafe(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

async function handleSupplierOnboard(req, res) {
  const gate = requireDormantGate(req, res, 'supplier-onboard');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const subUserId = getSubUserId(req);
  const requiredCluster = requiredClusterForAction('supplier-onboard');
  if (!subUserId || !requiredCluster || !getClusterEnabled(clientId, subUserId, requiredCluster)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:permission-denied',
      severity: 'warning',
      error: new Error('Permission Denied: insufficient staff cluster access.'),
      cmp: { ticket_id: 'n/a', action: 'supplier-onboard' },
      recommended_action: 'Request the required cluster access from the Client Authorized Representative.',
      meta: { client_id: clientId, staff_id: subUserId || null, required_cluster: requiredCluster },
    });
    return deny(res, 403, 'Permission Denied', {
      required_cluster: requiredCluster,
      staff_id: subUserId || null,
      action: 'supplier-onboard',
    });
  }

  const supplierKey =
    body?.supplier_key || body?.supplierKey || body?.supplier || body?.supplier_type || null;
  if (!supplierKey || String(supplierKey).trim() === '') {
    return res.status(400).json({ error: 'supplier_key is required' });
  }

  const config = body?.supplier_config || body?.config || body?.details || {};
  const redactedConfig = redactPotentialSecrets(config);

  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH) || {};
  manifest.tenant_access = manifest.tenant_access || {};
  manifest.tenant_access[clientId] = manifest.tenant_access[clientId] || {};
  manifest.tenant_access[clientId].supplier_access =
    manifest.tenant_access[clientId].supplier_access || {};

  manifest.tenant_access[clientId].supplier_access[supplierKey] = redactedConfig;
  manifest.tenant_access[clientId].supplier_onboarded_at = new Date().toISOString();

  try {
    writeJsonFileSafe(SECRETS_MANIFEST_PATH, manifest);
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:supplier-onboard',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'supplier-onboard' },
      recommended_action: 'Verify filesystem permissions for vanguard/secrets-manifest.json.',
      meta: { client_id: clientId, supplier_key: supplierKey },
    });
    return deny(res, 500, 'Failed to persist supplier access configuration.');
  }

  return res.status(200).json({ ok: true, client_id: clientId, supplier_key: supplierKey });
}

async function handleRigorClientAck(req, res) {
  const gate = requireDormantGate(req, res, 'rigor-client-ack');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const staffId = getSubUserId(req);
  if (!staffId) return deny(res, 403, 'x-subuser-id header is required.', { client_id: clientId });

  if (!isAuthorizedRepresentative(clientId, staffId)) {
    emitLogicFailure({
      source: 'api/cmp/router.js:rigor-client-ack',
      severity: 'warning',
      error: new Error('Permission Denied: not an Authorized Representative'),
      cmp: { ticket_id: 'n/a', action: 'rigor-client-ack' },
      recommended_action: 'Authorized Representative acknowledgement required.',
      meta: { client_id: clientId, staff_id: staffId },
    });
    return deny(res, 403, 'Permission Denied', { client_id: clientId, staff_id: staffId });
  }

  const rigorReportId =
    body?.rigor_report_id ||
    body?.rigorReportId ||
    body?.rigor_report ||
    body?.report_id ||
    null;
  if (!rigorReportId) return res.status(400).json({ error: 'rigor_report_id is required' });

  try {
    let verdict;
    try {
      verdict = verifyRigorViaPython({
        description: '',
        costUsd: 0,
        clientId,
        action: 'rigor-client-ack',
        ticketId: 'n/a',
        authorizedRepWhatsAppNumbers: getAuthorizedRepWhatsAppNumbers(clientId),
        clientAcknowledged: true,
        rigorReportId: String(rigorReportId),
      });
    } catch (e) {
      if (isPythonSpawnEnoent(e)) {
        return res.status(503).json({
          error: 'RIGOR_ACK_REQUIRES_PYTHON_OR_DISK',
          hint:
            'Client acknowledgement uses the Python verifier and pending report files on disk — not available on this serverless host. Run ack from an environment with Python and a writable vanguard/audit-trail, or extend the API with a Postgres-backed rigor store.',
        });
      }
      throw e;
    }

    return res.status(200).json({
      ok: true,
      client_id: clientId,
      rigor_report_id: String(rigorReportId),
      staff_id: staffId,
      verdict,
    });
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:rigor-client-ack',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'rigor-client-ack' },
      recommended_action: 'Check verify-rigor runtime and pending report persistence.',
      meta: { client_id: clientId, rigor_report_id: String(rigorReportId) },
    });
    return deny(res, 500, 'Rigor acknowledgement failed.');
  }
}

async function handleAdminToggleClusters(req, res) {
  const gate = requireDormantGate(req, res, 'admin-toggle-clusters');
  if (gate !== true) return gate;

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body;

  const clientId = getClientIdFromBody(body);
  if (!clientId) return res.status(400).json({ error: 'client_id is required' });

  const adminSubUserId = getSubUserId(req);
  const targetSubUserId =
    body?.target_sub_user_id || body?.targetSubUserId || body?.sub_user_id || body?.subUserId;
  if (!adminSubUserId) return res.status(400).json({ error: 'x-subuser-id header is required' });
  if (!targetSubUserId) return res.status(400).json({ error: 'target_sub_user_id is required' });

  const clustersEnabled = Array.isArray(body?.clusters_enabled)
    ? body.clusters_enabled
    : Array.isArray(body?.clustersEnabled)
      ? body.clustersEnabled
      : [];

  const manifest = readJsonFileSafe(SECRETS_MANIFEST_PATH) || {};
  const accessClusters = manifest?.tenant_access?.[clientId]?.access_clusters || {};
  const clientAdmins = accessClusters?.client_admins || [];

  if (!clientAdmins.includes(adminSubUserId)) {
    return deny(res, 403, 'Admin is not authorized to toggle access clusters.', {
      client_id: clientId,
      admin_sub_user_id: adminSubUserId,
    });
  }

  manifest.tenant_access = manifest.tenant_access || {};
  manifest.tenant_access[clientId] = manifest.tenant_access[clientId] || {};
  manifest.tenant_access[clientId].access_clusters = manifest.tenant_access[clientId].access_clusters || {};
  manifest.tenant_access[clientId].access_clusters.sub_users =
    manifest.tenant_access[clientId].access_clusters.sub_users || {};

  manifest.tenant_access[clientId].access_clusters.sub_users[targetSubUserId] = {
    clusters_enabled: clustersEnabled,
  };

  try {
    writeJsonFileSafe(SECRETS_MANIFEST_PATH, manifest);
  } catch (e) {
    emitLogicFailure({
      source: 'api/cmp/router.js:admin-toggle-clusters',
      severity: 'fatal',
      error: e,
      cmp: { ticket_id: 'n/a', action: 'admin-toggle-clusters' },
      recommended_action: 'Verify filesystem permissions for vanguard/secrets-manifest.json.',
      meta: { client_id: clientId, admin_sub_user_id: adminSubUserId, target_sub_user_id: targetSubUserId },
    });
    return deny(res, 500, 'Failed to persist cluster toggles.');
  }

  return res.status(200).json({ ok: true, client_id: clientId, target_sub_user_id: targetSubUserId });
}

async function handleOverseer(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'overseer');
  if (guard !== true) return guard;

  // Admin-only: overseer is an operator audit surface.
  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload?.typ === 'admin')) {
    return deny(res, 403, 'Permission Denied');
  }

  const ticketId = String(req.query?.ticket_id || req.body?.ticket_id || '').trim();
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });
  const baseRef = String(req.query?.base_ref || req.body?.base_ref || '').trim() || undefined;

  const out = await fetchCmpOverseerSummary({ ticketId, baseRef });
  if (!out.ok) {
    return res.status(503).json({
      error: 'Overseer unavailable',
      detail: out.error,
      hint: 'Ensure GitHub token + repo are configured and the cmp/<ticket_id> branch exists.',
    });
  }

  return res.status(200).json({
    ok: true,
    ticket_id: ticketId,
    base_ref: baseRef || String(cfg('CMP_SANDBOX_BASE_REF', 'main') || 'main'),
    branch_name: out.branch_name,
    compare_url: out.compare_url,
    commits: out.commits || [],
    files: out.files || [],
  });
}

async function runOverseerSweep(limit) {
  const rows = await prisma.cmpTicket.findMany({
    where: { status: 'Approved', stage: 'Build' },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    select: { id: true, tenantId: true, consoleJson: true, updatedAt: true, createdAt: true },
  });

  const results = [];
  for (const r of rows) {
    const prev = r.consoleJson && typeof r.consoleJson === 'object' ? r.consoleJson : {};
    const prevOverseer = prev?.overseer && typeof prev.overseer === 'object' ? prev.overseer : null;
    const prevAt = prevOverseer?.updated_at ? Date.parse(String(prevOverseer.updated_at)) : 0;
    // Basic staleness guard: skip if updated in last 60s.
    if (prevAt && Date.now() - prevAt < 60_000) {
      results.push({ ticket_id: r.id, ok: true, skipped: true, reason: 'fresh' });
      continue;
    }

    const summary = await fetchCmpOverseerSummary({ ticketId: r.id });
    if (!summary.ok) {
      const next = {
        ...prev,
        overseer: {
          ok: false,
          updated_at: new Date().toISOString(),
          ticket_id: r.id,
          branch_name: summary.branch_name || `cmp/${r.id}`,
          error: summary.error || 'overseer_failed',
        },
      };
      await prisma.cmpTicket.update({ where: { id: r.id }, data: { consoleJson: next } });
      results.push({ ticket_id: r.id, ok: false, error: summary.error || 'overseer_failed' });
      continue;
    }

    const next = {
      ...prev,
      overseer: {
        ok: true,
        updated_at: new Date().toISOString(),
        ticket_id: r.id,
        branch_name: summary.branch_name || `cmp/${r.id}`,
        compare_url: summary.compare_url || null,
        commits: summary.commits || [],
        files: summary.files || [],
      },
    };
    await prisma.cmpTicket.update({ where: { id: r.id }, data: { consoleJson: next } });
    results.push({ ticket_id: r.id, ok: true, commits: (summary.commits || []).length, files: (summary.files || []).length });
  }

  return { swept: rows.length, results };
}

async function handleOverseerSweep(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireFactoryMasterOnly(req, res, 'overseer-sweep');
  if (guard !== true) return guard;

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING', hint: 'Configure POSTGRES_URL to run overseer sweep.' });
  }

  const limitRaw = req.query?.limit || req.body?.limit || cfg('OVERSEER_SWEEP_LIMIT', '10');
  const limit = Math.min(50, Math.max(1, parseInt(String(limitRaw || '10'), 10) || 10));
  const out = await runOverseerSweep(limit);
  return res.status(200).json({ ok: true, ...out });
}

async function handleOverseerSweepCron(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = String(cfg('CORPFLOW_CRON_SECRET', '') || cfg('CRON_SECRET', '')).trim();
  if (!secret) return res.status(503).json({ error: 'CORPFLOW_CRON_SECRET is not configured.' });
  const authz = String(req.headers?.authorization || '').trim();
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token || !timingSafeEquals(token, secret)) return res.status(401).json({ error: 'Unauthorized' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });
  }

  const limitRaw = req.query?.limit || req.body?.limit || cfg('OVERSEER_SWEEP_LIMIT', '10');
  const limit = Math.min(50, Math.max(1, parseInt(String(limitRaw || '10'), 10) || 10));
  const out = await runOverseerSweep(limit);
  return res.status(200).json({ ok: true, cron: true, ...out });
}

/**
 * Cron + optional factory-master sweep: refresh overseer for stuck Approved/Build tickets
 * and re-dispatch sandbox when dispatch never succeeded (no second credit debit).
 * Bounded by CMP_AUTO_REPAIR_* env (see lib/cmp/_lib/cmp-stuck-self-repair.js).
 *
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {{ cron: boolean }} mode
 * @returns {Promise<void>}
 */
async function handleStuckSelfRepairSweepInner(req, res, mode) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) {
    return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });
  }

  const limitRaw = req.query?.limit ?? req.body?.limit;
  const limit =
    limitRaw != null && String(limitRaw).trim() !== ''
      ? Math.min(50, Math.max(1, parseInt(String(limitRaw), 10) || 12))
      : undefined;

  /** @type {string[]} */
  let extraPriority = [];
  if (req.method === 'POST') {
    const parsed = parseJsonBody(req);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    const body = parsed.body || {};
    const p1 =
      body?.priority_ticket_ids != null
        ? String(body.priority_ticket_ids)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const p2 =
      body?.priority_ticket_id != null && String(body.priority_ticket_id).trim()
        ? [String(body.priority_ticket_id).trim()]
        : [];
    extraPriority = [...p2, ...p1];
  }
  const qP = req.query?.priority_ticket_id;
  if (qP != null && String(qP).trim()) {
    extraPriority.unshift(String(qP).trim());
  }

  const out = await runStuckSelfRepair(prisma, {
    limit,
    priorityTicketIds: extraPriority.length ? Array.from(new Set(extraPriority)) : undefined,
  });
  return res.status(200).json({ ok: true, ...(mode.cron ? { cron: true } : {}), ...out });
}

async function handleStuckSelfRepairCron(req, res) {
  const secret = String(cfg('CORPFLOW_CRON_SECRET', '') || cfg('CRON_SECRET', '')).trim();
  if (!secret) return res.status(503).json({ error: 'CORPFLOW_CRON_SECRET is not configured.' });
  const authz = String(req.headers?.authorization || '').trim();
  const token = authz.toLowerCase().startsWith('bearer ') ? authz.slice(7).trim() : '';
  if (!token || !timingSafeEquals(token, secret)) return res.status(401).json({ error: 'Unauthorized' });

  if (req.method === 'POST') {
    const parsed = parseJsonBody(req);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    req.body = parsed.body || {};
  }

  return handleStuckSelfRepairSweepInner(req, res, { cron: true });
}

async function handleStuckSelfRepairSweep(req, res) {
  const guard = requireFactoryMasterOnly(req, res, 'stuck-self-repair-sweep');
  if (guard !== true) return guard;

  if (req.method === 'POST') {
    const parsed = parseJsonBody(req);
    if (!parsed.ok) return res.status(400).json({ error: parsed.error });
    req.body = parsed.body || {};
  }

  return handleStuckSelfRepairSweepInner(req, res, { cron: false });
}

async function handleAutomationCallback(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = String(cfg('CMP_AUTOMATION_CALLBACK_SECRET', '')).trim();
  if (!secret) {
    return res.status(503).json({ error: 'CMP_AUTOMATION_CALLBACK_SECRET is not configured.' });
  }
  const provided =
    String(req.headers?.['x-cmp-automation-secret'] || '').trim() ||
    String(req.headers?.['x-corpflow-automation-secret'] || '').trim();
  if (!provided || !timingSafeEquals(provided, secret)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};
  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, consoleJson: true, description: true },
  });
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  const prev = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};

  const prNumber = body?.pr_number != null ? Number(body.pr_number) : null;
  const prUrl = typeof body?.pr_url === 'string' ? body.pr_url.trim() : null;
  const branchName = typeof body?.branch_name === 'string' ? body.branch_name.trim() : null;
  const baseRef = typeof body?.base_ref === 'string' ? body.base_ref.trim() : null;
  const previewIn = normalizePreviewUrlInput(
    body?.preview_url ?? body?.deployment_url ?? body?.site_url ?? null,
  );

  const prevCv = prev?.client_view && typeof prev.client_view === 'object' ? prev.client_view : {};
  const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
  let automation = {
    ...prevAuto,
    ...(previewIn
      ? {
          preview_url: previewIn,
          preview_updated_at: new Date().toISOString(),
        }
      : {}),
    updated_at: new Date().toISOString(),
  };
  const effectivePreview = String(
    previewIn || (typeof prevAuto.preview_url === 'string' ? prevAuto.preview_url.trim() : '') || '',
  ).trim();
  const gatedCb = await applyVisualClientPreviewGate(prisma, {
    ticketRow: row,
    automation,
    previewUrl: effectivePreview || null,
    eventSource: 'cmp_github_callback',
  });
  let client_view = {
    ...prevCv,
    automation: gatedCb.automation,
    ...(previewIn
      ? { progress_message: 'Preview environment is ready. Open the site preview link below.' }
      : {}),
  };
  client_view = mergeDeliveryIntegrityIntoClientView(client_view, gatedCb.gate);

  const next = {
    ...prev,
    client_view,
    promotion: {
      ...(prev?.promotion && typeof prev.promotion === 'object' ? prev.promotion : {}),
      updated_at: new Date().toISOString(),
      ticket_id: ticketId,
      branch_name: branchName || (prev?.promotion?.branch_name ?? null),
      base_ref: baseRef || (prev?.promotion?.base_ref ?? null),
      pr_number: Number.isFinite(prNumber) && prNumber > 0 ? prNumber : (prev?.promotion?.pr_number ?? null),
      pr_url: prUrl || (prev?.promotion?.pr_url ?? null),
      last_event: typeof body?.event === 'string' ? body.event.trim() : 'automation_callback',
    },
  };

  await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });

  await recordTrustedAutomationEvent(prisma, {
    tenantId: row.tenantId,
    eventType: 'cmp.github.callback',
    payload: {
      ticket_id: ticketId,
      pr_number: Number.isFinite(prNumber) && prNumber > 0 ? prNumber : null,
      pr_url: prUrl,
      branch_name: branchName,
      base_ref: baseRef,
      preview_url: previewIn,
      event: typeof body?.event === 'string' ? body.event.trim() : 'automation_callback',
    },
    source: 'github_actions',
  });

  return res.status(200).json({ ok: true });
}

async function handlePromoteStatus(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'promote-status');
  if (guard !== true) return guard;

  const ticketId =
    (req.query?.ticket_id != null ? String(req.query.ticket_id).trim() : '') ||
    (req.body?.ticket_id != null ? String(req.body.ticket_id).trim() : '');
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, consoleJson: true, description: true },
  });
  if (!row) return res.status(404).json({ error: 'Ticket not found' });

  const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
  if (scopeTenantId) {
    const rowTid = String(row.tenantId || '').trim();
    if (rowTid !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found', hint: 'This ticket is not in your organization’s workspace.' });
    }
  }

  const cj = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};

  const pr = await fetchCmpPullRequest({ ticketId });
  let next = {
    ...(cj || {}),
    promotion: {
      ...(cj?.promotion && typeof cj.promotion === 'object' ? cj.promotion : {}),
      updated_at: new Date().toISOString(),
      ticket_id: ticketId,
      pr_number: pr.ok ? pr.pr_number ?? null : (cj?.promotion?.pr_number ?? null),
      pr_url: pr.ok ? pr.pr_url ?? null : (cj?.promotion?.pr_url ?? null),
      head_sha: pr.ok ? pr.head_sha ?? null : (cj?.promotion?.head_sha ?? null),
      pr_state: pr.ok ? pr.pr_state ?? null : (cj?.promotion?.pr_state ?? null),
      pr_mergeable: pr.ok ? pr.pr_mergeable ?? null : (cj?.promotion?.pr_mergeable ?? null),
      last_error: pr.ok ? null : pr.error || null,
    },
  };

  const vercelPreview = await fetchVercelPreviewUrlForCmpBranch(ticketId);
  if (vercelPreview.ok && vercelPreview.preview_url) {
    const prevCv = cj.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
    const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
    const autoBase = {
      ...prevAuto,
      preview_url: vercelPreview.preview_url,
      preview_updated_at: new Date().toISOString(),
      preview_source: 'vercel_api',
    };
    const gated = await applyVisualClientPreviewGate(prisma, {
      ticketRow: row,
      automation: autoBase,
      previewUrl: vercelPreview.preview_url,
      eventSource: 'promote_status',
    });
    let cvMerged = {
      ...prevCv,
      automation: gated.automation,
      progress_message:
        prevCv.progress_message ||
        'Preview deployment found for your sandbox branch (Vercel).',
    };
    cvMerged = mergeDeliveryIntegrityIntoClientView(cvMerged, gated.gate);
    next = {
      ...next,
      client_view: cvMerged,
    };
  } else {
    const prevCv = next.client_view && typeof next.client_view === 'object' ? next.client_view : {};
    const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
    const pu = typeof prevAuto.preview_url === 'string' ? prevAuto.preview_url.trim() : '';
    if (pu) {
      const gatedFb = await applyVisualClientPreviewGate(prisma, {
        ticketRow: row,
        automation: { ...prevAuto, updated_at: new Date().toISOString() },
        previewUrl: pu,
        eventSource: 'promote_status_fallback',
      });
      let cvMerged = { ...prevCv, automation: gatedFb.automation };
      cvMerged = mergeDeliveryIntegrityIntoClientView(cvMerged, gatedFb.gate);
      next = {
        ...next,
        client_view: cvMerged,
      };
    }
  }

  // Persist promotion + preview sync, then stamp explicit workflow_state for deterministic client UX.
  {
    const statusRow = await prisma.cmpTicket.findUnique({ where: { id: ticketId }, select: { status: true, stage: true } });
    const st = statusRow?.status != null ? String(statusRow.status) : '';
    const sg = statusRow?.stage != null ? String(statusRow.stage) : '';
    const wf = deriveWorkflowState({ status: st, stage: sg, consoleJson: next });
    const prevCv = next.client_view && typeof next.client_view === 'object' ? next.client_view : {};
    next = {
      ...next,
      client_view: {
        ...prevCv,
        workflow_state: wf,
        workflow_next_action: nextActionForWorkflowState(wf),
      },
    };
  }
  await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });

  const cvOut = next.client_view && typeof next.client_view === 'object' ? next.client_view : {};
  const autoOut = cvOut.automation && typeof cvOut.automation === 'object' ? cvOut.automation : {};
  const clientSitePreviewUrl =
    typeof autoOut.client_site_preview_url === 'string' ? autoOut.client_site_preview_url.trim() : null;
  return res.status(200).json({
    ok: true,
    ticket_id: ticketId,
    promotion: next.promotion,
    vercel_preview: vercelPreview.ok ? { preview_url: vercelPreview.preview_url } : { skipped: vercelPreview.error || true },
    ...(clientSitePreviewUrl ? { client_site_preview_url: clientSitePreviewUrl } : {}),
  });
}

async function handlePromoteMerge(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'promote-merge');
  if (guard !== true) return guard;

  const sess = getSessionFromRequest(req);
  if (!(sess?.ok === true && sess.payload?.typ === 'admin')) {
    return res.status(403).json({ error: 'Admin session required.' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};
  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, consoleJson: true },
  });
  if (!row) return res.status(404).json({ error: 'Ticket not found' });
  const cj = row?.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const cv = cj?.client_view && typeof cj.client_view === 'object' ? cj.client_view : {};
  const lastReview = cv.preview_review && typeof cv.preview_review === 'object' ? cv.preview_review : null;
  const decision = lastReview && typeof lastReview.decision === 'string' ? String(lastReview.decision) : '';
  if (decision !== 'approve') {
    return res.status(409).json({
      error: 'CLIENT_APPROVAL_REQUIRED',
      hint:
        'Client preview approval is required before promoting to production. Ask the client to approve the preview on /change (Preview review), then retry.',
    });
  }

  const pr = await fetchCmpPullRequest({ ticketId });
  if (!pr.ok) return res.status(502).json({ error: 'Failed to resolve PR', detail: pr.error });
  if (!pr.pr_number) return res.status(409).json({ error: 'No open PR found for this ticket yet.' });

  // Repo rules disallow merge commits; squash is the default production promotion path.
  // Explicit state machine: "publishing" is visible during this operator action.
  try {
    const cjPublishing = {
      ...(cj || {}),
      client_view: {
        ...(cv && typeof cv === 'object' ? cv : {}),
        workflow_state: 'publishing',
        workflow_next_action: nextActionForWorkflowState('publishing'),
        progress_message: 'Publishing to production (operator merge)…',
      },
    };
    await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: cjPublishing } });
  } catch (_) {}

  const merged = await mergeCmpPullRequest({ prNumber: pr.pr_number, mergeMethod: 'squash' });
  if (!merged.ok) return res.status(502).json({ error: 'Merge failed', detail: merged.error });

  const urls = getRequiredRealityUrls(cj, row.tenantId);
  const rgResult = await runRealityGateFetch(urls);

  /** @type {Record<string, unknown>} */
  let next = {
    ...(cj || {}),
    client_view: {
      ...(cv && typeof cv === 'object' ? cv : {}),
      workflow_state: 'published',
      workflow_next_action: nextActionForWorkflowState('published'),
      progress_message: 'Published to production.',
    },
    promotion: {
      ...(cj?.promotion && typeof cj.promotion === 'object' ? cj.promotion : {}),
      updated_at: new Date().toISOString(),
      ticket_id: ticketId,
      pr_number: pr.pr_number,
      pr_url: pr.pr_url || null,
      merged: true,
      merged_at: new Date().toISOString(),
    },
  };
  next = mergeRealityGateIntoConsoleJson(next, urls, rgResult);
  if (!rgResult.all_ok) {
    const prevCv = next.client_view && typeof next.client_view === 'object' ? next.client_view : {};
    next = {
      ...next,
      client_view: {
        ...prevCv,
        workflow_state: 'not_delivered',
        workflow_next_action: nextActionForWorkflowState('not_delivered'),
        progress_message:
          'Git merge succeeded but Reality Gate failed: client production URL(s) did not return a usable 200. Fix deploy/routing, then re-run Reality Gate.',
      },
    };
    try {
      await recordTrustedAutomationEvent(prisma, {
        tenantId: row.tenantId,
        eventType: 'delivery_failure_real_world',
        idempotencyKey: `dfw:promote:${ticketId}:${Math.floor(Date.now() / 600000)}`,
        payload: { ticket_id: ticketId, context: 'post_promote_merge', checks: rgResult.checks, required_urls: urls },
        source: 'api/cmp/router.js:promote-merge',
      });
    } catch (_) {
      /* non-blocking */
    }
  }

  await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });
  return res.status(200).json({
    ok: true,
    reality_gate_ok: rgResult.all_ok,
    ticket_id: ticketId,
    pr_number: pr.pr_number,
    pr_url: pr.pr_url || null,
  });
}

/**
 * POST `action=preview-review` — tenant-safe client acceptance / change request after preview.
 *
 * Body:
 * - ticket_id (required)
 * - decision: 'approve' | 'request_changes' (required)
 * - message (optional) — required when decision=request_changes
 */
async function handlePreviewReview(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const guard = requireDormantGate(req, res, 'preview-review');
  if (guard !== true) return guard;

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const body = parsed.body || {};

  const ticketId = body?.ticket_id != null ? String(body.ticket_id).trim() : '';
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const decisionRaw = body?.decision != null ? String(body.decision).trim().toLowerCase() : '';
  const decision =
    decisionRaw === 'approve'
      ? 'approve'
      : decisionRaw === 'request_changes' || decisionRaw === 'request-changes' || decisionRaw === 'changes'
        ? 'request_changes'
        : '';
  if (!decision) {
    return res.status(400).json({ error: 'decision is required (approve | request_changes)' });
  }

  const message =
    body?.message != null
      ? String(body.message).trim()
      : body?.note != null
        ? String(body.note).trim()
        : '';
  if (decision === 'request_changes' && !message) {
    return res.status(400).json({ error: 'message is required when decision=request_changes' });
  }

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  const row = await prisma.cmpTicket.findUnique({
    where: { id: ticketId },
    select: { id: true, tenantId: true, consoleJson: true },
  });
  if (!row) return res.status(404).json({ error: 'Ticket not found' });

  const scopeTenantId = resolveTenantIdForScopedTicketRead(req);
  if (scopeTenantId) {
    const rowTid = String(row.tenantId || '').trim();
    if (rowTid !== scopeTenantId) {
      return res.status(404).json({ error: 'Ticket not found', hint: 'This ticket is not in your organization’s workspace.' });
    }
  }

  const prev = row.consoleJson && typeof row.consoleJson === 'object' ? row.consoleJson : {};
  const prevCv = prev?.client_view && typeof prev.client_view === 'object' ? prev.client_view : {};
  const prevAuto = prevCv.automation && typeof prevCv.automation === 'object' ? prevCv.automation : {};
  const previewUrl = typeof prevAuto.preview_url === 'string' ? prevAuto.preview_url.trim() : '';
  if (!previewUrl) {
    return res.status(409).json({
      error: 'PREVIEW_NOT_AVAILABLE',
      hint: 'No preview URL is attached to this ticket yet. Wait for preview, then try again.',
    });
  }

  const nowIso = new Date().toISOString();
  const entry = {
    decided_at: nowIso,
    decision,
    message: message || null,
    preview_url: previewUrl,
    by: 'client',
  };

  const prevReviews = Array.isArray(prevCv.preview_reviews) ? prevCv.preview_reviews : [];
  const preview_reviews = [...prevReviews, entry].slice(-25);

  // Business semantics: client approval is recorded; merge remains operator-gated.
  const nextState = decision === 'approve' ? 'client_approved' : 'changes_requested';
  const client_view = {
    ...prevCv,
    preview_reviews,
    preview_review: entry,
    progress_message:
      decision === 'approve'
        ? 'Client approved the preview.'
        : 'Client requested changes on the preview.',
    workflow_state: nextState,
    workflow_next_action: nextActionForWorkflowState(nextState),
  };

  const next = { ...prev, client_view };
  await prisma.cmpTicket.update({ where: { id: ticketId }, data: { consoleJson: next } });

  await recordTrustedAutomationEvent(prisma, {
    tenantId: row.tenantId,
    eventType: decision === 'approve' ? 'cmp.preview.approved' : 'cmp.preview.changes_requested',
    payload: {
      ticket_id: ticketId,
      decision,
      message: message || null,
      preview_url: previewUrl,
      decided_at: nowIso,
    },
    source: 'cmp.preview-review',
  });

  // Optional: mark the GitHub PR as client-approved so automation can rely on GitHub state.
  // Best-effort only; never block client review writes.
  if (decision === 'approve') {
    try {
      const pr = await fetchCmpPullRequest({ ticketId });
      if (pr.ok && pr.pr_number) {
        await addLabelsToCmpPullRequest({ prNumber: pr.pr_number, labels: ['client-approved'] });
      }
    } catch (_) {
      /* non-fatal */
    }
  }

  return res.status(200).json({ ok: true, ticket_id: ticketId, decision, decided_at: nowIso });
}

export default async function handler(req, res) {
  const action = resolveAction(req);
  if (!action) {
    return res.status(400).json({ error: 'Missing action', usage: 'GET/POST /api/cmp/<action> (see vercel rewrites)' });
  }

  const hostSessConflict = getTenantHostSessionConflict(req);
  if (hostSessConflict && TENANT_LOGIN_SESSION_CMP_ACTIONS.has(action)) {
    return res.status(403).json({
      error: 'TENANT_HOST_SESSION_MISMATCH',
      host_tenant_id: hostSessConflict.host_tenant_id,
      session_tenant_id: hostSessConflict.session_tenant_id,
      hint:
        'You are still signed in to a different client workspace. Open /login, click Logout, then sign in again on this hostname.',
    });
  }

  switch (action) {
    case 'ticket-create':
      return handleTicketCreate(req, res);
    case 'ticket-get':
      return handleTicketGet(req, res);
    case 'reality-gate-run':
      return handleRealityGateRun(req, res);
    case 'technical-lead-latest':
      return handleTechnicalLeadLatest(req, res);
    case 'ticket-activity':
      return handleTicketActivity(req, res);
    case 'assist-request':
      return handleAssistRequest(req, res);
    case 'ticket-list':
      return handleTicketList(req, res);
    case 'ticket-operator-queue':
      return handleTicketOperatorQueue(req, res);
    case 'session-verify':
      return handleSessionVerify(req, res);
    case 'tenant-session-bootstrap':
      return handleTenantSessionBootstrap(req, res);
    case 'provision-tenant-pin':
      return handleProvisionTenantPin(req, res);
    case 'tenant-onboard':
      return handleTenantOnboard(req, res);
    case 'tenant-hostname-upsert':
      return handleTenantHostnameUpsert(req, res);
    case 'tenant-log-stream':
      return handleTenantLogStream(req, res);
    case 'signoff':
      return handleSignoff(req, res);
    case 'approve-build':
      return handleApproveBuild(req, res);
    case 'costing-preview':
      return handleCostingPreview(req, res);
    case 'ai-interview':
      return handleAiInterview(req, res);
    case 'change-chat':
      return handleChangeChat(req, res);
    case 'change-chat-commit-draft':
      return handleChangeChatCommitDraft(req, res);
    case 'client-decisions-get':
      return handleClientDecisionsGet(req, res);
    case 'submit-client-decisions':
      return handleSubmitClientDecisions(req, res);
    case 'sandbox-start':
      return handleSandboxStart(req, res);
    case 'overseer':
      return handleOverseer(req, res);
    case 'overseer-sweep':
      return handleOverseerSweep(req, res);
    case 'overseer-sweep-cron':
      return handleOverseerSweepCron(req, res);
    case 'stuck-self-repair-cron':
      return handleStuckSelfRepairCron(req, res);
    case 'stuck-self-repair-sweep':
      return handleStuckSelfRepairSweep(req, res);
    case 'automation-callback':
      return handleAutomationCallback(req, res);
    case 'promote-status':
      return handlePromoteStatus(req, res);
    case 'promote-merge':
      return handlePromoteMerge(req, res);
    case 'preview-review':
      return handlePreviewReview(req, res);
    case 'evolution-request':
      return handleEvolutionRequest(req, res);
    case 'market-research':
      return handleMarketResearch(req, res);
    case 'supplier-onboard':
      return handleSupplierOnboard(req, res);
    case 'rigor-client-ack':
      return handleRigorClientAck(req, res);
    case 'admin-toggle-clusters':
      return handleAdminToggleClusters(req, res);
    default:
      return res.status(404).json({ error: 'Unknown action', action });
  }
}

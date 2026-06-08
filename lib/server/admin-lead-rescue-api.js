/**
 * Factory-admin API for AI Lead Rescue operator cockpit.
 *
 * Routes (via factory_router pathSeg):
 *   GET   factory/lead-rescue/list
 *   GET   factory/lead-rescue/get?id=
 *   PATCH factory/lead-rescue/patch
 *
 * Response shapes (stable contract — see node-tests/admin-lead-rescue-list-api.test.mjs):
 *   list success: { ok: true,  product, count, filters, leads: [...] }
 *   list failure: { ok: false, error: 'CODE', message: '...', http_status }
 *   get  success: { ok: true,  lead: {...} }
 *   get  failure: { ok: false, error: 'CODE', message: '...', http_status }
 *   patch success/failure: same envelope as get.
 */

import { PrismaClient } from '@prisma/client';

import {
  AI_LEAD_RESCUE_PRODUCT,
  aiLeadRescueActorLabelFromPayload,
  appendAiLeadRescueActivity,
  isAiLeadRescueLead,
  isAiLeadRescueSetupStatus,
  leadRowToAiLeadRescueDetail,
  leadRowToAiLeadRescueListItem,
  mergeAiLeadRescueChecklistItemPatch,
  mergeAiLeadRescueOperatorPatch,
  normalizeAiLeadRescueStatus,
} from '../cmp/_lib/ai-lead-rescue-operator.js';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { getSessionFromRequest } from './session.js';

const prisma = new PrismaClient();

// Eagerly initiate the Prisma engine connection at module load so the first
// query after a Vercel serverless cold-start does not race the engine startup
// (the 2026-06-07 P0 signature: `Engine is not yet connected` /
// `Response from the Engine was empty` — see PR #325). Failures here are
// intentionally logged and swallowed: a real connection problem will resurface
// on the first query and be returned to the caller through the standard
// `LEAD_RESCUE_*_FAILED` error envelope. Logging to stderr keeps the signal
// visible in Vercel function logs without altering the API response shape.
prisma.$connect().catch((e) => {
  const msg = e && typeof e === 'object' && 'message' in e ? String(e.message) : String(e);
  // eslint-disable-next-line no-console
  console.warn('[admin-lead-rescue] Prisma eager $connect failed at module load:', msg);
});

/** Maximum recent leads to scan when listing AI Lead Rescue rows (defensive cap). */
const LIST_SCAN_LIMIT = 500;

/**
 * Backoff before each cold-start retry.
 *
 * 2026-06-08 (PR #326): widened from 250 ms (PR #325) to 1500 ms. The 250 ms
 * window was empirically too tight against Neon scale-to-zero wake-up on a
 * fresh Vercel function instance — the retry was racing the same cold engine
 * and failing identically. 1500 ms covers the worst observed wake-up window
 * without producing visible UI latency in the healthy path (only the cold-
 * start path pays this cost; warm requests still complete in tens of ms).
 *
 * @type {number}
 */
export const COLD_START_RETRY_INITIAL_DELAY_MS = 1500;

/**
 * Number of retries allowed after the first attempt (i.e. up to
 * `COLD_START_RETRY_MAX_RETRIES + 1` total attempts).
 *
 * 2026-06-08 (PR #326): increased from 1 to 2. Tracks the observed reality
 * that a single retry can still race the cold engine when both the engine
 * spawn AND the Neon wake-up are happening concurrently. Bounded explicitly
 * so this remains a tactical cold-start guard, not a general-purpose retry
 * loop (the strategic fix is the Neon driver adapter migration tracked in
 * PR #327).
 *
 * @type {number}
 */
export const COLD_START_RETRY_MAX_RETRIES = 2;

/**
 * Detect transient Prisma cold-start failures specific to Vercel serverless on
 * Prisma 6.x. Two error messages share the same root cause class — a
 * first-query race against the query engine's connect lifecycle:
 *
 *   - `Engine is not yet connected` — engine spawn started, `$connect()` has
 *     not yet completed, the query was fired anyway.
 *   - `Response from the Engine was empty` — engine accepted the query, ran
 *     it against Neon (the DB row IS updated), but the response stream back
 *     to the Node.js process was truncated/lost mid-flight.
 *
 * Both are recoverable by a brief wait + retry once the connection has
 * settled. We deliberately do NOT retry on any other Prisma error —
 * validation, constraint, and `Can't reach database server` failures are
 * real problems and must surface to the caller unchanged.
 *
 * @param {unknown} err
 * @returns {boolean}
 */
export function isTransientPrismaColdStartError(err) {
  if (!err) return false;
  const msg =
    typeof err === 'object' && err !== null && 'message' in err
      ? String(/** @type {{message?: unknown}} */ (err).message || '')
      : String(err);
  return (
    msg.includes('Engine is not yet connected') ||
    msg.includes('Response from the Engine was empty')
  );
}

/**
 * Bounded-retry wrapper for Prisma operations that may fail with the
 * documented Vercel cold-start race. Retries at most `COLD_START_RETRY_MAX_RETRIES`
 * times after the first attempt, with a FIXED `delayMs` backoff between
 * attempts (constant; not multiplied per attempt) and a `db.$connect()` call
 * before each retry (when the client exposes it). The retry budget is
 * bounded by the constant — no unbounded loop. A healthy production sees at
 * most a one-call retry cost on the first request after a function cold-start.
 *
 * Non-transient errors propagate immediately — the retry must NEVER paper
 * over validation / constraint / connectivity failures.
 *
 * @template T
 * @param {{ $connect?: () => Promise<void> } | null | undefined} db
 * @param {() => Promise<T>} operation
 * @param {{ delayMs?: number, maxRetries?: number }} [opts]
 * @returns {Promise<T>}
 */
export async function withPrismaColdStartRetry(db, operation, opts = {}) {
  const delayMs =
    typeof opts.delayMs === 'number' && opts.delayMs >= 0
      ? opts.delayMs
      : COLD_START_RETRY_INITIAL_DELAY_MS;
  const maxRetries =
    typeof opts.maxRetries === 'number' && opts.maxRetries >= 0
      ? opts.maxRetries
      : COLD_START_RETRY_MAX_RETRIES;

  let lastErr = null;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      return await operation();
    } catch (err) {
      if (!isTransientPrismaColdStartError(err)) throw err;
      lastErr = err;
      if (attempt === maxRetries) break;
      if (db && typeof db.$connect === 'function') {
        try {
          await db.$connect();
        } catch {
          // Swallow — the next operation attempt will surface a meaningful error.
        }
      }
      if (delayMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  throw lastErr;
}

function str(v) {
  return v != null ? String(v).trim() : '';
}

function firstQuery(query, key) {
  if (!query || typeof query !== 'object') return '';
  const v = query[key];
  if (Array.isArray(v)) return str(v[0]);
  return str(v);
}

function parseJsonBody(req) {
  const body = req.body;
  if (body && typeof body === 'object') return { ok: true, body };
  return { ok: false, error: 'Missing JSON body' };
}

/**
 * @param {string} pathSeg
 */
function leadRescueSubRoute(pathSeg) {
  const prefix = 'factory/lead-rescue';
  if (pathSeg === prefix) return '';
  if (pathSeg.startsWith(`${prefix}/`)) return pathSeg.slice(prefix.length + 1);
  return null;
}

/**
 * @param {{ status?: string|null, region?: string|null, payment_status?: string|null, q?: string|null }} input
 */
export function normalizeListFilters(input) {
  const f = input && typeof input === 'object' ? input : {};
  return {
    status: typeof f.status === 'string' ? f.status.trim() : '',
    region: typeof f.region === 'string' ? f.region.trim() : '',
    payment_status: typeof f.payment_status === 'string' ? f.payment_status.trim() : '',
    q: typeof f.q === 'string' ? f.q.trim() : '',
  };
}

/**
 * @param {import('@prisma/client').Lead} row
 * @param {{ status?: string, region?: string, payment_status?: string, q?: string }} filters
 */
function matchesListFilters(row, filters) {
  const item = leadRowToAiLeadRescueListItem(row);
  if (filters.status && item.status !== filters.status) return false;
  if (filters.region) {
    const r = (item.region_path || 'not_selected').toLowerCase();
    if (r !== filters.region.toLowerCase()) return false;
  }
  if (filters.payment_status) {
    const ps = (item.payment_status || 'none').toLowerCase();
    if (ps !== filters.payment_status.toLowerCase()) return false;
  }
  if (filters.q) {
    const hay = [item.business_name, item.contact_name, item.email, item.phone, item.lead_sources]
      .join(' ')
      .toLowerCase();
    if (!hay.includes(filters.q.toLowerCase())) return false;
  }
  return true;
}

/**
 * Build a list-API success payload from already-fetched lead rows.
 * Pure (no I/O); easy to unit-test.
 *
 * @param {import('@prisma/client').Lead[]} rows
 * @param {{ status?: string, region?: string, payment_status?: string, q?: string }} filters
 * @returns {{
 *   ok: true,
 *   product: string,
 *   count: number,
 *   filters: { status: string, region: string, payment_status: string, q: string },
 *   leads: ReturnType<typeof leadRowToAiLeadRescueListItem>[],
 * }}
 */
export function buildAiLeadRescueListPayload(rows, filters) {
  const norm = normalizeListFilters(filters);
  const safeRows = Array.isArray(rows) ? rows : [];
  // Filter in JavaScript instead of via Prisma's JSON-path SQL filter.
  // The SQL JSON-path filter is fragile across providers (Neon / Prisma combinations) and was
  // the primary suspect for the production "Loading…" hang reported on 2026-06-06; doing the
  // shape check here is bullet-proof and bounded by LIST_SCAN_LIMIT.
  const aiRows = safeRows.filter((row) => isAiLeadRescueLead(row.qualificationJson));
  const filtered = aiRows.filter((row) => matchesListFilters(row, norm));
  const leads = filtered.map((row) => leadRowToAiLeadRescueListItem(row));
  return {
    ok: true,
    product: AI_LEAD_RESCUE_PRODUCT,
    count: leads.length,
    filters: norm,
    leads,
  };
}

/**
 * Server-side loader usable from API handlers and Next.js getServerSideProps.
 * Always returns a serializable envelope.
 *
 * @param {{
 *   filters?: object,
 *   prismaClient?: import('@prisma/client').PrismaClient,
 *   retryOpts?: { delayMs?: number, maxRetries?: number },
 * }} [args]
 * @returns {Promise<
 *   | ReturnType<typeof buildAiLeadRescueListPayload>
 *   | { ok: false, error: string, message: string, http_status: number }
 * >}
 */
export async function loadAiLeadRescueListData(args = {}) {
  const filters = normalizeListFilters(args.filters || {});
  const db = args.prismaClient || prisma;
  const retryOpts = args.retryOpts || undefined;
  try {
    const rows = await withPrismaColdStartRetry(
      db,
      () =>
        db.lead.findMany({
          orderBy: { createdAt: 'desc' },
          take: LIST_SCAN_LIMIT,
        }),
      retryOpts,
    );
    return buildAiLeadRescueListPayload(rows, filters);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: 'LEAD_RESCUE_LIST_FAILED',
      message,
      http_status: 500,
    };
  }
}

/**
 * Server-side loader for a single AI Lead Rescue detail row.
 * Usable from the HTTP handler and from Next.js getServerSideProps.
 * Always returns a serializable envelope.
 *
 * @param {{
 *   id?: string | null,
 *   prismaClient?: import('@prisma/client').PrismaClient,
 *   retryOpts?: { delayMs?: number, maxRetries?: number },
 * }} args
 * @returns {Promise<
 *   | { ok: true, lead: ReturnType<typeof leadRowToAiLeadRescueDetail> }
 *   | { ok: false, error: string, message: string, http_status: number }
 * >}
 */
export async function loadAiLeadRescueDetailData(args = {}) {
  const id = args && typeof args.id === 'string' ? args.id.trim() : '';
  if (!id) {
    return {
      ok: false,
      error: 'ID_REQUIRED',
      message: 'Lead id is required.',
      http_status: 400,
    };
  }
  const db = args.prismaClient || prisma;
  const retryOpts = args.retryOpts || undefined;
  try {
    const row = await withPrismaColdStartRetry(
      db,
      () => db.lead.findUnique({ where: { id } }),
      retryOpts,
    );
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return {
        ok: false,
        error: 'LEAD_NOT_FOUND',
        message: 'No AI Lead Rescue lead with that id.',
        http_status: 404,
      };
    }
    return { ok: true, lead: leadRowToAiLeadRescueDetail(row) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: 'LEAD_RESCUE_GET_FAILED',
      message,
      http_status: 500,
    };
  }
}

function setCommonHeaders(res) {
  res.setHeader('Cache-Control', 'no-store');
}

async function handleList(req, res) {
  setCommonHeaders(res);
  const filters = {
    status: firstQuery(req.query, 'status'),
    region: firstQuery(req.query, 'region'),
    payment_status: firstQuery(req.query, 'payment_status'),
    q: firstQuery(req.query, 'q'),
  };
  const result = await loadAiLeadRescueListData({ filters });
  if (!result.ok) {
    return res.status(result.http_status || 500).json(result);
  }
  return res.status(200).json(result);
}

async function handleGet(req, res) {
  setCommonHeaders(res);
  const id = firstQuery(req.query, 'id');
  const result = await loadAiLeadRescueDetailData({ id });
  if (!result.ok) {
    return res.status(result.http_status || 500).json(result);
  }
  return res.status(200).json(result);
}

/**
 * Apply an AI Lead Rescue operator patch. Pure I/O coordinator usable from the
 * HTTP handler and from tests with a mock Prisma. Returns a stable envelope.
 *
 * @param {{
 *   body?: unknown,
 *   actorLabel?: string | null,
 *   prismaClient?: import('@prisma/client').PrismaClient,
 *   nowIso?: string,
 *   retryOpts?: { delayMs?: number, maxRetries?: number },
 * }} args
 * @returns {Promise<
 *   | { ok: true, http_status: 200, lead: ReturnType<typeof leadRowToAiLeadRescueDetail> }
 *   | { ok: false, error: string, message: string, http_status: number }
 * >}
 */
export async function applyAiLeadRescuePatch(args = {}) {
  const b = args.body && typeof args.body === 'object' ? args.body : null;
  if (!b) {
    return {
      ok: false,
      error: 'BODY_REQUIRED',
      message: 'JSON body is required.',
      http_status: 400,
    };
  }

  const leadId = str(b.id || b.lead_id);
  if (!leadId) {
    return {
      ok: false,
      error: 'ID_REQUIRED',
      message: 'id (or lead_id) is required.',
      http_status: 400,
    };
  }

  const hasStatus = b.status !== undefined && str(b.status);
  const hasOps =
    b.next_action !== undefined ||
    b.owner !== undefined ||
    b.last_contacted !== undefined ||
    b.notes !== undefined ||
    b.note_append !== undefined;
  const hasCommercial =
    b.setup_price !== undefined ||
    b.monthly_monitoring_price !== undefined ||
    b.currency !== undefined ||
    b.payment_route !== undefined ||
    b.payment_status !== undefined ||
    b.invoice_reference !== undefined ||
    b.payment_notes !== undefined;
  const hasChecklistItem =
    b.setup_checklist_item != null && typeof b.setup_checklist_item === 'object';
  const hasActivityAppend =
    b.activity_append != null && typeof b.activity_append === 'object';

  if (!hasStatus && !hasOps && !hasCommercial && !hasChecklistItem && !hasActivityAppend) {
    return {
      ok: false,
      error: 'NO_UPDATES',
      message:
        'Provide status, commercial/operations fields, setup_checklist_item, or activity_append.',
      http_status: 400,
    };
  }

  if (hasStatus && !normalizeAiLeadRescueStatus(b.status)) {
    return {
      ok: false,
      error: 'INVALID_STATUS',
      message: 'status is not a valid AI Lead Rescue status value.',
      http_status: 400,
    };
  }

  const db = args.prismaClient || prisma;
  const actorLabel = str(args.actorLabel) || 'unknown';
  const nowIso = typeof args.nowIso === 'string' && args.nowIso ? args.nowIso : new Date().toISOString();
  const retryOpts = args.retryOpts || undefined;

  try {
    const row = await withPrismaColdStartRetry(
      db,
      () =>
        db.lead.findUnique({
          where: { id: leadId },
          select: { id: true, status: true, qualificationJson: true },
        }),
      retryOpts,
    );
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return {
        ok: false,
        error: 'LEAD_NOT_FOUND',
        message: 'No AI Lead Rescue lead with that id.',
        http_status: 404,
      };
    }

    const qjPrev =
      row.qualificationJson && typeof row.qualificationJson === 'object' ? row.qualificationJson : {};
    let merged = mergeAiLeadRescueOperatorPatch(
      qjPrev,
      {
        setup_price: b.setup_price,
        monthly_monitoring_price: b.monthly_monitoring_price,
        currency: b.currency,
        payment_route: b.payment_route,
        payment_status: b.payment_status,
        invoice_reference: b.invoice_reference,
        payment_notes: b.payment_notes,
        next_action: b.next_action,
        owner: b.owner,
        last_contacted: b.last_contacted,
        notes: b.notes,
        note_append: b.note_append,
      },
      actorLabel,
      nowIso,
    );

    if (hasChecklistItem) {
      const effectiveStatus = hasStatus ? normalizeAiLeadRescueStatus(b.status) : row.status;
      if (!isAiLeadRescueSetupStatus(effectiveStatus)) {
        return {
          ok: false,
          error: 'CHECKLIST_NOT_ELIGIBLE',
          message: 'Setup checklist is only available once status reaches PAID_SETUP.',
          http_status: 400,
        };
      }
      const checklistResult = mergeAiLeadRescueChecklistItemPatch(
        merged,
        b.setup_checklist_item,
        actorLabel,
        nowIso,
      );
      if (!checklistResult.ok) {
        return {
          ok: false,
          error: checklistResult.error,
          message: `Checklist item rejected: ${checklistResult.error}`,
          http_status: 400,
        };
      }
      merged = checklistResult.qj;
    }

    if (hasActivityAppend) {
      const activityResult = appendAiLeadRescueActivity(
        merged,
        b.activity_append,
        actorLabel,
        nowIso,
      );
      if (!activityResult.ok) {
        return {
          ok: false,
          error: activityResult.error,
          message: `Activity entry rejected: ${activityResult.error}`,
          http_status: 400,
        };
      }
      merged = activityResult.qj;
    }

    /** @type {import('@prisma/client').Prisma.LeadUpdateInput} */
    const data = { qualificationJson: merged };
    if (hasStatus) {
      data.status = normalizeAiLeadRescueStatus(b.status);
    }

    const saved = await withPrismaColdStartRetry(
      db,
      () => db.lead.update({ where: { id: leadId }, data }),
      retryOpts,
    );
    return { ok: true, http_status: 200, lead: leadRowToAiLeadRescueDetail(saved) };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: 'LEAD_RESCUE_PATCH_FAILED',
      message,
      http_status: 500,
    };
  }
}

async function handlePatch(req, res) {
  setCommonHeaders(res);
  const parsed = parseJsonBody(req);
  if (!parsed.ok) {
    return res.status(400).json({
      ok: false,
      error: 'BODY_REQUIRED',
      message: parsed.error,
      http_status: 400,
    });
  }
  const sess = getSessionFromRequest(req);
  const actorLabel = aiLeadRescueActorLabelFromPayload(sess?.payload || null);
  const result = await applyAiLeadRescuePatch({ body: parsed.body, actorLabel });
  if (!result.ok) {
    return res.status(result.http_status || 500).json(result);
  }
  const { http_status, ...payload } = result;
  return res.status(http_status || 200).json(payload);
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathSeg
 */
export async function adminLeadRescueHandler(req, res, pathSeg) {
  if (!verifyFactoryMasterAuth(req)) {
    setCommonHeaders(res);
    return res.status(403).json({
      ok: false,
      error: 'FACTORY_AUTH_REQUIRED',
      message: 'Factory master authentication required.',
      http_status: 403,
    });
  }

  const route = leadRescueSubRoute(pathSeg);
  if (route === null) {
    setCommonHeaders(res);
    return res.status(404).json({
      ok: false,
      error: 'UNKNOWN_ROUTE',
      message: 'Unknown lead-rescue route.',
      http_status: 404,
    });
  }

  // 2026-06-08 (PR #327): the handler intentionally has no per-request
  // teardown of the Prisma engine. The previous version closed the engine
  // in a `finally` block after every request, which killed the warm engine
  // started by the module-level eager `$connect()` and forced every
  // subsequent request on the same Vercel function instance to re-spawn it
  // from cold (signature: "Engine is not yet connected"). In Vercel
  // serverless the function instance outlives any single request, so we
  // keep the engine connected for the instance lifetime — Vercel itself
  // reaps idle instances on its own schedule. This is the canonical Vercel
  // + Prisma pattern and is the root cause of the 2026-06-07 / 2026-06-08
  // P0 the retry budgets in PR #325 and PR #326 were trying (and failing)
  // to outrun. Pinned by `does NOT call ... in the request handler` in
  // `node-tests/admin-lead-rescue-cold-start-retry.test.mjs`.
  if (route === 'list') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({
        ok: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed.',
        http_status: 405,
      });
    }
    return handleList(req, res);
  }
  if (route === 'get') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({
        ok: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed.',
        http_status: 405,
      });
    }
    return handleGet(req, res);
  }
  if (route === 'patch') {
    if (req.method !== 'PATCH' && req.method !== 'POST') {
      res.setHeader('Allow', 'PATCH, POST');
      return res.status(405).json({
        ok: false,
        error: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed.',
        http_status: 405,
      });
    }
    return handlePatch(req, res);
  }

  setCommonHeaders(res);
  return res.status(404).json({
    ok: false,
    error: 'UNKNOWN_ROUTE',
    message: `Unknown lead-rescue route: ${route}`,
    http_status: 404,
  });
}

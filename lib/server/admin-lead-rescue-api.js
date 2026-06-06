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

/** Maximum recent leads to scan when listing AI Lead Rescue rows (defensive cap). */
const LIST_SCAN_LIMIT = 500;

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
 * @param {{ filters?: object, prismaClient?: import('@prisma/client').PrismaClient }} [args]
 * @returns {Promise<
 *   | ReturnType<typeof buildAiLeadRescueListPayload>
 *   | { ok: false, error: string, message: string, http_status: number }
 * >}
 */
export async function loadAiLeadRescueListData(args = {}) {
  const filters = normalizeListFilters(args.filters || {});
  const db = args.prismaClient || prisma;
  try {
    const rows = await db.lead.findMany({
      orderBy: { createdAt: 'desc' },
      take: LIST_SCAN_LIMIT,
    });
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
  if (!id) {
    return res.status(400).json({
      ok: false,
      error: 'ID_REQUIRED',
      message: 'Query parameter "id" is required.',
      http_status: 400,
    });
  }

  try {
    const row = await prisma.lead.findUnique({ where: { id } });
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return res.status(404).json({
        ok: false,
        error: 'LEAD_NOT_FOUND',
        message: 'No AI Lead Rescue lead with that id.',
        http_status: 404,
      });
    }
    return res.status(200).json({ ok: true, lead: leadRowToAiLeadRescueDetail(row) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      error: 'LEAD_RESCUE_GET_FAILED',
      message,
      http_status: 500,
    });
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
  const b = parsed.body;

  const leadId = str(b.id || b.lead_id);
  if (!leadId) {
    return res.status(400).json({
      ok: false,
      error: 'ID_REQUIRED',
      message: 'id (or lead_id) is required.',
      http_status: 400,
    });
  }

  const sess = getSessionFromRequest(req);
  const actorLabel = aiLeadRescueActorLabelFromPayload(sess?.payload || null);
  const nowIso = new Date().toISOString();

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

  if (!hasStatus && !hasOps && !hasCommercial && !hasChecklistItem) {
    return res.status(400).json({
      ok: false,
      error: 'NO_UPDATES',
      message: 'Provide status, commercial/operations fields, or setup_checklist_item.',
      http_status: 400,
    });
  }

  if (hasStatus && !normalizeAiLeadRescueStatus(b.status)) {
    return res.status(400).json({
      ok: false,
      error: 'INVALID_STATUS',
      message: 'status is not a valid AI Lead Rescue status value.',
      http_status: 400,
    });
  }

  try {
    const row = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true, qualificationJson: true },
    });
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return res.status(404).json({
        ok: false,
        error: 'LEAD_NOT_FOUND',
        message: 'No AI Lead Rescue lead with that id.',
        http_status: 404,
      });
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
        return res.status(400).json({
          ok: false,
          error: 'CHECKLIST_NOT_ELIGIBLE',
          message: 'Setup checklist is only available once status reaches PAID_SETUP.',
          http_status: 400,
        });
      }
      const checklistResult = mergeAiLeadRescueChecklistItemPatch(
        merged,
        b.setup_checklist_item,
        actorLabel,
        nowIso,
      );
      if (!checklistResult.ok) {
        return res.status(400).json({
          ok: false,
          error: checklistResult.error,
          message: `Checklist item rejected: ${checklistResult.error}`,
          http_status: 400,
        });
      }
      merged = checklistResult.qj;
    }

    /** @type {import('@prisma/client').Prisma.LeadUpdateInput} */
    const data = { qualificationJson: merged };
    if (hasStatus) {
      data.status = normalizeAiLeadRescueStatus(b.status);
    }

    const saved = await prisma.lead.update({
      where: { id: leadId },
      data,
    });

    return res.status(200).json({ ok: true, lead: leadRowToAiLeadRescueDetail(saved) });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({
      ok: false,
      error: 'LEAD_RESCUE_PATCH_FAILED',
      message,
      http_status: 500,
    });
  }
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

  try {
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
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

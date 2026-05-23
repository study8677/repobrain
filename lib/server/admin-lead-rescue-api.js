/**
 * Factory-admin API for AI Lead Rescue operator cockpit.
 *
 * Routes (via factory_router pathSeg):
 *   GET   factory/lead-rescue/list
 *   GET   factory/lead-rescue/get?id=
 *   PATCH factory/lead-rescue/patch
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

async function handleList(req, res) {
  const statusFilter = firstQuery(req.query, 'status');
  const regionFilter = firstQuery(req.query, 'region');
  const paymentStatusFilter = firstQuery(req.query, 'payment_status');
  const q = firstQuery(req.query, 'q');

  try {
    const rows = await prisma.lead.findMany({
      where: {
        qualificationJson: {
          path: ['intake_meta', 'product'],
          equals: AI_LEAD_RESCUE_PRODUCT,
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    const filters = {
      status: statusFilter || '',
      region: regionFilter || '',
      payment_status: paymentStatusFilter || '',
      q: q || '',
    };

    const filtered = rows.filter((row) => matchesListFilters(row, filters));
    const leads = filtered.map((row) => leadRowToAiLeadRescueListItem(row));

    return res.status(200).json({
      ok: true,
      product: AI_LEAD_RESCUE_PRODUCT,
      count: leads.length,
      filters,
      leads,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'LEAD_RESCUE_LIST_FAILED', detail: msg });
  }
}

async function handleGet(req, res) {
  const id = firstQuery(req.query, 'id');
  if (!id) return res.status(400).json({ error: 'id is required' });

  try {
    const row = await prisma.lead.findUnique({ where: { id } });
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
    }
    return res.status(200).json({ ok: true, lead: leadRowToAiLeadRescueDetail(row) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'LEAD_RESCUE_GET_FAILED', detail: msg });
  }
}

async function handlePatch(req, res) {
  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const b = parsed.body;

  const leadId = str(b.id || b.lead_id);
  if (!leadId) return res.status(400).json({ error: 'id is required' });

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
      error: 'NO_UPDATES',
      hint: 'Provide status, commercial/operations fields, or setup_checklist_item.',
    });
  }

  if (hasStatus && !normalizeAiLeadRescueStatus(b.status)) {
    return res.status(400).json({ error: 'INVALID_STATUS' });
  }

  try {
    const row = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, status: true, qualificationJson: true },
    });
    if (!row || !isAiLeadRescueLead(row.qualificationJson)) {
      return res.status(404).json({ error: 'LEAD_NOT_FOUND' });
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
          error: 'CHECKLIST_NOT_ELIGIBLE',
          hint: 'Setup checklist is only available once status reaches PAID_SETUP.',
        });
      }
      const checklistResult = mergeAiLeadRescueChecklistItemPatch(
        merged,
        b.setup_checklist_item,
        actorLabel,
        nowIso,
      );
      if (!checklistResult.ok) {
        return res.status(400).json({ error: checklistResult.error });
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
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'LEAD_RESCUE_PATCH_FAILED', detail: msg });
  }
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @param {string} pathSeg
 */
export async function adminLeadRescueHandler(req, res, pathSeg) {
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master authentication required.' });
  }

  const route = leadRescueSubRoute(pathSeg);
  if (route === null) {
    return res.status(404).json({ error: 'Unknown lead-rescue route' });
  }

  try {
    if (route === 'list') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleList(req, res);
    }
    if (route === 'get') {
      if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handleGet(req, res);
    }
    if (route === 'patch') {
      if (req.method !== 'PATCH' && req.method !== 'POST') {
        res.setHeader('Allow', 'PATCH, POST');
        return res.status(405).json({ error: 'Method not allowed' });
      }
      return handlePatch(req, res);
    }

    return res.status(404).json({ error: 'Unknown lead-rescue route', route });
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

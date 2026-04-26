/**
 * POST /api/factory/cmp/client-decisions-link-mint
 * Factory master (or admin session): mint a one-time client decisions URL for a ticket.
 */

import { PrismaClient } from '@prisma/client';
import { verifyFactoryMasterAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';
import {
  buildNewClientDecisionsAccessRecord,
  CLIENT_DECISIONS_ACCESS_KEY,
  generatePlainClientDecisionsToken,
} from '../cmp/_lib/client-decisions-magic-link.js';
import { ensureClientDecisionsOnConsoleJson } from '../cmp/_lib/client-decisions-client.js';

const prisma = new PrismaClient();

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
  if (typeof base !== 'object' || Array.isArray(base)) return { ok: true, body: {} };
  return { ok: true, body: base };
}

function normalizeConsoleJson(v) {
  if (!v) return { messages: [], brief: {}, locale: 'en' };
  if (typeof v === 'string') {
    try {
      return normalizeConsoleJson(JSON.parse(v));
    } catch {
      return { messages: [], brief: {}, locale: 'en' };
    }
  }
  if (typeof v === 'object' && v !== null) {
    const messages = Array.isArray(v.messages) ? v.messages.slice(0, 200) : [];
    const brief = v.brief && typeof v.brief === 'object' ? v.brief : {};
    const locale = typeof v.locale === 'string' ? v.locale : 'en';
    return { ...v, messages, brief, locale };
  }
  return { messages: [], brief: {}, locale: 'en' };
}

function inferPublicBaseUrl(req) {
  const explicit = String(cfg('CORPFLOW_PUBLIC_BASE_URL', '')).trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  try {
    const proto = String(req.headers['x-forwarded-proto'] || 'https')
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

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 * @returns {Promise<void>}
 */
export default async function handleClientDecisionsLinkMint(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!verifyFactoryMasterAuth(req)) {
    return res.status(403).json({ error: 'Factory master or admin session required.' });
  }

  const parsed = parseJsonBody(req);
  if (!parsed.ok) return res.status(400).json({ error: parsed.error });
  const ticketId = String(parsed.body?.ticket_id || parsed.body?.ticketId || '').trim();
  if (!ticketId) return res.status(400).json({ error: 'ticket_id is required' });

  const pgUrl = String(cfg('POSTGRES_URL', '')).trim();
  if (!pgUrl) return res.status(503).json({ error: 'POSTGRES_URL_MISSING' });

  try {
    const row = await prisma.cmpTicket.findUnique({ where: { id: ticketId } });
    if (!row) return res.status(404).json({ error: 'Ticket not found' });

    const st = String(row.status || '').trim().toLowerCase();
    const sg = String(row.stage || '').trim().toLowerCase();
    if (st !== 'approved' || sg !== 'build') {
      return res.status(409).json({
        error: 'CLIENT_DECISIONS_NOT_READY',
        hint: 'Mint a link only when the ticket is Approved / Build.',
      });
    }

    const norm = normalizeConsoleJson(row.consoleJson);
    const cd = norm.client_decisions && typeof norm.client_decisions === 'object' ? norm.client_decisions : {};
    const items = Array.isArray(cd.items) ? cd.items : [];
    if (!items.length) {
      return res.status(409).json({ error: 'CLIENT_DECISIONS_NOT_CONFIGURED' });
    }

    const plain = generatePlainClientDecisionsToken();
    const { access, expires_at } = buildNewClientDecisionsAccessRecord(plain);
    const merged = ensureClientDecisionsOnConsoleJson({
      ...norm,
      [CLIENT_DECISIONS_ACCESS_KEY]: access,
    });

    await prisma.cmpTicket.update({
      where: { id: ticketId },
      data: {
        consoleJson: merged,
        locale: merged.locale,
        brief: merged?.brief?.summary ? String(merged.brief.summary) : undefined,
      },
    });

    const base = inferPublicBaseUrl(req);
    const path = `/client/change-decisions?id=${encodeURIComponent(ticketId)}&token=${encodeURIComponent(plain)}`;
    const magic_link_url = base ? `${base}${path}` : null;

    return res.status(200).json({
      ok: true,
      ticket_id: ticketId,
      expires_at,
      magic_link_url,
      magic_link_path: path,
      hint: magic_link_url
        ? 'Copy the URL once; it is not stored in plaintext on the server.'
        : 'Set CORPFLOW_PUBLIC_BASE_URL (or open this API from the public host) to receive a full URL; otherwise use magic_link_path with your site origin.',
    });
  } catch (e) {
    return res.status(500).json({ error: 'client-decisions-link-mint failed', detail: String(e?.message || e) });
  }
}

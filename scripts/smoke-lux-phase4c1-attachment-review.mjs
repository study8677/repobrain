#!/usr/bin/env node
/**
 * Phase 4C.1 + 4C.3 + 4D.1 + 4D.2 + 4D.5 + 5A + 5B + 5C live verification — Lux operator media review + property publish + gallery +
 * homepage card + optional smoke artifact archive + public media cache/variant scaffold + responsive srcset width buckets +
 * storage adapter readiness (Postgres bytes + observability headers).
 *
 * Targets either a Vercel preview (Protection Bypass required) or production.
 * Strictly read/write to a SINGLE Lux client-request ticket created at the start
 * of the run. No production data is mutated outside the new ticket.
 *
 * Required env (load via .env.local or set in shell):
 *   LUX_SMOKE_USERNAME=lux-smoke@corpflowai.com
 *   LUX_SMOKE_PASSWORD=<24+ chars>
 *
 * Choose a target. Either set:
 *   LUX_SMOKE_PREVIEW_BASE_URL=https://corpflow-...vercel.app
 *   VERCEL_AUTOMATION_BYPASS_SECRET=<...>          (preview only)
 *   CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET=<...> (preview only, alias)
 * or:
 *   LUX_SMOKE_BASE_URL=https://lux.corpflowai.com
 *
 * The script aborts loudly if neither target is reachable.
 *
 * Usage:
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs --target=preview
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs --target=production
 *
 * Optional (Phase 4D.5): after a successful run, archive only attachments created in that run (never deletes bytes):
 *   node scripts/smoke-lux-phase4c1-attachment-review.mjs --target=production --archive-smoke-artifacts
 *
 * Exits 0 only if every assertion passes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

import { LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT } from '../lib/cmp/_lib/lux-request-attachments.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env.local') });
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

const argv = process.argv.slice(2);
const argTarget = (argv.find((x) => x.startsWith('--target=')) || '').slice('--target='.length);
const archiveSmokeArtifacts = argv.includes('--archive-smoke-artifacts');
const smokeArtifactAttachmentIds = [];

function trackSmokeArtifact(id) {
  const s = id != null ? String(id).trim() : '';
  if (s) smokeArtifactAttachmentIds.push(s);
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
  throw new Error(msg);
}

function ok(msg) {
  console.log(`ok ${msg}`);
}

function info(msg) {
  console.log(`-- ${msg}`);
}

const username = process.env.LUX_SMOKE_USERNAME || '';
const password = process.env.LUX_SMOKE_PASSWORD || '';
if (!username || !password) {
  fail('LUX_SMOKE_USERNAME and LUX_SMOKE_PASSWORD must be set (see .env.template).');
}

const previewBase = (process.env.LUX_SMOKE_PREVIEW_BASE_URL || '').replace(/\/$/, '');
const prodBase = (process.env.LUX_SMOKE_BASE_URL || 'https://lux.corpflowai.com').replace(/\/$/, '');
const bypass =
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET ||
  process.env.CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET ||
  '';

let baseUrl;
let usingPreview = false;
if (argTarget === 'preview') {
  if (!previewBase) fail('LUX_SMOKE_PREVIEW_BASE_URL is required for --target=preview.');
  baseUrl = previewBase;
  usingPreview = true;
} else if (argTarget === 'production') {
  baseUrl = prodBase;
  usingPreview = false;
} else if (previewBase && bypass) {
  baseUrl = previewBase;
  usingPreview = true;
} else {
  baseUrl = prodBase;
  usingPreview = false;
}

if (usingPreview && !bypass) {
  fail('Preview targets require VERCEL_AUTOMATION_BYPASS_SECRET (or CORPFLOW_VERCEL_PROTECTION_BYPASS_SECRET).');
}

info(`target = ${baseUrl} (${usingPreview ? 'preview + bypass' : 'production'})`);

/**
 * Tiny synthetic media payloads. Both are valid bytes, not just zero-fills,
 * to satisfy any optional MIME sniff downstream.
 *
 * 1x1 transparent PNG (67 bytes).
 * Minimal MP4-like ISO base media file (just enough headers, ~32 bytes).
 */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
const MP4_BASE64 =
  'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQ==';

function commonHeaders(extra = {}) {
  const h = { ...extra };
  if (usingPreview && bypass) {
    h['x-vercel-protection-bypass'] = bypass;
    h['x-vercel-set-bypass-cookie'] = 'true';
  }
  return h;
}

const cookieJar = new Map(); // name -> value

function applySetCookie(res) {
  const sc = res.headers.getSetCookie?.() || res.headers.raw?.()['set-cookie'] || [];
  const arr = Array.isArray(sc) ? sc : [sc];
  for (const raw of arr) {
    if (!raw) continue;
    const first = String(raw).split(';')[0];
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    if (name) cookieJar.set(name, value);
  }
}

function cookieHeader() {
  const parts = [];
  for (const [k, v] of cookieJar.entries()) parts.push(`${k}=${v}`);
  return parts.join('; ');
}

async function http(method, urlPath, { body, headers } = {}) {
  const url = baseUrl + urlPath;
  const init = {
    method,
    headers: {
      ...commonHeaders(headers || {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(cookieJar.size ? { cookie: cookieHeader() } : {}),
    },
    redirect: 'manual',
  };
  if (body !== undefined) init.body = JSON.stringify(body);
  const res = await fetch(url, init);
  applySetCookie(res);
  let json = null;
  let text = '';
  const ct = String(res.headers.get('content-type') || '').toLowerCase();
  try {
    if (ct.includes('application/json')) {
      json = await res.json();
    } else {
      text = await res.text();
    }
  } catch (_) {
    /* ignore */
  }
  return { res, status: res.status, json, text };
}

/** Phase 5C — published **200** responses only; denials must not carry these headers. */
function assertLux5cPublishedMediaHeaders(res, variantExpected) {
  const want = String(variantExpected || '').toLowerCase();
  const bk = String(res.headers.get('x-lux-media-backend') || '').toLowerCase();
  if (bk !== 'postgres') fail(`expected X-Lux-Media-Backend postgres, got ${bk}`);
  const tf = String(res.headers.get('x-lux-media-transform') || '').toLowerCase();
  if (tf !== 'original') fail(`expected X-Lux-Media-Transform original, got ${tf}`);
  const va = String(res.headers.get('x-lux-media-variant') || '').toLowerCase();
  if (va !== want) fail(`expected X-Lux-Media-Variant ${want}, got ${va}`);
}

async function login() {
  const r = await http('POST', '/api/auth/login', {
    body: { username, password, level: 'tenant' },
  });
  if (r.status !== 200) {
    fail(`auth/login expected 200, got ${r.status} body=${JSON.stringify(r.json || r.text).slice(0, 200)}`);
  }
  if (!cookieJar.has('corpflow_session')) {
    fail('login did not set corpflow_session cookie.');
  }
  ok('login as Lux smoke operator');
}

async function createRequestTicket() {
  const title = `[phase4c.1 smoke] ${new Date().toISOString()}`;
  const r = await http('POST', '/api/cmp/router?action=lux-client-request-create', {
    body: {
      request_type: 'property_update',
      title,
      description: 'Phase 4C.1 attachment review smoke test. Created and reviewed by automated round-trip; safe to leave open.',
      priority: 'Low',
      property_reference: 'lm-phase2d-manual-demo',
    },
  });
  if (r.status !== 200) {
    fail(`lux-client-request-create expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
  }
  const ticketId = r.json?.request?.ticket_id;
  if (!ticketId) fail('lux-client-request-create returned no ticket_id.');
  ok(`created Lux request ticket ${ticketId}`);
  return ticketId;
}

async function uploadAttachment(ticketId, { fileName, contentType, dataB64, intendedUse, notes }) {
  const r = await http('POST', '/api/change-attachment/upload', {
    body: {
      ticket_id: ticketId,
      file_name: fileName,
      content_type: contentType,
      data_base64: dataB64,
      intended_use: intendedUse,
      notes,
    },
  });
  if (r.status !== 200) {
    fail(`upload(${fileName}) expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`);
  }
  if (!r.json?.attachment_id) fail(`upload(${fileName}) returned no attachment_id.`);
  if (!r.json?.lux_meta) {
    fail(`upload(${fileName}) returned no lux_meta block — Lux annotation did not run.`);
  }
  if (r.json.lux_meta.review_status !== 'pending_review') {
    fail(`upload(${fileName}) initial review_status expected pending_review, got ${r.json.lux_meta.review_status}`);
  }
  ok(`upload ${fileName} (${contentType}) → attachment_id=${r.json.attachment_id} review_status=pending_review`);
  return r.json.attachment_id;
}

async function listAttachments(ticketId) {
  const r = await http('GET', `/api/change-attachment/list?ticket_id=${encodeURIComponent(ticketId)}`);
  if (r.status !== 200) {
    fail(`list expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
  }
  if (r.json?.lux_request_ticket !== true) fail('list lux_request_ticket flag expected true.');
  if (!Array.isArray(r.json?.attachments)) fail('list attachments not an array.');
  return r.json.attachments;
}

async function setReview(ticketId, attachmentId, reviewStatus, reviewNote) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: ticketId, attachment_id: attachmentId, review_status: reviewStatus, review_note: reviewNote },
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-review-set(${reviewStatus}) expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(
        0,
        240,
      )}`,
    );
  }
  if (r.json?.attachment?.review_status !== reviewStatus) {
    fail(`review_status echo expected ${reviewStatus}, got ${r.json?.attachment?.review_status}`);
  }
  ok(`lux-attachment-review-set(${attachmentId}, ${reviewStatus}) persisted`);
  return r.json.attachment;
}

async function negativeNoSession() {
  const oldCookies = new Map(cookieJar);
  cookieJar.clear();
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: 'x', attachment_id: 'x', review_status: 'reviewed' },
  });
  for (const [k, v] of oldCookies) cookieJar.set(k, v);
  if (r.status !== 401 && r.status !== 403) {
    fail(`anonymous lux-attachment-review-set expected 401/403, got ${r.status}`);
  }
  ok(`anonymous lux-attachment-review-set rejected (status=${r.status})`);
}

async function negativeInvalidStatus(ticketId, attachmentId) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-review-set', {
    body: { ticket_id: ticketId, attachment_id: attachmentId, review_status: 'approved' },
  });
  if (r.status !== 400) {
    fail(`invalid review_status expected 400, got ${r.status}`);
  }
  if (!Array.isArray(r.json?.allowed) || !r.json.allowed.includes('pending_review')) {
    fail(`invalid review_status response missing allowed list: ${JSON.stringify(r.json).slice(0, 200)}`);
  }
  ok(`invalid review_status rejected with allowlist (${r.json.allowed.join('/')})`);
}

async function publicSurfaceClean(urlPath) {
  // No bypass for production; use bypass for preview hosts.
  const r = await http('GET', urlPath);
  if (r.status !== 200) {
    fail(`GET ${urlPath} expected 200, got ${r.status}`);
  }
  const body = r.text || JSON.stringify(r.json || {});
  const forbidden = [
    'lux_request_meta',
    'review_status',
    'reviewed_by',
    'review_note',
    'property_links',
    'attachment_id',
    'linked_by',
    'attachments[',
    '/api/change-attachment/',
  ];
  for (const term of forbidden) {
    if (body.includes(term)) {
      fail(`GET ${urlPath} unexpectedly leaked "${term}" in body.`);
    }
  }
  ok(`public ${urlPath} clean (no attachment metadata)`);
}

async function setPropertyLink(ticketId, attachmentId, propertySlug, intendedSlot, linkNote) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-property-link-set', {
    body: {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      property_slug: propertySlug,
      intended_slot: intendedSlot,
      link_note: linkNote || null,
    },
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-property-link-set expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`,
    );
  }
  ok(`lux-attachment-property-link-set(${attachmentId} -> ${propertySlug} / ${intendedSlot}) persisted`);
  return r.json.attachment;
}

async function publishProperty(ticketId, attachmentId, propertySlug, intendedSlot, publicCaption, publicAlt, opts) {
  const body = {
    ticket_id: ticketId,
    attachment_id: attachmentId,
    property_slug: propertySlug,
    intended_slot: intendedSlot,
    public_caption: publicCaption ?? null,
    public_alt_text: publicAlt ?? null,
  };
  if (opts && typeof opts === 'object') {
    if (opts.gallery_order != null) body.gallery_order = opts.gallery_order;
    if (opts.is_gallery_cover === true) body.is_gallery_cover = true;
  }
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-property-publish', {
    body,
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-property-publish expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`,
    );
  }
  ok(`lux-attachment-property-publish(${attachmentId} → ${propertySlug} / ${intendedSlot})`);
  return r.json.attachment;
}

async function unpublishProperty(ticketId, attachmentId, propertySlug, intendedSlot) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-property-unpublish', {
    body: {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      property_slug: propertySlug,
      intended_slot: intendedSlot,
    },
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-property-unpublish expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`,
    );
  }
  ok(`lux-attachment-property-unpublish(${attachmentId} → ${propertySlug} / ${intendedSlot})`);
  return r.json.attachment;
}

async function getPropertyMedia(propertySlug, attachmentId, slot, { variant, width } = {}) {
  const cb = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const vq = variant ? `&variant=${encodeURIComponent(variant)}` : '';
  const wq = width != null && String(width) !== '' ? `&width=${encodeURIComponent(String(width))}` : '';
  return await http(
    'GET',
    `/api/lux/property-media?property=${encodeURIComponent(propertySlug)}&attachment=${encodeURIComponent(
      attachmentId,
    )}&slot=${encodeURIComponent(slot)}${vq}${wq}&_cb=${encodeURIComponent(cb)}`,
  );
}

async function getPropertyMediaList(propertySlug) {
  const cb = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return await http(
    'GET',
    `/api/lux/property-media-list?property=${encodeURIComponent(propertySlug)}&_cb=${encodeURIComponent(cb)}`,
  );
}

async function removePropertyLink(ticketId, attachmentId, propertySlug, intendedSlot) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-property-link-remove', {
    body: {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      property_slug: propertySlug,
      intended_slot: intendedSlot,
    },
  });
  if (r.status !== 200) {
    fail(
      `lux-attachment-property-link-remove expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`,
    );
  }
  ok(`lux-attachment-property-link-remove(${attachmentId} -> ${propertySlug} / ${intendedSlot}) persisted`);
  return r.json.attachment;
}

async function archiveLuxAttachment(ticketId, attachmentId, archiveReason) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-archive', {
    body: {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      archive_reason: archiveReason ?? null,
    },
  });
  if (r.status !== 200) {
    fail(`lux-attachment-archive expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`);
  }
  ok(`lux-attachment-archive(${attachmentId})`);
  return r.json.attachment;
}

async function archiveSmokeArtifactsFromRun(ticketId) {
  if (!archiveSmokeArtifacts) return;
  info('Phase 4D.5: --archive-smoke-artifacts — archiving tracked ids (active rows only; never delete).');
  const reason = `${LUX_ATTACHMENT_ARCHIVE_REASON_SMOKE_DEFAULT} (smoke --archive-smoke-artifacts)`;
  for (const aid of smokeArtifactAttachmentIds) {
    const list = await listAttachments(ticketId);
    const row = list.find((x) => x && x.attachment_id === aid);
    if (!row) {
      ok(`4D5: skip missing attachment ${aid}`);
      continue;
    }
    if (String(row.lifecycle_status || '').toLowerCase() === 'archived') {
      ok(`4D5: skip already archived ${aid}`);
      continue;
    }
    await archiveLuxAttachment(ticketId, aid, reason);
    ok(`4D5: archived smoke artifact ${aid}`);
  }
}

async function restoreLuxAttachment(ticketId, attachmentId) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-restore', {
    body: { ticket_id: ticketId, attachment_id: attachmentId },
  });
  if (r.status !== 200) {
    fail(`lux-attachment-restore expected 200, got ${r.status} body=${JSON.stringify(r.json).slice(0, 240)}`);
  }
  ok(`lux-attachment-restore(${attachmentId})`);
  return r.json.attachment;
}

async function main() {
  await login();
  const ticketId = await createRequestTicket();

  const imgId = await uploadAttachment(ticketId, {
    fileName: 'phase4c1-smoke-hero.png',
    contentType: 'image/png',
    dataB64: PNG_BASE64,
    intendedUse: 'property_hero',
    notes: 'Smoke fixture: 1x1 transparent PNG',
  });
  trackSmokeArtifact(imgId);
  const vidId = await uploadAttachment(ticketId, {
    fileName: 'phase4c1-smoke-clip.mp4',
    contentType: 'video/mp4',
    dataB64: MP4_BASE64,
    intendedUse: 'request_supporting',
    notes: 'Smoke fixture: minimal MP4 header',
  });
  trackSmokeArtifact(vidId);

  let list = await listAttachments(ticketId);
  if (list.length !== 2) fail(`list expected 2 entries, got ${list.length}`);
  const byId = new Map(list.map((a) => [a.attachment_id, a]));
  if (byId.get(imgId)?.media_type !== 'image') fail('image media_type missing');
  if (byId.get(vidId)?.media_type !== 'video') fail('video media_type missing');
  if (byId.get(imgId)?.intended_use !== 'property_hero') fail('image intended_use lost');
  if (byId.get(vidId)?.intended_use !== 'request_supporting') fail('video intended_use lost');
  if (byId.get(imgId)?.review_status !== 'pending_review') fail('image not pending_review on first list');
  ok('list shape: filename + media_type + intended_use + notes + review_status all present');

  await negativeInvalidStatus(ticketId, imgId);

  await setReview(ticketId, imgId, 'reviewed', 'Smoke: image looks clean.');
  await setReview(ticketId, vidId, 'rejected', 'Smoke: video is a placeholder, reject.');

  list = await listAttachments(ticketId);
  const after = new Map(list.map((a) => [a.attachment_id, a]));
  if (after.get(imgId)?.review_status !== 'reviewed') fail('image review_status not persisted');
  if (after.get(vidId)?.review_status !== 'rejected') fail('video review_status not persisted');
  if (!after.get(imgId)?.reviewed_by) fail('reviewed_by missing on image');
  if (!after.get(vidId)?.reviewed_at) fail('reviewed_at missing on video');
  if (after.get(imgId)?.review_note !== 'Smoke: image looks clean.') fail('image review_note not persisted');
  ok('review state persisted for image (reviewed) and video (rejected) with note + reviewer + time');

  // Phase 4C.2 — reviewed-only property association.
  await setPropertyLink(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero', 'Smoke: approved hero slot.');
  list = await listAttachments(ticketId);
  const linked = new Map(list.map((a) => [a.attachment_id, a]));
  const links = linked.get(imgId)?.property_links || [];
  if (!Array.isArray(links) || links.length < 1) fail('property_links missing after link');
  const match = links.find((pl) => pl && pl.property_slug === 'lm-phase2d-manual-demo' && pl.intended_slot === 'hero');
  if (!match) fail('linked property not found in property_links');
  if (String(match.publish_status || '').toLowerCase() !== 'unpublished') {
    fail(`new property link expected publish_status unpublished, got ${match.publish_status}`);
  }
  ok('property link persisted on reviewed attachment');

  // Phase 4C.3 — public image route + operator publish/unpublish (image-only, Lux host).
  const pubCaption = 'Smoke 4C3 public caption';
  const pubAlt = 'Smoke 4C3 public alt';
  const badSlot = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'not-a-slot');
  if (badSlot.status !== 400) fail(`property-media invalid slot expected 400, got ${badSlot.status}`);
  ok('property-media rejects invalid slot');

  const beforePub = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (beforePub.status !== 404) fail(`property-media before publish expected 404, got ${beforePub.status}`);
  const cc404 = String(beforePub.res.headers.get('cache-control') || '');
  if (!cc404.includes('no-store')) fail(`property-media deny expected Cache-Control no-store, got ${cc404}`);
  ok('property-media rejects unpublished linked image');

  const badVariant = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero', { variant: 'xlarge' });
  if (badVariant.status !== 400) fail(`property-media invalid variant expected 400, got ${badVariant.status}`);
  if (badVariant.res.headers.get('x-lux-media-backend')) {
    fail('property-media invalid variant must not expose X-Lux-Media-Backend (5C)');
  }
  ok('property-media rejects invalid variant (5A allowlist)');

  const badWidth = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero', { width: '3000' });
  if (badWidth.status !== 400) fail(`property-media invalid width expected 400, got ${badWidth.status}`);
  if (badWidth.res.headers.get('x-lux-media-backend')) {
    fail('property-media invalid width must not expose X-Lux-Media-Backend (5C)');
  }
  ok('property-media rejects invalid width bucket (5B)');

  await publishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero', pubCaption, pubAlt);
  const afterPub = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (afterPub.status !== 200) fail(`property-media after publish expected 200, got ${afterPub.status}`);
  const ccOk = String(afterPub.res.headers.get('cache-control') || '');
  if (!ccOk.includes('public') || !ccOk.includes('max-age=300') || !ccOk.includes('must-revalidate')) {
    fail(`property-media expected conservative public cache (max-age=300, must-revalidate), got ${ccOk}`);
  }
  if (ccOk.includes('stale-while-revalidate')) fail('property-media must not use stale-while-revalidate');
  const ct = String(afterPub.res.headers.get('content-type') || '').toLowerCase();
  if (!ct.startsWith('image/')) fail(`property-media expected image content-type, got ${ct}`);
  const xSrc = String(afterPub.res.headers.get('x-lux-media-source') || '').toLowerCase();
  if (xSrc !== 'original') fail(`property-media expected X-Lux-Media-Source original, got ${xSrc}`);
  assertLux5cPublishedMediaHeaders(afterPub.res, 'hero');
  ok('property-media serves published PNG after publish');

  const afterPubWidth = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero', { width: '1024' });
  if (afterPubWidth.status !== 200) fail(`property-media width=1024 expected 200, got ${afterPubWidth.status}`);
  assertLux5cPublishedMediaHeaders(afterPubWidth.res, 'hero');
  ok('property-media accepts allowlisted width (5B)');

  const afterPubVariantHero = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero', { variant: 'hero' });
  if (afterPubVariantHero.status !== 200) fail(`property-media variant=hero expected 200, got ${afterPubVariantHero.status}`);
  const afterPubVariantOrig = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero', { variant: 'original' });
  if (afterPubVariantOrig.status !== 200) fail(`property-media variant=original expected 200, got ${afterPubVariantOrig.status}`);
  ok('property-media accepts allowlisted variant params (5A scaffold)');

  const wrongProp = await getPropertyMedia('lm-nc-ridge', imgId, 'hero');
  if (wrongProp.status !== 404) fail(`property-media wrong property ref expected 404, got ${wrongProp.status}`);
  ok('property-media rejects attachment when property query does not match linked slug');

  const propPage = await http('GET', '/property/lm-phase2d-manual-demo');
  if (propPage.status !== 200) fail(`GET /property/lm-phase2d-manual-demo expected 200, got ${propPage.status}`);
  const propBody = propPage.text || JSON.stringify(propPage.json || {});
  if (!propBody.includes('/api/lux/property-media')) fail('property page missing public media URL after publish');
  if (!propBody.includes('variant=hero')) fail('property page missing variant=hero on public media URL (5A)');
  if (!propBody.toLowerCase().includes('srcset=')) fail('property page missing responsive srcset (5B)');
  if (!propBody.includes('width=1920')) fail('property page hero src missing width=1920 (5B)');
  if (!propBody.includes(pubCaption)) fail('property page missing public caption after publish');
  if (!propBody.includes(pubAlt)) fail('property page missing public alt text after publish');
  ok('property page shows published hero caption + alt');

  await unpublishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero');
  const afterUnpub = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (afterUnpub.status !== 404) fail(`property-media after unpublish expected 404, got ${afterUnpub.status}`);
  ok('property-media rejects after unpublish');

  const propPage2 = await http('GET', '/property/lm-phase2d-manual-demo');
  if (propPage2.status !== 200) fail(`GET /property after unpublish expected 200, got ${propPage2.status}`);
  const propBody2 = propPage2.text || JSON.stringify(propPage2.json || {});
  if (propBody2.includes(pubCaption)) fail('property page still showed caption after unpublish');
  ok('property page dropped published caption after unpublish');

  await setReview(ticketId, vidId, 'reviewed', 'Smoke: temporarily reviewed to test publish gate.');
  await setPropertyLink(ticketId, vidId, 'lm-phase2d-manual-demo', 'gallery', 'Smoke: video link for IMAGE_ONLY gate.');
  const vidPub = await http('POST', '/api/cmp/router?action=lux-attachment-property-publish', {
    body: {
      ticket_id: ticketId,
      attachment_id: vidId,
      property_slug: 'lm-phase2d-manual-demo',
      intended_slot: 'gallery',
      public_caption: null,
      public_alt_text: null,
    },
  });
  if (vidPub.status === 200) fail('lux-attachment-property-publish for video unexpectedly succeeded');
  if (vidPub.status !== 409 || String(vidPub.json?.error || '') !== 'IMAGE_ONLY') {
    fail(`video publish expected 409 IMAGE_ONLY, got ${vidPub.status} ${JSON.stringify(vidPub.json).slice(0, 200)}`);
  }
  ok('lux-attachment-property-publish rejects video with IMAGE_ONLY');
  await removePropertyLink(ticketId, vidId, 'lm-phase2d-manual-demo', 'gallery');
  await setReview(ticketId, vidId, 'rejected', 'Smoke: video is a placeholder, reject.');

  // Phase 4D.1 — multi-image gallery (reviewed + linked + published, image-only).
  const galA = await uploadAttachment(ticketId, {
    fileName: 'phase4d1-gallery-a.png',
    contentType: 'image/png',
    dataB64: PNG_BASE64,
    intendedUse: 'property_gallery',
    notes: 'Smoke gallery A',
  });
  trackSmokeArtifact(galA);
  const galB = await uploadAttachment(ticketId, {
    fileName: 'phase4d1-gallery-b.png',
    contentType: 'image/png',
    dataB64: PNG_BASE64,
    intendedUse: 'property_gallery',
    notes: 'Smoke gallery B',
  });
  trackSmokeArtifact(galB);
  await setReview(ticketId, galA, 'reviewed', 'Smoke: gallery A reviewed.');
  await setReview(ticketId, galB, 'reviewed', 'Smoke: gallery B reviewed.');
  await setPropertyLink(ticketId, galA, 'lm-phase2d-manual-demo', 'gallery', 'Smoke: gallery A slot.');
  await setPropertyLink(ticketId, galB, 'lm-phase2d-manual-demo', 'gallery', 'Smoke: gallery B slot.');
  const capA = 'Smoke Gal A caption';
  const capB = 'Smoke Gal B caption';
  await publishProperty(ticketId, galA, 'lm-phase2d-manual-demo', 'gallery', capA, 'Smoke Gal A alt', {
    gallery_order: 20,
    is_gallery_cover: true,
  });
  await publishProperty(ticketId, galB, 'lm-phase2d-manual-demo', 'gallery', capB, 'Smoke Gal B alt', {
    gallery_order: 10,
    is_gallery_cover: false,
  });
  const gA = await getPropertyMedia('lm-phase2d-manual-demo', galA, 'gallery');
  const gB = await getPropertyMedia('lm-phase2d-manual-demo', galB, 'gallery');
  if (gA.status !== 200 || gB.status !== 200) {
    fail(`gallery property-media expected 200/200, got ${gA.status}/${gB.status}`);
  }
  assertLux5cPublishedMediaHeaders(gB.res, 'gallery');
  ok('property-media serves both published gallery PNGs');

  const listR = await getPropertyMediaList('lm-phase2d-manual-demo');
  if (listR.status !== 200 || !listR.json?.ok) {
    fail(`property-media-list expected 200 ok, got ${listR.status} ${JSON.stringify(listR.json).slice(0, 200)}`);
  }
  const listBody = JSON.stringify(listR.json);
  const forbidden = ['lux_request_meta', 'review_note', 'reviewed_by', 'linked_by', 'published_by', '/api/change-attachment/'];
  for (const term of forbidden) {
    if (listBody.includes(term)) fail(`property-media-list leaked "${term}"`);
  }
  const galleryItems = (listR.json.items || []).filter((x) => x && x.slot === 'gallery');
  if (galleryItems.length < 2) fail(`property-media-list expected >=2 gallery items, got ${galleryItems.length}`);
  for (const it of galleryItems) {
    if (!it.variant || !it.content_type) fail('property-media-list item missing variant or content_type (5A)');
    if (!String(it.src_set || '').includes('w')) fail('property-media-list item missing src_set width descriptors (5B)');
    if (!String(it.src || '').includes(`variant=${encodeURIComponent(String(it.variant))}`)) {
      fail('property-media-list src should echo list variant param');
    }
  }
  ok('property-media-list returns safe gallery entries (no private metadata)');

  const propGal = await http('GET', '/property/lm-phase2d-manual-demo');
  if (propGal.status !== 200) fail(`GET /property for gallery smoke expected 200, got ${propGal.status}`);
  const propGalBody = propGal.text || JSON.stringify(propGal.json || {});
  if (!propGalBody.includes('Gallery')) fail('property page missing Gallery section');
  if (!propGalBody.includes(capA) || !propGalBody.includes(capB)) fail('property page missing gallery captions');
  if (!propGalBody.includes('slot=gallery')) fail('property page missing gallery media URLs');
  if (!propGalBody.includes('variant=gallery')) fail('property page missing variant=gallery on gallery URLs (5A)');
  if (!propGalBody.toLowerCase().includes('srcset=')) fail('property page gallery missing srcset (5B)');
  ok('property page renders published gallery grid with captions');

  await unpublishProperty(ticketId, galA, 'lm-phase2d-manual-demo', 'gallery');
  const gAun = await getPropertyMedia('lm-phase2d-manual-demo', galA, 'gallery');
  if (gAun.status !== 404) fail(`gallery property-media after unpublish expected 404, got ${gAun.status}`);
  const propGal2 = await http('GET', '/property/lm-phase2d-manual-demo');
  const propGalBody2 = propGal2.text || JSON.stringify(propGal2.json || {});
  if (propGalBody2.includes(capA)) fail('property page still showed unpublished gallery A caption');
  if (!propGalBody2.includes(capB)) fail('property page should still show gallery B');
  ok('unpublish removes one gallery image from public view; other remains');

  await removePropertyLink(ticketId, galA, 'lm-phase2d-manual-demo', 'gallery');
  await removePropertyLink(ticketId, galB, 'lm-phase2d-manual-demo', 'gallery');

  // Phase 4D.2 — homepage property card uses published card-slot media (manual demo listing).
  const cardImg = await uploadAttachment(ticketId, {
    fileName: 'phase4d2-card.png',
    contentType: 'image/png',
    dataB64: PNG_BASE64,
    intendedUse: 'property_hero',
    notes: 'Smoke card slot for homepage',
  });
  trackSmokeArtifact(cardImg);
  await setReview(ticketId, cardImg, 'reviewed', 'Smoke: card image reviewed.');
  await setPropertyLink(ticketId, cardImg, 'lm-phase2d-manual-demo', 'card', 'Smoke: card slot for homepage card.');
  const cardAltProbe = 'Smoke4D2CardAltUnique9271';
  await publishProperty(ticketId, cardImg, 'lm-phase2d-manual-demo', 'card', null, cardAltProbe);
  const cardBytes = await getPropertyMedia('lm-phase2d-manual-demo', cardImg, 'card');
  if (cardBytes.status !== 200) fail(`card property-media expected 200, got ${cardBytes.status}`);
  assertLux5cPublishedMediaHeaders(cardBytes.res, 'card');
  ok('property-media serves published card PNG');

  const listCardCheck = await getPropertyMediaList('lm-phase2d-manual-demo');
  if (listCardCheck.status !== 200 || !listCardCheck.json?.ok) {
    fail(`property-media-list for card smoke expected 200 ok, got ${listCardCheck.status}`);
  }
  const cardListItem = (listCardCheck.json.items || []).find((x) => x && x.slot === 'card');
  if (!cardListItem || !String(cardListItem.src || '').includes('slot=card')) {
    fail('property-media-list missing published card entry');
  }
  ok('property-media-list includes card slot');

  const home1 = await http('GET', `/?_cb=${encodeURIComponent(String(Date.now()))}`);
  if (home1.status !== 200) fail(`GET / for card smoke expected 200, got ${home1.status}`);
  const homeBody1 = home1.text || '';
  if (!homeBody1.includes('/api/lux/property-media')) fail('homepage missing property-media URL');
  if (!homeBody1.includes('slot=card')) fail('homepage missing card-slot property-media URL');
  if (!homeBody1.includes('variant=card')) fail('homepage missing variant=card on card media URL (5A)');
  if (!homeBody1.toLowerCase().includes('srcset=')) fail('homepage card image missing srcset (5B)');
  if (!homeBody1.includes(cardAltProbe)) fail('homepage missing card image alt text');
  ok('homepage shows published card media for lm-phase2d-manual-demo');

  await unpublishProperty(ticketId, cardImg, 'lm-phase2d-manual-demo', 'card');
  const cardAfterUnpub = await getPropertyMedia('lm-phase2d-manual-demo', cardImg, 'card');
  if (cardAfterUnpub.status !== 404) fail(`card property-media after unpublish expected 404, got ${cardAfterUnpub.status}`);
  const home2 = await http('GET', `/?_cb=${encodeURIComponent(`${Date.now()}_h2`)}`);
  if (home2.status !== 200) fail(`GET / after card unpublish expected 200, got ${home2.status}`);
  const homeBody2 = home2.text || '';
  if (homeBody2.includes(cardAltProbe)) fail('homepage still contained card alt after unpublish');
  ok('homepage card slot cleared after unpublish (fallback)');

  await removePropertyLink(ticketId, cardImg, 'lm-phase2d-manual-demo', 'card');

  // Phase 4D.3 — archive unpublishes all links; restore does not auto-republish.
  await publishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero', pubCaption, pubAlt);
  const pre4d3 = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (pre4d3.status !== 200) fail(`4D3: hero expected 200 before archive, got ${pre4d3.status}`);
  ok('4D3: hero public before archive');

  const tenantIdLeak = await http('POST', '/api/cmp/router?action=lux-attachment-archive', {
    body: {
      ticket_id: ticketId,
      attachment_id: imgId,
      tenant_id: 'luxe-maurice',
      archive_reason: 'should reject body tenant_id',
    },
  });
  if (tenantIdLeak.status !== 400 || String(tenantIdLeak.json?.error || '') !== 'TENANT_ID_NOT_ALLOWED_IN_BODY') {
    fail(`4D3: archive with tenant_id in body expected 400 TENANT_ID_NOT_ALLOWED_IN_BODY, got ${tenantIdLeak.status}`);
  }
  ok('4D3: archive rejects tenant_id in body');

  await archiveLuxAttachment(ticketId, imgId, 'replaced by phase4d3-smoke');
  const postArchMedia = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (postArchMedia.status !== 404) fail(`4D3: property-media expected 404 after archive, got ${postArchMedia.status}`);
  ok('4D3: archived hero returns 404 on property-media');

  const pubDenied = await http('POST', '/api/cmp/router?action=lux-attachment-property-publish', {
    body: {
      ticket_id: ticketId,
      attachment_id: imgId,
      property_slug: 'lm-phase2d-manual-demo',
      intended_slot: 'hero',
      public_caption: 'x',
      public_alt_text: 'y',
    },
  });
  if (pubDenied.status !== 409 || String(pubDenied.json?.error || '') !== 'LIFECYCLE_ARCHIVED') {
    fail(`4D3: publish while archived expected 409 LIFECYCLE_ARCHIVED, got ${pubDenied.status}`);
  }
  ok('4D3: publish archived attachment rejected');

  list = await listAttachments(ticketId);
  const imgRowArch = list.find((x) => x.attachment_id === imgId);
  if (String(imgRowArch?.lifecycle_status || '') !== 'archived') fail('4D3: lifecycle_status not archived on list');
  const heroPlArch = (imgRowArch?.property_links || []).find((pl) => pl && pl.intended_slot === 'hero');
  if (String(heroPlArch?.publish_status || '') !== 'unpublished') fail('4D3: hero link not unpublished after archive');
  const histArch = heroPlArch?.publish_history || [];
  if (!histArch.some((h) => h && h.action === 'archived')) fail('4D3: publish_history missing archived');
  if (!histArch.some((h) => h && h.action === 'unpublished')) fail('4D3: publish_history missing auto-unpublish');
  ok('4D3: list payload shows archived + unpublish history');

  const prop4d3 = await http('GET', '/property/lm-phase2d-manual-demo');
  if (prop4d3.status !== 200) fail(`4D3: property page GET expected 200, got ${prop4d3.status}`);
  const prop4d3Body = prop4d3.text || '';
  if (prop4d3Body.includes(pubCaption)) fail('4D3: property page still showed hero caption after archive');
  ok('4D3: property page excludes archived hero');

  await restoreLuxAttachment(ticketId, imgId);
  const postRestoreMedia = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (postRestoreMedia.status !== 404) fail(`4D3: expected 404 after restore until republish, got ${postRestoreMedia.status}`);
  ok('4D3: restore does not auto-republish (property-media still 404)');

  await publishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero', pubCaption, pubAlt);
  const postRepubMedia = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (postRepubMedia.status !== 200) fail(`4D3: expected 200 after explicit republish, got ${postRepubMedia.status}`);
  assertLux5cPublishedMediaHeaders(postRepubMedia.res, 'hero');
  ok('4D3: explicit publish after restore is public again');

  await unpublishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero');

  await removePropertyLink(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero');
  list = await listAttachments(ticketId);
  const unlinked = new Map(list.map((a) => [a.attachment_id, a]));
  const linksAfter = unlinked.get(imgId)?.property_links || [];
  if (Array.isArray(linksAfter) && linksAfter.some((pl) => pl && pl.property_slug === 'lm-phase2d-manual-demo' && pl.intended_slot === 'hero')) {
    fail('property link still present after unlink');
  }
  ok('property unlink persisted');

  await negativeNoSession();

  await publicSurfaceClean('/');
  await publicSurfaceClean('/concierge');
  await publicSurfaceClean('/property/lm-phase2d-manual-demo');

  info('');
  info('=== Phase 4D.5 smoke artifact summary ===');
  info(`ticket_id: ${ticketId}`);
  info(`attachment_ids (${smokeArtifactAttachmentIds.length}): ${smokeArtifactAttachmentIds.join(', ')}`);
  info(
    'Cleanup recommendation: from /change on this Lux host, Archive smoke attachments on this ticket when no longer needed (bytes are retained; no hard-delete in this phase).',
  );
  if (!archiveSmokeArtifacts) {
    info('Optional: append --archive-smoke-artifacts to archive only the ids above (default off; still never deletes).');
  }

  await archiveSmokeArtifactsFromRun(ticketId);

  console.log(`\nALL CHECKS PASSED. ticket_id=${ticketId} (operator can leave open or close manually).`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  if (process.exitCode !== 0) process.exitCode = 1;
});

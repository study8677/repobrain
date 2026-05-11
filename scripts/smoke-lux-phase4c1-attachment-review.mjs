#!/usr/bin/env node
/**
 * Phase 4C.1 + 4C.3 live verification — Lux operator media review + property publish round-trip.
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
 * Exits 0 only if every assertion passes.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(REPO_ROOT, '.env.local') });
dotenv.config({ path: path.join(REPO_ROOT, '.env') });

const argv = process.argv.slice(2);
const argTarget = (argv.find((x) => x.startsWith('--target=')) || '').slice('--target='.length);

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

async function publishProperty(ticketId, attachmentId, propertySlug, intendedSlot, publicCaption, publicAlt) {
  const r = await http('POST', '/api/cmp/router?action=lux-attachment-property-publish', {
    body: {
      ticket_id: ticketId,
      attachment_id: attachmentId,
      property_slug: propertySlug,
      intended_slot: intendedSlot,
      public_caption: publicCaption ?? null,
      public_alt_text: publicAlt ?? null,
    },
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

async function getPropertyMedia(propertySlug, attachmentId, slot) {
  const cb = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return await http(
    'GET',
    `/api/lux/property-media?property=${encodeURIComponent(propertySlug)}&attachment=${encodeURIComponent(
      attachmentId,
    )}&slot=${encodeURIComponent(slot)}&_cb=${encodeURIComponent(cb)}`,
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
  const vidId = await uploadAttachment(ticketId, {
    fileName: 'phase4c1-smoke-clip.mp4',
    contentType: 'video/mp4',
    dataB64: MP4_BASE64,
    intendedUse: 'request_supporting',
    notes: 'Smoke fixture: minimal MP4 header',
  });

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
  ok('property-media rejects unpublished linked image');

  await publishProperty(ticketId, imgId, 'lm-phase2d-manual-demo', 'hero', pubCaption, pubAlt);
  const afterPub = await getPropertyMedia('lm-phase2d-manual-demo', imgId, 'hero');
  if (afterPub.status !== 200) fail(`property-media after publish expected 200, got ${afterPub.status}`);
  const ct = String(afterPub.res.headers.get('content-type') || '').toLowerCase();
  if (!ct.startsWith('image/')) fail(`property-media expected image content-type, got ${ct}`);
  ok('property-media serves published PNG after publish');

  const wrongProp = await getPropertyMedia('lm-nc-ridge', imgId, 'hero');
  if (wrongProp.status !== 404) fail(`property-media wrong property ref expected 404, got ${wrongProp.status}`);
  ok('property-media rejects attachment when property query does not match linked slug');

  const propPage = await http('GET', '/property/lm-phase2d-manual-demo');
  if (propPage.status !== 200) fail(`GET /property/lm-phase2d-manual-demo expected 200, got ${propPage.status}`);
  const propBody = propPage.text || JSON.stringify(propPage.json || {});
  if (!propBody.includes('/api/lux/property-media')) fail('property page missing public media URL after publish');
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

  console.log(`\nALL CHECKS PASSED. ticket_id=${ticketId} (operator can leave open or close manually).`);
}

main().catch((e) => {
  console.error(e?.stack || e?.message || String(e));
  if (process.exitCode !== 0) process.exitCode = 1;
});

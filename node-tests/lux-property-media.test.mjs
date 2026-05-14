import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { handleLuxPropertyMedia } from '../lib/server/lux-property-media.js';

const PROP = 'lm-phase2d-manual-demo';

function makeRes() {
  const headers = {};
  return {
    headers,
    setHeader(k, v) {
      headers[String(k).toLowerCase()] = v;
    },
    statusCode: 200,
    end() {},
  };
}

function makeReq(query, ctx = { surface: 'tenant', tenant_id: 'luxe-maurice' }) {
  return { method: 'GET', query, corpflowContext: ctx };
}

function publishedConsole(publishStatus) {
  return {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'att-pub-1',
          review_status: 'reviewed',
          lifecycle_status: 'active',
          property_links: [
            {
              property_slug: PROP,
              intended_slot: 'hero',
              publish_status: publishStatus,
            },
          ],
        },
      ],
    },
  };
}

function makePrismaPublished() {
  const buf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const attId = 'att-pub-1';
  const ticketId = 't-smoke';
  return {
    cmpTicketAttachment: {
      findUnique: async ({ where: { id } }) =>
        id === attId
          ? {
              id: attId,
              ticketId,
              tenantId: 'luxe-maurice',
              contentType: 'image/png',
              fileName: 'x.png',
              data: buf,
            }
          : null,
    },
    cmpTicket: {
      findUnique: async ({ where: { id } }) =>
        id === ticketId ? { tenantId: 'luxe-maurice', consoleJson: publishedConsole('published') } : null,
    },
  };
}

function makePrismaUnpublished() {
  const buf = Buffer.from([1]);
  const attId = 'att-u-1';
  const ticketId = 't2';
  return {
    cmpTicketAttachment: {
      findUnique: async ({ where: { id } }) =>
        id === attId
          ? {
              id: attId,
              ticketId,
              tenantId: 'luxe-maurice',
              contentType: 'image/png',
              fileName: 'x.png',
              data: buf,
            }
          : null,
    },
    cmpTicket: {
      findUnique: async ({ where: { id } }) =>
        id === ticketId ? { tenantId: 'luxe-maurice', consoleJson: publishedConsole('unpublished') } : null,
    },
  };
}

test('handleLuxPropertyMedia · 200 uses public max-age=300 must-revalidate + nosniff + image/png', async () => {
  const res = makeRes();
  await handleLuxPropertyMedia(
    makeReq({ property: PROP, attachment: 'att-pub-1', slot: 'hero', variant: 'hero' }),
    res,
    makePrismaPublished(),
  );
  assert.equal(res.statusCode, 200);
  const cc = String(res.headers['cache-control'] || '');
  assert.match(cc, /public/);
  assert.match(cc, /max-age=300/);
  assert.match(cc, /must-revalidate/);
  assert.equal(res.headers['x-content-type-options'], 'nosniff');
  assert.equal(res.headers['content-type'], 'image/png');
  assert.equal(res.headers['x-lux-media-source'], 'original');
  assert.equal(res.headers['x-lux-media-backend'], 'postgres');
  assert.equal(res.headers['x-lux-media-variant'], 'hero');
  assert.equal(res.headers['x-lux-media-transform'], 'original');
  assert.ok(!cc.includes('stale-while-revalidate'));
});

test('handleLuxPropertyMedia · invalid width → 400 + no-store', async () => {
  const res = makeRes();
  await handleLuxPropertyMedia(
    makeReq({ property: PROP, attachment: 'att-pub-1', slot: 'hero', variant: 'hero', width: '999' }),
    res,
    makePrismaPublished(),
  );
  assert.equal(res.statusCode, 400);
  assert.match(String(res.headers['cache-control'] || ''), /no-store/);
  assert.equal(res.headers['x-lux-media-backend'], undefined);
});

test('handleLuxPropertyMedia · allowlisted width → 200 (still original bytes)', async () => {
  const res = makeRes();
  await handleLuxPropertyMedia(
    makeReq({ property: PROP, attachment: 'att-pub-1', slot: 'hero', variant: 'hero', width: '768' }),
    res,
    makePrismaPublished(),
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['x-lux-media-source'], 'original');
  assert.equal(res.headers['x-lux-media-backend'], 'postgres');
  assert.equal(res.headers['x-lux-media-transform'], 'original');
});

test('handleLuxPropertyMedia · invalid explicit variant → 400 + no-store', async () => {
  const res = makeRes();
  await handleLuxPropertyMedia(
    makeReq({ property: PROP, attachment: 'att-pub-1', slot: 'hero', variant: 'xlarge' }),
    res,
    makePrismaPublished(),
  );
  assert.equal(res.statusCode, 400);
  assert.match(String(res.headers['cache-control'] || ''), /no-store/);
  assert.equal(res.headers['x-lux-media-backend'], undefined);
});

test('handleLuxPropertyMedia · unpublished link → 404 + no-store', async () => {
  const res = makeRes();
  await handleLuxPropertyMedia(makeReq({ property: PROP, attachment: 'att-u-1', slot: 'hero' }), res, makePrismaUnpublished());
  assert.equal(res.statusCode, 404);
  assert.match(String(res.headers['cache-control'] || ''), /no-store/);
  assert.equal(res.headers['x-lux-media-backend'], undefined);
});

test('handleLuxPropertyMedia · image/jpg content-type normalized to image/jpeg', async () => {
  const buf = Buffer.from([1, 2]);
  const attId = 'att-jpg';
  const ticketId = 'tjpg';
  const consoleJson = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: attId,
          review_status: 'reviewed',
          lifecycle_status: 'active',
          property_links: [
            {
              property_slug: PROP,
              intended_slot: 'hero',
              publish_status: 'published',
            },
          ],
        },
      ],
    },
  };
  const prisma = {
    cmpTicketAttachment: {
      findUnique: async ({ where: { id } }) =>
        id === attId
          ? {
              id: attId,
              ticketId,
              tenantId: 'luxe-maurice',
              contentType: 'image/jpg',
              fileName: 'x.jpg',
              data: buf,
            }
          : null,
    },
    cmpTicket: {
      findUnique: async ({ where: { id } }) =>
        id === ticketId ? { tenantId: 'luxe-maurice', consoleJson } : null,
    },
  };
  const res = makeRes();
  await handleLuxPropertyMedia(makeReq({ property: PROP, attachment: attId, slot: 'hero' }), res, prisma);
  assert.equal(res.statusCode, 200);
  assert.equal(res.headers['content-type'], 'image/jpeg');
  assert.equal(res.headers['x-lux-media-backend'], 'postgres');
  assert.equal(res.headers['x-lux-media-variant'], 'hero');
});

test('handleLuxPropertyMedia · null attachment data after gates → 404 + no-store', async () => {
  const attId = 'att-null-data';
  const ticketId = 't-null';
  const consoleJson = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: attId,
          review_status: 'reviewed',
          lifecycle_status: 'active',
          property_links: [
            {
              property_slug: PROP,
              intended_slot: 'hero',
              publish_status: 'published',
            },
          ],
        },
      ],
    },
  };
  const prisma = {
    cmpTicketAttachment: {
      findUnique: async ({ where: { id } }) =>
        id === attId
          ? {
              id: attId,
              ticketId,
              tenantId: 'luxe-maurice',
              contentType: 'image/png',
              fileName: 'x.png',
              data: null,
            }
          : null,
    },
    cmpTicket: {
      findUnique: async ({ where: { id } }) =>
        id === ticketId ? { tenantId: 'luxe-maurice', consoleJson } : null,
    },
  };
  const res = makeRes();
  await handleLuxPropertyMedia(makeReq({ property: PROP, attachment: attId, slot: 'hero' }), res, prisma);
  assert.equal(res.statusCode, 404);
  assert.match(String(res.headers['cache-control'] || ''), /no-store/);
  assert.equal(res.headers['x-lux-media-backend'], undefined);
});

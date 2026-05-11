import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  buildLuxPropertyMediaListPayload,
  collectPublishedLuxCardMediaByPropertyRefs,
  collectPublishedLuxPropertyMedia,
} from '../lib/server/lux-published-property-media.js';

const PROP = 'lm-phase2d-manual-demo';

function cardLink(opts) {
  return {
    property_slug: PROP,
    property_title: 'Demo',
    intended_slot: 'card',
    linked_at: '2026-01-01T00:00:00.000Z',
    linked_by: 'op',
    link_note: null,
    publish_status: opts.published ? 'published' : 'unpublished',
    published_at: opts.published_at ?? null,
    published_by: opts.published ? 'op' : null,
    public_caption: opts.caption ?? null,
    public_alt_text: opts.alt ?? null,
    unpublished_at: null,
    unpublished_by: null,
  };
}

function galleryLink(opts) {
  return {
    property_slug: PROP,
    property_title: 'Demo',
    intended_slot: 'gallery',
    linked_at: '2026-01-01T00:00:00.000Z',
    linked_by: 'op',
    link_note: null,
    publish_status: opts.published ? 'published' : 'unpublished',
    published_at: opts.published_at ?? null,
    published_by: opts.published ? 'op' : null,
    public_caption: opts.caption ?? null,
    public_alt_text: opts.alt ?? null,
    gallery_order: opts.gallery_order ?? null,
    is_gallery_cover: opts.is_gallery_cover === true,
    unpublished_at: null,
    unpublished_by: null,
  };
}

function heroLink(published) {
  return {
    property_slug: PROP,
    property_title: 'Demo',
    intended_slot: 'hero',
    linked_at: '2026-01-01T00:00:00.000Z',
    linked_by: 'op',
    link_note: null,
    publish_status: published ? 'published' : 'unpublished',
    published_at: published ? '2026-01-02T00:00:00.000Z' : null,
    published_by: published ? 'op' : null,
    public_caption: published ? 'hero cap' : null,
    public_alt_text: published ? 'hero alt' : null,
    unpublished_at: null,
    unpublished_by: null,
  };
}

function makePrisma({ consoleJsonList, attachmentById }) {
  return {
    cmpTicket: {
      findMany: async () => consoleJsonList.map((consoleJson) => ({ consoleJson })),
    },
    cmpTicketAttachment: {
      findUnique: async ({ where: { id } }) => attachmentById[id] || null,
      findMany: async ({ where: { id: { in: ids } } }) => {
        const out = [];
        for (const id of ids) {
          if (attachmentById[id]) out.push(attachmentById[id]);
        }
        return out;
      },
    },
  };
}

test('collectPublishedLuxPropertyMedia excludes unpublished gallery and non-image', async () => {
  const imgOk = { id: 'img1', tenantId: 'luxe-maurice', contentType: 'image/png' };
  const vid = { id: 'vid1', tenantId: 'luxe-maurice', contentType: 'video/mp4' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'img1',
          review_status: 'reviewed',
          content_type: 'image/png',
          media_type: 'image',
          property_links: [
            galleryLink({ published: false, gallery_order: 1 }),
            galleryLink({ published: true, gallery_order: 2, published_at: '2026-01-03T00:00:00.000Z' }),
          ],
        },
        {
          attachment_id: 'vid1',
          review_status: 'reviewed',
          content_type: 'video/mp4',
          media_type: 'video',
          property_links: [galleryLink({ published: true })],
        },
      ],
    },
  };
  const prisma = makePrisma({
    consoleJsonList: [cj],
    attachmentById: { img1: imgOk, vid1: vid },
  });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.equal(r.published_gallery.length, 1);
  assert.match(r.published_gallery[0].src, /slot=gallery/);
});

test('collectPublishedLuxPropertyMedia sorts cover first then gallery_order then published_at', async () => {
  const a = { id: 'ga', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const b = { id: 'gb', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const c = { id: 'gc', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'gc',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [
            galleryLink({
              published: true,
              gallery_order: 1,
              is_gallery_cover: false,
              published_at: '2026-01-01T00:00:00.000Z',
            }),
          ],
        },
        {
          attachment_id: 'gb',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [
            galleryLink({
              published: true,
              gallery_order: 2,
              is_gallery_cover: true,
              published_at: '2026-01-02T00:00:00.000Z',
            }),
          ],
        },
        {
          attachment_id: 'ga',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [
            galleryLink({
              published: true,
              gallery_order: 2,
              is_gallery_cover: false,
              published_at: '2026-01-03T00:00:00.000Z',
            }),
          ],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { ga: a, gb: b, gc: c } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.deepEqual(
    r.published_gallery.map((x) => x.src.split('attachment=')[1].split('&')[0]),
    ['gb', 'gc', 'ga'],
  );
});

test('collectPublishedLuxPropertyMedia excludes pending and rejected', async () => {
  const img = { id: 'i1', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'i1',
          review_status: 'pending_review',
          media_type: 'image',
          property_links: [galleryLink({ published: true })],
        },
        {
          attachment_id: 'i2',
          review_status: 'rejected',
          media_type: 'image',
          property_links: [galleryLink({ published: true })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { i1: img } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.equal(r.published_gallery.length, 0);
});

test('collectPublishedLuxPropertyMedia ignores reference slot for gallery list', async () => {
  const img = { id: 'r1', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'r1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [
            {
              ...galleryLink({ published: true }),
              intended_slot: 'reference',
            },
          ],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { r1: img } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.equal(r.published_gallery.length, 0);
});

test('collectPublishedLuxPropertyMedia hero still works alongside gallery', async () => {
  const heroAtt = { id: 'h1', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const gAtt = { id: 'g1', tenantId: 'luxe-maurice', contentType: 'image/png' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'h1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [heroLink(true)],
        },
        {
          attachment_id: 'g1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [galleryLink({ published: true, caption: 'g', alt: 'ga', gallery_order: 0 })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { h1: heroAtt, g1: gAtt } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.ok(r.published_hero);
  assert.match(r.published_hero.src, /slot=hero/);
  assert.equal(r.published_gallery.length, 1);
  assert.equal(r.published_card, null);
});

test('buildLuxPropertyMediaListPayload items expose only safe keys', async () => {
  const heroAtt = { id: 'h1', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const gAtt = { id: 'g1', tenantId: 'luxe-maurice', contentType: 'image/png' };
  const cAtt = { id: 'c1', tenantId: 'luxe-maurice', contentType: 'image/webp' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'h1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [heroLink(true)],
        },
        {
          attachment_id: 'c1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [cardLink({ published: true, alt: 'card alt' })],
        },
        {
          attachment_id: 'g1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [galleryLink({ published: true, gallery_order: 2 })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { h1: heroAtt, g1: gAtt, c1: cAtt } });
  const payload = await buildLuxPropertyMediaListPayload(prisma, PROP);
  assert.equal(payload.ok, true);
  const allowed = new Set(['slot', 'src', 'public_caption', 'public_alt_text', 'gallery_order', 'is_gallery_cover']);
  for (const it of payload.items) {
    for (const k of Object.keys(it)) {
      assert.ok(allowed.has(k), `unexpected key ${k}`);
    }
    assert.equal('attachment_id' in it, false);
    assert.equal('reviewed_by' in it, false);
    assert.equal('linked_by' in it, false);
  }
  const slots = payload.items.map((x) => x.slot);
  assert.ok(slots.includes('hero'));
  assert.ok(slots.includes('card'));
  assert.ok(slots.includes('gallery'));
});

test('collectPublishedLuxPropertyMedia includes published card image', async () => {
  const cAtt = { id: 'c1', tenantId: 'luxe-maurice', contentType: 'image/png' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'c1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [cardLink({ published: true, alt: 'Card alt text', caption: 'Cap' })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { c1: cAtt } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.ok(r.published_card);
  assert.match(r.published_card.src, /slot=card/);
  assert.equal(r.published_card.alt, 'Card alt text');
  assert.equal(r.published_card.caption, 'Cap');
  assert.equal(r.published_card.intended_slot, 'card');
});

test('collectPublishedLuxPropertyMedia excludes unpublished card link', async () => {
  const cAtt = { id: 'c1', tenantId: 'luxe-maurice', contentType: 'image/png' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'c1',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [cardLink({ published: false })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { c1: cAtt } });
  const r = await collectPublishedLuxPropertyMedia(prisma, PROP);
  assert.equal(r.published_card, null);
});

test('collectPublishedLuxCardMediaByPropertyRefs maps one ref and skips video', async () => {
  const img = { id: 'ci', tenantId: 'luxe-maurice', contentType: 'image/jpeg' };
  const vid = { id: 'cv', tenantId: 'luxe-maurice', contentType: 'video/mp4' };
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'cv',
          review_status: 'reviewed',
          media_type: 'video',
          property_links: [cardLink({ published: true, alt: 'video card first in scan' })],
        },
        {
          attachment_id: 'ci',
          review_status: 'reviewed',
          media_type: 'image',
          property_links: [cardLink({ published: true, alt: 'batch card' })],
        },
      ],
    },
  };
  const prisma = makePrisma({ consoleJsonList: [cj], attachmentById: { ci: img, cv: vid } });
  const m = await collectPublishedLuxCardMediaByPropertyRefs(prisma, [PROP, 'lm-nc-ridge']);
  assert.equal(m.get('lm-phase2d-manual-demo')?.alt, 'batch card');
  assert.equal(m.has('lm-nc-ridge'), false);
  assert.equal(m.size, 1);
});

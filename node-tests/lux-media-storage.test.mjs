import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  getLuxMediaStorageAdapter,
  LUX_MEDIA_STORAGE_BACKEND_POSTGRES,
  readPublishedLuxMediaBytes,
} from '../lib/server/lux-media-storage.js';

test('lux-media-storage · postgres adapter returns bytes + metadata', async () => {
  const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  const r = await readPublishedLuxMediaBytes({
    attachment: { data: bytes, contentType: 'image/png' },
    transformPlan: { variant: 'hero', width: null, shouldTransform: false, source: 'original' },
    requestContext: {
      property_slug: 'lm-phase2d-manual-demo',
      attachment_id: 'a1',
      slot: 'hero',
      variant: 'hero',
      width: null,
    },
  });
  assert.equal(r.ok, true);
  if (!r.ok) return;
  assert.ok(Buffer.isBuffer(r.bytes));
  assert.deepEqual(r.bytes, bytes);
  assert.equal(r.content_type, 'image/png');
  assert.equal(r.byte_size, 4);
  assert.equal(r.storage_backend, LUX_MEDIA_STORAGE_BACKEND_POSTGRES);
  assert.equal(r.transformed, false);
});

test('lux-media-storage · missing bytes → MISSING_BYTES', async () => {
  const r = await readPublishedLuxMediaBytes({
    attachment: { data: null, contentType: 'image/png' },
    transformPlan: { variant: 'hero', width: null, shouldTransform: false, source: 'original' },
    requestContext: {
      property_slug: 'x',
      attachment_id: 'a1',
      slot: 'hero',
      variant: 'hero',
      width: null,
    },
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.error, 'MISSING_BYTES');
});

test('lux-media-storage · shouldTransform true → TRANSFORM_NOT_IMPLEMENTED', async () => {
  const r = await readPublishedLuxMediaBytes({
    attachment: { data: Buffer.from([1]), contentType: 'image/png' },
    transformPlan: { variant: 'hero', width: null, shouldTransform: true, source: 'original' },
    requestContext: {
      property_slug: 'x',
      attachment_id: 'a1',
      slot: 'hero',
      variant: 'hero',
      width: null,
    },
  });
  assert.equal(r.ok, false);
  if (r.ok) return;
  assert.equal(r.error, 'TRANSFORM_NOT_IMPLEMENTED');
});

test('lux-media-storage · getLuxMediaStorageAdapter exposes postgres id', () => {
  const a = getLuxMediaStorageAdapter();
  assert.equal(a.id, 'postgres_attachment_bytes');
});

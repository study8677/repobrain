import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS,
  LUX_ATTACHMENT_INTENDED_USES,
  LUX_ATTACHMENT_PROPERTY_SLOTS,
  LUX_ATTACHMENT_REVIEW_STATUSES,
  appendLuxAttachmentPropertyLinkMessage,
  appendLuxAttachmentPropertyPublishMessage,
  appendLuxAttachmentReviewMessage,
  applyLuxAttachmentPropertyLinkRemove,
  applyLuxAttachmentPropertyLinkSet,
  applyLuxAttachmentPropertyPublish,
  applyLuxAttachmentPropertyUnpublish,
  applyLuxAttachmentReview,
  buildLuxAttachmentEntry,
  clearPublishedGalleryCoversForPropertyOnTicket,
  deriveMediaType,
  normalizeAttachmentIntendedUse,
  normalizeAttachmentNotes,
  normalizeAttachmentReviewStatus,
  normalizeLuxAttachmentLinkNote,
  normalizeLuxAttachmentPropertySlot,
  normalizeLuxGalleryCover,
  normalizeLuxGalleryOrder,
  normalizeReviewNote,
  readLuxAttachmentEntries,
  safeLuxAttachmentShape,
  upsertLuxAttachmentEntry,
} from '../lib/cmp/_lib/lux-request-attachments.js';

test('LUX_ATTACHMENT_REVIEW_STATUSES is a frozen tri-state', () => {
  assert.deepEqual(LUX_ATTACHMENT_REVIEW_STATUSES, ['pending_review', 'reviewed', 'rejected']);
  assert.throws(() => {
    LUX_ATTACHMENT_REVIEW_STATUSES.push('approved');
  });
  assert.equal(LUX_ATTACHMENT_DEFAULT_REVIEW_STATUS, 'pending_review');
});

test('LUX_ATTACHMENT_INTENDED_USES is the agreed allowlist', () => {
  assert.deepEqual(
    LUX_ATTACHMENT_INTENDED_USES,
    ['property_hero', 'property_gallery', 'request_supporting', 'reference_material', 'other'],
  );
});

test('LUX_ATTACHMENT_PROPERTY_SLOTS is the agreed allowlist', () => {
  assert.deepEqual(LUX_ATTACHMENT_PROPERTY_SLOTS, ['hero', 'card', 'detail', 'gallery', 'reference']);
});

test('normalizeAttachmentReviewStatus accepts allowlisted values, rejects others', () => {
  assert.equal(normalizeAttachmentReviewStatus('reviewed'), 'reviewed');
  assert.equal(normalizeAttachmentReviewStatus('  PENDING_REVIEW '), 'pending_review');
  assert.equal(normalizeAttachmentReviewStatus('Rejected'), 'rejected');
  assert.equal(normalizeAttachmentReviewStatus('approved'), null);
  assert.equal(normalizeAttachmentReviewStatus(''), null);
  assert.equal(normalizeAttachmentReviewStatus(null), null);
  assert.equal(normalizeAttachmentReviewStatus(undefined), null);
});

test('normalizeAttachmentIntendedUse normalizes spacing/casing and rejects unknowns', () => {
  assert.equal(normalizeAttachmentIntendedUse('property_hero'), 'property_hero');
  assert.equal(normalizeAttachmentIntendedUse('Property Gallery'), 'property_gallery');
  assert.equal(normalizeAttachmentIntendedUse('reference-material'), 'reference_material');
  assert.equal(normalizeAttachmentIntendedUse('publish_now'), null);
  assert.equal(normalizeAttachmentIntendedUse(''), null);
  assert.equal(normalizeAttachmentIntendedUse(null), null);
});

test('normalizeAttachmentNotes trims and caps length', () => {
  assert.equal(normalizeAttachmentNotes(' hello '), 'hello');
  assert.equal(normalizeAttachmentNotes(''), null);
  assert.equal(normalizeAttachmentNotes(null), null);
  const big = 'x'.repeat(2000);
  assert.equal(normalizeAttachmentNotes(big).length, 1000);
});

test('normalizeLuxAttachmentPropertySlot accepts allowlisted values and normalizes', () => {
  assert.equal(normalizeLuxAttachmentPropertySlot('hero'), 'hero');
  assert.equal(normalizeLuxAttachmentPropertySlot('  GALLERY '), 'gallery');
  assert.equal(normalizeLuxAttachmentPropertySlot('reference'), 'reference');
  assert.equal(normalizeLuxAttachmentPropertySlot('publish_now'), null);
  assert.equal(normalizeLuxAttachmentPropertySlot(''), null);
});

test('normalizeLuxAttachmentLinkNote trims and caps length', () => {
  assert.equal(normalizeLuxAttachmentLinkNote(' hi '), 'hi');
  assert.equal(normalizeLuxAttachmentLinkNote(''), null);
  const big = 'x'.repeat(5000);
  assert.equal(normalizeLuxAttachmentLinkNote(big).length, 600);
});

test('normalizeReviewNote trims and caps length', () => {
  assert.equal(normalizeReviewNote('  ok  '), 'ok');
  assert.equal(normalizeReviewNote(''), null);
  const big = 'y'.repeat(2000);
  assert.equal(normalizeReviewNote(big).length, 1000);
});

test('deriveMediaType buckets common content types', () => {
  assert.equal(deriveMediaType('image/jpeg'), 'image');
  assert.equal(deriveMediaType('IMAGE/PNG'), 'image');
  assert.equal(deriveMediaType('video/mp4'), 'video');
  assert.equal(deriveMediaType('audio/mpeg'), 'audio');
  assert.equal(deriveMediaType('application/pdf'), 'document');
  assert.equal(deriveMediaType('application/zip'), 'other');
  assert.equal(deriveMediaType(''), 'other');
  assert.equal(deriveMediaType(null), 'other');
});

test('buildLuxAttachmentEntry produces a complete operator-only metadata record', () => {
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_123',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 12345,
    intended_use: 'property_hero',
    notes: 'Cliff view, golden hour',
    created_at: '2026-05-08T09:00:00.000Z',
    created_by: 'tenant_session',
  });
  assert.equal(entry.attachment_id, 'att_123');
  assert.equal(entry.file_name, 'hero.jpg');
  assert.equal(entry.content_type, 'image/jpeg');
  assert.equal(entry.byte_size, 12345);
  assert.equal(entry.media_type, 'image');
  assert.equal(entry.intended_use, 'property_hero');
  assert.equal(entry.notes, 'Cliff view, golden hour');
  assert.equal(entry.review_status, 'pending_review');
  assert.equal(entry.review_note, null);
  assert.equal(entry.reviewed_at, null);
  assert.equal(entry.reviewed_by, null);
  assert.deepEqual(entry.property_links, []);
  assert.equal(entry.created_at, '2026-05-08T09:00:00.000Z');
  assert.equal(entry.created_by, 'tenant_session');
});

test('buildLuxAttachmentEntry rejects invalid intended_use silently (null)', () => {
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'x.png',
    content_type: 'image/png',
    byte_size: 1,
    intended_use: 'publish_now',
    notes: null,
  });
  assert.equal(entry.intended_use, null, 'unknown intended_use is dropped, not raised');
});

test('buildLuxAttachmentEntry refuses missing attachment_id', () => {
  assert.throws(() => buildLuxAttachmentEntry({ file_name: 'x.png', content_type: 'image/png' }), /attachment_id required/);
});

test('upsertLuxAttachmentEntry appends a new entry and preserves prior console_json shape', () => {
  const before = {
    locale: 'en',
    parent_programme_ticket: 'cmo8mjijk0000jl04l1jz0v6d',
    request_type: 'property_update',
    priority: 'Normal',
    lux_request_meta: { request_type: 'property_update', attachments: [] },
    messages: [],
    client_view: { workflow_state: 'awaiting_operator_review' },
  };
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    content_type: 'image/jpeg',
    byte_size: 100,
    intended_use: 'property_gallery',
  });
  const after = upsertLuxAttachmentEntry(before, entry);
  // Immutable: original untouched.
  assert.deepEqual(before.lux_request_meta.attachments, []);
  // New: contains exactly the new entry.
  assert.equal(after.lux_request_meta.attachments.length, 1);
  assert.equal(after.lux_request_meta.attachments[0].attachment_id, 'att_1');
  assert.equal(after.lux_request_meta.request_type, 'property_update', 'sibling fields preserved');
  assert.equal(after.locale, 'en', 'top-level fields preserved');
});

test('upsertLuxAttachmentEntry replaces a duplicate by attachment_id (idempotent)', () => {
  const before = {
    lux_request_meta: {
      attachments: [
        { attachment_id: 'att_1', file_name: 'old.jpg', review_status: 'pending_review' },
      ],
    },
  };
  const entry = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'new.jpg',
    content_type: 'image/jpeg',
    byte_size: 1,
  });
  const after = upsertLuxAttachmentEntry(before, entry);
  assert.equal(after.lux_request_meta.attachments.length, 1);
  assert.equal(after.lux_request_meta.attachments[0].file_name, 'new.jpg');
});

test('upsertLuxAttachmentEntry creates lux_request_meta when missing', () => {
  const before = { locale: 'en' };
  const after = upsertLuxAttachmentEntry(
    before,
    buildLuxAttachmentEntry({ attachment_id: 'att_x', file_name: 'x.bin', content_type: 'application/octet-stream', byte_size: 1 }),
  );
  assert.ok(after.lux_request_meta);
  assert.equal(after.lux_request_meta.attachments.length, 1);
});

test('applyLuxAttachmentReview updates status, note, reviewer, time on the matched entry', () => {
  const before = {
    lux_request_meta: {
      attachments: [
        buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 100 }),
        buildLuxAttachmentEntry({ attachment_id: 'att_2', file_name: 'b.mp4', content_type: 'video/mp4', byte_size: 200 }),
      ],
    },
  };
  const result = applyLuxAttachmentReview(before, 'att_2', {
    review_status: 'rejected',
    review_note: 'too dark',
    reviewed_by: '[email protected]',
    reviewed_at: '2026-05-08T09:30:00.000Z',
  });
  assert.equal(result.ok, true);
  assert.equal(result.entry.attachment_id, 'att_2');
  assert.equal(result.entry.review_status, 'rejected');
  assert.equal(result.entry.review_note, 'too dark');
  assert.equal(result.entry.reviewed_by, '[email protected]');
  assert.equal(result.entry.reviewed_at, '2026-05-08T09:30:00.000Z');
  // Other entry untouched.
  assert.equal(result.consoleJson.lux_request_meta.attachments[0].review_status, 'pending_review');
});

test('applyLuxAttachmentReview returns ATTACHMENT_NOT_TRACKED when id is unknown', () => {
  const before = { lux_request_meta: { attachments: [] } };
  const result = applyLuxAttachmentReview(before, 'att_missing', {
    review_status: 'reviewed',
  });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ATTACHMENT_NOT_TRACKED');
});

test('applyLuxAttachmentReview rejects invalid review_status', () => {
  const before = { lux_request_meta: { attachments: [{ attachment_id: 'att_1' }] } };
  const result = applyLuxAttachmentReview(before, 'att_1', { review_status: 'approved' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'INVALID_REVIEW_STATUS');
});

test('applyLuxAttachmentReview rejects empty attachment id', () => {
  const result = applyLuxAttachmentReview({}, '', { review_status: 'reviewed' });
  assert.equal(result.ok, false);
  assert.equal(result.error, 'ATTACHMENT_ID_REQUIRED');
});

test('appendLuxAttachmentReviewMessage adds a structured message and is idempotent', () => {
  const before = { messages: [] };
  const args = {
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    review_status: 'reviewed',
    review_note: 'ok',
    reviewed_by: '[email protected]',
    reviewed_at: '2026-05-08T10:00:00.000Z',
  };
  const after = appendLuxAttachmentReviewMessage(before, args);
  assert.equal(after.messages.length, 1);
  assert.equal(after.messages[0].kind, 'lux_attachment_review');
  assert.equal(after.messages[0].review_status, 'reviewed');
  // Idempotent: same (id, status, at) does not double-write.
  const after2 = appendLuxAttachmentReviewMessage(after, args);
  assert.equal(after2.messages.length, 1);
});

test('safeLuxAttachmentShape returns operator-safe fields and a download_url', () => {
  const dbRow = {
    id: 'att_1',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 1234,
    created_at: new Date('2026-05-08T09:00:00.000Z'),
  };
  const meta = buildLuxAttachmentEntry({
    attachment_id: 'att_1',
    file_name: 'hero.jpg',
    content_type: 'image/jpeg',
    byte_size: 1234,
    intended_use: 'property_hero',
    notes: 'note',
  });
  const shape = safeLuxAttachmentShape(dbRow, meta);
  assert.equal(shape.attachment_id, 'att_1');
  assert.equal(shape.file_name, 'hero.jpg');
  assert.equal(shape.media_type, 'image');
  assert.equal(shape.intended_use, 'property_hero');
  assert.equal(shape.review_status, 'pending_review');
  assert.equal(shape.download_url, '/api/change-attachment/download?id=att_1');
  assert.equal('data' in shape, false, 'never expose raw bytes');
  assert.equal('tenantId' in shape, false, 'never expose internal tenant id');
  assert.ok(Array.isArray(shape.property_links), 'property_links is always an array');
});

test('applyLuxAttachmentPropertyLinkSet enforces reviewed-only and upserts links by (slug, slot)', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
        },
      ],
    },
  };
  const r1 = applyLuxAttachmentPropertyLinkSet(reviewed, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    property_title: 'Phase2D Demo',
    intended_slot: 'hero',
    linked_by: 'op',
    linked_at: '2026-05-09T00:00:00.000Z',
    link_note: 'ok',
  });
  assert.equal(r1.ok, true);
  assert.equal(r1.entry.property_links.length, 1);
  assert.equal(r1.entry.property_links[0].property_slug, 'lm-phase2d-manual-demo');
  assert.equal(r1.entry.property_links[0].intended_slot, 'hero');

  const r2 = applyLuxAttachmentPropertyLinkSet(r1.consoleJson, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    property_title: 'Phase2D Demo',
    intended_slot: 'hero',
    linked_by: 'op2',
    linked_at: '2026-05-09T00:01:00.000Z',
    link_note: 'new note',
  });
  assert.equal(r2.ok, true);
  assert.equal(r2.entry.property_links.length, 1);
  assert.equal(r2.entry.property_links[0].linked_by, 'op2');
  assert.equal(r2.entry.property_links[0].link_note, 'new note');
});

test('applyLuxAttachmentPropertyLinkSet rejects pending/rejected attachments', () => {
  const pending = {
    lux_request_meta: {
      attachments: [
        buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
      ],
    },
  };
  const r = applyLuxAttachmentPropertyLinkSet(pending, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    property_title: 't',
    intended_slot: 'hero',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'REVIEWED_ONLY');
});

test('applyLuxAttachmentPropertyLinkRemove removes only the matching link', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            { property_slug: 'lm-phase2d-manual-demo', property_title: 't', intended_slot: 'hero', linked_at: 'x', linked_by: 'y', link_note: null },
            { property_slug: 'lm-phase2d-manual-demo', property_title: 't', intended_slot: 'gallery', linked_at: 'x', linked_by: 'y', link_note: null },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyLinkRemove(reviewed, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
  });
  assert.equal(r.ok, true);
  assert.equal(r.entry.property_links.length, 1);
  assert.equal(r.entry.property_links[0].intended_slot, 'gallery');
});

test('appendLuxAttachmentPropertyLinkMessage appends and is idempotent', () => {
  const before = { messages: [] };
  const args = {
    action: 'linked',
    at: '2026-05-09T00:00:00.000Z',
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    property_slug: 'lm-phase2d-manual-demo',
    property_title: 't',
    intended_slot: 'hero',
    link_note: 'ok',
    linked_by: 'op',
  };
  const after = appendLuxAttachmentPropertyLinkMessage(before, args);
  assert.equal(after.messages.length, 1);
  assert.equal(after.messages[0].kind, 'lux_attachment_property_link');
  const after2 = appendLuxAttachmentPropertyLinkMessage(after, args);
  assert.equal(after2.messages.length, 1);
});

test('safeLuxAttachmentShape works for legacy uploads with no metadata entry', () => {
  const dbRow = {
    id: 'att_legacy',
    file_name: 'old.pdf',
    content_type: 'application/pdf',
    byte_size: 5,
    created_at: '2026-01-01T00:00:00.000Z',
  };
  const shape = safeLuxAttachmentShape(dbRow, null);
  assert.equal(shape.media_type, 'document');
  assert.equal(shape.review_status, 'pending_review', 'defaults to pending_review when no meta');
  assert.equal(shape.intended_use, null);
  assert.equal(shape.download_url, '/api/change-attachment/download?id=att_legacy');
});

test('applyLuxAttachmentPropertyPublish sets publish fields on matching link', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'hero',
              linked_at: 'x',
              linked_by: 'y',
              link_note: null,
              publish_status: 'unpublished',
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(reviewed, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
    published_by: 'op',
    published_at: '2026-05-10T00:00:00.000Z',
    public_caption: ' cap ',
    public_alt_text: ' alt ',
  });
  assert.equal(r.ok, true);
  const link = r.link;
  assert.equal(link.publish_status, 'published');
  assert.equal(link.published_by, 'op');
  assert.equal(link.public_caption, 'cap');
  assert.equal(link.public_alt_text, 'alt');
});

test('applyLuxAttachmentPropertyPublish rejects pending attachments', () => {
  const pending = {
    lux_request_meta: {
      attachments: [buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 })],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(pending, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'REVIEWED_ONLY');
});

test('applyLuxAttachmentPropertyPublish rejects rejected attachments', () => {
  const rej = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'rejected',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'hero',
              linked_at: 'x',
              linked_by: 'y',
              link_note: null,
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(rej, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'REVIEWED_ONLY');
});

test('applyLuxAttachmentPropertyPublish rejects reviewed attachment without property link', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(reviewed, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'PROPERTY_LINK_NOT_FOUND');
});

test('applyLuxAttachmentPropertyPublish rejects non-image media', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_v', file_name: 'a.mp4', content_type: 'video/mp4', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'gallery',
              linked_at: 'x',
              linked_by: 'y',
              link_note: null,
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(reviewed, 'att_v', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'gallery',
  });
  assert.equal(r.ok, false);
  assert.equal(r.error, 'IMAGE_ONLY');
});

test('applyLuxAttachmentPropertyUnpublish preserves captions and prior publish audit fields', () => {
  const published = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'hero',
              linked_at: 'x',
              linked_by: 'y',
              link_note: null,
              publish_status: 'published',
              published_at: '2026-05-10T00:00:00.000Z',
              published_by: 'op',
              public_caption: 'cap',
              public_alt_text: 'alt',
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyUnpublish(published, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
    unpublished_by: 'op2',
    unpublished_at: '2026-05-10T01:00:00.000Z',
  });
  assert.equal(r.ok, true);
  const link = r.link;
  assert.equal(link.publish_status, 'unpublished');
  assert.equal(link.public_caption, 'cap');
  assert.equal(link.public_alt_text, 'alt');
  assert.equal(link.published_at, '2026-05-10T00:00:00.000Z');
  assert.equal(link.published_by, 'op');
  assert.equal(link.unpublished_by, 'op2');
});

test('appendLuxAttachmentPropertyPublishMessage appends and is idempotent', () => {
  const before = { messages: [] };
  const args = {
    action: 'published',
    at: '2026-05-10T00:00:00.000Z',
    attachment_id: 'att_1',
    file_name: 'a.jpg',
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
    actor: 'smoke',
  };
  const after = appendLuxAttachmentPropertyPublishMessage(before, args);
  assert.equal(after.messages.length, 1);
  assert.equal(after.messages[0].kind, 'lux_attachment_property_publish');
  assert.equal(after.messages[0].message, 'media published');
  const after2 = appendLuxAttachmentPropertyPublishMessage(after, args);
  assert.equal(after2.messages.length, 1);
});

test('readLuxAttachmentEntries safely reads array; returns [] on missing', () => {
  assert.deepEqual(readLuxAttachmentEntries(null), []);
  assert.deepEqual(readLuxAttachmentEntries({}), []);
  assert.deepEqual(readLuxAttachmentEntries({ lux_request_meta: {} }), []);
  assert.deepEqual(readLuxAttachmentEntries({ lux_request_meta: { attachments: 'nope' } }), []);
  const list = [
    { attachment_id: 'att_1', file_name: 'a' },
    { not_an_attachment: true },
    { attachment_id: '', file_name: 'b' },
  ];
  const filtered = readLuxAttachmentEntries({ lux_request_meta: { attachments: list } });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].attachment_id, 'att_1');
});

test('normalizeLuxGalleryOrder accepts integers in range and rejects overflow', () => {
  assert.equal(normalizeLuxGalleryOrder(0), 0);
  assert.equal(normalizeLuxGalleryOrder('  42 '), 42);
  assert.equal(normalizeLuxGalleryOrder(9999), 9999);
  assert.equal(normalizeLuxGalleryOrder(10000), null);
  assert.equal(normalizeLuxGalleryOrder(-1), null);
  assert.equal(normalizeLuxGalleryOrder('x'), null);
  assert.equal(normalizeLuxGalleryOrder(null), null);
});

test('normalizeLuxGalleryCover parses common truthy forms', () => {
  assert.equal(normalizeLuxGalleryCover(true), true);
  assert.equal(normalizeLuxGalleryCover(1), true);
  assert.equal(normalizeLuxGalleryCover('true'), true);
  assert.equal(normalizeLuxGalleryCover(false), false);
  assert.equal(normalizeLuxGalleryCover(undefined), false);
});

test('clearPublishedGalleryCoversForPropertyOnTicket clears other published covers', () => {
  const cj = {
    lux_request_meta: {
      attachments: [
        {
          attachment_id: 'a1',
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-x',
              intended_slot: 'gallery',
              publish_status: 'published',
              is_gallery_cover: true,
            },
          ],
        },
        {
          attachment_id: 'a2',
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-x',
              intended_slot: 'gallery',
              publish_status: 'published',
              is_gallery_cover: false,
            },
          ],
        },
      ],
    },
  };
  clearPublishedGalleryCoversForPropertyOnTicket(cj, 'lm-x', 'a2');
  assert.equal(cj.lux_request_meta.attachments[0].property_links[0].is_gallery_cover, false);
  assert.equal(cj.lux_request_meta.attachments[1].property_links[0].is_gallery_cover, false);
});

test('applyLuxAttachmentPropertyPublish gallery sets order and cover; clears other published covers', () => {
  const base = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'g1', file_name: '1.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'gallery',
              linked_at: 'x',
              linked_by: 'y',
              publish_status: 'published',
              published_at: '2026-01-01T00:00:00.000Z',
              published_by: 'first',
              is_gallery_cover: true,
              gallery_order: 1,
            },
          ],
        },
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'g2', file_name: '2.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'gallery',
              linked_at: 'x',
              linked_by: 'y',
              publish_status: 'unpublished',
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(base, 'g2', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'gallery',
    published_by: 'op',
    gallery_order: 5,
    is_gallery_cover: true,
    public_caption: ' B ',
    public_alt_text: ' alt2 ',
  });
  assert.equal(r.ok, true);
  const att1 = r.consoleJson.lux_request_meta.attachments.find((a) => a.attachment_id === 'g1');
  const att2 = r.consoleJson.lux_request_meta.attachments.find((a) => a.attachment_id === 'g2');
  assert.equal(att1.property_links[0].is_gallery_cover, false);
  assert.equal(att2.property_links[0].is_gallery_cover, true);
  assert.equal(att2.property_links[0].gallery_order, 5);
  assert.equal(att2.property_links[0].public_caption, 'B');
});

test('applyLuxAttachmentPropertyPublish hero does not write gallery_order onto link', () => {
  const reviewed = {
    lux_request_meta: {
      attachments: [
        {
          ...buildLuxAttachmentEntry({ attachment_id: 'att_1', file_name: 'a.jpg', content_type: 'image/jpeg', byte_size: 1 }),
          review_status: 'reviewed',
          property_links: [
            {
              property_slug: 'lm-phase2d-manual-demo',
              property_title: 't',
              intended_slot: 'hero',
              linked_at: 'x',
              linked_by: 'y',
              publish_status: 'unpublished',
              gallery_order: null,
              is_gallery_cover: false,
            },
          ],
        },
      ],
    },
  };
  const r = applyLuxAttachmentPropertyPublish(reviewed, 'att_1', {
    property_slug: 'lm-phase2d-manual-demo',
    intended_slot: 'hero',
    gallery_order: 99,
    is_gallery_cover: true,
  });
  assert.equal(r.ok, true);
  assert.equal(r.link.gallery_order, null);
  assert.equal(r.link.is_gallery_cover, false);
});

test('safeLuxAttachmentShape maps gallery_order and is_gallery_cover on property_links', () => {
  const dbRow = { id: 'att_x', file_name: 'x.jpg', content_type: 'image/jpeg', byte_size: 1 };
  const meta = {
    attachment_id: 'att_x',
    review_status: 'reviewed',
    property_links: [
      {
        property_slug: 'lm-phase2d-manual-demo',
        property_title: 't',
        intended_slot: 'gallery',
        publish_status: 'published',
        gallery_order: '3',
        is_gallery_cover: true,
      },
    ],
  };
  const s = safeLuxAttachmentShape(dbRow, meta);
  assert.equal(s.property_links[0].gallery_order, 3);
  assert.equal(s.property_links[0].is_gallery_cover, true);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { isLuxPropertyEditorSession } from '../lib/server/lux-property-editor-access.js';
import { luxListingAdminSave, luxListingAdminSetVisibility } from '../lib/server/lux-listing-admin-service.js';
import {
  assertLuxPublicMediaPropertyRef,
  fetchLuxListingDraftPreviewRow,
  resolveLuxPropertyRefForAttachmentLink,
} from '../lib/server/lux-listing-published-query.js';

test('lux property editor: allowlist + tenant + username', () => {
  assert.equal(
    isLuxPropertyEditorSession({
      typ: 'tenant',
      tenant_id: 'luxe-maurice',
      username: 'jan@luxemaurice.com',
    }),
    true,
  );
  assert.equal(
    isLuxPropertyEditorSession({
      typ: 'tenant',
      tenant_id: 'luxe-maurice',
      username: 'anton@corpflowai.com',
    }),
    true,
  );
  assert.equal(
    isLuxPropertyEditorSession({
      typ: 'tenant',
      tenant_id: 'luxe-maurice',
      username: 'someone@example.com',
    }),
    false,
  );
  assert.equal(
    isLuxPropertyEditorSession({ typ: 'tenant', tenant_id: 'other', username: 'jan@luxemaurice.com' }),
    false,
  );
  assert.equal(isLuxPropertyEditorSession({ typ: 'tenant', tenant_id: 'luxe-maurice' }), false);
  assert.equal(isLuxPropertyEditorSession({ typ: 'tenant', tenant_id: 'luxe-maurice', username: '' }), false);
  assert.equal(isLuxPropertyEditorSession({ typ: 'pin', tenant_id: 'luxe-maurice', username: 'jan@luxemaurice.com' }), false);
});

test('lux listing admin save: always uses fixed tenant id (no client tenant_id)', async () => {
  let createdTenant = '';
  const prisma = {
    luxListing: {
      create: async ({ data }) => {
        createdTenant = data.tenantId;
        return {
          ...data,
          id: 'new-id',
          highlightsJson: data.highlightsJson,
          visibilityStatus: data.visibilityStatus,
          publishedAt: data.publishedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdById: data.createdById,
          updatedById: data.updatedById,
        };
      },
    },
  };
  const out = await luxListingAdminSave(
    prisma,
    {
      slug: 'lm-test-tenant-lock',
      title: 'T',
      region_label: 'R',
      property_type: 'Villa',
      tenant_id: 'evil-tenant',
      visibility_status: 'draft',
    },
    { userId: 'u1', username: 'jan@luxemaurice.com' },
  );
  assert.equal(out.ok, true);
  assert.equal(createdTenant, 'luxe-maurice');
});

test('lux listing admin save: create draft does not set publishedAt', async () => {
  const prisma = {
    luxListing: {
      create: async ({ data }) => ({
        id: 'id1',
        slug: data.slug,
        title: data.title,
        regionLabel: data.regionLabel,
        propertyType: data.propertyType,
        listingStatus: data.listingStatus,
        priceRange: data.priceRange,
        shortTeaser: data.shortTeaser,
        description: data.description,
        highlightsJson: data.highlightsJson,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        areaSqm: data.areaSqm,
        visibilityStatus: data.visibilityStatus,
        publishedAt: data.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: data.createdById,
        updatedById: data.updatedById,
      }),
    },
  };
  const out = await luxListingAdminSave(
    prisma,
    { slug: 'lm-draft-only', title: 'T', region_label: 'R', property_type: 'Villa', visibility_status: 'draft' },
    { userId: null, username: 'jan@luxemaurice.com' },
  );
  assert.equal(out.ok, true);
  assert.equal(out.listing.visibility_status, 'draft');
  assert.equal(out.listing.published_at, null);
});

test('lux listing admin set-visibility: preview clears publishedAt', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where, select }) => {
        if (where.id === 'x' && select.publishedAt) return { publishedAt: new Date('2026-01-01T00:00:00.000Z') };
        if (where.id === 'x' && select.id) return { id: 'x' };
        return null;
      },
      update: async ({ data, select }) => ({
        id: 'x',
        slug: 'lm-x',
        title: 'T',
        regionLabel: 'R',
        propertyType: 'Villa',
        listingStatus: null,
        priceRange: null,
        shortTeaser: null,
        description: '',
        highlightsJson: [],
        bedrooms: null,
        bathrooms: null,
        areaSqm: null,
        visibilityStatus: data.visibilityStatus,
        publishedAt: data.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        updatedById: data.updatedById,
      }),
    },
  };
  const out = await luxListingAdminSetVisibility(prisma, { id: 'x', visibility_status: 'preview' }, { userId: 'u' });
  assert.equal(out.ok, true);
  assert.equal(out.listing.visibility_status, 'preview');
  assert.equal(out.listing.published_at, null);
});

test('lux listing admin set-visibility: published sets publishedAt when missing', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where, select }) => {
        if (where.id === 'y') {
          if (select.publishedAt) return { publishedAt: null };
          if (select.id) return { id: 'y' };
        }
        return null;
      },
      update: async ({ data }) => ({
        id: 'y',
        slug: 'lm-y',
        title: 'T',
        regionLabel: 'R',
        propertyType: 'Villa',
        listingStatus: null,
        priceRange: null,
        shortTeaser: null,
        description: '',
        highlightsJson: [],
        bedrooms: null,
        bathrooms: null,
        areaSqm: null,
        visibilityStatus: data.visibilityStatus,
        publishedAt: data.publishedAt,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdById: null,
        updatedById: null,
      }),
    },
  };
  const out = await luxListingAdminSetVisibility(prisma, { id: 'y', visibility_status: 'published' }, { userId: 'u' });
  assert.equal(out.ok, true);
  assert.equal(out.listing.visibility_status, 'published');
  assert.ok(out.listing.published_at);
});

test('assertLuxPublicMediaPropertyRef: draft Postgres slug is blocked', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        assert.equal(where.tenantId, 'luxe-maurice');
        assert.equal(where.slug, 'lm-draft');
        assert.equal(where.visibilityStatus, 'published');
        return null;
      },
    },
  };
  const r = await assertLuxPublicMediaPropertyRef(prisma, 'lm-draft');
  assert.equal(r.ok, false);
});

test('assertLuxPublicMediaPropertyRef: published Postgres slug is allowed', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        assert.equal(where.visibilityStatus, 'published');
        return { slug: 'lm-pub' };
      },
    },
  };
  const r = await assertLuxPublicMediaPropertyRef(prisma, 'lm-pub');
  assert.equal(r.ok, true);
  assert.equal(r.refLower, 'lm-pub');
});

test('resolveLuxPropertyRefForAttachmentLink: draft row still resolves for media wiring', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        assert.equal(where.visibilityStatus.not, 'archived');
        return {
          slug: 'lm-draft-media',
          title: 'D',
          regionLabel: 'North',
          propertyType: 'Villa',
          listingStatus: null,
          priceRange: null,
          shortTeaser: null,
          description: 'x',
          highlightsJson: [],
        };
      },
    },
  };
  const ref = await resolveLuxPropertyRefForAttachmentLink(prisma, 'lm-draft-media');
  assert.ok(ref);
  assert.equal(ref.ref, 'lm-draft-media');
});

test('fetchLuxListingDraftPreviewRow: only draft/preview', async () => {
  let capturedWhere;
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        capturedWhere = where;
        return { slug: 'lm-prev', title: 'T', regionLabel: 'R', propertyType: 'V', listingStatus: null, priceRange: null, shortTeaser: null, description: '', highlightsJson: [] };
      },
    },
  };
  const row = await fetchLuxListingDraftPreviewRow(prisma, 'lm-prev');
  assert.ok(row);
  assert.deepEqual(capturedWhere.visibilityStatus.in, ['draft', 'preview']);
});

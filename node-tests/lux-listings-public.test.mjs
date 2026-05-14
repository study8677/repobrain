import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeLuxListingSlugQuery, tryHandleLuxListingsPublicRead } from '../lib/server/lux-listings-public.js';

test('normalizeLuxListingSlugQuery', () => {
  assert.equal(normalizeLuxListingSlugQuery(' LM-Demo-1 '), 'lm-demo-1');
  assert.equal(normalizeLuxListingSlugQuery('../x'), '');
  assert.equal(normalizeLuxListingSlugQuery(''), '');
});

test('lux listings: wrong host → 404 JSON', async () => {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = v;
    },
    statusCode: 200,
    ended: '',
    end(s) {
      this.ended = s;
    },
  };
  const req = { method: 'GET', query: {}, corpflowContext: { surface: 'tenant', tenant_id: 'other' } };
  const prisma = {};
  const handled = await tryHandleLuxListingsPublicRead(req, res, prisma, 'lux/listings');
  assert.equal(handled, true);
  assert.equal(res.statusCode, 404);
});

test('lux listings: list published only', async () => {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = v;
    },
    statusCode: 200,
    ended: '',
    end(s) {
      this.ended = s;
    },
  };
  const req = { method: 'GET', query: {}, corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' } };
  const prisma = {
    luxListing: {
      findMany: async ({ where, orderBy, select }) => {
        assert.equal(where.tenantId, 'luxe-maurice');
        assert.equal(where.visibilityStatus, 'published');
        assert.ok(Array.isArray(orderBy));
        assert.ok(select.slug);
        return [
          {
            slug: 'lm-db-one',
            title: 'Villa One',
            regionLabel: 'North',
            propertyType: 'Villa',
            listingStatus: 'Private preview',
            priceRange: 'On request',
            shortTeaser: 'Teaser',
            highlightsJson: ['A', 'B'],
            bedrooms: 4,
            bathrooms: 3,
            areaSqm: 220,
            publishedAt: new Date('2026-05-01T00:00:00.000Z'),
          },
        ];
      },
    },
  };
  const handled = await tryHandleLuxListingsPublicRead(req, res, prisma, 'lux/listings');
  assert.equal(handled, true);
  assert.equal(res.statusCode, 200);
  const j = JSON.parse(res.ended);
  assert.equal(j.ok, true);
  assert.equal(j.listings.length, 1);
  assert.equal(j.listings[0].slug, 'lm-db-one');
  assert.deepEqual(j.listings[0].highlights, ['A', 'B']);
});

test('lux listing: missing slug → 400', async () => {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = v;
    },
    statusCode: 200,
    ended: '',
    end(s) {
      this.ended = s;
    },
  };
  const req = { method: 'GET', query: {}, corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' } };
  const handled = await tryHandleLuxListingsPublicRead(req, res, { luxListing: {} }, 'lux/listing');
  assert.equal(handled, true);
  assert.equal(res.statusCode, 400);
});

test('lux listing: get by slug', async () => {
  const res = {
    headers: {},
    setHeader(k, v) {
      this.headers[String(k).toLowerCase()] = v;
    },
    statusCode: 200,
    ended: '',
    end(s) {
      this.ended = s;
    },
  };
  const req = {
    method: 'GET',
    query: { slug: 'lm-db-one' },
    corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' },
  };
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        assert.equal(where.slug, 'lm-db-one');
        assert.equal(where.visibilityStatus, 'published');
        return {
          slug: 'lm-db-one',
          title: 'Villa One',
          regionLabel: 'North',
          propertyType: 'Villa',
          listingStatus: 'Private preview',
          priceRange: null,
          shortTeaser: null,
          description: 'Long copy',
          highlightsJson: [],
          bedrooms: null,
          bathrooms: null,
          areaSqm: null,
          mediaRefsJson: [{ kind: 'hero', ref: 'x' }],
          publishedAt: null,
        };
      },
    },
  };
  const handled = await tryHandleLuxListingsPublicRead(req, res, prisma, 'lux/listing');
  assert.equal(handled, true);
  const j = JSON.parse(res.ended);
  assert.equal(j.ok, true);
  assert.equal(j.listing.description, 'Long copy');
  assert.equal(j.listing.media_refs.length, 1);
});

test('lux listings: unknown path → not handled', async () => {
  const handled = await tryHandleLuxListingsPublicRead(
    { method: 'GET', query: {}, corpflowContext: { surface: 'tenant', tenant_id: 'luxe-maurice' } },
    {},
    {},
    'lux/other',
  );
  assert.equal(handled, false);
});

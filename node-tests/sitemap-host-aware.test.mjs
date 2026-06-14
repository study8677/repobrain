import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import sitemapPage, { __testing__ } from '../pages/sitemap.xml.js';

const { isLuxHost, buildEntries, renderSitemap, APEX_PATHS, LUX_PROPERTY_REFS } = __testing__;

describe('sitemap.xml / isLuxHost', () => {
  it('matches the canonical Lux host', () => {
    assert.equal(isLuxHost('lux.corpflowai.com'), true);
  });

  it('matches www.lux + the luxe.* aliases', () => {
    assert.equal(isLuxHost('www.lux.corpflowai.com'), true);
    assert.equal(isLuxHost('luxe.corpflowai.com'), true);
    assert.equal(isLuxHost('www.luxe.corpflowai.com'), true);
  });

  it('does not match the apex or arbitrary hosts', () => {
    assert.equal(isLuxHost('corpflowai.com'), false);
    assert.equal(isLuxHost('www.corpflowai.com'), false);
    assert.equal(isLuxHost('core.corpflowai.com'), false);
    assert.equal(isLuxHost('example.com'), false);
    assert.equal(isLuxHost(''), false);
    assert.equal(isLuxHost(null), false);
    assert.equal(isLuxHost(undefined), false);
  });
});

describe('sitemap.xml / buildEntries', () => {
  it('returns apex entries for apex / unknown host', () => {
    const { paths, today } = buildEntries('corpflowai.com');
    assert.match(today, /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(paths.length, APEX_PATHS.length);
    for (const e of paths) {
      assert.match(e.loc, /^https:\/\/corpflowai\.com/);
    }
  });

  it('returns lux entries for the lux host', () => {
    const { paths } = buildEntries('lux.corpflowai.com');
    // 2 static lux paths + N property refs
    assert.equal(paths.length, 2 + LUX_PROPERTY_REFS.length);
    for (const e of paths) {
      assert.match(e.loc, /^https:\/\/lux\.corpflowai\.com/);
    }
  });

  it('returns lux entries for the luxe.* alias too', () => {
    const { paths } = buildEntries('luxe.corpflowai.com');
    // Lux sitemap shape: 2 static lux paths + N property refs (currently 0 per
    // the C3 placeholder cleanup; grows back to 1+ when Jan's first real C2
    // opportunity slug is appended to LUX_PROPERTY_REFS).
    assert.equal(paths.length, 2 + LUX_PROPERTY_REFS.length);
    assert.match(paths[0].loc, /^https:\/\/lux\.corpflowai\.com/);
  });

  it('falls back to apex for empty host', () => {
    const { paths } = buildEntries('');
    assert.equal(paths.length, APEX_PATHS.length);
  });
});

describe('sitemap.xml / renderSitemap', () => {
  it('produces a valid XML document with the expected wrapper', () => {
    const xml = renderSitemap(
      [{ loc: 'https://example.com/', priority: '1.0' }],
      '2026-05-24'
    );
    assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n/);
    assert.match(xml, /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/);
    assert.match(xml, /<loc>https:\/\/example\.com\/<\/loc>/);
    assert.match(xml, /<lastmod>2026-05-24<\/lastmod>/);
    assert.match(xml, /<priority>1\.0<\/priority>/);
    assert.match(xml, /<\/urlset>\n$/);
  });

  it('joins multiple url blocks with newlines and no trailing comma', () => {
    const xml = renderSitemap(
      [
        { loc: 'https://example.com/a', priority: '0.6' },
        { loc: 'https://example.com/b', priority: '0.6' },
      ],
      '2026-01-01'
    );
    const urlBlocks = xml.match(/<url>/g);
    assert.equal(urlBlocks?.length, 2);
    assert.ok(!xml.includes('</url><url>'));
  });
});

describe('sitemap.xml / default export', () => {
  it('returns null because Next.js writes XML directly in getServerSideProps', () => {
    assert.equal(typeof sitemapPage, 'function');
    assert.equal(sitemapPage(), null);
  });
});

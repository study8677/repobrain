/**
 * Host-aware sitemap (Packet 4.1 / Lux SEO fix).
 *
 * Returns a minimal, fast-changing-safe sitemap for the request host:
 * - apex / unknown host → CorpFlowAI public marketing routes.
 * - lux.corpflowai.com (and luxe.* aliases) → Luxurious Mauritius public routes.
 *
 * Why dynamic instead of `public/sitemap.xml`:
 * - Static files in /public are served from every host with identical contents.
 * - Per-host sitemaps are the recommended Search Console pattern (Section §6.2
 *   of `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`).
 *
 * Updated by hand when public marketing routes change (or when the property
 * catalog grows beyond what's listed here). No tenant data fetched at
 * request time — entries are static lists per host. This keeps the sitemap
 * free of any tenant-private state and predictable for Search Console.
 *
 * Read-only — no DB calls, no tenant data, no analytics events.
 */

function normalizeHost(req) {
  try {
    const raw = (req?.headers?.['x-forwarded-host'] || req?.headers?.host || '').toString();
    return raw.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  } catch {
    return '';
  }
}

const APEX_PATHS = [
  '/',
  '/lead-rescue',
  '/lead-rescue/property-mauritius',
  '/about',
  '/process',
  '/standards',
  '/onboarding',
];

const LUX_STATIC_PATHS = ['/', '/concierge'];

const LUX_PROPERTY_REFS = [
  'lm-nc-ridge',
  'lm-villa-belombre',
  'lm-pent-plateau',
  'lm-pipeline-q4',
  'lm-phase2d-manual-demo',
  'lxf-grand-baie-apt',
  'lxf-tamarin-villa',
  'lxf-poste-lafayette',
];

function isLuxHost(host) {
  if (!host) return false;
  return (
    host === 'lux.corpflowai.com' ||
    host === 'www.lux.corpflowai.com' ||
    host === 'luxe.corpflowai.com' ||
    host === 'www.luxe.corpflowai.com'
  );
}

function buildEntries(host) {
  const today = new Date().toISOString().split('T')[0];
  if (isLuxHost(host)) {
    const base = 'https://lux.corpflowai.com';
    const paths = [
      ...LUX_STATIC_PATHS.map((p) => ({ loc: base + p, priority: p === '/' ? '1.0' : '0.7' })),
      ...LUX_PROPERTY_REFS.map((ref) => ({ loc: `${base}/property/${ref}`, priority: '0.8' })),
    ];
    return { paths, today };
  }
  const base = 'https://corpflowai.com';
  return {
    paths: APEX_PATHS.map((p) => ({ loc: base + p, priority: p === '/' ? '1.0' : '0.6' })),
    today,
  };
}

function renderSitemap(entries, today) {
  const urlBlocks = entries
    .map(
      (e) =>
        `  <url>\n    <loc>${e.loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${e.priority}</priority>\n  </url>`
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlBlocks}\n</urlset>\n`;
}

function SitemapPage() {
  return null;
}

export async function getServerSideProps({ req, res }) {
  const host = normalizeHost(req);
  const { paths, today } = buildEntries(host);
  const xml = renderSitemap(paths, today);
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600');
  res.write(xml);
  res.end();
  return { props: {} };
}

// Test-only helpers (named exports). These do not affect the SSR contract.
export const __testing__ = {
  isLuxHost,
  buildEntries,
  renderSitemap,
  APEX_PATHS,
  LUX_STATIC_PATHS,
  LUX_PROPERTY_REFS,
};

export default SitemapPage;

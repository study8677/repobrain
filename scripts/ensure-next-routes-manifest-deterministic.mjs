/**
 * Vercel sometimes expects `.next/routes-manifest-deterministic.json`.
 * Next produces `.next/routes-manifest.json`.
 *
 * Keep this narrowly scoped to unblock production deploys without reintroducing
 * any `public/` static export or copied-HTML workarounds.
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const nextDir = path.join(root, '.next');
const src = path.join(nextDir, 'routes-manifest.json');
const dest = path.join(nextDir, 'routes-manifest-deterministic.json');

try {
  if (fs.existsSync(dest)) {
    console.log('ensure-next-routes-manifest-deterministic: exists');
    process.exit(0);
  }
  if (!fs.existsSync(src)) {
    console.warn('ensure-next-routes-manifest-deterministic: missing src', src);
    process.exit(0);
  }
  fs.copyFileSync(src, dest);
  console.log('ensure-next-routes-manifest-deterministic: wrote', path.relative(root, dest));
} catch (e) {
  // Non-fatal: if this fails we want the real build error to be visible.
  console.warn('ensure-next-routes-manifest-deterministic: failed', String(e?.message || e));
  process.exit(0);
}


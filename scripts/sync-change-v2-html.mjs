/**
 * After `next build`, copy the prerendered Change Console v2 shell into `public/`
 * so Vercel static + rewrite routing can serve `/change-v2` (same pattern as `/change` → `change.html`).
 */
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const src = path.join(root, '.next', 'server', 'pages', 'change-v2.html');
const destDir = path.join(root, 'public');
const dest = path.join(destDir, 'change-v2.html');

if (!existsSync(src)) {
  console.error('sync-change-v2-html: missing', src, '(run next build first)');
  process.exit(1);
}
mkdirSync(destDir, { recursive: true });
copyFileSync(src, dest);
console.log('sync-change-v2-html: copied to public/change-v2.html');

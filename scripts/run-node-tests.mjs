/**
 * Cross-platform test entry: Windows shells often do not expand `node-tests/*.mjs`.
 * Collects all `*.mjs` files under node-tests/ and runs `node --test` on them.
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const dir = path.join(root, 'node-tests');
const files = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.mjs'))
  .map((f) => path.join(dir, f))
  .sort();

const r = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit', cwd: root });
process.exit(r.status ?? 1);

/**
 * One-shot encoder for the CorpFlowAI homepage production visuals.
 *
 * Source PNGs are produced ad-hoc by the image-generation tooling and
 * stored outside the repo. This script:
 *
 *   1. reads the source PNGs from a known input directory,
 *   2. emits responsive optimized WebP files into
 *      `public/assets/visuals/`,
 *   3. logs the final byte size of every output so the operator can
 *      verify Lighthouse-friendly weight before committing.
 *
 * It is idempotent — re-running it overwrites the same output files
 * with the same bytes (modulo encoder non-determinism).
 *
 * Run:
 *   node scripts/encode-homepage-visuals.mjs --input <dir>
 *
 * `sharp` is already installed transitively via `next`; we don't add
 * it to package.json explicitly because the homepage assets are
 * encoded once and committed as binaries — no build-time encoding.
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, mkdirSync, statSync } from 'node:fs';

import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'assets', 'visuals');

function parseArgs(argv) {
  const out = { input: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--input' && argv[i + 1]) {
      out.input = argv[++i];
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
if (!args.input) {
  console.error('Usage: node scripts/encode-homepage-visuals.mjs --input <dir-with-pngs>');
  process.exit(2);
}

if (!existsSync(OUT_DIR)) {
  mkdirSync(OUT_DIR, { recursive: true });
}

/**
 * Each entry: source filename → list of `{ width, suffix, quality }`
 * encoder targets. The intent: generate a sensible responsive set
 * without bloating the repo. Mobile and desktop sizes only; we are
 * not building an art-direction matrix.
 */
const TARGETS = {
  'corpflow-homepage-hero.png': {
    outputBase: 'corpflow-homepage-hero',
    sizes: [
      { width: 1920, suffix: '-1920', quality: 80 },
      { width: 1280, suffix: '-1280', quality: 80 },
      { width: 768, suffix: '-768', quality: 78 },
    ],
  },
  'corpflow-homepage-social.png': {
    outputBase: 'corpflow-homepage-social',
    sizes: [
      // Open-graph cards are typically rendered at 1200x630; we keep
      // a single optimized output at that exact spec, plus a smaller
      // in-page fallback for device-pixel scaling control.
      { width: 1200, suffix: '', quality: 82 },
    ],
  },
};

async function encodeOne(inputPath, outputPath, width, quality) {
  await sharp(inputPath)
    .resize({ width, withoutEnlargement: true })
    .webp({ quality, effort: 6 })
    .toFile(outputPath);
}

function bytes(p) {
  try {
    return statSync(p).size;
  } catch {
    return 0;
  }
}

async function main() {
  for (const [srcName, spec] of Object.entries(TARGETS)) {
    const src = path.join(args.input, srcName);
    if (!existsSync(src)) {
      console.error(`[encode] missing source: ${src}`);
      process.exitCode = 1;
      continue;
    }
    const sourceBytes = bytes(src);
    console.log(`[encode] ${srcName}  (${(sourceBytes / 1024).toFixed(1)} KB source PNG)`);
    for (const t of spec.sizes) {
      const outName = `${spec.outputBase}${t.suffix}.webp`;
      const out = path.join(OUT_DIR, outName);
      await encodeOne(src, out, t.width, t.quality);
      const outBytes = bytes(out);
      console.log(`         → ${outName}  ${(outBytes / 1024).toFixed(1)} KB  (w=${t.width}, q=${t.quality})`);
    }
  }
}

main().catch((err) => {
  console.error('[encode] fatal:', err && err.stack ? err.stack : err);
  process.exit(1);
});

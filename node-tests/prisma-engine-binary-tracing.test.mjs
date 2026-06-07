/**
 * Static regression tests pinning the Prisma query engine binary tracing
 * contract on Vercel deployments.
 *
 * Background (2026-06-07):
 *   After PR #323 (`fix(build): switch off Turbopack to bypass
 *   _clientMiddlewareManifest 404`) restored React hydration on
 *   `/admin/lead-rescue/[id]` (the Save handler now mounts), the next live
 *   failure was a 500 on PATCH with a Prisma error:
 *
 *     Invalid `prisma.lead.findUnique()` invocation:
 *     Engine is not yet connected.
 *     Backtrace [{ fn: "start_thread" }, { fn: "__clone" }]
 *
 *   Diagnostic facts captured at the time:
 *     - `production-pulse/runtime` returned `database_reachable: true`
 *       → Neon was reachable, not provider drift (`db.prisma.io` not in
 *         play; per `docs/operations/POSTGRES_PROVIDER.md` §4b drift
 *         fingerprint).
 *     - `lux.corpflowai.com/api/tenant/site` returned `tenant_id:
 *       luxe-maurice` → tenant resolution worked, so GET-path Prisma calls
 *       on the same function bundle could reach the DB.
 *     - The `save-wiring-v2` diagnostic panel showed `Save handler mounted:
 *       YES` and the deployed commit matched the merge SHA of PR #323
 *       → the failure was on the *server* PATCH call, not the client.
 *     - The error wording (`Engine is not yet connected`) + Linux thread
 *       spawn backtrace + recent build-system switch (Turbopack → Webpack)
 *       is the documented signature of Vercel's serverless bundler failing
 *       to include `libquery_engine-rhel-openssl-3.0.x.so.node` in a
 *       function's output. See:
 *         - https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel
 *         - https://github.com/prisma/prisma/issues/22142
 *         - https://github.com/prisma/prisma/discussions/19499
 *
 * What this PR fixes (and what these tests pin):
 *
 *   1. Next.js Webpack build: `next.config.mjs` registers
 *      `@prisma/nextjs-monorepo-workaround-plugin` so the engine binary +
 *      schema are added to every `.nft.json` trace emitted by Next for
 *      pages routes that import Prisma (e.g. `/admin/lead-rescue/[id]`'s
 *      `getServerSideProps`).
 *
 *   2. Vercel-native function: `api/factory_router.js` lives *outside*
 *      `pages/api/` and is processed directly by Vercel's `@vercel/nft`,
 *      not by Next.js. The PrismaPlugin cannot help that bundle, so
 *      `vercel.json` `functions["api/factory_router.js"].includeFiles`
 *      explicitly globs `node_modules/.prisma/client/**` into the
 *      function output.
 *
 *   3. The workaround plugin is declared as a normal `dependency` (not a
 *      `devDependency`) in `package.json` so Vercel build picks it up.
 *
 * Strategic follow-up (NOT in scope of these tests):
 *   - Prisma 6.16+ supports `engineType = "client"` + driver adapter
 *     (`@prisma/adapter-pg` / `@prisma/adapter-neon`) which eliminates the
 *     binary entirely. That is the recommended long-term direction per
 *     Prisma docs and matches Neon-only routing. See
 *     `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` for the planned
 *     migration path.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function readJson(rel) {
  return JSON.parse(read(rel));
}

describe('Prisma engine binary tracing — next.config.mjs', () => {
  it('next.config.mjs exists at the repo root', () => {
    const p = path.join(REPO_ROOT, 'next.config.mjs');
    assert.ok(fs.existsSync(p), 'next.config.mjs must exist so the PrismaPlugin can be registered');
  });

  it('next.config.mjs imports PrismaPlugin from the workaround package', () => {
    const src = read('next.config.mjs');
    assert.match(
      src,
      /from\s+['"]@prisma\/nextjs-monorepo-workaround-plugin['"]/,
      'next.config.mjs must import from @prisma/nextjs-monorepo-workaround-plugin',
    );
    assert.match(
      src,
      /\b(?:import\s*\{\s*PrismaPlugin\s*\}|PrismaPlugin\s+as\s+\w+)/,
      'next.config.mjs must import the PrismaPlugin symbol',
    );
  });

  it('next.config.mjs uses PrismaPlugin inside a webpack config function', () => {
    const src = read('next.config.mjs');
    assert.match(src, /webpack\s*:\s*\(/, 'next.config.mjs must export a webpack config function');
    assert.match(
      src,
      /new\s+PrismaPlugin\(/,
      'next.config.mjs must instantiate `new PrismaPlugin(...)`',
    );
    assert.match(
      src,
      /\bisServer\b/,
      'next.config.mjs should gate plugin registration on `isServer` (client bundle does not need the engine)',
    );
  });
});

describe('Prisma engine binary tracing — vercel.json factory_router include', () => {
  it('vercel.json declares functions["api/factory_router.js"].includeFiles', () => {
    const v = readJson('vercel.json');
    assert.ok(v.functions, 'vercel.json must have a `functions` key');
    const fn = v.functions['api/factory_router.js'];
    assert.ok(
      fn && typeof fn === 'object',
      'vercel.json `functions` must declare `api/factory_router.js`',
    );
    assert.ok(
      typeof fn.includeFiles === 'string' && fn.includeFiles.trim() !== '',
      '`functions["api/factory_router.js"].includeFiles` must be a non-empty glob string',
    );
  });

  it('the include glob targets the Prisma client output directory', () => {
    const v = readJson('vercel.json');
    const glob = v.functions['api/factory_router.js'].includeFiles;
    assert.match(
      glob,
      /node_modules\/\.prisma\/client/,
      `includeFiles glob must reference node_modules/.prisma/client (got: ${glob})`,
    );
  });
});

describe('Prisma engine binary tracing — package.json dependency placement', () => {
  it('@prisma/nextjs-monorepo-workaround-plugin is a normal dependency (not devDependency)', () => {
    const pkg = readJson('package.json');
    const dep = pkg.dependencies && pkg.dependencies['@prisma/nextjs-monorepo-workaround-plugin'];
    assert.ok(
      typeof dep === 'string' && dep.trim() !== '',
      '`@prisma/nextjs-monorepo-workaround-plugin` must be in `dependencies` (Vercel build needs it at build time)',
    );
    const devDep =
      pkg.devDependencies && pkg.devDependencies['@prisma/nextjs-monorepo-workaround-plugin'];
    assert.equal(
      devDep,
      undefined,
      '`@prisma/nextjs-monorepo-workaround-plugin` must NOT be only in devDependencies',
    );
  });
});

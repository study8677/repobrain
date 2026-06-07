/**
 * Next.js config.
 *
 * The single reason this file exists is to register
 * `@prisma/nextjs-monorepo-workaround-plugin` against Next's Webpack build so
 * that Vercel's serverless function tracing includes the Prisma query engine
 * native binary (`libquery_engine-rhel-openssl-3.0.x.so.node`) in *every*
 * serverless function output — not only the ones whose static analysis happens
 * to walk to it.
 *
 * Symptom this fixes (live-observed 2026-06-07 on `lux.corpflowai.com` and
 * `core.corpflowai.com` after PR #323 switched the build off Turbopack):
 *
 *   `Invalid \`prisma.lead.findUnique()\` invocation: Engine is not yet
 *    connected. Backtrace [{ fn: "start_thread" }, { fn: "__clone" }]`
 *
 * That signature is the Prisma engine binary being absent (or partially
 * traced) from a specific serverless function bundle on Vercel — not a Neon
 * provider drift (production-pulse confirmed `database_reachable: true` at
 * the time of the failure) and not a React hydration issue (the
 * `save-wiring-v2` diagnostic panel confirmed `handlerMounted: YES`). See
 * `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § "Root cause" for the
 * full incident timeline (PR #319 → #320 → #321 → #322 → #323 → this PR).
 *
 * References:
 *   - https://www.prisma.io/docs/orm/v6/prisma-client/deployment/serverless/deploy-to-vercel
 *   - https://github.com/prisma/prisma/issues/22142
 *   - https://github.com/prisma/prisma/discussions/19499
 *
 * We deliberately keep the rest of this config empty so we do not introduce
 * other behavioural changes alongside the fix.
 */

import { PrismaPlugin } from '@prisma/nextjs-monorepo-workaround-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.plugins = config.plugins || [];
      config.plugins.push(new PrismaPlugin());
    }
    return config;
  },
};

export default nextConfig;

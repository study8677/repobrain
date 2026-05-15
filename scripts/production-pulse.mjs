/**
 * Production Pulse v1 — control-plane readiness for ops / n8n.
 *
 * - Library: `buildProductionPulseV1Report(prisma)` (no secret values; booleans + bounded HTTP metadata).
 * - CLI: `node scripts/production-pulse.mjs` with `--url` or `CORPFLOW_FACTORY_HEALTH_URL` / `FACTORY_HEALTH_URL`.
 *
 * @see docs/operations/PRODUCTION_PULSE_V1.md
 */
import { pathToFileURL } from 'node:url';
import { Prisma } from '@prisma/client';
import { cfg, runtimeConfigDiagnostics } from '../lib/server/runtime-config.js';

function deploymentReadinessSlice() {
  const rcFull = runtimeConfigDiagnostics();
  const postgresOk = Boolean(String(cfg('POSTGRES_URL', '')).trim());
  const sessionOk = Boolean(String(cfg('SOVEREIGN_SESSION_SECRET', '')).trim());
  const adminPin = String(cfg('ADMIN_PIN', '')).trim();
  const adminPw = String(cfg('CORPFLOW_ADMIN_PASSWORD', '')).trim();
  const adminHash = String(cfg('CORPFLOW_ADMIN_PASSWORD_HASH', '')).trim();
  const adminOperatorReady = Boolean(adminPin || adminPw || adminHash);
  const runtimeJsonOk = !rcFull.present || rcFull.parse_ok === true;
  const deployment_ready = postgresOk && sessionOk && adminOperatorReady && runtimeJsonOk;

  const coreRaw = cfg('CORPFLOW_CORE_HOSTS', '').trim();
  const coreHostCount = coreRaw
    ? coreRaw.split(',').map((s) => s.trim()).filter(Boolean).length
    : 0;
  const factoryHealthUrlConfigured = Boolean(
    String(cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || cfg('FACTORY_HEALTH_URL', '')).trim(),
  );
  const monitoring_ready = deployment_ready && coreHostCount > 0 && factoryHealthUrlConfigured;

  return {
    deployment_ready,
    checks: {
      database_configured: postgresOk,
      sovereign_session_configured: sessionOk,
      admin_operator_ready: adminOperatorReady,
      runtime_config_valid: runtimeJsonOk,
      core_hosts_configured: coreHostCount > 0,
      factory_health_url_configured: factoryHealthUrlConfigured,
    },
    monitoring_ready,
    runtime_config_summary: {
      present: rcFull.present,
      parse_ok: rcFull.parse_ok,
      key_count: Array.isArray(rcFull.keys) ? rcFull.keys.length : 0,
    },
  };
}

/**
 * @param {string} [input] — site origin or full `/api/factory/health` URL
 * @returns {string}
 */
export function resolveProductionPulseRuntimeUrl(input) {
  const s = String(input || '').trim();
  if (!s) return '';
  const low = s.toLowerCase();
  if (low.endsWith('/api/factory/production-pulse/runtime')) return s;
  if (low.endsWith('/api/factory/health')) {
    return `${s.slice(0, s.length - '/api/factory/health'.length)}/api/factory/production-pulse/runtime`;
  }
  const base = s.replace(/\/+$/, '');
  return `${base}/api/factory/production-pulse/runtime`;
}

/**
 * @param {import('@prisma/client').PrismaClient | null | undefined} prisma
 * @returns {Promise<Record<string, unknown>>}
 */
export async function buildProductionPulseV1Report(prisma) {
  const slice = deploymentReadinessSlice();

  let database_reachable = null;
  if (prisma && typeof prisma.$queryRaw === 'function') {
    try {
      await prisma.$queryRaw(Prisma.sql`SELECT 1`);
      database_reachable = true;
    } catch {
      database_reachable = false;
    }
  }

  const tenantUrl = String(cfg('CORPFLOW_PRODUCTION_PULSE_TENANT_URL', '')).trim();
  const tenant_optional = {
    label: 'optional_luxe_marketing_surface',
    hint: 'Optional GET to a tenant marketing origin; records HTTP status only (no response body). Never substitutes core readiness.',
    configured: Boolean(tenantUrl),
    http_status: null,
    ok: null,
    error: null,
  };

  if (tenantUrl) {
    try {
      const href = tenantUrl.includes('://') ? tenantUrl : `https://${tenantUrl}`;
      const u = new URL(href);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(u.toString(), {
        method: 'GET',
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { Accept: 'text/html,application/json', 'User-Agent': 'CorpFlow-ProductionPulse/1' },
      });
      clearTimeout(timer);
      tenant_optional.http_status = res.status;
      tenant_optional.ok = res.ok;
    } catch (e) {
      tenant_optional.http_status = null;
      tenant_optional.ok = false;
      tenant_optional.error = e instanceof Error ? e.name : 'fetch_failed';
    }
  }

  const hint =
    slice.deployment_ready && slice.monitoring_ready
      ? 'Deployment and monitoring chain signals are green.'
      : slice.deployment_ready
        ? 'Deployment signals green; add CORPFLOW_CORE_HOSTS and CORPFLOW_FACTORY_HEALTH_URL for full monitoring readiness.'
        : 'See core.checks and align with GET /api/factory/health expectations.';

  return {
    schema: 'corpflow.production_pulse.v1',
    version: 1,
    ok: slice.deployment_ready,
    deployment_ready: slice.deployment_ready,
    monitoring: {
      ok: slice.monitoring_ready,
      checks: {
        core_hosts_configured: slice.checks.core_hosts_configured,
        factory_health_url_configured: slice.checks.factory_health_url_configured,
      },
    },
    core: {
      ...slice.checks,
      database_reachable,
    },
    runtime_presence: {
      factory_pulse_route: 'GET /api/factory/production-pulse/runtime',
      factory_health_route: 'GET /api/factory/health',
    },
    tenant_optional,
    hint,
  };
}

async function runCli() {
  const i = process.argv.indexOf('--url');
  const explicit = i >= 0 && process.argv[i + 1] ? String(process.argv[i + 1]).trim() : '';
  const fromEnv = resolveProductionPulseRuntimeUrl(
    cfg('CORPFLOW_FACTORY_HEALTH_URL', '') || cfg('FACTORY_HEALTH_URL', ''),
  );
  const url = explicit || fromEnv;
  if (!url) {
    console.error(
      'Missing URL: pass --url https://core.corpflowai.com/api/factory/production-pulse/runtime\n' +
        'or set CORPFLOW_FACTORY_HEALTH_URL (site origin or full /api/factory/health URL).',
    );
    process.exit(2);
  }
  const r = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    redirect: 'follow',
    signal: AbortSignal.timeout(25000),
  });
  const text = await r.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    console.error('Non-JSON response', r.status);
    console.error(text.slice(0, 500));
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
  const ok = json && typeof json === 'object' && json.ok === true;
  process.exit(ok ? 0 : 1);
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  runCli().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

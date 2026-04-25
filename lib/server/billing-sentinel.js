import { spawnSync } from 'child_process';
import path from 'path';

import { verifyCronBearerAuth } from './factory-master-auth.js';
import { cfg } from './runtime-config.js';

// Vercel serverless functions run with `process.cwd()` at the repo root (`/var/task`).
// Avoid `import.meta.url` so this file can run under CJS-wrapped runtimes too.
const REPO_ROOT = path.resolve(process.cwd());
const DEFAULT_TIMEOUT_MS = 15_000;

/** @type {typeof spawnSync} */
let _spawnSync = spawnSync;

// Narrow test seam: lets node-tests stub spawn without adding extra deps.
export function __setSpawnSyncForTests(fn) {
  _spawnSync = fn;
}

function boolEnvTrue(v) {
  return String(v || '')
    .trim()
    .toLowerCase() === 'true';
}

function lowCostModeEnabled() {
  return boolEnvTrue(cfg('LOW_COST_MODE', '')) || boolEnvTrue(cfg('CORPFLOW_LOW_COST_MODE', ''));
}

function timeoutMs() {
  const raw = Number.parseInt(String(cfg('BILLING_SENTINEL_TIMEOUT_MS', DEFAULT_TIMEOUT_MS)), 10);
  if (!Number.isFinite(raw)) return DEFAULT_TIMEOUT_MS;
  return Math.min(120_000, Math.max(1_000, raw));
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!verifyCronBearerAuth(req)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (lowCostModeEnabled()) {
    return res.status(200).json({ ok: true, skipped: true, reason: 'low_cost_mode' });
  }

  const scriptPath = path.join(REPO_ROOT, 'core', 'services', 'billing_sentinel.py');
  const timeout = timeoutMs();
  const result = _spawnSync('python', [scriptPath], {
    encoding: 'utf8',
    timeout,
    killSignal: 'SIGTERM',
    maxBuffer: 1_000_000,
  });

  if (result.error) {
    if (result.error && result.error.code === 'ETIMEDOUT') {
      return res.status(504).json({ ok: false, error: 'billing_sentinel_timeout', timeout_ms: timeout });
    }
    return res.status(500).json({ ok: false, error: String(result.error.message || result.error) });
  }
  if (result.status !== 0) {
    return res.status(500).json({
      ok: false,
      error: 'billing_sentinel_failed',
      stderr: String(result.stderr || '').slice(0, 800),
    });
  }

  let payload = {};
  try {
    payload = JSON.parse(String(result.stdout || '{}'));
  } catch (_) {
    payload = { raw: String(result.stdout || '').slice(0, 800) };
  }

  return res.status(200).json({ ok: true, sentinel: payload });
}


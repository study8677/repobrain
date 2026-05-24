#!/usr/bin/env node
/**
 * Post a Telegram alert summarising a factory-control-loop run.
 *
 * Designed for use from `.github/workflows/factory-control-loop.yml` as the
 * post-failure step. Mirrors the contract of `lib/server/ops-alerts.js`
 * (`sendTelegramOpsAlert`) — same env names, same JSON API call shape, same
 * 3500-char cap — but lives in `scripts/` so CI does not have to load any
 * runtime server module (no Prisma, no `lib/server/runtime-config.js`).
 *
 * Usage (from CI):
 *   node scripts/post-control-loop-telegram-alert.mjs <path-to-loop.json>
 *
 * Required env (read from process.env directly, never logged):
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_ALERT_CHAT_ID
 *
 * Optional env:
 *   GH_RUN_URL     — full URL of the failing GitHub Actions run (rendered into the alert body).
 *   GH_RUN_NUMBER  — short numeric run id (rendered into the alert body).
 *   GH_REPO_NAME   — owner/repo slug (rendered into the alert body).
 *
 * Exit codes:
 *   0 — alert posted, OR secrets unset (best-effort, do not break CI further).
 *   1 — secrets present but Telegram POST failed; CI surfaces this as the alert step itself failing,
 *       which leaves the workflow's primary failure intact and adds a second visible failure for the
 *       alert. Use sparingly — usually we prefer to swallow.
 *
 * Security:
 *   - Never echoes TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID values.
 *   - Only logs Telegram API `ok` + `description` (never the response body verbatim).
 *   - Never includes the raw loop JSON in the alert body — only a short fixes summary.
 */

import { readFileSync, existsSync } from 'node:fs';
import { argv, env, exit, stdout } from 'node:process';

const STR = (v) => (v == null ? '' : String(v).trim());

/**
 * Build the alert message text from a parsed control-loop report.
 * Pure function — exported for unit testing.
 *
 * @param {{
 *   loop: object | null,
 *   runUrl?: string,
 *   runNumber?: string|number,
 *   repoName?: string
 * }} input
 * @returns {string}
 */
export function buildAlertText({ loop, runUrl, runNumber, repoName }) {
  const lines = [];
  const head = [];
  const ref = STR(repoName) || 'repo';
  const num = STR(runNumber);
  if (num) {
    head.push(`CorpFlowAI alert: factory control loop FAILED on ${ref} (run #${num}).`);
  } else {
    head.push(`CorpFlowAI alert: factory control loop FAILED on ${ref}.`);
  }
  head.push('Recommended action: open the GitHub run, fix the first "!" line in the Actions section.');
  if (STR(runUrl)) head.push(`Evidence: ${STR(runUrl)}`);
  lines.push(head.join(' '));

  if (!loop || typeof loop !== 'object') {
    lines.push('(no parsable loop.json — control loop produced no machine-readable summary)');
    return lines.join('\n').slice(0, 3500);
  }

  // Factory health one-liner.
  const f = loop.factory || {};
  if (f.skipped) {
    lines.push(`factory: skipped (${STR(f.reason).slice(0, 200) || 'no health URL'})`);
  } else {
    const failed = Array.isArray(f.failedChecks) && f.failedChecks.length
      ? ` failed_checks=${f.failedChecks.slice(0, 6).join(',')}`
      : '';
    lines.push(`factory: ok=${f.factoryOk === true} http=${STR(f.httpStatus) || '?'} url=${STR(f.url) || '(none)'}${failed}`);
  }

  // Vercel SHA compare one-liner.
  const v = loop.vercel || {};
  if (v.skipped) {
    lines.push(`vercel: skipped (${STR(v.reason).slice(0, 160) || 'token/project unset'})`);
  } else if (v.error) {
    lines.push(`vercel: error ${STR(v.error).slice(0, 200)}`);
  } else {
    lines.push(`vercel: state=${STR(v.readyState) || '?'} sha=${STR(v.githubCommitSha).slice(0, 7) || '(none)'}`);
  }

  // vercel.json cron guard.
  const c = loop.cron || {};
  if (c.skipped) {
    lines.push(`cron: skipped (${STR(c.reason).slice(0, 160) || 'no vercel.json'})`);
  } else if (c.ok) {
    lines.push('cron: ok (Hobby-safe)');
  } else {
    const errs = Array.isArray(c.errors) ? c.errors.slice(0, 3).join('; ') : '';
    lines.push(`cron: FAIL ${errs.slice(0, 200)}`);
  }

  // Top fix-level actions (the actionable items).
  const actions = Array.isArray(loop.actions) ? loop.actions : [];
  const fixes = actions.filter((a) => a && a.level === 'fix').slice(0, 5);
  if (fixes.length) {
    lines.push('top fixes:');
    for (const a of fixes) {
      lines.push(`• ${STR(a.text).slice(0, 240)}`);
    }
  }

  return lines.join('\n').slice(0, 3500);
}

/**
 * Best-effort POST to the Telegram Bot API.
 *
 * @param {{ token: string, chatId: string, text: string }} input
 * @returns {Promise<{ posted: boolean, status?: number, ok?: boolean, description?: string|null, error?: string }>}
 */
export async function postTelegramAlert({ token, chatId, text }) {
  const t = STR(token);
  const cid = STR(chatId);
  const body = STR(text);
  if (!t || !cid || !body) {
    return { posted: false, error: 'missing token/chatId/text' };
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15000);
  try {
    const res = await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: cid, text: body }),
      signal: ac.signal,
    });
    let parsed = null;
    try {
      parsed = await res.json();
    } catch {
      parsed = null;
    }
    return {
      posted: true,
      status: res.status,
      ok: parsed && typeof parsed.ok === 'boolean' ? parsed.ok : null,
      description: parsed && typeof parsed.description === 'string' ? parsed.description : null,
    };
  } catch (e) {
    return { posted: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const loopPath = STR(argv[2]) || 'loop.json';
  let loop = null;
  if (existsSync(loopPath)) {
    try {
      loop = JSON.parse(readFileSync(loopPath, 'utf8'));
    } catch {
      loop = null;
    }
  }

  const token = STR(env.TELEGRAM_BOT_TOKEN);
  const chatId = STR(env.TELEGRAM_ALERT_CHAT_ID);
  if (!token || !chatId) {
    stdout.write('telegram-alert: secrets unset — skipping (TELEGRAM_BOT_TOKEN and TELEGRAM_ALERT_CHAT_ID).\n');
    return;
  }

  const text = buildAlertText({
    loop,
    runUrl: STR(env.GH_RUN_URL),
    runNumber: STR(env.GH_RUN_NUMBER),
    repoName: STR(env.GH_REPO_NAME),
  });

  const result = await postTelegramAlert({ token, chatId, text });
  if (!result.posted) {
    stdout.write(`telegram-alert: NOT posted (${STR(result.error).slice(0, 200)}).\n`);
    exit(1);
  }
  stdout.write(`telegram-alert: posted status=${result.status} ok=${result.ok} description=${STR(result.description).slice(0, 200) || '(none)'}\n`);
}

const isDirectInvocation = (() => {
  try {
    const url = new URL(argv[1] || '', 'file://');
    return url.pathname.endsWith('/post-control-loop-telegram-alert.mjs');
  } catch {
    return false;
  }
})();

if (isDirectInvocation) {
  main().catch((e) => {
    stdout.write(`telegram-alert: unexpected error ${e instanceof Error ? e.message : String(e)}\n`);
    exit(1);
  });
}

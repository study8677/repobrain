import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildAlertText,
  postTelegramAlert,
} from '../scripts/post-control-loop-telegram-alert.mjs';

describe('post-control-loop-telegram-alert / buildAlertText', () => {
  it('builds a header with repo + run number when both are present', () => {
    const text = buildAlertText({
      loop: null,
      runUrl: 'https://github.com/owner/repo/actions/runs/123',
      runNumber: '42',
      repoName: 'owner/repo',
    });
    assert.match(text, /CorpFlowAI alert: factory control loop FAILED on owner\/repo \(run #42\)\./);
    assert.match(text, /Recommended action: open the GitHub run/);
    assert.match(text, /Evidence: https:\/\/github\.com\/owner\/repo\/actions\/runs\/123/);
  });

  it('falls back gracefully when loop is null (no parsable JSON)', () => {
    const text = buildAlertText({ loop: null });
    assert.match(text, /factory control loop FAILED on repo/);
    assert.match(text, /no parsable loop\.json/);
  });

  it('renders factory section as ok when factoryOk is true', () => {
    const text = buildAlertText({
      loop: {
        factory: {
          skipped: false,
          factoryOk: true,
          httpStatus: 200,
          url: 'https://core.example.com/api/factory/health',
          failedChecks: [],
        },
        vercel: { skipped: true, reason: 'no token' },
        cron: { skipped: true, reason: 'no vercel.json' },
      },
    });
    assert.match(text, /factory: ok=true http=200 url=https:\/\/core\.example\.com\/api\/factory\/health/);
    assert.doesNotMatch(text, /failed_checks/);
  });

  it('renders factory failed_checks when present', () => {
    const text = buildAlertText({
      loop: {
        factory: {
          skipped: false,
          factoryOk: false,
          httpStatus: 200,
          url: 'https://core.example.com/api/factory/health',
          failedChecks: ['database_configured', 'sovereign_session_configured', 'admin_operator_ready'],
        },
        vercel: { skipped: true },
        cron: { skipped: true },
      },
    });
    assert.match(text, /failed_checks=database_configured,sovereign_session_configured,admin_operator_ready/);
  });

  it('renders factory section as skipped when health URL absent', () => {
    const text = buildAlertText({
      loop: { factory: { skipped: true, reason: 'no health URL' }, vercel: { skipped: true }, cron: { skipped: true } },
    });
    assert.match(text, /factory: skipped \(no health URL\)/);
  });

  it('renders vercel deployment state and short SHA when present', () => {
    const text = buildAlertText({
      loop: {
        factory: { skipped: true },
        vercel: {
          skipped: false,
          readyState: 'READY',
          githubCommitSha: 'abcdef1234567890',
        },
        cron: { skipped: true },
      },
    });
    assert.match(text, /vercel: state=READY sha=abcdef1/);
  });

  it('renders vercel error when api fetch failed', () => {
    const text = buildAlertText({
      loop: {
        factory: { skipped: true },
        vercel: { skipped: false, error: 'Vercel API 401: unauthorized' },
        cron: { skipped: true },
      },
    });
    assert.match(text, /vercel: error Vercel API 401: unauthorized/);
  });

  it('renders cron failure with first error lines', () => {
    const text = buildAlertText({
      loop: {
        factory: { skipped: true },
        vercel: { skipped: true },
        cron: { skipped: false, ok: false, errors: ['cron[0] schedule "*/5 * * * *" violates Hobby once-per-day rule'] },
      },
    });
    assert.match(text, /cron: FAIL cron\[0\] schedule "\*\/5 \* \* \* \*" violates Hobby once-per-day rule/);
  });

  it('renders top fixes (capped at 5) when actions[].level === fix', () => {
    const fixes = Array.from({ length: 8 }, (_, i) => ({ level: 'fix', text: `fix #${i}` }));
    const text = buildAlertText({
      loop: {
        factory: { skipped: true },
        vercel: { skipped: true },
        cron: { skipped: true },
        actions: [...fixes, { level: 'ok', text: 'all fine' }, { level: 'info', text: 'note' }],
      },
    });
    assert.match(text, /top fixes:/);
    for (let i = 0; i < 5; i += 1) assert.match(text, new RegExp(`• fix #${i}`));
    assert.doesNotMatch(text, /fix #5\b/);
    assert.doesNotMatch(text, /fix #6\b/);
    assert.doesNotMatch(text, /all fine/);
  });

  it('caps total length at 3500 chars (matches lib/server/ops-alerts.js convention)', () => {
    const longFix = 'A'.repeat(2000);
    const text = buildAlertText({
      loop: {
        factory: { skipped: true },
        vercel: { skipped: true },
        cron: { skipped: true },
        actions: [
          { level: 'fix', text: longFix },
          { level: 'fix', text: longFix },
        ],
      },
    });
    assert.ok(text.length <= 3500, `expected <=3500, got ${text.length}`);
  });

  it('does not include any literal "TELEGRAM" or "VERCEL_TOKEN" string from input fields', () => {
    // Guard against future regressions where someone leaks env names into the alert body.
    const text = buildAlertText({
      loop: {
        factory: { skipped: false, factoryOk: false, httpStatus: 500, url: 'https://x.example.com/api/factory/health', failedChecks: [] },
        vercel: { skipped: false, readyState: 'ERROR', githubCommitSha: 'badc0ffee0' },
        cron: { skipped: true },
        actions: [{ level: 'fix', text: 'Vercel production deployment does not match origin/main.' }],
      },
      runUrl: 'https://github.com/x/y/actions/runs/1',
      runNumber: '7',
      repoName: 'x/y',
    });
    assert.doesNotMatch(text, /TELEGRAM_BOT_TOKEN/);
    assert.doesNotMatch(text, /TELEGRAM_ALERT_CHAT_ID/);
    assert.doesNotMatch(text, /VERCEL_TOKEN/);
    assert.doesNotMatch(text, /VERCEL_PROJECT_ID/);
  });
});

describe('post-control-loop-telegram-alert / postTelegramAlert', () => {
  it('returns posted=false with error when token/chatId/text are empty (no fetch attempted)', async () => {
    const r = await postTelegramAlert({ token: '', chatId: '', text: '' });
    assert.equal(r.posted, false);
    assert.match(String(r.error || ''), /missing token\/chatId\/text/);
  });

  it('returns posted=false with error when text is empty', async () => {
    const r = await postTelegramAlert({ token: 'tok', chatId: 'cid', text: '   ' });
    assert.equal(r.posted, false);
    assert.match(String(r.error || ''), /missing token\/chatId\/text/);
  });

  it('does not throw when fetch is mocked to error', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => { throw new Error('network down'); };
    try {
      const r = await postTelegramAlert({ token: 'tok', chatId: 'cid', text: 'hello' });
      assert.equal(r.posted, false);
      assert.match(String(r.error || ''), /network down/);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('returns posted=true with status + ok when fetch returns valid response', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, init) => {
      assert.match(String(url), /https:\/\/api\.telegram\.org\/bot/);
      assert.equal(init && init.method, 'POST');
      assert.equal(init && init.headers && init.headers['Content-Type'], 'application/json');
      const body = JSON.parse(String(init && init.body));
      assert.equal(body.chat_id, 'cid');
      assert.equal(body.text, 'hello');
      return {
        status: 200,
        json: async () => ({ ok: true, result: { message_id: 42 } }),
      };
    };
    try {
      const r = await postTelegramAlert({ token: 'tok', chatId: 'cid', text: 'hello' });
      assert.equal(r.posted, true);
      assert.equal(r.status, 200);
      assert.equal(r.ok, true);
    } finally {
      globalThis.fetch = realFetch;
    }
  });

  it('handles non-JSON Telegram responses gracefully', async () => {
    const realFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ status: 502, json: async () => { throw new Error('not json'); } });
    try {
      const r = await postTelegramAlert({ token: 'tok', chatId: 'cid', text: 'hello' });
      assert.equal(r.posted, true);
      assert.equal(r.status, 502);
      assert.equal(r.ok, null);
      assert.equal(r.description, null);
    } finally {
      globalThis.fetch = realFetch;
    }
  });
});

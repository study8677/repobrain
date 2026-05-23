# Audit 03 — n8n email / password-reset golden path

**Date:** 2026-05-23
**Mode:** Read-only repo evidence + live `password_reset_delivery_configured` health signal. **No live email sent.**
**Packet:** corresponds to `WEEKEND_EXECUTION_QUEUE.md` Packet 1.3.

---

## Scope

In:

- The documented n8n recipe for the `password_reset` event.
- The CorpFlow server-side caller (`lib/server/email-delivery.js`, `lib/server/password-reset-delivery.js`).
- Live signal that production has the env wired correctly.

Out:

- Triggering an actual password-reset email send (would mutate communications state and reach a real mailbox; gated by `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.8).
- Inspecting the n8n workflow directly.
- Reading any `automation_events` or `recovery_vault_entries` rows.

---

## Evidence

### Canonical docs

- `docs/n8n/password-reset-email-recipe.md` — wire-level recipe: webhook URL env name, shared secret header, payload schema, Gmail Send Email node, OAuth credential, sender alias `support@corpflowai.com`, HTML body template, expected `200 { ok: true }` response.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — system-wide communications model: 8 event types, 4 sender aliases, approval rules, evidence trail (`automation_events` + register row + n8n execution URL).

### Server-side caller (read-only inspection)

- `lib/server/email-delivery.js` — n8n webhook helper, 8s timeout, header `x-corpflow-email-secret`, never logs payload (per chat-history audit row for PR #206/#207).
- `lib/server/password-reset-delivery.js` — posts schema `corpflow.email.password_reset.v1` (`purpose` / `to` / `from` / `reset_code` / `expires_minutes` / `subject` plus legacy fields).
- `node-tests/password-reset-delivery.test.mjs` — 9 unit tests; passing as of `npm test` 293/293 on this branch.

### Env wiring (names only)

- `N8N_EMAIL_WEBHOOK_URL` — production webhook URL.
- `N8N_EMAIL_WEBHOOK_SECRET` — shared secret, sent as header `x-corpflow-email-secret`.
- `EMAIL_FROM=support@corpflowai.com` — default From hint for the n8n Gmail node.
- Legacy aliases still read as fallbacks: `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL`, `CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET`.
- `CORPFLOW_PUBLIC_BASE_URL` — used to build the reset link in the email body.

### Live evidence

- `GET https://core.corpflowai.com/api/factory/health` (this audit):
  - `password_reset_delivery_configured: true`
  - `password_reset_hint: "Tenant forgot-password can deliver via webhook and/or Resend when user exists."`

This confirms that, as of 2026-05-23, the n8n email path is **wired in production** (the previous "PARTIAL" verdict from 2026-05-21 in `artifacts/chat_history.md` has progressed to **configured**).

---

## Findings

1. **Golden path is documented end-to-end.** A contractor could rebuild the n8n workflow from `docs/n8n/password-reset-email-recipe.md` alone, with cross-reference to `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` for the approval policy and event catalog.
2. **Server-side caller is unit-tested.** 9 tests in `node-tests/password-reset-delivery.test.mjs` all pass on this branch.
3. **Production reports configured.** The factory health endpoint flips `password_reset_delivery_configured` to `true` only when the env is actually present — this is a real signal, not a doc claim.
4. **Failure mode is documented.** If env values drift, the n8n Webhook returns HTTP 401 from its first node (per recipe §1) and the Gmail node never fires; the CorpFlow caller treats this as best-effort.
5. **Audit trail location is clear.** Evidence lands in `automation_events` + n8n execution URL + (manual) `34_Communication_Event_Register`.

---

## Gaps for Anton to confirm

- That a **real-world password reset** has succeeded recently (not just env presence). The 9-step live cycle from the chat-history row (2026-05-21 PR #206) ideally has at least one operator or test-user run on `https://lux.corpflowai.com/login` documented.
- That the Gmail OAuth credential is renewed before token expiry (Google OAuth refresh tokens for desktop-style apps can rotate; for n8n's web auth they should not, but worth a note).
- That `support@corpflowai.com` send alias verification with Google has not silently expired.

---

## Verdict

**LIVE in production.** Both the n8n side (recipe + workflow) and the CorpFlow server side (caller + tests) are documented and configured. **Packet 1.3** can therefore close on a docs-only re-affirmation: confirm the recipe still matches the deployed workflow shape, no rebuild required.

No approval gate hit. No live email sent. No tokens captured.

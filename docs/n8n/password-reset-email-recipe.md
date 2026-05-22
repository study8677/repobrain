# n8n: send CorpFlowAI password-reset emails via Gmail

CorpFlowAI calls a single n8n Webhook from the **server** when a tenant user (e.g. a Lux client) requests a password reset. The Webhook hands the payload to a **Gmail Send Email** node, which delivers from the configured CorpFlowAI alias (`support@corpflowai.com`).

This file is the canonical **wire-level recipe** for one event type (`password_reset`). For the **system-wide communications model** — event catalog, sender aliases, approval policy, evidence trail, and what tracker rows belong in `34_Communication_Event_Register` / `37_Communication_Review_Dashboard` (not the Drive manifest) — read **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`** first.

Operator-facing checklists in `docs/CORPFLOW_SHARED_TODO.md` and `.env.template` § password reset point here.

## 0) Prerequisites

- n8n is connected to Google Workspace via **OAuth** (the Gmail credential in n8n is named, for example, `corpflowai-gmail`).
- The Google account behind the credential has these aliases configured under **Send mail as**:
  - `info@corpflowai.com`
  - `sales@corpflowai.com`
  - `help@corpflowai.com`
  - `support@corpflowai.com`
- The alias used for password resets is **`support@corpflowai.com`**. Verify Google has confirmed it (a verification mail must have been clicked).
- A working CorpFlow tenant user exists in `auth_users` (level `tenant`, `enabled=true`, with `tenant_id`).

## 1) n8n workflow shape

1. **Webhook** — Method `POST`, Path e.g. `corpflowai-email-password-reset` (use the **Production URL**, not Test URL, for the Vercel env value).
2. **IF** (or **Function**) — verify shared secret. Equality check on header `x-corpflow-email-secret` against the n8n credential / variable. On `false` → **Respond to Webhook** with HTTP `401` and stop.
3. **Set** — pull the fields you need:
   - `to`        ← `{{$json.body.to}}` (or `{{$json.to}}` depending on whether the Webhook node wraps the body — preview pane decides)
   - `subject`   ← `{{$json.body.subject || 'Reset your CorpFlowAI password'}}`
   - `reset_url` ← `{{$json.body.reset_url}}`
   - `reset_code` ← `{{$json.body.reset_code}}`
   - `expires_minutes` ← `{{$json.body.expires_minutes}}`
4. **Gmail → Send Email**
   - Credential: the OAuth credential connected to the CorpFlowAI Google account.
   - **From** (Send As): `support@corpflowai.com` (must match a verified alias).
   - To: `{{$json.to}}`
   - Subject: `{{$json.subject}}`
   - Email Type: `HTML`
   - Message (template):

     ```html
     <p>You (or someone using your email) asked to reset your CorpFlowAI password.</p>
     <p>
       <a href="{{$json.reset_url}}">Choose a new password</a>
     </p>
     <p>This link expires in about {{$json.expires_minutes}} minutes.</p>
     <p>If you did not request this, you can safely ignore this email — your password will stay the same.</p>
     <p>— CorpFlowAI support</p>
     ```

5. **Respond to Webhook** — return HTTP `200` `{ "ok": true }`. Do **not** echo the reset code back; CorpFlowAI server already considers the call best-effort.

> Optional second branch on the IF node: if your Gmail node fails, write to a small Slack/Telegram/Sheets node so a human can follow up. **Do not** include the reset code in that alert beyond the operator-only channel.

## 2) Vercel env — preferred names

| Variable | Value | Notes |
|----------|-------|-------|
| `N8N_EMAIL_WEBHOOK_URL` | n8n **Production** URL of the Webhook node | Same value pasted as-is. |
| `N8N_EMAIL_WEBHOOK_SECRET` | Random ≥32-char string | Sent as `x-corpflow-email-secret` header. |
| `EMAIL_FROM` | `support@corpflowai.com` | Hint to n8n; Gmail node still enforces the alias. |
| `CORPFLOW_PUBLIC_BASE_URL` | `https://lux.corpflowai.com` (no trailing slash) | Used to build `reset_url`. Must match the host the user opens. |
| `CORPFLOW_PASSWORD_RESET_TTL_MIN` | `30` (default) | Min `5`, max `180`. |

Legacy `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL` / `CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET` are still read as fallbacks; you can leave them unset once the new names are in place.

Set them with the existing tooling — see `npm run vercel:env:list` and `npm run vercel:env:push`. After saving, **redeploy production** so serverless functions pick up new env values (Vercel ties env values to deployments).

## 3) Webhook payload shape (`corpflow.email.password_reset.v1`)

```json
{
  "schema": "corpflow.email.password_reset.v1",
  "purpose": "password_reset",
  "event": "tenant_password_reset_requested",
  "tenant_id": "luxe-maurice",
  "to": "client@example.com",
  "email": "client@example.com",
  "from": "support@corpflowai.com",
  "reset_code": "<random base64url token>",
  "token": "<random base64url token>",
  "reset_url": "https://lux.corpflowai.com/login?reset_token=<token>",
  "reset_path": "/login?reset_token=<token>",
  "public_base_url": "https://lux.corpflowai.com",
  "expires_at": "2026-05-21T05:30:00.000Z",
  "expires_minutes": 30,
  "subject": "Reset your CorpFlowAI password"
}
```

Both new (`purpose`, `to`, `from`, `reset_code`, `expires_minutes`, `subject`) and legacy (`event`, `email`, `token`, `reset_path`, `public_base_url`) fields are present, so existing n8n nodes do not need to be rewritten when you adopt the new env names.

## 4) Alias verification (do this before the production test)

In n8n, run a one-off Gmail node with the same credential:

- From: `support@corpflowai.com`
- To: an operator inbox you control (not the tenant's address)
- Subject: `CorpFlowAI email test`
- Body: any short plaintext

Confirm the message arrives **and** that the visible sender is `support@corpflowai.com` (not the underlying Workspace mailbox). If it arrives from the wrong address, fix the Gmail "Send mail as" alias before continuing.

## 5) Production verification checklist

After the Vercel env is set + production redeploy:

1. `GET https://core.corpflowai.com/api/factory/health` should show `password_reset_delivery_configured: true`.
2. From `https://lux.corpflowai.com/login` (Forgot password), submit the tenant user's email.
3. Server response (always): `{ "ok": true }` — no enumeration. UI shows: *"If that email is on file, you will receive instructions shortly."*
4. The user receives an email from `support@corpflowai.com` with a link of the form `https://lux.corpflowai.com/login?reset_token=...`.
5. Opening the link prefills the reset token field. Set a new password (≥10 chars). Confirm the response is `200 ok`.
6. Old password no longer logs in (`INVALID_CREDENTIALS`); new password does.
7. Try the same reset_url a **second time** — must fail with `INVALID_TOKEN` (single-use enforcement).
8. After ~`CORPFLOW_PASSWORD_RESET_TTL_MIN` minutes, an unused token must fail with `TOKEN_EXPIRED`.
9. Submit Forgot password for an **unknown** email — server still returns `{ ok: true }`; **no email** must be sent.

## 6) Security rules (non-negotiable)

- The webhook secret never appears in browser, logs, or git. Only Vercel env + n8n credential store.
- The reset code (`token` / `reset_code`) is sent **once**, only inside the n8n payload. Never log it.
- `auth.js` always returns the same `{ ok: true }` body whether or not the email exists.
- The token in Postgres is **sha256-hashed**; the plaintext exists only in transit (server → n8n → email).
- `auth_users.password_hash` is updated via the existing PBKDF2 path in `lib/server/auth.js`. We never bypass it.
- Core/admin users are not touched by this flow; password reset is gated to `level = 'tenant'`.
- `MASTER_ADMIN_KEY` is not used in this path and must not be exposed to the browser.

# n8n: receive CorpFlow automation envelopes (no extra SaaS)

When `CORPFLOW_AUTOMATION_FORWARD_URL` points at an **n8n Webhook** node, every accepted automation row (ingest API **and** CMP mirror events) triggers a POST you can branch on.

## 1) n8n workflow (minimal)

1. **Webhook** — Method `POST`, Path e.g. `corpflow-automation` (copy the “Production URL”).
2. **IF** — Condition on `{{ $json.body.event_type }}` or `{{ $json.event_type }}` (depending on whether n8n wraps the body; use the preview pane).
3. Branches:
   - **`cmp.build.approved`** → Slack/Telegram/email to operators, or call GitHub API for follow-up.
   - **`cmp.github.callback`** → when `preview_url` is set, notify the client channel.
   - **`cmp.estimate.recorded`** → optional CRM row / spreadsheet (Google Sheets node).

## 2) Vercel env

| Variable | Value |
|----------|--------|
| `CORPFLOW_AUTOMATION_FORWARD_URL` | Full webhook URL from n8n |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | Random string; same value in n8n header check |

CorpFlow sends header `x-corpflow-automation-forward-secret` when the secret is set. In n8n, add a **IF** or **Function** node comparing it to your stored secret.

## 3) Envelope shape (`corpflow.automation.envelope.v1`)

```json
{
  "schema": "corpflow.automation.envelope.v1",
  "id": "clx…",
  "occurred_at": "2026-04-02T12:00:00.000Z",
  "tenant_id": "legal-demo",
  "tenant_scope": "legal-demo",
  "event_type": "cmp.build.approved",
  "correlation_id": null,
  "risk_tier": "low",
  "source": "cmp",
  "payload": { "ticket_id": "…", "dispatch_ok": true }
}
```

High-risk types from **external** ingest still require approval headers on the ingest API; CMP mirror events use trusted `cmp.*` / callback types only.

## 4) Outbound email is a separate workflow (not this recipe)

This recipe is for the **automation forward** channel (`CORPFLOW_AUTOMATION_FORWARD_URL` — operational envelopes / CMP mirror events). It is **not** the channel for client-facing transactional email.

For outbound email (`password_reset`, future `estimate_ready`, `concierge_lead_received`, etc.):

- Wire-level recipe: **`docs/n8n/password-reset-email-recipe.md`**.
- Canonical model (event catalog, sender aliases, approval rules, evidence): **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`**.
- Env vars (preferred names): `N8N_EMAIL_WEBHOOK_URL`, `N8N_EMAIL_WEBHOOK_SECRET`, `EMAIL_FROM` (legacy `CORPFLOW_PASSWORD_RESET_WEBHOOK_*` still read as fallbacks).

Keep the two workflows in n8n distinct: different webhook paths, different shared secrets, different downstream branches.

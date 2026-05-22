# Security or incident response (stub runbook)

**Purpose:** A single place to start when something looks compromised, keys leaked, or a tenant reports unauthorized access. Expand with your org’s names and contacts.

## Immediate triage (first 30 minutes)

1. **Contain:** Identify scope — which environment (prod/staging), which hostname, which tenant ids, which integration (Vercel, GitHub, Postgres, n8n, Resend).
2. **Rotate (in order of impact):**  
   - **`MASTER_ADMIN_KEY` / admin session** — Vercel env; invalidate active factory sessions if applicable.  
   - **Automation:** `CORPFLOW_AUTOMATION_INGEST_SECRET`, `CORPFLOW_AUTOMATION_FORWARD_SECRET`, `CORPFLOW_AUTOMATION_APPROVAL_SECRET` (if used), CMP/GitHub tokens as needed.  
   - **Outbound communications / email webhooks:** `N8N_EMAIL_WEBHOOK_SECRET` (preferred) and legacy `CORPFLOW_PASSWORD_RESET_WEBHOOK_SECRET`; the canonical channel model is **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`**. Rotate the n8n webhook secret on the n8n side and the Vercel side in the same window.  
   - **Database:** if credentials exposed, rotate `POSTGRES_URL` / user password at the provider.
3. **Preserve evidence:** Export relevant Vercel logs, GitHub audit log, and Postgres audit/automation tables **before** mass deletes — store per your retention policy.

## Verification after rotation

- `GET /api/factory/health` — expected flags still true for required services.  
- Smoke **login** on apex and one tenant host (`docs/operations/TENANT_CLIENT_LOGIN.md`).  
- **n8n:** one test forward or manual webhook with new secret. For email: trigger one **operator-only** send (e.g. `operator_escalation` per Comms v1 §4) — never a client-facing event during incident response.  
- **GitHub:** CMP workflow dispatch or repair script dry-run if CI/build path was involved.

## Communication

- **Internal:** Owner + anyone with secrets custody (see `docs/CORPFLOW_SHARED_TODO.md` for key custody notes).  
- **Clients:** If tenant data or access was at risk, use your legal/commercial template (DPA-driven); do not admit specifics until facts are confirmed.

## Follow-up (same week)

- [ ] Root cause: leaked secret in chat, mis-merged PR, stolen laptop, dependency CVE, etc.  
- [ ] Add missing guard (checklist item in `docs/operations/SECURITY_REVIEW_CHECKLIST.md`).  
- [ ] Optional: short entry in `docs/decisions/` if the trust model changes.

## References

- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`  
- `docs/CORPFLOW_SHARED_TODO.md`  
- `docs/operations/TENANT_CLIENT_LOGIN.md`  
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` (outbound email model — required when the incident touches the comms channel)

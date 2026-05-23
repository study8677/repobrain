# Audit 01 — Infisical → Vercel env sync model

**Date:** 2026-05-23
**Mode:** Read-only repo evidence + documented behavior. No live API calls to Infisical or Vercel write surfaces.
**Packet:** corresponds to `WEEKEND_EXECUTION_QUEUE.md` Packet 1.1.

---

## Scope

In:

- Existing repo references to Infisical and to Vercel env wiring.
- The `vercel-env` tooling and CI workflow.
- The `runtime-config.js` resolution path that reads env at runtime.

Out:

- Reading any Infisical project state, secret values, or organization metadata.
- Writing or rotating any value.
- Vercel project mutations.

---

## Evidence

### Repo references

- `docs/VERCEL_DEPLOYMENT.md` § *GitHub Actions: `POSTGRES_URL` and Prisma migrate*: documents that **Agent CI** can receive `POSTGRES_URL` via **Infisical OIDC** in the same job (`npx prisma migrate deploy` step).
- `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md` § *Infisical/Vercel env sync*: notes that operator login on Core can be used as a fallback when Infisical/Vercel env sync is unreliable.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § *Secret source of truth*: explicitly states "Infisical holds the values; Vercel receives them via the existing sync/redeploy path."
- `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`: implies Vercel as host, Neon as DB provider; does not name Infisical as a subprocessor row yet.

### Tooling in repo

- `scripts/vercel-env.mjs` (`npm run vercel:env:list|diff|pull|push|push:cli|allowlist|check|check:comprehensive`): the canonical script for inspecting and pushing env values from a local source (not Infisical itself; supports `--backend=auto` / `cli`).
- `.github/workflows/vercel-env-check.yml`: CI surface for env name presence checks.
- `lib/server/runtime-config.js`: the `cfg()` resolver that reads individual `process.env` keys first, then falls back to `CORPFLOW_RUNTIME_CONFIG_JSON` (a single JSON blob).

### `.env.template` evidence

- Names canonical env vars (`POSTGRES_URL`, `MASTER_ADMIN_KEY`, `N8N_EMAIL_WEBHOOK_URL`, `N8N_EMAIL_WEBHOOK_SECRET`, etc.) and explicitly says values must come from Vercel (or Infisical → Vercel).
- Documents the "blob" alternative `CORPFLOW_RUNTIME_CONFIG_JSON` for environments that cannot list each key individually.

### Live behavior signal

- `GET https://core.corpflowai.com/api/factory/health` (live, this audit) returns `runtime_config.parse_ok: true` and `key_count: 13`, confirming that **production today** is reading values successfully from a Vercel env (either individual vars, the JSON blob, or a mix). This is consistent with the documented Infisical → Vercel sync model but does not by itself prove the source.

---

## Findings

1. **Mental model is documented in pieces, not in one canonical doc.** The pattern "Infisical = source of truth → Vercel project env → runtime via `cfg()` / `CORPFLOW_RUNTIME_CONFIG_JSON`" is implied across at least four docs but never spelled out end-to-end with the **redeploy requirement** when values change.
2. **Tooling is mature.** `npm run vercel:env:*` covers list/diff/pull/push and an allowlist check. CI has a dedicated `vercel-env-check` workflow. Operator can already inspect and adjust Vercel env without writing code.
3. **Runtime resolution is layered.** Production health proves the layered resolver works (individual vars first, then blob). Operators do not need to know which layer holds a given key in order to consume it.
4. **No secret values needed.** All evidence above came from public docs, repo files, and a public health endpoint. The audit produced **zero** secret values.

---

## Gaps for Anton to confirm

- Whether **Infisical** is the only source of truth, or whether some keys are still authored directly in Vercel UI / GitHub UI.
- Whether the Vercel project is configured to **auto-redeploy** when env changes, or whether a manual "Redeploy" is the intended operator step (the runtime resolver caches `CORPFLOW_RUNTIME_CONFIG_JSON`, so a redeploy is the safest assumption).
- Whether **Agent CI** is currently using Infisical OIDC for `POSTGRES_URL`, or the legacy GitHub repo secret path.

---

## Verdict

**DOCUMENTED, partially evidenced.** Production is healthy and consistent with the documented model; a single canonical doc (`docs/operations/SECRETS_SYNC.md`) capturing the end-to-end flow is missing. Closing this gap is the deliverable for **Packet 1.1**.

No approval gate hit. No secret values captured. No writes performed.

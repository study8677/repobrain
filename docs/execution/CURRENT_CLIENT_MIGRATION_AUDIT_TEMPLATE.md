# Current-client migration audit template (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton, Cursor agents, contractors
**Companion docs:** `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md`, `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`, `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`, `docs/operations/TENANT_CLIENT_LOGIN.md`
**Cross-refs:** `.cursor/rules/delivery-reality.mdc`, `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`

---

## 1. Purpose

Every active CorpFlow client tenant should pass a **per-client migration audit** so that:

- The hostname, apex/subdomain, and login flow are exactly as documented.
- Analytics, Search Console, and indexing match `ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`.
- The marketing surface scores acceptably on `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`.
- No "Anton's laptop" steps remain in the client's day-to-day operation (per `MIGRATION_TO_SERVER_CHECKLIST.md`).
- The audit produces a **per-client report** that Anton can hand to the client (or to a contractor onboarding) without re-explaining the system.

This template is the **shape**. A real audit fills it in for one tenant. The audit is **read-only** — it observes, scores, and records; it does **not** change tenant data.

---

## 2. When to run an audit

- **Before any major change** to a client tenant (new feature, new domain, plan change).
- **At least quarterly** for active clients.
- **Before announcing a public URL** for a new client.
- **After any incident** that touched the client's hostname, login, or marketing surface.

A migration audit is one Cursor packet (read-only). Any **fix** the audit reveals is a separate packet (with its own approval gates if it crosses a §3 line).

---

## 3. Header (per audit)

```text
- Tenant ID: <e.g. luxe-maurice>
- Tenant display name: <e.g. Luxe Maurice>
- Canonical hostname: <e.g. lux.corpflowai.com>
- Optional aliases: <e.g. luxe.corpflowai.com, custom domain if any>
- Plan / billing flag: <free | paid | billing-exempt>
- Audit date: <YYYY-MM-DD>
- Auditor: <human or agent name>
- Last operational change date: <YYYY-MM-DD or "n/a">
- Mode: read-only
```

---

## 4. Section A — Identity and routing

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| A.1 | `tenant_id` matches subdomain prefix | `<tenant>.corpflowai.com` (or named exception per `tenant_hostnames`) | | |
| A.2 | `tenant_hostnames` row exists for canonical hostname | YES | | |
| A.3 | DNS for canonical hostname points to Vercel | YES | | |
| A.4 | TLS certificate served, valid, not expiring < 30 days | YES | | |
| A.5 | `apex` / `core.*` separation respected | apex does **not** serve this tenant; `core.*` is factory only | | |
| A.6 | Optional aliases listed in `tenant_hostnames` (if any) | matches docs | | |

**Evidence:** anonymous `curl -I https://<tenant>.corpflowai.com/`, the `tenant_hostnames` rows visible to a factory operator, the Vercel domain panel screenshot (Anton).

---

## 5. Section B — Login and tenant boundary

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| B.1 | `https://<tenant>.corpflowai.com/login` returns 200 | YES | | |
| B.2 | Login as a known tenant user works | YES | | (Anton-verified; agents do not run live logins) |
| B.3 | After login, `/api/auth/me` returns the correct `tenant_id` | YES | | |
| B.4 | Anonymous `/change` returns the tenant shell, not factory chrome | YES | | |
| B.5 | Password-reset flow available on `/login` | YES | | (per `docs/n8n/password-reset-email-recipe.md`) |
| B.6 | `MASTER_ADMIN_KEY` not required for any documented client task | YES | | |
| B.7 | No tenant data visible on the apex or `core.*` surfaces | YES | | |

**Evidence:** screenshots of `/login` and (if Anton-run) post-login `/api/ui/context` summary; `/change` HTML head with tenant theme.

---

## 6. Section C — Marketing surface and conversion

Run a **Quality audit** per `WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` against the canonical hostname.

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| C.1 | Quality audit total score | ≥ 75/100 | <x>/100 | |
| C.2 | Conversion clarity sub-score | ≥ 14/20 | <x>/20 | doctrine non-negotiable |
| C.3 | Performance sub-score | ≥ 14/20 | <x>/20 | |
| C.4 | Accessibility sub-score | ≥ 14/20 | <x>/20 | |
| C.5 | SEO sub-score | ≥ 14/20 | <x>/20 | |
| C.6 | Trust + governance sub-score | ≥ 14/20 | <x>/20 | |
| C.7 | Primary CTA describes buyer intent (not internal process) | YES | | per `BRAND_AND_CONVERSION_DOCTRINE.md` |
| C.8 | No unsupported revenue or AI-magic claims | YES | | |

**Evidence:** Quality audit report at `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>/quality-score.md`.

---

## 7. Section D — Analytics, Search Console, indexing

Run the per-surface checklist from `ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`.

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| D.1 | Analytics tool installed (Plausible/Fathom/Umami/GA4) | YES | | |
| D.2 | Live event observed since installation | YES | | |
| D.3 | Search Console verified for canonical host | YES | | method: <…> |
| D.4 | Sitemap submitted, status `Success` | YES | | |
| D.5 | `robots.txt` allows crawl on production routes, blocks `/change`, `/api/`, `/login`, `/admin*` | YES | | |
| D.6 | Top 5 URLs requested for indexing | YES | | |
| D.7 | No manual actions in Search Console | YES | | |

**Evidence:** Search Console screenshot (Anton), analytics live-event screenshot, sitemap content (committed to repo or attached as artifact).

---

## 8. Section E — Off-laptop posture

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| E.1 | All recurring jobs for this client run server-side | YES (per `MIGRATION_TO_SERVER_CHECKLIST.md`) | | |
| E.2 | No script in `scripts/` is required for the client's day-to-day operation | YES | | |
| E.3 | Operational documentation (login, password reset, where to file changes) is in repo, not in chat | YES | | |
| E.4 | Client-facing email events follow Communications v1 | YES | | per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` |
| E.5 | Backups / DR posture for this tenant's data documented | YES | | (refer to Postgres provider doc once Packet 1.2 lands) |

---

## 9. Section F — Risk and follow-up

After completing A–E, list:

- **High-impact items that failed.** Each becomes a candidate fix packet with explicit gates. Tag each with which §3 gate (production deploy, DNS, secret, etc.) the fix would cross.
- **Low-impact items that failed.** Could be deferred or rolled into a quarterly batch.
- **Open questions for Anton or the client.** Things that can't be resolved from outside.

---

## 10. Verdict (per audit)

Use one of:

- **PASS** — every "Expected" answer is met; no fix packets required before next audit.
- **PASS with follow-ups** — A–E pass except low-impact items; follow-up packets named.
- **PARTIAL** — at least one high-impact item failed; client-facing usage continues but with a known gap.
- **FAIL** — at least one item required for safe operation failed (e.g. login flow broken, marketing surface scoring < 60). Stop work on the tenant until the gap closes.

**Verdict aligns with `delivery-reality.mdc`:** an audit verdict of `PASS` does not by itself constitute `COMPLETE` for any prior fix work — the original packet's deployment, commit, and live URLs must still be on record.

---

## 11. Worked example (placeholder — to be filled by the first real audit)

```markdown
# Migration audit — luxe-maurice — 2026-05-23

(See sections 3–10. First real run will populate this block.)
```

---

## 12. Cross-references

- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — Section C scoring source.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — Section D evidence shape.
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` — Section E posture criteria.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — Sections A–B canonical reference.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — the production-grade bar audits help maintain.
- `.cursor/rules/delivery-reality.mdc` — verdict language and the live-verified bar.

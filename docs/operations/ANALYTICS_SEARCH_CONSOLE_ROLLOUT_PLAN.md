# Analytics, Search Console, and indexing — operational rollout plan (v1)

**Status:** Canonical (v1, 2026-05-23)
**Audience:** Anton, Cursor agents, contractors
**Companion docs (read first; this doc does not restate them):**

- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface checklist (what to verify on each surface)
- `docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md` — quality scoring (analytics is a §SEO + §Conversion input)
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-facing copy and CTA discipline
- `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` — Section D (analytics, Search Console)

---

## 1. Purpose of this doc

The **checklist** says **what** must exist on each surface. This **plan** says **the order to do it in**, **who blocks whom**, **what evidence ships when**, and **which gates require Anton**. Use this doc to actually run the rollout. Use the checklist to verify each surface in isolation.

## 2. Surfaces and rollout order

Order is deliberate — apex first because it is the public storefront, Lux second because it is the only live client tenant, future tenants third because they inherit the apex pattern.

| # | Surface | Hostname | Why this order |
|---|---------|----------|----------------|
| 1 | **CorpFlow apex marketing** | `corpflowai.com` | Flagship — every other surface links here. Establishes the analytics + Search Console pattern Cursor copies for tenants. |
| 2 | **Lux marketing (tenant)** | `lux.corpflowai.com` | Only active production tenant. First real test of the per-tenant checklist. |
| 3 | **Future client tenants** | `<tenant>.corpflowai.com` | Repeatable — each one runs Sections 4–7 as a packet under the migration template. |
| — | CorpFlow core (factory) | `core.corpflowai.com` | **Never indexed.** Verify `noindex` only. No analytics. |
| — | Internal surfaces (`/change`, factory APIs, login) | various | **Never indexed.** No analytics. |

## 3. Decision: analytics provider

**Resolved (2026-05-25):** **Plausible** is the v1 provider. Decision recorded in `docs/decisions/20260525-plausible-analytics-v1.md`; canonical implementation contract + adapter design in `docs/analytics/CORPFLOW_ANALYTICS_V1.md`.

GA4 remains an **Anton-approved exception** for any future tenant that explicitly demands it (changes cookie-consent + processor surface area, `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md`).

## 4. Sequenced rollout — apex (`corpflowai.com`)

Each step lists **owner**, **evidence shipped**, and the **gate** that blocks the next step.

| Step | Action | Owner | Evidence | Gate |
|------|--------|-------|----------|------|
| 4.1 | Decide analytics provider (privacy-first vs GA4 vs both). Record decision under `docs/decisions/`. | Anton | ✅ `docs/decisions/20260525-plausible-analytics-v1.md` (Plausible chosen). | **Closed 2026-05-25.** |
| 4.2 | Create the analytics property. **Do not** install the snippet yet. | Anton | Property ID captured in the rollout audit doc only — never in the repo. | None. |
| 4.3 | Install the analytics snippet via the existing Next.js head pattern. PR docs-only first; runtime change in a *separate* PR with explicit review. | Cursor (PR) | PR diff; preview screenshot showing the snippet present and conditional on consent (where relevant). | **Anton must approve the runtime PR before merge** — this changes what every visitor downloads. |
| 4.4 | Verify Google Search Console ownership using the **DNS TXT** method (apex is `corpflowai.com`, root-level). | Anton (DNS only Anton can change) | SC verification screenshot stored under `artifacts/audits/`. | **Anton-only step** — DNS change. |
| 4.5 | Submit `https://corpflowai.com/sitemap.xml` to Search Console. Confirm it parses. Confirm submitted URLs match the checklist's "indexable canonical URLs" list. | Anton (SC UI) or Cursor (if SC API + token) | "Sitemap" tab screenshot or API response. | None. |
| 4.6 | Request indexing for the top 5 pages (per checklist §6.3). | Anton (SC UI) | SC indexing-request log. | None. |
| 4.7 | After 7 days, capture first-week evidence: analytics traffic ≥ 0 valid pageviews, SC "Pages → Indexed" count ≥ checklist's expected count. | Cursor | First-week report under `artifacts/audits/<date>-corpflowai-analytics-rollout/`. | If indexed < expected, raise a follow-up packet (don't silently extend). |

**Definition of done for apex:** every row above has a green check + evidence link. Rollout is then **COMPLETE** for apex.

## 5. Sequenced rollout — Lux (`lux.corpflowai.com`)

Lux is a **tenant subdomain**, not an apex. Differences from §4 worth calling out:

- **Search Console verification**: subdomain method. The DNS TXT record can live on the apex (`corpflowai.com`) or on the subdomain. Anton must add the record either way; **DNS change → Anton-approved**.
- **Sitemap location**: `https://lux.corpflowai.com/sitemap.xml`. Distinct property in Search Console.
- **Conversion goals**: tenant-defined (e.g. concierge form submit). Map them in Section 7 *before* installing analytics so we know what events to fire.
- **Per-tenant audit**: rollout evidence feeds Section D of `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`.

The seven steps from §4 apply 1:1 with these substitutions. Lux runs **after apex is COMPLETE** to keep the pattern stable.

## 6. Sequenced rollout — future tenants

Once apex + Lux are COMPLETE, every new tenant runs §4 as a single migration packet (`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` + the per-tenant audit template). Anton's gates remain DNS, SC ownership, runtime snippet PR, and analytics provider choice.

## 7. Conversion events — minimum viable set (v1)

Defined here so the analytics snippet is configured correctly the first time. Each event must have: **name**, **trigger**, **destination event in analytics**, **PII discipline**.

| Event | Trigger | Destination | PII |
|-------|---------|-------------|-----|
| `page_view` | Provider default | Provider default | URL only. No query params containing tokens. |
| `lead_form_submit` | Successful POST to the lead intake API | Custom event | No raw email; hashed if needed. |
| `cta_click_primary` | Click on the buyer-intent primary CTA per `BRAND_AND_CONVERSION_DOCTRINE.md` | Custom event | None. |
| `outbound_click` | Click on links to client domains / external partners | Custom event | None. |
| `concierge_lead_received` (Lux) | Mirror of `automation_events` row when the operator-only auto-send fires | Custom event | None. |

**`/change` events are NOT public analytics.** Internal CMP telemetry already lives in `cmp_tickets` / `automation_events` / `telemetry_events`.

## 8. What must **not** happen without Anton's explicit approval

Hard gates per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`:

- DNS changes (Search Console TXT, CNAME).
- New analytics account / new external processor (provider change adds to `DATA_MAP_AND_SUBPROCESSORS.md`).
- Cookie-consent surface change (GA4 brings this in).
- Runtime PR that installs the analytics snippet.
- Anything that fires from the apex's runtime that touches a real client.

## 9. Telegram blocker shape (when Cursor is blocked)

Per the autonomous policy. Format:

```
CorpFlowAI blocker: <short blocker>. Approval needed for: <DNS change|analytics account|runtime snippet PR|provider switch>. Evidence/PR: <link>. Recommended action: approve | hold | review.
```

## 10. Rollback / disable

- Analytics snippet: revert the runtime PR; redeploy.
- Search Console verification: remove the DNS TXT record (Anton).
- Sitemap submission: "Remove sitemap" in Search Console; tag in CSV under `artifacts/audits/`.

## 11. Status

| Surface | Step | State |
|---------|------|-------|
| `corpflowai.com` | 4.1 | ✅ Closed 2026-05-25 — Plausible (`docs/analytics/CORPFLOW_ANALYTICS_V1.md`). 4.2 onward unblocked; awaiting Anton's Plausible site creation gate. |
| `lux.corpflowai.com` | All | Blocked on apex COMPLETE. |
| Future tenants | All | Blocked on apex + Lux COMPLETE. |

Update this section when packets advance. Cross-reference the matching audit folder under `artifacts/audits/`.

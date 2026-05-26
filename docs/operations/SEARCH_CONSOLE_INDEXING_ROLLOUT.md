# Search Console + indexing rollout — operator playbook (v1)

**Status:** Canonical (v1, 2026-05-25)
**Audience:** Anton (executes the operator steps); Cursor (verifies, reads, audits — never owns DNS or Search Console).
**Companion docs (read first; this doc does not restate them):**

- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — order of operations across surfaces (apex → Lux → future tenants).
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface verification checklist.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible decision (analytics is **independent** of Search Console; both ship per surface).
- `docs/operations/TENANT_CLIENT_LOGIN.md` — apex vs subdomain tenancy model (informs verification scope choice).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — pages we want indexed are buyer-facing only.

This is the **operator playbook**. The rollout *plan* (sequencing) lives in `ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md`; the *per-surface checklist* lives in `ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`. This doc is the step-by-step Anton runs in the Google Search Console UI plus the DNS provider, with the evidence shape Cursor will verify.

---

## 1. Why a separate Search Console doc

Three reasons:

1. **Search Console is independent of analytics.** It runs whether or not Plausible is installed; mixing the two in one rollout doc made the operator path harder to follow.
2. **DNS changes are Anton-only and the highest-friction step.** Surfacing them as their own playbook makes the gate explicit and the evidence portable to other tools (e.g. when adding Bing Webmaster Tools later, the DNS TXT record is the same shape).
3. **Indexing requests have non-trivial timing.** First-week and first-month evidence shapes differ; this doc names them.

Where the existing rollout plan and checklist apply 1:1, this playbook **points** to them rather than duplicating.

---

## 2. Target domains (v1)

| Surface | Hostname | Scope in Search Console | Notes |
|---|---|---|---|
| CorpFlow apex | `corpflowai.com` | **Domain property** (covers `https://corpflowai.com/`, `https://www.corpflowai.com/`, all subpaths) | Verify with DNS TXT on the apex zone. |
| Lux marketing | `lux.corpflowai.com` | **URL prefix property** (`https://lux.corpflowai.com/`) | Verify with DNS TXT on the apex zone (subdomain prefix records also live there) — **or** with HTML file fallback if DNS access is blocked. |
| `core.corpflowai.com` (factory) | — | **Do not register.** | Runtime is operator-only; should be `noindex`. Registering it in SC is unnecessary noise. |
| Future client tenants | `<tenant>.corpflowai.com` | URL prefix property | Same recipe as Lux — adds one row to `lib/cmp/_lib/tenant-host-map.js` (see `TENANT_CLIENT_LOGIN.md`) and one operator pass through this doc. |

We do **not** add the `www` host as a separate property when the apex domain property is in place — the domain property covers it.

---

## 3. Verification methods (preferred order)

For each property, choose the first method that works:

### 3.1 DNS TXT record (preferred — Anton-only)

- **Why preferred:** survives redeploys, host changes, file-tree refactors. Once verified, ownership remains until the record is removed.
- **Where the record lives:** the **apex zone** (`corpflowai.com`), regardless of whether the property is the apex domain or a subdomain prefix.
- **Operator step:**
  1. Search Console → Add property → Domain → enter `corpflowai.com` → Search Console issues a TXT record value (e.g. `google-site-verification=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`).
  2. DNS provider → apex zone → add TXT record on the root (`@` or empty name) with that value.
  3. Wait until the record propagates (usually <5 minutes; can take up to 24 hours).
  4. Search Console → Verify.
- **Evidence to capture:** screenshot of the verified-property confirmation page, saved to `artifacts/audits/<YYYY-MM-DD>-<surface>-search-console/verified.png` (or `.txt` if a screenshot tool isn't handy — paste the green check + property name).
- **Subdomain note:** for the Lux URL-prefix property, Search Console also accepts a TXT record on `lux.corpflowai.com` itself (`_google-site-verification.lux` or similar). Apex-zone records are usually simpler because all the existing CorpFlow records are already there.

### 3.2 HTML file fallback (if DNS access is temporarily blocked)

- **When to use:** rare — only if Anton cannot edit DNS (e.g. delegated to a third party with a slow change window) and Search Console is needed before the DNS turnaround.
- **How:** Search Console issues a file (`google<unique>.html`); upload to `public/` in the repo (path served as `/google<unique>.html`); ship in a docs/runtime PR; verify after the deploy is Ready.
- **Why it's a fallback, not the default:** redeployments and file-tree refactors can drop the file silently. DNS verification is durable; HTML file is fragile.

### 3.3 HTML meta tag (avoid)

- Same fragility as 3.2 plus it occupies a tag in the page `<head>` long-term. Prefer 3.1 or 3.2.

---

## 4. Operator playbook — apex (`corpflowai.com`)

Tick each box only when its evidence is captured. Do not tick a box just because the action was taken.

### 4.1 Pre-flight

- [ ] Read `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` §4 (sequencing) and `ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` §4–§7 (per-surface items). This playbook does not duplicate them.
- [ ] Confirm `https://corpflowai.com/sitemap.xml` returns `200` and lists current public routes (no `/change`, `/admin`, etc.). Quick check: `curl -sI https://corpflowai.com/sitemap.xml`.
- [ ] Confirm `https://corpflowai.com/robots.txt` returns `200`, allows marketing routes, disallows operator/factory routes, and lists the apex sitemap line.

### 4.2 Search Console verification (DNS TXT preferred)

- [ ] Search Console → **Add property** → **Domain** → `corpflowai.com`.
- [ ] Copy the issued TXT record value (begins with `google-site-verification=`).
- [ ] DNS provider → apex zone → add a **TXT** record at the root with that value.
- [ ] Wait 1–5 minutes for propagation.
- [ ] Search Console → **Verify**. Capture the verified-property screenshot/note → `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/verified.png`.

### 4.3 Sitemap submission

- [ ] Search Console → **Sitemaps** → submit `https://corpflowai.com/sitemap.xml`.
- [ ] Wait until the status reads **Success** (typically <1 hour).
- [ ] Capture the **Discovered URLs** count → `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/sitemap-discovered.png`.
- [ ] If the discovered count is **lower than expected** (the sitemap currently lists N URLs), open `pages/sitemap.xml.js` and verify the apex branch's URL list against the live apex marketing routes; this is a sitemap-generation issue, not a Search Console issue.

### 4.4 Robots.txt validation

- [ ] Search Console → **Settings** → **robots.txt** → confirm it parses with no errors.
- [ ] If the report flags `Disallow:` rules that block routes the audit expects to index, surface this — it usually means the rule list in `public/robots.txt` is wider than intended.

### 4.5 First indexing requests (top 5)

Indexing is *requested*, not *granted*. Google decides; we record what we asked for.

- [ ] Search Console → **URL inspection** → enter each URL → **Request indexing**. Five canonical apex URLs:
  - `https://corpflowai.com/`
  - `https://corpflowai.com/lead-rescue`
  - `https://corpflowai.com/about` (or whichever buyer-facing page is the closest apex equivalent today)
  - `https://corpflowai.com/process`
  - `https://corpflowai.com/onboarding`
- [ ] After each request, capture the request-confirmation toast → `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/indexing-request-<n>.png`.

If a URL fails inspection (`Page cannot be indexed`), do **not** retry blindly — read the diagnosis (usually `noindex` header, redirect chain, or robots disallow) and fix the underlying cause before re-requesting.

### 4.6 Post-submit checks (T+1h, T+24h, T+7d)

| Time | Check | Evidence file |
|---|---|---|
| T + 1 hour | Sitemap status reads **Success**; **Discovered URLs ≥ 1**. | `artifacts/audits/<date>-corpflowai-search-console/sitemap-t+1h.png` |
| T + 24 hours | Coverage report shows at least the homepage **Indexed**. | `coverage-t+24h.png` |
| T + 7 days | All 5 requested URLs **Indexed** (or with named errors). | `coverage-t+7d.png` + `errors-t+7d.txt` if any |
| T + 30 days | First **Performance** report has impressions and clicks. | `performance-t+30d.png` |

### 4.7 Definition of done (apex)

Apex Search Console rollout is **COMPLETE** when 4.2–4.6 are all checked AND the 7-day coverage shows ≥ 4 of the 5 top URLs indexed (Google occasionally drops one for soft-404 or duplicate; one slot of latency is acceptable). Update the `Status` table at the bottom of this doc.

---

## 5. Operator playbook — Lux (`lux.corpflowai.com`)

Lux runs **only after apex is COMPLETE**. The recipe is identical to §4 with these substitutions:

- §4.2 — Add property as **URL prefix** `https://lux.corpflowai.com/`. The DNS TXT record can live on the apex zone (`@`) or specifically under `lux.` — Search Console accepts either; apex zone is simpler because every other CorpFlow record is there.
- §4.3 — Submit `https://lux.corpflowai.com/sitemap.xml`. The host-aware sitemap (`pages/sitemap.xml.js`) emits a **different** URL list for `lux.corpflowai.com` than for the apex; verify the discovered count matches the Lux URL list (currently `/`, `/concierge`, `/property/<slug>` × N).
- §4.5 — Top 5 Lux URLs to request indexing for:
  - `https://lux.corpflowai.com/`
  - `https://lux.corpflowai.com/concierge`
  - `https://lux.corpflowai.com/property/lm-nc-ridge`
  - `https://lux.corpflowai.com/property/<next-most-listable-slug>`
  - `https://lux.corpflowai.com/property/<third-property-slug>`
- §4.7 DoD — same threshold (≥4/5 indexed by T+7d). Per-tenant migration audit (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` Section D) flips to PASS for Lux when this completes.

**Tenant data hygiene:** the Lux property slugs are public (already in the sitemap and rendered URLs); they are **not** sensitive. Do not add `noindex` to property pages just because the URL contains a slug.

---

## 6. Operator playbook — future tenants

For every new tenant marketing subdomain the migration packet adds to `lib/cmp/_lib/tenant-host-map.js`:

1. Confirm the host serves a tenant-aware `/sitemap.xml` (the existing `pages/sitemap.xml.js` already does this — extend its tenant entry list when adding a tenant).
2. Run the §5 playbook with that hostname substituted.
3. Capture evidence under `artifacts/audits/<YYYY-MM-DD>-<tenant>-search-console/`.
4. Update Section D of the per-tenant migration audit.

The playbook does not change per tenant; only the URL list does.

---

## 7. Common failure modes

| Symptom | Likely cause | Fix |
|---|---|---|
| **DNS TXT verification times out** in Search Console after 5 minutes | TXT record placed in a wrong zone (e.g. on the registrar's parking page instead of the active DNS provider) | Confirm which DNS provider the apex's NS records point at; place the TXT there. |
| **Sitemap status: "Couldn't fetch"** | `/sitemap.xml` returning non-200 (very rare) OR a Cloudflare/edge layer blocking Googlebot | Test from Search Console's URL Inspection on `/sitemap.xml`; if it 200s there but `Couldn't fetch` in the Sitemap tab, retry — this is a Google-side eventual-consistency issue. |
| **All requested URLs flagged "Discovered – currently not indexed"** for >7 days | Low domain authority on a fresh property is normal; CorpFlow's apex has weeks-old age, so this should not persist. If it does, audit page quality (description meta uniqueness, content thinness, internal link reachability). | Address the diagnostic, not the symptom. Do not re-request indexing in a tight loop — that does not raise priority and may flag the property. |
| **Lux 404s mistakenly indexed** | A previous deploy served a different URL pattern; Google's index lags. | Use Search Console **Removals** to request temporary removal; add a `Disallow` entry to `public/robots.txt` for the old pattern; ship the redirect/410 in the next runtime PR. |
| **`/change` or `/admin` shows up in Coverage** | `public/robots.txt` does not include the explicit `Disallow: /change` / `Disallow: /admin` lines, OR a runtime change set them allow-able. | The current `public/robots.txt` (post-PR #222) blocks both; if they reappear, regression test the file. |
| **"Crawled - currently not indexed" on a property page** | Page content is too thin or duplicates another page. | Add unique meta description and ensure the description summarises something specific to that property (price, location, type). The PR #222 components synthesise a description from public fields — verify it is being emitted. |

---

## 8. Indexing request pace

Per-property indexing-request rate limit (Search Console UI): roughly 10–20 per day per property; the manual button rate-limits faster. Pace recommendation:

- Day 0: 5 requests (homepage + top 4 buyer-facing pages).
- Day 1: 5 more if the first 5 are not yet indexed.
- Day 7: stop manual requests; if pages still aren't indexed, fix the diagnosed issue, not the request volume.

Do **not** automate Search Console URL inspection. The API exists but rate-limits aggressively, and operator-driven inspection forces a human to read the diagnosis (which is usually the actual fix).

---

## 9. Owner / operator responsibilities

| Action | Owner |
|---|---|
| Add Plausible / GA4 to a surface | See `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — independent of this playbook. |
| DNS TXT record (Search Console verification) | **Anton-only.** Hard gate per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3. |
| Sitemap submission in Search Console UI | **Anton.** (Cursor can read API responses if Anton sets up an SC API token, but UI submission is the v1 path.) |
| URL Inspection + indexing requests | **Anton.** UI-driven; not automatable in v1. |
| Post-submit evidence capture | Anton (screenshots) → Cursor (verifies via public probes; updates per-tenant audit Section D). |
| Robots.txt content / sitemap content / per-route SEO meta | **Cursor** (per the audit reports + framework). |
| Coverage / Performance report reading at T+7d / T+30d | Anton (operator) → Cursor pulls a copy into `artifacts/audits/` if Anton drops the export. |

---

## 10. Evidence capture (what Cursor will look for)

For each rollout, Cursor expects this folder to exist before declaring the rollout COMPLETE:

```
artifacts/audits/<YYYY-MM-DD>-<surface>-search-console/
  verified.png                  (or verified.txt — Search Console "verified" confirmation)
  sitemap-discovered.png        (Sitemaps tab, Discovered URLs count)
  indexing-request-1.png        ... -5.png
  coverage-t+24h.png
  coverage-t+7d.png
  errors-t+7d.txt               (only if Coverage shows errors)
  performance-t+30d.png         (added at T+30d)
  README.md                     (one-pager: surface, date, owner, totals, anomalies, link to per-tenant audit Section D)
```

A rollout is **PARTIAL** until the T+7d row is filled. **COMPLETE** when the §4.7 / §5 DoD is met. **FAILED** if a top URL stays unindexed past T+7d for a non-content reason (e.g. blocked by `robots.txt`, served `noindex`, soft-404).

---

## 11. What this playbook does **not** cover

- **Bing Webmaster Tools / Yandex / Baidu.** Out of scope for v1. Add when a tenant requests it; the verification path is the same DNS TXT shape.
- **Google Business Profile / local SEO.** Different product; out of scope.
- **Schema.org structured data on Lux property pages.** Likely a later quality-fix packet; not blocking on Search Console verification.
- **Google Ads / paid search.** Out of scope; covered separately when (if) we run paid traffic.

---

## 12. Status

| Surface | §4.2 verified | §4.3 sitemap submitted | §4.5 indexing requested | §4.6 T+7d | DoD |
|---|---|---|---|---|---|
| `corpflowai.com` | ⏳ | ⏳ | ⏳ | ⏳ | not started |
| `lux.corpflowai.com` | blocked on apex | blocked on apex | blocked on apex | blocked on apex | not started |
| Future tenants | per migration packet | per migration packet | per migration packet | per migration packet | per migration packet |

Update this table as Anton checks off each step. Cross-reference the matching folder under `artifacts/audits/`.

---

## 13. Cross-references

- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — sequencing across surfaces.
- `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md` — per-surface item list.
- `docs/analytics/CORPFLOW_ANALYTICS_V1.md` — Plausible decision (independent of this doc).
- `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md` — Section D consumes this playbook's evidence.
- `pages/sitemap.xml.js`, `public/robots.txt` — runtime sources of truth for what Search Console will see.
- `artifacts/quality-audits/2026-05-25-luxe-maurice-postfix/README.md` — the quality audit row "Search Console verified + indexing request" depends on this playbook running.
